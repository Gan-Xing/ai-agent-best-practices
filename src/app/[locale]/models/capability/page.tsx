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
    namespace: "ModelCapability.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type Status = "PASS" | "FAIL" | "PENDING" | "DEFERRED" | "SKIP" | "NA";

const models = [
  {
    key: "gpt",
    name: "GPT-5.5",
    route: "OpenRouter -> OpenAI",
  },
  {
    key: "claude",
    name: "Claude Opus 4.7",
    route: "OpenRouter -> Anthropic",
  },
  {
    key: "gemini",
    name: "Gemini 3.1 Pro Preview",
    route: "OpenRouter -> Google",
  },
  {
    key: "qwen",
    name: "Qwen 3.6 Plus",
    route: "Qwen native",
  },
  {
    key: "deepseek",
    name: "DeepSeek V4 Pro",
    route: "DeepSeek native",
  },
  {
    key: "kimi",
    name: "Kimi K2.6",
    route: "Kimi native",
  },
] as const;

type ModelKey = (typeof models)[number]["key"];

type CapabilityRow = {
  key: string;
  values: Record<ModelKey, Status>;
};

const p = "PASS";
const f = "FAIL";
const d = "DEFERRED";
const s = "SKIP";
const n = "NA";

const sharedRows: CapabilityRow[] = [
  {
    key: "textGeneration",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "jsonOutput",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "strictStructuredOutput",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "streaming",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "toolCalling",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "noToolDiscipline",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "toolArgumentAccuracy",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "largeToolsetRouting",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "toolFailureRecovery",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "approvalStop",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "dangerousToolRefusal",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "readWriteBoundary",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "destructiveRetryDiscipline",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "forcedToolChoice",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "parallelToolCalls",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "multiTurnToolLoop",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "longContext",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "errorShape",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
  {
    key: "hostedWebSearch",
    values: { gpt: p, claude: p, gemini: p, qwen: p, deepseek: p, kimi: p },
  },
];

const nativeRows: CapabilityRow[] = [
  {
    key: "previousResponseId",
    values: { gpt: d, claude: n, gemini: n, qwen: p, deepseek: n, kimi: n },
  },
  {
    key: "nativeWebSearch",
    values: { gpt: d, claude: d, gemini: d, qwen: p, deepseek: n, kimi: p },
  },
  {
    key: "nativeWebExtract",
    values: { gpt: n, claude: n, gemini: n, qwen: p, deepseek: n, kimi: n },
  },
  {
    key: "nativeCodeInterpreter",
    values: { gpt: d, claude: d, gemini: d, qwen: p, deepseek: n, kimi: p },
  },
  {
    key: "nativeMcp",
    values: { gpt: d, claude: d, gemini: n, qwen: f, deepseek: n, kimi: n },
  },
  {
    key: "nativeFileSearch",
    values: { gpt: d, claude: n, gemini: d, qwen: s, deepseek: n, kimi: n },
  },
  {
    key: "kimiFormulaDiscovery",
    values: { gpt: n, claude: n, gemini: n, qwen: n, deepseek: n, kimi: p },
  },
  {
    key: "kimiFormulaExecution",
    values: { gpt: n, claude: n, gemini: n, qwen: n, deepseek: n, kimi: p },
  },
  {
    key: "kimiMemory",
    values: { gpt: n, claude: n, gemini: n, qwen: n, deepseek: n, kimi: p },
  },
  {
    key: "kimiFileQa",
    values: { gpt: n, claude: n, gemini: n, qwen: n, deepseek: n, kimi: p },
  },
  {
    key: "deepseekReasoningContent",
    values: { gpt: n, claude: n, gemini: n, qwen: n, deepseek: p, kimi: n },
  },
  {
    key: "deepseekThinkingLoop",
    values: { gpt: n, claude: n, gemini: n, qwen: n, deepseek: p, kimi: n },
  },
];

const sources = [
  "runtime/practice/model/capability-smoke/gpt-5.5.v3.json",
  "runtime/practice/model/capability-smoke/claude-gemini.2026-05-21.json",
  "runtime/practice/model/capability-smoke/gemini-3.1-pro-preview.2026-05-21.r4.json",
  "runtime/practice/model/capability-smoke/qwen3.6-plus.2026-05-22.r3.json",
  "runtime/practice/model/capability-smoke/deepseek-v4-pro.2026-05-22.json",
  "runtime/practice/model/capability-smoke/deepseek-v4-pro.2026-05-22.r3.json",
  "runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.r2.json",
  "runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.r3.json",
  "runtime/practice/model/capability-smoke/kimi-k2.6.openrouter-fallback.2026-05-22.json",
  "runtime/practice/model/qwen-native-tools/run-2026-05-22.r2.json",
  "runtime/practice/model/qwen-native-tools/run-2026-05-22.r3.json",
  "runtime/practice/model/qwen-native-tools/run-2026-05-22.mcp-diagnostic.json",
  "runtime/practice/model/qwen-native-tools/run-2026-05-22.selfhosted-mcp.json",
  "runtime/practice/model/kimi-official-tools/run-2026-05-22.r2.json",
  "runtime/practice/model/kimi-official-tools/run-2026-05-22.r3.json",
  "runtime/practice/model/kimi-official-tools/run-2026-05-17.json",
  "runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.json",
];

const statusCopy: Record<Status, { className: string }> = {
  PASS: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FAIL: {
    className: "border-red-200 bg-red-50 text-red-700",
  },
  PENDING: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  DEFERRED: {
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  SKIP: {
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  NA: {
    className: "border-line bg-background text-muted",
  },
};

function getCellNote(
  row: CapabilityRow,
  model: ModelKey,
  cellNotes: Record<string, string>,
) {
  return cellNotes[`${row.key}:${model}`];
}

function countStatus(rows: CapabilityRow[], status: Status) {
  return rows.reduce((sum, row) => {
    return (
      sum +
      models.reduce((modelSum, model) => {
        return modelSum + (row.values[model.key] === status ? 1 : 0);
      }, 0)
    );
  }, 0);
}

function StatusBadge({
  status,
  label,
  note,
}: Readonly<{ status: Status; label: string; note?: string }>) {
  const copy = statusCopy[status];
  const badge = (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold ${copy.className}`}
    >
      {label}
      {note ? (
        <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold">
          i
        </span>
      ) : null}
    </span>
  );

  if (!note) {
    return badge;
  }

  return (
    <span
      className="group relative inline-flex cursor-help outline-none"
      tabIndex={0}
      aria-label={`${label}: ${note}`}
    >
      {badge}
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 -translate-y-1 rounded-2xl border border-line bg-slate-950 px-3.5 py-3 text-left text-xs leading-5 text-white opacity-0 shadow-[0_18px_50px_rgba(15,23,42,0.22)] transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100">
        {note}
      </span>
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-[1.35rem] border border-line bg-surface px-4 py-4 shadow-[var(--shadow)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{hint}</p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] sm:px-6 sm:py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CapabilityTable({
  rows,
  caption,
  capabilityLabel,
  statusLabels,
  rowCopy,
  cellNotes,
}: Readonly<{
  rows: CapabilityRow[];
  caption: string;
  capabilityLabel: string;
  statusLabels: Record<Status, string>;
  rowCopy: Record<string, { capability: string; detail: string }>;
  cellNotes: Record<string, string>;
}>) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-line bg-white">
      <div className="border-b border-line bg-background/70 px-4 py-3">
        <p className="text-sm leading-6 text-muted">{caption}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-64 border-b border-line bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {capabilityLabel}
              </th>
              {models.map((model) => (
                <th
                  key={model.key}
                  className="border-b border-line px-4 py-3 align-bottom"
                >
                  <div className="min-w-32">
                    <p className="text-sm font-semibold text-foreground">
                      {model.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {model.route}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="even:bg-background/45">
                <td className="sticky left-0 z-10 border-b border-line bg-inherit px-4 py-3 align-top">
                  <p className="font-medium text-foreground">
                    {rowCopy[row.key]?.capability ?? row.key}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {rowCopy[row.key]?.detail ?? row.key}
                  </p>
                </td>
                {models.map((model) => (
                  <td
                    key={`${row.key}-${model.key}`}
                    className="border-b border-line px-4 py-3 align-top"
                >
                    <StatusBadge
                      status={row.values[model.key]}
                      label={statusLabels[row.values[model.key]]}
                      note={getCellNote(row, model.key, cellNotes)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function ModelCapabilityPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "ModelCapability" });
  const rowCopy = t.raw("rows") as Record<string, { capability: string; detail: string }>;
  const notes = t.raw("notes") as Array<{ title: string; body: string }>;
  const pendingItems = t.raw("pendingItems") as string[];
  const cellNotes = t.raw("cellNotes") as Record<string, string>;
  const allRows = [...sharedRows, ...nativeRows];
  const passCount = countStatus(allRows, "PASS");
  const failCount = countStatus(allRows, "FAIL");
  const pendingCount = countStatus(allRows, "PENDING");
  const deferredCount = countStatus(allRows, "DEFERRED");
  const skippedCount = countStatus(allRows, "SKIP");
  const statusCounts: Record<Status, number> = {
    PASS: passCount,
    FAIL: failCount,
    PENDING: pendingCount,
    DEFERRED: deferredCount,
    SKIP: skippedCount,
    NA: countStatus(allRows, "NA"),
  };
  const scopeHint =
    pendingCount > 0
      ? t("metrics.scopeWithPending", {
          pending: pendingCount,
          deferred: deferredCount,
          skipped: skippedCount,
        })
      : t("metrics.scopeWithoutPending", {
          deferred: deferredCount,
          skipped: skippedCount,
        });
  const statusLabels = {
    PASS: t("status.PASS"),
    FAIL: t("status.FAIL"),
    PENDING: t("status.PENDING"),
    DEFERRED: t("status.DEFERRED"),
    SKIP: t("status.SKIP"),
    NA: t("status.NA"),
  } satisfies Record<Status, string>;
  const statusHints = {
    PASS: t("status.PASSHint"),
    FAIL: t("status.FAILHint"),
    PENDING: t("status.PENDINGHint"),
    DEFERRED: t("status.DEFERREDHint"),
    SKIP: t("status.SKIPHint"),
    NA: t("status.NAHint"),
  } satisfies Record<Status, string>;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2.2rem] border border-line bg-surface shadow-[var(--shadow)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <div className="px-5 py-8 sm:px-8 sm:py-10">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
                {t("hero.eyebrow")}
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                {t("hero.description")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  {t("hero.back")}
                </Link>
                <a
                  href="/artifacts/model/summary/model-capability-matrix-2026-05-22.html"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-line-strong hover:bg-background"
                >
                  {t("hero.archive")}
                </a>
              </div>
            </div>
            <div className="border-t border-line bg-background/60 p-5 lg:border-l lg:border-t-0 sm:p-6">
              <div className="grid gap-3">
                <MetricCard
                  label={t("metrics.snapshot")}
                  value="2026-05-22"
                  hint={t("metrics.snapshotHint")}
                />
                <MetricCard
                  label={t("metrics.models")}
                  value={String(models.length)}
                  hint={t("metrics.modelsHint")}
                />
                <MetricCard
                  label={t("metrics.passFail")}
                  value={`${passCount} / ${failCount}`}
                  hint={scopeHint}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {Object.entries(statusCopy)
            .filter(([status]) => statusCounts[status as Status] > 0)
            .map(([status]) => (
            <div
              key={status}
              className="rounded-[1.35rem] border border-line bg-surface px-4 py-4 shadow-[var(--shadow)]"
            >
              <StatusBadge status={status as Status} label={statusLabels[status as Status]} />
              <p className="mt-3 text-sm leading-6 text-muted">
                {statusHints[status as Status]}
              </p>
            </div>
          ))}
        </section>

        <Section eyebrow={t("sections.strategyEyebrow")} title={t("sections.strategyTitle")}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.35rem] border border-line bg-white px-4 py-4">
              <h3 className="text-base font-semibold text-foreground">
                {t("strategy.ownToolsTitle")}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("strategy.ownToolsBody")}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-line bg-white px-4 py-4">
              <h3 className="text-base font-semibold text-foreground">
                {t("strategy.hostedTitle")}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("strategy.hostedBody")}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-line bg-white px-4 py-4">
              <h3 className="text-base font-semibold text-foreground">
                {t("strategy.layeredTitle")}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("strategy.layeredBody")}
              </p>
            </div>
          </div>
        </Section>

        <Section eyebrow={t("sections.sharedEyebrow")} title={t("sections.sharedTitle")}>
          <CapabilityTable
            rows={sharedRows}
            caption={t("sections.sharedCaption")}
            capabilityLabel={t("sections.capability")}
            statusLabels={statusLabels}
            rowCopy={rowCopy}
            cellNotes={cellNotes}
          />
        </Section>

        <Section eyebrow={t("sections.nativeEyebrow")} title={t("sections.nativeTitle")}>
          <CapabilityTable
            rows={nativeRows}
            caption={t("sections.nativeCaption")}
            capabilityLabel={t("sections.capability")}
            statusLabels={statusLabels}
            rowCopy={rowCopy}
            cellNotes={cellNotes}
          />
        </Section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Section eyebrow={t("sections.notesEyebrow")} title={t("sections.notesTitle")}>
            <div className="grid gap-3">
              {notes.map((note) => (
                <article
                  key={note.title}
                  className="rounded-[1.25rem] border border-line bg-white px-4 py-4"
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    {note.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{note.body}</p>
                </article>
              ))}
            </div>
          </Section>

        <Section eyebrow={t("sections.scopeEyebrow")} title={t("sections.scopeTitle")}>
            <ol className="space-y-3">
              {pendingItems.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-[1.25rem] border border-line bg-white px-4 py-3 text-sm leading-7 text-muted"
                >
                  <span className="font-mono text-xs font-semibold text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Section>
        </section>

        <Section eyebrow={t("sections.sourcesEyebrow")} title={t("sections.sourcesTitle")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <code
                key={source}
                className="rounded-xl border border-line bg-background px-3 py-2 font-mono text-[11px] leading-5 text-muted"
              >
                {source}
              </code>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
