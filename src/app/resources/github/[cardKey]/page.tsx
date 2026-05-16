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
  statusLabel,
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
      title: "参考项目未找到",
    };
  }

  return {
    title: `${card.repo.fullName} · 开源项目参考`,
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
            <Badge tone="teal">开源项目</Badge>
            <Badge tone={statusTone(card.status)}>{statusLabel(card.status)}</Badge>
            <Badge>{typeLabel(card.classification.recordType)}</Badge>
            {!card.upstream.synced ? <Badge tone="amber">资料更新中</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={listHref} tone="secondary">
              返回项目库
            </LinkButton>
            <LinkButton href={card.repo.url} tone="secondary">
              打开 GitHub
            </LinkButton>
            {card.links?.docs ? <LinkButton href={card.links.docs}>项目文档</LinkButton> : null}
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
                  重点看什么
                </p>
                <p className="mt-3 text-sm leading-8 text-foreground">{card.notes}</p>
              </div>
            ) : null}
          </div>

          <aside className="motion-rise-delayed space-y-4">
            <Section title="项目概览" eyebrow="快速判断">
              <dl className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Stars</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.stars?.toLocaleString("en-US") ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">主要语言</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.language ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">许可证</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.license ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">默认分支</dt>
                  <dd className="text-right font-medium text-foreground">
                    {card.upstream.defaultBranch ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">最近更新</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(card.upstream.pushedAt)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">下次复看</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(card.review.reviewAfter)}
                  </dd>
                </div>
              </dl>
            </Section>
          </aside>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title="为什么收录" eyebrow="整理判断">
            <dl className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">主要方向</dt>
                <dd className="text-right text-foreground">
                  {primaryCategory
                    ? `${primaryCategory.code} · ${primaryCategory.nameZh ?? primaryCategory.name}`
                    : card.classification.categoryCode}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">项目类型</dt>
                <dd className="text-right text-foreground">
                  {typeLabel(card.classification.recordType)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">标签</dt>
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
                <dt className="text-muted">关键词</dt>
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

          <Section title="项目动态" eyebrow="公开信息">
            {!card.upstream.synced ? (
              <p className="text-sm leading-8 text-muted">
                这个项目的公开信息还在更新中，稍后再看会更完整。
              </p>
            ) : null}
            <p className="text-sm leading-8 text-foreground">
              {card.upstream.description ?? "暂时没有项目简介。"}
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
                  官网
                </dt>
                <dd className="mt-2 break-words text-foreground">
                  {card.upstream.homepage ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  最近同步
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.upstream.lastFetchedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  是否归档
                </dt>
                <dd className="mt-2 text-foreground">
                  {card.upstream.archived ? "是" : "否"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  文档链接
                </dt>
                <dd className="mt-2 break-words text-foreground">
                  {card.links?.docs ?? "—"}
                </dd>
              </div>
            </dl>
          </Section>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Section title="整理节奏" eyebrow="复看计划">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  收录时间
                </dt>
                <dd className="mt-2 text-foreground">{formatDate(card.review.addedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  最近整理
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.review.lastReviewedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-muted">
                  建议复看
                </dt>
                <dd className="mt-2 text-foreground">
                  {formatDate(card.review.reviewAfter)}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="相关知识" eyebrow="知识关联">
            {card.connections?.relatedRecordSlugs?.length ? (
              <div className="space-y-4">
                <p className="text-sm leading-8 text-muted">
                  这个项目已经关联到知识库里的相关记录。
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
                当前还没有关联到具体知识记录。你仍然可以把它作为实现参考，
                后续形成明确结论后再补充关联。
              </p>
            )}
          </Section>
        </section>
      </div>
    </main>
  );
}
