import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CONTENT_BATCH_OPTIONAL_FIELDS,
  CONTENT_BATCH_REQUIRED_FIELDS,
  CONTENT_PRISMA_MODEL_FIELD_POLICY,
  CONTENT_RELATION_INTERNAL_FIELDS,
  CONTENT_RELATION_OPTIONAL_FIELDS,
  CONTENT_RELATION_REQUIRED_FIELDS,
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

const minimalSource = {
  sourceKey: "content-contract-source",
  sourceType: CONTENT_SOURCE_TYPE,
  title: "Content contract source",
  role: "PRIMARY",
  note: "Contract check source.",
};

const minimalRecord = {
  externalKey: "kb-contract-000001",
  slug: "content-contract-minimal-record",
  schemaVersion: 1,
  type: "PRACTICE",
  categoryCode: "01",
  visibility: "PUBLIC",
  status: "PUBLISHED",
  maturity: "REVIEWED",
  freshness: "FRESH",
  confidence: 0.9,
  language: "zh",
  title: "Content contract minimal record",
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
    contentContract: true,
  },
  publishedAt: "2026-01-01",
  lastVerifiedAt: "2026-01-02",
  reviewAfter: "2026-06-01",
  translations: [],
  aliases: [],
  keywords: ["contract keyword"],
  tags: ["contract-tag"],
  sources: [minimalSource],
  relations: [],
};

const minimalBatch = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  sourceType: CONTENT_SOURCE_TYPE,
  sourceLabel: VALID_RELATIVE_PATH,
  categoryCode: "01",
  categorySlug: "models",
  batch: 1,
  metadata: {
    purpose: "contract-check",
  },
  source: minimalSource,
  records: [minimalRecord],
};

const fullSource = {
  ...minimalSource,
  uri: "https://example.com/content-contract",
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
  quote: "Short quote",
  note: "Short note",
};

