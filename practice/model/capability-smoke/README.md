# Model Capability Smoke

这是一个最小但可复用的模型能力 smoke 测试实践。

## Latest Snapshot

最近一轮同步到 `2026-05-22` 的结论：

- `Qwen 3.6 Plus`
  - 共享基线已经补齐：`toolChoiceStability / parallelTools / multiTurnToolLoop / longContext` 都已通过
  - 原生 `codeInterpreter` 最新复跑拿到 `codeInterpreterCalls=1 / usageCount=1`，矩阵改为带波动备注的 PASS
  - 原生 `MCP` 已换成本项目自建 SSE MCP server 复测，仍然没有真实 `mcp_call`
- `DeepSeek V4 Pro`
  - `multiTurnToolLoop / longContext` 已通过
  - 强制 `tool_choice` 支持，但必须关闭 thinking；`2026-05-22.r3` 共享 smoke 已确认 3/3 通过
  - `2026-05-22.r3` 原厂 thinking-loop 复核 8 项全部通过，包括 `jsonMode`、`strictFunctionCalling`、`reasoning_content` 回传恢复和 context caching
- `Gemini 3.1 Pro Preview`
  - 早期红格已被后续复跑清掉，当前更像瞬时漂移而不是系统性失败
- `Kimi K2.6`
  - `MOONSHOT_API_KEY` 已恢复，官方 native 工具专项已在 `2026-05-22.r2` 跑通
  - `2026-05-22.r3` 再次确认官方 native 13 项全部通过
  - `$web_search`、Formula discovery、`fetch`、`quickjs`、`code_runner`、`memory`、JSON mode、Structured Output、文件上传/文件问答全部通过
  - `OpenRouter` fallback 共享基线仍只作为补充参考，不覆盖官方 native 结论

同步文件：

- `practice/model/capability-smoke/capability-baseline.md`
- `practice/model/capability-smoke/current-scope-checklist-2026-05-21.md`
- `public/artifacts/model/summary/model-capability-matrix-2026-05-22.html`

关于 `file_search` 的重要口径：

- `Qwen native file_search` 指百炼知识库 / 向量库检索链路，不是普通文件上传，也不是数据库 RAG。
- 只有 `QWEN_API_KEY` 不够，必须先有百炼知识库 ID，并作为 `vector_store_ids` 传入。
- 没有知识库 ID 时，这项应记为 `SKIP`，不能当作 Qwen 模型能力失败。

## Transport Policy

共享能力基线的默认规则是：能走 `/responses` 就必须走 `/responses`。只有厂商官方没有 `/responses`，或某项能力只能通过厂商原生接口验证，才允许退到官方原生主接口。

这条规则的原因是：

- `/responses` 更接近 Agent runtime 需要的统一抽象，适合比较工具调用、状态承接、托管工具和结构化输出。
- 如果某模型有 `/responses` 却用 `/chat/completions` 测通用基线，结果会混入接口差异，容易把“接口不支持”误读成“模型不支持”。
- 如果厂商没有 `/responses`，才使用官方最强原生接口，并在报告里记录 `transportPolicy`。

当前这 6 个模型里：

- `qwen3.6-plus`：官方 OpenAI-compatible `/responses`
- `gpt-5.5`：OpenRouter `/responses`
- `claude-opus-4.7`：OpenRouter `/responses`
- `gemini-3.1-pro-preview`：OpenRouter `/responses`
- `deepseek-v4-pro`：官方当前没有 `/responses`，用官方 `/chat/completions` 加 DeepSeek-native 专项
- `kimi-k2.6`：官方当前没有 `/responses`，用官方 `/chat/completions` 加 Kimi-native 专项

现在默认会测这些共享能力：

- 文本返回
- 通用 JSON 返回
- strict structured outputs
- streaming
- 单工具调用
- tool_choice 服从度稳定性
- 并行工具调用
- 多轮 tool loop
- 长上下文稳定性
- 错误格式
- hosted web search（共享基线只按 OpenRouter web 插件口径）
- hosted code execution
- hosted file search（环境门控）
- provider-native MCP（环境门控）
- rate limit / retry stress（默认关闭，需要手动开启）

此外当前会额外汇总：

- cost / latency snapshot

以及一部分更细的 agent 纪律 probe：

