import type { Locale } from "@/i18n/routing";

export function dateLocale(locale: Locale) {
  return locale === "zh" ? "zh-CN" : "en-US";
}
