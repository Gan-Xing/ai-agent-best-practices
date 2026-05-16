import { config as loadEnv } from "dotenv";

import {
  fetchGithubRepoContext,
  parseRepoInput,
  type GithubRateLimitState,
} from "@/lib/github-repo-context";
import { getAllGithubRepoCardsRaw } from "@/lib/github-cards";
import {
  getGithubRepoUpstreamsByFullNames,
  upsertGithubRepoUpstream,
  type GithubRepoUpstreamView,
} from "@/lib/github-upstreams";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

type Args = {
  all: boolean;
  scheduled: boolean;
  repo?: string;
  url?: string;
  cardKey?: string;
  batchSize?: number;
  maxRequests?: number;
  minRemaining?: number;
  repoDelayMs?: number;
  help: boolean;
};

type SyncTarget = {
  repo: string;
  existingUpstream?: GithubRepoUpstreamView;
  dueReason?: string;
  nextEligibleAt?: string | null;
};

type ResolveTargetsResult = {
  mode: "scheduled" | "all" | "single";
  batchSize: number;
  totalTargets: number;
  dueTargets: number;
  targets: SyncTarget[];
  deferredCount: number;
};

const GITHUB_ANON_REQUEST_LIMIT = 60;
const GITHUB_REQUESTS_PER_REPO_WORST_CASE = 4;
const GITHUB_REQUEST_BUFFER = 8;
const DEFAULT_SCHEDULED_BATCH_SIZE = numberFromEnv("GITHUB_SYNC_BATCH_SIZE", 12);
const DEFAULT_MAX_REQUESTS = numberFromEnv("GITHUB_SYNC_MAX_REQUESTS", 80);
const DEFAULT_MIN_REMAINING = numberFromEnv("GITHUB_SYNC_MIN_REMAINING", 400);
const DEFAULT_REPO_DELAY_MS = numberFromEnv("GITHUB_SYNC_REPO_DELAY_MS", 1200);
const HOT_INTERVAL_HOURS = numberFromEnv("GITHUB_SYNC_HOT_INTERVAL_HOURS", 24);
const WARM_INTERVAL_HOURS = numberFromEnv("GITHUB_SYNC_WARM_INTERVAL_HOURS", 72);
const COOL_INTERVAL_HOURS = numberFromEnv("GITHUB_SYNC_COOL_INTERVAL_HOURS", 168);
const COLD_INTERVAL_HOURS = numberFromEnv("GITHUB_SYNC_COLD_INTERVAL_HOURS", 336);
const ARCHIVED_INTERVAL_HOURS = numberFromEnv("GITHUB_SYNC_ARCHIVED_INTERVAL_HOURS", 720);

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function usage() {
  return [
    "Usage:",
    "  pnpm resources:github:sync-upstreams -- --scheduled",
    "  pnpm resources:github:sync-upstreams -- --scheduled --batch-size 12 --max-requests 80",
    "  pnpm resources:github:sync-upstreams -- --all",
    "  pnpm resources:github:sync-upstreams -- --repo owner/repo",
    "  pnpm resources:github:sync-upstreams -- --url https://github.com/owner/repo",
    "  pnpm resources:github:sync-upstreams -- --card-key owner__repo",
  ].join("\n");
}

function parseOptionalInt(value: string | undefined, flag: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer after ${flag}`);
  }
  return parsed;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    all: false,
    scheduled: false,
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
    if (arg === "--scheduled") {
      args.scheduled = true;
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
    if (arg === "--batch-size") {
      args.batchSize = parseOptionalInt(argv[index + 1], arg);
      index += 1;
      continue;
    }
    if (arg === "--max-requests") {
      args.maxRequests = parseOptionalInt(argv[index + 1], arg);
      index += 1;
      continue;
    }
    if (arg === "--min-remaining") {
      args.minRemaining = parseOptionalInt(argv[index + 1], arg);
      index += 1;
      continue;
    }
    if (arg === "--repo-delay-ms") {
      args.repoDelayMs = parseOptionalInt(argv[index + 1], arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n${usage()}`);
  }

  return args;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function hoursSince(value: string | null | undefined, nowMs: number) {
  const parsed = parseDate(value);
  if (parsed === null) return null;
  return Math.floor((nowMs - parsed) / (1000 * 60 * 60));
}

function addHours(baseIso: string | null, hours: number) {
  const parsed = parseDate(baseIso);
  if (parsed === null) return null;
  return new Date(parsed + hours * 60 * 60 * 1000).toISOString();
}

function isRateLimitError(error: unknown) {
  return /rate limit/i.test(toErrorMessage(error));
}

