import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function main() {
  const now = new Date();
  const candidates = await prisma.knowledgeRecord.findMany({
    where: {
      status: "PUBLISHED",
      freshness: "FRESH",
      reviewAfter: {
        lte: now,
      },
    },
    select: {
      id: true,
      externalKey: true,
      slug: true,
      reviewAfter: true,
    },
    orderBy: {
      reviewAfter: "asc",
    },
  });

  if (!candidates.length) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          updated: 0,
          checkedAt: now.toISOString(),
          note: "No published fresh records were overdue for review.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const candidateIds = candidates.map((record) => record.id);
  const candidateKeys = candidates.map((record) => record.externalKey ?? record.slug);

  const updateResult = await prisma.knowledgeRecord.updateMany({
    where: {
      id: {
        in: candidateIds,
      },
      status: "PUBLISHED",
      freshness: "FRESH",
      reviewAfter: {
        lte: now,
      },
    },
    data: {
      freshness: "NEEDS_REVIEW",
    },
  });

  if (updateResult.count > 0) {
    await prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        action: "record.freshness.overdue_materialized",
        targetType: "knowledge_record_batch",
        after: {
          freshness: "NEEDS_REVIEW",
          updatedCount: updateResult.count,
          candidateKeys,
          checkedAt: now.toISOString(),
        } as Prisma.InputJsonValue,
        metadata: {
          updatedCount: updateResult.count,
          candidateKeys,
          checkedAt: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        updated: updateResult.count,
        checkedAt: now.toISOString(),
        records: candidates.map((record) => ({
          externalKey: record.externalKey,
          slug: record.slug,
          reviewAfter: record.reviewAfter?.toISOString() ?? null,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
