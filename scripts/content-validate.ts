import { validateContentFiles } from "./content-common";

async function main() {
  const result = await validateContentFiles();

  if (result.errors.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          batches: result.batches.length,
          records: result.recordCount,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(
        {
          ok: true,
          batches: result.batches.length,
          records: result.recordCount,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
