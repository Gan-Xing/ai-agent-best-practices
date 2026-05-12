import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { upsertRecordFromImportTx } from "@/lib/records";
import {
  importRequestSchema,
  importSourceSchema,
  listImportJobsQuerySchema,
} from "@/lib/validation/imports";

type ImportRequest = z.infer<typeof importRequestSchema>;
type ImportSourceInput = z.infer<typeof importSourceSchema>;
type ListImportJobsQuery = z.infer<typeof listImportJobsQuerySchema>;

const importJobListSelect = {
  id: true,
  sourceType: true,
  status: true,
  stats: true,
  error: true,
  startedAt: true,
  finishedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.ImportJobSelect;

const importJobDetailInclude = {
  items: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      record: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.ImportJobInclude;

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown import error";
}

function toDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(value);
}

function buildJobStats(
  input: ImportRequest,
  results: Array<{ status: "DONE" | "FAILED"; action?: "CREATE" | "UPDATE" }>,
) {
  const succeeded = results.filter((item) => item.status === "DONE");
  const failed = results.length - succeeded.length;
  const created = succeeded.filter((item) => item.action === "CREATE").length;
  const updated = succeeded.filter((item) => item.action === "UPDATE").length;

  return {
    total: input.records.length,
    succeeded: succeeded.length,
    failed,
    created,
    updated,
  };
}

function resolveItemSource(
  jobSourceType: string,
  requestSource: ImportSourceInput | undefined,
  recordSource: ImportSourceInput | undefined,
) {
  const merged = recordSource ?? requestSource;

  if (!merged) {
    return null;
  }

  return {
    ...merged,
    sourceType: merged.sourceType ?? jobSourceType,
  };
}

