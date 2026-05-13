import Link from "next/link";
import { notFound } from "next/navigation";

import { AppError } from "@/lib/errors";
import { getRecordBySlug } from "@/lib/records";

type RecordPageProps = {
  params: Promise<{
    slug: string;
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
};

function friendlyLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/* ---------- source type helpers ---------- */

const SOURCE_STYLE: Record<string, { icon: string; color: string }> = {
  PAPER: { icon: "📄", color: "border-indigo-200 bg-indigo-50/50" },
  REPOSITORY: { icon: "📦", color: "border-cyan-200 bg-cyan-50/50" },
  URL: { icon: "🔗", color: "border-amber-200 bg-amber-50/50" },
  CHAT: { icon: "💬", color: "border-pink-200 bg-pink-50/50" },
  GITHUB_JSON: { icon: "📁", color: "border-emerald-200 bg-emerald-50/50" },
};

function sourceStyle(type: string) {
  return SOURCE_STYLE[type] ?? { icon: "📎", color: "border-line bg-background/60" };
}

/* ---------- shared UI primitives ---------- */

function Section({
  title,
  children,
  id,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  id?: string;
}>) {
  return (
    <section
      id={id}
      className="rounded-[1.5rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]"
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
      <dd className="text-right">{children}</dd>
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

/** Render a JSON object with friendly labels instead of raw keys */
function SmartJsonSection({ data, variant = "default" }: { data: Record<string, JsonValue>; variant?: "default" | "green" | "amber" | "red" | "blue" | "purple" }) {
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, val]) => (
        <div key={key}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            {friendlyLabel(key)}
          </p>
          {Array.isArray(val) ? (
            <TagGroup items={val.map(String)} variant={variant} />
          ) : val && typeof val === "object" ? (
            <div className="rounded-lg border border-line/50 bg-background/40 p-3">
              <SmartJsonSection data={val as Record<string, JsonValue>} variant={variant} />
            </div>
          ) : (
            <p className="text-sm">{String(val)}</p>
          )}
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

export default async function RecordPage({ params }: RecordPageProps) {
  const { slug } = await params;
  const record = await getRecordOrNotFound(slug);

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
            href={record.title ? `/?q=${encodeURIComponent(record.title)}` : "/"}
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

        {/* ── two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          {/* ── main content column ── */}
          <div className="space-y-6">
            {record.body ? (
              <Section title="正文" id="body">
                <p className="whitespace-pre-wrap">{record.body}</p>
              </Section>
            ) : null}

            {record.problem ? (
              <Section title="问题" id="problem">
                <p className="whitespace-pre-wrap">{record.problem}</p>
              </Section>
            ) : null}

            {record.recommendation ? (
              <Section title="建议" id="recommendation">
                <p className="whitespace-pre-wrap">{record.recommendation}</p>
              </Section>
            ) : null}

            {/* ── tradeoffs: pros & cons ── */}
            {(pros.length > 0 || cons.length > 0) ? (
              <Section title="利弊权衡" id="tradeoffs">
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
              <Section title="证据与依据" id="evidence">
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
              <Section title={`参考来源 (${record.sources.length})`} id="sources">
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
                              <span className="text-base" aria-hidden="true">{style.icon}</span>
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
              <Section title={`关联记录 (${record.outgoingRelations.length})`} id="relations">
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
              <Section title={`被引用记录 (${record.incomingRelations.length})`} id="incoming-relations">
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
              <Section title={`翻译 (${record.translations.length})`} id="translations">
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
            <Section title="版本历史" id="versions">
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
          <aside className="space-y-6">
            {/* meta */}
            <Section title="记录信息" id="meta">
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
              <Section title="内容管理" id="curation">
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
              <Section title="适用范围" id="applicability">
                <SmartJsonSection data={applicability} variant="blue" />
              </Section>
            ) : null}

            {/* compatibility — now with friendly labels */}
            {compatibility ? (
              <Section title="兼容性信息" id="compatibility">
                <SmartJsonSection data={compatibility} variant="green" />
              </Section>
            ) : null}

            {/* metrics — now with friendly labels */}
            {metrics ? (
              <Section title="指标" id="metrics">
                <SmartJsonSection data={metrics} />
              </Section>
            ) : null}

            {/* next steps */}
            {nextSteps.length > 0 ? (
              <Section title="后续步骤" id="next-steps">
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
              <Section title="别名" id="aliases">
                <TagGroup items={record.aliases.map((a) => a.alias)} />
              </Section>
            ) : null}

            {/* keywords */}
            {record.keywords.length > 0 ? (
              <Section title="关键词" id="keywords">
                <TagGroup items={record.keywords.map((k) => k.keyword)} />
              </Section>
            ) : null}

            {/* metadata — now with friendly labels */}
            {metadata ? (
              <Section title="元数据" id="metadata">
                <SmartJsonSection data={metadata} />
              </Section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
