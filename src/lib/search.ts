import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { searchRecordsInputSchema } from "@/lib/validation/search";

type SearchInput = z.infer<typeof searchRecordsInputSchema>;

type SearchRecordRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  type: string;
  categoryCode: string;
  categoryName: string;
  categoryNameZh: string | null;
  status: string;
  freshness: string;
  confidence: number | null;
  visibility: string;
  updatedAt: Date;
  score: number;
  matchSource: string;
};

export type SearchRecordResult = SearchRecordRow & {
  score: number;
  matchSource: "BROWSE" | "FTS" | "ILIKE";
};

export type SearchRecordsResult = {
  queryLogId: string | null;
  items: SearchRecordResult[];
  mode: "SEARCH" | "BROWSE";
  total: number;
};

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function buildWhereClauses(input: SearchInput) {
  const clauses: Prisma.Sql[] = [Prisma.sql`kr."visibility" <> 'PRIVATE'`];

  if (input.categoryCode) {
    clauses.push(Prisma.sql`kr."categoryCode" = ${input.categoryCode}`);
  }

  if (input.status) {
    clauses.push(Prisma.sql`kr."status" = ${input.status}`);
  } else {
    clauses.push(Prisma.sql`kr."status" <> 'ARCHIVED'`);
  }

  if (input.type) {
    clauses.push(Prisma.sql`kr."type" = ${input.type}`);
  }

  if (input.q) {
    const likePattern = `%${escapeLikePattern(input.q)}%`;

    clauses.push(
      Prisma.sql`(
        COALESCE(rsi."searchVector", ''::tsvector) @@ websearch_to_tsquery('pg_catalog.simple', ${input.q})
        OR kr."title" ILIKE ${likePattern} ESCAPE '\\'
        OR COALESCE(kr."summary", '') ILIKE ${likePattern} ESCAPE '\\'
        OR COALESCE(kr."body", '') ILIKE ${likePattern} ESCAPE '\\'
      )`,
    );
  }

  return clauses;
}

function buildSearchQuery(input: SearchInput) {
  const whereClauses = buildWhereClauses(input);
  const whereSql = Prisma.sql`WHERE ${Prisma.join(whereClauses, " AND ")}`;
  const scoreSql = input.q
    ? Prisma.sql`ts_rank_cd(
        COALESCE(rsi."searchVector", ''::tsvector),
        websearch_to_tsquery('pg_catalog.simple', ${input.q})
      )`
    : Prisma.sql`0::float4`;
  const matchSourceSql = input.q
    ? Prisma.sql`CASE
        WHEN COALESCE(rsi."searchVector", ''::tsvector) @@ websearch_to_tsquery('pg_catalog.simple', ${input.q}) THEN 'FTS'
        ELSE 'ILIKE'
      END`
    : Prisma.sql`'BROWSE'`;
  const orderSql = input.q
    ? Prisma.sql`ORDER BY score DESC, kr."updatedAt" DESC`
    : Prisma.sql`ORDER BY kr."updatedAt" DESC`;

  return Prisma.sql`
    SELECT
      kr."id",
      kr."slug",
      kr."title",
      kr."summary",
      kr."type",
      kr."categoryCode",
      c."name" AS "categoryName",
      c."nameZh" AS "categoryNameZh",
      kr."status"::text AS "status",
      kr."freshness"::text AS "freshness",
      kr."confidence",
      kr."visibility"::text AS "visibility",
      kr."updatedAt",
      ${scoreSql} AS "score",
      ${matchSourceSql} AS "matchSource"
    FROM "knowledge_records" kr
    INNER JOIN "categories" c
      ON c."code" = kr."categoryCode"
    LEFT JOIN "record_search_indexes" rsi
      ON rsi."recordId" = kr."id"
      AND rsi."language" = kr."language"
    ${whereSql}
    ${orderSql}
    LIMIT ${input.limit}
  `;
}

async function logSearchQuery(
  input: SearchInput,
  items: SearchRecordResult[],
  mode: "SEARCH" | "BROWSE",
) {
  const hasFilters = Boolean(
    input.q || input.categoryCode || input.status || input.type,
  );

  if (!hasFilters) {
    return null;
  }

  const queryLog = await prisma.searchQueryLog.create({
    data: {
      query: input.q ?? "",
      mode,
      filters: {
        categoryCode: input.categoryCode ?? null,
        status: input.status ?? null,
        type: input.type ?? null,
        limit: input.limit,
      } as Prisma.InputJsonValue,
      resultCount: items.length,
      topRecordIds: items.map((item) => item.id),
      metadata: {
        matchSources: items.map((item) => item.matchSource),
      } as Prisma.InputJsonValue,
    },
    select: {
      id: true,
    },
  });

  if (items.length) {
    await prisma.searchResultLog.createMany({
      data: items.map((item, index) => ({
        queryLogId: queryLog.id,
        recordId: item.id,
        rank: index + 1,
        score: item.score,
        source: item.matchSource,
        metadata: {
          slug: item.slug,
          categoryCode: item.categoryCode,
        } as Prisma.InputJsonValue,
      })),
    });
  }

  return queryLog.id;
}

export async function searchRecords(input: unknown): Promise<SearchRecordsResult> {
  const parsed = searchRecordsInputSchema.parse(input);
  const mode = parsed.q ? "SEARCH" : "BROWSE";
  const rows = await prisma.$queryRaw<SearchRecordRow[]>(buildSearchQuery(parsed));

  const items: SearchRecordResult[] = rows.map((row) => ({
    ...row,
    score: Number(row.score ?? 0),
    matchSource: row.matchSource as SearchRecordResult["matchSource"],
  }));

  const queryLogId = await logSearchQuery(parsed, items, mode);

  return {
    queryLogId,
    items,
    mode,
    total: items.length,
  };
}
