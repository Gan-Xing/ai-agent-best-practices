# Current Scope Checklist

Snapshot date: `2026-05-22`

## Deferred By Scope

- `OpenAI official native path`
  - 当前不接入 OpenAI 官方原生 API。
  - 原生 `web_search / file_search / code_interpreter / remote MCP / previous_response_id` 标为 `暂不测`，不是 `/`，也不是当前推进项。
- `Anthropic official native path`
  - 当前不接入 Anthropic 官方原生 API。
  - 原生 web search、code execution beta、MCP connector 标为 `暂不测`，不是能力否定。
- `Gemini official native path`
  - 当前不接入 Gemini 官方原生 API。
  - Google Search grounding、code execution、file search 标为 `暂不测`。

## Self-Service Follow-ups

- `Qwen 3.6 Plus`
  - Shared smoke is no longer blocked on `toolChoiceStability`, `parallelTools`, or `longContext`; the latest `2026-05-22` rerun passes all three after forcing `tool_choice` with thinking disabled.
  - Native `codeInterpreter` 最新 `run-2026-05-22.selfhosted-mcp.json` 拿到 `codeInterpreterCalls=1`、`usageCount=1`，矩阵改为带波动备注的 PASS。
  - Native `MCP` 已换成本项目自建 SSE MCP server 复测；模型只返回普通文本工具调用样式，没有结构化 `mcp_call`，当前链路固化为不可验证。
- `Report hygiene`
  - 后续还能独立处理的是报告脚本、矩阵注释、证据来源整理，以及已有 key 的 Qwen / Kimi / DeepSeek / OpenRouter 低频回归。

## Environment-Gated

- Shared `hostedFileSearch`
  - Still blocked by missing `MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID`.
- `Qwen native file_search`
  - Still blocked by missing `QWEN_FILE_SEARCH_VECTOR_STORE_ID` or `MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID`.
  - This is a Bailian knowledge-base / vector-store prerequisite. `QWEN_API_KEY` alone is not enough because the Responses request must pass `vector_store_ids`.
  - If there is no Bailian knowledge base to query, this probe should stay `SKIP`; it is not a model capability failure.
- Rate-limit / retry stress
  - Still intentionally disabled and should only be enabled as a separate costed run.

## Confirmed This Round

- Matrix status semantics:
  - `暂不测` means the official native capability may exist, but this project is not integrating that official API path in the current scope.
  - `待测` should only be used for items we actually plan to test with available credentials and prerequisites.
  - `/` means not applicable to that provider path, not a testing gap.
  - DeepSeek V4 Pro keeps `/` for API-hosted web search, web extractor, code interpreter, MCP, and file search because the current official API docs do not expose those as built-in hosted tools; DeepSeek's tested native strengths are reasoning, thinking control, function calling, and context caching.
  - Shared `hostedWebSearch` now means the OpenRouter web plugin only. DeepSeek V4 Pro can pass this through OpenRouter even though DeepSeek's own official API still has no native `web_search`.
- Fixed a smoke-test regression in `buildProbeTemperature()` that caused non-Kimi runs to crash with `Maximum call stack size exceeded`.
- `DeepSeek V4 Pro`
  - Forced `tool_choice` is conditional: default thinking mode returns `Thinking mode does not support this tool_choice`, but `2026-05-22.r3` shared smoke disables thinking for forced probes and passes `toolChoiceStability` 3/3. The capability-matrix cell should be `PASS` with this caveat.
  - `strictFunctionCalling` is already covered by the dedicated thinking-loop suite and passed; the shared `strict structured outputs` capability should be `PASS` at the model-capability layer because the reliable implementation path is strict function calling, not direct `response_format.json_schema` text-output constraints.
- `DeepSeek V4 Pro`
  - Dedicated thinking-loop suite was rerun on `2026-05-22` and all probes passed again.
  - Dedicated thinking-loop suite was rerun again as `2026-05-22.r2`; all 8 probes passed, including `reasoning_content` recovery and context caching.
  - Dedicated thinking-loop suite was rerun again as `2026-05-22.r3`; all 8 probes passed, including `jsonMode` and `strictFunctionCalling`.
  - Shared smoke on `2026-05-22` passed every shared capability except one `longContext` timeout, and a direct follow-up long-context probe succeeded in `7513ms`, so this should be treated as a transient timeout rather than a capability regression.
- `Qwen 3.6 Plus`
  - Shared smoke now passes the full shared baseline on `2026-05-22.r3`, including `toolChoiceStability`, `parallelTools`, `multiTurnToolLoop`, and `longContext`.
  - Forced `tool_choice` now uses `reasoning.effort=none` for Qwen, matching the official constraint that thinking mode does not support forced tool selection.
  - Native suite now qualifies `codeInterpreter` as PASS with caveat: `run-2026-05-22.selfhosted-mcp.json` emitted real `codeInterpreterCalls=1` / `usageCount=1`, while earlier same-day reruns had no trace.
  - Native MCP remains unverified after self-hosted SSE MCP: `run-2026-05-22.selfhosted-mcp.json` returned plain text that looked like a tool call, but still no structured `mcp_call`.
  - `fileSearch` was intentionally left `SKIP`; this is a knowledge-base ID prerequisite, not a capability failure.
- `Claude Opus 4.7`
  - Shared smoke now passes `longContext`.
  - Shared OpenRouter hosted web search also passed, so this cell should be `PASS`; official Anthropic native web search is `暂不测` in the current project scope.
- `Gemini 3.1 Pro Preview`
  - The latest two full shared-smoke reruns both passed `toolArgumentAccuracy`, `parallelTools`, `multiTurnToolLoop`, `longContext`, and `dangerousToolRefusal`.
  - A dedicated manual `hostedWebSearch` spot check passed 3/3, so the earlier empty-text result now looks flaky rather than systemic.
- `Kimi K2.6`
  - A `2026-05-22` shared-baseline fallback rerun through `OpenRouter` passed `text / generic json / tools / toolChoiceStability / parallelTools / multiTurnToolLoop / hostedWebSearch`.
  - The only failing shared item in that fallback rerun was `longContext`, which timed out.
- `Kimi K2.6`
  - Official native tools suite is no longer blocked by `MOONSHOT_API_KEY`.
  - `2026-05-22.r2` official native run passed all 12 probes: builtin `$web_search`, formula discovery, `fetch`, `quickjs`, `code_runner`, `memory`, JSON mode, and file upload + file QA.
  - `2026-05-22.r3` official native run passed all 13 probes, adding `structuredOutput` / `response_format: json_schema`; Kimi generic JSON and strict structured output should both be `PASS` at the capability-matrix layer.
  - The script now records single-probe failures instead of aborting the whole Kimi suite on one transient network error.
