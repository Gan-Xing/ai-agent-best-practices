import { z } from "zod";

import {
  importRecordInputSchema,
  importSourceSchema,
} from "@/lib/validation/imports";
import { jsonValueSchema } from "@/lib/validation/records";

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_RECORDS_PER_FILE_LIMIT = 100;
export const CONTENT_SOURCE_TYPE = "GITHUB_JSON";

export const CONTENT_BATCH_REQUIRED_FIELDS = [
  "schemaVersion",
  "categoryCode",
  "categorySlug",
  "batch",
  "records",
] as const;

export const CONTENT_BATCH_OPTIONAL_FIELDS = [
  "sourceType",
  "sourceLabel",
  "metadata",
  "source",
] as const;

export const CONTENT_RECORD_REQUIRED_FIELDS = [
  "externalKey",
  "slug",
  "categoryCode",
  "title",
] as const;

export const CONTENT_RECORD_OPTIONAL_FIELDS = [
  "externalId",
  "schemaVersion",
  "type",
  "visibility",
  "status",
  "maturity",
  "freshness",
  "confidence",
  "language",
  "summary",
  "body",
  "problem",
  "recommendation",
  "metadata",
  "applicability",
  "compatibility",
  "tradeoffs",
  "evidence",
  "metrics",
  "curation",
  "extensions",
  "publishedAt",
  "lastVerifiedAt",
  "reviewAfter",
  "archivedAt",
  "translations",
  "aliases",
  "keywords",
  "tags",
  "sources",
] as const;

export const CONTENT_RECORD_INTERNAL_FIELDS = [
  "id",
  "checksum",
  "createdAt",
  "updatedAt",
  "category",
  "versions",
  "chunks",
  "searchIndexes",
  "searchIndexJobs",
  "embeddingJobs",
  "importItems",
  "searchResults",
  "feedback",
  "outgoingRelations",
  "incomingRelations",
] as const;

export const CONTENT_TRANSLATION_REQUIRED_FIELDS = [
  "language",
  "title",
] as const;

export const CONTENT_TRANSLATION_OPTIONAL_FIELDS = [
  "summary",
  "body",
  "problem",
  "recommendation",
  "metadata",
] as const;

export const CONTENT_TRANSLATION_INTERNAL_FIELDS = [
  "id",
  "recordId",
  "createdAt",
  "updatedAt",
  "record",
] as const;

export const CONTENT_SOURCE_REQUIRED_FIELDS = [] as const;

export const CONTENT_SOURCE_OPTIONAL_FIELDS = [
  "sourceKey",
  "sourceType",
  "uri",
  "title",
  "author",
  "publisher",
  "publishedAt",
  "accessedAt",
  "checksum",
  "rawPayload",
  "metadata",
  "role",
  "quote",
  "note",
] as const;

export const CONTENT_SOURCE_MODEL_FIELDS = [
  "sourceKey",
  "sourceType",
  "uri",
  "title",
  "author",
  "publisher",
  "publishedAt",
  "accessedAt",
  "checksum",
  "rawPayload",
  "metadata",
] as const;

export const CONTENT_SOURCE_LINK_FIELDS = [
  "role",
  "quote",
  "note",
  "metadata",
] as const;

export const CONTENT_SOURCE_INTERNAL_FIELDS = [
  "id",
  "createdAt",
  "updatedAt",
  "records",
] as const;

export const CONTENT_SOURCE_LINK_INTERNAL_FIELDS = [
  "recordId",
  "sourceId",
  "createdAt",
  "record",
  "source",
] as const;