async function findOrCreateSource(
  tx: Prisma.TransactionClient,
  input: ImportSourceInput & { sourceType: string },
) {
  const sourceData = {
    sourceType: input.sourceType,
    uri: input.uri ?? null,
    title: input.title ?? null,
    author: input.author ?? null,
    publisher: input.publisher ?? null,
    publishedAt: toDate(input.publishedAt),
    accessedAt: toDate(input.accessedAt),
    checksum: input.checksum ?? null,
    rawPayload: input.rawPayload ?? Prisma.JsonNull,
    metadata: input.metadata ?? Prisma.JsonNull,
  };

  if (input.sourceKey) {
    return tx.source.upsert({
      where: {
        sourceKey: input.sourceKey,
      },
      update: sourceData,
      create: {
        sourceKey: input.sourceKey,
        ...sourceData,
      },
      select: {
        id: true,
        sourceKey: true,
        sourceType: true,
      },
    });
  }

  if (input.uri) {
    const existing = await tx.source.findFirst({
      where: {
        sourceType: input.sourceType,
        uri: input.uri,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return tx.source.update({
        where: {
          id: existing.id,
        },
        data: sourceData,
        select: {
          id: true,
          sourceKey: true,
          sourceType: true,
        },
      });
    }
  }

  if (input.checksum) {
    const existing = await tx.source.findFirst({
      where: {
        sourceType: input.sourceType,
        checksum: input.checksum,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return tx.source.update({
        where: {
          id: existing.id,
        },
        data: sourceData,
        select: {
          id: true,
          sourceKey: true,
          sourceType: true,
        },
      });
    }
  }

  return tx.source.create({
    data: {
      sourceKey: input.sourceKey ?? null,
      ...sourceData,
    },
    select: {
      id: true,
      sourceKey: true,
      sourceType: true,
    },
  });
}

async function attachSourceToRecord(
  tx: Prisma.TransactionClient,
  recordId: string,
  sourceInput: (ImportSourceInput & { sourceType: string }) | null,
) {
  if (!sourceInput) {
    return null;
  }

  const source = await findOrCreateSource(tx, sourceInput);
  const role = sourceInput.role ?? "REFERENCE";

  await tx.knowledgeRecordSource.deleteMany({
    where: {
      recordId,
      role,
    },
  });

  const link = await tx.knowledgeRecordSource.create({
    data: {
      recordId,
      sourceId: source.id,
      role,
      quote: sourceInput.quote ?? null,
      note: sourceInput.note ?? null,
      metadata: sourceInput.metadata ?? Prisma.JsonNull,
    },
    select: {
      recordId: true,
      sourceId: true,
      role: true,
    },
  });

  return {
    source,
    link,
  };
}

export async function runImportJob(input: unknown) {
  const parsed = importRequestSchema.parse(input);
  const startedAt = new Date();
  const job = await prisma.importJob.create({
    data: {
      sourceType: parsed.sourceType,
      status: "RUNNING",
      startedAt,
      payload: {
        sourceType: parsed.sourceType,
        sourceLabel: parsed.sourceLabel ?? null,
        metadata: parsed.metadata ?? null,
        source: parsed.source ?? null,
        recordCount: parsed.records.length,
      } as Prisma.InputJsonValue,
      stats: {
        total: parsed.records.length,
        succeeded: 0,
        failed: 0,
        created: 0,
        updated: 0,
      } as Prisma.InputJsonValue,
    },
  });

  const results: Array<{
    itemId: string;
    status: "DONE" | "FAILED";
    action?: "CREATE" | "UPDATE";
    recordId?: string;
    slug?: string;
    sourceId?: string;
    error?: string;
  }> = [];

  for (const recordPayload of parsed.records) {
    const itemSource = resolveItemSource(
      parsed.sourceType,
      parsed.source,
      recordPayload.source,
    );
    const item = await prisma.importJobItem.create({
      data: {
        jobId: job.id,
        externalKey: recordPayload.externalKey ?? null,
        externalId: recordPayload.externalId ?? null,
        slug: recordPayload.slug ?? null,
        status: "QUEUED",
        checksum: hashPayload(recordPayload),
        payload: recordPayload as Prisma.InputJsonValue,
      },
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.importJobItem.update({
          where: {
            id: item.id,
          },
          data: {
            status: "RUNNING",
            action: "UPSERT",
          },
        });

        const upserted = await upsertRecordFromImportTx(tx, recordPayload, {
          note: `Imported from ${parsed.sourceType} job ${job.id}`,
          auditMetadata: {
            importJobId: job.id,
            importJobItemId: item.id,
            sourceType: parsed.sourceType,
            sourceLabel: parsed.sourceLabel ?? null,
            metadata: parsed.metadata ?? null,
          } as Prisma.InputJsonValue,
        });

        const sourceAttachment = await attachSourceToRecord(
          tx,
          upserted.record.id,
          itemSource,
        );

        await tx.importJobItem.update({
          where: {
            id: item.id,
          },
          data: {
            status: "DONE",
            action: upserted.action,
            recordId: upserted.record.id,
            slug: upserted.record.slug,
            externalKey:
              upserted.record.externalKey ?? recordPayload.externalKey ?? null,
            externalId:
              upserted.record.externalId ?? recordPayload.externalId ?? null,
            error: null,
          },
        });

        return {
          ...upserted,
          sourceAttachment,
        };
      });

      results.push({
        itemId: item.id,
        status: "DONE",
        action: result.action,
        recordId: result.record.id,
        slug: result.record.slug,
        sourceId: result.sourceAttachment?.source.id,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      await prisma.importJobItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: "FAILED",
          action: "UPSERT",
          error: message,
        },
      });

      results.push({
        itemId: item.id,
        status: "FAILED",
        error: message,
      });
    }
  }

  const stats = buildJobStats(parsed, results);
  const finalStatus = stats.failed > 0 ? "FAILED" : "DONE";
  const finishedAt = new Date();

  const finishedJob = await prisma.importJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: finalStatus,
      finishedAt,
      error:
        finalStatus === "FAILED" ? `${stats.failed} import item(s) failed` : null,
      stats: stats as Prisma.InputJsonValue,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorType: "IMPORT",
      action: "import.job.complete",
      targetType: "import_job",
      targetId: job.id,
      after: {
        status: finalStatus,
        stats,
        sourceType: parsed.sourceType,
        sourceLabel: parsed.sourceLabel ?? null,
      },
      metadata: {
        importJobId: job.id,
        sourceType: parsed.sourceType,
        sourceLabel: parsed.sourceLabel ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    job: finishedJob,
    items: results,
  };
}

export async function listImportJobs(input: unknown) {
  const parsed = listImportJobsQuerySchema.parse(input);

  return prisma.importJob.findMany({
    where: {
      status: parsed.status,
      sourceType: parsed.sourceType ?? undefined,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: parsed.limit,
    select: importJobListSelect,
  });
}

export async function getImportJob(jobId: string) {
  const trimmedJobId = jobId.trim();

  if (!trimmedJobId) {
    throw new AppError(400, "Job id is required");
  }

  const job = await prisma.importJob.findUnique({
    where: {
      id: trimmedJobId,
    },
    include: importJobDetailInclude,
  });

  if (!job) {
    throw new AppError(404, `Import job "${trimmedJobId}" not found`);
  }

  return job;
}
