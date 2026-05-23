import { defineRouting } from "next-intl/routing";

export const localeCookie = {
  name: "AIAGENT_LOCALE",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;

export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
  localeCookie,
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string): value is Locale {
  return routing.locales.includes(value as Locale);
}
