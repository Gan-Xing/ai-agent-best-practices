import {
  CONTENT_BATCH_OPTIONAL_FIELDS,
  CONTENT_BATCH_REQUIRED_FIELDS,
  CONTENT_PRISMA_MODEL_FIELD_POLICY,
  CONTENT_RECORD_INTERNAL_FIELDS,
  CONTENT_RECORD_OPTIONAL_FIELDS,
  CONTENT_RECORD_REQUIRED_FIELDS,
  CONTENT_RECORDS_PER_FILE_LIMIT,
  CONTENT_SCHEMA_VERSION,
  CONTENT_SOURCE_OPTIONAL_FIELDS,
  CONTENT_SOURCE_REQUIRED_FIELDS,
  CONTENT_SOURCE_INTERNAL_FIELDS,
  CONTENT_SOURCE_LINK_FIELDS,
  CONTENT_SOURCE_LINK_INTERNAL_FIELDS,
  CONTENT_SOURCE_MODEL_FIELDS,
  CONTENT_SOURCE_TYPE,
  CONTENT_TRANSLATION_INTERNAL_FIELDS,
  CONTENT_TRANSLATION_OPTIONAL_FIELDS,
  CONTENT_TRANSLATION_REQUIRED_FIELDS,
} from "@/lib/validation/content";

console.log(
  JSON.stringify(
    {
      schemaVersion: CONTENT_SCHEMA_VERSION,
      sourceType: CONTENT_SOURCE_TYPE,
      recordsPerFileLimit: CONTENT_RECORDS_PER_FILE_LIMIT,
      batch: {
        required: CONTENT_BATCH_REQUIRED_FIELDS,
        optional: CONTENT_BATCH_OPTIONAL_FIELDS,
      },
      record: {
        required: CONTENT_RECORD_REQUIRED_FIELDS,
        optional: CONTENT_RECORD_OPTIONAL_FIELDS,
        internal: CONTENT_RECORD_INTERNAL_FIELDS,
      },
      translation: {
        required: CONTENT_TRANSLATION_REQUIRED_FIELDS,
        optional: CONTENT_TRANSLATION_OPTIONAL_FIELDS,
        internal: CONTENT_TRANSLATION_INTERNAL_FIELDS,
      },
      source: {
        required: CONTENT_SOURCE_REQUIRED_FIELDS,
        optional: CONTENT_SOURCE_OPTIONAL_FIELDS,
        sourceModelFields: CONTENT_SOURCE_MODEL_FIELDS,
        sourceLinkFields: CONTENT_SOURCE_LINK_FIELDS,
        internal: CONTENT_SOURCE_INTERNAL_FIELDS,
        linkInternal: CONTENT_SOURCE_LINK_INTERNAL_FIELDS,
      },
      defaults: {
        batch: {
          sourceType: CONTENT_SOURCE_TYPE,
        },
        record: {
          schemaVersion: 1,
          type: "NOTE",
          visibility: "INTERNAL",
          status: "DRAFT",
          maturity: "SEED",
          freshness: "UNKNOWN",
          language: "zh",
          translations: [],
          aliases: [],
          keywords: [],
          tags: [],
          sources: [],
        },
        source: {
          role: "REFERENCE",
        },
      },
      constraints: {
        file: {
          directoryPattern: "content/knowledge/{categoryCode}-{categorySlug}",
          fileNamePattern: "records-0001.json",
        },
        batch: {
          schemaVersion: CONTENT_SCHEMA_VERSION,
          sourceType: CONTENT_SOURCE_TYPE,
          categoryCode: "two digits, for example: 01",
          categorySlug: "lowercase kebab-case, for example: hybrid-search",
        },
        record: {
          externalKey: "required and globally unique across content JSON files",
          slug: "required, globally unique, lowercase kebab-case",
          categoryCode: "must match the batch categoryCode",
          unknownFields: "rejected; typos fail validation instead of being ignored",
          internalFields:
            "id, checksum, timestamps, generated indexes, jobs, logs, feedback, and relation edges are managed by the application",
        },
      },
      prismaFieldPolicy: CONTENT_PRISMA_MODEL_FIELD_POLICY,
    },
    null,
    2,
  ),
);
