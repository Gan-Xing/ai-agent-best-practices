# Model Capability Smoke

这是一个最小但可复用的模型能力 smoke 测试实践。

当前默认策略不是“一刀切只走 `/chat/completions`”，而是：

- 能走 `/responses` 的模型，优先走 `/responses`
- 没有官方 `/responses` 的模型，保留其原生主接口

当前这 6 个模型里：

- `deepseek-v4-pro`：`/chat/completions`
- `qwen3.6-plus`：`/responses`
- `gpt-5.5`：通过 OpenRouter `/responses`
- `claude-opus-4.7`：通过 OpenRouter `/responses`
- `gemini-3.1-pro-preview`：通过 OpenRouter `/responses`
- `kimi-k2.6`：官方 `chat/completions`

它目前只做三件事：
现在默认会测这些通用能力：

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

这些能力会明确标成 `SKIP`，因为需要厂商原生能力或更高风险的压测：

- hosted web search
- hosted code execution
- hosted file search
- provider-native MCP
- rate limit / retry stress（默认关闭，需要手动开启）

此外当前会额外汇总：

- cost / latency snapshot

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
MODEL_CAPABILITY_LONG_CONTEXT_CHARS=24000
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
- `SKIP`: 当前脚本没有用厂商原生能力去测，或者这个能力默认不该直接压测

这套脚本的目标不是“假装全都测到了”，而是：

- 把通用能力真实测出来
- 把不能通用测的地方明确标出来
- 为后续单独加厂商原生 adapter 留接口
