import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { type GithubRepoUpstreamSnapshotInput } from "@/lib/github-repo-context";

function toDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function toInputJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, JsonValue>;
}

export type GithubRepoUpstreamView = {
  host: string;
  owner: string;
  name: string;
  fullName: string;
  repoUrl: string | null;
  description: string | null;
  homepage: string | null;
  stars: number | null;
  primaryLanguage: string | null;
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
  metadata: Record<string, JsonValue> | null;
};

function toView(
  row: Prisma.GithubRepoUpstreamGetPayload<Record<string, never>>,
): GithubRepoUpstreamView {
  return {
    host: row.host,
    owner: row.owner,
    name: row.name,
    fullName: row.fullName,
    repoUrl: row.repoUrl,
    description: row.description,
    homepage: row.homepage,
    stars: row.stars,
    primaryLanguage: row.primaryLanguage,
    dominantLanguages: toStringArray(row.dominantLanguages),
    license: row.license,
    topics: toStringArray(row.topics),
    archived: row.archived,
    defaultBranch: row.defaultBranch,
    pushedAt: row.pushedAt?.toISOString() ?? null,
    lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
    readmeTitle: row.readmeTitle,
    readmeIntro: row.readmeIntro,
    readmeHeadings: toStringArray(row.readmeHeadings),
    rootEntries: toStringArray(row.rootEntries),
    rootManifests: toStringArray(row.rootManifests),
    metadata: toRecord(row.metadata),
  };
}

export async function upsertGithubRepoUpstream(
  input: GithubRepoUpstreamSnapshotInput,
) {
  const row = await prisma.githubRepoUpstream.upsert({
    where: {
      fullName: input.fullName,
    },
    create: {
      host: input.host,
      owner: input.owner,
      name: input.name,
      fullName: input.fullName,
      repoUrl: input.repoUrl,
      description: input.description,
      homepage: input.homepage,
      stars: input.stars,
      primaryLanguage: input.primaryLanguage,
      dominantLanguages: input.dominantLanguages,
      license: input.license,
      topics: input.topics,
      archived: input.archived,
      defaultBranch: input.defaultBranch,
      pushedAt: toDate(input.pushedAt),
      lastFetchedAt: toDate(input.lastFetchedAt),
      readmeTitle: input.readmeTitle,
      readmeIntro: input.readmeIntro,
      readmeHeadings: input.readmeHeadings,
      rootEntries: input.rootEntries,
      rootManifests: input.rootManifests,
      metadata: toInputJson(input.metadata),
      rawPayload: toInputJson(input.rawPayload),
    },
    update: {
      repoUrl: input.repoUrl,
      description: input.description,
      homepage: input.homepage,
      stars: input.stars,
      primaryLanguage: input.primaryLanguage,
      dominantLanguages: input.dominantLanguages,
      license: input.license,
      topics: input.topics,
      archived: input.archived,
      defaultBranch: input.defaultBranch,
      pushedAt: toDate(input.pushedAt),
      lastFetchedAt: toDate(input.lastFetchedAt),
      readmeTitle: input.readmeTitle,
      readmeIntro: input.readmeIntro,
      readmeHeadings: input.readmeHeadings,
      rootEntries: input.rootEntries,
      rootManifests: input.rootManifests,
      metadata: toInputJson(input.metadata),
      rawPayload: toInputJson(input.rawPayload),
    },
  });

  return toView(row);
}

export async function getGithubRepoUpstreamsByFullNames(fullNames: string[]) {
  const rows = await prisma.githubRepoUpstream.findMany({
    where: {
      fullName: {
        in: [...new Set(fullNames)],
      },
    },
  });

  return new Map(rows.map((row) => [row.fullName, toView(row)]));
}
