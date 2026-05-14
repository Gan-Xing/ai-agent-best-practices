import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  refreshRecordSnapshotTx,
  syncOutgoingRelationsTx,
  upsertRecordFromImportTx,
} from "@/lib/records";
import {
  importRequestSchema,
  importSourceSchema,
  listImportJobsQuerySchema,
} from "@/lib/validation/imports";

type ImportRequest = z.infer<typeof importRequestSchema>;
type ImportRecordInput = ImportRequest["records"][number];
type ImportSourceInput = z.infer<typeof importSourceSchema>;

type ImportItemResult = {
  itemId: string;
  status: "DONE" | "FAILED";
  action?: "CREATE" | "UPDATE";
  recordId?: string;
  versionId?: string;
  auditLogId?: string;
  slug?: string;
  sourceIds?: string[];
  error?: string;
};

type PreparedImportItem = {
  item: {
    id: string;
  };
  itemSources: Array<ImportSourceInput & { sourceType: string }>;
  recordPayload: ImportRecordInput;
};

type WrittenImportRecord = {
  itemId: string;
  recordPayload: ImportRecordInput;
  result: {
    action: "CREATE" | "UPDATE";
    record: {
      id: string;
      slug: string;
      externalKey: string | null;
      externalId: string | null;
    };
    versionId: string;
    auditLogId: string;
    identityChanged: boolean;
    sourceAttachments: Array<{ source: { id: string } }>;
  };
};

const DEFAULT_IMPORT_TRANSACTION_TIMEOUT_MS = 300_000;

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

function getImportTransactionTimeoutMs() {
  const configured = Number(process.env.IMPORT_TRANSACTION_TIMEOUT_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_IMPORT_TRANSACTION_TIMEOUT_MS;
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

function getSourceIdentity(input: ImportSourceInput) {
  return [
    input.role ?? "REFERENCE",
    input.sourceKey ?? "",
    input.uri ?? "",
    input.checksum ?? "",
    input.title ?? "",
  ].join("|");
}

function resolveItemSources(
  jobSourceType: string,
  batchSource: ImportSourceInput,
  recordSources: ImportSourceInput[],
) {
  const seen = new Set<string>();
  const sources = [batchSource, ...recordSources].filter(
    (source): source is ImportSourceInput => Boolean(source),
  );
  const resolved: Array<ImportSourceInput & { sourceType: string }> = [];

  for (const source of sources) {
    const identity = getSourceIdentity(source);

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    resolved.push({
      ...source,
      sourceType: source.sourceType ?? jobSourceType,
    });
  }

  return resolved;
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

async function attachSourcesToRecord(
  tx: Prisma.TransactionClient,
  recordId: string,
  managedSourceType: string,
  sourceInputs: Array<ImportSourceInput & { sourceType: string }>,
) {
  // GitHub JSON imports are treated as source-of-truth for their own source links.
  // Other source types remain untouched.
  await tx.knowledgeRecordSource.deleteMany({
    where: {
      recordId,
      source: {
        is: {
          sourceType: managedSourceType,
        },
      },
    },
  });

  if (!sourceInputs.length) {
    return [];
  }

  const attachments = [];
  const seenLinks = new Set<string>();

  for (const sourceInput of sourceInputs) {
    const source = await findOrCreateSource(tx, sourceInput);
    const role = sourceInput.role ?? "REFERENCE";
    const linkKey = `${source.id}:${role}`;

    if (seenLinks.has(linkKey)) {
      continue;
    }

    seenLinks.add(linkKey);

    const link = await tx.knowledgeRecordSource.upsert({
      where: {
        recordId_sourceId_role: {
          recordId,
          sourceId: source.id,
          role,
        },
      },
      update: {
        quote: sourceInput.quote ?? null,
        note: sourceInput.note ?? null,
        metadata: sourceInput.metadata ?? Prisma.JsonNull,
      },
      create: {
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

    attachments.push({
      source,
      link,
    });
  }

  return attachments;
}

async function refreshInboundRelationSnapshotsTx(
  tx: Prisma.TransactionClient,
  writtenRecords: WrittenImportRecord[],
) {
  const writtenRecordIds = new Set(
    writtenRecords.map((item) => item.result.record.id),
  );
  const changedTargetIds = writtenRecords
    .filter((item) => item.result.identityChanged)
    .map((item) => item.result.record.id);

  if (!changedTargetIds.length) {
    return;
  }

  const inboundRelations = await tx.recordRelation.findMany({
    where: {
      toRecordId: {
        in: changedTargetIds,
      },
      fromRecordId: {
        notIn: [...writtenRecordIds],
      },
    },
    select: {
      fromRecordId: true,
    },
  });
  const referringRecordIds = [
    ...new Set(inboundRelations.map((relation) => relation.fromRecordId)),
  ];

  for (const recordId of referringRecordIds) {
    await refreshRecordSnapshotTx(tx, recordId);
  }
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

  const results: ImportItemResult[] = [];
  const importItems: PreparedImportItem[] = [];

  for (const recordPayload of parsed.records) {
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

    importItems.push({
      item,
      itemSources: resolveItemSources(
        parsed.sourceType,
        parsed.source,
        recordPayload.sources,
      ),
      recordPayload,
    });
  }

  let activeItemId: string | null = null;

  try {
    const transactionResults = await prisma.$transaction(
      async (tx) => {
        const nextResults: ImportItemResult[] = [];
        const writtenRecords: WrittenImportRecord[] = [];

        for (const { item, itemSources, recordPayload } of importItems) {
          activeItemId = item.id;

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

          const sourceAttachments = await attachSourcesToRecord(
            tx,
            upserted.record.id,
            parsed.sourceType,
            itemSources,
          );

          writtenRecords.push({
            itemId: item.id,
            recordPayload,
            result: {
              ...upserted,
              sourceAttachments,
            },
          });
        }

        for (const written of writtenRecords) {
          activeItemId = written.itemId;

          await syncOutgoingRelationsTx(
            tx,
            written.result.record.id,
            written.recordPayload.relations,
          );
          await refreshRecordSnapshotTx(tx, written.result.record.id, {
            versionId: written.result.versionId,
            auditLogId: written.result.auditLogId,
          });

          await tx.importJobItem.update({
            where: {
              id: written.itemId,
            },
            data: {
              status: "DONE",
              action: written.result.action,
              recordId: written.result.record.id,
              slug: written.result.record.slug,
              externalKey:
                written.result.record.externalKey ??
                written.recordPayload.externalKey ??
                null,
              externalId:
                written.result.record.externalId ??
                written.recordPayload.externalId ??
                null,
              error: null,
            },
          });

          nextResults.push({
            itemId: written.itemId,
            status: "DONE",
            action: written.result.action,
            recordId: written.result.record.id,
            versionId: written.result.versionId,
            auditLogId: written.result.auditLogId,
            slug: written.result.record.slug,
            sourceIds: written.result.sourceAttachments.map(
              (item) => item.source.id,
            ),
          });
        }

        await refreshInboundRelationSnapshotsTx(tx, writtenRecords);

        return nextResults;
      },
      {
        timeout: getImportTransactionTimeoutMs(),
      },
    );

    results.splice(0, results.length, ...transactionResults);
  } catch (error) {
    const message = getErrorMessage(error);

    for (const { item } of importItems) {
      const itemError =
        item.id === activeItemId
          ? message
          : `Rolled back because import item ${activeItemId ?? "unknown"} failed: ${message}`;

      await prisma.importJobItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: "FAILED",
          action: "UPSERT",
          error: itemError,
        },
      });

      results.push({
        itemId: item.id,
        status: "FAILED",
        error: itemError,
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
