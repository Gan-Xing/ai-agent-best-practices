export type RepoIdentity = {
  host: "github";
  owner: string;
  name: string;
  fullName: string;
  url: string;
};

export type CategorySignal = {
  code: string;
  slug: string;
  score: number;
  reasons: string[];
};

export type RecordTypeSignal = {
  code: string;
  reason: string;
};

export type GithubRepoUpstreamSnapshotInput = {
  host: "github";
  owner: string;
  name: string;
  fullName: string;
  repoUrl: string;
  description: string | null;
  homepage: string | null;
  stars: number | null;
  primaryLanguage: string | null;
  dominantLanguages: string[];
  license: string | null;
  topics: string[];
  archived: boolean;
  defaultBranch: string | null;
  pushedAt: string | null;
  lastFetchedAt: string;
  readmeTitle: string | null;
  readmeIntro: string | null;
  readmeHeadings: string[];
  rootEntries: string[];
  rootManifests: string[];
  metadata: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
};

export type GithubRepoContext = {
  repo: RepoIdentity;
  upstreamSnapshot: GithubRepoUpstreamSnapshotInput;
  readme: {
    title: string | null;
    intro: string | null;
    headings: string[];
  };
  root: {
    entries: string[];
    manifests: string[];
  };
  suggestions: {
    primaryCategoryCode: string | null;
    secondaryCategoryCodes: string[];
    categorySignals: CategorySignal[];
    recordType: RecordTypeSignal;
    tags: string[];
    keywords: string[];
    confidence: "low" | "medium" | "high";
    warnings: string[];
  };
  draftScaffold: {
    schemaVersion: 1;
    kind: "github-repo-card";
    cardKey: string;
    repo: RepoIdentity;
    classification: {
      categoryCode: string | null;
      secondaryCategoryCodes: string[];
      recordType: string;
      tags: string[];
      keywords: string[];
    };
    summary: string;
    whyItMatters: string;
    status: "inbox";
    review: {
      addedAt: string;
      lastReviewedAt: string;
      reviewAfter: string;
    };
    links: {
      docs?: string;
    };
  };
};

type FetchGithubRepoContextInput = {
  url?: string;
  repo?: string;
  readmeChars?: number;
  headings?: number;
};

type GitHubRepoApi = {
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  license: {
    spdx_id: string | null;
    name: string | null;
  } | null;
  topics: string[];
  archived: boolean;
  default_branch: string;
  pushed_at: string | null;
  owner: {
    login: string;
  };
  name: string;
};

type GitHubReadmeApi = {
  content: string;
  encoding: string;
};

type GitHubContentApi = Array<{
  name: string;
  type: string;
}>;

