# Six-Model Capability Baseline

更新日期：`2026-05-22`

这份基线是当前 `practice/model/capability-smoke` 脚本、当前范围清单和 HTML 矩阵同步后的最新快照，不是厂商宣传表。

## Status Semantics

- `PASS`：已实测且通过。
- `FAIL`：已实测但失败，或缺少必须出现的真实工具调用痕迹。
- `待测`：前置条件已具备、当前确实计划推进，但还没有完成实测。
- `暂不测`：官方能力可能存在，但当前项目不接入所需官方 API、vector store、外部账号或专用平台资源。
- `SKIP`：可测，但本轮因环境、成本或策略原因跳过；不是能力失败。
- `/`：不适用；这不是该厂商官方 API 路径的能力，不属于待测缺口。

关键口径：

- 共享能力基线优先走 `/responses`。如果某模型有 `/responses`，测试脚本必须用 `/responses`；只有厂商官方没有 `/responses`，或某项原生能力只能在厂商专用接口验证时，才退到官方原生主接口。
- `GPT-5.5 / Claude Opus 4.7 / Gemini 3.1 Pro Preview` 当前共享基线走 `OpenRouter`；官方原厂 API 当前不接入，所以原厂专项统一标为 `暂不测`，不是厂商没有这项能力。
- shared `hosted web search` 现在只表示 OpenRouter web 插件能力，不代表厂商原生 web_search。厂商原生网页搜索统一放到 Provider-Native Notes / 平台原生专项里。
- `DeepSeek V4 Pro` 当前官方 API 没有可直接等价于 `web_search / web_extractor / code interpreter / MCP / file_search` 的原厂 hosted tool；但通过 OpenRouter 时，OpenRouter web 插件可以提供 hosted web search。

## Verified Sources

- `runtime/practice/model/capability-smoke/qwen3.6-plus.2026-05-22.r3.json`
- `runtime/practice/model/qwen-native-tools/run-2026-05-22.json`
- `runtime/practice/model/qwen-native-tools/run-2026-05-22.r2.json`
- `runtime/practice/model/qwen-native-tools/run-2026-05-22.r3.json`
- `runtime/practice/model/capability-smoke/deepseek-v4-pro.2026-05-22.json`
- `runtime/practice/model/capability-smoke/deepseek-v4-pro.2026-05-22.r3.json`
- `runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.json`
- `runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.r2.json`
- `runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.r3.json`
- `runtime/practice/model/capability-smoke/kimi-k2.6.openrouter-fallback.2026-05-22.json`
- `runtime/practice/model/kimi-official-tools/run-2026-05-22.r2.json`
- `runtime/practice/model/kimi-official-tools/run-2026-05-22.r3.json`
- `runtime/practice/model/capability-smoke/claude-gemini.2026-05-21.json`
- `runtime/practice/model/capability-smoke/gemini-3.1-pro-preview.2026-05-21.r4.json`
- `runtime/practice/model/capability-smoke/kimi-k2.6.native.fast.json`
- `practice/model/capability-smoke/current-scope-checklist-2026-05-21.md`
- `public/artifacts/model/summary/model-capability-matrix-2026-05-22.html`

## Current Implementation

| 模型 | 接口实现 | base URL | 当前说明 |
|---|---|---|---|
| `deepseek-v4-pro` | `chat/completions` | `https://api.deepseek.com` | 官方当前没有 `/responses`，所以用官方主路径加 DeepSeek-native 专项 |
| `qwen3.6-plus` | `responses` | `https://dashscope-us.aliyuncs.com/compatible-mode/v1` | 官方 OpenAI-compatible `/responses` |
| `gpt-5.5` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter `/responses` 访问 OpenAI |
| `claude-opus-4.7` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter `/responses` 访问 Anthropic |
| `gemini-3.1-pro-preview` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter `/responses` 访问 Google |
| `kimi-k2.6` | `chat/completions` | `https://api.moonshot.cn/v1` | 官方当前没有 `/responses`，所以用官方 chat 路径加 Kimi-native 专项 |

## Shared Capability Snapshot

这一层对应 HTML 里的“通用能力基线”。

