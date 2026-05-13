import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CONTENT_BATCH_OPTIONAL_FIELDS,
  CONTENT_BATCH_REQUIRED_FIELDS,
  CONTENT_PRISMA_MODEL_FIELD_POLICY,
  CONTENT_RECORD_INTERNAL_FIELDS,
  CONTENT_RECORD_OPTIONAL_FIELDS,
  CONTENT_RECORD_REQUIRED_FIELDS,
  CONTENT_RECORDS_PER_FILE_LIMIT,
  CONTENT_SCHEMA_VERSION,
  CONTENT_SOURCE_INTERNAL_FIELDS,
  CONTENT_SOURCE_LINK_FIELDS,
  CONTENT_SOURCE_LINK_INTERNAL_FIELDS,
  CONTENT_SOURCE_MODEL_FIELDS,
  CONTENT_SOURCE_OPTIONAL_FIELDS,
  CONTENT_SOURCE_REQUIRED_FIELDS,
  CONTENT_SOURCE_TYPE,
  CONTENT_TRANSLATION_INTERNAL_FIELDS,
  CONTENT_TRANSLATION_OPTIONAL_FIELDS,
  CONTENT_TRANSLATION_REQUIRED_FIELDS,
  contentBatchSchema,
  contentRecordSchema,
  contentSourceSchema,
} from "@/lib/validation/content";
import { importRequestSchema } from "@/lib/validation/imports";
import {
  toImportPayload,
  validateContentBatchBusinessRules,
  type CategorySeed,
  type LoadedContentBatch,
} from "./content-common";

type JsonObject = Record<string, unknown>;

const VALID_CATEGORY: CategorySeed = {
  code: "01",
  slug: "models",
  name: "Models",
};

const VALID_RELATIVE_PATH = "content/knowledge/01-models/records-0001.json";

const minimalRecord = {
  externalKey: "kb-contract-000001",
  slug: "content-contract-minimal-record",
  categoryCode: "01",
  title: "Content contract minimal record",
};

const minimalBatch = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  categoryCode: "01",
  categorySlug: "models",
  batch: 1,
  records: [minimalRecord],
};

const fullSource = {
  sourceKey: "content-contract-source",
  sourceType: CONTENT_SOURCE_TYPE,
  uri: "https://example.com/content-contract",
  title: "Content contract source",
  author: "Contract Author",
  publisher: "Contract Publisher",
  publishedAt: "2026-01-01",
  accessedAt: "2026-01-02",
  checksum: "contract-checksum",
  rawPayload: {
    ok: true,
  },
  metadata: {
    purpose: "contract-check",
  },
  role: "PRIMARY",
  quote: "Short quote",
  note: "Short note",
};

const fullRecord = {
  ...minimalRecord,
  externalId: "external-contract-000001",
  schemaVersion: 1,
  type: "PRACTICE",
  visibility: "PUBLIC",
  status: "PUBLISHED",
  maturity: "REVIEWED",
  freshness: "FRESH",
  confidence: 0.9,
  language: "zh",
  summary: "Content contract summary.",
  body: "Content contract body.",
  problem: "Content contract problem.",
  recommendation: "Content contract recommendation.",
  metadata: {
    purpose: "contract-check",
  },
  applicability: {
    audience: ["agent-builders"],
  },
  compatibility: {
    database: "postgresql",
  },
  tradeoffs: {
    pros: ["stable"],
    cons: ["more fields"],
  },
  evidence: {
    sourceQuality: "internal-contract",
  },
  metrics: {
    confidenceScore: 0.9,
  },
  curation: {
    owner: "Gan-Xing",
  },
  extensions: {
    future: ["relations"],
  },
  publishedAt: "2026-01-01",
  lastVerifiedAt: "2026-01-02",
  reviewAfter: "2026-06-01",
  archivedAt: "2026-12-31",
  translations: [
    {
      language: "en",
      title: "Content contract minimal record",
      summary: "English summary.",
      body: "English body.",
      problem: "English problem.",
      recommendation: "English recommendation.",
      metadata: {
        purpose: "translation-contract-check",
      },
    },
  ],
  aliases: ["contract alias"],
  keywords: ["contract keyword"],
  tags: ["contract-tag"],
  sources: [
    {
      ...fullSource,
      sourceKey: "content-contract-secondary-source",
      role: "REFERENCE",
    },
  ],
};