const CATEGORY_KEYWORDS: Array<{
  code: string;
  slug: string;
  signals: Array<{ phrase: string; weight: number }>;
}> = [
  {
    code: "01",
    slug: "models",
    signals: [
      { phrase: "inference", weight: 6 },
      { phrase: "quantization", weight: 5 },
      { phrase: "checkpoint", weight: 4 },
      { phrase: "reasoning model", weight: 5 },
      { phrase: "model serving", weight: 5 },
      { phrase: "latency", weight: 3 },
    ],
  },
  {
    code: "02",
    slug: "instruction",
    signals: [
      { phrase: "prompt engineering", weight: 6 },
      { phrase: "structured output", weight: 5 },
      { phrase: "instruction", weight: 5 },
      { phrase: "prompt", weight: 4 },
      { phrase: "schema guidance", weight: 4 },
    ],
  },
  {
    code: "03",
    slug: "runtime",
    signals: [
      { phrase: "agent runtime", weight: 7 },
      { phrase: "stateful agent", weight: 5 },
      { phrase: "stateful agents", weight: 5 },
      { phrase: "runtime", weight: 5 },
      { phrase: "agent loop", weight: 5 },
      { phrase: "state machine", weight: 4 },
      { phrase: "stateful", weight: 3 },
      { phrase: "streaming", weight: 3 },
      { phrase: "session", weight: 3 },
      { phrase: "retry", weight: 3 },
    ],
  },
  {
    code: "04",
    slug: "skills",
    signals: [
      { phrase: "agent skill", weight: 7 },
      { phrase: "skills", weight: 5 },
      { phrase: "plugin", weight: 4 },
      { phrase: "capability", weight: 3 },
    ],
  },
  {
    code: "05",
    slug: "tools",
    signals: [
      { phrase: "tool calling", weight: 7 },
      { phrase: "function calling", weight: 7 },
      { phrase: "tools", weight: 4 },
      { phrase: "schema", weight: 3 },
      { phrase: "validation", weight: 3 },
      { phrase: "permissions", weight: 3 },
      { phrase: "cli", weight: 2 },
    ],
  },
  {
    code: "06",
    slug: "mcp",
    signals: [
      { phrase: "model context protocol", weight: 8 },
      { phrase: " mcp ", weight: 7 },
      { phrase: "-mcp", weight: 6 },
      { phrase: "mcp server", weight: 8 },
      { phrase: "mcp client", weight: 7 },
    ],
  },
  {
    code: "07",
    slug: "rag",
    signals: [
      { phrase: " rag ", weight: 7 },
      { phrase: "retrieval", weight: 6 },
      { phrase: "embedding", weight: 5 },
      { phrase: "vector", weight: 5 },
      { phrase: "chunk", weight: 5 },
      { phrase: "citation", weight: 3 },
    ],
  },
  {
    code: "08",
    slug: "memory",
    signals: [
      { phrase: "episodic memory", weight: 7 },
      { phrase: "memory", weight: 5 },
      { phrase: "profile", weight: 3 },
      { phrase: "context persistence", weight: 4 },
    ],
  },
  {
    code: "09",
    slug: "workflow",
    signals: [
      { phrase: "orchestration framework", weight: 8 },
      { phrase: "workflow", weight: 6 },
      { phrase: "orchestration", weight: 6 },
      { phrase: "orchestrator", weight: 5 },
      { phrase: "router", weight: 4 },
      { phrase: "supervisor", weight: 4 },
      { phrase: "handoff", weight: 4 },
      { phrase: "multi-agent", weight: 4 },
      { phrase: "multiagent", weight: 4 },
    ],
  },
  {
    code: "10",
    slug: "agent-ui",
    signals: [
      { phrase: "dashboard", weight: 5 },
      { phrase: "chat ui", weight: 5 },
      { phrase: "timeline", weight: 4 },
      { phrase: "approval", weight: 4 },
      { phrase: "frontend", weight: 2 },
      { phrase: "console", weight: 3 },
    ],
  },
  {
    code: "11",
    slug: "evaluation",
    signals: [
      { phrase: "benchmark", weight: 7 },
      { phrase: "evaluation", weight: 7 },
      { phrase: " eval ", weight: 6 },
      { phrase: "grader", weight: 5 },
      { phrase: "judge", weight: 5 },
      { phrase: "regression", weight: 4 },
    ],
  },
  {
    code: "12",
    slug: "trace",
    signals: [
      { phrase: "tracing", weight: 7 },
      { phrase: "trace", weight: 6 },
      { phrase: "observability", weight: 6 },
      { phrase: "replay", weight: 5 },
      { phrase: "telemetry", weight: 4 },
      { phrase: "logging", weight: 3 },
    ],
  },
  {
    code: "13",
    slug: "security",
    signals: [
      { phrase: "prompt injection", weight: 8 },
      { phrase: "security", weight: 6 },
      { phrase: "guardrail", weight: 5 },
      { phrase: "red team", weight: 5 },
      { phrase: "auth", weight: 3 },
      { phrase: "policy", weight: 3 },
    ],
  },
  {
    code: "14",
    slug: "sandbox",
    signals: [
      { phrase: "sandbox", weight: 8 },
      { phrase: "browser automation", weight: 6 },
      { phrase: "playwright", weight: 5 },
      { phrase: "shell", weight: 4 },
      { phrase: "code execution", weight: 5 },
      { phrase: "container", weight: 3 },
    ],
  },
  {
    code: "15",
    slug: "adapters",
    signals: [
      { phrase: "openrouter", weight: 8 },
      { phrase: "litellm", weight: 8 },
      { phrase: "adapter", weight: 6 },
      { phrase: "gateway", weight: 5 },
      { phrase: "proxy", weight: 5 },
      { phrase: "sdk bridge", weight: 6 },
      { phrase: "vercel ai sdk", weight: 7 },
    ],
  },
];

