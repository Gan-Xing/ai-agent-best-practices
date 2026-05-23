import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { dateLocale } from "@/i18n/locale";
import { resolveLocale } from "@/i18n/server";
import { AppError } from "@/lib/errors";
import { pickLocalizedName, pickLocalizedRecord } from "@/lib/localization";
import { getRecordBySlug } from "@/lib/records";

type RecordPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    from?: string | string[];
  }>;
};

/* ---------- tiny JSON-safe helpers ---------- */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function asRecord(v: unknown): Record<string, JsonValue> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, JsonValue>;
  return null;
}

function asArray(v: unknown): JsonValue[] {
  if (Array.isArray(v)) return v as JsonValue[];
  return [];
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asStringArray(v: unknown): string[] {
  return asArray(v).map((i) => String(i));
}

type RecordCopy = {
  fieldLabels: Record<string, string>;
  labels: {
    shell: string;
    model: string;
    runner: string;
    servedModelName: string;
    port: string;
    maxNumSeqs: string;
    maxModelLen: string;
    gpuMemoryUtilization: string;
    reasoningParser: string;
    toolCallParser: string;
    enableAutoToolChoice: string;
    enablePrefixCaching: string;
    environmentVariables: string;
    speculativeDecoding: string;
    vllmCommand: string;
  };
};

function friendlyLabel(key: string, fieldLabels: Record<string, string>): string {
  return fieldLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/* ---------- source type helpers ---------- */

const SOURCE_STYLE: Record<string, { label: string; color: string }> = {
  PAPER: { label: "DOC", color: "border-indigo-200 bg-indigo-50/50" },
  REPOSITORY: { label: "REPO", color: "border-cyan-200 bg-cyan-50/50" },
  URL: { label: "URL", color: "border-amber-200 bg-amber-50/50" },
  CHAT: { label: "CHAT", color: "border-pink-200 bg-pink-50/50" },
  GITHUB_JSON: { label: "JSON", color: "border-emerald-200 bg-emerald-50/50" },
};

function sourceStyle(type: string) {
  return SOURCE_STYLE[type] ?? { label: "SRC", color: "border-line bg-background/60" };
}

/* ---------- shared UI primitives ---------- */

function Section({
  title,
  children,
  id,
  className,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}>) {
  return (
    <section
      id={id}
      className={`break-inside-avoid rounded-[1.5rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] ${className ?? ""}`}
    >
      <h2 className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-7 text-foreground sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function Badge({
  children,
  variant = "default",
}: Readonly<{
  children: React.ReactNode;
  variant?: "default" | "green" | "amber" | "red" | "blue" | "purple";
}>) {
  const colors: Record<string, string> = {
    default: "border-line bg-background/80 text-muted",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

function statusVariant(s: string) {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "default"> = {
    PUBLISHED: "green",
    REVIEW: "amber",
    DRAFT: "blue",
    ARCHIVED: "red",
    VALIDATED: "green",
    REVIEWED: "green",
    SEED: "amber",
    DEPRECATED: "red",
    FRESH: "green",
    STALE: "red",
    NEEDS_REVIEW: "amber",
    UNKNOWN: "default",
  };
  return map[s] ?? "default";
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e8e0d4]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #16615c, #1a8a84)`,
          }}
        />
      </div>
      <span className="shrink-0 font-mono text-xs text-muted">{pct}%</span>
    </div>
  );
}

function KeyValueRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children}</dd>
    </div>
  );
}

function TagGroup({ items, variant = "default" }: { items: string[]; variant?: "default" | "green" | "amber" | "red" | "blue" | "purple" }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant={variant}>{item}</Badge>
      ))}
    </div>
  );
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isScalar(value: JsonValue): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function scalarText(value: string | number | boolean | null) {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function isCommandField(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("command") ||
    normalized.includes("cli") ||
    normalized.includes("shell")
  );
}

function looksLikeCommandLine(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("--") ||
    trimmed.startsWith("uv ") ||
    trimmed.startsWith("vllm ") ||
    trimmed.includes(" vllm ") ||
    /^[-_A-Z0-9]+=.*/.test(trimmed)
  );
}

function commandTextForValue(fieldKey: string, value: JsonValue) {
  if (typeof value === "string") {
    if (isCommandField(fieldKey) || value.includes("\n")) {
      return value;
    }
    return null;
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string")
  ) {
    const lines = value as string[];
    if (isCommandField(fieldKey) || lines.some(looksLikeCommandLine)) {
      return lines.join("\n");
    }
  }

  return null;
}

