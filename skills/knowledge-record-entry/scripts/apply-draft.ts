import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CONTENT_RECORDS_PER_FILE_LIMIT,
  CONTENT_SCHEMA_VERSION,
  CONTENT_SOURCE_TYPE,
  contentBatchSchema,
  contentRecordSchema,
  type ContentBatch,
  type ContentRecord,
} from "@/lib/validation/content";

type CategorySeed = {
  code: string;
  slug: string;
  name: string;
  nameZh?: string;
};

type LoadedBatch = {
  absolutePath: string;
  relativePath: string;
  batch: ContentBatch;
};

type Args = {
  draftPath?: string;
  dryRun: boolean;
  help: boolean;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "knowledge");
const CATEGORY_SEED_PATH = path.join(
  process.cwd(),
  "prisma",
  "seed-data",
  "categories.json",
);

function usage() {
  return [
    "Usage:",
    "  pnpm skill:knowledge-record:apply -- --draft /tmp/record.json [--dry-run]",
    "  pnpm tsx skills/knowledge-record-entry/scripts/apply-draft.ts --draft /tmp/record.json [--dry-run]",
    "",
    "The draft file may contain either a KnowledgeRecord object or { \"record\": { ... } }.",
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

async function loadCategories() {
  const categories = (await readJson(CATEGORY_SEED_PATH)) as CategorySeed[];

  return new Map(categories.map((category) => [category.code, category]));
}

function unwrapDraft(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "record" in value
  ) {
    return (value as { record: unknown }).record;
  }

  return value;
}

async function loadContentBatches(): Promise<LoadedBatch[]> {
  const files = await listJsonFiles(CONTENT_ROOT);
  const batches: LoadedBatch[] = [];

  for (const absolutePath of files) {
    const raw = await readJson(absolutePath);
    const parsed = contentBatchSchema.parse(raw);

    batches.push({
      absolutePath,
      relativePath: toPosixPath(path.relative(process.cwd(), absolutePath)),
      batch: parsed,
    });
  }

  return batches;
}

function buildBatch(category: CategorySeed, relativePath: string): ContentBatch {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    sourceType: CONTENT_SOURCE_TYPE,
    sourceLabel: relativePath,
    categoryCode: category.code,
    categorySlug: category.slug,
    batch: 1,
    metadata: {
      maintainer: "Gan-Xing",
      purpose: "Canonical GitHub-visible content source for knowledge records.",
    },
    source: {
      sourceType: CONTENT_SOURCE_TYPE,
      sourceKey: relativePath,
      title: `${category.name} category content batch 0001`,
      role: "COLLECTION",
      note: "Batch-level source for records stored in this JSON file.",
    },
    records: [],
  };
}

function findExistingLocations(batches: LoadedBatch[], record: ContentRecord) {
  const externalKeyLocations: Array<{ loaded: LoadedBatch; record: ContentRecord }> =
    [];
  const slugLocations: Array<{ loaded: LoadedBatch; record: ContentRecord }> = [];

  for (const loaded of batches) {
    for (const existingRecord of loaded.batch.records) {
      if (existingRecord.externalKey === record.externalKey) {
        externalKeyLocations.push({
          loaded,
          record: existingRecord,
        });
      }

      if (existingRecord.slug === record.slug) {
        slugLocations.push({
          loaded,
          record: existingRecord,
        });
      }
    }
  }

  return {
    externalKeyLocations,
    slugLocations,
  };
}

function validatePlacement(
  batches: LoadedBatch[],
  targetRelativePath: string,
  record: ContentRecord,
) {
  const { externalKeyLocations, slugLocations } = findExistingLocations(
    batches,
    record,
  );

  for (const location of externalKeyLocations) {
    if (location.loaded.relativePath !== targetRelativePath) {
      throw new Error(
        `externalKey ${record.externalKey} already exists in ${location.loaded.relativePath}; cross-category moves must be handled manually.`,
      );
    }
  }

  for (const location of slugLocations) {
    const sameRecord = location.record.externalKey === record.externalKey;

    if (!sameRecord || location.loaded.relativePath !== targetRelativePath) {
      throw new Error(
        `slug ${record.slug} already belongs to ${location.record.externalKey} in ${location.loaded.relativePath}.`,
      );
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  if (!args.draftPath) {
    throw new Error(`Missing --draft.\n${usage()}`);
  }

  const categoriesByCode = await loadCategories();
  const rawDraft = unwrapDraft(await readJson(path.resolve(args.draftPath)));
  const record = contentRecordSchema.parse(rawDraft);
  const category = categoriesByCode.get(record.categoryCode);

  if (!category) {
    throw new Error(`Unknown categoryCode: ${record.categoryCode}`);
  }

  const targetRelativePath = toPosixPath(
    path.join(
      "content",
      "knowledge",
      `${category.code}-${category.slug}`,
      "records-0001.json",
    ),
  );
  const targetAbsolutePath = path.join(process.cwd(), targetRelativePath);
  const batches = await loadContentBatches();
  const existingTarget = batches.find(
    (loaded) => loaded.relativePath === targetRelativePath,
  );

  validatePlacement(batches, targetRelativePath, record);

  const targetBatch = existingTarget
    ? existingTarget.batch
    : buildBatch(category, targetRelativePath);

  if (targetBatch.categoryCode !== record.categoryCode) {
    throw new Error(
      `Record categoryCode ${record.categoryCode} does not match target batch ${targetBatch.categoryCode}`,
    );
  }

  const existingIndex = targetBatch.records.findIndex(
    (item) => item.externalKey === record.externalKey,
  );
  const action = existingIndex >= 0 ? "UPDATE" : "CREATE";

  if (existingIndex >= 0) {
    targetBatch.records[existingIndex] = record;
  } else {
    if (targetBatch.records.length >= CONTENT_RECORDS_PER_FILE_LIMIT) {
      throw new Error(
        `${targetRelativePath} already has ${CONTENT_RECORDS_PER_FILE_LIMIT} records`,
      );
    }

    targetBatch.records.push(record);
  }

  contentBatchSchema.parse(targetBatch);

  if (!args.dryRun) {
    await mkdir(path.dirname(targetAbsolutePath), { recursive: true });
    await writeFile(targetAbsolutePath, `${JSON.stringify(targetBatch, null, 2)}\n`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: args.dryRun,
        action,
        path: targetRelativePath,
        externalKey: record.externalKey,
        slug: record.slug,
        records: targetBatch.records.length,
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
