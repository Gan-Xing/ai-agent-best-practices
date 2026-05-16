import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap | AI Agent Best Practices",
  description:
    "Product roadmap for the AI Agent Best Practices knowledge base.",
};

type Priority = {
  rank: number;
  direction: string;
  categories: string;
  rationale: string;
  output: string;
};

type Phase = {
  step: string;
  status: "done" | "active" | "next" | "later";
  title: string;
  goal: string;
  deliverables: string[];
};

type CategoryPlan = {
  code: string;
  name: string;
  role: string;
  records: string[];
};

const priorities: Priority[] = [
  {
    rank: 1,
    direction: "Tools / MCP / Function Calling",
    categories: "05-tools, 06-mcp",
    rationale: "企业 Agent 的核心价值来自安全调用业务系统，而不只是聊天。",
    output: "工具 schema、权限边界、参数校验、错误处理、MCP Server 规范。",
  },
  {
    rank: 2,
    direction: "RAG / 企业知识库",
    categories: "07-rag, 08-memory",
    rationale: "文档问答、知识检索、行业知识沉淀是最常见的 ToB 落地入口。",
    output: "文档解析、切分、混合检索、引用、权限过滤、知识更新、RAG 评测。",
  },
  {
    rank: 3,
    direction: "Workflow / Runtime",
    categories: "03-runtime, 09-workflow",
    rationale: "Demo 变成系统以后，需要状态、重试、失败恢复和人工确认。",
    output: "任务拆解、Router、Supervisor、审批节点、多 Agent 边界、失败恢复。",
  },
  {
    rank: 4,
    direction: "Evaluation / Trace",
    categories: "11-evaluation, 12-trace",
    rationale: "企业采用 Agent 时，需要知道系统是否稳定、是否变好、哪里失败。",
    output: "成功率、工具调用正确率、RAG 命中率、Replay、成本、延迟、Bad Case 归因。",
  },
  {
    rank: 5,
    direction: "Security / Permission / Audit",
    categories: "13-security, 14-sandbox",
    rationale: "权限、脱敏、Prompt Injection、审计和沙箱边界决定能否进入生产。",
    output: "权限矩阵、PII 脱敏、注入防护、审计日志、沙箱策略。",
  },
  {
    rank: 6,
    direction: "Adapters / Model Routing",
    categories: "15-adapters, 01-models",
    rationale: "真实系统通常需要接入多个模型，并按任务、成本、延迟和失败率路由。",
    output: "OpenAI、Claude、Qwen、DeepSeek、本地模型的接入和路由策略。",
  },
  {
    rank: 7,
    direction: "Agent UI / Human-in-the-loop",
    categories: "10-agent-ui",
    rationale: "用户需要看懂 Agent 正在做什么，并能审批、打断、反馈和复盘。",
    output: "运行时间线、工具调用展示、人工确认、反馈入口、可解释结果页。",
  },
  {
    rank: 8,
    direction: "Models / 自部署模型",
    categories: "01-models",
    rationale: "模型能力重要，但在知识库早期更适合作为系统落地能力的支撑信息。",
    output: "模型选型、上下文、推理成本、部署规格、量化和服务配置。",
  },
];

const phases: Phase[] = [
  {
    step: "00",
    status: "done",
    title: "数据底座闭环",
    goal: "先让内容可以被结构化保存、校验、导入数据库，并能稳定上线。",
    deliverables: [
      "JSON source of truth",
      "Zod 内容校验",
      "Prisma upsert",
      "PostgreSQL 数据库",
      "内容合同检查",
      "Ubuntu CI",
    ],
  },
  {
    step: "01",
    status: "active",
    title: "知识库产品化",
    goal: "把项目做成一个正常可浏览、可检索、可解释的最佳实践知识库。",
    deliverables: [
      "首页搜索入口",
      "记录列表与详情",
      "Roadmap 页面",
      "导入任务可视化",
      "来源与元数据展示",
      "内容状态展示",
    ],
  },
  {
    step: "02",
    status: "next",
    title: "检索质量建设",
    goal: "让用户能更快找到曾经的思考、案例和技术判断，并能解释为什么命中。",
    deliverables: [
      "关键词权重",
      "标签过滤",
      "中文/英文匹配策略",
      "搜索结果解释",
      "Bad Case 记录",
      "检索评测集",
    ],
  },
  {
    step: "03",
    status: "next",
    title: "带引用的 AI 回答",
    goal: "让 AI 基于知识库记录回答，而不是脱离来源直接生成结论。",
    deliverables: [
      "TopK 上下文组装",
      "引用记录",
      "不确定性提示",
      "回答日志",
      "成本与延迟记录",
      "答案质量评测",
    ],
  },
  {
    step: "04",
    status: "later",
    title: "Agent 可调用接口",
    goal: "把知识库变成外部 Agent 可以稳定调用的实践检索能力。",
    deliverables: [
      "searchRecords tool",
      "getRecord tool",
      "relatedRecords",
      "MCP Server",
      "权限控制",
      "调用审计",
    ],
  },
];

