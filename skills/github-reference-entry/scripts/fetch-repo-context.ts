import { fetchGithubRepoContext } from "@/lib/github-repo-context";

type Args = {
  url?: string;
  repo?: string;
  help: boolean;
  readmeChars: number;
  headings: number;
};

function usage() {
  return [
    "Usage:",
    "  pnpm github:repo:fetch -- --url https://github.com/owner/repo",
    "  pnpm github:repo:fetch -- --repo owner/repo",
    "  pnpm tsx skills/github-reference-entry/scripts/fetch-repo-context.ts --url https://github.com/owner/repo",
    "",
    "Options:",
    "  --url           GitHub repository URL",
    "  --repo          owner/repo form",
    "  --readme-chars  Max intro chars to keep from README (default: 900)",
    "  --headings      Max README headings to keep (default: 12)",
  ].join("\n");
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    help: false,
    readmeChars: 900,
    headings: 12,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--url") {
      args.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--repo") {
      args.repo = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--readme-chars") {
      args.readmeChars = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
      continue;
    }

    if (arg === "--headings") {
      args.headings = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n${usage()}`);
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  if ((!args.url && !args.repo) || (args.url && args.repo)) {
    throw new Error(`Provide exactly one of --url or --repo\n${usage()}`);
  }

  if (!Number.isFinite(args.readmeChars) || args.readmeChars <= 0) {
    throw new Error("--readme-chars must be a positive integer");
  }

  if (!Number.isFinite(args.headings) || args.headings <= 0) {
    throw new Error("--headings must be a positive integer");
  }

  const context = await fetchGithubRepoContext({
    url: args.url,
    repo: args.repo,
    readmeChars: args.readmeChars,
    headings: args.headings,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        repo: context.repo,
        upstream: {
          description: context.upstreamSnapshot.description,
          homepage: context.upstreamSnapshot.homepage,
          stars: context.upstreamSnapshot.stars,
          language: context.upstreamSnapshot.primaryLanguage,
          dominantLanguages: context.upstreamSnapshot.dominantLanguages,
          license: context.upstreamSnapshot.license,
          topics: context.upstreamSnapshot.topics,
          archived: context.upstreamSnapshot.archived,
          defaultBranch: context.upstreamSnapshot.defaultBranch,
          pushedAt: context.upstreamSnapshot.pushedAt,
          lastFetchedAt: context.upstreamSnapshot.lastFetchedAt,
        },
        upstreamSnapshot: context.upstreamSnapshot,
        readme: context.readme,
        root: context.root,
        suggestions: context.suggestions,
        draftScaffold: context.draftScaffold,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
