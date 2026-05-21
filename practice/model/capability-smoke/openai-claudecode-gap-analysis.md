# Qwen / DeepSeek / Kimi vs OpenAI / ClaudeCode Gap Analysis

更新日期：`2026-05-16`

这份分析不把 `OpenAI` 或 `ClaudeCode` 当成一个“模型名”，而是拆成能力层：

1. 通用模型协议能力
2. 工具调用控制能力
3. 多步 agent workflow 能力
4. 托管工具平台能力
5. coding-agent / harness 能力

## Very Important

`ClaudeCode` 不是单一模型能力。

它更像：

- 模型
- 工具调用 runtime
- 代码库检索
- patch / diff / command loop
- 规则、workflow、hooks、skills

所以如果你说“达到 ClaudeCode 的能力”，
我们必须区分：

- **模型本身能不能做到**
- **平台和 runtime 有没有补齐**

## What We Can Already Test Now

当前已经能真实测的：

- text
- generic json
- strict structured outputs
- streaming
- single tool call
- forced tool choice
- parallel tools
- multi-turn tool loop
- long-context extraction
- error shape
- hosted web search
- hosted code execution（Qwen）
- provider-native MCP trace（已开始，但还没跑通）
- cost / latency snapshot
- no-tool compliance
- tool argument accuracy

## What We Can Add Next Without OpenAI File Search

这些都可以继续补，而且不依赖 OpenAI file search：

1. `no-tool compliance`
   - 明确要求“不准调工具”，看模型会不会乱调

2. `tool argument accuracy`
   - 参数名、参数值、枚举值是否稳定符合 schema

3. `tool hallucination resistance`
   - 没提供工具时，会不会假装调用成功

4. `partial tool failure recovery`
   - 一个工具报错后，是否会改用另一路，或给出合理 fallback

5. `multi-step planning discipline`
   - 先规划，再执行，再总结，是否会跳步骤

6. `citation discipline`
   - web search 结果是否能稳定给 citation，而不是只生成像引用的文本

7. `long tool schema tolerance`
   - 工具描述长、参数多时，工具调用是否退化

8. `large toolset routing`
   - 给 10~20 个工具时，还能不能选对工具

9. `retry / idempotency discipline`
   - 重试时会不会重复执行危险操作

10. `context carry-over`
    - 第二轮是否真的利用前一轮 tool result，而不是重新猜

## Capability Layers

### Layer 1: General Agent Protocol

这里对标的是：

- OpenAI Responses
- 通用 function calling
- 结构化输出
- 基础 tool loop

| 能力 | Qwen 3.6 Plus | DeepSeek V4 Pro | Kimi K2.6 | 结论 |
|---|---|---|---|---|
| generic json | 弱 | 强 | 强 | Qwen 不稳 |
| strict structured outputs | 强 | 当前未测 | 强 | Qwen/Kimi 好 |
| streaming | 强 | 强 | 强 | 三家都能用 |
| tools | 强 | 强 | 强 | 三家都能用 |
| forced tool choice | 弱 | 不支持 | 强 | Qwen/DeepSeek 明显落后 |
| parallel tools | 强 | 强 | 强 | 这一项都不差 |
| multi-turn tool loop | 强 | 弱 | 强 | DeepSeek 最明显落后 |
| long context extraction | 弱 | 波动 | 强 | Kimi 当前最好 |

### Layer 2: Hosted Tool Platform

这里对标的是：

- OpenAI 的 built-in tools
- 企业级托管工具平台

| 能力 | Qwen 3.6 Plus | DeepSeek V4 Pro | Kimi K2.6 |
|---|---|---|---|
| hosted web search | 已验证 PASS | 当前无 | 通过 OpenRouter web search PASS |
| hosted code execution | 已验证 PASS | 当前无 | 当前无 |
| hosted file search | 当前未确认 | 当前无 | 当前未确认 |
| provider-native MCP | 当前未验证 | 当前无 | 当前未验证 |

这一层里：

- `Qwen` 最接近“国内企业 Agent 平台”
- `DeepSeek` 明显不是托管工具平台路线
- `Kimi` 更像实用型智能助手，而不是完整工具平台

### Layer 3: ClaudeCode-style Coding Runtime Readiness

这里不是测“会不会写代码”，而是测：

- 是否能被稳定编排
- 是否适合接 code search / symbol search / patch loop
- 是否有足够好的工具纪律

