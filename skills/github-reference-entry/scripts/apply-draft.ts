import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type GithubRepoCard,
  githubRepoCardSchema,
} from "@/lib/validation/github-resource";

type LoadedCard = {
  absolutePath: string;
  relativePath: string;
  card: GithubRepoCard;
};

type Args = {
  draftPath?: string;
  dryRun: boolean;
  help: boolean;
};

const CARD_ROOT = path.join(
  process.cwd(),
  "content",
  "resources",
  "github",
  "cards",
);

function usage() {
  return [
    "Usage:",
    "  pnpm skill:github-reference:apply -- --draft /tmp/card.json [--dry-run]",
    "  pnpm tsx skills/github-reference-entry/scripts/apply-draft.ts --draft /tmp/card.json [--dry-run]",
    "",
    'The draft file may contain either a card object or { "card": { ... } }.',
  ].join("\n");
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--draft") {
      args.draftPath = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n${usage()}`);
  }

  return args;
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

function unwrapDraft(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "card" in value
  ) {
    return (value as { card: unknown }).card;
  }

  return value;
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
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

async function loadExistingCards(): Promise<LoadedCard[]> {
  const files = await listJsonFiles(CARD_ROOT);
  const loadedCards: LoadedCard[] = [];

  for (const absolutePath of files) {
    const raw = await readJson(absolutePath);
    const parsed = githubRepoCardSchema.parse(raw);

    loadedCards.push({
      absolutePath,
      relativePath: toPosixPath(path.relative(process.cwd(), absolutePath)),
      card: parsed,
    });
  }

  return loadedCards;
}

function findConflicts(existingCards: LoadedCard[], draftCard: GithubRepoCard) {
  const targetRelativePath = `content/resources/github/cards/${draftCard.cardKey}.json`;
  const repoKey = draftCard.repo.fullName;

  const cardKeyConflict = existingCards.find(
    (loaded) =>
      loaded.card.cardKey === draftCard.cardKey &&
      loaded.relativePath !== targetRelativePath,
  );
  const repoConflict = existingCards.find(
    (loaded) =>
      loaded.card.repo.fullName === repoKey &&
      loaded.card.cardKey !== draftCard.cardKey,
  );

  return {
    targetRelativePath,
    existingTarget: existingCards.find(
      (loaded) => loaded.relativePath === targetRelativePath,
    ),
    cardKeyConflict,
    repoConflict,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  if (!args.draftPath) {
    throw new Error(`--draft is required\n${usage()}`);
  }

  const rawDraft = unwrapDraft(await readJson(args.draftPath));
  const draftCard = githubRepoCardSchema.parse(rawDraft);
  const existingCards = await loadExistingCards();
  const { targetRelativePath, existingTarget, cardKeyConflict, repoConflict } =
    findConflicts(existingCards, draftCard);

  if (cardKeyConflict) {
    throw new Error(
      `cardKey conflict: ${draftCard.cardKey} already exists in ${cardKeyConflict.relativePath}`,
    );
  }

  if (repoConflict) {
    throw new Error(
      `repo conflict: ${draftCard.repo.fullName} already exists as ${repoConflict.card.cardKey} in ${repoConflict.relativePath}`,
    );
  }

  const targetAbsolutePath = path.join(process.cwd(), targetRelativePath);

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          action: existingTarget ? "update" : "create",
          path: targetRelativePath,
          cardKey: draftCard.cardKey,
          repo: draftCard.repo.fullName,
        },
        null,
        2,
      ),
    );
    return;
  }

  await mkdir(path.dirname(targetAbsolutePath), { recursive: true });
  await writeFile(
    targetAbsolutePath,
    `${JSON.stringify(draftCard, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: existingTarget ? "update" : "create",
        path: targetRelativePath,
        cardKey: draftCard.cardKey,
        repo: draftCard.repo.fullName,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
