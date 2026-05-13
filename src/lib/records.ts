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
  searchIndexes: true,
  chunks: true,
  sources: {
    include: {
      source: true,
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
};

type RecordWriteArtifacts = {
  parsed: CreateRecordInput;
  slug: string;
  tags: Array<{ id: string; name: string }>;
  primaryChunk: {
    kind: string;
    text: string;
  };
  chunkContentHash: string;
  searchIndex: {
    language: string;
    title: string;
    summary: string | null;
    body: string | null;
    tags: string;
    aliases: string;
    keywords: string;
    contentHash: string;
  };
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
};

type ImportUpsertOptions = {
  actorType?: string;
  note?: string;
  auditMetadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
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

function buildSearchIndexPayload(input: CreateRecordInput, tags: string[]) {
  return {
    language: input.language,
    title: input.title,
    summary: input.summary ?? null,
    body: input.body ?? null,
    tags: tags.join(" "),
    aliases: input.aliases.join(" "),
    keywords: input.keywords.join(" "),
    contentHash: hashContent({
      title: input.title,
      summary: input.summary ?? null,
      body: input.body ?? null,
      tags,
      aliases: input.aliases,
      keywords: input.keywords,
    }),
  };
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
  const chunkContentHash = hashContent({
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
    primaryChunk,
    chunkContentHash,
    searchIndex: buildSearchIndexPayload(parsed, tagNames),
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
      language: artifacts.parsed.language,
    },
  });
  await tx.recordChunk.deleteMany({
    where: {
      recordId,
      chunkNo: 0,
      language: artifacts.parsed.language,
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

  await tx.recordSearchIndex.create({
    data: {
      recordId,
      ...artifacts.searchIndex,
    },
  });

  await tx.recordChunk.create({
    data: {
      recordId,
      chunkNo: 0,
      kind: artifacts.primaryChunk.kind,
      language: artifacts.parsed.language,
      text: artifacts.primaryChunk.text,
      contentHash: artifacts.chunkContentHash,
    },
  });

  await tx.recordVersion.create({
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

  await syncRecordRelations(
    tx,
    recordId,
    artifacts,
    versionNo,
    action,
    options.note,
  );

  const record = await getRecordDetail(tx, recordId);

  await tx.auditLog.create({
    data: {
      actorType: options.actorType,
      action: options.auditAction,
      targetType: "knowledge_record",
      targetId: recordId,
      before: existing ? buildStoredRecordSnapshot(existing) : Prisma.JsonNull,
      after: artifacts.snapshot,
      metadata: options.auditMetadata ?? Prisma.JsonNull,
    },
  });

  return {
    action,
    record,
    snapshot: artifacts.snapshot,
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

export async function createRecord(input: unknown) {
  const parsed = createRecordInputSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const { record } = await writeRecord(tx, parsed, {
      actorType: "API",
      auditAction: "record.create",
      note: "Created via records API",
    });

    return record;
  });
}

export async function upsertRecordFromImportTx(
  tx: Prisma.TransactionClient,
  input: unknown,
  options: ImportUpsertOptions = {},
): Promise<RecordWriteResult> {
  const parsed = createRecordInputSchema.parse(input);
  const existing = await resolveImportExistingRecord(tx, parsed);

  return writeRecord(tx, parsed, {
    existing,
    actorType: options.actorType ?? "IMPORT",
    auditAction: existing ? "record.import_update" : "record.import_create",
    note: options.note ?? "Imported via import API",
    auditMetadata: options.auditMetadata,
  });
}
