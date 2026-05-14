import Link from "next/link";
import { notFound } from "next/navigation";

import { AppError } from "@/lib/errors";
import { getRecordBySlug } from "@/lib/records";

type RecordPageProps = {
  params: Promise<{
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

/* ---------- field label dictionary ---------- */

const FIELD_LABELS: Record<string, string> = {
  audience: "目标受众",
  projectStage: "项目阶段",
  scenario: "使用场景",
  confirmedMoEExamples: "已确认 MoE 模型",
  unknownArchitectureExamples: "未公开架构模型",
  policyField: "策略字段",
  modelFamilies: "模型家族",
  hardwareSignals: "硬件指标",
  evalSignals: "评测指标",
  database: "数据库",
  vectorStore: "向量存储",
  search: "搜索方式",
  benchmark: "基准测试",
  modelFamily: "模型家族",
  tools: "工具数量",
  scenarios: "场景数量",
  inferenceSetting: "推理设置",
  evidenceLevels: "证据等级",
  expectedHallucinationReduction: "预期幻觉降低",
  reviewCadence: "复核节奏",
  selectionFields: "选型字段",
  expectedDecisionQualityLift: "预期决策质量提升",
  benchmarkCoverage: "基准覆盖度",
  expectedSelectionRiskReduction: "预期选型风险降低",
  observedFailureModes: "观测到的失败模式",
  expectedSearchQualityLift: "预期搜索质量提升",
  implementationComplexity: "实现复杂度",
  contentSource: "内容来源",
  draftedFrom: "起草自",
  disclosurePolicy: "披露策略",
  architectureFocus: "架构焦点",
  relatedBenchmark: "相关基准测试",
  difficulty: "难度",
  useCase: "用例",
  sourcePost: "来源帖子",
  translationSource: "翻译来源",
  owner: "负责人",
  reviewStatus: "审核状态",
  sourceReviewedAt: "来源审核时间",
  nextSteps: "后续步骤",
  runtimeConfigSource: "运行配置来源",
  vllmServeExample: "vLLM Serve 示例",
  commandLines: "命令行",
  command: "命令",
  env: "环境变量",
  runner: "运行方式",
  servedModelName: "服务模型名",
  port: "端口",
  speculativeConfig: "推测解码配置",
  method: "方法",
  numSpeculativeTokens: "推测 token 数",
  maxNumSeqs: "最大并发序列",
  maxModelLen: "最大上下文",
  enablePrefixCaching: "启用前缀缓存",
  gpuMemoryUtilization: "GPU 显存利用率",
  reasoningParser: "推理解析器",
  enableAutoToolChoice: "启用自动工具选择",
  toolCallParser: "工具调用解析器",
  modelDistribution: "模型分发",
  inferenceBackends: "推理后端",
  parsers: "解析器",
  authorVllmServeConfig: "作者 vLLM 配置",
  interpretation: "解释",
};

function friendlyLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
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
}: Readonly<{
  label: string;
  command: string;
}>) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101820] text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300">
          {label}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">
          shell
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

function RuntimeConfigCard({ data }: { data: Record<string, JsonValue> }) {
  const env = isJsonObject(data.env) ? data.env : null;
  const speculativeConfig = isJsonObject(data.speculativeConfig)
    ? data.speculativeConfig
    : null;
  const command = commandTextForValue("commandLines", data.commandLines);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <ConfigTile label="模型" value={data.model} />
        <ConfigTile label="运行方式" value={data.runner} />
        <ConfigTile label="服务模型名" value={data.servedModelName} />
        <ConfigTile label="端口" value={data.port} />
        <ConfigTile label="最大并发序列" value={data.maxNumSeqs} />
        <ConfigTile label="最大上下文" value={data.maxModelLen} />
        <ConfigTile label="GPU 显存利用率" value={data.gpuMemoryUtilization} />
        <ConfigTile label="推理解析器" value={data.reasoningParser} />
        <ConfigTile label="工具调用解析器" value={data.toolCallParser} />
        <ConfigTile label="自动工具选择" value={data.enableAutoToolChoice} />
        <ConfigTile label="前缀缓存" value={data.enablePrefixCaching} />
      </div>

      {env ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            环境变量
          </p>
          <SmartJsonSection data={env} />
        </div>
      ) : null}

      {speculativeConfig ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            推测解码
          </p>
          <SmartJsonSection data={speculativeConfig} />
        </div>
      ) : null}

      {command ? <CommandBlock label="vLLM Serve 命令" command={command} /> : null}
    </div>
  );
}