function getSyncIntervalHours(upstream?: GithubRepoUpstreamView) {
  if (!upstream) return 0;
  if (upstream.archived) return ARCHIVED_INTERVAL_HOURS;

  const staleHours = hoursSince(upstream.pushedAt, Date.now());
  if (staleHours === null) return COOL_INTERVAL_HOURS;
  if (staleHours <= 24 * 7) return HOT_INTERVAL_HOURS;
  if (staleHours <= 24 * 30) return WARM_INTERVAL_HOURS;
  if (staleHours <= 24 * 180) return COOL_INTERVAL_HOURS;
  return COLD_INTERVAL_HOURS;
}

function getDueState(upstream: GithubRepoUpstreamView | undefined, nowMs: number) {
  if (!upstream || !upstream.lastFetchedAt) {
    return {
      due: true,
      dueReason: "never-fetched",
      nextEligibleAt: null,
    };
  }

  const intervalHours = getSyncIntervalHours(upstream);
  const nextEligibleAt = addHours(upstream.lastFetchedAt, intervalHours);
  const nextEligibleMs = parseDate(nextEligibleAt);

  return {
    due: nextEligibleMs === null || nextEligibleMs <= nowMs,
    dueReason: `stale>${intervalHours}h`,
    nextEligibleAt,
  };
}

async function loadAllTargets() {
  const cards = await getAllGithubRepoCardsRaw();
  const fullNames = [...new Set(cards.map((card) => card.repo.fullName))];
  const upstreamMap = await getGithubRepoUpstreamsByFullNames(fullNames);

  return {
    cards,
    upstreamMap,
    targets: fullNames.map((repo) => ({
      repo,
      existingUpstream: upstreamMap.get(repo),
    })),
  };
}

async function resolveTargets(args: Args): Promise<ResolveTargetsResult> {
  if (args.scheduled) {
    const { targets } = await loadAllTargets();
    const nowMs = Date.now();
    const dueTargets = targets
      .map((target) => {
        const dueState = getDueState(target.existingUpstream, nowMs);
        return {
          ...target,
          ...dueState,
        };
      })
      .filter((target) => target.due)
      .sort((left, right) => {
        const leftFetchedAt = parseDate(left.existingUpstream?.lastFetchedAt) ?? 0;
        const rightFetchedAt = parseDate(right.existingUpstream?.lastFetchedAt) ?? 0;
        if (leftFetchedAt === 0 || rightFetchedAt === 0) {
          return leftFetchedAt - rightFetchedAt;
        }
        return leftFetchedAt - rightFetchedAt;
      });

    const batchSize = args.batchSize ?? DEFAULT_SCHEDULED_BATCH_SIZE;
    return {
      mode: "scheduled" as const,
      batchSize,
      totalTargets: targets.length,
      dueTargets: dueTargets.length,
      targets: dueTargets.slice(0, batchSize),
      deferredCount: Math.max(0, dueTargets.length - batchSize),
    } satisfies ResolveTargetsResult;
  }

  if (args.all) {
    const { targets } = await loadAllTargets();
    return {
      mode: "all" as const,
      batchSize: targets.length,
      totalTargets: targets.length,
      dueTargets: targets.length,
      targets,
      deferredCount: 0,
    } satisfies ResolveTargetsResult;
  }

  if (args.cardKey) {
    const { cards, upstreamMap } = await loadAllTargets();
    const card = cards.find((item) => item.cardKey === args.cardKey);

    if (!card) {
      throw new Error(`Card ${args.cardKey} not found`);
    }

    return {
      mode: "single" as const,
      batchSize: 1,
      totalTargets: 1,
      dueTargets: 1,
      targets: [
        {
          repo: card.repo.fullName,
          existingUpstream: upstreamMap.get(card.repo.fullName),
        },
      ],
      deferredCount: 0,
    } satisfies ResolveTargetsResult;
  }

  if (args.repo || args.url) {
    const identity = parseRepoInput(args.repo ?? args.url ?? "");
    const upstreamMap = await getGithubRepoUpstreamsByFullNames([identity.fullName]);

    return {
      mode: "single" as const,
      batchSize: 1,
      totalTargets: 1,
      dueTargets: 1,
      targets: [
        {
          repo: identity.fullName,
          existingUpstream: upstreamMap.get(identity.fullName),
        },
      ],
      deferredCount: 0,
    } satisfies ResolveTargetsResult;
  }

  throw new Error(`Provide one of --scheduled, --all, --card-key, --repo, or --url\n${usage()}`);
}

