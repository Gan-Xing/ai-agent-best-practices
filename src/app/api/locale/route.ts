import { NextRequest, NextResponse } from "next/server";

import { isLocale, localeCookie, type Locale } from "@/i18n/routing";

function stripLocalePrefix(pathname: string) {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname;
}

function localizeReturnTo(value: string, locale: Locale) {
  const parsed = new URL(value, "https://aiagent.local");
  const unprefixedPathname = stripLocalePrefix(parsed.pathname);
  const pathname =
    locale === "en"
      ? unprefixedPathname === "/"
        ? "/en"
        : `/en${unprefixedPathname}`
      : unprefixedPathname;

  return `${pathname}${parsed.search}${parsed.hash}`;
}

function normalizeReturnTo(value: string | null, locale: Locale | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const parsed = new URL(value, "https://aiagent.local");

    if (
      parsed.pathname.startsWith("/api") ||
      parsed.pathname.startsWith("/artifacts")
    ) {
      return "/";
    }

    return locale ? localizeReturnTo(value, locale) : value;
  } catch {
    return "/";
  }
}

export function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  const targetLocale = locale && isLocale(locale) ? locale : null;
  const returnTo = normalizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
    targetLocale,
  );

  if (!targetLocale) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));

  response.cookies.set(localeCookie.name, targetLocale, {
    maxAge: localeCookie.maxAge,
    sameSite: localeCookie.sameSite,
    path: "/",
  });

  return response;
}
