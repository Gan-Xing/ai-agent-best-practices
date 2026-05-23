import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { dateLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { resolveLocale } from "@/i18n/server";
import { pickLocalizedLabel, pickLocalizedName } from "@/lib/localization";

import categoriesData from "../../../../../../prisma/seed-data/categories.json";
import vocabularyData from "../../../../../../prisma/seed-data/vocabulary.json";

import { getGithubRepoCardByKey } from "@/lib/github-cards";
import {
  Badge,
  LinkButton,
  Section,
  formatDate,
  statusLabel,
  statusTone,
} from "../ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    locale: string;
    cardKey: string;
  }>;
  searchParams: Promise<{
    from?: string | string[];
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
const categoriesByCode = new Map(categories.map((item) => [item.code, item]));
const recordTypes = [...(vocabularyData as VocabularyOption[])]
  .filter((item) => item.namespace === "record_type")
  .sort((a, b) => a.sortOrder - b.sortOrder);

function isCategoryOption(value: CategoryOption | undefined): value is CategoryOption {
  return Boolean(value);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function categoryLabel(item: CategoryOption, locale: Locale) {
  return pickLocalizedName(item, locale);
}

function typeLabel(value: string, locale: Locale) {
  const item = recordTypes.find((recordType) => recordType.code === value);
  if (!item) return value;
  return pickLocalizedLabel(item, locale);
}

export async function generateMetadata({
  params,
}: Readonly<PageProps>): Promise<Metadata> {
  const { cardKey } = await params;
  const locale = await resolveLocale(params);
  const t = await getTranslations({
    locale,
    namespace: "GithubResources.detail",
  });
  const card = await getGithubRepoCardByKey(cardKey);

  if (!card) {
    return {
      title: t("notFoundTitle"),
    };
  }

  return {
    title: t("metadataTitle", { name: card.repo.fullName }),
    description: card.summary,
  };
}

export default async function GitHubResourceDetailPage({
  params,
  searchParams,
}: Readonly<PageProps>) {
  const locale = await resolveLocale(params);
  const localeForDate = dateLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: "GithubResources.detail",
  });
  const common = await getTranslations({ locale, namespace: "Common" });
  const vocabulary = await getTranslations({ locale, namespace: "Vocabulary" });
  const { cardKey } = await params;
  const from = firstParam((await searchParams).from).trim();
  const card = await getGithubRepoCardByKey(cardKey);

  if (!card) {
    notFound();
  }

  const primaryCategory = categoriesByCode.get(card.classification.categoryCode);
  const secondaryCategories = (card.classification.secondaryCategoryCodes ?? [])
    .map((code) => categoriesByCode.get(code))
    .filter(isCategoryOption);
  const listHref = from ? `/resources/github?${from}` : "/resources/github";
  const statusLabels = {
    [card.status]: vocabulary(`githubStatus.${card.status}`),
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.08),transparent_28%),linear-gradient(180deg,#f8fafb_0%,#f2f5f8_100%)] text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal">{t("badge")}</Badge>
            <Badge tone={statusTone(card.status)}>{statusLabel(card.status, statusLabels)}</Badge>
            <Badge>{typeLabel(card.classification.recordType, locale)}</Badge>
            {!card.upstream.synced ? <Badge tone="amber">{t("updating")}</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={listHref} tone="secondary">
              {t("back")}
            </LinkButton>
            <LinkButton href={card.repo.url} tone="secondary">
              {common("openGithub")}
            </LinkButton>
            {card.links?.docs ? <LinkButton href={card.links.docs}>{common("projectDocs")}</LinkButton> : null}
          </div>
        </div>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="motion-rise">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">
              {card.repo.owner}
            </p>
            <h1 className="mt-4 text-[clamp(2.8rem,8vw,6.3rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-foreground">
              {card.repo.name}
            </h1>
            <p className="mt-3 font-mono text-sm text-muted">{card.repo.fullName}</p>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-foreground">
              {card.summary}
            </p>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-muted">
              {card.whyItMatters}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {primaryCategory ? (
                <Badge tone="teal">
                  {primaryCategory.code} · {categoryLabel(primaryCategory, locale)}
                </Badge>
              ) : (
                <Badge tone="teal">{card.classification.categoryCode}</Badge>
              )}
              {secondaryCategories.map((item) => (
                <Badge key={item.code}>
                  {item.code} · {categoryLabel(item, locale)}
                </Badge>
              ))}
            </div>

            {card.notes ? (
              <div className="mt-8 rounded-[1.6rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  {t("focus")}
                </p>
                <p className="mt-3 text-sm leading-8 text-foreground">{card.notes}</p>
              </div>
            ) : null}
          </div>

          <aside className="motion-rise-delayed space-y-4">
            <Section title={t("overview")} eyebrow={t("overviewEyebrow")}>
              <dl className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Stars</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.stars?.toLocaleString("en-US") ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">{t("primaryLanguage")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.language ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">{t("license")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.license ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">{t("defaultBranch")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.defaultBranch ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">{t("updatedAt")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(card.upstream.pushedAt, localeForDate)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">{t("reviewAfter")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(card.review.reviewAfter, localeForDate)}
                  </dd>
                </div>
              </dl>
            </Section>
          </aside>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title={t("whyIncluded")} eyebrow={t("curationEyebrow")}>
            <dl className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">{t("primaryDirection")}</dt>
                <dd className="text-right text-foreground">
                  {primaryCategory
                    ? `${primaryCategory.code} · ${categoryLabel(primaryCategory, locale)}`
                    : card.classification.categoryCode}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">{t("projectType")}</dt>
                <dd className="text-right text-foreground">
                  {typeLabel(card.classification.recordType, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("tags")}</dt>
                <dd className="mt-3 flex flex-wrap gap-2">
                  {card.classification.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("keywords")}</dt>
                <dd className="mt-3 flex flex-wrap gap-2">
                  {card.classification.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center rounded-full border border-line bg-background px-3 py-1 text-xs text-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title={t("activity")} eyebrow={t("publicInfo")}>
            {!card.upstream.synced ? (
              <p className="text-sm leading-8 text-muted">
                {t("upstreamPending")}
              </p>
            ) : null}
            <p className="text-sm leading-8 text-foreground">
              {card.upstream.description ?? t("noDescription")}
            </p>
            {card.upstream.topics.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {card.upstream.topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-xs text-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("homepage")}
                </dt>
                <dd className="mt-2 break-words text-foreground">
                  {card.upstream.homepage ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("lastSynced")}
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.upstream.lastFetchedAt, localeForDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("archived")}
                </dt>
                <dd className="mt-2 text-foreground">
                  {card.upstream.archived ? common("yes") : common("no")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("docsLink")}
                </dt>
                <dd className="mt-2 break-words text-foreground">
                  {card.links?.docs ?? "—"}
                </dd>
              </div>
            </dl>
          </Section>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title={t("reviewPlan")} eyebrow={t("reviewPlanEyebrow")}>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("addedAt")}
                </dt>
                <dd className="mt-2 text-foreground">{formatDate(card.review.addedAt, localeForDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("lastReviewedAt")}
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.review.lastReviewedAt, localeForDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  {t("suggestedReview")}
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.review.reviewAfter, localeForDate)}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title={t("relatedKnowledge")} eyebrow={t("knowledgeEyebrow")}>
            {card.connections?.relatedRecordSlugs?.length ? (
              <div className="space-y-4">
                <p className="text-sm leading-8 text-muted">
                  {t("relatedIntro")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {card.connections.relatedRecordSlugs.map((slug) => (
                    <Link
                      key={slug}
                      href={`/records/${slug}`}
                      className="inline-flex cursor-pointer items-center rounded-full border border-line bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors duration-200 hover:border-line-strong hover:bg-white"
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
                {card.connections.note ? (
                  <p className="text-sm leading-8 text-muted">{card.connections.note}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-8 text-muted">
                {t("noRelated")}
              </p>
            )}
          </Section>
        </section>
      </div>
    </main>
  );
}
