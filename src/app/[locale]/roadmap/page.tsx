import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { resolveLocale, type LocaleParams } from "@/i18n/server";

type PageProps = {
  params: LocaleParams;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Roadmap.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type Priority = {
  rank: number;
  direction: string;
  categories: string;
  rationale: string;
  output: string;
};

type Phase = {
  step: string;
  status: "done" | "active" | "next" | "later";
  title: string;
  goal: string;
  deliverables: string[];
  detailHref?: string;
};

type CategoryPlan = {
  code: string;
  name: string;
  role: string;
  records: string[];
};

function statusClass(status: Phase["status"]) {
  switch (status) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "active":
      return "border-accent/25 bg-accent-soft text-accent";
    case "next":
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

function SectionHeader({
  eyebrow,
  title,
  body,
}: Readonly<{
  eyebrow: string;
  title: string;
  body: string;
}>) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{body}</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M3 8h9" />
      <path d="m9 4 4 4-4 4" />
    </svg>
  );
}

export default async function RoadmapPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Roadmap" });
  const priorities = t.raw("data.priorities") as Priority[];
  const phases = t.raw("data.phases") as Phase[];
  const categoryPlans = t.raw("data.categoryPlans") as CategoryPlan[];
  const recordTemplate = t.raw("data.recordTemplate") as string[];
  const examples = t.raw("data.examples") as string[];
  const productSignals = t.raw("data.productSignals") as string[];
  const nearTerm = t.raw("data.nearTerm") as Array<{ title: string; body: string }>;
  const heroCards = t.raw("hero.cards") as Array<{ label: string; value: string }>;
  const navBadges = t.raw("nav.badges") as string[];

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-strong px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-muted transition hover:border-line-strong hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M10 12 6 8l4-4" />
            </svg>
            {t("nav.back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {navBadges.map((badge) => (
              <Badge key={badge}>{badge}</Badge>
            ))}
          </div>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="px-6 py-10 sm:px-8 lg:px-10 lg:py-12">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {t("hero.eyebrow")}
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                {t("hero.description")}
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {heroCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-line bg-background/70 p-4"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                      {card.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="border-t border-line bg-[#101820] px-6 py-8 text-white sm:px-8 lg:border-l lg:border-t-0 lg:px-7 lg:py-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("hero.principlesEyebrow")}
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
                {t("hero.principlesTitle")}
              </h2>
              <div className="mt-6 space-y-4">
                {productSignals.map((signal) => (
                  <div key={signal} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="mt-1 text-teal-300">
                      <ArrowIcon />
                    </span>
                    <p>{signal}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionHeader
            eyebrow={t("sections.phaseEyebrow")}
            title={t("sections.phaseTitle")}
            body={t("sections.phaseBody")}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {phases.map((phase) => (
              <article
                key={phase.step}
                className="flex flex-col rounded-xl border border-line bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {phase.step}
                  </span>
                  <Badge className={statusClass(phase.status)}>
                    {t(`status.${phase.status}`)}
                  </Badge>
                </div>
                <h3 className="mt-4 text-base font-semibold leading-6 text-foreground">
                  {phase.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted">{phase.goal}</p>
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {phase.deliverables.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
                {phase.detailHref ? (
                  <div className="mt-auto pt-4">
                    <Link
                      href={phase.detailHref}
                      className="inline-flex items-center justify-center rounded-lg border border-line bg-surface-strong px-3 py-2 text-xs font-medium text-foreground transition hover:border-line-strong hover:bg-white"
                    >
                      {t("status.detail")}
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionHeader
            eyebrow={t("sections.priorityEyebrow")}
            title={t("sections.priorityTitle")}
            body={t("sections.priorityBody")}
          />

          <div className="mt-6 overflow-hidden rounded-xl border border-line">
            <div className="hidden grid-cols-[4.5rem_1.1fr_0.8fr_1.25fr_1.35fr] border-b border-line bg-background/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted lg:grid">
              <div>{t("table.rank")}</div>
              <div>{t("table.direction")}</div>
              <div>{t("table.categories")}</div>
              <div>{t("table.whyNow")}</div>
              <div>{t("table.expectedRecords")}</div>
            </div>
            <div className="divide-y divide-line">
              {priorities.map((item) => (
                <article
                  key={item.rank}
                  className="grid gap-3 bg-white/55 px-4 py-4 transition hover:bg-white lg:grid-cols-[4.5rem_1.1fr_0.8fr_1.25fr_1.35fr] lg:items-start"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-strong font-mono text-sm font-semibold text-foreground">
                      {item.rank}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted lg:hidden">
                      {t("table.priority")}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {item.direction}
                  </h3>
                  <p className="font-mono text-xs leading-6 text-muted">{item.categories}</p>
                  <p className="text-sm leading-7 text-muted">{item.rationale}</p>
                  <p className="text-sm leading-7 text-foreground">{item.output}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionHeader
              eyebrow={t("sections.firstBuildEyebrow")}
              title={t("sections.firstBuildTitle")}
              body={t("sections.firstBuildBody")}
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {categoryPlans.map((area) => (
                <article
                  key={area.code}
                  className="rounded-xl border border-line bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                        {area.code}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">
                        {area.name}
                      </h3>
                    </div>
                    <Badge className="border-accent/20 bg-accent-soft text-accent">
                      {t("status.focus")}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{area.role}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {area.records.map((record) => (
                      <Badge key={record}>{record}</Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionHeader
              eyebrow={t("sections.recordShapeEyebrow")}
              title={t("sections.recordShapeTitle")}
              body={t("sections.recordShapeBody")}
            />
            <ol className="mt-6 space-y-3">
              {recordTemplate.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-xl border border-line bg-background/70 p-3 text-sm leading-6 text-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-strong font-mono text-[11px] text-muted">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-[#101820] px-5 py-6 text-white shadow-[var(--shadow)] sm:px-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("sections.examplesEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
              {t("sections.examplesTitle")}
            </h2>
            <div className="mt-5 space-y-3">
              {examples.map((title) => (
                <div
                  key={title}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <p className="text-sm font-medium leading-6 text-slate-100">
                    {title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionHeader
              eyebrow={t("sections.nearTermEyebrow")}
              title={t("sections.nearTermTitle")}
              body={t("sections.nearTermBody")}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {nearTerm.map(({ title, body }) => (
                <article
                  key={title}
                  className="rounded-xl border border-line bg-background/70 p-4"
                >
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
