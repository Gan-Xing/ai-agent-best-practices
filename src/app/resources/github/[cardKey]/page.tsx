import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import categoriesData from "../../../../../prisma/seed-data/categories.json";
import vocabularyData from "../../../../../prisma/seed-data/vocabulary.json";

import { getGithubRepoCardByKey } from "@/lib/github-cards";
import {
  Badge,
  LinkButton,
  Section,
  formatDate,
  statusTone,
} from "@/app/resources/github/ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
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

function typeLabel(value: string) {
  return recordTypes.find((item) => item.code === value)?.labelZh ?? value;
}

export async function generateMetadata({
  params,
}: Readonly<PageProps>): Promise<Metadata> {
  const { cardKey } = await params;
  const card = await getGithubRepoCardByKey(cardKey);

  if (!card) {
    return {
      title: "GitHub Card Not Found",
    };
  }

  return {
    title: `${card.repo.fullName} · GitHub Reference`,
    description: card.summary,
  };
}

export default async function GitHubResourceDetailPage({
  params,
  searchParams,
}: Readonly<PageProps>) {
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.08),transparent_28%),linear-gradient(180deg,#f8fafb_0%,#f2f5f8_100%)] text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal">GitHub Card</Badge>
            <Badge tone={statusTone(card.status)}>{card.status}</Badge>
            <Badge>{typeLabel(card.classification.recordType)}</Badge>
            {!card.upstream.synced ? <Badge tone="amber">Snapshot pending</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={listHref} tone="secondary">
              Back to library
            </LinkButton>
            <LinkButton href={card.repo.url} tone="secondary">
              GitHub repo
            </LinkButton>
            {card.links?.docs ? <LinkButton href={card.links.docs}>Docs</LinkButton> : null}
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
                  {primaryCategory.code} · {primaryCategory.nameZh ?? primaryCategory.name}
                </Badge>
              ) : (
                <Badge tone="teal">{card.classification.categoryCode}</Badge>
              )}
              {secondaryCategories.map((item) => (
                <Badge key={item.code}>
                  {item.code} · {item.nameZh ?? item.name}
                </Badge>
              ))}
            </div>

            {card.notes ? (
              <div className="mt-8 rounded-[1.6rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  Study Focus
                </p>
                <p className="mt-3 text-sm leading-8 text-foreground">{card.notes}</p>
              </div>
            ) : null}
          </div>

          <aside className="motion-rise-delayed space-y-4">
            <Section title="Snapshot" eyebrow="At A Glance">
              <dl className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Stars</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.stars?.toLocaleString("en-US") ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Language</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.language ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">License</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.license ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Default branch</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.defaultBranch ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Last upstream push</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(card.upstream.pushedAt)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Review after</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(card.review.reviewAfter)}
                  </dd>
                </div>
              </dl>
            </Section>
          </aside>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title="Classification" eyebrow="Curation">
            <dl className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">Primary category</dt>
                <dd className="text-right text-foreground">
                  {primaryCategory
                    ? `${primaryCategory.code} · ${primaryCategory.nameZh ?? primaryCategory.name}`
                    : card.classification.categoryCode}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">Record type</dt>
                <dd className="text-right text-foreground">
                  {typeLabel(card.classification.recordType)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Tags</dt>
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
                <dt className="text-muted">Keywords</dt>
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

          <Section title="Upstream Signals" eyebrow="Repository Facts">
            {!card.upstream.synced ? (
              <p className="text-sm leading-8 text-muted">
                这张卡片的仓库概览还没有刷新完成，稍后再看会更完整。
              </p>
            ) : null}
            <p className="text-sm leading-8 text-foreground">
              {card.upstream.description ?? "No upstream description was stored."}
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
                  Homepage
                </dt>
                <dd className="mt-2 break-words text-foreground">
                  {card.upstream.homepage ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  Last fetched
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.upstream.lastFetchedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  Archived upstream
                </dt>
                <dd className="mt-2 text-foreground">
                  {card.upstream.archived ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  Docs link
                </dt>
                <dd className="mt-2 break-words text-foreground">
                  {card.links?.docs ?? "—"}
                </dd>
              </div>
            </dl>
          </Section>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title="Review Lifecycle" eyebrow="Curation Clock">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  Added
                </dt>
                <dd className="mt-2 text-foreground">{formatDate(card.review.addedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  Last reviewed
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.review.lastReviewedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  Review after
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.review.reviewAfter)}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Connections" eyebrow="Optional Graph">
            {card.connections?.relatedRecordSlugs?.length ? (
              <div className="space-y-4">
                <p className="text-sm leading-8 text-muted">
                  这张卡片当前和正式 records 有明确关联。
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
                当前没有显式关联的 record。这是正常的，GitHub 卡片和 records
                是并列资产，不要求互相依赖。
              </p>
            )}
          </Section>
        </section>
      </div>
    </main>
  );
}
