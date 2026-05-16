# GitHub 资源卡片设计

## 目标

这层不是为了保存整个 GitHub 仓库副本，而是为了低成本收集大量开源项目，并把它们变成你自己的可检索知识卡片。

它解决三个问题：

1. `KnowledgeRecord` 太重，不适合一开始就给每个仓库写完整 `body/problem/recommendation`。
2. 单纯保存链接太轻，后面很难回忆“为什么当时收藏它”。
3. 你需要把“上游仓库元数据”和“自己的判断”分开管理。

## 两层资产

### 1. 轻量资源卡片层

路径：

```text
content/resources/github/cards/{owner}__{repo}.json
```

用途：

- 快速收录大量 GitHub 仓库
- 保存 tags、摘要、个人判断、复习节奏
- 作为策展真源，不承载高频变化的上游元数据

### 2. 正式知识记录层

路径：

```text
content/knowledge/{categoryCode}-{categorySlug}/records-0001.json
```

用途：

- 沉淀你已经形成结论的最佳实践
- 进入当前应用的主搜索与展示模型
- 保存完整的 `problem` / `recommendation` / `tradeoffs` / `evidence`

### 设计原则

- `github cards` 和 `records` 是并列资产，不是上下游关系。
- 每个 GitHub 仓库只保留一个轻量卡片。
- 卡片里的 `categoryCode` 和 `recordType` 直接复用主知识库的分类和类型，保证你按现有 15 个方向就能回看参考仓库。
- 上游信息与个人判断分层：仓库 JSON 只放 `summary` / `whyItMatters` / `notes` 等策展字段；动态 `upstream` 快照放数据库。
- 卡片和记录可以关联，但关联是可选的，不是必须的。

## 目录建议

```text
content/
  resources/
    github/
      README.md
      schema.v1.json
      cards/
        {owner}__{repo}.json
      examples/
        repo-card.v1.example.json
```

## 单卡片字段

建议保持“小而完整”，至少回答下面几件事：

- 这是什么仓库：`repo`
- 它属于哪个 AI Agent 方向：`classification.categoryCode`
- 它是什么形态：`classification.recordType`
- 为什么值得看：`summary`
- 为什么和你的知识库有关：`whyItMatters`
- 你给它打了什么标签：`classification.tags`
- 你什么时候加入、什么时候复习：`review`
- 页面里最近一次观测到的上游更新时间：数据库快照中的 `pushedAt`

## 推荐字段分工

- `repo`
  - 仓库身份字段，必须稳定。
- `classification`
  - 你自己的归类，保证以后能按 15 个一级分类反查参考仓库。
- `summary`
  - 一句话描述“它是什么”。
- `whyItMatters`
  - 一句话描述“为什么你关心它”。
- `notes`
  - 更主观、更短的判断，比如“偏产品参考，不是底层 runtime 参考”。
- `review`
  - 你的维护节奏，不是 GitHub 的更新时间。
- `connections`
  - 可选记录“这个仓库和哪些正式 record 有关联”，但不要求每张卡片都关联 record。

## 动态字段落点

- 仓库文件层
  - `repo`
  - `classification`
  - `summary`
  - `whyItMatters`
  - `notes`
  - `status`
  - `review`
  - `links`
  - `connections`
- 数据库快照层
  - `description`
  - `homepage`
  - `stars`
  - `primaryLanguage`
  - `dominantLanguages`
  - `license`
  - `topics`
  - `archived`
  - `defaultBranch`
  - `pushedAt`
  - `lastFetchedAt`
  - `readmeTitle`
  - `readmeIntro`
  - `readmeHeadings`
  - `rootEntries`
  - `rootManifests`

## 文件命名约定

- 每个仓库一个文件。
- 文件名使用：`{owner}__{repo}.json`
- `owner` 和 `repo` 统一转小写，避免同仓库多份大小写变体。
- `cardKey` 必须和文件名一致，便于脚本校验和去重。

示例：

