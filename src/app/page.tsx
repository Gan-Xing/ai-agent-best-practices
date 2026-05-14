import Link from "next/link";

import categoriesData from "../../prisma/seed-data/categories.json";
import vocabularyData from "../../prisma/seed-data/vocabulary.json";

import { searchRecords, type SearchRecordResult } from "@/lib/search";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    q?: string | string[];
    categoryCode?: string | string[];
    status?: string | string[];
    type?: string | string[];
  }>;
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

const recordTypes = [...(vocabularyData as VocabularyOption[])]
  .filter((item) => item.namespace === "record_type")
  .sort((a, b) => a.sortOrder - b.sortOrder);

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "草稿" },
  { value: "REVIEW", label: "审核中" },
  { value: "PUBLISHED", label: "已发布" },
  { value: "ARCHIVED", label: "已归档" },
] as const;

const MATCH_SOURCE_LABELS: Record<string, string> = {
  BROWSE: "浏览",
  FTS: "全文检索",
  ILIKE: "字段匹配",
};

const FRESHNESS_LABELS: Record<string, string> = {
  UNKNOWN: "未知",
  FRESH: "新鲜",
  STALE: "过期",
  NEEDS_REVIEW: "待复审",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildStatusTone(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ARCHIVED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

function buildFreshnessTone(freshness: string) {
  switch (freshness) {
    case "FRESH":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "STALE":
      return "border-red-200 bg-red-50 text-red-700";
    case "NEEDS_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-line bg-background text-muted";
  }
}

function Badge({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${className ?? "border-line bg-background text-muted"}`}
    >
      {children}
    </span>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}>) {
  return (
    <label htmlFor={htmlFor} className="block space-y-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function FieldInput({
  id,
  name,
  defaultValue,
  placeholder,
}: Readonly<{
  id: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}>) {
  return (
    <input
      id={id}
      name={name}
      type="search"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="h-11 w-full rounded-lg border border-line bg-surface-strong px-3 text-sm text-foreground outline-none transition focus:border-line-strong focus:ring-2 focus:ring-accent-soft"
    />
  );
}

function FieldSelect({
  id,
  name,
  defaultValue,
  children,
}: Readonly<{
  id: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}>) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="h-11 w-full rounded-lg border border-line bg-surface-strong px-3 text-sm text-foreground outline-none transition focus:border-line-strong focus:ring-2 focus:ring-accent-soft"
    >
      {children}
    </select>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow)]">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 font-mono text-lg text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function ConfidenceMeter({ value }: Readonly<{ value: number | null }>) {
  const pct = Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)));
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-28 overflow-hidden rounded-full bg-slate-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-muted">{pct}%</span>
    </div>
  );
}

function ResultRow({
  item,
  from,
}: Readonly<{
  item: SearchRecordResult;
  from: string;
}>) {
  const href = from
    ? { pathname: `/records/${item.slug}`, query: { from } }
    : { pathname: `/records/${item.slug}` };

  return (
    <li>
      <Link
        href={href}
        className="group block rounded-xl border border-line bg-surface px-5 py-4 shadow-[var(--shadow)] transition hover:border-line-strong hover:bg-white"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{item.categoryNameZh ?? item.categoryName}</Badge>
              <Badge>{item.type}</Badge>
              <Badge className={buildStatusTone(item.status)}>{item.status}</Badge>
              <Badge className={buildFreshnessTone(item.freshness)}>
                {FRESHNESS_LABELS[item.freshness] ?? item.freshness}
              </Badge>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-foreground transition group-hover:text-accent">
              {item.title}
            </h2>

            <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">
              {item.summary ?? "暂无摘要。打开记录查看正文、证据、来源和版本历史。"}
            </p>
          </div>

          <div className="grid shrink-0 gap-3 text-sm text-muted sm:grid-cols-3 lg:w-[22rem] lg:grid-cols-1">
            <div>
              <p className="text-xs font-medium text-muted">置信度</p>
              <div className="mt-2">
                <ConfidenceMeter value={item.confidence} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">匹配方式</p>
              <p className="mt-2 font-mono text-xs text-foreground">
                {MATCH_SOURCE_LABELS[item.matchSource] ?? item.matchSource}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">更新时间</p>
              <p className="mt-2 font-mono text-xs text-foreground">
                {new Intl.DateTimeFormat("zh-CN", {
                  dateStyle: "medium",
                }).format(item.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = firstParam(params.q).trim();
  const categoryCode = firstParam(params.categoryCode).trim();
  const status = firstParam(params.status).trim();
  const type = firstParam(params.type).trim();

  const hasQuery = query.length > 0;
  const hasFilters = Boolean(categoryCode || status || type);
  const hasActiveState = hasQuery || hasFilters;
  const searchResult = hasActiveState
    ? await searchRecords({
        q: query || undefined,
        categoryCode: categoryCode || undefined,
        status: status || undefined,
        type: type || undefined,
        limit: 24,
      })
    : null;

  const listState = new URLSearchParams();
  if (query) listState.set("q", query);
  if (categoryCode) listState.set("categoryCode", categoryCode);
  if (status) listState.set("status", status);
  if (type) listState.set("type", type);
  const from = listState.toString();

  const activeCount = [query, categoryCode, status, type].filter(Boolean).length;
  const selectedCategory =
    categories.find((item) => item.code === categoryCode)?.nameZh ?? categoryCode;
  const selectedType =
    recordTypes.find((item) => item.code === type)?.labelZh ?? type;
  const selectedStatus =
    STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;

  if (!hasActiveState) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8">
        <div className="mx-auto flex min-h-[78vh] w-full max-w-5xl items-center justify-center">
          <section className="w-full max-w-3xl rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow)] sm:px-10 sm:py-14">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              AI Agent Best Practices
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-foreground sm:text-5xl">
              搜索 AI Agent 最佳实践
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              输入关键词，直接查找模型、工具、技能、评测、工作流等高价值最佳实践。
            </p>

            <form action="/" method="GET" role="search" className="mx-auto mt-8 max-w-2xl">
              <label htmlFor="q" className="sr-only">
                搜索知识记录
              </label>
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-strong p-3 shadow-[var(--shadow)] sm:flex-row sm:items-center">
                <FieldInput
                  id="q"
                  name="q"
                  defaultValue={query}
                  placeholder="搜索模型、工具、实践、评测..."
                />
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  搜索
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              <Badge>全文检索</Badge>
              <Badge>来源可追溯</Badge>
              <Badge>关系可跳转</Badge>
              <Badge>版本可追踪</Badge>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!searchResult) {
    throw new Error("Search result is required when the page is in active state");
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-4 rounded-2xl border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Search Results
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                {hasQuery ? `“${query}” 的 AI 最佳实践结果` : "AI 最佳实践筛选结果"}
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted">
                继续收敛条件，快速判断这条记录是否值得打开。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="当前模式"
                value={searchResult.mode === "SEARCH" ? "搜索" : "浏览"}
                hint={
                  searchResult.mode === "SEARCH"
                    ? "按相关性优先，再按更新时间"
                    : "按更新时间排序"
                }
              />
              <MetricCard
                label="结果数量"
                value={String(searchResult.total)}
                hint="当前查询条件下返回的记录数"
              />
              <MetricCard
                label="活动条件"
                value={String(activeCount)}
                hint={searchResult.queryLogId ? `log ${searchResult.queryLogId.slice(0, 8)}` : "当前没有写入搜索日志"}
              />
            </div>
          </div>

          <form action="/" method="GET" className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
            <FilterField label="关键词" htmlFor="q">
              <FieldInput
                id="q"
                name="q"
                defaultValue={query}
                placeholder="搜索模型、工具、实践、评测..."
              />
            </FilterField>

            <FilterField label="分类" htmlFor="categoryCode">
              <FieldSelect
                id="categoryCode"
                name="categoryCode"
                defaultValue={categoryCode}
              >
                <option value="">全部分类</option>
                {categories.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.nameZh ?? item.name}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>

            <FilterField label="状态" htmlFor="status">
              <FieldSelect id="status" name="status" defaultValue={status}>
                <option value="">全部状态</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>

            <FilterField label="记录类型" htmlFor="type">
              <FieldSelect id="type" name="type" defaultValue={type}>
                <option value="">全部类型</option>
                {recordTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.labelZh ?? item.label}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                搜索
              </button>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-surface-strong px-4 text-sm font-medium text-foreground transition hover:border-line-strong"
              >
                返回首页
              </Link>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {query ? <Badge>关键词: {query}</Badge> : null}
            {selectedCategory ? <Badge>分类: {selectedCategory}</Badge> : null}
            {selectedStatus ? <Badge>状态: {selectedStatus}</Badge> : null}
            {selectedType ? <Badge>类型: {selectedType}</Badge> : null}
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {hasQuery ? `“${query}” 的结果` : "筛选结果"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                结果已按当前搜索与筛选条件收敛。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge>共 {searchResult.total} 条</Badge>
              <Badge>
                排序: {searchResult.mode === "SEARCH" ? "相关性" : "更新时间"}
              </Badge>
              {searchResult.queryLogId ? (
                <Badge>日志 {searchResult.queryLogId.slice(0, 8)}</Badge>
              ) : null}
            </div>
          </div>

          {searchResult.items.length > 0 ? (
            <ol className="space-y-3">
              {searchResult.items.map((item) => (
                <ResultRow key={item.id} item={item} from={from} />
              ))}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center shadow-[var(--shadow)]">
              <p className="text-sm font-semibold text-foreground">没有匹配结果</p>
              <p className="mt-2 text-sm leading-7 text-muted">
                可以放宽关键词、切换分类，或者先导入更多记录再检索。
              </p>
              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface-strong px-4 text-sm font-medium text-foreground transition hover:border-line-strong"
                >
                  返回搜索首页
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
