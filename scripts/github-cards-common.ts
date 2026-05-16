import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  type GithubRepoCard,
  githubRepoCardSchema,
} from "@/lib/validation/github-resource";

type CategorySeed = {
  code: string;
  slug: string;
  name: string;
};

type VocabularySeed = {
  namespace: string;
  code: string;
};

export type LoadedGithubRepoCard = {
  absolutePath: string;
  relativePath: string;
  card: GithubRepoCard;
};

export type GithubCardValidationResult = {
  cards: LoadedGithubRepoCard[];
  errors: string[];
};

const GITHUB_CARD_ROOT = path.join(
  process.cwd(),
  "content",
  "resources",
  "github",
  "cards",
);
const CATEGORY_SEED_PATH = path.join(
  process.cwd(),
  "prisma",
  "seed-data",
  "categories.json",
);
const VOCABULARY_SEED_PATH = path.join(
  process.cwd(),
  "prisma",
  "seed-data",
  "vocabulary.json",
);

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
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

async function readJsonFile(filePath: string) {
  const content = await readFile(filePath, "utf8");

  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`${filePath}: ${message}`);
  }
}

async function loadCategories() {
  const categories = (await readJsonFile(CATEGORY_SEED_PATH)) as CategorySeed[];

  return new Map(categories.map((category) => [category.code, category]));
}

async function loadRecordTypes() {
  const vocabulary = (await readJsonFile(VOCABULARY_SEED_PATH)) as VocabularySeed[];

  return new Set(
    vocabulary
      .filter((entry) => entry.namespace === "record_type")
      .map((entry) => entry.code),
  );
}

export function validateGithubRepoCardBusinessRules(
  loaded: LoadedGithubRepoCard,
  categoriesByCode: Map<string, CategorySeed>,
  recordTypes: Set<string>,
  seenCardKeys: Map<string, string>,
  seenRepos: Map<string, string>,
) {
  const errors: string[] = [];
  const { card, relativePath } = loaded;
  const fileName = path.basename(relativePath);
  const expectedFileName = `${card.cardKey}.json`;
  const repoKey = card.repo.fullName;

  if (!relativePath.startsWith("content/resources/github/cards/")) {
    errors.push(`${relativePath}: file must live under content/resources/github/cards`);
  }

  if (fileName !== expectedFileName) {
    errors.push(`${relativePath}: file name must be "${expectedFileName}"`);
  }

  if (!categoriesByCode.has(card.classification.categoryCode)) {
    errors.push(
      `${relativePath}: unknown categoryCode "${card.classification.categoryCode}"`,
    );
  }

  for (const code of card.classification.secondaryCategoryCodes ?? []) {
    if (!categoriesByCode.has(code)) {
      errors.push(`${relativePath}: unknown secondary categoryCode "${code}"`);
    }
  }

  if (!recordTypes.has(card.classification.recordType)) {
    errors.push(
      `${relativePath}: unknown recordType "${card.classification.recordType}"`,
    );
  }

  const existingCardKey = seenCardKeys.get(card.cardKey);
  const existingRepo = seenRepos.get(repoKey);

  if (existingCardKey) {
    errors.push(`${relativePath}: cardKey already appears in ${existingCardKey}`);
  }

  if (existingRepo) {
    errors.push(`${relativePath}: repository already appears in ${existingRepo}`);
  }

  seenCardKeys.set(card.cardKey, relativePath);
  seenRepos.set(repoKey, relativePath);

  return errors;
}

export async function validateGithubRepoCards(): Promise<GithubCardValidationResult> {
  const [categoriesByCode, recordTypes, files] = await Promise.all([
    loadCategories(),
    loadRecordTypes(),
    listJsonFiles(GITHUB_CARD_ROOT),
  ]);
  const cards: LoadedGithubRepoCard[] = [];
  const errors: string[] = [];
  const seenCardKeys = new Map<string, string>();
  const seenRepos = new Map<string, string>();

  for (const absolutePath of files) {
    const relativePath = toPosixPath(path.relative(process.cwd(), absolutePath));

    try {
      const raw = await readJsonFile(absolutePath);
      const parsed = githubRepoCardSchema.safeParse(raw);

      if (!parsed.success) {
        errors.push(
          `${relativePath}: ${JSON.stringify(parsed.error.flatten(), null, 2)}`,
        );
        continue;
      }

      const loaded = {
        absolutePath,
        relativePath,
        card: parsed.data,
      };

      errors.push(
        ...validateGithubRepoCardBusinessRules(
          loaded,
          categoriesByCode,
          recordTypes,
          seenCardKeys,
          seenRepos,
        ),
      );
      cards.push(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: ${message}`);
    }
  }

  return { cards, errors };
}
