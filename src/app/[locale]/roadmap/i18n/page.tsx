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
  const t = await getTranslations({
    locale,
    namespace: "Roadmap.i18n.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type TodoGroup = {
  code: string;
  status: "done" | "active" | "todo";
  title: string;
  goal: string;
  items: string[];
};

type Decision = {
  title: string;
  body: string;
};

const routeContract = [
  "/",
  "/en",
  "/records/[slug]",
  "/en/records/[slug]",
  "/resources/github",
  "/en/resources/github",
  "/roadmap",
  "/en/roadmap",
  "/roadmap/i18n",
  "/en/roadmap/i18n",
  "/models/capability",
  "/en/models/capability",
];

function todoStatusClassName(status: TodoGroup["status"]) {
  switch (status) {
    case "done":
      return "border-emerald-500/20 bg-emerald-50 text-emerald-700";
    case "active":
      return "border-accent/20 bg-accent-soft text-accent";
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

function SectionTitle({
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

export default async function I18nRoadmapPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Roadmap.i18n" });
  const statusT = await getTranslations({
    locale,
    namespace: "Roadmap.i18nStatus",
  });
  const navBadges = t.raw("navBadges") as string[];
  const heroBadges = t.raw("hero.badges") as string[];
  const decisions = t.raw("decisions") as Decision[];
  const todoGroups = t.raw("todoGroups") as TodoGroup[];
  const acceptance = t.raw("acceptance") as string[];

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow)]">
          <Link
            href="/roadmap"
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
            Roadmap
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {navBadges.map((badge) => (
              <Badge key={badge}>{badge}</Badge>
            ))}
          </div>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
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
              <div className="mt-7 flex flex-wrap gap-2">
                {heroBadges.map((badge, index) => (
                  <Badge
                    key={badge}
                    className={
                      index === 0
                        ? "border-accent/25 bg-accent-soft text-accent"
                        : undefined
                    }
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>

            <aside className="border-t border-line bg-[#101820] px-6 py-8 text-white sm:px-8 lg:border-l lg:border-t-0 lg:px-7 lg:py-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("hero.buildOrderEyebrow")}
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
                {t("hero.buildOrderTitle")}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {t("hero.buildOrderBody")}
              </p>
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="font-mono text-xs text-slate-300">
                  docs/internationalization-todo.md
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionTitle
            eyebrow={t("sections.decisionsEyebrow")}
            title={t("sections.decisionsTitle")}
            body={t("sections.decisionsBody")}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {decisions.map((decision) => (
              <article
                key={decision.title}
                className="rounded-xl border border-line bg-background/70 p-4"
              >
                <h3 className="text-base font-semibold text-foreground">
                  {decision.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted">{decision.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionTitle
            eyebrow={t("sections.routeEyebrow")}
            title={t("sections.routeTitle")}
            body={t("sections.routeBody")}
          />
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {routeContract.map((route) => (
              <code
                key={route}
                className="rounded-lg border border-line bg-background/70 px-3 py-2 font-mono text-xs text-foreground"
              >
                {route}
              </code>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionTitle
            eyebrow={t("sections.todoEyebrow")}
            title={t("sections.todoTitle")}
            body={t("sections.todoBody")}
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {todoGroups.map((group) => (
              <article
                key={group.code}
                className="rounded-xl border border-line bg-background/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                      {group.code}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">
                      {group.title}
                    </h3>
                  </div>
                  <Badge className={todoStatusClassName(group.status)}>
                    {statusT(group.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted">{group.goal}</p>
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-[#101820] px-5 py-6 text-white shadow-[var(--shadow)] sm:px-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("sections.acceptanceEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
              {t("sections.acceptanceTitle")}
            </h2>
            <div className="mt-5 space-y-3">
              {acceptance.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <p className="text-sm font-medium leading-6 text-slate-100">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionTitle
              eyebrow={t("sections.documentationEyebrow")}
              title={t("sections.documentationTitle")}
              body={t("sections.documentationBody")}
            />
            <div className="mt-6 rounded-xl border border-line bg-background/70 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Document
              </p>
              <code className="mt-3 block rounded-lg bg-white px-3 py-2 font-mono text-xs text-foreground">
                docs/internationalization-todo.md
              </code>
              <p className="mt-3 text-sm leading-7 text-muted">
                {t("sections.documentBody")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