const fullBatch = {
  ...minimalBatch,
  sourceType: CONTENT_SOURCE_TYPE,
  sourceLabel: VALID_RELATIVE_PATH,
  metadata: {
    purpose: "contract-check",
  },
  source: fullSource,
  records: [fullRecord],
};

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function withoutKey(value: JsonObject, key: string) {
  const next = {
    ...value,
  };

  delete next[key];
  return next;
}

function assertSameMembers(name: string, actual: string[], expected: readonly string[]) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();

  assert(
    JSON.stringify(actualSorted) === JSON.stringify(expectedSorted),
    `${name} mismatch. actual=${JSON.stringify(actualSorted)} expected=${JSON.stringify(expectedSorted)}`,
  );
}

function readPrismaModelFields(modelName: string) {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schema = readFileSync(schemaPath, "utf8");
  const match = new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`).exec(schema);

  if (!match) {
    throw new Error(`Prisma model "${modelName}" not found`);
  }

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
    .map((line) => line.split(/\s+/)[0])
    .filter((field) => field && !field.startsWith("@"));
}

function readPrismaModelNames() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schema = readFileSync(schemaPath, "utf8");

  return [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1]);
}

function getPolicyFields(policy: Record<string, readonly string[]>) {
  return Object.values(policy).flat();
}

function assertParseFails(
  name: string,
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
) {
  const result = schema.safeParse(value);

  assert(!result.success, `${name} should fail validation`);
}

function assertParsePasses(
  name: string,
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
) {
  const result = schema.safeParse(value);

  assert(result.success, `${name} should pass validation`);
}

function loadedBatch(
  relativePath: string,
  batch: LoadedContentBatch["batch"],
): LoadedContentBatch {
  return {
    absolutePath: `/repo/${relativePath}`,
    relativePath,
    batch,
  };
}

function businessErrors(loaded: LoadedContentBatch) {
  return validateContentBatchBusinessRules(
    loaded,
    new Map([[VALID_CATEGORY.code, VALID_CATEGORY]]),
    new Map(),
    new Map(),
  );
}

function assertBusinessFails(
  name: string,
  loaded: LoadedContentBatch,
  expectedMessagePart: string,
) {
  const errors = businessErrors(loaded);

  assert(errors.length > 0, `${name} should fail business validation`);
  assert(
    errors.some((error) => error.includes(expectedMessagePart)),
    `${name} should include "${expectedMessagePart}". errors=${JSON.stringify(errors)}`,
  );
}

function runSchemaShapeChecks() {
  assertSameMembers("batch field constants", Object.keys(contentBatchSchema.shape), [
    ...CONTENT_BATCH_REQUIRED_FIELDS,
    ...CONTENT_BATCH_OPTIONAL_FIELDS,
  ]);
  assertSameMembers("record field constants", Object.keys(contentRecordSchema.shape), [
    ...CONTENT_RECORD_REQUIRED_FIELDS,
    ...CONTENT_RECORD_OPTIONAL_FIELDS,
  ]);
  assertSameMembers("source field constants", Object.keys(contentSourceSchema.shape), [
    ...CONTENT_SOURCE_REQUIRED_FIELDS,
    ...CONTENT_SOURCE_OPTIONAL_FIELDS,
  ]);
}

function runPrismaCoverageChecks() {
  const prismaModels = readPrismaModelNames();
  const policyModels = Object.keys(CONTENT_PRISMA_MODEL_FIELD_POLICY);

  assertSameMembers("Prisma model policy", policyModels, prismaModels);

  for (const modelName of prismaModels) {
    const policy =
      CONTENT_PRISMA_MODEL_FIELD_POLICY[
        modelName as keyof typeof CONTENT_PRISMA_MODEL_FIELD_POLICY
      ];
    const prismaFields = readPrismaModelFields(modelName);
    const policyFields = getPolicyFields(policy);

    assertSameMembers(`${modelName} Prisma field policy`, policyFields, prismaFields);
  }

  const prismaRecordFields = readPrismaModelFields("KnowledgeRecord");
  const exposedFields = new Set<string>([
    ...CONTENT_RECORD_REQUIRED_FIELDS,
    ...CONTENT_RECORD_OPTIONAL_FIELDS,
  ]);
  const internalFields = new Set<string>(CONTENT_RECORD_INTERNAL_FIELDS);
  const missingFields = prismaRecordFields.filter(
    (field) => !exposedFields.has(field) && !internalFields.has(field),
  );

  assert(
    missingFields.length === 0,
    `KnowledgeRecord field(s) must be exposed in content JSON or explicitly marked internal: ${missingFields.join(", ")}`,
  );

  const prismaTranslationFields = readPrismaModelFields("RecordTranslation");
  const translationExposedFields = new Set<string>([
    ...CONTENT_TRANSLATION_REQUIRED_FIELDS,
    ...CONTENT_TRANSLATION_OPTIONAL_FIELDS,
  ]);
  const translationInternalFields = new Set<string>(
    CONTENT_TRANSLATION_INTERNAL_FIELDS,
  );
  const missingTranslationFields = prismaTranslationFields.filter(
    (field) =>
      !translationExposedFields.has(field) && !translationInternalFields.has(field),
  );

  assert(
    missingTranslationFields.length === 0,
    `RecordTranslation field(s) must be exposed in content JSON or explicitly marked internal: ${missingTranslationFields.join(", ")}`,
  );

  const prismaSourceFields = readPrismaModelFields("Source");
  const sourceModelFields = new Set<string>(CONTENT_SOURCE_MODEL_FIELDS);
  const sourceInternalFields = new Set<string>(CONTENT_SOURCE_INTERNAL_FIELDS);
  const missingSourceFields = prismaSourceFields.filter(
    (field) => !sourceModelFields.has(field) && !sourceInternalFields.has(field),
  );

  assert(
    missingSourceFields.length === 0,
    `Source field(s) must be exposed in content JSON or explicitly marked internal: ${missingSourceFields.join(", ")}`,
  );

  const prismaSourceLinkFields = readPrismaModelFields("KnowledgeRecordSource");
  const sourceLinkFields = new Set<string>(CONTENT_SOURCE_LINK_FIELDS);
  const sourceLinkInternalFields = new Set<string>(
    CONTENT_SOURCE_LINK_INTERNAL_FIELDS,
  );
  const missingSourceLinkFields = prismaSourceLinkFields.filter(
    (field) =>
      !sourceLinkFields.has(field) && !sourceLinkInternalFields.has(field),
  );

  assert(
    missingSourceLinkFields.length === 0,
    `KnowledgeRecordSource field(s) must be exposed in content JSON or explicitly marked internal: ${missingSourceLinkFields.join(", ")}`,
  );
}

function runRequiredFieldChecks() {
  assertParsePasses("minimal batch", contentBatchSchema, minimalBatch);
  assertParsePasses("minimal record", contentRecordSchema, minimalRecord);

  for (const field of CONTENT_BATCH_REQUIRED_FIELDS) {
    assertParseFails(
      `batch missing required field ${field}`,
      contentBatchSchema,
      withoutKey(minimalBatch, field),
    );
  }

  for (const field of CONTENT_RECORD_REQUIRED_FIELDS) {
    assertParseFails(
      `record missing required field ${field}`,
      contentRecordSchema,
      withoutKey(minimalRecord, field),
    );
  }
}

function runOptionalFieldChecks() {
  assertParsePasses("full batch", contentBatchSchema, fullBatch);
  assertParsePasses("full record", contentRecordSchema, fullRecord);
  assertParsePasses("full source", contentSourceSchema, fullSource);

  for (const field of CONTENT_BATCH_OPTIONAL_FIELDS) {
    assertParsePasses(
      `batch missing optional field ${field}`,
      contentBatchSchema,
      withoutKey(fullBatch, field),
    );
  }

  for (const field of CONTENT_RECORD_OPTIONAL_FIELDS) {
    assertParsePasses(
      `record missing optional field ${field}`,
      contentRecordSchema,
      withoutKey(fullRecord, field),
    );
  }

  for (const field of CONTENT_SOURCE_OPTIONAL_FIELDS) {
    assertParsePasses(
      `source missing optional field ${field}`,
      contentSourceSchema,
      withoutKey(fullSource, field),
    );
  }
}

function runDefaultValueChecks() {
  const parsedRecord = contentRecordSchema.parse(minimalRecord);
  const parsedBatch = contentBatchSchema.parse(minimalBatch);
  const parsedSource = contentSourceSchema.parse({});

  assert(parsedBatch.sourceType === CONTENT_SOURCE_TYPE, "batch sourceType default mismatch");
  assert(parsedRecord.type === "NOTE", "record type default mismatch");
  assert(parsedRecord.visibility === "INTERNAL", "record visibility default mismatch");
  assert(parsedRecord.status === "DRAFT", "record status default mismatch");
  assert(parsedRecord.maturity === "SEED", "record maturity default mismatch");
  assert(parsedRecord.freshness === "UNKNOWN", "record freshness default mismatch");
  assert(parsedRecord.language === "zh", "record language default mismatch");
  assert(parsedRecord.schemaVersion === 1, "record schemaVersion default mismatch");
  assert(parsedRecord.translations.length === 0, "record translations default mismatch");
  assert(parsedRecord.aliases.length === 0, "record aliases default mismatch");
  assert(parsedRecord.keywords.length === 0, "record keywords default mismatch");
  assert(parsedRecord.tags.length === 0, "record tags default mismatch");
  assert(parsedRecord.sources.length === 0, "record sources default mismatch");
  assert(parsedSource.role === "REFERENCE", "source role default mismatch");
}

function runLimitChecks() {
  const records = Array.from(
    {
      length: CONTENT_RECORDS_PER_FILE_LIMIT + 1,
    },
    (_, index) => ({
      ...minimalRecord,
      externalKey: `kb-contract-limit-${index.toString().padStart(6, "0")}`,
      slug: `content-contract-limit-${index.toString().padStart(6, "0")}`,
    }),
  );

  assertParseFails(
    "records per file limit",
    contentBatchSchema,
    {
      ...minimalBatch,
      records,
    },
  );
}

function runFormatChecks() {
  assertParseFails(
    "record slug must be lowercase kebab-case",
    contentRecordSchema,
    {
      ...minimalRecord,
      slug: "Bad Slug",
    },
  );
  assertParseFails(
    "batch categorySlug must be lowercase kebab-case",
    contentBatchSchema,
    {
      ...minimalBatch,
      categorySlug: "Bad Slug",
    },
  );
  assertParseFails(
    "batch categoryCode must be two digits",
    contentBatchSchema,
    {
      ...minimalBatch,
      categoryCode: "1",
      records: [
        {
          ...minimalRecord,
          categoryCode: "1",
        },
      ],
    },
  );
  assertParseFails(
    "unknown record fields must fail",
    contentRecordSchema,
    {
      ...minimalRecord,
      languge: "zh",
    },
  );
  assertParseFails(
    "unknown batch fields must fail",
    contentBatchSchema,
    {
      ...minimalBatch,
      unknownField: true,
    },
  );
  assertParseFails(
    "unsupported content schemaVersion must fail",
    contentRecordSchema,
    {
      ...minimalRecord,
      schemaVersion: 2,
    },
  );
  assertParseFails(
    "unknown translation fields must fail",
    contentRecordSchema,
    {
      ...minimalRecord,
      translations: [
        {
          language: "en",
          title: "English title",
          unknownField: true,
        },
      ],
    },
  );
  assertParseFails(
    "duplicate translation languages must fail",
    contentRecordSchema,
    {
      ...minimalRecord,
      translations: [
        {
          language: "en",
          title: "English title",
        },
        {
          language: "en",
          title: "Duplicate English title",
        },
      ],
    },
  );
}

function runBusinessRuleChecks() {
  const validBatch = contentBatchSchema.parse(fullBatch);
  const validErrors = businessErrors(loadedBatch(VALID_RELATIVE_PATH, validBatch));

  assert(
    validErrors.length === 0,
    `valid business rules should pass. errors=${JSON.stringify(validErrors)}`,
  );

  assertBusinessFails(
    "wrong folder",
    loadedBatch("content/knowledge/01-wrong/records-0001.json", validBatch),
    "folder",
  );
  assertBusinessFails(
    "wrong file batch",
    loadedBatch("content/knowledge/01-models/records-0002.json", validBatch),
    "file batch",
  );
  assertBusinessFails(
    "wrong sourceLabel",
    loadedBatch(
      VALID_RELATIVE_PATH,
      contentBatchSchema.parse({
        ...fullBatch,
        sourceLabel: "content/knowledge/01-models/wrong.json",
      }),
    ),
    "sourceLabel",
  );
  assertBusinessFails(
    "wrong sourceType",
    loadedBatch(
      VALID_RELATIVE_PATH,
      contentBatchSchema.parse({
        ...fullBatch,
        sourceType: "OTHER",
      }),
    ),
    "sourceType",
  );
  assertBusinessFails(
    "unknown category",
    loadedBatch(
      "content/knowledge/99-unknown/records-0001.json",
      contentBatchSchema.parse({
        ...fullBatch,
        categoryCode: "99",
        categorySlug: "unknown",
        records: [
          {
            ...fullRecord,
            categoryCode: "99",
          },
        ],
      }),
    ),
    "unknown categoryCode",
  );
  assertBusinessFails(
    "record category mismatch",
    loadedBatch(
      VALID_RELATIVE_PATH,
      contentBatchSchema.parse({
        ...fullBatch,
        records: [
          {
            ...fullRecord,
            categoryCode: "02",
          },
        ],
      }),
    ),
    "must match batch categoryCode",
  );
  assertBusinessFails(
    "duplicate externalKey",
    loadedBatch(
      VALID_RELATIVE_PATH,
      contentBatchSchema.parse({
        ...fullBatch,
        records: [
          fullRecord,
          {
            ...fullRecord,
            title: "Duplicate externalKey",
            slug: "duplicate-external-key-only",
          },
        ],
      }),
    ),
    "duplicate externalKey",
  );
  assertBusinessFails(
    "duplicate slug",
    loadedBatch(
      VALID_RELATIVE_PATH,
      contentBatchSchema.parse({
        ...fullBatch,
        records: [
          fullRecord,
          {
            ...fullRecord,
            title: "Duplicate slug",
            externalKey: "kb-contract-000002",
          },
        ],
      }),
    ),
    "duplicate slug",
  );
}

function runImportPayloadChecks() {
  const parsedBatch = contentBatchSchema.parse(minimalBatch);
  const payload = toImportPayload(loadedBatch(VALID_RELATIVE_PATH, parsedBatch));
  const parsedPayload = importRequestSchema.safeParse(payload);

  assert(
    parsedPayload.success,
    `content import payload should satisfy importRequestSchema: ${
      parsedPayload.success ? "" : JSON.stringify(parsedPayload.error.flatten())
    }`,
  );
}

function main() {
  runSchemaShapeChecks();
  runPrismaCoverageChecks();
  runRequiredFieldChecks();
  runOptionalFieldChecks();
  runDefaultValueChecks();
  runLimitChecks();
  runFormatChecks();
  runBusinessRuleChecks();
  runImportPayloadChecks();

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "schema-shape",
          "full-prisma-model-field-policy",
          "prisma-knowledge-record-coverage",
          "prisma-translation-source-coverage",
          "required-fields",
          "optional-fields",
          "defaults",
          "records-per-file-limit",
          "formats",
          "business-rules",
          "import-payload",
        ],
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
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
}