function SmartJsonValue({
  fieldKey,
  value,
  variant,
}: Readonly<{
  fieldKey: string;
  value: JsonValue;
  variant: "default" | "green" | "amber" | "red" | "blue" | "purple";
}>) {
  const command = commandTextForValue(fieldKey, value);

  if (command) {
    return <CommandBlock label={friendlyLabel(fieldKey)} command={command} />;
  }

  if (fieldKey === "vllmServeExample" && isJsonObject(value)) {
    return <RuntimeConfigCard data={value} />;
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
              <SmartJsonSection data={item} variant={variant} />
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
        <SmartJsonSection data={value} variant={variant} />
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
function SmartJsonSection({ data, variant = "default" }: { data: Record<string, JsonValue>; variant?: "default" | "green" | "amber" | "red" | "blue" | "purple" }) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="min-w-0">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            {friendlyLabel(key)}
          </p>
          <SmartJsonValue fieldKey={key} value={val} variant={variant} />
        </div>
      ))}
    </div>
  );
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
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

/* ---------- page ---------- */

export default async function RecordPage({
  params,
  searchParams,
}: RecordPageProps) {
  const { slug } = await params;
  const { from } = await searchParams;
  const record = await getRecordOrNotFound(slug);
  const backHref = normalizeReturnHref(from);

  const metadata = asRecord(record.metadata);
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
            返回搜索
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
              {record.category.name}
            </span>
            {record.externalKey ? (
              <span className="rounded-full border border-accent/20 bg-accent-soft px-3 py-1 font-mono text-[11px] text-accent">
                {record.externalKey}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            {record.title}
          </h1>

          {record.summary ? (
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              {record.summary}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {record.tags.map((item) => (
              <Badge key={item.tagId}>{item.tag.name}</Badge>
            ))}
          </div>
        </header>

        {/* ── balanced card flow ── */}
        <div className="gap-6 xl:columns-2">
          {/* ── main content column ── */}
          <div className="contents">
            {record.body ? (
              <Section title="正文" id="body" className="mb-6">
                <p className="whitespace-pre-wrap">{record.body}</p>
              </Section>
            ) : null}

            {record.problem ? (
              <Section title="问题" id="problem" className="mb-6">
                <p className="whitespace-pre-wrap">{record.problem}</p>
              </Section>
            ) : null}

            {record.recommendation ? (
              <Section title="建议" id="recommendation" className="mb-6">
                <p className="whitespace-pre-wrap">{record.recommendation}</p>
              </Section>
            ) : null}

            {/* ── tradeoffs: pros & cons ── */}
            {(pros.length > 0 || cons.length > 0) ? (
              <Section title="利弊权衡" id="tradeoffs" className="mb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {pros.length > 0 ? (
                    <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4">
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8.5 6.5 12 13 4" /></svg>
                        优势
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
                        劣势
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
              <Section title="证据与依据" id="evidence" className="mb-6">
                <div className="space-y-3">
                  {asString(evidence.basis) ? (
                    <div className="rounded-xl border border-sky-200/60 bg-sky-50/40 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-700">基础依据</p>
                      <p className="text-sm leading-6 text-sky-900">{asString(evidence.basis)}</p>
                    </div>
                  ) : null}
                  {asString(evidence.confidenceReason) ? (
                    <div className="rounded-xl border border-line bg-background/60 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">置信度原因</p>
                      <p className="text-sm leading-6">{asString(evidence.confidenceReason)}</p>
                    </div>
                  ) : null}
                  {asString(evidence.caveat) ? (
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">注意事项</p>
                      <p className="text-sm leading-6 text-amber-900">{asString(evidence.caveat)}</p>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {/* ── sources with type-specific styling ── */}
            {record.sources.length > 0 ? (
              <Section title={`参考来源 (${record.sources.length})`} id="sources" className="mb-6">
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
                                <span>{src.title ?? src.sourceKey ?? "Untitled"}</span>
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
              <Section title={`关联记录 (${record.outgoingRelations.length})`} id="relations" className="mb-6">
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
                            强度 {(rel.strength * 100).toFixed(0)}%
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
              <Section title={`被引用记录 (${record.incomingRelations.length})`} id="incoming-relations" className="mb-6">
                <div className="space-y-3">
                  {record.incomingRelations.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/records/${rel.fromRecord.slug}`}
                      className="group block rounded-xl border border-violet-200/40 bg-violet-50/20 p-4 transition hover:border-violet-300 hover:bg-violet-50/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="purple">{rel.relationType}</Badge>
                        <span className="text-xs text-muted">← 引用自</span>
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
            {record.translations.length > 0 ? (
              <Section title={`翻译 (${record.translations.length})`} id="translations" className="mb-6">
                <div className="space-y-4">
                  {record.translations.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-line bg-background/60 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Badge variant="blue">{t.language.toUpperCase()}</Badge>
                        <span className="text-xs text-muted">翻译版本</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
                      {t.summary ? (
                        <p className="mt-2 text-sm leading-7 text-muted">{t.summary}</p>
                      ) : null}
                      {t.body ? (
                        <div className="mt-3 rounded-lg border border-line/50 bg-surface p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">正文</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{t.body}</p>
                        </div>
                      ) : null}
                      {t.problem ? (
                        <div className="mt-3 rounded-lg border border-line/50 bg-surface p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">问题</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{t.problem}</p>
                        </div>
                      ) : null}
                      {t.recommendation ? (
                        <div className="mt-3 rounded-lg border border-line/50 bg-surface p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">建议</p>
                          <p className="whitespace-pre-wrap text-sm leading-7">{t.recommendation}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* ── versions ── */}
            <Section title="版本历史" id="versions" className="mb-6">
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
                        {formatDate(version.createdAt)}
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
            <Section title="记录信息" id="meta" className="mb-6">
              <dl className="space-y-3">
                <KeyValueRow label="分类">{record.category.name}</KeyValueRow>
                <KeyValueRow label="类型">{record.type}</KeyValueRow>
                <KeyValueRow label="语言">{record.language}</KeyValueRow>
                <KeyValueRow label="可见性">
                  <Badge variant={record.visibility === "PUBLIC" ? "green" : "default"}>
                    {record.visibility}
                  </Badge>
                </KeyValueRow>
                <div>
                  <dt className="mb-1 text-muted">置信度</dt>
                  <dd><ConfidenceBar value={record.confidence ?? 0.5} /></dd>
                </div>
                <KeyValueRow label="更新时间">{formatDate(record.updatedAt)}</KeyValueRow>
                {record.publishedAt ? (
                  <KeyValueRow label="发布时间">{formatDate(record.publishedAt)}</KeyValueRow>
                ) : null}
                {record.lastVerifiedAt ? (
                  <KeyValueRow label="最后验证">{formatDate(record.lastVerifiedAt)}</KeyValueRow>
                ) : null}
                {record.reviewAfter ? (
                  <KeyValueRow label="复审日期">{formatDate(record.reviewAfter)}</KeyValueRow>
                ) : null}
              </dl>
            </Section>

            {/* curation */}
            {curation ? (
              <Section title="内容管理" id="curation" className="mb-6">
                <dl className="space-y-2">
                  {asString(curation.owner) ? (
                    <KeyValueRow label="负责人">{asString(curation.owner)}</KeyValueRow>
                  ) : null}
                  {asString(curation.reviewStatus) ? (
                    <KeyValueRow label="审核状态">
                      <Badge variant={statusVariant(String(curation.reviewStatus).toUpperCase())}>
                        {asString(curation.reviewStatus)}
                      </Badge>
                    </KeyValueRow>
                  ) : null}
                  {asString(curation.sourceReviewedAt) ? (
                    <KeyValueRow label="来源审核">{asString(curation.sourceReviewedAt)}</KeyValueRow>
                  ) : null}
                </dl>
              </Section>
            ) : null}

            {/* applicability — now with friendly labels */}
            {applicability ? (
              <Section title="适用范围" id="applicability" className="mb-6">
                <SmartJsonSection data={applicability} variant="blue" />
              </Section>
            ) : null}

            {/* compatibility — now with friendly labels */}
            {compatibility ? (
              <Section title="兼容性信息" id="compatibility" className="mb-6">
                <SmartJsonSection data={compatibility} variant="green" />
              </Section>
            ) : null}

            {/* metrics — now with friendly labels */}
            {metrics ? (
              <Section title="指标" id="metrics" className="mb-6">
                <SmartJsonSection data={metrics} />
              </Section>
            ) : null}

            {/* next steps */}
            {nextSteps.length > 0 ? (
              <Section title="后续步骤" id="next-steps" className="mb-6">
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
              <Section title="别名" id="aliases" className="mb-6">
                <TagGroup items={record.aliases.map((a) => a.alias)} />
              </Section>
            ) : null}

            {/* keywords */}
            {record.keywords.length > 0 ? (
              <Section title="关键词" id="keywords" className="mb-6">
                <TagGroup items={record.keywords.map((k) => k.keyword)} />
              </Section>
            ) : null}

            {/* metadata — now with friendly labels */}
            {metadata ? (
              <Section title="元数据" id="metadata" className="mb-6">
                <SmartJsonSection data={metadata} />
              </Section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
