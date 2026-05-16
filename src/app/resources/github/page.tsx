import type { Metadata } from "next";

import categoriesData from "../../../../prisma/seed-data/categories.json";
import vocabularyData from "../../../../prisma/seed-data/vocabulary.json";

import {
  filterGithubRepoCards,
  type GithubCardSort,
  getAllGithubRepoCards,
} from "@/lib/github-cards";
import {
  Badge,
  FieldInput,
  FieldSelect,
  FilterField,
  GITHUB_SORT_OPTIONS,
  GITHUB_STATUS_OPTIONS,
  LinkButton,
  MetricCard,
  formatDate,
  statusTone,
} from "@/app/resources/github/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GitHub Reference Library",
  description:
    "Filterable GitHub repository index for AI agent infrastructure, tracing, evaluation, runtime, and adjacent implementation references.",
};

type SearchParams = {
  q?: string | string[];
  categoryCode?: string | string[];
  status?: string | string[];
  type?: string | string[];
  sort?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type CategoryOption = {
  code: string;
  slug: string;
  name: string;
  nameZh: string | null;
  sortOrder: number;
  description: string;
};

type VocabularyOption = {
  namespace: string;
  code: string;
  label: string;
  labelZh: string | null;
  sortOrder: number;
};

const categories = [...(categoriesData as CategoryOption[])].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
const categoriesByCode = new Map(categories.map((item) => [item.code, item]));
const recordTypes = [...(vocabularyData as VocabularyOption[])]
  .filter((item) => item.namespace === "record_type")
  .sort((a, b) => a.sortOrder - b.sortOrder);

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function sortValue(value: string): GithubCardSort {
  if (value === "upstream" || value === "stars" || value === "name") {
    return value;
  }

  return "review";
}

function cardTypeLabel(type: string) {
  return recordTypes.find((item) => item.code === type)?.labelZh ?? type;
}

function activeFiltersCount(input: {
  q: string;
  categoryCode: string;
  status: string;
  type: string;
}) {
  return [input.q, input.categoryCode, input.status, input.type].filter(Boolean).length;
}

function createFromState(input: SearchParams) {
  const params = new URLSearchParams();

  const q = firstParam(input.q).trim();
  const categoryCode = firstParam(input.categoryCode).trim();
  const status = firstParam(input.status).trim();
  const type = firstParam(input.type).trim();
  const sort = firstParam(input.sort).trim();

  if (q) params.set("q", q);
  if (categoryCode) params.set("categoryCode", categoryCode);
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  if (sort) params.set("sort", sort);

  return params.toString();
}

function daysSince(value: string | undefined | null) {
  if (!value) return null;
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) return null;

  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

export default async function GitHubResourcesPage({ searchParams }: Readonly<PageProps>) {
  const params = await searchParams;
  const q = firstParam(params.q).trim();
  const categoryCode = firstParam(params.categoryCode).trim();
  const status = firstParam(params.status).trim();
  const type = firstParam(params.type).trim();
  const sort = sortValue(firstParam(params.sort).trim());

  const allCards = await getAllGithubRepoCards();
  const cards = filterGithubRepoCards(allCards, {
    q: q || undefined,
    categoryCode: categoryCode || undefined,
    status: status || undefined,
    type: type || undefined,
    sort,
  });

  const from = createFromState(params);
  const filteredWatching = cards.filter((card) => card.status === "watching").length;
  const filteredCategories = new Set(
    cards.flatMap((card) => [
      card.classification.categoryCode,
      ...(card.classification.secondaryCategoryCodes ?? []),
    ]),
  ).size;
  const activeUpstream = cards.filter((card) => {
    const days = daysSince(card.upstream.pushedAt);
    return days !== null && days <= 30;
  }).length;
  const filterCount = activeFiltersCount({ q, categoryCode, status, type });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.09),transparent_28%),linear-gradient(180deg,#f8fafb_0%,#f2f5f8_100%)] text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="teal">Resource Layer</Badge>
            <Badge>GitHub</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/" tone="secondary">
              Back to Records
            </LinkButton>
          </div>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="motion-rise">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
              Curated Repository Index
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(3.4rem,10vw,7rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-foreground">
              Repos Worth Reopening.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              面向 AI Agent 工程实践的 GitHub 参考仓库索引。可按分类、类型、状态与
              关键词筛选，快速找到值得参考、值得重看的实现。
            </p>
          </div>

          <div className="motion-rise-delayed rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              How To Use
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-foreground">
              <p>
                先按你正在解决的问题缩小范围，再用标签和状态判断哪些仓库值得立刻重看，
                哪些更适合放进后续学习清单。
              </p>
              <p className="text-muted">
                当前共 {allCards.length} 张 GitHub 卡片。你可以组合关键词、分类、
                状态、类型和排序，优先找出最贴近当前任务的实现参考。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Visible"
            value={String(cards.length)}
            hint={`${allCards.length} total cards in the library`}
          />
          <MetricCard
            label="Watching"
            value={String(filteredWatching)}
            hint="Cards already worth revisiting"
          />
          <MetricCard
            label="Coverage"
            value={String(filteredCategories)}
            hint="Categories touched by current results"
          />
          <MetricCard
            label="Fresh Upstream"
            value={String(activeUpstream)}
            hint="Updated upstream in roughly 30 days"
          />
        </section>

        <section className="mt-10 rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                Search & Facets
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Filter by why you would reopen a repo.
              </h2>
            </div>
            <Badge tone={filterCount > 0 ? "teal" : "default"}>
              {filterCount > 0 ? `${filterCount} active filters` : "No active filters"}
            </Badge>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <FilterField label="Search" htmlFor="q">
                <FieldInput
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="repo, tag, keyword, summary, notes"
                />
              </FilterField>
            </div>
            <FilterField label="Category" htmlFor="categoryCode">
              <FieldSelect id="categoryCode" name="categoryCode" defaultValue={categoryCode}>
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.nameZh ?? item.name}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <FilterField label="Status" htmlFor="status">
              <FieldSelect id="status" name="status" defaultValue={status}>
                <option value="">All statuses</option>
                {GITHUB_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <FilterField label="Type" htmlFor="type">
              <FieldSelect id="type" name="type" defaultValue={type}>
                <option value="">All types</option>
                {recordTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.labelZh ?? item.label}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <FilterField label="Sort" htmlFor="sort">
              <FieldSelect id="sort" name="sort" defaultValue={sort}>
                {GITHUB_SORT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <div className="flex items-end gap-3 xl:col-span-5">
              <button
                type="submit"
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-strong"
              >
                Apply filters
              </button>
              <LinkButton href="/resources/github" tone="secondary">
                Clear
              </LinkButton>
            </div>
          </form>
        </section>

        <section className="mt-10">
          {cards.length ? (
            <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {cards.map((card, index) => {
                const primaryCategory = categoriesByCode.get(card.classification.categoryCode);
                const secondaryCategories = (card.classification.secondaryCategoryCodes ?? [])
                  .map((code) => categoriesByCode.get(code)?.nameZh ?? code)
                  .filter(Boolean);
                const detailHref = from
                  ? {
                      pathname: `/resources/github/${card.cardKey}`,
                      query: { from },
                    }
                  : { pathname: `/resources/github/${card.cardKey}` };

                return (
                  <li
                    key={card.cardKey}
                    className="motion-rise rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]"
                    style={{ animationDelay: `${Math.min(index * 55, 220)}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="teal">
                          {primaryCategory
                            ? `${primaryCategory.code} · ${primaryCategory.nameZh ?? primaryCategory.name}`
                            : card.classification.categoryCode}
                        </Badge>
                        <Badge tone={statusTone(card.status)}>{card.status}</Badge>
                        <Badge>{cardTypeLabel(card.classification.recordType)}</Badge>
                      </div>
                      <p className="font-mono text-xs text-muted">
                        {card.upstream.synced
                          ? `${card.upstream.stars?.toLocaleString("en-US") ?? "—"} stars`
                          : "snapshot pending"}
                      </p>
                    </div>

                    <div className="mt-5">
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                        {card.repo.owner}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {card.repo.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted">{card.repo.fullName}</p>
                    </div>

                    <p className="mt-5 text-sm leading-7 text-foreground">{card.summary}</p>
                    <p className="mt-4 text-sm leading-7 text-muted">{card.whyItMatters}</p>

                    {secondaryCategories.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {secondaryCategories.map((label) => (
                          <Badge key={label}>{label}</Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {card.classification.tags.slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <dl className="mt-6 grid grid-cols-2 gap-3 rounded-[1.4rem] bg-background/70 px-4 py-4 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                          Upstream push
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(card.upstream.pushedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                          Review after
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(card.review.reviewAfter)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <LinkButton
                        href={
                          typeof detailHref === "string"
                            ? detailHref
                            : `${detailHref.pathname}${detailHref.query?.from ? `?from=${encodeURIComponent(detailHref.query.from)}` : ""}`
                        }
                      >
                        Open card
                      </LinkButton>
                      <LinkButton href={card.repo.url} tone="secondary">
                        GitHub repo
                      </LinkButton>
                      {card.links?.docs ? (
                        <LinkButton href={card.links.docs} tone="secondary">
                          Docs
                        </LinkButton>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-line-strong bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                No Results
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                当前筛选没有命中任何 GitHub 卡片。
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">
                试试清空筛选，或者改用 repo 名、owner、tag、评测方向、trace、
                workflow、mcp 这类关键词。空状态不应该是死路。
              </p>
              <div className="mt-6 flex justify-center">
                <LinkButton href="/resources/github" tone="secondary">
                  Reset all filters
                </LinkButton>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
