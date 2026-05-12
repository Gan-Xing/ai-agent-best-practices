import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const databaseRow = await prisma.$queryRaw<
      Array<{ database_name: string; database_time: Date }>
    >`SELECT current_database() AS database_name, now() AS database_time`;
    const categoryCount = await prisma.category.count();
    const vocabularyCount = await prisma.vocabularyTerm.count();
    const recordCount = await prisma.knowledgeRecord.count();

    return Response.json({
      ok: true,
      database: databaseRow[0]?.database_name ?? null,
      databaseTime: databaseRow[0]?.database_time ?? null,
      counts: {
        categories: categoryCount,
        vocabularyTerms: vocabularyCount,
        knowledgeRecords: recordCount,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
