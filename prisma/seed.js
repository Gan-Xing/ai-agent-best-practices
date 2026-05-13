/* eslint-disable @typescript-eslint/no-require-imports */

const { readFile } = require("node:fs/promises");
const path = require("node:path");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function loadJson(fileName) {
  const filePath = path.join(__dirname, "seed-data", fileName);
  const content = await readFile(filePath, "utf8");

  return JSON.parse(content);
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run prisma/seed.js");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

async function seedCategories(prisma, categories) {
  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        code: category.code,
      },
      update: {
        slug: category.slug,
        name: category.name,
        nameZh: category.nameZh ?? null,
        description: category.description ?? null,
        parentCode: category.parentCode ?? null,
        sortOrder: category.sortOrder ?? 100,
        isActive: category.isActive ?? true,
        metadata: category.metadata ?? undefined,
      },
      create: {
        code: category.code,
        slug: category.slug,
        name: category.name,
        nameZh: category.nameZh ?? null,
        description: category.description ?? null,
        parentCode: category.parentCode ?? null,
        sortOrder: category.sortOrder ?? 100,
        isActive: category.isActive ?? true,
        metadata: category.metadata ?? undefined,
      },
    });
  }
}

async function seedVocabulary(prisma, vocabularyTerms) {
  for (const term of vocabularyTerms) {
    await prisma.vocabularyTerm.upsert({
      where: {
        namespace_code: {
          namespace: term.namespace,
          code: term.code,
        },
      },
      update: {
        label: term.label,
        labelZh: term.labelZh ?? null,
        description: term.description ?? null,
        sortOrder: term.sortOrder ?? 100,
        isActive: term.isActive ?? true,
        metadata: term.metadata ?? undefined,
      },
      create: {
        namespace: term.namespace,
        code: term.code,
        label: term.label,
        labelZh: term.labelZh ?? null,
        description: term.description ?? null,
        sortOrder: term.sortOrder ?? 100,
        isActive: term.isActive ?? true,
        metadata: term.metadata ?? undefined,
      },
    });
  }
}

async function main() {
  const prisma = createPrismaClient();

  try {
    const [categories, vocabularyTerms] = await Promise.all([
      loadJson("categories.json"),
      loadJson("vocabulary.json"),
    ]);

    await seedCategories(prisma, categories);
    await seedVocabulary(prisma, vocabularyTerms);

    const [categoryCount, vocabularyCount] = await Promise.all([
      prisma.category.count(),
      prisma.vocabularyTerm.count(),
    ]);

    console.log(
      JSON.stringify(
        {
          ok: true,
          categoriesSeeded: categories.length,
          vocabularyTermsSeeded: vocabularyTerms.length,
          categoryCount,
          vocabularyCount,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
