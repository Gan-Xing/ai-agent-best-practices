import "dotenv/config";

import { runImportJob } from "@/lib/imports";
import { toImportPayload, validateContentFiles } from "./content-common";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const result = await validateContentFiles();

  if (result.errors.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          phase: "validate",
          batches: result.batches.length,
          records: result.recordCount,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          batches: result.batches.length,
          records: result.recordCount,
          imports: result.batches.map((loaded) => ({
            sourceLabel: loaded.batch.sourceLabel ?? loaded.relativePath,
            records: loaded.batch.records.length,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const imports = [];

  for (const loaded of result.batches) {
    const importPayload = toImportPayload(loaded);
    const importResult = await runImportJob(importPayload);

    imports.push({
      sourceLabel: importPayload.sourceLabel,
      jobId: importResult.job.id,
      status: importResult.job.status,
      stats: importResult.job.stats,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: false,
        batches: result.batches.length,
        records: result.recordCount,
        imports,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