const categoryPlans: CategoryPlan[] = [
  {
    code: "05",
    name: "Tools",
    role: "记录企业 Agent 如何安全调用业务系统。",
    records: ["工具 schema", "参数校验", "权限边界", "工具返回格式", "错误恢复"],
  },
  {
    code: "07",
    name: "RAG",
    role: "记录知识库从文档到可引用答案的完整链路。",
    records: ["文档解析", "切分策略", "混合检索", "引用", "RAG 评测"],
  },
  {
    code: "09",
    name: "Workflow",
    role: "记录多步任务、状态管理和人工确认的工程模式。",
    records: ["任务拆解", "Router", "Supervisor", "审批节点", "失败恢复"],
  },
  {
    code: "11",
    name: "Evaluation",
    role: "记录如何证明 Agent 系统真的变好。",
    records: ["成功率", "工具调用正确率", "检索命中率", "回归测试", "Bad Case 归因"],
  },
  {
    code: "12",
    name: "Trace",
    role: "记录 Agent 运行过程如何被复盘、回放和归因。",
    records: ["运行日志", "Replay", "Token 成本", "延迟", "失败原因"],
  },
  {
    code: "13",
    name: "Security",
    role: "记录进入企业生产环境必须具备的安全边界。",
    records: ["Prompt Injection", "工具权限", "PII 脱敏", "审计", "沙箱边界"],
  },
];

const recordTemplate = [
  "场景：这条实践解决什么 Agent 落地问题",
  "判断：为什么这个问题值得记录",
  "架构：工具、知识库、工作流、模型如何组合",
  "边界：权限、安全、失败和人工确认在哪里",
  "评测：用什么指标判断它是否有效",
  "来源：来自文档、视频、项目经验还是代码验证",
];

const examples = [
  "企业 Agent 工具调用必须先设计权限和错误边界",
  "RAG 不应只评估召回率，还要评估答案可执行性",
  "MCP Server 在企业内部系统集成中的最小可用规范",
  "Agent 工作流必须保留人工审批节点的场景",
  "为什么企业 Agent 需要 Replay，而不只是日志",
  "多模型路由应该按任务类型、成本和失败率决策",
];

const productSignals = [
  "一条实践可以在网页、JSON、数据库和 Agent 调用中保持同一份结构。",
  "搜索结果能解释命中原因，而不是只返回标题列表。",
  "AI 回答能引用知识库记录，并保留来源、置信度和更新时间。",
  "新增内容能通过脚本校验、导入数据库，并在 CI 中被验证。",
];

function statusLabel(status: Phase["status"]) {
  switch (status) {
    case "done":
      return "已完成";
    case "active":
      return "当前阶段";
    case "next":
      return "下一阶段";
    default:
      return "后续阶段";
  }
}

function statusClass(status: Phase["status"]) {
  switch (status) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "active":
      return "border-accent/25 bg-accent-soft text-accent";
    case "next":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-line bg-background text-muted";
  }
}