const fullRecord = {
  ...minimalRecord,
  externalId: "external-contract-000001",
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
  relations: [
    {
      toExternalKey: "kb-contract-000002",
      relationType: "RELATED",
      strength: 0.8,
      description: "Related contract record.",
      metadata: {
        purpose: "relation-contract-check",
      },
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

  const prismaRelationFields = readPrismaModelFields("RecordRelation");
  const relationExposedFields = new Set<string>([
    ...CONTENT_RELATION_REQUIRED_FIELDS,
    ...CONTENT_RELATION_OPTIONAL_FIELDS,
  ]);
  const relationInternalFields = new Set<string>(
    CONTENT_RELATION_INTERNAL_FIELDS,
  );
  const relationVirtualFields = new Set<string>(["toExternalKey", "toSlug"]);
  const missingRelationFields = prismaRelationFields.filter(
    (field) =>
      !relationExposedFields.has(field) &&
      !relationInternalFields.has(field) &&
      !relationVirtualFields.has(field),
  );

  assert(
    missingRelationFields.length === 0,
    `RecordRelation field(s) must be exposed in content JSON or explicitly marked internal: ${missingRelationFields.join(", ")}`,
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

  for (const field of CONTENT_SOURCE_REQUIRED_FIELDS) {
    assertParseFails(
      `source missing required field ${field}`,
      contentSourceSchema,
      withoutKey(minimalSource, field),
    );
  }

  const translation = fullRecord.translations[0] as JsonObject;

  for (const field of CONTENT_TRANSLATION_REQUIRED_FIELDS) {
    assertParseFails(
      `translation missing required field ${field}`,
      contentRecordSchema,
      {
        ...fullRecord,
        translations: [withoutKey(translation, field)],
      },
    );
  }

  const relation = fullRecord.relations[0] as JsonObject;

  for (const field of CONTENT_RELATION_REQUIRED_FIELDS) {
    assertParseFails(
      `relation missing required field ${field}`,
      contentRecordSchema,
      {
        ...fullRecord,
        relations: [withoutKey(relation, field)],
      },
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

function runRequiredStructureChecks() {
  const parsedRecord = contentRecordSchema.parse(minimalRecord);
  const parsedBatch = contentBatchSchema.parse(minimalBatch);
  const parsedSource = contentSourceSchema.parse(minimalSource);

  assert(parsedBatch.sourceType === CONTENT_SOURCE_TYPE, "batch sourceType mismatch");
  assert(parsedRecord.schemaVersion === 1, "record schemaVersion mismatch");
  assert(parsedRecord.translations.length === 0, "record translations structure mismatch");
  assert(parsedRecord.aliases.length === 0, "record aliases structure mismatch");
  assert(parsedRecord.keywords.length === 1, "record keywords structure mismatch");
  assert(parsedRecord.tags.length === 1, "record tags structure mismatch");
  assert(parsedRecord.sources.length === 1, "record sources structure mismatch");
  assert(parsedRecord.relations.length === 0, "record relations structure mismatch");
  assert(parsedSource.role === "PRIMARY", "source role mismatch");
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
    "batch sourceType must be GITHUB_JSON",
    contentBatchSchema,
    {
      ...minimalBatch,
      sourceType: "OTHER",
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
    "record summary must be non-empty",
    contentRecordSchema,
    {
      ...minimalRecord,
      summary: "",
    },
  );
  assertParseFails(
    "record keywords must not be empty",
    contentRecordSchema,
    {
      ...minimalRecord,
      keywords: [],
    },
  );
  assertParseFails(
    "record tags must not be empty",
    contentRecordSchema,
    {
      ...minimalRecord,
      tags: [],
    },
  );
  assertParseFails(
    "record sources must not be empty",
    contentRecordSchema,
    {
      ...minimalRecord,
      sources: [],
    },
  );
  assertParseFails(
    "record metadata must not be empty",
    contentRecordSchema,
    {
      ...minimalRecord,
      metadata: {},
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
          ...fullRecord.translations[0],
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
          ...fullRecord.translations[0],
        },
        {
          ...fullRecord.translations[0],
          title: "Duplicate English title",
        },
      ],
    },
  );
  assertParseFails(
    "relation target identity is required",
    contentRecordSchema,
    {
      ...minimalRecord,
      relations: [
        {
          relationType: "RELATED",
          strength: 0.8,
          description: "Related contract record.",
          metadata: {},
        },
      ],
    },
  );
  assertParseFails(
    "duplicate relations must fail",
    contentRecordSchema,
    {
      ...minimalRecord,
      relations: [
        {
          toExternalKey: "kb-contract-000002",
          relationType: "RELATED",
          strength: 0.8,
          description: "Related contract record.",
          metadata: {},
        },
        {
          toExternalKey: "kb-contract-000002",
          relationType: "RELATED",
          strength: 0.7,
          description: "Duplicate related contract record.",
          metadata: {},
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

  for (const field of ["sourceType", "sourceLabel", "metadata", "source", "records"]) {
    assertParseFails(
      `import request missing required field ${field}`,
      importRequestSchema,
      withoutKey(payload, field),
    );
  }

  const firstRecord = payload.records[0] as JsonObject;

  for (const field of CONTENT_RECORD_REQUIRED_FIELDS) {
    assertParseFails(
      `import record missing required field ${field}`,
      importRequestSchema,
      {
        ...payload,
        records: [withoutKey(firstRecord, field)],
      },
    );
  }

  assertParseFails("import record slug must be lowercase kebab-case", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        slug: "Bad Slug",
      },
    ],
  });

  assertParseFails("import record categoryCode must be two digits", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        categoryCode: "1",
      },
    ],
  });

  assertParseFails("import record summary must be non-empty", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        summary: "",
      },
    ],
  });

  assertParseFails("import record keywords must not be empty", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        keywords: [],
      },
    ],
  });

  assertParseFails("import record tags must not be empty", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        tags: [],
      },
    ],
  });

  assertParseFails("import record sources must not be empty", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        sources: [],
      },
    ],
  });

  assertParseFails("singular import record source must fail", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        source: fullSource,
      },
    ],
  });

  assertParseFails("unknown import request fields must fail", importRequestSchema, {
    ...payload,
    unknownField: true,
  });

  assertParseFails("unknown import record fields must fail", importRequestSchema, {
    ...payload,
    records: [
      {
        ...firstRecord,
        languge: "zh",
      },
    ],
  });

  assertParseFails("unknown import source fields must fail", importRequestSchema, {
    ...payload,
    source: {
      ...fullSource,
      unknownField: true,
    },
  });
}

function main() {
  runSchemaShapeChecks();
  runPrismaCoverageChecks();
  runRequiredFieldChecks();
  runOptionalFieldChecks();
  runRequiredStructureChecks();
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
          "prisma-relation-coverage",
          "required-fields",
          "optional-fields",
          "required-structure",
          "records-per-file-limit",
          "formats",
          "business-rules",
          "import-required-fields",
          "import-strict-fields",
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
