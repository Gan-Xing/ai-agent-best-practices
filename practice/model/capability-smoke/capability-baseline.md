# Six-Model Capability Baseline

更新日期：`2026-05-16`

这份基线不是“厂商宣传能力表”，而是当前 practice 代码在本地真实跑出来的结果总结。

结果文件：

- [gpt-5.5.responses.json](/Users/ganxing/Dev/ai-agent-best-practices/runtime/practice/model/capability-smoke/gpt-5.5.responses.json)
- [qwen3.6-plus.responses.v2.json](/Users/ganxing/Dev/ai-agent-best-practices/runtime/practice/model/capability-smoke/qwen3.6-plus.responses.v2.json)
- [openrouter.responses.v2.partial.json](/Users/ganxing/Dev/ai-agent-best-practices/runtime/practice/model/capability-smoke/openrouter.responses.v2.partial.json)
- [final-baseline-remaining.json](/Users/ganxing/Dev/ai-agent-best-practices/runtime/practice/model/capability-smoke/final-baseline-remaining.json)

## Current Implementation

| 模型 | 接口实现 | base URL | 备注 |
|---|---|---|---|
| `deepseek-v4-pro` | `chat/completions` | `https://api.deepseek.com` | 官方主路径 |
| `qwen3.6-plus` | `responses` | `https://dashscope-us.aliyuncs.com/compatible-mode/v1` | 官方 OpenAI-compatible Responses |
| `gpt-5.5` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter 访问 OpenAI |
| `claude-opus-4.7` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter 访问 Anthropic |
| `gemini-3.1-pro-preview` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter 访问 Google |
| `kimi-k2.6` | `responses` | `https://openrouter.ai/api/v1` | 通过 OpenRouter 访问 Moonshot |

## What We Actually Test

当前 smoke 已覆盖：

- text
- generic json
- strict structured outputs
- streaming
- single tool call
- forced tool choice stability
- parallel tools
- multi-turn tool loop
- long-context extraction
- error shape
- hosted web search
- hosted code execution（目前只对 Qwen 做了原生探针）
- hosted file search（当前是环境门控 probe）
- provider-native MCP（当前是环境门控 probe）
- cost / latency snapshot

## Baseline Summary

| 模型 | text | generic json | strict structured outputs | streaming | tools | forced tool choice | parallel tools | multi-turn tool loop | long context | hosted web search | hosted code execution |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `deepseek-v4-pro` | PASS | PASS | SKIP | PASS | PASS | SKIP | PASS | FAIL | FLAKY | SKIP | SKIP |
| `qwen3.6-plus` | PASS | FAIL | PASS | PASS | PASS | FAIL | PASS | PASS | FAIL | PASS | PASS |
| `gpt-5.5` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | SKIP |
| `claude-opus-4.7` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | SKIP |
| `gemini-3.1-pro-preview` | PASS | PASS | PASS | PASS | PASS | PASS | FAIL | PASS | FAIL | PASS | SKIP |
| `kimi-k2.6` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | SKIP |

## Hosted File Search / MCP / Cost-Latency

### Hosted file search

当前状态：

- 已经补了 probe 框架
- 需要设置 `MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID`
- 当前还没有现成 vector store，因此没有真实跑测结果

当前判断：

- `gpt-5.5`：理论上最值得先补，因 Responses 路径和整体协议最稳
- `claude-opus-4.7` / `gemini-3.1-pro-preview` / `kimi-k2.6`：当前通过 OpenRouter 路线，不能默认等价于各家原生 file search
- `qwen3.6-plus`：当前已验证文档和 probe 主要集中在 `web_search / code_interpreter`，还没确认稳定的 `file_search` Responses 路径
- `deepseek-v4-pro`：当前主接口不是 Responses，也没有在本实践里接 hosted file search

### Provider-native MCP

当前状态：

- 已经补了 probe 框架
- 用公共测试 MCP 服务器 `https://dmcp-server.deno.dev/sse`
- 当前要求返回里必须出现显式 `mcp_call` 痕迹，否则不算通过

当前判断：

- `gpt-5.5 @ OpenRouter /responses`：当前返回了数字结果，但没有显式 `mcp_call` 痕迹，因此按工程标准记为 `FAIL`
- 这说明“回答像是对的”不等于“真的完成了 provider-native MCP 调用”
- 这类 probe 后面必须优先看 tool-call trace，而不是只看最终文本

### Cost / latency snapshot

当前实践里已经自动汇总：

- average latency
- slowest probe
- total cost（若 usage 中有 cost）
- output tokens per second

当前读数特征：

