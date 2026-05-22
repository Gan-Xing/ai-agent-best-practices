# DeepSeek Thinking Loop

这个 practice 专门验证 DeepSeek 的 thinking / tool loop / context caching 行为。

## Latest Snapshot

`2026-05-22.r3` 原厂能力复核 8 项全部通过：

- `reasoningContentPresent`
- `thinkingDisabledNoReasoning`
- `thinkingCostComparison`
- `jsonMode`
- `strictFunctionCalling`
- `missingReasoningFailure`
- `preservedReasoningSuccess`
- `contextCaching`

结果文件：

```text
runtime/practice/model/deepseek-thinking-loop/run-2026-05-22.r3.json
```

当前覆盖：

- `reasoning_content` 是否出现
- `JSON Mode`
- `strict function calling`
- 不回传 `reasoning_content` 是否按官方文档报错
- 回传 `reasoning_content` 后是否恢复正常
- `context caching` 是否命中

运行：

```bash
cd /Users/ganxing/Dev/ai-agent-best-practices
pnpm practice:model:deepseek-thinking-loop
```

可选输出路径：

```bash
pnpm practice:model:deepseek-thinking-loop -- \
  --out runtime/practice/model/deepseek-thinking-loop/manual.json
```