```text
content/resources/github/cards/langchain-ai__langgraph.json
content/resources/github/cards/langgenius__dify.json
```

## 推荐工作流

### 收录

1. 复制 `content/resources/github/examples/repo-card.v1.example.json`
2. 重命名为 `cards/{owner}__{repo}.json`
3. 填 `summary`、`whyItMatters`、`tags`
4. 运行 `pnpm resources:github:validate`
5. 运行 `pnpm resources:github:sync-upstreams -- --card-key {owner}__{repo}`

如果你要跑生产环境的自动刷新，请在 `.env` 或 `.env.local` 里设置
`GITHUB_TOKEN`。当前同步链路已经支持条件请求、缓存复用和 scheduled
增量刷新，但单个仓库首次同步或内容变更时，仍可能发起约 4 个 GitHub API
请求，所以匿名额度只适合很小的卡片库。

### 维护

- `lastReviewedAt`
  - 表示你最后一次重看并修正自己判断的时间
- `reviewAfter`
  - 表示你希望下次再看它的时间

数据库快照里的：

- `lastFetchedAt`
  - 表示你最后一次同步 GitHub 元数据的时间

生产环境建议用分批分时的增量定时任务刷新数据库快照，而不是在人工录卡时顺手批量刷新全库。
本仓库当前的运维文件放在：

```text
ops/systemd/ai-agent-best-practices-github-sync.service
ops/systemd/ai-agent-best-practices-github-sync.timer
ops/systemd/ai-agent-best-practices-github-sync-alert@.service
```

失败时会额外生成本地告警文件：

```text
runtime/alerts/github-sync/latest-failure.json
runtime/alerts/github-sync/latest-failure.txt
runtime/alerts/github-sync/history/
```

如果环境变量里提供 `GITHUB_SYNC_ALERT_WEBHOOK_URL`，同一份结构化 payload
也会被 POST 到该 webhook。

当前定时任务默认会按“每次小批量、一天多次、到期优先”的方式执行
`--scheduled` 同步，并通过 ETag 条件请求尽量复用已有快照。生产部署建议
同时提供 `GITHUB_TOKEN`，否则卡片库一旦增长，匿名额度仍会成为瓶颈。

这里有一条明确边界，适合公开项目直接写清楚：

- 仓库内只提供通用 webhook 告警出口，不内置个人 Telegram、微信、Slack 等私有发送逻辑。
- 任何 destination-specific sender 都应该放在仓库外，例如你自己的 webhook consumer、bridge service 或私有自动化。
- 公开仓库负责产出标准化失败事件；个人通知链路由部署者自己接。

## 为什么不直接全部写成 KnowledgeRecord

因为正式记录的字段要求是“完整知识单元”，很适合沉淀结论，但不适合大规模收集候选项目。把所有 GitHub 仓库都写成正式记录，维护成本会很快失控。

这套两层结构更适合你的使用方式：

- 广撒网时只写小卡片
- `github cards` 承担“收藏、分类和回看”
- `records` 承担“结论与检索”
- 两者按需建立关联，不要求互相覆盖

## 关于 record 引用统计

以后如果你想看“哪些 GitHub 仓库在现有最佳实践里被提到得最多”，建议把它做成派生分析视图，不要写回卡片 JSON。

原因很简单：

- 它会随着 `records` 内容变化而变化
- 它本质上是统计结果，不是卡片的原始事实
- 派生计算更适合排序、聚合和横向比较

建议未来单独计算这些指标：

- `mentionedByRecordCount`
- `mentionedByCategoryCounts`
- `lastMentionedAt`

## 当前落地范围

这次新增的是“双层存储”约定：仓库文件保留策展字段，数据库承接动态快照；不改现有 `content/knowledge` 导入逻辑，也不把资源卡片并入主搜索。

下一步如果你要继续做，可以追加两件事：

1. 写一个定时同步任务，从 GitHub API 自动刷新数据库快照
2. 做一个从 `records` 派生 GitHub 引用统计和排序视图的脚本