| 模型 | text | generic json | strict outputs | tools | tool_choice stability | parallel tools | multi-turn tool loop | long context | hosted web search | 当前结论 |
|---|---|---|---|---|---|---|---|---|---|---|
| `gpt-5.5` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 当前最稳的通用基线 |
| `claude-opus-4.7` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | OpenRouter hosted web search 已有通过结果，原厂 native 专项还没补 |
| `gemini-3.1-pro-preview` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 早期红格已被后续复跑清掉，当前更像瞬时漂移 |
| `qwen3.6-plus` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | `2026-05-22.r3` 已补齐共享基线 |
| `deepseek-v4-pro` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | forced tool_choice 必须关闭 thinking 后测；hosted web search 走 OpenRouter web 插件口径 |
| `kimi-k2.6` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | FAIL | PASS | `2026-05-22.r3` 官方 native 已验证 JSON Mode 和 Structured Output；长上下文仍沿用 fallback 结果 |

## Advanced Tool-Discipline Probes

这一层是共享 smoke 里更细的 agent 纪律测试，目前主要覆盖 `Qwen / DeepSeek / Kimi`。

| 能力 | Qwen 3.6 Plus | DeepSeek V4 Pro | Kimi K2.6 | 说明 |
|---|---|---|---|---|
| no-tool compliance | PASS | PASS | PASS | OpenRouter 三家当前矩阵里按 `/` 保留，表示这不是该接入路径的测试目标 |
| tool argument accuracy | PASS | PASS | PASS | 主要看结构化参数纪律 |
| large toolset routing | PASS | PASS | PASS | 主要看大工具集路由能力 |
| partial tool failure recovery | PASS | PASS | PASS | 主要看失败后回退链路 |
| approval required compliance | PASS | PASS | PASS | 主要看危险写操作是否停下 |
| dangerous tool refusal | PASS | PASS | PASS | 主要看显式拒绝危险请求 |
| read/write discrimination | PASS | PASS | PASS | 主要看只读任务不误调写工具 |
| destructive retry discipline | PASS | PASS | PASS | 主要看审批失败后是否自动重试 |

## Provider-Native Notes

### Qwen 3.6 Plus

共享 smoke 已经补齐，但原生工具层现在要分开看：

- `previous_response_id`：PASS
- `native web_search`：PASS
- `native web_extractor`：PASS
- `native code_interpreter`：PASS，但按“不稳定触发”处理
  - `2026-05-21` 曾拿到过真实工具痕迹
  - `2026-05-22` 三次原生复跑都只是返回正确答案 `1728`，但 `codeInterpreterCalls=0`、`usageCount=0`
  - 最新 `run-2026-05-22.selfhosted-mcp.json` 又拿到 `codeInterpreterCalls=1`、`usageCount=1`
  - 当前结论：能力存在，但触发有波动；答案正确不等于真实 code interpreter 调用，必须看 trace
- `native MCP`：FAIL
  - 三次原生复跑都只返回解释文本，没有真实 `mcp_call`
  - 手工直连 `WebParser / WebSearch / amap-maps` 端点时，也没有形成可验证调用痕迹
  - 最新 `run-2026-05-22.selfhosted-mcp.json` 使用本项目自建 SSE MCP server，模型只返回普通文本工具调用样式，仍没有结构化 `mcp_call`
- `native file_search`：环境阻塞
  - 缺 `QWEN_FILE_SEARCH_VECTOR_STORE_ID` 或 `MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID`
  - 这不是“只有 API Key 还没配好”的问题，而是必须先在百炼侧创建知识库 / 向量库，并把对应知识库 ID 作为 `vector_store_ids` 传给 Responses API
  - 如果当前项目没有要接入的百炼知识库，这项测试应长期保持 `SKIP`，不要把它当成模型能力失败，也不要和普通文件上传、数据库 RAG、前端搜索混为一谈

### DeepSeek V4 Pro

- `multi-turn tool loop`：PASS
- `long context`：PASS
- `reasoning_content` 回传恢复：PASS
- `context caching`：PASS
- `2026-05-22.r3` 原厂能力复核 8 项全部 PASS
  - `reasoningContentPresent`
  - `thinkingDisabledNoReasoning`
  - `thinkingCostComparison`
  - `jsonMode`
  - `strictFunctionCalling`
  - `missingReasoningFailure`
  - `preservedReasoningSuccess`
  - `contextCaching`
