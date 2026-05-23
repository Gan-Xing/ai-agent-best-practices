import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExists(relativePath: string) {
  assert(existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
}

const requiredFiles = [
  "src/i18n/routing.ts",
  "src/i18n/request.ts",
  "src/i18n/navigation.ts",
  "src/i18n/server.ts",
  "src/proxy.ts",
  "src/components/language-switcher.tsx",
  "src/app/api/locale/route.ts",
  "src/app/[locale]/layout.tsx",
  "src/app/[locale]/not-found.tsx",
  "src/app/[locale]/[...rest]/page.tsx",
  "messages/zh.json",
  "messages/en.json",
];

for (const file of requiredFiles) {
  assertExists(file);
}

const routing = read("src/i18n/routing.ts");
assert(
  routing.includes('defaultLocale: "zh"') && routing.includes('localePrefix: "as-needed"'),
  "routing.ts must keep zh as default locale with as-needed prefixing",
);

const proxy = read("src/proxy.ts");
for (const excluded of ["api", "_next", "_vercel", "artifacts"]) {
  assert(proxy.includes(excluded), `proxy matcher must exclude ${excluded}`);
}

const layout = read("src/app/[locale]/layout.tsx");
assert(
  layout.includes("<Suspense fallback={null}>") &&
    layout.includes("<LanguageSwitcher />"),
  "LanguageSwitcher must stay behind a Suspense boundary",
);
assert(
  layout.includes("NextIntlClientProvider") &&
    layout.includes("messages={clientMessages}"),
  "layout must only pass the required client messages to NextIntlClientProvider",
);

const localeApi = read("src/app/api/locale/route.ts");
assert(
  localeApi.includes("localizeReturnTo") &&
    localeApi.includes("localeCookie.name") &&
    localeApi.includes("startsWith(\"/api\")") &&
    localeApi.includes("startsWith(\"/artifacts\")"),
  "locale API must normalize returnTo and keep API/artifact paths out of language switching",
);

const appAndComponentFiles = [
  "src/app/[locale]/layout.tsx",
  "src/app/[locale]/page.tsx",
  "src/app/[locale]/records/[slug]/page.tsx",
  "src/app/[locale]/resources/github/page.tsx",
  "src/app/[locale]/resources/github/[cardKey]/page.tsx",
  "src/app/[locale]/resources/github/ui.tsx",
  "src/app/[locale]/models/capability/page.tsx",
  "src/app/[locale]/roadmap/page.tsx",
  "src/app/[locale]/roadmap/i18n/page.tsx",
  "src/components/language-switcher.tsx",
  "src/i18n/locale.ts",
  "src/i18n/navigation.ts",
  "src/i18n/request.ts",
  "src/i18n/routing.ts",
  "src/i18n/server.ts",
];

for (const file of appAndComponentFiles) {
  const content = read(file);
  assert(!/[\u4e00-\u9fff]/.test(content), `${file} contains hard-coded Chinese UI text`);
}

const localePages = appAndComponentFiles
  .filter((file) => file.startsWith("src/app/[locale]/"))
  .map((file) => [file, read(file)] as const);

for (const [file, content] of localePages) {
  if (file.endsWith("not-found.tsx")) {
    continue;
  }

  assert(
    !content.includes('getTranslations("') && !content.includes("getLocale()"),
    `${file} must resolve translations from params.locale instead of implicit request locale`,
  );
}

const homePage = read("src/app/[locale]/page.tsx");
assert(
  homePage.includes("locale,") && homePage.includes("matchLanguage") && homePage.includes("usedFallback"),
  "home search page must pass locale and display match/fallback language state",
);

const searchLib = read("src/lib/search.ts");
assert(
  searchLib.includes("locale:") &&
    searchLib.includes("record_translations") &&
    searchLib.includes("matchLanguage") &&
    searchLib.includes("usedFallback"),
  "searchRecords must implement locale-aware bilingual search and fallback metadata",
);

const recordsPage = read("src/app/[locale]/records/[slug]/page.tsx");
assert(
  recordsPage.includes("pickLocalizedRecord") &&
    recordsPage.includes("missingTranslation") &&
    recordsPage.includes("displayLanguage"),
  "record detail page must render localized content and explicit missing-translation fallback",
);

const ci = read(".github/workflows/ci.yml");
assert(ci.includes("pnpm i18n:check"), "CI must run pnpm i18n:check");
assert(ci.includes("pnpm i18n:quality"), "CI must run pnpm i18n:quality");

console.log("i18n quality checks passed.");
