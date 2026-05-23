import { isLocale, routing, type Locale } from "@/i18n/routing";

export type LocaleParam = {
  locale: string;
};

export type LocaleParams = Promise<LocaleParam>;

export async function resolveLocale(params: LocaleParams): Promise<Locale> {
  const { locale } = await params;

  return isLocale(locale) ? locale : routing.defaultLocale;
}
