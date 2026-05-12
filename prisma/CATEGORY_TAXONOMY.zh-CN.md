# 初始知识分类体系

这份分类来自项目原有的 15 个工程方向。它们应该作为 `Category` 表的第一批 seed 数据，而不是写死成 enum。

实际 seed 源文件见：`prisma/seed-data/categories.json`。

## 为什么不用 enum 存分类

分类本身也是元数据。后续很可能需要中文名、英文名、说明、排序、层级、图标、启停状态、旧别名和合并规则。enum 只能表达固定值，不能表达这些信息。

因此 schema 使用：

```txt
KnowledgeRecord.categoryCode -> Category.code
```

skill 生成知识对象时，只需要写稳定编号：

```json
{
  "categoryCode": "05",
  "type": "TOOL",
  "title": "工具参数校验最佳实践"
}
```

## 15 个一级分类

| code | slug | name | nameZh | sortOrder | description |
|---|---|---|---|---:|---|
| `01` | `models` | `Models` | `模型` | 1 | 模型能力、长上下文、结构化输出、工具调用、成本和延迟。 |
| `02` | `instruction` | `Instruction` | `指令` | 2 | 任务拆解、提示词、Schema、输出约束与版本管理。 |
| `03` | `runtime` | `Runtime` | `运行时` | 3 | Agent loop、状态、会话、重试、流式和恢复机制。 |
| `04` | `skills` | `Skills` | `技能` | 4 | 能力包、触发、组合、检索和技能评测。 |
| `05` | `tools` | `Tools` | `工具` | 5 | 工具 schema、参数校验、权限、错误和结果设计。 |
| `06` | `mcp` | `MCP` | `MCP` | 6 | Tools、Resources、Prompts 与协议化能力暴露。 |
| `07` | `rag` | `RAG` | `RAG` | 7 | 解析、切分、Embedding、检索、引用和 freshness。 |
| `08` | `memory` | `Memory` | `记忆` | 8 | 用户记忆、项目记忆、上下文压缩和污染控制。 |
| `09` | `workflow` | `Workflow` | `工作流` | 9 | 图工作流、Router、Supervisor、Handoff 和并行执行。 |
| `10` | `agent-ui` | `Agent UI` | `Agent UI` | 10 | 运行时间线、工具调用展示、人工审批和反馈界面。 |
| `11` | `evaluation` | `Evaluation` | `评测` | 11 | 任务成功率、工具正确率、RAG Eval 和回归测试。 |
| `12` | `trace` | `Trace` | `追踪` | 12 | Run log、Replay、Latency、Token Cost 和 Failure Analysis。 |
| `13` | `security` | `Security` | `安全` | 13 | Prompt injection、权限、敏感数据和红队测试。 |
| `14` | `sandbox` | `Sandbox` | `沙箱` | 14 | 浏览器、Shell、代码执行、文件边界和 Playwright Agent。 |
| `15` | `adapters` | `Adapters` | `适配器` | 15 | LiteLLM、OpenRouter、Vercel AI SDK 与 Runtime 兼容性。 |

## 设计建议

| 主题 | 建议 |
|---|---|
| 一级分类 | 保持这 15 个，作为稳定导航和数据库筛选维度。 |
| 二级分类 | 不要急着加入 schema，先用 `Tag` 承载。等标签稳定后，再提升为二级 `Category`。 |
| slug | 使用英文短横线形式，适合 URL 和导入。 |
| code | 使用 `01` 到 `15`，比英文 slug 更适合长期稳定引用。 |
| nameZh | 用于中文 UI，不影响导入 key。 |
| deprecated 分类 | 设置 `isActive=false`，不要删除。 |

## 和 type 的区别

`Category` 表示知识属于哪个工程方向。

`type` 表示这条知识是什么形态。它不是数据库 enum，而是由 `VocabularyTerm(namespace=record_type)` 管理的受控字典码。

例子：

| 记录 | categoryCode | type |
|---|---|---|
| OpenRouter 免费模型限制 | `15` | `NOTE` |
| 工具参数校验规则 | `05` | `PRACTICE` |
| RAG chunking 策略 | `07` | `PATTERN` |
| Vercel AI SDK 对比 LiteLLM | `15` | `COMPARISON` |
| Agent 运行时状态机设计 | `03` | `DECISION` |
