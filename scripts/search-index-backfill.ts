import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hashContent(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildIndex(input: {
  language: string;
  title: string;
  summary: string | null;
  body: string | null;
  tags: string[];
  aliases: string[];
  keywords: string[];
}) {
  return {
    language: input.language,
    title: input.title,
    summary: input.summary,
    body: input.body,
    tags: input.tags.join(" "),
    aliases: input.aliases.join(" "),
    keywords: input.keywords.join(" "),
    contentHash: hashContent({
      title: input.title,
      summary: input.summary,
      body: input.body,
      tags: input.tags,
      aliases: input.aliases,
      keywords: input.keywords,
    }),
  };
}

async function main() {
  const records = await prisma.knowledgeRecord.findMany({
    include: {
      translations: true,
      tags: {
        include: {
          tag: true,
        },
      },
      aliases: true,
      keywords: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  let upserted = 0;
  let deleted = 0;

  for (const record of records) {
    const tags = uniqueStrings(record.tags.map((item) => item.tag.name));
    const aliases = uniqueStrings(
      record.aliases
        .filter((item) => item.language === record.language)
        .map((item) => item.alias),
    );
    const keywords = uniqueStrings(
      record.keywords
        .filter((item) => item.language === record.language)
        .map((item) => item.keyword),
    );
    const indexes = [
      buildIndex({
        language: record.language,
        title: record.title,
        summary: record.summary,
        body: record.body,
        tags,
        aliases,
        keywords,
      }),
      ...record.translations.map((translation) =>
        buildIndex({
          language: translation.language,
          title: translation.title,
          summary: translation.summary,
          body: translation.body,
          tags,
          aliases,
          keywords,
        }),
      ),
    ];
    const languages = indexes.map((index) => index.language);

    const stale = await prisma.recordSearchIndex.deleteMany({
      where: {
        recordId: record.id,
        language: {
          notIn: languages,
        },
      },
    });
    deleted += stale.count;

    for (const index of indexes) {
      await prisma.recordSearchIndex.upsert({
        where: {
          recordId_language: {
            recordId: record.id,
            language: index.language,
          },
        },
        update: index,
        create: {
          recordId: record.id,
          ...index,
        },
      });
      upserted += 1;
    }
  }

  console.log(
    `Backfilled search indexes for ${records.length} record(s): ${upserted} upserted, ${deleted} stale deleted.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
