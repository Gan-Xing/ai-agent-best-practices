import type { Locale } from "@/i18n/routing";

type LocalizedNamedItem = {
  name: string;
  nameZh?: string | null;
  description?: string | null;
};

type LocalizedLabeledItem = {
  label: string;
  labelZh?: string | null;
  description?: string | null;
};

type LocalizedRecordBase = {
  language: string;
  title: string;
  summary: string | null;
  body: string | null;
  problem: string | null;
  recommendation: string | null;
  metadata: unknown;
  translations: Array<{
    language: string;
    title: string;
    summary: string | null;
    body: string | null;
    problem: string | null;
    recommendation: string | null;
    metadata: unknown;
  }>;
};

export type LocalizedRecordContent = {
  requestedLocale: Locale;
  displayLanguage: string;
  sourceLanguage: string;
  isFallback: boolean;
  translationAvailable: boolean;
  title: string;
  summary: string | null;
  body: string | null;
  problem: string | null;
  recommendation: string | null;
  metadata: unknown;
};

export function pickLocalizedName<T extends LocalizedNamedItem>(
  item: T,
  locale: Locale,
) {
  return locale === "zh" ? item.nameZh ?? item.name : item.name;
}

export function pickLocalizedLabel<T extends LocalizedLabeledItem>(
  item: T,
  locale: Locale,
) {
  return locale === "zh" ? item.labelZh ?? item.label : item.label;
}

export function pickLocalizedRecord<T extends LocalizedRecordBase>(
  record: T,
  locale: Locale,
): LocalizedRecordContent {
  if (record.language === locale) {
    return {
      requestedLocale: locale,
      displayLanguage: record.language,
      sourceLanguage: record.language,
      isFallback: false,
      translationAvailable: true,
      title: record.title,
      summary: record.summary,
      body: record.body,
      problem: record.problem,
      recommendation: record.recommendation,
      metadata: record.metadata,
    };
  }

  const translation = record.translations.find((item) => item.language === locale);

  if (translation) {
    return {
      requestedLocale: locale,
      displayLanguage: translation.language,
      sourceLanguage: record.language,
      isFallback: false,
      translationAvailable: true,
      title: translation.title,
      summary: translation.summary,
      body: translation.body,
      problem: translation.problem,
      recommendation: translation.recommendation,
      metadata: translation.metadata,
    };
  }

  return {
    requestedLocale: locale,
    displayLanguage: record.language,
    sourceLanguage: record.language,
    isFallback: true,
    translationAvailable: false,
    title: record.title,
    summary: record.summary,
    body: record.body,
    problem: record.problem,
    recommendation: record.recommendation,
    metadata: record.metadata,
  };
}
