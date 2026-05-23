import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createRecordInputSchema,
  listRecordsQuerySchema,
} from "@/lib/validation/records";

type CreateRecordInput = z.infer<typeof createRecordInputSchema>;
type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;

const recordListInclude = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
  aliases: true,
  keywords: true,
  versions: {
    orderBy: {
      versionNo: "desc",
    },
    take: 1,
  },
} satisfies Prisma.KnowledgeRecordInclude;

const recordDetailInclude = {
  ...recordListInclude,
  translations: true,
  versions: {
    orderBy: {
      versionNo: "desc" as const,
    },
    take: 10,
  },
  sources: {
    include: {
      source: true,
    },
  },
  outgoingRelations: {
    include: {
      toRecord: {
        select: {
          externalKey: true,
          slug: true,
          title: true,
        },
      },
    },
  },
  incomingRelations: {
    include: {
      fromRecord: {
        select: {
          externalKey: true,
          slug: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.KnowledgeRecordInclude;

type RecordDetail = Prisma.KnowledgeRecordGetPayload<{
  include: typeof recordDetailInclude;
}>;

type RecordSnapshot = {
  slug: string;
  externalKey: string | null;
  externalId: string | null;
  schemaVersion: number;
  type: string;
  categoryCode: string;
  visibility: CreateRecordInput["visibility"];
  status: CreateRecordInput["status"];
  maturity: CreateRecordInput["maturity"];
  freshness: CreateRecordInput["freshness"];
  confidence: number | null;
  language: string;
  title: string;
  summary: string | null;
  body: string | null;
  problem: string | null;
  recommendation: string | null;
  metadata: Prisma.JsonValue | null;
  applicability: Prisma.JsonValue | null;
  compatibility: Prisma.JsonValue | null;
  tradeoffs: Prisma.JsonValue | null;
  evidence: Prisma.JsonValue | null;
  metrics: Prisma.JsonValue | null;
  curation: Prisma.JsonValue | null;
  extensions: Prisma.JsonValue | null;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
  reviewAfter: string | null;
  archivedAt: string | null;
  translations: Array<{
    language: string;
    title: string;
    summary: string | null;
    body: string | null;
    problem: string | null;
    recommendation: string | null;
    metadata: Prisma.JsonValue | null;
  }>;
  aliases: string[];
  keywords: string[];
  tags: string[];
  sources: Array<{
    sourceKey: string | null;
    sourceType: string;
    uri: string | null;
    title: string | null;
    author: string | null;
    publisher: string | null;
    publishedAt: string | null;
    accessedAt: string | null;
    checksum: string | null;
    rawPayload: Prisma.JsonValue | null;
    metadata: Prisma.JsonValue | null;
    role: string;
    quote: string | null;
    note: string | null;
  }>;
  relations: Array<{
    toExternalKey: string | null;
    toSlug: string;
    relationType: string;
    strength: number | null;
    description: string | null;
    metadata: Prisma.JsonValue | null;
  }>;
};

type RecordWriteArtifacts = {
  parsed: CreateRecordInput;
  slug: string;
  tags: Array<{ id: string; name: string }>;
  chunks: Array<{
    kind: string;
    language: string;
    text: string;
    contentHash: string;
  }>;
  searchIndexes: Array<{
    language: string;
    title: string;
    summary: string | null;
    body: string | null;
    tags: string;
    aliases: string;
    keywords: string;
    contentHash: string;
  }>;
  snapshot: RecordSnapshot;
  recordChecksum: string;
};

type RecordWriteOptions = {
  actorType: string;
  auditAction: string;
  note: string;
  auditMetadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

type RecordWriteResult = {
  action: "CREATE" | "UPDATE";
  record: RecordDetail;
  snapshot: RecordSnapshot;
  versionId: string;
  auditLogId: string;
  identityChanged: boolean;
};

type ImportUpsertOptions = {
  actorType?: string;
  note?: string;
  auditMetadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

type RefreshRecordSnapshotOptions = {
  versionId?: string;
  auditLogId?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureSlug(input: CreateRecordInput) {
  const candidate = input.slug ?? input.title;
  const slug = slugify(candidate);

  if (!slug) {
    throw new AppError(400, "Unable to derive a valid slug from the input");
  }

  return slug;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hashContent(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

function toIsoDateString(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function jsonOrNull(value: Prisma.JsonValue | undefined) {
  return value ?? Prisma.JsonNull;
}

function buildPrimaryChunk(input: CreateRecordInput) {
  if (input.body) {
    return {
      kind: "BODY",
      text: input.body,
    };
  }

  if (input.recommendation) {
    return {
      kind: "RECOMMENDATION",
      text: input.recommendation,
    };
  }

  if (input.summary) {
    return {
      kind: "SUMMARY",
      text: input.summary,
    };
  }

  return {
    kind: "TITLE",
    text: input.title,
  };
}

function buildSearchIndexPayloadFromContent(input: {
  language: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  aliases: string[];
  keywords: string[];
  tags: string[];
}) {
  return {
    language: input.language,
    title: input.title,
    summary: input.summary ?? null,
    body: input.body ?? null,
    tags: input.tags.join(" "),
    aliases: input.aliases.join(" "),
    keywords: input.keywords.join(" "),
    contentHash: hashContent({
      title: input.title,
      summary: input.summary ?? null,
      body: input.body ?? null,
      tags: input.tags,
      aliases: input.aliases,
      keywords: input.keywords,
    }),
  };
}

function buildSearchIndexPayload(input: CreateRecordInput, tags: string[]) {
  return buildSearchIndexPayloadFromContent({
    language: input.language,
    title: input.title,
    summary: input.summary ?? null,
    body: input.body ?? null,
    tags,
    aliases: input.aliases,
    keywords: input.keywords,
  });
}

function buildTranslationSearchIndexPayload(
  translation: CreateRecordInput["translations"][number],
  input: CreateRecordInput,
  tags: string[],
) {
  return buildSearchIndexPayloadFromContent({
    language: translation.language,
    title: translation.title,
    summary: translation.summary ?? null,
    body: translation.body ?? null,
    tags,
    aliases: input.aliases,
    keywords: input.keywords,
  });
}

function buildRecordSnapshot(
  input: CreateRecordInput,
  slug: string,
  tags: string[],
): RecordSnapshot {
  return {
    slug,
    externalKey: input.externalKey ?? null,
    externalId: input.externalId ?? null,
    schemaVersion: input.schemaVersion,
    type: input.type,
    categoryCode: input.categoryCode,
    visibility: input.visibility,
    status: input.status,
    maturity: input.maturity,
    freshness: input.freshness,
    confidence: input.confidence ?? null,
    language: input.language,
    title: input.title,
    summary: input.summary ?? null,
    body: input.body ?? null,
    problem: input.problem ?? null,
    recommendation: input.recommendation ?? null,
    metadata: input.metadata ?? null,
    applicability: input.applicability ?? null,
    compatibility: input.compatibility ?? null,
    tradeoffs: input.tradeoffs ?? null,
    evidence: input.evidence ?? null,
    metrics: input.metrics ?? null,
    curation: input.curation ?? null,
    extensions: input.extensions ?? null,
    publishedAt: toIsoDateString(input.publishedAt),
    lastVerifiedAt: toIsoDateString(input.lastVerifiedAt),
    reviewAfter: toIsoDateString(input.reviewAfter),
    archivedAt: toIsoDateString(input.archivedAt),
    translations: input.translations.map((translation) => ({
      language: translation.language,
      title: translation.title,
      summary: translation.summary ?? null,
      body: translation.body ?? null,
      problem: translation.problem ?? null,
      recommendation: translation.recommendation ?? null,
      metadata: translation.metadata ?? null,
    })),
    aliases: input.aliases,
    keywords: input.keywords,
    tags,
    sources: [],
    relations: input.relations.map((relation) => ({
      toExternalKey: relation.toExternalKey ?? null,
      toSlug: relation.toSlug ?? "",
      relationType: relation.relationType,
      strength: relation.strength ?? null,
      description: relation.description ?? null,
      metadata: relation.metadata ?? null,
    })),
  };
}

function buildStoredRecordSnapshot(record: RecordDetail): RecordSnapshot {
  return {
    slug: record.slug,
    externalKey: record.externalKey ?? null,
    externalId: record.externalId ?? null,
    schemaVersion: record.schemaVersion,
    type: record.type,
    categoryCode: record.categoryCode,
    visibility: record.visibility,
    status: record.status,
    maturity: record.maturity,
    freshness: record.freshness,
    confidence: record.confidence ?? null,
    language: record.language,
    title: record.title,
    summary: record.summary ?? null,
    body: record.body ?? null,
    problem: record.problem ?? null,
    recommendation: record.recommendation ?? null,
    metadata: (record.metadata as Prisma.JsonValue | null) ?? null,
    applicability: (record.applicability as Prisma.JsonValue | null) ?? null,
    compatibility: (record.compatibility as Prisma.JsonValue | null) ?? null,
    tradeoffs: (record.tradeoffs as Prisma.JsonValue | null) ?? null,
    evidence: (record.evidence as Prisma.JsonValue | null) ?? null,
    metrics: (record.metrics as Prisma.JsonValue | null) ?? null,
    curation: (record.curation as Prisma.JsonValue | null) ?? null,
    extensions: (record.extensions as Prisma.JsonValue | null) ?? null,
    publishedAt: toIsoDateString(record.publishedAt),
    lastVerifiedAt: toIsoDateString(record.lastVerifiedAt),
    reviewAfter: toIsoDateString(record.reviewAfter),
    archivedAt: toIsoDateString(record.archivedAt),
    translations: record.translations.map((translation) => ({
      language: translation.language,
      title: translation.title,
      summary: translation.summary ?? null,
      body: translation.body ?? null,
      problem: translation.problem ?? null,
      recommendation: translation.recommendation ?? null,
      metadata: (translation.metadata as Prisma.JsonValue | null) ?? null,
    })),
    aliases: uniqueStrings(record.aliases.map((item) => item.alias)),
    keywords: uniqueStrings(record.keywords.map((item) => item.keyword)),
    tags: uniqueStrings(record.tags.map((item) => item.tag.name)),
    sources: record.sources
      .map((link) => ({
        sourceKey: link.source.sourceKey ?? null,
        sourceType: link.source.sourceType,
        uri: link.source.uri ?? null,
        title: link.source.title ?? null,
        author: link.source.author ?? null,
        publisher: link.source.publisher ?? null,
        publishedAt: toIsoDateString(link.source.publishedAt),
        accessedAt: toIsoDateString(link.source.accessedAt),
        checksum: link.source.checksum ?? null,
        rawPayload: (link.source.rawPayload as Prisma.JsonValue | null) ?? null,
        metadata: (link.metadata as Prisma.JsonValue | null) ??
          ((link.source.metadata as Prisma.JsonValue | null) ?? null),
        role: link.role,
        quote: link.quote ?? null,
        note: link.note ?? null,
      }))
      .sort((left, right) =>
        [
          left.sourceKey ?? "",
          left.role,
          left.title ?? "",
        ]
          .join("|")
          .localeCompare(
            [right.sourceKey ?? "", right.role, right.title ?? ""].join("|"),
          ),
      ),
    relations: record.outgoingRelations
      .map((relation) => ({
        toExternalKey: relation.toRecord.externalKey ?? null,
        toSlug: relation.toRecord.slug,
        relationType: relation.relationType,
        strength: relation.strength ?? null,
        description: relation.description ?? null,
        metadata: (relation.metadata as Prisma.JsonValue | null) ?? null,
      }))
      .sort((left, right) =>
        [left.toExternalKey ?? "", left.toSlug, left.relationType]
          .join("|")
          .localeCompare(
            [right.toExternalKey ?? "", right.toSlug, right.relationType].join(
              "|",
            ),
          ),
      ),
  };
}

async function ensureCategoryExists(
  tx: Prisma.TransactionClient,
  categoryCode: string,
) {
  const category = await tx.category.findUnique({
    where: {
      code: categoryCode,
    },
    select: {
      code: true,
    },
  });

  if (!category) {
    throw new AppError(
      400,
      `Category "${categoryCode}" does not exist. Seed categories first.`,
    );
  }
}

async function ensureTags(
  tx: Prisma.TransactionClient,
  tagNames: string[],
) {
  const tags: Array<{ id: string; name: string }> = [];

  for (const tagName of uniqueStrings(tagNames)) {
    const slug = slugify(tagName);

    if (!slug) {
      continue;
    }

    const tag = await tx.tag.upsert({
      where: { slug },
      update: {
        name: tagName,
      },
      create: {
        slug,
        name: tagName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    tags.push(tag);
  }

  return tags;
}

async function prepareRecordWrite(
  tx: Prisma.TransactionClient,
  parsed: CreateRecordInput,
): Promise<RecordWriteArtifacts> {
  await ensureCategoryExists(tx, parsed.categoryCode);

  const slug = ensureSlug(parsed);
  const primaryChunk = buildPrimaryChunk(parsed);
  const primaryChunkContentHash = hashContent({
    kind: primaryChunk.kind,
    text: primaryChunk.text,
    language: parsed.language,
  });
  const tags = await ensureTags(tx, parsed.tags);
  const tagNames = tags.map((tag) => tag.name);
  const snapshot = buildRecordSnapshot(parsed, slug, tagNames);

  return {
    parsed,
    slug,
    tags,
    chunks: [
      {
        ...primaryChunk,
        language: parsed.language,
        contentHash: primaryChunkContentHash,
      },
      ...parsed.translations.map((translation) => {
        const chunk = buildPrimaryChunk({
          ...parsed,
          language: translation.language,
          title: translation.title,
          summary: translation.summary,
          body: translation.body,
          problem: translation.problem,
          recommendation: translation.recommendation,
          metadata: translation.metadata,
        });

        return {
          ...chunk,
          language: translation.language,
          contentHash: hashContent({
            kind: chunk.kind,
            text: chunk.text,
            language: translation.language,
          }),
        };
      }),
    ],
    searchIndexes: [
      buildSearchIndexPayload(parsed, tagNames),
      ...parsed.translations.map((translation) =>
        buildTranslationSearchIndexPayload(translation, parsed, tagNames),
      ),
    ],
    snapshot,
    recordChecksum: hashContent(snapshot),
  };
}

function buildRecordCreateData(
  artifacts: RecordWriteArtifacts,
): Prisma.KnowledgeRecordUncheckedCreateInput {
  const { parsed, slug } = artifacts;

  return {
    slug,
    externalKey: parsed.externalKey ?? null,
    externalId: parsed.externalId ?? null,
    checksum: artifacts.recordChecksum,
    schemaVersion: parsed.schemaVersion,
    type: parsed.type,
    categoryCode: parsed.categoryCode,
    visibility: parsed.visibility,
    status: parsed.status,
    maturity: parsed.maturity,
    freshness: parsed.freshness,
    confidence: parsed.confidence ?? 0.5,
    language: parsed.language,
    title: parsed.title,
    summary: parsed.summary ?? null,
    body: parsed.body ?? null,
    problem: parsed.problem ?? null,
    recommendation: parsed.recommendation ?? null,
    metadata: jsonOrNull(parsed.metadata),
    applicability: jsonOrNull(parsed.applicability),
    compatibility: jsonOrNull(parsed.compatibility),
    tradeoffs: jsonOrNull(parsed.tradeoffs),
    evidence: jsonOrNull(parsed.evidence),
    metrics: jsonOrNull(parsed.metrics),
    curation: jsonOrNull(parsed.curation),
    extensions: jsonOrNull(parsed.extensions),
    publishedAt: toDate(parsed.publishedAt),
    lastVerifiedAt: toDate(parsed.lastVerifiedAt),
    reviewAfter: toDate(parsed.reviewAfter),
    archivedAt: toDate(parsed.archivedAt),
  };
}

function buildRecordUpdateData(
  artifacts: RecordWriteArtifacts,
  existing: RecordDetail,
): Prisma.KnowledgeRecordUncheckedUpdateInput {
  const { parsed, slug } = artifacts;

  return {
    slug,
    externalKey: parsed.externalKey ?? existing.externalKey ?? null,
    externalId: parsed.externalId ?? existing.externalId ?? null,
    checksum: artifacts.recordChecksum,
    schemaVersion: parsed.schemaVersion,
    type: parsed.type,
    categoryCode: parsed.categoryCode,
    visibility: parsed.visibility,
    status: parsed.status,
    maturity: parsed.maturity,
    freshness: parsed.freshness,
    confidence: parsed.confidence ?? 0.5,
    language: parsed.language,
    title: parsed.title,
    summary: parsed.summary ?? null,
    body: parsed.body ?? null,
    problem: parsed.problem ?? null,
    recommendation: parsed.recommendation ?? null,
    metadata: jsonOrNull(parsed.metadata),
    applicability: jsonOrNull(parsed.applicability),
    compatibility: jsonOrNull(parsed.compatibility),
    tradeoffs: jsonOrNull(parsed.tradeoffs),
    evidence: jsonOrNull(parsed.evidence),
    metrics: jsonOrNull(parsed.metrics),
    curation: jsonOrNull(parsed.curation),
    extensions: jsonOrNull(parsed.extensions),
    publishedAt: toDate(parsed.publishedAt),
    lastVerifiedAt: toDate(parsed.lastVerifiedAt),
    reviewAfter: toDate(parsed.reviewAfter),
    archivedAt: toDate(parsed.archivedAt),
  };
}

async function getNextVersionNo(
  tx: Prisma.TransactionClient,
  recordId: string,
) {
  const latestVersion = await tx.recordVersion.findFirst({
    where: {
      recordId,
    },
    select: {
      versionNo: true,
    },
    orderBy: {
      versionNo: "desc",
    },
  });

  return (latestVersion?.versionNo ?? 0) + 1;
}

async function syncRecordRelations(
  tx: Prisma.TransactionClient,
  recordId: string,
  artifacts: RecordWriteArtifacts,
  versionNo: number,
  changeType: "CREATE" | "UPDATE",
  note: string,
) {
  await tx.knowledgeRecordTag.deleteMany({
    where: {
      recordId,
    },
  });
  await tx.alias.deleteMany({
    where: {
      recordId,
      language: artifacts.parsed.language,
      kind: "ALIAS",
    },
  });
  await tx.keyword.deleteMany({
    where: {
      recordId,
      language: artifacts.parsed.language,
    },
  });
  await tx.recordSearchIndex.deleteMany({
    where: {
      recordId,
    },
  });
  await tx.recordChunk.deleteMany({
    where: {
      recordId,
      chunkNo: 0,
    },
  });
  await tx.recordTranslation.deleteMany({
    where: {
      recordId,
    },
  });

  if (artifacts.tags.length) {
    await tx.knowledgeRecordTag.createMany({
      data: artifacts.tags.map((tag) => ({
        recordId,
        tagId: tag.id,
        weight: 1,
      })),
    });
  }

  if (artifacts.parsed.aliases.length) {
    await tx.alias.createMany({
      data: artifacts.parsed.aliases.map((alias) => ({
        recordId,
        alias,
        language: artifacts.parsed.language,
        kind: "ALIAS",
      })),
    });
  }

  if (artifacts.parsed.keywords.length) {
    await tx.keyword.createMany({
      data: artifacts.parsed.keywords.map((keyword) => ({
        recordId,
        keyword,
        language: artifacts.parsed.language,
        weight: 1,
      })),
    });
  }

  if (artifacts.parsed.translations.length) {
    await tx.recordTranslation.createMany({
      data: artifacts.parsed.translations.map((translation) => ({
        recordId,
        language: translation.language,
        title: translation.title,
        summary: translation.summary ?? null,
        body: translation.body ?? null,
        problem: translation.problem ?? null,
        recommendation: translation.recommendation ?? null,
        metadata: jsonOrNull(translation.metadata),
      })),
    });
  }

  await tx.recordSearchIndex.createMany({
    data: artifacts.searchIndexes.map((searchIndex) => ({
      recordId,
      ...searchIndex,
    })),
  });

  await tx.recordChunk.createMany({
    data: artifacts.chunks.map((chunk) => ({
      recordId,
      chunkNo: 0,
      kind: chunk.kind,
      language: chunk.language,
      text: chunk.text,
      contentHash: chunk.contentHash,
    })),
  });

  return tx.recordVersion.create({
    data: {
      recordId,
      versionNo,
      changeType,
      title: artifacts.parsed.title,
      summary: artifacts.parsed.summary ?? null,
      body: artifacts.parsed.body ?? null,
      snapshot: artifacts.snapshot,
      note,
    },
    select: {
      id: true,
    },
  });
}

async function getRecordDetail(
  tx: Prisma.TransactionClient,
  recordId: string,
) {
  const record = await tx.knowledgeRecord.findUnique({
    where: {
      id: recordId,
    },
    include: recordDetailInclude,
  });

  if (!record) {
    throw new AppError(500, `Failed to load record "${recordId}" after write`);
  }

  return record;
}

async function resolveRelationTarget(
  tx: Prisma.TransactionClient,
  relation: CreateRecordInput["relations"][number],
) {
  const externalKeyRecord = relation.toExternalKey
    ? await tx.knowledgeRecord.findUnique({
        where: {
          externalKey: relation.toExternalKey,
        },
        select: {
          id: true,
          slug: true,
          externalKey: true,
        },
      })
    : null;
  const slugRecord = relation.toSlug
    ? await tx.knowledgeRecord.findUnique({
        where: {
          slug: relation.toSlug,
        },
        select: {
          id: true,
          slug: true,
          externalKey: true,
        },
      })
    : null;

  if (relation.toExternalKey && relation.toSlug) {
    if (!externalKeyRecord || !slugRecord) {
      const missing = [
        !externalKeyRecord ? `externalKey "${relation.toExternalKey}"` : null,
        !slugRecord ? `slug "${relation.toSlug}"` : null,
      ].filter(Boolean);

      throw new AppError(
        400,
        `Relation target not found for ${missing.join(" and ")}`,
      );
    }

    if (externalKeyRecord.id !== slugRecord.id) {
      throw new AppError(
        409,
        `Relation target mismatch: externalKey "${relation.toExternalKey}" points to slug "${externalKeyRecord.slug}" but slug "${relation.toSlug}" points to externalKey "${slugRecord.externalKey ?? ""}"`,
      );
    }

    return externalKeyRecord;
  }

  if (externalKeyRecord) {
    return externalKeyRecord;
  }

  if (slugRecord) {
    return slugRecord;
  }

  const targetLabel = relation.toExternalKey
    ? `externalKey "${relation.toExternalKey}"`
    : `slug "${relation.toSlug}"`;

  throw new AppError(400, `Relation target not found for ${targetLabel}`);
}

export async function syncOutgoingRelationsTx(
  tx: Prisma.TransactionClient,
  recordId: string,
  relations: CreateRecordInput["relations"],
) {
  await tx.recordRelation.deleteMany({
    where: {
      fromRecordId: recordId,
    },
  });

  if (!relations.length) {
    return;
  }

  for (const relation of relations) {
    const target = await resolveRelationTarget(tx, relation);

    if (target.id === recordId) {
      throw new AppError(
        400,
        `Relation "${relation.relationType}" must not reference the same record`,
      );
    }

    await tx.recordRelation.create({
      data: {
        fromRecordId: recordId,
        toRecordId: target.id,
        relationType: relation.relationType,
        strength: relation.strength ?? 1,
        description: relation.description ?? null,
        metadata: jsonOrNull(relation.metadata),
      },
    });
  }
}

export async function refreshRecordSnapshotTx(
  tx: Prisma.TransactionClient,
  recordId: string,
  options: RefreshRecordSnapshotOptions = {},
) {
  const record = await getRecordDetail(tx, recordId);
  const snapshot = buildStoredRecordSnapshot(record);
  const checksum = hashContent(snapshot);

  await tx.knowledgeRecord.update({
    where: {
      id: recordId,
    },
    data: {
      checksum,
    },
  });

  const latestVersion = options.versionId
    ? { id: options.versionId }
    : await tx.recordVersion.findFirst({
        where: {
          recordId,
        },
        select: {
          id: true,
        },
        orderBy: {
          versionNo: "desc",
        },
      });

  if (latestVersion) {
    await tx.recordVersion.update({
      where: {
        id: latestVersion.id,
      },
      data: {
        title: record.title,
        summary: record.summary ?? null,
        body: record.body ?? null,
        snapshot,
      },
    });
  }

  const latestAuditLog = options.auditLogId
    ? { id: options.auditLogId }
    : await tx.auditLog.findFirst({
        where: {
          targetType: "knowledge_record",
          targetId: recordId,
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

  if (latestAuditLog) {
    await tx.auditLog.update({
      where: {
        id: latestAuditLog.id,
      },
      data: {
        after: snapshot,
      },
    });
  }

  return {
    record,
    snapshot,
    checksum,
  };
}

async function writeRecord(
  tx: Prisma.TransactionClient,
  parsed: CreateRecordInput,
  options: RecordWriteOptions & {
    existing?: RecordDetail | null;
  },
): Promise<RecordWriteResult> {
  const artifacts = await prepareRecordWrite(tx, parsed);
  const existing = options.existing ?? null;
  const action = existing ? "UPDATE" : "CREATE";

  let recordId: string;

  if (existing) {
    recordId = existing.id;

    await tx.knowledgeRecord.update({
      where: {
        id: existing.id,
      },
      data: buildRecordUpdateData(artifacts, existing),
    });
  } else {
    const created = await tx.knowledgeRecord.create({
      data: buildRecordCreateData(artifacts),
      select: {
        id: true,
      },
    });

    recordId = created.id;
  }

  const versionNo = existing ? await getNextVersionNo(tx, recordId) : 1;

  const version = await syncRecordRelations(
    tx,
    recordId,
    artifacts,
    versionNo,
    action,
    options.note,
  );

  const record = await getRecordDetail(tx, recordId);

  const auditLog = await tx.auditLog.create({
    data: {
      actorType: options.actorType,
      action: options.auditAction,
      targetType: "knowledge_record",
      targetId: recordId,
      before: existing ? buildStoredRecordSnapshot(existing) : Prisma.JsonNull,
      after: artifacts.snapshot,
      metadata: options.auditMetadata ?? Prisma.JsonNull,
    },
    select: {
      id: true,
    },
  });

  return {
    action,
    record,
    snapshot: artifacts.snapshot,
    versionId: version.id,
    auditLogId: auditLog.id,
    identityChanged: Boolean(
      existing &&
        (existing.slug !== record.slug ||
          (existing.externalKey ?? null) !== (record.externalKey ?? null)),
    ),
  };
}

async function resolveImportExistingRecord(
  tx: Prisma.TransactionClient,
  parsed: CreateRecordInput,
) {
  const slug = ensureSlug(parsed);
  const externalKeyMatch = parsed.externalKey
    ? await tx.knowledgeRecord.findUnique({
        where: {
          externalKey: parsed.externalKey,
        },
        include: recordDetailInclude,
      })
    : null;
  const slugMatch = await tx.knowledgeRecord.findUnique({
    where: {
      slug,
    },
    include: recordDetailInclude,
  });

  if (externalKeyMatch && slugMatch && externalKeyMatch.id !== slugMatch.id) {
    throw new AppError(
      409,
      `Import conflict: externalKey "${parsed.externalKey}" matches "${externalKeyMatch.slug}" but slug "${slug}" belongs to "${slugMatch.slug}"`,
    );
  }

  return externalKeyMatch ?? slugMatch;
}

function getListWhere(input: ListRecordsQuery): Prisma.KnowledgeRecordWhereInput {
  const where: Prisma.KnowledgeRecordWhereInput = {};

  if (input.categoryCode) {
    where.categoryCode = input.categoryCode;
  }

  if (input.status) {
    where.status = input.status;
  } else {
    where.status = {
      not: "ARCHIVED",
    };
  }

  if (input.type) {
    where.type = input.type;
  }

  if (input.q) {
    where.OR = [
      {
        title: {
          contains: input.q,
          mode: "insensitive",
        },
      },
      {
        summary: {
          contains: input.q,
          mode: "insensitive",
        },
      },
      {
        body: {
          contains: input.q,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

export async function listRecords(input: unknown) {
  const query = listRecordsQuerySchema.parse(input);

  return prisma.knowledgeRecord.findMany({
    where: getListWhere(query),
    include: recordListInclude,
    orderBy: {
      updatedAt: "desc",
    },
    take: query.limit,
  });
}

export async function getRecordBySlug(slug: string) {
  const trimmedSlug = slug.trim();

  if (!trimmedSlug) {
    throw new AppError(400, "Slug is required");
  }

  const record = await prisma.knowledgeRecord.findUnique({
    where: {
      slug: trimmedSlug,
    },
    include: recordDetailInclude,
  });

  if (!record) {
    throw new AppError(404, `Record not found for slug "${trimmedSlug}"`);
  }

  return record;
}

export async function upsertRecordFromImportTx(
  tx: Prisma.TransactionClient,
  input: unknown,
  options: ImportUpsertOptions = {},
): Promise<RecordWriteResult> {
  const recordInput =
    input && typeof input === "object" && !Array.isArray(input)
      ? { ...(input as Record<string, unknown>) }
      : input;

  if (
    recordInput &&
    typeof recordInput === "object" &&
    !Array.isArray(recordInput)
  ) {
    delete (recordInput as Record<string, unknown>).sources;
  }

  const parsed = createRecordInputSchema.parse(recordInput);
  const existing = await resolveImportExistingRecord(tx, parsed);

  return writeRecord(tx, parsed, {
    existing,
    actorType: options.actorType ?? "IMPORT",
    auditAction: existing ? "record.import_update" : "record.import_create",
    note: options.note ?? "Imported via import API",
    auditMetadata: options.auditMetadata,
  });
}