function Badge({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${className ?? "border-line bg-background text-muted"}`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: Readonly<{
  eyebrow: string;
  title: string;
  body: string;
}>) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{body}</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M3 8h9" />
      <path d="m9 4 4 4-4 4" />
    </svg>
  );
}

export default function RoadmapPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-strong px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-muted transition hover:border-line-strong hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M10 12 6 8l4-4" />
            </svg>
            Records
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Knowledge Base</Badge>
            <Badge>Product Roadmap</Badge>
            <Badge>Enterprise Priority Lens</Badge>
          </div>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="px-6 py-10 sm:px-8 lg:px-10 lg:py-12">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                AI Agent Best Practices Roadmap
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
                一个可检索、可验证、可复用的 AI Agent 最佳实践知识库
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                项目的核心目标是长期沉淀最佳实践。当前内容优先向企业 Agent
                落地倾斜，是因为企业场景对工具调用、知识库、工作流、评测和安全的需求更集中，也更容易体现这个知识库的实际价值。
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-background/70 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                    Product
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    最佳实践知识库
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-background/70 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                    Current focus
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    企业 Agent 落地
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-background/70 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                    Proof
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    搜索、引用、评测
                  </p>
                </div>
              </div>
            </div>

            <aside className="border-t border-line bg-[#101820] px-6 py-8 text-white sm:px-8 lg:border-l lg:border-t-0 lg:px-7 lg:py-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                Product Principles
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
                Roadmap 服务于知识库本身
              </h2>
              <div className="mt-6 space-y-4">
                {productSignals.map((signal) => (
                  <div key={signal} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="mt-1 text-teal-300">
                      <ArrowIcon />
                    </span>
                    <p>{signal}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionHeader
            eyebrow="Phase Roadmap"
            title="项目推进路线"
            body="路线图按产品能力推进：先保证内容可信，再提高检索体验，随后接入带引用的 AI 回答和 Agent 可调用接口。"
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {phases.map((phase) => (
              <article
                key={phase.step}
                className="rounded-xl border border-line bg-background/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {phase.step}
                  </span>
                  <Badge className={statusClass(phase.status)}>
                    {statusLabel(phase.status)}
                  </Badge>
                </div>
                <h3 className="mt-4 text-base font-semibold leading-6 text-foreground">
                  {phase.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted">{phase.goal}</p>
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {phase.deliverables.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
          <SectionHeader
            eyebrow="Content Priority"
            title="早期内容投入顺序"
            body="15 个分类都会保留。早期优先级只是资源分配方式：先建设市场需求更集中、也更能证明项目价值的方向。"
          />

          <div className="mt-6 overflow-hidden rounded-xl border border-line">
            <div className="hidden grid-cols-[4.5rem_1.1fr_0.8fr_1.25fr_1.35fr] border-b border-line bg-background/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted lg:grid">
              <div>Rank</div>
              <div>Direction</div>
              <div>Categories</div>
              <div>Why now</div>
              <div>Expected records</div>
            </div>
            <div className="divide-y divide-line">
              {priorities.map((item) => (
                <article
                  key={item.rank}
                  className="grid gap-3 bg-white/55 px-4 py-4 transition hover:bg-white lg:grid-cols-[4.5rem_1.1fr_0.8fr_1.25fr_1.35fr] lg:items-start"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-strong font-mono text-sm font-semibold text-foreground">
                      {item.rank}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted lg:hidden">
                      Priority
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {item.direction}
                  </h3>
                  <p className="font-mono text-xs leading-6 text-muted">{item.categories}</p>
                  <p className="text-sm leading-7 text-muted">{item.rationale}</p>
                  <p className="text-sm leading-7 text-foreground">{item.output}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionHeader
              eyebrow="First Build Area"
              title="第一批重点建设的 6 个分类"
              body="这些分类不是全部项目边界，而是当前最高性价比的内容建设切入点。"
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {categoryPlans.map((area) => (
                <article
                  key={area.code}
                  className="rounded-xl border border-line bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                        {area.code}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">
                        {area.name}
                      </h3>
                    </div>
                    <Badge className="border-accent/20 bg-accent-soft text-accent">
                      Focus
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{area.role}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {area.records.map((record) => (
                      <Badge key={record}>{record}</Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionHeader
              eyebrow="Record Shape"
              title="一条最佳实践应该回答什么"
              body="记录不是资讯摘要，而是一个可以被搜索、页面渲染、数据库查询和 Agent 调用的结构化对象。"
            />
            <ol className="mt-6 space-y-3">
              {recordTemplate.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-xl border border-line bg-background/70 p-3 text-sm leading-6 text-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-strong font-mono text-[11px] text-muted">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-[#101820] px-5 py-6 text-white shadow-[var(--shadow)] sm:px-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Content Examples
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
              更适合这个知识库的标题形态
            </h2>
            <div className="mt-5 space-y-3">
              {examples.map((title) => (
                <div
                  key={title}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <p className="text-sm font-medium leading-6 text-slate-100">
                    {title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface px-5 py-6 shadow-[var(--shadow)] sm:px-6">
            <SectionHeader
              eyebrow="Near-term Work"
              title="接下来最自然的产品动作"
              body="当前不是做成社区，也不是先扩展所有功能，而是把知识库的内容录入、检索、详情和验证链路继续打磨。"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Import UI", "把导入任务、成功/失败原因、审计日志做成可查看界面。"],
                ["Search UX", "让搜索结果展示命中原因、来源、分类、更新时间和可信度。"],
                ["Record Page", "把一个对象渲染成稳定详情页，支持引用、字段解释和相关记录。"],
                ["Quality Loop", "用搜索评测集和 Bad Case 记录持续改进检索质量。"],
              ].map(([title, body]) => (
                <article
                  key={title}
                  className="rounded-xl border border-line bg-background/70 p-4"
                >
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
