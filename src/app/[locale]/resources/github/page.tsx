import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import categoriesData from "../../../../../prisma/seed-data/categories.json";
import vocabularyData from "../../../../../prisma/seed-data/vocabulary.json";

import { dateLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
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
  GITHUB_SORT_VALUES,
  GITHUB_STATUS_VALUES,
  LinkButton,
  MetricCard,
  formatDate,
  statusLabel,
  statusTone,
} from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({
    locale,
    namespace: "GithubResources.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type SearchParams = {
  q?: string | string[];
  categoryCode?: string | string[];
  status?: string | string[];
  type?: string | string[];
  sort?: string | string[];
};

type PageProps = {
  params: LocaleParams;
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

function categoryLabel(item: CategoryOption, locale: Locale) {
  return locale === "zh" ? item.nameZh ?? item.name : item.name;
}

function cardTypeLabel(type: string, locale: Locale) {
  const item = recordTypes.find((recordType) => recordType.code === type);
  if (!item) return type;
  return locale === "zh" ? item.labelZh ?? item.label : item.label;
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

export default async function GitHubResourcesPage({
  params,
  searchParams,
}: Readonly<PageProps>) {
  const locale = await resolveLocale(params);
  const localeForDate = dateLocale(locale);
  const t = await getTranslations({ locale, namespace: "GithubResources" });
  const common = await getTranslations({ locale, namespace: "Common" });
  const vocabulary = await getTranslations({ locale, namespace: "Vocabulary" });
  const resolvedSearchParams = await searchParams;
  const q = firstParam(resolvedSearchParams.q).trim();
  const categoryCode = firstParam(resolvedSearchParams.categoryCode).trim();
  const status = firstParam(resolvedSearchParams.status).trim();
  const type = firstParam(resolvedSearchParams.type).trim();
  const sort = sortValue(firstParam(resolvedSearchParams.sort).trim());

  const allCards = await getAllGithubRepoCards();
  const cards = filterGithubRepoCards(allCards, {
    q: q || undefined,
    categoryCode: categoryCode || undefined,
    status: status || undefined,
    type: type || undefined,
    sort,
  });

  const from = createFromState(resolvedSearchParams);
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
  const statusLabels = Object.fromEntries(
    GITHUB_STATUS_VALUES.map((value) => [value, vocabulary(`githubStatus.${value}`)]),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.09),transparent_28%),linear-gradient(180deg,#f8fafb_0%,#f2f5f8_100%)] text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="teal">{t("hero.badge")}</Badge>
            <Badge>{t("hero.subBadge")}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/" tone="secondary">
              {t("hero.back")}
            </LinkButton>
          </div>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="motion-rise">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(3.4rem,10vw,7rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-foreground">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {t("hero.description")}
            </p>
          </div>

          <div className="motion-rise-delayed rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              {t("hero.howToUse")}
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-foreground">
              <p>{t("hero.howToUseBody")}</p>
              <p className="text-muted">
                {t("hero.collectionCount", { count: allCards.length })}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("metrics.currentResults")}
            value={String(cards.length)}
            hint={t("metrics.totalHint", { count: allCards.length })}
          />
          <MetricCard
            label={t("metrics.watching")}
            value={String(filteredWatching)}
            hint={t("metrics.watchingHint")}
          />
          <MetricCard
            label={t("metrics.coverage")}
            value={String(filteredCategories)}
            hint={t("metrics.coverageHint")}
          />
          <MetricCard
            label={t("metrics.active")}
            value={String(activeUpstream)}
            hint={t("metrics.activeHint")}
          />
        </section>

        <section className="mt-10 rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                {t("filters.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                {t("filters.title")}
              </h2>
            </div>
            <Badge tone={filterCount > 0 ? "teal" : "default"}>
              {filterCount > 0
                ? t("filters.active", { count: filterCount })
                : t("filters.inactive")}
            </Badge>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <FilterField label={t("filters.keyword")} htmlFor="q">
                <FieldInput
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder={t("filters.keywordPlaceholder")}
                />
              </FilterField>
            </div>
            <FilterField label={t("filters.direction")} htmlFor="categoryCode">
              <FieldSelect id="categoryCode" name="categoryCode" defaultValue={categoryCode}>
                <option value="">{common("allDirections")}</option>
                {categories.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {categoryLabel(item, locale)}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <FilterField label={t("filters.status")} htmlFor="status">
              <FieldSelect id="status" name="status" defaultValue={status}>
                <option value="">{common("allStatuses")}</option>
                {GITHUB_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {vocabulary(`githubStatus.${value}`)}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <FilterField label={t("filters.type")} htmlFor="type">
              <FieldSelect id="type" name="type" defaultValue={type}>
                <option value="">{common("allTypes")}</option>
                {recordTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {locale === "zh" ? item.labelZh ?? item.label : item.label}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <FilterField label={t("filters.sort")} htmlFor="sort">
              <FieldSelect id="sort" name="sort" defaultValue={sort}>
                {GITHUB_SORT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {vocabulary(`githubSort.${value}`)}
                  </option>
                ))}
              </FieldSelect>
            </FilterField>
            <div className="flex items-end gap-3 xl:col-span-5">
              <button
                type="submit"
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-strong"
              >
                {common("applyFilters")}
              </button>
              <LinkButton href="/resources/github" tone="secondary">
                {common("clear")}
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
                  .map((code) => {
                    const category = categoriesByCode.get(code);
                    return category ? categoryLabel(category, locale) : code;
                  })
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
                            ? `${primaryCategory.code} · ${categoryLabel(primaryCategory, locale)}`
                            : card.classification.categoryCode}
                        </Badge>
                        <Badge tone={statusTone(card.status)}>
                          {statusLabel(card.status, statusLabels)}
                        </Badge>
                        <Badge>{cardTypeLabel(card.classification.recordType, locale)}</Badge>
                      </div>
                      <p className="font-mono text-xs text-muted">
                        {card.upstream.synced
                          ? `${card.upstream.stars?.toLocaleString("en-US") ?? "—"} stars`
                          : t("card.waiting")}
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
                          {t("card.updatedAt")}
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(card.upstream.pushedAt, localeForDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                          {t("card.reviewAfter")}
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(card.review.reviewAfter, localeForDate)}
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
                        {t("card.openDetails")}
                      </LinkButton>
                      <LinkButton href={card.repo.url} tone="secondary">
                        {common("openGithub")}
                      </LinkButton>
                      {card.links?.docs ? (
                        <LinkButton href={card.links.docs} tone="secondary">
                          {common("projectDocs")}
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
                {t("empty.eyebrow")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                {t("empty.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">
                {t("empty.description")}
              </p>
              <div className="mt-6 flex justify-center">
                <LinkButton href="/resources/github" tone="secondary">
                  {t("empty.reset")}
                </LinkButton>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