| 能力 | Qwen 3.6 Plus | DeepSeek V4 Pro | Kimi K2.6 | 当前判断 |
|---|---|---|---|---|
| 严格结构化输出 | 有，但 generic json 不稳 | 还没补 strict probe | 强 | Kimi 最稳 |
| 强制工具控制 | 弱 | 不支持 | 强 | Kimi 最适合当 coding runtime 的模型层 |
| 多轮 loop | 强 | 弱 | 强 | DeepSeek 需要特调 |
| 长上下文 | 弱 | 波动 | 强 | Kimi 当前最好 |
| 平台工具 | 强 | 弱 | 中 | Qwen 强在平台，Kimi 强在通用 agent |

### Layer 4: Control Discipline

这一层专门对标：

- OpenAI / ClaudeCode 这类 runtime 需要的“可控性”
- 有工具但不该调时，能不能忍住
- 该调工具时，参数能不能稳定打准

最新实测：

| 能力 | Qwen 3.6 Plus | DeepSeek V4 Pro | Kimi K2.6 | 当前判断 |
|---|---|---|---|---|
| no-tool compliance | PASS | PASS | PASS | 三家都能忍住不乱调 |
| tool argument accuracy | PASS | PASS | PASS | 三家在这个中等复杂 schema 下都能打准 |
| forced tool choice stability | FAIL | SKIP | FAIL(2/3) | 这里才是真正的差距点 |

这个结果很重要：

- `Qwen / DeepSeek / Kimi` 并不是“连工具纪律都没有”
- 它们在“**该不该调**”和“**参数能不能打准**”上，其实都已经不差
- 真正拉开差距的是：
  - `forced tool choice`
  - `multi-turn tool loop`
  - `long-context stability`
  - `hosted platform completeness`

## Practical Conclusion

### Qwen 3.6 Plus

它最像：

**国内企业 Agent 平台能力样本**

优势：

- web search
- code interpreter
- strict structured outputs
- parallel tools
- multi-turn loop

缺点：

- generic json 不稳
- forced tool choice 不稳
- long context 不稳

所以 Qwen 离 OpenAI 的差距，不在“有没有 tools”，而在：

- 协议一致性
- 普适型 agent runtime 纪律
- 强制工具控制
- 长文本稳定性

### DeepSeek V4 Pro

它最像：

**强 reasoning 模型，不是现成 agent runtime 标准件**

优势：

- text / json / streaming / tools / parallel

缺点：

- forced tool choice 不支持
- tool loop 需要 reasoning_content 回传
- 托管工具层明显弱

所以 DeepSeek 离 OpenAI / ClaudeCode 的差距，主要在：

- agent protocol 兼容层
- workflow runtime 适配
- hosted platform 能力
- thinking / reasoning 回填协议

### Kimi K2.6

它最像：

**中文通用 agent 主力模型候选**

优势：

- generic json
- strict structured outputs
- tools
- forced tool choice
- parallel tools
- multi-turn loop
- long context

缺点：

- 当前还没看到像 Qwen 那样明确的原生 code interpreter 平台能力
- 当前 hosted tool 平台层不如 Qwen 鲜明

所以 Kimi 离 OpenAI / ClaudeCode 的差距，不是在通用协议，而更多在：

- 平台生态
- coding-agent 周边 runtime
- 强制工具控制的一致性（当前 2/3，不是绝对稳定）

## What Is Still Missing To Reach OpenAI / ClaudeCode-like Capability

如果目标是“接近 OpenAI / ClaudeCode 的能力层”，
这三家还缺的主要不是“更会聊天”，而是：

1. `tool control discipline`
   - 特别是 Qwen / DeepSeek

2. `long-context stability`
   - 特别是 Qwen / DeepSeek / Gemini 路线

3. `provider-native tool ecosystem`
   - 特别是 DeepSeek / Kimi

4. `code retrieval stack`
   - symbol search
   - definition / references
   - repo indexing
   - patch-aware context

5. `runtime / harness layer`
   - retries
   - approvals
   - loop recovery
   - MCP trace visibility
   - tool result grounding

## Recommended Next Tests

### Priority A

这几项最该先补，因为能最直接区分“能不能接近 OpenAI / ClaudeCode”：

1. `no-tool compliance`
2. `tool argument accuracy`
3. `partial tool failure recovery`
4. `large toolset routing`
5. `multi-step planning discipline`

### Priority B

这些决定它们能不能做 coding-agent runtime：

6. `code retrieval baseline`
   - rg
   - symbol lookup
   - definition lookup
   - references lookup

7. `patch loop discipline`
   - 给 diff / tool result / command result 后，是否能稳定进入下一步

### Priority C

这些决定平台成熟度：

8. `provider-native MCP`
9. `hosted file search`
10. `cost/latency repeated sampling`
