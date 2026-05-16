import { validateGithubRepoCards } from "./github-cards-common";

async function main() {
  const result = await validateGithubRepoCards();

  if (result.errors.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          cards: result.cards.length,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        cards: result.cards.length,
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
