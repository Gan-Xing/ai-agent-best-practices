import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  getGithubRepoUpstreamsByFullNames,
  type GithubRepoUpstreamView,
} from "@/lib/github-upstreams";
import {
  type GithubRepoCard,
  githubRepoCardSchema,
} from "@/lib/validation/github-resource";

const CARD_ROOT = path.join(
  process.cwd(),
  "content",
  "resources",
  "github",
  "cards",
);

export type GithubCardSort =
  | "review"
  | "upstream"
  | "stars"
  | "name";

export type GithubCardListQuery = {
  q?: string;
  categoryCode?: string;
  status?: string;
  type?: string;
  sort?: GithubCardSort;
};

export type GithubRepoCardUpstream = {
  description: string | null;
  homepage: string | null;
  stars: number | null;
  language: string | null;
  dominantLanguages: string[];
  license: string | null;
  topics: string[];
  archived: boolean;
  defaultBranch: string | null;
  pushedAt: string | null;
  lastFetchedAt: string | null;
  readmeTitle: string | null;
  readmeIntro: string | null;
  readmeHeadings: string[];
  rootEntries: string[];
  rootManifests: string[];
  metadata: Record<string, unknown> | null;
  synced: boolean;
};

export type GithubRepoCardView = GithubRepoCard & {
  upstream: GithubRepoCardUpstream;
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

async function listJsonFiles(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listJsonFiles(entryPath);
      }

      if (entry.isFile() && entry.name.endsWith(".json")) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat().sort();
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function dateValue(value: string | undefined | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function emptyUpstream(): GithubRepoCardUpstream {
  return {
    description: null,
    homepage: null,
    stars: null,
    language: null,
    dominantLanguages: [],
    license: null,
    topics: [],
    archived: false,
    defaultBranch: null,
    pushedAt: null,
    lastFetchedAt: null,
    readmeTitle: null,
    readmeIntro: null,
    readmeHeadings: [],
    rootEntries: [],
    rootManifests: [],
    metadata: null,
    synced: false,
  };
}

function mergeGithubRepoCard(
  card: GithubRepoCard,
  upstream: GithubRepoUpstreamView | undefined,
): GithubRepoCardView {
  if (!upstream) {
    return {
      ...card,
      upstream: emptyUpstream(),
    };
  }

  return {
    ...card,
    upstream: {
      description: upstream.description,
      homepage: upstream.homepage,
      stars: upstream.stars,
      language: upstream.primaryLanguage,
      dominantLanguages: upstream.dominantLanguages,
      license: upstream.license,
      topics: upstream.topics,
      archived: upstream.archived,
      defaultBranch: upstream.defaultBranch,
      pushedAt: upstream.pushedAt,
      lastFetchedAt: upstream.lastFetchedAt,
      readmeTitle: upstream.readmeTitle,
      readmeIntro: upstream.readmeIntro,
      readmeHeadings: upstream.readmeHeadings,
      rootEntries: upstream.rootEntries,
      rootManifests: upstream.rootManifests,
      metadata: upstream.metadata,
      synced: true,
    },
  };
}

function searchableText(card: GithubRepoCardView) {
  return normalized(
    [
      card.cardKey,
      card.repo.fullName,
      card.repo.owner,
      card.repo.name,
      card.summary,
      card.whyItMatters,
      card.notes ?? "",
      card.classification.recordType,
      card.classification.categoryCode,
      card.classification.tags.join(" "),
      card.classification.keywords.join(" "),
      card.upstream.description ?? "",
      card.upstream.language ?? "",
      card.upstream.license ?? "",
      card.upstream.topics.join(" "),
      card.upstream.readmeTitle ?? "",
      card.upstream.readmeIntro ?? "",
      card.upstream.readmeHeadings.join(" "),
    ].join(" "),
  );
}

function compareCards(
  left: GithubRepoCardView,
  right: GithubRepoCardView,
  sort: GithubCardSort,
) {
  switch (sort) {
    case "name":
      return left.repo.fullName.localeCompare(right.repo.fullName);
    case "stars":
      return (
        (right.upstream.stars ?? -1) - (left.upstream.stars ?? -1) ||
        left.repo.fullName.localeCompare(right.repo.fullName)
      );
    case "upstream":
      return (
        dateValue(right.upstream.pushedAt) - dateValue(left.upstream.pushedAt) ||
        (right.upstream.stars ?? -1) - (left.upstream.stars ?? -1) ||
        left.repo.fullName.localeCompare(right.repo.fullName)
      );
    case "review":
    default:
      return (
        dateValue(right.review.lastReviewedAt) - dateValue(left.review.lastReviewedAt) ||
        dateValue(right.upstream.pushedAt) - dateValue(left.upstream.pushedAt) ||
        left.repo.fullName.localeCompare(right.repo.fullName)
      );
  }
}

async function loadUpstreamMap(fullNames: string[]) {
  if (!fullNames.length) {
    return new Map<string, GithubRepoUpstreamView>();
  }

  try {
    return await getGithubRepoUpstreamsByFullNames(fullNames);
  } catch (error) {
    console.error("Failed to load GitHub upstream snapshots from DB.", error);
    return new Map<string, GithubRepoUpstreamView>();
  }
}

export async function getAllGithubRepoCardsRaw(): Promise<GithubRepoCard[]> {
  const files = await listJsonFiles(CARD_ROOT);
  const cards = await Promise.all(
    files.map(async (filePath) => githubRepoCardSchema.parse(await readJson(filePath))),
  );

  return cards;
}

export async function getAllGithubRepoCards(): Promise<GithubRepoCardView[]> {
  const cards = await getAllGithubRepoCardsRaw();
  const upstreams = await loadUpstreamMap(cards.map((card) => card.repo.fullName));

  return cards.map((card) => mergeGithubRepoCard(card, upstreams.get(card.repo.fullName)));
}

export async function getGithubRepoCardByKey(
  cardKey: string,
): Promise<GithubRepoCardView | null> {
  const cards = await getAllGithubRepoCards();
  return cards.find((card) => card.cardKey === cardKey) ?? null;
}

export async function queryGithubRepoCards(
  input: GithubCardListQuery,
): Promise<GithubRepoCardView[]> {
  const cards = await getAllGithubRepoCards();
  return filterGithubRepoCards(cards, input);
}

export function filterGithubRepoCards(
  cards: GithubRepoCardView[],
  input: GithubCardListQuery,
) {
  const query = normalized(input.q ?? "");
  const sort = input.sort ?? "review";

  return cards
    .filter((card) => {
      if (input.status && card.status !== input.status) return false;
      if (input.type && card.classification.recordType !== input.type) return false;

      if (input.categoryCode) {
        const categoryCodes = [
          card.classification.categoryCode,
          ...(card.classification.secondaryCategoryCodes ?? []),
        ];

        if (!categoryCodes.includes(input.categoryCode)) {
          return false;
        }
      }

      if (query && !searchableText(card).includes(query)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => compareCards(left, right, sort));
}
