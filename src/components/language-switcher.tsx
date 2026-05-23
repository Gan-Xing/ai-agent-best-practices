"use client";

import { useMemo, useSyncExternalStore } from "react";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

function subscribeToHashChange(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getCurrentHash() {
  return window.location.hash;
}

function getServerHash() {
  return "";
}

function useCurrentHash() {
  return useSyncExternalStore(
    subscribeToHashChange,
    getCurrentHash,
    getServerHash,
  );
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = useCurrentHash();
  const t = useTranslations("LanguageSwitcher");

  const localizedHrefs = useMemo(() => {
    const basePath = pathname || "/";
    const queryString = searchParams.toString();
    const suffix = queryString ? `?${queryString}` : "";
    const normalizedBase = basePath === "/" ? "" : basePath;

    return {
      zh: `${basePath}${suffix}${hash}`,
      en: `/en${normalizedBase}${suffix}${hash}`,
    } satisfies Record<Locale, string>;
  }, [hash, pathname, searchParams]);

  return (
    <div className="fixed right-4 top-4 z-50">
      <nav
        aria-label={t("label")}
        className="inline-flex overflow-hidden rounded-full border border-line bg-white/90 p-1 text-xs font-semibold shadow-[var(--shadow)] backdrop-blur"
      >
        {routing.locales.map((targetLocale) => {
          const active = targetLocale === locale;

          return (
            <NextLink
              key={targetLocale}
              href={`/api/locale?locale=${targetLocale}&returnTo=${encodeURIComponent(
                localizedHrefs[targetLocale],
              )}`}
              aria-current={active ? "true" : undefined}
              className={`inline-flex h-8 min-w-10 items-center justify-center rounded-full px-3 transition ${
                active
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {t(targetLocale)}
            </NextLink>
          );
        })}
      </nav>
    </div>
  );
}
