import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { dateLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { pickLocalizedLabel, pickLocalizedName } from "@/lib/localization";

import categoriesData from "../../../prisma/seed-data/categories.json";
import vocabularyData from "../../../prisma/seed-data/vocabulary.json";

import { searchRecords, type SearchRecordResult } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Home.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type HomeProps = {
  params: LocaleParams;
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

const STATUS_VALUES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;

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
  locale,
  labels,
}: Readonly<{
  item: SearchRecordResult;
  from: string;
  locale: Locale;
  labels: {
    confidence: string;
    matchSource: string;
    updatedAt: string;
    displayLanguage: string;
    matchLanguage: string;
    fallback: (language: string) => string;
    noSummary: string;
    freshness: (value: string) => string;
    match: (value: string) => string;
    language: (value: string | null) => string;
  };
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
              <Badge>{locale === "zh" ? item.categoryNameZh ?? item.categoryName : item.categoryName}</Badge>
              <Badge>{item.type}</Badge>
              <Badge className={buildStatusTone(item.status)}>{item.status}</Badge>
              <Badge className={buildFreshnessTone(item.freshness)}>
                {labels.freshness(item.freshness)}
              </Badge>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-foreground transition group-hover:text-accent">
              {item.title}
            </h2>

            <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">
              {item.summary ?? labels.noSummary}
            </p>
          </div>

          <div className="grid shrink-0 gap-3 text-sm text-muted sm:grid-cols-2 lg:w-[22rem] lg:grid-cols-1">
            <div>
              <p className="text-xs font-medium text-muted">{labels.confidence}</p>
              <div className="mt-2">
                <ConfidenceMeter value={item.confidence} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">{labels.matchSource}</p>
              <p className="mt-2 font-mono text-xs text-foreground">
                {labels.match(item.matchSource)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">{labels.matchLanguage}</p>
              <p className="mt-2 font-mono text-xs text-foreground">
                {labels.language(item.matchLanguage ?? item.displayLanguage)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">{labels.displayLanguage}</p>
              <p className="mt-2 font-mono text-xs text-foreground">
                {item.usedFallback
                  ? labels.fallback(labels.language(item.displayLanguage))
                  : labels.language(item.displayLanguage)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">{labels.updatedAt}</p>
              <p className="mt-2 font-mono text-xs text-foreground">
                {new Intl.DateTimeFormat(dateLocale(locale), {
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

export default async function Home({ params, searchParams }: HomeProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Home" });
  const common = await getTranslations({ locale, namespace: "Common" });
  const vocabulary = await getTranslations({ locale, namespace: "Vocabulary" });
  const resolvedSearchParams = await searchParams;
  const query = firstParam(resolvedSearchParams.q).trim();
  const categoryCode = firstParam(resolvedSearchParams.categoryCode).trim();
  const status = firstParam(resolvedSearchParams.status).trim();
  const type = firstParam(resolvedSearchParams.type).trim();

  const hasQuery = query.length > 0;
  const hasFilters = Boolean(categoryCode || status || type);
  const hasActiveState = hasQuery || hasFilters;
  const searchResult = hasActiveState
    ? await searchRecords({
        q: query || undefined,
        locale,
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
    categories.find((item) => item.code === categoryCode)
      ? pickLocalizedName(
          categories.find((item) => item.code === categoryCode) as CategoryOption,
          locale,
        )
      : categoryCode;
  const selectedType =
    recordTypes.find((item) => item.code === type)
      ? pickLocalizedLabel(
          recordTypes.find((item) => item.code === type) as VocabularyOption,
          locale,
        )
      : type;
  const selectedStatus =
    STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])
      ? vocabulary(`recordStatus.${status}`)
      : status;
  const recordCardLabels = {
    confidence: t("recordCard.confidence"),
    matchSource: t("recordCard.matchSource"),
    displayLanguage: t("recordCard.displayLanguage"),
    matchLanguage: t("recordCard.matchLanguage"),
    updatedAt: t("recordCard.updatedAt"),
    noSummary: t("recordCard.noSummary"),
    fallback: (language: string) => t("recordCard.fallback", { language }),
    language: (value: string | null) =>
      value && vocabulary.has(`language.${value}`) ? vocabulary(`language.${value}`) : value ?? common("none"),
    freshness: (value: string) =>
      vocabulary.has(`freshness.${value}`) ? vocabulary(`freshness.${value}`) : value,
    match: (value: string) =>
      vocabulary.has(`matchSource.${value}`) ? vocabulary(`matchSource.${value}`) : value,
  };

  if (!hasActiveState) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8">
        <div className="mx-auto flex min-h-[78vh] w-full max-w-5xl items-center justify-center">
          <section className="w-full max-w-3xl rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow)] sm:px-10 sm:py-14">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              {t("landing.eyebrow")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-foreground sm:text-5xl">
              {t("landing.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              {t("landing.description")}
            </p>

            <form method="GET" role="search" className="mx-auto mt-8 max-w-2xl">
              <label htmlFor="q" className="sr-only">
                {t("landing.searchLabel")}
              </label>
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-strong p-3 shadow-[var(--shadow)] sm:flex-row sm:items-center">
                <FieldInput
                  id="q"
                  name="q"
                  defaultValue={query}
                  placeholder={t("landing.placeholder")}
                />
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {common("search")}
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              {(t.raw("landing.features") as string[]).map((feature) => (
                <Badge key={feature}>{feature}</Badge>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/resources/github"
                className="inline-flex cursor-pointer items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-line-strong hover:bg-background"
              >
                {t("landing.githubLibrary")}
              </Link>
              <Link
                href="/models/capability"
                className="inline-flex cursor-pointer items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-line-strong hover:bg-background"
              >
                {t("landing.modelMatrix")}
              </Link>
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
                {t("results.eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                {hasQuery
                  ? t("results.titleWithQuery", { query })
                  : t("results.titleFiltered")}
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("results.description")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label={t("results.currentMode")}
                value={searchResult.mode === "SEARCH" ? t("results.searchMode") : t("results.browseMode")}
                hint={
                  searchResult.mode === "SEARCH"
                    ? t("results.searchHint")
                    : t("results.browseHint")
                }
              />
              <MetricCard
                label={t("results.resultCount")}
                value={String(searchResult.total)}
                hint={t("results.resultCountHint")}
              />
              <MetricCard
                label={t("results.activeConditions")}
                value={String(activeCount)}
                hint={searchResult.queryLogId ? `log ${searchResult.queryLogId.slice(0, 8)}` : t("results.noQueryLog")}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/resources/github"
              className="inline-flex cursor-pointer items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-line-strong hover:bg-background"
            >
              {t("results.openGithubLibrary")}
            </Link>
            <Link
              href="/models/capability"
              className="inline-flex cursor-pointer items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-line-strong hover:bg-background"
            >
              {t("results.openModelMatrix")}
            </Link>
          </div>

          <form method="GET" className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
            <FilterField label={t("results.keyword")} htmlFor="q">
              <FieldInput
                id="q"
                name="q"
                defaultValue={query}
                placeholder={t("landing.placeholder")}
              />
            </FilterField>

            <FilterField label={t("results.category")} htmlFor="categoryCode">
              <FieldSelect
                id="categoryCode"
                name="categoryCode"
                defaultValue={categoryCode}
              >
                <option value="">{common("allCategories")}</option>
                {categories.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {pickLocalizedName(item, locale)}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>

            <FilterField label={t("results.status")} htmlFor="status">
              <FieldSelect id="status" name="status" defaultValue={status}>
                <option value="">{common("allStatuses")}</option>
                {STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {vocabulary(`recordStatus.${value}`)}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>

            <FilterField label={t("results.recordType")} htmlFor="type">
              <FieldSelect id="type" name="type" defaultValue={type}>
                <option value="">{common("allTypes")}</option>
                {recordTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {pickLocalizedLabel(item, locale)}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {common("search")}
              </button>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-surface-strong px-4 text-sm font-medium text-foreground transition hover:border-line-strong"
              >
                {t("results.backHome")}
              </Link>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {query ? <Badge>{t("results.filterKeyword", { value: query })}</Badge> : null}
            {selectedCategory ? <Badge>{t("results.filterCategory", { value: selectedCategory })}</Badge> : null}
            {selectedStatus ? <Badge>{t("results.filterStatus", { value: selectedStatus })}</Badge> : null}
            {selectedType ? <Badge>{t("results.filterType", { value: selectedType })}</Badge> : null}
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {hasQuery
                  ? t("results.resultTitleWithQuery", { query })
                  : t("results.resultTitleFiltered")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("results.resultDescription")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge>{t("results.total", { total: searchResult.total })}</Badge>
              <Badge>
                {t("results.sort", {
                  sort:
                    searchResult.mode === "SEARCH"
                      ? t("results.sortRelevance")
                      : t("results.sortUpdatedAt"),
                })}
              </Badge>
              {searchResult.queryLogId ? (
                <Badge>{t("results.log", { id: searchResult.queryLogId.slice(0, 8) })}</Badge>
              ) : null}
            </div>
          </div>

          {searchResult.items.length > 0 ? (
            <ol className="space-y-3">
              {searchResult.items.map((item) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  from={from}
                  locale={locale}
                  labels={recordCardLabels}
                />
              ))}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center shadow-[var(--shadow)]">
              <p className="text-sm font-semibold text-foreground">{t("results.noResultsTitle")}</p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("results.noResultsDescription")}
              </p>
              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface-strong px-4 text-sm font-medium text-foreground transition hover:border-line-strong"
                >
                  {t("results.backSearchHome")}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
