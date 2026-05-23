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
  recordLanguage: string;
  displayLanguage: string;
  matchLanguage: string | null;
  usedFallback: boolean;
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
  usedFallback: boolean;
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

  return clauses;
}

function buildSearchQuery(input: SearchInput) {
  const whereClauses = buildWhereClauses(input);
  const whereSql = input.q
    ? Prisma.sql`WHERE ${Prisma.join([...whereClauses, Prisma.sql`matched."language" IS NOT NULL`], " AND ")}`
    : Prisma.sql`WHERE ${Prisma.join(whereClauses, " AND ")}`;
  const querySql = input.q
    ? Prisma.sql`websearch_to_tsquery('pg_catalog.simple', ${input.q})`
    : Prisma.sql`NULL`;
  const likePattern = input.q ? `%${escapeLikePattern(input.q)}%` : "";
  const matchedJoinSql = input.q
    ? Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT
          rsi."language",
          CASE
            WHEN COALESCE(rsi."searchVector", ''::tsvector) @@ ${querySql}
              THEN ts_rank_cd(COALESCE(rsi."searchVector", ''::tsvector), ${querySql})
            ELSE 0::float4
          END AS "score",
          CASE
            WHEN COALESCE(rsi."searchVector", ''::tsvector) @@ ${querySql}
              THEN 'FTS'
            ELSE 'ILIKE'
          END AS "matchSource",
          CASE
            WHEN rsi."language" = ${input.locale} THEN 0
            WHEN rsi."language" = kr."language" THEN 1
            ELSE 2
          END AS "languageRank"
        FROM "record_search_indexes" rsi
        WHERE rsi."recordId" = kr."id"
          AND (
            COALESCE(rsi."searchVector", ''::tsvector) @@ ${querySql}
            OR rsi."title" ILIKE ${likePattern} ESCAPE '\\'
            OR COALESCE(rsi."summary", '') ILIKE ${likePattern} ESCAPE '\\'
            OR COALESCE(rsi."body", '') ILIKE ${likePattern} ESCAPE '\\'
            OR COALESCE(rsi."tags", '') ILIKE ${likePattern} ESCAPE '\\'
            OR COALESCE(rsi."aliases", '') ILIKE ${likePattern} ESCAPE '\\'
            OR COALESCE(rsi."keywords", '') ILIKE ${likePattern} ESCAPE '\\'
          )
        ORDER BY "languageRank" ASC, "score" DESC, rsi."updatedAt" DESC
        LIMIT 1
      ) matched ON true
    `
    : Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT
          NULL::text AS "language",
          0::float4 AS "score",
          'BROWSE'::text AS "matchSource",
          0 AS "languageRank"
      ) matched ON true
    `;
  const scoreSql = input.q
    ? Prisma.sql`matched."score"`
    : Prisma.sql`0::float4`;
  const matchSourceSql = input.q ? Prisma.sql`matched."matchSource"` : Prisma.sql`'BROWSE'`;
  const orderSql = input.q
    ? Prisma.sql`ORDER BY matched."languageRank" ASC, score DESC, kr."updatedAt" DESC`
    : Prisma.sql`ORDER BY kr."updatedAt" DESC`;

  return Prisma.sql`
    SELECT
      kr."id",
      kr."slug",
      CASE
        WHEN kr."language" = ${input.locale} THEN kr."title"
        ELSE COALESCE(rt."title", kr."title")
      END AS "title",
      CASE
        WHEN kr."language" = ${input.locale} THEN kr."summary"
        ELSE COALESCE(rt."summary", kr."summary")
      END AS "summary",
      kr."language" AS "recordLanguage",
      CASE
        WHEN kr."language" = ${input.locale} THEN kr."language"
        WHEN rt."language" IS NOT NULL THEN rt."language"
        ELSE kr."language"
      END AS "displayLanguage",
      matched."language" AS "matchLanguage",
      (
        CASE
          WHEN kr."language" = ${input.locale} THEN kr."language"
          WHEN rt."language" IS NOT NULL THEN rt."language"
          ELSE kr."language"
        END
      ) <> ${input.locale} AS "usedFallback",
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
    LEFT JOIN "record_translations" rt
      ON rt."recordId" = kr."id"
      AND rt."language" = ${input.locale}
    ${matchedJoinSql}
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
        locale: input.locale,
        categoryCode: input.categoryCode ?? null,
        status: input.status ?? null,
        type: input.type ?? null,
        limit: input.limit,
      } as Prisma.InputJsonValue,
      resultCount: items.length,
      topRecordIds: items.map((item) => item.id),
      metadata: {
        matchSources: items.map((item) => item.matchSource),
        matchLanguages: items.map((item) => item.matchLanguage),
        displayLanguages: items.map((item) => item.displayLanguage),
        fallbackRecordIds: items
          .filter((item) => item.usedFallback)
          .map((item) => item.id),
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
          displayLanguage: item.displayLanguage,
          matchLanguage: item.matchLanguage,
          usedFallback: item.usedFallback,
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