const ROOT_MANIFESTS = [
  "package.json",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".github",
];

function normalizeRepoName(value: string) {
  return value.replace(/\.git$/i, "").trim().toLowerCase();
}

export function parseRepoInput(input: string): RepoIdentity {
  const trimmed = input.trim();
  const sshMatch = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i.exec(trimmed);

  if (sshMatch) {
    const owner = normalizeRepoName(sshMatch[1]);
    const name = normalizeRepoName(sshMatch[2]);
    return {
      host: "github",
      owner,
      name,
      fullName: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
    };
  }

  const urlMatch =
    /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:[/?#].*)?$/i.exec(trimmed);

  if (urlMatch) {
    const owner = normalizeRepoName(urlMatch[1]);
    const name = normalizeRepoName(urlMatch[2]);
    return {
      host: "github",
      owner,
      name,
      fullName: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
    };
  }

  const repoMatch = /^([^/]+)\/([^/]+)$/.exec(trimmed);

  if (repoMatch) {
    const owner = normalizeRepoName(repoMatch[1]);
    const name = normalizeRepoName(repoMatch[2]);
    return {
      host: "github",
      owner,
      name,
      fullName: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
    };
  }

  throw new Error(`Unsupported GitHub repo input: ${input}`);
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-agent-best-practices/github-reference-entry",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function requestGitHubJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: githubHeaders(),
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;

    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        detail = `${detail}: ${body.message}`;
      }
    } catch {}

    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      if (remaining === "0" && reset) {
        detail = `${detail}. Rate limit exhausted; try again after UNIX ${reset} or set GITHUB_TOKEN.`;
      }
    }

    throw new Error(detail);
  }

  return (await response.json()) as T;
}

function stripMarkdownInline(text: string) {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~>#-]+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractReadmeTitle(markdown: string) {
  const match = /^#\s+(.+)$/m.exec(markdown);
  if (match) {
    return stripMarkdownInline(match[1]);
  }

  const htmlMatch = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/i.exec(markdown);
  return htmlMatch ? stripMarkdownInline(htmlMatch[1]) : null;
}

function extractReadmeHeadings(markdown: string, limit: number) {
  const matches = [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)];
  return matches.slice(0, limit).map((match) => stripMarkdownInline(match[1]));
}

function extractReadmeIntro(markdown: string, limit: number) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, " ");
  const paragraphs = withoutCode
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const selected: string[] = [];

  for (const paragraph of paragraphs) {
    if (
      paragraph.startsWith("#") ||
      paragraph.startsWith("![") ||
      paragraph.startsWith("[![") ||
      paragraph.startsWith("<img") ||
      paragraph.startsWith("<p") ||
      paragraph.startsWith("|") ||
      /<div|<picture|<source|href=|src=/.test(paragraph)
    ) {
      continue;
    }

    const cleaned = stripMarkdownInline(paragraph);
    if (cleaned.length < 40) {
      continue;
    }

    selected.push(cleaned);

    if (selected.join(" ").length >= limit) {
      break;
    }
  }

  return selected.join(" ").slice(0, limit) || null;
}

function daysBetween(now: number, dateString: string | null | undefined) {
  if (!dateString) return null;
  const parsed = Date.parse(dateString);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((now - parsed) / (1000 * 60 * 60 * 24));
}