function CommandBlock({
  label,
  command,
  shellLabel,
}: Readonly<{
  label: string;
  command: string;
  shellLabel: string;
}>) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101820] text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">
          {label}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">
          {shellLabel}
        </span>
      </div>
      <pre className="max-h-[28rem] overflow-x-auto whitespace-pre p-4 text-xs leading-6">
        <code>{command}</code>
      </pre>
    </div>
  );
}

function ConfigTile({
  label,
  value,
}: Readonly<{
  label: string;
  value: JsonValue | undefined;
}>) {
  if (value === undefined || !isScalar(value)) return null;
  return (
    <div className="rounded-lg border border-line/60 bg-white/70 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-xs text-foreground">
        {scalarText(value)}
      </p>
    </div>
  );
}

function RuntimeConfigCard({ data, copy }: { data: Record<string, JsonValue>; copy: RecordCopy }) {
  const env = isJsonObject(data.env) ? data.env : null;
  const speculativeConfig = isJsonObject(data.speculativeConfig)
    ? data.speculativeConfig
    : null;
  const command = commandTextForValue("commandLines", data.commandLines);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <ConfigTile label={copy.labels.model} value={data.model} />
        <ConfigTile label={copy.labels.runner} value={data.runner} />
        <ConfigTile label={copy.labels.servedModelName} value={data.servedModelName} />
        <ConfigTile label={copy.labels.port} value={data.port} />
        <ConfigTile label={copy.labels.maxNumSeqs} value={data.maxNumSeqs} />
        <ConfigTile label={copy.labels.maxModelLen} value={data.maxModelLen} />
        <ConfigTile label={copy.labels.gpuMemoryUtilization} value={data.gpuMemoryUtilization} />
        <ConfigTile label={copy.labels.reasoningParser} value={data.reasoningParser} />
        <ConfigTile label={copy.labels.toolCallParser} value={data.toolCallParser} />
        <ConfigTile label={copy.labels.enableAutoToolChoice} value={data.enableAutoToolChoice} />
        <ConfigTile label={copy.labels.enablePrefixCaching} value={data.enablePrefixCaching} />
      </div>

      {env ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {copy.labels.environmentVariables}
          </p>
          <SmartJsonSection data={env} copy={copy} />
        </div>
      ) : null}

      {speculativeConfig ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {copy.labels.speculativeDecoding}
          </p>
          <SmartJsonSection data={speculativeConfig} copy={copy} />
        </div>
      ) : null}

      {command ? (
        <CommandBlock
          label={copy.labels.vllmCommand}
          command={command}
          shellLabel={copy.labels.shell}
        />
      ) : null}
    </div>
  );
}

function SmartJsonValue({
  fieldKey,
  value,
  variant,
  copy,
}: Readonly<{
  fieldKey: string;
  value: JsonValue;
  variant: "default" | "green" | "amber" | "red" | "blue" | "purple";
  copy: RecordCopy;
}>) {
  const command = commandTextForValue(fieldKey, value);

  if (command) {
    return (
      <CommandBlock
        label={friendlyLabel(fieldKey, copy.fieldLabels)}
        command={command}
        shellLabel={copy.labels.shell}
      />
    );
  }

  if (fieldKey === "vllmServeExample" && isJsonObject(value)) {
    return <RuntimeConfigCard data={value} copy={copy} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted">—</p>;
    }

    if (value.every(isScalar)) {
      return <TagGroup items={value.map((item) => scalarText(item))} variant={variant} />;
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) =>
          isJsonObject(item) ? (
            <div
              key={`${fieldKey}-${index}`}
              className="rounded-lg border border-line/50 bg-background/40 p-3"
            >
              <SmartJsonSection data={item} variant={variant} copy={copy} />
            </div>
          ) : (
            <p key={`${fieldKey}-${index}`} className="text-sm">
              {isScalar(item) ? scalarText(item) : JSON.stringify(item)}
            </p>
          ),
        )}
      </div>
    );
  }

  if (isJsonObject(value)) {
    return (
      <div className="rounded-lg border border-line/50 bg-background/40 p-3">
        <SmartJsonSection data={value} variant={variant} copy={copy} />
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "green" : "default"}>
        {scalarText(value)}
      </Badge>
    );
  }

  return <p className="break-words font-mono text-sm">{scalarText(value)}</p>;
}