function assertGithubTokenCapacity(targetCount: number) {
  const estimatedRequests = targetCount * GITHUB_REQUESTS_PER_REPO_WORST_CASE;
  const availableAnonymousBudget = GITHUB_ANON_REQUEST_LIMIT - GITHUB_REQUEST_BUFFER;

  if (process.env.GITHUB_TOKEN || estimatedRequests <= availableAnonymousBudget) {
    return;
  }

  throw new Error(
    [
      `GITHUB_TOKEN is required for syncing ${targetCount} GitHub repos in one run.`,
      `This batch may use up to ${estimatedRequests} GitHub API requests, which exceeds the safe anonymous budget of ${availableAnonymousBudget} requests per hour.`,
      "Set GITHUB_TOKEN in .env or .env.local before running batch or scheduled sync.",
    ].join(" "),
  );
}

function shouldStopForRateLimit(
  rateLimit: GithubRateLimitState | null,
  minRemaining: number,
) {
  const remaining = rateLimit?.remaining;
  return remaining !== null && remaining !== undefined && remaining <= minRemaining;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const resolved = await resolveTargets(args);
  const maxRequests = args.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const minRemaining = args.minRemaining ?? DEFAULT_MIN_REMAINING;
  const repoDelayMs = args.repoDelayMs ?? DEFAULT_REPO_DELAY_MS;
  assertGithubTokenCapacity(resolved.targets.length);

  const synced = [];
  const failures = [];
  const deferred = [];
  let requestsUsed = 0;
  let latestRateLimit: GithubRateLimitState | null = null;
  let stoppedEarlyReason = "";

  for (let index = 0; index < resolved.targets.length; index += 1) {
    const target = resolved.targets[index];

    if (
      requestsUsed > 0 &&
      requestsUsed + GITHUB_REQUESTS_PER_REPO_WORST_CASE > maxRequests
    ) {
      stoppedEarlyReason = `Reached per-run request budget (${maxRequests}).`;
      deferred.push(
        ...resolved.targets.slice(index).map((item) => ({
          repo: item.repo,
          reason: "request-budget",
        })),
      );
      break;
    }

    if (shouldStopForRateLimit(latestRateLimit, minRemaining)) {
      stoppedEarlyReason = `Stopped early to keep at least ${minRemaining} GitHub requests available.`;
      deferred.push(
        ...resolved.targets.slice(index).map((item) => ({
          repo: item.repo,
          reason: "rate-limit-buffer",
        })),
      );
      break;
    }

    try {
      const context = await fetchGithubRepoContext({
        repo: target.repo,
        existingUpstream: target.existingUpstream
          ? {
              metadata: target.existingUpstream.metadata,
              rawPayload: target.existingUpstream.rawPayload,
            }
          : null,
      });
      const upstream = await upsertGithubRepoUpstream(context.upstreamSnapshot);

      requestsUsed += context.diagnostics.requestsMade;
      latestRateLimit = context.diagnostics.rateLimit ?? latestRateLimit;

      synced.push({
        repo: upstream.fullName,
        stars: upstream.stars,
        pushedAt: upstream.pushedAt,
        lastFetchedAt: upstream.lastFetchedAt,
        requestsMade: context.diagnostics.requestsMade,
        conditionalHits: context.diagnostics.conditionalHits,
        reusedCachedSections: context.diagnostics.reusedCachedSections,
        dueReason: target.dueReason ?? null,
      });

      if (repoDelayMs > 0 && index < resolved.targets.length - 1) {
        await sleep(repoDelayMs);
      }
    } catch (error) {
      failures.push({
        repo: target.repo,
        error: toErrorMessage(error),
      });

      if (isRateLimitError(error)) {
        stoppedEarlyReason = "GitHub rate limit error encountered; remaining targets deferred.";
        deferred.push(
          ...resolved.targets.slice(index + 1).map((item) => ({
            repo: item.repo,
            reason: "rate-limit-error",
          })),
        );
        break;
      }
    }
  }

  const result = {
    ok: failures.length === 0,
    mode: resolved.mode,
    tokenConfigured: Boolean(process.env.GITHUB_TOKEN),
    totalTargets: resolved.totalTargets,
    dueTargets: resolved.dueTargets,
    selectedTargets: resolved.targets.length,
    deferredCount: resolved.deferredCount + deferred.length,
    syncedCount: synced.length,
    failedCount: failures.length,
    requestsUsed,
    rateLimit: latestRateLimit,
    stoppedEarlyReason: stoppedEarlyReason || null,
    synced,
    deferred,
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