- no-tool compliance
- tool argument accuracy
- large toolset routing
- partial tool failure recovery
- approval required compliance
- dangerous tool refusal
- read/write discrimination
- destructive retry discipline

说明：

- OpenRouter 三家当前主要用于共享协议层对比，矩阵里部分纪律 probe 保留为 `/`，表示这不是该接入路径的测试目标
- shared `hosted web search` 不再混用厂商原生网页搜索；厂商原生 `web_search` 放到平台原生专项
- `待测` 只用于前置条件已具备、当前确实计划推进、但还没完成实测的项目
- `暂不测` 表示官方能力可能存在，但当前项目不接入所需官方 API、vector store、外部账号或专用平台资源
- `SKIP` 表示“可测但本轮未跑 / 缺环境 / 暂不压测”，不要和 `/` 混用
- `Qwen / DeepSeek / Kimi` 这三条路径会承担更多原生与纪律层探针

当前第一批固定测试模型有 6 个：

- `deepseek-v4-pro`
- `qwen3.6-plus`
- `gpt-5.5`
- `claude-opus-4.7`
- `gemini-3.1-pro-preview`
- `kimi-k2.6`

它关注的是：

- 当前模型是否可用
- 当前模型在这条 API 路径下是否支持这些基础能力
- 当前日志和结果是否足够支撑后续更深入的实践记录

## Files

```text
practice/model/capability-smoke/
  capability-baseline.md
  models.ts
  run.ts
  run.test.ts
  README.md
```

## Command

```bash
pnpm practice:model:capability-smoke -- --model deepseek-v4-pro
pnpm practice:model:capability-smoke -- --model qwen3.6-plus
pnpm practice:model:capability-smoke -- --model gpt-5.5
pnpm practice:model:capability-smoke -- --model claude-opus-4.7
pnpm practice:model:capability-smoke -- --model gemini-3.1-pro-preview
pnpm practice:model:capability-smoke -- --model kimi-k2.6
```

一次跑多个：

```bash
pnpm practice:model:capability-smoke -- --model deepseek-v4-pro,qwen3.6-plus,gpt-5.5
```

开启 rate limit / retry stress：

```bash
MODEL_CAPABILITY_ENABLE_RATE_LIMIT_STRESS=1 \
MODEL_CAPABILITY_RATE_LIMIT_BURST=6 \
pnpm practice:model:capability-smoke -- --model deepseek-v4-pro
```

带日志保存：

```bash
mkdir -p runtime/practice/model/capability-smoke/logs

pnpm practice:model:capability-smoke -- --model deepseek-v4-pro \
  --out runtime/practice/model/capability-smoke/deepseek-v4-pro.json \
  2>&1 | tee runtime/practice/model/capability-smoke/logs/deepseek.log
```

## Test

```bash
pnpm practice:model:capability-smoke:test
```

## Env

默认读取 `.env`。

如果想临时指定环境文件：

```bash
MODEL_CAPABILITY_ENV_FILE=.env.test pnpm practice:model:capability-smoke -- --model qwen3.6-plus
```


可选环境变量：

```text
MODEL_CAPABILITY_TIMEOUT_MS=45000
MODEL_CAPABILITY_TOOL_STABILITY_RUNS=3
MODEL_CAPABILITY_LONG_CONTEXT_CHARS=12000
MODEL_CAPABILITY_ENABLE_RATE_LIMIT_STRESS=0
MODEL_CAPABILITY_RATE_LIMIT_BURST=6
MODEL_CAPABILITY_ENABLE_MCP_PROBE=0
MODEL_CAPABILITY_MCP_SERVER_URL=https://dmcp-server.deno.dev/sse
MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID=
MODEL_CAPABILITY_REQUEST_RETRY_ATTEMPTS=2
```

## Output

建议把输出写到：

```text
runtime/practice/model/capability-smoke/
```

这样测试结果和实践代码的目录关系会更清楚。

## How To Read The Log

- `PASS`: 当前能力在这条 API 路径下通过
- `FAIL`: 当前能力在这条 API 路径下失败
- `SKIP`: 这项可测，但当前缺环境、缺知识库、成本过高，或明确暂不推进
- `/`: 不适用于当前厂商 API 路径，不属于待测缺口

这套脚本的目标不是“假装全都测到了”，而是：

- 把通用能力真实测出来
- 把不能通用测的地方明确标出来
- 为后续单独加厂商原生 adapter 留接口
