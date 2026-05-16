import { config as loadEnv } from "dotenv";

import { getAllGithubRepoCardsRaw } from "@/lib/github-cards";
import { fetchGithubRepoContext, parseRepoInput } from "@/lib/github-repo-context";
import { upsertGithubRepoUpstream } from "@/lib/github-upstreams";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

type Args = {
  all: boolean;
  repo?: string;
  url?: string;
  cardKey?: string;
  help: boolean;
};

const GITHUB_ANON_REQUEST_LIMIT = 60;
const GITHUB_REQUESTS_PER_REPO = 4;
const GITHUB_REQUEST_BUFFER = 8;

function usage() {
  return [
    "Usage:",
    "  pnpm resources:github:sync-upstreams -- --all",
    "  pnpm resources:github:sync-upstreams -- --repo owner/repo",
    "  pnpm resources:github:sync-upstreams -- --url https://github.com/owner/repo",
    "  pnpm resources:github:sync-upstreams -- --card-key owner__repo",
  ].join("\n");
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    all: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") continue;
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--all") {
      args.all = true;
      continue;
    }
    if (arg === "--repo") {
      args.repo = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--url") {
      args.url = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--card-key") {
      args.cardKey = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n${usage()}`);
  }

  return args;
}

async function resolveTargets(args: Args) {
  if (args.all) {
    const cards = await getAllGithubRepoCardsRaw();
    return [...new Set(cards.map((card) => card.repo.fullName))];
  }

  if (args.cardKey) {
    const cards = await getAllGithubRepoCardsRaw();
    const card = cards.find((item) => item.cardKey === args.cardKey);

    if (!card) {
      throw new Error(`Card ${args.cardKey} not found`);
    }

    return [card.repo.fullName];
  }

  if (args.repo || args.url) {
    return [parseRepoInput(args.repo ?? args.url ?? "").fullName];
  }

  throw new Error(`Provide one of --all, --card-key, --repo, or --url\n${usage()}`);
}

function assertGithubTokenCapacity(targetCount: number) {
  const estimatedRequests = targetCount * GITHUB_REQUESTS_PER_REPO;
  const availableAnonymousBudget = GITHUB_ANON_REQUEST_LIMIT - GITHUB_REQUEST_BUFFER;

  if (process.env.GITHUB_TOKEN || estimatedRequests <= availableAnonymousBudget) {
    return;
  }

  throw new Error(
    [
      `GITHUB_TOKEN is required for syncing ${targetCount} GitHub repos in one run.`,
      `This batch may use about ${estimatedRequests} GitHub API requests, which exceeds the safe anonymous budget of ${availableAnonymousBudget} requests per hour.`,
      "Set GITHUB_TOKEN in .env or .env.local before running batch or weekly sync.",
    ].join(" "),
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const targets = await resolveTargets(args);
  assertGithubTokenCapacity(targets.length);
  const synced = [];
  const failures = [];

  for (const target of targets) {
    try {
      const context = await fetchGithubRepoContext({ repo: target });
      const upstream = await upsertGithubRepoUpstream(context.upstreamSnapshot);

      synced.push({
        repo: upstream.fullName,
        stars: upstream.stars,
        pushedAt: upstream.pushedAt,
        lastFetchedAt: upstream.lastFetchedAt,
      });
    } catch (error) {
      failures.push({
        repo: target,
        error: toErrorMessage(error),
      });
    }
  }

  const result = {
    ok: failures.length === 0,
    syncedCount: synced.length,
    failedCount: failures.length,
    synced,
    failures,
  };

  if (failures.length > 0) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: toErrorMessage(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