- `gpt-5.5`：整体最稳，平均延迟低，输出效率高，成本信息也最完整
- `claude-opus-4.7`：稳定，但 token 与整体时延成本更高
- `gemini-3.1-pro-preview`：输出 token 很多，时延也更重，适合高价值场景，不适合默认粗放滥用
- `kimi-k2.6`：通用能力完整，但 usage 体量明显偏大，后续要重点看真实业务成本
- `qwen3.6-plus`：总时长很高，主要被 hosted tools 和超时 probe 拉长，不应直接拿这轮总耗时当模型本身慢
- `deepseek-v4-pro`：当前 usage 里没有统一 cost 字段，但 token 用量和延迟表现都很轻

## Concrete Capability Notes

### `deepseek-v4-pro`

适合：

- 通用文本输出
- JSON 输出
- streaming
- tool calling
- parallel tool calling
- 长上下文抽取

当前明显边界：

- `tool_choice` 强制模式不支持
- 多轮 tool loop 需要把 `reasoning_content` 回传，否则会报错
- 长上下文这轮结果有波动，之前能过，最新一次因 timeout 失败，先按 `flaky` 处理
- 当前没有接原生 hosted tools

更像：

- 强模型
- 强通用 function calling
- 但 agent loop 细节要按 DeepSeek 自己的 thinking 协议适配

### `qwen3.6-plus`

适合：

- 文本输出
- streaming
- tool calling
- parallel tools
- 原生 `web_search`
- 原生 `code_interpreter`

当前明显边界：

- 当前 `responses` 路径下，`generic json` 和长上下文依然不稳
- `strict structured outputs` 能过，但这不等于普通 JSON 路径也稳定
- `forced tool choice` 仍然不稳
- invalid model probe 没有得到预期失败，说明错误语义还要继续核对

更像：

- 工具平台能力很强
- 原生 hosted tools 值得重点研究
- 但通用 OpenAI-style agent 协议兼容性不能想当然

### `gpt-5.5`

适合：

- 目前这 6 个模型里最完整的通用 agent 基线
- JSON
- streaming
- forced tool choice
- parallel tools
- multi-turn tool loop
- 长上下文
- hosted web search（通过 OpenRouter）

当前明显边界：

- 当前 practice 里还没有接 OpenAI 原生 `file search / code interpreter / remote MCP`

更像：

- 现阶段最稳的通用 agent reference

### `claude-opus-4.7`

适合：

- 文本
- JSON
- streaming
- tool calling
- forced tool choice
- parallel tools
- multi-turn tool loop
- 长上下文
- hosted web search（通过 OpenRouter）

当前明显边界：

- 当前还是 OpenRouter 路线，不等于直接验证了 Anthropic 原生 hosted tools / MCP 全栈

更像：

- 高质量通用 agent 模型
- workflow 和 tool loop 已经可以作为长期基线

### `gemini-3.1-pro-preview`

适合：

- 文本
- JSON
- streaming
- tool calling
- forced tool choice
- multi-turn tool loop
- 长上下文
- hosted web search（通过 OpenRouter）

当前明显边界：

- 当前 parallel tool probe 没过
- 当前长上下文 probe 返回了空的 `head/tail`，不能先默认稳定

更像：

- 多数 agent 基础能力可用
- 但并行工具调用还需要单独复核

### `kimi-k2.6`

适合：

- 文本
- JSON
- streaming
- tool calling
- forced tool choice
- parallel tools
- multi-turn tool loop
- hosted web search（通过 OpenRouter）

当前明显边界：

- 当前主要边界已经从 long-context 退到更细的格式和成本层问题，基础 agent 能力整体比较完整

更像：

- 实用型 agent 模型
- 基础工具链能力已经很像可用产品
- 结构化输出纪律仍需要额外约束

## Recommended Role In Future Testing

| 模型 | 后续最适合承担的基线角色 |
|---|---|
| `deepseek-v4-pro` | 国内通用 function-calling / reasoning 适配基线 |
| `qwen3.6-plus` | 国内 hosted tools / 企业原生 Agent 平台基线 |
| `gpt-5.5` | 最稳的通用 agent reference baseline |
| `claude-opus-4.7` | 高质量 workflow / code-agent baseline |
| `gemini-3.1-pro-preview` | 长上下文 + 通用 agent baseline |
| `kimi-k2.6` | 中文实用型 agent baseline |

## What To Add Next

下一轮最值得新增的不是再堆更多模型，而是继续把这 6 个的能力拆细：

1. strict structured outputs
2. hosted file search
3. hosted code execution for non-Qwen models
4. provider-native MCP
5. retry / timeout behavior
6. cost and latency snapshots