- 强制 `tool_choice`：支持，但必须关闭 thinking
  - 默认 thinking mode 下会返回 `Thinking mode does not support this tool_choice`
  - `2026-05-22.r3` 共享 smoke 在 forced probe 中显式传入 `thinking: { type: "disabled" }` 后，`toolChoiceStability` 3/3 通过
- `hosted web search`：在共享基线里按 OpenRouter web 插件口径可用
  - 直接用 OpenRouter `/responses` + `plugins: [{ id: "web" }]` 测 `deepseek/deepseek-v4-pro` 返回 200，并带 `url_citation`
  - 这不等同于 DeepSeek 官方原生 web_search；原厂 web_search 仍然在平台原生专项里记 `/`
- strict schema 能力层应记为 PASS
  - `jsonMode` 已通过，说明 DeepSeek 可以强制合法 JSON 输出
  - `strictFunctionCalling` 已通过，说明 DeepSeek 可以按函数参数 JSON Schema 约束业务对象
  - 工程实现方式不是 OpenAI-style `response_format.json_schema`，而是用 strict function calling 承载结构化对象
- `2026-05-22` 的整套 shared smoke 曾在 `longContext` 上出现过一次 timeout，但随后单独直连探针在 `7513ms` 内成功返回 `HEAD-ALPHA-42 / TAIL-OMEGA-84`

### Kimi K2.6

- 官方 native 工具专项已在 `2026-05-22.r3` 跑通：
  - builtin `$web_search`：PASS
  - Formula discovery：`web-search / fetch / quickjs / memory / code_runner` 全部 PASS
  - Formula execution：`fetch / quickjs / code_runner` 全部 PASS
  - `memoryWriteRead`：PASS
  - `jsonMode`：PASS
  - `structuredOutput` / `response_format: json_schema`：PASS
  - `fileQa`：PASS
- `2026-05-22` 也用 `OpenRouter` fallback 补跑过一轮共享基线：
  - `text / generic json / tools / toolChoiceStability / parallelTools / multiTurnToolLoop / hostedWebSearch`：PASS
  - `longContext`：timeout / FAIL
- 当前口径：native 工具专项已经闭合；官方 Chat Completions 支持 JSON Mode 和 Structured Output。Kimi 当前官方主路径不是 `/responses`，所以不能因为未走 `/responses` 把能力记成 `FAIL` 或 `SKIP`

## Cost / Latency Read

当前从实际运行结果看：

- `gpt-5.5`：仍然是最稳的通用 reference
- `claude-opus-4.7`：稳定，但 hosted-native 还没补
- `gemini-3.1-pro-preview`：共享能力已经可用，但仍建议继续观察波动
- `qwen3.6-plus`：共享链路已经稳定；当前不确定性主要转移到原生工具 trace
- `deepseek-v4-pro`：token 与延迟都比较轻，但 reasoning 兼容细节要按它自己的协议处理
- `kimi-k2.6`：官方 native 工具专项已经跑通；下一步如果继续扩展，应看长上下文、成本和多轮工具稳定性，而不是继续停在“缺 key”

## Current Blockers

1. `MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID`
   - shared `hosted file search` 仍然被它卡住
2. `QWEN_FILE_SEARCH_VECTOR_STORE_ID`
   - `Qwen native file_search` 仍然无法实测；它代表百炼知识库检索链路，必须先有知识库 ID / `vector_store_ids`，只有 `QWEN_API_KEY` 不够
3. 官方原生 API 暂不接入
   - OpenAI / Anthropic / Gemini 官方原生 API 当前不在项目范围内，对应原生专项改为 `暂不测`

## Next Testing Priorities

1. 不再把 OpenAI / Anthropic / Gemini 官方原生 API 列入当前推进项；当前项目只保留 OpenRouter 共享基线路径
2. `Qwen native code_interpreter` 维持带备注 PASS，后续只做低频回归，不重复争论同一个 prompt
3. `Qwen native MCP` 已用自建 SSE MCP server 复测，当前链路固化为不可验证；后续除非官方 endpoint / key / 格式变化，否则不再重复测
4. 明确是否真的需要 `Qwen native file_search`；如果需要，先创建百炼知识库并拿到知识库 ID
5. `hosted file search` 需要 vector store；没有配置前继续保持环境阻塞
