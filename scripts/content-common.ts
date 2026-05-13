import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  CONTENT_RECORDS_PER_FILE_LIMIT,
  CONTENT_SOURCE_TYPE,
  type ContentBatch,
  contentBatchSchema,
} from "@/lib/validation/content";

export type CategorySeed = {
  code: string;
  slug: string;
  name: string;
};

export type LoadedContentBatch = {
  absolutePath: string;
  relativePath: string;
  batch: ContentBatch;
};

export type ContentValidationResult = {
  batches: LoadedContentBatch[];
  errors: string[];
  recordCount: number;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "knowledge");
const CATEGORY_SEED_PATH = path.join(
  process.cwd(),
  "prisma",
  "seed-data",
  "categories.json",
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

function getBatchNumberFromFileName(fileName: string) {
  const match = /^records-(\d{4})\.json$/.exec(fileName);

  return match ? Number.parseInt(match[1], 10) : null;
}

export function validateContentBatchBusinessRules(
  loaded: LoadedContentBatch,
  categoriesByCode: Map<string, CategorySeed>,
  seenExternalKeys: Map<string, string>,
  seenSlugs: Map<string, string>,
) {
  const errors: string[] = [];
  const { batch, relativePath } = loaded;
  const parts = relativePath.split("/");
  const folderName = parts.at(-2);
  const fileName = parts.at(-1) ?? "";
  const expectedFolder = `${batch.categoryCode}-${batch.categorySlug}`;
  const fileBatchNumber = getBatchNumberFromFileName(fileName);
  const category = categoriesByCode.get(batch.categoryCode);
  const fileExternalKeys = new Set<string>();
  const fileSlugs = new Set<string>();

  if (!relativePath.startsWith("content/knowledge/")) {
    errors.push(`${relativePath}: file must live under content/knowledge`);
  }

  if (folderName !== expectedFolder) {
    errors.push(
      `${relativePath}: folder "${folderName}" must be "${expectedFolder}"`,
    );
  }

  if (fileBatchNumber === null) {
    errors.push(`${relativePath}: file name must match records-0001.json`);
  } else if (fileBatchNumber !== batch.batch) {
    errors.push(
      `${relativePath}: file batch ${fileBatchNumber} does not match batch ${batch.batch}`,
    );
  }

  if (batch.sourceLabel && batch.sourceLabel !== relativePath) {
    errors.push(
      `${relativePath}: sourceLabel must match the repository path "${relativePath}"`,
    );
  }

  if (batch.sourceType !== CONTENT_SOURCE_TYPE) {
    errors.push(
      `${relativePath}: sourceType must be ${CONTENT_SOURCE_TYPE} for repository content files`,
    );
  }

  if (!category) {
    errors.push(`${relativePath}: unknown categoryCode "${batch.categoryCode}"`);
  } else if (category.slug !== batch.categorySlug) {
    errors.push(
      `${relativePath}: categorySlug "${batch.categorySlug}" does not match seed slug "${category.slug}"`,
    );
  }

  if (batch.records.length > CONTENT_RECORDS_PER_FILE_LIMIT) {
    errors.push(
      `${relativePath}: records length must be <= ${CONTENT_RECORDS_PER_FILE_LIMIT}`,
    );
  }

  for (const record of batch.records) {
    const label = `${relativePath}#${record.externalKey}`;

    if (record.categoryCode !== batch.categoryCode) {
      errors.push(
        `${label}: record categoryCode "${record.categoryCode}" must match batch categoryCode "${batch.categoryCode}"`,
      );
    }

    if (fileExternalKeys.has(record.externalKey)) {
      errors.push(`${label}: duplicate externalKey inside this file`);
    }

    if (fileSlugs.has(record.slug)) {
      errors.push(`${label}: duplicate slug "${record.slug}" inside this file`);
    }

    const existingExternalKey = seenExternalKeys.get(record.externalKey);
    const existingSlug = seenSlugs.get(record.slug);

    if (existingExternalKey) {
      errors.push(
        `${label}: externalKey already appears in ${existingExternalKey}`,
      );
    }

    if (existingSlug) {
      errors.push(`${label}: slug already appears in ${existingSlug}`);
    }

    fileExternalKeys.add(record.externalKey);
    fileSlugs.add(record.slug);
    seenExternalKeys.set(record.externalKey, relativePath);
    seenSlugs.set(record.slug, relativePath);
  }

  return errors;
}

export async function validateContentFiles(): Promise<ContentValidationResult> {
  const categoriesByCode = await loadCategories();
  const files = await listJsonFiles(CONTENT_ROOT);
  const batches: LoadedContentBatch[] = [];
  const errors: string[] = [];
  const seenExternalKeys = new Map<string, string>();
  const seenSlugs = new Map<string, string>();

  for (const absolutePath of files) {
    const relativePath = toPosixPath(path.relative(process.cwd(), absolutePath));

    try {
      const raw = await readJsonFile(absolutePath);
      const parsed = contentBatchSchema.safeParse(raw);

      if (!parsed.success) {
        errors.push(
          `${relativePath}: ${JSON.stringify(parsed.error.flatten(), null, 2)}`,
        );
        continue;
      }

      const loaded = {
        absolutePath,
        relativePath,
        batch: parsed.data,
      };

      errors.push(
        ...validateContentBatchBusinessRules(
          loaded,
          categoriesByCode,
          seenExternalKeys,
          seenSlugs,
        ),
      );
      batches.push(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relativePath}: ${message}`);
    }
  }

  return {
    batches,
    errors,
    recordCount: batches.reduce(
      (total, loaded) => total + loaded.batch.records.length,
      0,
    ),
  };
}

export function toImportPayload(loaded: LoadedContentBatch) {
  const { batch, relativePath } = loaded;

  return {
    sourceType: batch.sourceType,
    sourceLabel: batch.sourceLabel ?? relativePath,
    metadata: {
      ...(typeof batch.metadata === "object" &&
      batch.metadata !== null &&
      !Array.isArray(batch.metadata)
        ? batch.metadata
        : {}),
      contentPath: relativePath,
      categoryCode: batch.categoryCode,
      categorySlug: batch.categorySlug,
      batch: batch.batch,
    },
    source: batch.source ?? {
      sourceType: batch.sourceType,
      sourceKey: relativePath,
      title: relativePath,
      role: "COLLECTION",
      note: "Canonical GitHub JSON batch source.",
    },
    records: batch.records.map((record) => ({
      ...record,
      source: {
        sourceType: batch.sourceType,
        sourceKey: `${relativePath}#${record.externalKey}`,
        title: record.title,
        role: "PRIMARY",
        note: "Canonical GitHub JSON record source.",
        metadata: {
          contentPath: relativePath,
          externalKey: record.externalKey,
        },
      },
    })),
  };
}