function detectRecordType(text: string, rootEntries: string[]): RecordTypeSignal {
  const lowerRoot = rootEntries.join(" ").toLowerCase();

  if (
    /(framework|runtime|orchestrator|platform|starter|boilerplate)/.test(text)
  ) {
    return {
      code: "FRAMEWORK",
      reason: "Repo signals framework or runtime style usage.",
    };
  }

  if (
    /(cli|server|tool|plugin|adapter|proxy|gateway|benchmark|eval|dashboard|viewer)/.test(
      text,
    ) ||
    /(package\.json|pyproject\.toml|go\.mod|cargo\.toml)/.test(lowerRoot)
  ) {
    return {
      code: "TOOL",
      reason: "Repo signals executable, service, or utility usage.",
    };
  }

  if (/(awesome|examples|reference|collection|curated list)/.test(text)) {
    return {
      code: "REFERENCE",
      reason: "Repo looks like a reading or reference collection.",
    };
  }

  return {
    code: "REFERENCE",
    reason: "Defaulting to reference because the repo shape is ambiguous.",
  };
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function scoreCategories(text: string) {
  const signals: CategorySignal[] = [];

  for (const category of CATEGORY_KEYWORDS) {
    let score = 0;
    const reasons: string[] = [];

    for (const signal of category.signals) {
      if (text.includes(signal.phrase)) {
        score += signal.weight;
        reasons.push(signal.phrase.trim());
      }
    }

    if (score > 0) {
      signals.push({
        code: category.code,
        slug: category.slug,
        score,
        reasons: unique(reasons),
      });
    }
  }

  return signals.sort((left, right) => right.score - left.score);
}

function buildTagSuggestions(
  repo: RepoIdentity,
  topics: string[],
  categories: CategorySignal[],
  readmeHeadings: string[],
) {
  const headingTags = readmeHeadings
    .flatMap((heading) =>
      heading
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((part) => part.length >= 3 && part.length <= 18),
    )
    .slice(0, 6);

  return unique(
    [
      ...categories.slice(0, 2).map((item) => item.slug),
      ...topics,
      ...headingTags,
      repo.name,
    ]
      .map((item) => item.toLowerCase())
      .filter(
        (item) =>
          item &&
          !["the", "and", "for", "with", "from", "this", "that", "agent", "agents", "github"].includes(
            item,
          ),
      ),
  ).slice(0, 8);
}

function buildKeywordSuggestions(
  repo: RepoIdentity,
  readmeTitle: string | null,
  topics: string[],
  categories: CategorySignal[],
) {
  const repoNameTokens = repo.name.split(/[-_.]+/).filter(Boolean);

  return unique(
    [
      repo.fullName,
      repo.name,
      readmeTitle ?? "",
      ...topics,
      ...repoNameTokens,
      ...categories.slice(0, 2).map((item) => item.slug),
    ].filter(Boolean),
  ).slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString();
}

export async function fetchGithubRepoContext(
  input: FetchGithubRepoContextInput,
): Promise<GithubRepoContext> {
  const readmeChars = input.readmeChars ?? 900;
  const headings = input.headings ?? 12;

  if ((!input.url && !input.repo) || (input.url && input.repo)) {
    throw new Error("Provide exactly one of url or repo");
  }

  const identity = parseRepoInput(input.url ?? input.repo ?? "");
  const now = new Date();

  const [repo, languages, readmeResponse, rootContents] = await Promise.all([
    requestGitHubJson<GitHubRepoApi>(`/repos/${identity.owner}/${identity.name}`),
    requestGitHubJson<Record<string, number>>(
      `/repos/${identity.owner}/${identity.name}/languages`,
    ).catch(() => ({})),
    requestGitHubJson<GitHubReadmeApi>(
      `/repos/${identity.owner}/${identity.name}/readme`,
    ).catch(() => null),
    requestGitHubJson<GitHubContentApi>(
      `/repos/${identity.owner}/${identity.name}/contents`,
    ).catch(() => []),
  ]);

  const readmeMarkdown =
    readmeResponse && readmeResponse.encoding === "base64"
      ? Buffer.from(readmeResponse.content, "base64").toString("utf8")
      : "";
  const readmeTitle = extractReadmeTitle(readmeMarkdown);
  const readmeHeadings = extractReadmeHeadings(readmeMarkdown, headings);
  const readmeIntro = extractReadmeIntro(readmeMarkdown, readmeChars);
  const rootEntries = Array.isArray(rootContents)
    ? rootContents.map((entry) => entry.name)
    : [];
  const manifestSignals = rootEntries.filter((entry) =>
    ROOT_MANIFESTS.includes(entry),
  );
  const combinedText = [
    ` ${repo.full_name.toLowerCase()} `,
    ` ${repo.description?.toLowerCase() ?? ""} `,
    ` ${(repo.topics ?? []).join(" ").toLowerCase()} `,
    ` ${readmeTitle?.toLowerCase() ?? ""} `,
    ` ${readmeIntro?.toLowerCase() ?? ""} `,
    ` ${readmeHeadings.join(" ").toLowerCase()} `,
    ` ${rootEntries.join(" ").toLowerCase()} `,
  ].join(" ");
  const categorySignals = scoreCategories(combinedText);
  const primaryCategory = categorySignals[0] ?? null;
  const secondaryCategories = categorySignals
    .slice(1, 3)
    .filter((item) => item.score >= 4)
    .map((item) => item.code);
  const recordType = detectRecordType(combinedText, rootEntries);
  const tagSuggestions = buildTagSuggestions(
    identity,
    (repo.topics ?? []).map((topic) => topic.toLowerCase()),
    categorySignals,
    readmeHeadings,
  );
  const keywordSuggestions = buildKeywordSuggestions(
    identity,
    readmeTitle,
    repo.topics ?? [],
    categorySignals,
  );
  const dominantLanguages = Object.entries(languages)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([language]) => language);
  const staleDays = daysBetween(Date.now(), repo.pushed_at);
  const warnings: string[] = [];

  if (repo.archived) {
    warnings.push("Repository is archived upstream.");
  }

  if (staleDays !== null && staleDays > 365) {
    warnings.push(`Repository has not been pushed for about ${staleDays} days.`);
  }

  if (!repo.description) {
    warnings.push("Repository description is empty.");
  }

  if (!readmeIntro) {
    warnings.push("README intro could not be extracted cleanly.");
  }

  if (!primaryCategory) {
    warnings.push("No strong category signal was found; manual classification is recommended.");
  }

  const confidence =
    !primaryCategory
      ? "low"
      : primaryCategory.score >= 10
        ? "high"
        : primaryCategory.score >= 6
          ? "medium"
          : "low";

  const repoIdentity: RepoIdentity = {
    host: "github",
    owner: repo.owner.login.toLowerCase(),
    name: repo.name.toLowerCase(),
    fullName: repo.full_name.toLowerCase(),
    url: repo.html_url,
  };

  return {
    repo: repoIdentity,
    upstreamSnapshot: {
      host: "github",
      owner: repo.owner.login.toLowerCase(),
      name: repo.name.toLowerCase(),
      fullName: repo.full_name.toLowerCase(),
      repoUrl: repo.html_url,
      description: repo.description,
      homepage: repo.homepage,
      stars: repo.stargazers_count,
      primaryLanguage: repo.language,
      dominantLanguages,
      license: repo.license?.spdx_id ?? repo.license?.name ?? null,
      topics: repo.topics ?? [],
      archived: repo.archived,
      defaultBranch: repo.default_branch,
      pushedAt: repo.pushed_at,
      lastFetchedAt: now.toISOString(),
      readmeTitle,
      readmeIntro,
      readmeHeadings,
      rootEntries: rootEntries.slice(0, 40),
      rootManifests: manifestSignals,
      metadata: {
        source: "github-api",
        staleDays,
      },
      rawPayload: {
        repo,
        languages,
      },
    },
    readme: {
      title: readmeTitle,
      intro: readmeIntro,
      headings: readmeHeadings,
    },
    root: {
      entries: rootEntries.slice(0, 40),
      manifests: manifestSignals,
    },
    suggestions: {
      primaryCategoryCode: primaryCategory?.code ?? null,
      secondaryCategoryCodes: secondaryCategories,
      categorySignals,
      recordType,
      tags: tagSuggestions,
      keywords: keywordSuggestions,
      confidence,
      warnings,
    },
    draftScaffold: {
      schemaVersion: 1,
      kind: "github-repo-card",
      cardKey: `${repo.owner.login.toLowerCase()}__${repo.name.toLowerCase()}`,
      repo: repoIdentity,
      classification: {
        categoryCode: primaryCategory?.code ?? null,
        secondaryCategoryCodes: secondaryCategories,
        recordType: recordType.code,
        tags: tagSuggestions,
        keywords: keywordSuggestions,
      },
      summary:
        repo.description ??
        readmeIntro ??
        `${repo.full_name} GitHub reference repository.`,
      whyItMatters: primaryCategory
        ? `适合作为 ${primaryCategory.slug} 方向的参考仓库。`
        : "需要结合你的使用场景补充这张卡片的价值判断。",
      status: "inbox",
      review: {
        addedAt: now.toISOString(),
        lastReviewedAt: now.toISOString(),
        reviewAfter: addDays(now, 90),
      },
      links: repo.homepage
        ? {
            docs: repo.homepage,
          }
        : {},
    },
  };
}