export const CONTENT_PRISMA_MODEL_FIELD_POLICY = {
  KnowledgeRecord: {
    jsonWritable: [
      "slug",
      "externalKey",
      "externalId",
      "schemaVersion",
      "type",
      "categoryCode",
      "visibility",
      "status",
      "maturity",
      "freshness",
      "confidence",
      "language",
      "title",
      "summary",
      "body",
      "problem",
      "recommendation",
      "metadata",
      "applicability",
      "compatibility",
      "tradeoffs",
      "evidence",
      "metrics",
      "curation",
      "extensions",
      "publishedAt",
      "lastVerifiedAt",
      "reviewAfter",
      "archivedAt",
    ],
    jsonNested: ["tags", "translations", "aliases", "keywords", "sources"],
    derived: ["checksum"],
    systemManaged: [
      "id",
      "createdAt",
      "updatedAt",
      "category",
      "versions",
      "chunks",
      "searchIndexes",
      "searchIndexJobs",
      "embeddingJobs",
      "importItems",
      "searchResults",
      "feedback",
      "outgoingRelations",
      "incomingRelations",
    ],
  },
  VocabularyTerm: {
    catalogManaged: [
      "id",
      "namespace",
      "code",
      "label",
      "labelZh",
      "description",
      "sortOrder",
      "isActive",
      "metadata",
      "createdAt",
      "updatedAt",
    ],
  },
  Category: {
    catalogManaged: [
      "id",
      "code",
      "slug",
      "name",
      "nameZh",
      "description",
      "parentCode",
      "sortOrder",
      "isActive",
      "metadata",
      "createdAt",
      "updatedAt",
      "parent",
      "children",
      "records",
    ],
  },
  RecordTranslation: {
    jsonWritable: [
      "language",
      "title",
      "summary",
      "body",
      "problem",
      "recommendation",
      "metadata",
    ],
    systemManaged: ["id", "recordId", "createdAt", "updatedAt", "record"],
  },
  RecordChunk: {
    derived: [
      "id",
      "recordId",
      "chunkNo",
      "kind",
      "language",
      "text",
      "contentHash",
      "tokenCount",
      "metadata",
      "createdAt",
      "updatedAt",
      "record",
      "embeddings",
      "embeddingJobs",
      "searchResults",
      "feedback",
    ],
  },
  RecordSearchIndex: {
    derived: [
      "id",
      "recordId",
      "language",
      "title",
      "summary",
      "body",
      "tags",
      "aliases",
      "keywords",
      "contentHash",
      "searchVector",
      "metadata",
      "createdAt",
      "updatedAt",
      "record",
    ],
  },
  Tag: {
    derived: [
      "id",
      "slug",
      "name",
      "nameZh",
      "description",
      "parentId",
      "metadata",
      "createdAt",
      "updatedAt",
      "parent",
      "children",
      "records",
    ],
  },
  KnowledgeRecordTag: {
    derived: ["recordId", "tagId", "weight", "createdAt", "record", "tag"],
  },
  Alias: {
    derived: ["id", "recordId", "alias", "language", "kind", "createdAt", "record"],
  },
  Keyword: {
    derived: [
      "id",
      "recordId",
      "keyword",
      "language",
      "weight",
      "createdAt",
      "record",
    ],
  },
  Source: {
    jsonWritable: [
      "sourceKey",
      "sourceType",
      "uri",
      "title",
      "author",
      "publisher",
      "publishedAt",
      "accessedAt",
      "checksum",
      "rawPayload",
      "metadata",
    ],
    systemManaged: ["id", "createdAt", "updatedAt", "records"],
  },
  KnowledgeRecordSource: {
    jsonWritable: ["role", "quote", "note", "metadata"],
    systemManaged: ["recordId", "sourceId", "createdAt", "record", "source"],
  },
  RecordRelation: {
    deferredContent: [
      "id",
      "fromRecordId",
      "toRecordId",
      "relationType",
      "strength",
      "description",
      "metadata",
      "createdAt",
      "updatedAt",
      "fromRecord",
      "toRecord",
    ],
  },
  RecordVersion: {
    derived: [
      "id",
      "recordId",
      "versionNo",
      "changeType",
      "title",
      "summary",
      "body",
      "snapshot",
      "diff",
      "createdBy",
      "note",
      "createdAt",
      "record",
    ],
  },
  RecordEmbedding: {
    generated: [
      "id",
      "chunkId",
      "provider",
      "model",
      "dimensions",
      "contentHash",
      "embedding",
      "metadata",
      "createdAt",
      "updatedAt",
      "chunk",
    ],
  },
  ImportJob: {
    runtime: [
      "id",
      "sourceType",
      "status",
      "payload",
      "stats",
      "error",
      "startedAt",
      "finishedAt",
      "createdAt",
      "updatedAt",
      "items",
    ],
  },
  ImportJobItem: {
    runtime: [
      "id",
      "jobId",
      "recordId",
      "externalKey",
      "externalId",
      "slug",
      "action",
      "status",
      "checksum",
      "payload",
      "error",
      "createdAt",
      "updatedAt",
      "job",
      "record",
    ],
  },
  SearchIndexJob: {
    runtime: [
      "id",
      "recordId",
      "language",
      "status",
      "attempts",
      "priority",
      "reason",
      "error",
      "lockedAt",
      "startedAt",
      "finishedAt",
      "payload",
      "createdAt",
      "updatedAt",
      "record",
    ],
  },
  EmbeddingJob: {
    runtime: [
      "id",
      "recordId",
      "chunkId",
      "provider",
      "model",
      "status",
      "attempts",
      "priority",
      "error",
      "lockedAt",
      "startedAt",
      "finishedAt",
      "payload",
      "createdAt",
      "updatedAt",
      "record",
      "chunk",
    ],
  },
  AuditLog: {
    runtime: [
      "id",
      "actorId",
      "actorType",
      "action",
      "targetType",
      "targetId",
      "before",
      "after",
      "metadata",
      "ipAddress",
      "userAgent",
      "createdAt",
    ],
  },
  SearchQueryLog: {
    runtime: [
      "id",
      "query",
      "mode",
      "filters",
      "resultCount",
      "topRecordIds",
      "latencyMs",
      "userId",
      "sessionId",
      "metadata",
      "createdAt",
      "results",
      "feedback",
      "answers",
    ],
  },
  AnswerLog: {
    runtime: [
      "id",
      "queryLogId",
      "provider",
      "model",
      "promptVersion",
      "answer",
      "citations",
      "inputTokens",
      "outputTokens",
      "costUsd",
      "latencyMs",
      "metadata",
      "createdAt",
      "queryLog",
      "feedback",
    ],
  },
  SearchResultLog: {
    runtime: [
      "id",
      "queryLogId",
      "recordId",
      "chunkId",
      "rank",
      "score",
      "source",
      "scores",
      "metadata",
      "createdAt",
      "queryLog",
      "record",
      "chunk",
    ],
  },
  SearchFeedback: {
    runtime: [
      "id",
      "queryLogId",
      "answerId",
      "recordId",
      "chunkId",
      "userId",
      "sessionId",
      "rating",
      "label",
      "comment",
      "metadata",
      "createdAt",
      "queryLog",
      "answer",
      "record",
      "chunk",
    ],
  },
} as const;

const contentSlugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Use lowercase kebab-case, for example: hybrid-search-basics",
  });

const contentCategoryCodeSchema = z.string().trim().regex(/^\d{2}$/, {
  message: "Use a two-digit category code, for example: 01",
});

export const contentSourceSchema = importSourceSchema.strict();
const contentRecordBaseSchema = importRecordInputSchema.omit({
  source: true,
});

export const contentRecordSchema = contentRecordBaseSchema.extend({
  externalKey: z.string().trim().min(1),
  slug: contentSlugSchema,
  categoryCode: contentCategoryCodeSchema,
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION).default(CONTENT_SCHEMA_VERSION),
  title: z.string().trim().min(1),
  sources: z.array(contentSourceSchema).optional().default([]),
}).strict();

export const contentBatchSchema = z.object({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  sourceType: z.string().trim().min(1).default(CONTENT_SOURCE_TYPE),
  sourceLabel: z.string().trim().min(1).optional(),
  categoryCode: contentCategoryCodeSchema,
  categorySlug: contentSlugSchema,
  batch: z.number().int().positive(),
  metadata: jsonValueSchema.optional(),
  source: contentSourceSchema.optional(),
  records: z
    .array(contentRecordSchema)
    .min(1)
    .max(CONTENT_RECORDS_PER_FILE_LIMIT),
}).strict();

export type ContentBatch = z.infer<typeof contentBatchSchema>;
export type ContentRecord = z.infer<typeof contentRecordSchema>;