/** Render a JSON object with friendly labels and command-aware formatting */
function SmartJsonSection({
  data,
  copy,
  variant = "default",
}: {
  data: Record<string, JsonValue>;
  copy: RecordCopy;
  variant?: "default" | "green" | "amber" | "red" | "blue" | "purple";
}) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="min-w-0">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            {friendlyLabel(key, copy.fieldLabels)}
          </p>
          <SmartJsonValue fieldKey={key} value={val} variant={variant} copy={copy} />
        </div>
      ))}
    </div>
  );
}

function formatDate(d: Date | string | null | undefined, locale = "zh-CN") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

function normalizeReturnHref(from: string | string[] | undefined) {
  const raw = Array.isArray(from) ? from[0] ?? "" : from ?? "";
  const normalized = new URLSearchParams(raw).toString();
  return normalized ? `/?${normalized}` : "/";
}

/* ---------- data fetching ---------- */

async function getRecordOrNotFound(slug: string) {
  try {
    return await getRecordBySlug(slug);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: Pick<RecordPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Record.metadata" });

  try {
    const record = await getRecordBySlug(slug);
    const localized = pickLocalizedRecord(record, locale);

    return {
      title: `${localized.title} · ${t("titleSuffix")}`,
      description: localized.summary ?? undefined,
    };
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      return {
        title: t("notFoundTitle"),
      };
    }

    throw error;
  }
}

/* ---------- page ---------- */

