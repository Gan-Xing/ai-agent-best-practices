import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="min-h-screen px-5 py-24">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-surface px-6 py-8 text-center shadow-[var(--shadow)] sm:px-10 sm:py-12">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
          {t("description")}
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            {t("backHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
