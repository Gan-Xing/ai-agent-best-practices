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
  searchIndexes: true,
  chunks: true,
  sources: {
    include: {
      source: true,
    },
  },
} satisfies Prisma.KnowledgeRecordInclude;

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

function buildRecordSnapshot(input: CreateRecordInput, slug: string, tags: string[]) {
  return {
    slug,
    externalKey: input.externalKey ?? null,
    externalId: input.externalId ?? null,
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
    aliases: input.aliases,
    keywords: input.keywords,
    tags,
  };
}

async function ensureTags(
  tx: Prisma.TransactionClient,
  tagNames: string[],
) {
  const tags = [];

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
    });

    tags.push(tag);
  }

  return tags;
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
  const slug = ensureSlug(parsed);
  const tagNames = uniqueStrings(parsed.tags);
  const primaryChunk = buildPrimaryChunk(parsed);
  const chunkContentHash = hashContent({
    kind: primaryChunk.kind,
    text: primaryChunk.text,
    language: parsed.language,
  });

  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: {
        code: parsed.categoryCode,
      },
      select: {
        code: true,
      },
    });

    if (!category) {
      throw new AppError(
        400,
        `Category "${parsed.categoryCode}" does not exist. Seed categories first.`,
      );
    }

    const tags = await ensureTags(tx, tagNames);
    const searchIndex = buildSearchIndexPayload(parsed, tags.map((tag) => tag.name));
    const snapshot = buildRecordSnapshot(parsed, slug, tags.map((tag) => tag.name));

    const record = await tx.knowledgeRecord.create({
      data: {
        slug,
        externalKey: parsed.externalKey ?? null,
        externalId: parsed.externalId ?? null,
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
        metadata: parsed.metadata ?? Prisma.JsonNull,
        tags: tags.length
          ? {
              create: tags.map((tag) => ({
                tagId: tag.id,
                weight: 1,
              })),
            }
          : undefined,
        aliases: parsed.aliases.length
          ? {
              create: parsed.aliases.map((alias) => ({
                alias,
                language: parsed.language,
                kind: "ALIAS",
              })),
            }
          : undefined,
        keywords: parsed.keywords.length
          ? {
              create: parsed.keywords.map((keyword) => ({
                keyword,
                language: parsed.language,
                weight: 1,
              })),
            }
          : undefined,
        searchIndexes: {
          create: searchIndex,
        },
        chunks: {
          create: {
            chunkNo: 0,
            kind: primaryChunk.kind,
            language: parsed.language,
            text: primaryChunk.text,
            contentHash: chunkContentHash,
          },
        },
        versions: {
          create: {
            versionNo: 1,
            changeType: "CREATE",
            title: parsed.title,
            summary: parsed.summary ?? null,
            body: parsed.body ?? null,
            snapshot,
            note: "Created via records API",
          },
        },
      },
      include: recordDetailInclude,
    });

    await tx.auditLog.create({
      data: {
        actorType: "API",
        action: "record.create",
        targetType: "knowledge_record",
        targetId: record.id,
        after: snapshot,
      },
    });

    return record;
  });
}