export default async function RecordPage({
  params,
  searchParams,
}: RecordPageProps) {
  const locale = await resolveLocale(params);
  const localeForDate = dateLocale(locale);
  const t = await getTranslations({ locale, namespace: "Record" });
  const languageLabel = (language: string) =>
    t.has(`language.${language}`) ? t(`language.${language}`) : language;
  const { slug } = await params;
  const { from } = await searchParams;
  const record = await getRecordOrNotFound(slug);
  const localized = pickLocalizedRecord(record, locale);
  const backHref = normalizeReturnHref(from);
  const copy: RecordCopy = {
    fieldLabels: t.raw("fieldLabels") as Record<string, string>,
    labels: {
      shell: t("labels.shell"),
      model: t("fieldLabels.model"),
      runner: t("fieldLabels.runner"),
      servedModelName: t("fieldLabels.servedModelName"),
      port: t("fieldLabels.port"),
      maxNumSeqs: t("fieldLabels.maxNumSeqs"),
      maxModelLen: t("fieldLabels.maxModelLen"),
      gpuMemoryUtilization: t("fieldLabels.gpuMemoryUtilization"),
      reasoningParser: t("fieldLabels.reasoningParser"),
      toolCallParser: t("fieldLabels.toolCallParser"),
      enableAutoToolChoice: t("fieldLabels.enableAutoToolChoice"),
      enablePrefixCaching: t("fieldLabels.enablePrefixCaching"),
      environmentVariables: t("sections.environmentVariables"),
      speculativeDecoding: t("sections.speculativeDecoding"),
      vllmCommand: t("sections.vllmCommand"),
    },
  };

  const metadata = asRecord(localized.metadata) ?? asRecord(record.metadata);
  const applicability = asRecord(record.applicability);
  const compatibility = asRecord(record.compatibility);
  const tradeoffs = asRecord(record.tradeoffs);
  const evidence = asRecord(record.evidence);
  const metrics = asRecord(record.metrics);
  const curation = asRecord(record.curation);
  const extensions = asRecord(record.extensions);

  const pros = tradeoffs ? asStringArray(tradeoffs.pros) : [];
  const cons = tradeoffs ? asStringArray(tradeoffs.cons) : [];
  const nextSteps = extensions ? asStringArray(extensions.nextSteps) : [];
  const alternateVersions = [
    ...(record.language !== localized.displayLanguage
      ? [
          {
            id: record.id,
            language: record.language,
            title: record.title,
            summary: record.summary,
            body: record.body,
            problem: record.problem,
            recommendation: record.recommendation,
          },
        ]
      : []),
    ...record.translations
      .filter((translation) => translation.language !== localized.displayLanguage)
      .map((translation) => ({
        id: translation.id,
        language: translation.language,
        title: translation.title,
        summary: translation.summary,
        body: translation.body,
        problem: translation.problem,
        recommendation: translation.recommendation,
      })),
  ];

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* ── navigation & status bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-muted transition hover:border-line-strong hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12 6 8l4-4" /></svg>
            {t("actions.backToSearch")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
            <Badge variant={statusVariant(record.maturity)}>{record.maturity}</Badge>
            <Badge variant={statusVariant(record.freshness)}>{record.freshness}</Badge>
          </div>
        </div>

        {/* ── hero header ── */}
        <header className="rounded-[2rem] border border-line bg-surface px-6 py-8 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-line bg-background/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {record.type}
            </span>
            <span className="rounded-full border border-line bg-background/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {pickLocalizedName(record.category, locale)}
            </span>
            {record.externalKey ? (
              <span className="rounded-full border border-accent/20 bg-accent-soft px-3 py-1 font-mono text-[11px] text-accent">
                {record.externalKey}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            {localized.title}
          </h1>

          {localized.summary ? (
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              {localized.summary}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {record.tags.map((item) => (
              <Badge key={item.tagId}>{pickLocalizedName(item.tag, locale)}</Badge>
            ))}
          </div>

          {localized.isFallback ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
              {t("notices.missingTranslation", {
                requested: languageLabel(localized.requestedLocale),
                fallback: languageLabel(localized.displayLanguage),
              })}
            </div>
          ) : null}
        </header>

        {/* ── balanced card flow ── */}
        <div className="gap-6 xl:columns-2">
          {/* ── main content column ── */}
          <div className="contents">
            {localized.body ? (
              <Section title={t("sections.body")} id="body" className="mb-6">
                <p className="whitespace-pre-wrap">{localized.body}</p>
              </Section>
            ) : null}

            {localized.problem ? (
              <Section title={t("sections.problem")} id="problem" className="mb-6">
                <p className="whitespace-pre-wrap">{localized.problem}</p>
              </Section>
            ) : null}

            {localized.recommendation ? (
              <Section title={t("sections.recommendation")} id="recommendation" className="mb-6">
                <p className="whitespace-pre-wrap">{localized.recommendation}</p>
              </Section>
            ) : null}

            {/* ── tradeoffs: pros & cons ── */}
            {(pros.length > 0 || cons.length > 0) ? (
              <Section title={t("sections.tradeoffs")} id="tradeoffs" className="mb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {pros.length > 0 ? (
                    <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4">
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8.5 6.5 12 13 4" /></svg>
                        {t("sections.pros")}
                      </p>
                      <ul className="space-y-2">
                        {pros.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm leading-6 text-emerald-900">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {cons.length > 0 ? (
                    <div className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4">
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-700">
                        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                        {t("sections.cons")}
                      </p>
                      <ul className="space-y-2">
                        {cons.map((c) => (
                          <li key={c} className="flex items-start gap-2 text-sm leading-6 text-red-900">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {/* ── evidence ── */}
            {evidence ? (
              <Section title={t("sections.evidence")} id="evidence" className="mb-6">
                <div className="space-y-3">
                  {asString(evidence.basis) ? (
                    <div className="rounded-xl border border-sky-200/60 bg-sky-50/40 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-700">{t("sections.basis")}</p>
                      <p className="text-sm leading-6 text-sky-900">{asString(evidence.basis)}</p>
                    </div>
                  ) : null}
                  {asString(evidence.confidenceReason) ? (
                    <div className="rounded-xl border border-line bg-background/60 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{t("sections.confidenceReason")}</p>
                      <p className="text-sm leading-6">{asString(evidence.confidenceReason)}</p>
                    </div>
                  ) : null}
                  {asString(evidence.caveat) ? (
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">{t("sections.caveat")}</p>
                      <p className="text-sm leading-6 text-amber-900">{asString(evidence.caveat)}</p>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {/* ── sources with type-specific styling ── */}
            {record.sources.length > 0 ? (
              <Section title={t("sections.sources", { count: record.sources.length })} id="sources" className="mb-6">
                <div className="space-y-3">
                  {record.sources.map((link) => {
                    const src = link.source;
                    const style = sourceStyle(src.sourceType);
                    return (
                      <div
                        key={`${link.sourceId}-${link.role}`}
                        className={`rounded-xl border p-4 ${style.color}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-line bg-white/70 px-2 py-0.5 font-mono text-[10px] text-muted">
                                {style.label}
                              </span>
                              <Badge variant="purple">{link.role}</Badge>
                              <Badge>{src.sourceType}</Badge>
                            </div>
                            <p className="mt-2 font-medium">
                              {src.uri ? (
                                <a
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent underline decoration-accent/30 underline-offset-2 transition hover:decoration-accent"
                                >
                                  {src.title ?? src.uri}
                                </a>
                              ) : (
                                <span>{src.title ?? src.sourceKey ?? t("labels.untitled")}</span>
                              )}
                            </p>
                            {src.publisher || src.author ? (
                              <p className="mt-1 text-xs text-muted">
                                {[src.author, src.publisher].filter(Boolean).join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {link.note ? (
                          <p className="mt-2 text-sm leading-6 text-muted">{link.note}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Section>
            ) : null}

            {/* ── outgoing relations (show title instead of slug) ── */}
            {record.outgoingRelations.length > 0 ? (
              <Section title={t("sections.relations", { count: record.outgoingRelations.length })} id="relations" className="mb-6">
                <div className="space-y-3">
                  {record.outgoingRelations.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/records/${rel.toRecord.slug}`}
                      className="group block rounded-xl border border-line bg-background/60 p-4 transition hover:border-accent/40 hover:bg-accent-soft/30"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="blue">{rel.relationType}</Badge>
                        {rel.strength != null ? (
                          <span className="font-mono text-xs text-muted">
                            {t("labels.strength", { value: (rel.strength * 100).toFixed(0) })}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-medium text-accent transition group-hover:underline">
                        {rel.toRecord.title}
                      </p>
                      {rel.description ? (
                        <p className="mt-1 text-sm text-muted">{rel.description}</p>
                      ) : null}
                      {rel.strength != null ? (
                        <div className="mt-2">
                          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#e8e0d4]">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-accent/60"
                              style={{ width: `${rel.strength * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* ── incoming relations (reverse links) ── */}
            {record.incomingRelations.length > 0 ? (
              <Section title={t("sections.incomingRelations", { count: record.incomingRelations.length })} id="incoming-relations" className="mb-6">
                <div className="space-y-3">
                  {record.incomingRelations.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/records/${rel.fromRecord.slug}`}
                      className="group block rounded-xl border border-violet-200/40 bg-violet-50/20 p-4 transition hover:border-violet-300 hover:bg-violet-50/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="purple">{rel.relationType}</Badge>
                        <span className="text-xs text-muted">{t("labels.citedBy")}</span>
                      </div>
                      <p className="mt-2 font-medium text-accent transition group-hover:underline">
                        {rel.fromRecord.title}
                      </p>
                      {rel.description ? (
                        <p className="mt-1 text-sm text-muted">{rel.description}</p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* ── translations ── */}
            {alternateVersions.length > 0 ? (
              <Section title={t("sections.translations", { count: alternateVersions.length })} id="translations" className="mb-6">
                <div className="space-y-4">
                  {alternateVersions.map((translation) => (
                    <div
                      key={translation.id}
                      className="rounded-xl border border-line bg-background/60 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Badge variant="blue">{translation.language.toUpperCase()}</Badge>
                        <span className="text-xs text-muted">{t("sections.translationVersion")}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{translation.title}</h3>
                      {translation.summary ? (
                        <p className="mt-2 text-sm leading-7 text-muted">{translation.summary}</p>
                      ) : null}
                      {translation.body ? (
                        <div className="mt-3 rounded-lg border border-line/50 bg-surface p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">{t("sections.body")}</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{translation.body}</p>
                        </div>
                      ) : null}
                      {translation.problem ? (
                        <div className="mt-3 rounded-lg border border-line/50 bg-surface p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">{t("sections.problem")}</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{translation.problem}</p>
                        </div>
                      ) : null}
                      {translation.recommendation ? (
                        <div className="mt-3 rounded-lg border border-line/50 bg-surface p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">{t("sections.recommendation")}</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{translation.recommendation}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* ── versions ── */}
            <Section title={t("sections.versions")} id="versions" className="mb-6">
              <div className="space-y-3">
                {record.versions.map((version) => (
                  <div
                    key={version.id}
                    className="rounded-[1.2rem] border border-line bg-background/70 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                        v{version.versionNo} · {version.changeType}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(version.createdAt, localeForDate)}
                      </span>
                    </div>
                    {version.note ? (
                      <p className="mt-2 text-sm text-foreground">
                        {version.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* ── sidebar ── */}
          <aside className="contents">
            {/* meta */}
            <Section title={t("sections.recordInfo")} id="meta" className="mb-6">
              <dl className="space-y-3">
                <KeyValueRow label={t("labels.category")}>{pickLocalizedName(record.category, locale)}</KeyValueRow>
                <KeyValueRow label={t("labels.type")}>{record.type}</KeyValueRow>
                <KeyValueRow label={t("labels.language")}>{languageLabel(record.language)}</KeyValueRow>
                <KeyValueRow label={t("labels.displayLanguage")}>{languageLabel(localized.displayLanguage)}</KeyValueRow>
                {localized.isFallback ? (
                  <KeyValueRow label={t("labels.translationStatus")}>{t("labels.translationMissing")}</KeyValueRow>
                ) : null}
                <KeyValueRow label={t("labels.visibility")}>
                  <Badge variant={record.visibility === "PUBLIC" ? "green" : "default"}>
                    {record.visibility}
                  </Badge>
                </KeyValueRow>
                <div>
                  <dt className="mb-1 text-muted">{t("labels.confidence")}</dt>
                  <dd><ConfidenceBar value={record.confidence ?? 0.5} /></dd>
                </div>
                <KeyValueRow label={t("labels.updatedAt")}>{formatDate(record.updatedAt, localeForDate)}</KeyValueRow>
                {record.publishedAt ? (
                  <KeyValueRow label={t("labels.publishedAt")}>{formatDate(record.publishedAt, localeForDate)}</KeyValueRow>
                ) : null}
                {record.lastVerifiedAt ? (
                  <KeyValueRow label={t("labels.lastVerifiedAt")}>{formatDate(record.lastVerifiedAt, localeForDate)}</KeyValueRow>
                ) : null}
                {record.reviewAfter ? (
                  <KeyValueRow label={t("labels.reviewAfter")}>{formatDate(record.reviewAfter, localeForDate)}</KeyValueRow>
                ) : null}
              </dl>
            </Section>

            {/* curation */}
            {curation ? (
              <Section title={t("sections.curation")} id="curation" className="mb-6">
                <dl className="space-y-2">
                  {asString(curation.owner) ? (
                    <KeyValueRow label={t("labels.owner")}>{asString(curation.owner)}</KeyValueRow>
                  ) : null}
                  {asString(curation.reviewStatus) ? (
                    <KeyValueRow label={t("labels.reviewStatus")}>
                      <Badge variant={statusVariant(String(curation.reviewStatus).toUpperCase())}>
                        {asString(curation.reviewStatus)}
                      </Badge>
                    </KeyValueRow>
                  ) : null}
                  {asString(curation.sourceReviewedAt) ? (
                    <KeyValueRow label={t("labels.sourceReviewedAt")}>{asString(curation.sourceReviewedAt)}</KeyValueRow>
                  ) : null}
                </dl>
              </Section>
            ) : null}

            {/* applicability — now with friendly labels */}
            {applicability ? (
              <Section title={t("sections.applicability")} id="applicability" className="mb-6">
                <SmartJsonSection data={applicability} variant="blue" copy={copy} />
              </Section>
            ) : null}

            {/* compatibility — now with friendly labels */}
            {compatibility ? (
              <Section title={t("sections.compatibility")} id="compatibility" className="mb-6">
                <SmartJsonSection data={compatibility} variant="green" copy={copy} />
              </Section>
            ) : null}

            {/* metrics — now with friendly labels */}
            {metrics ? (
              <Section title={t("sections.metrics")} id="metrics" className="mb-6">
                <SmartJsonSection data={metrics} copy={copy} />
              </Section>
            ) : null}

            {/* next steps */}
            {nextSteps.length > 0 ? (
              <Section title={t("sections.nextSteps")} id="next-steps" className="mb-6">
                <ol className="space-y-2">
                  {nextSteps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm leading-6">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-bold text-accent">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}

            {/* aliases */}
            {record.aliases.length > 0 ? (
              <Section title={t("sections.aliases")} id="aliases" className="mb-6">
                <TagGroup items={record.aliases.map((a) => a.alias)} />
              </Section>
            ) : null}

            {/* keywords */}
            {record.keywords.length > 0 ? (
              <Section title={t("sections.keywords")} id="keywords" className="mb-6">
                <TagGroup items={record.keywords.map((k) => k.keyword)} />
              </Section>
            ) : null}

            {/* metadata — now with friendly labels */}
            {metadata ? (
              <Section title={t("sections.metadata")} id="metadata" className="mb-6">
                <SmartJsonSection data={metadata} copy={copy} />
              </Section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
