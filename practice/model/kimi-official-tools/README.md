# Kimi Official Tools

这个 practice 用来验证 Kimi 官方工具与平台能力，而不只是通用 chat 能力。

## Latest Snapshot

`2026-05-22.r3` 官方 native 复跑已经通过全部 13 个 probe：

- builtin `$web_search`
- Formula discovery：`web-search / fetch / quickjs / memory / code_runner`
- Formula execution：`fetch / quickjs / code_runner`
- `memoryWriteRead`
- `jsonMode`
- `structuredOutput`
- 文件上传 + 文件问答

结果文件：

```text
runtime/practice/model/kimi-official-tools/run-2026-05-22.r3.json
```

脚本已改成单项容错：某个 probe 因网络抖动失败时会记录 `FAIL` 并继续跑完整套，不会直接中断整个报告。

当前覆盖：

- 内置 `$web_search`
- `moonshot/web-search:latest` 发现
- `moonshot/fetch:latest` 发现与执行
- `moonshot/quickjs:latest` 发现与执行
- `moonshot/memory:latest` 发现
- `moonshot/code_runner:latest` 可发现性检查
- `JSON Mode`
- `Structured Output` / `response_format: json_schema`
- 文件上传 + 文件问答

运行：

```bash
cd /Users/ganxing/Dev/ai-agent-best-practices
pnpm practice:model:kimi-official-tools
```

可选输出路径：

```bash
pnpm practice:model:kimi-official-tools -- \
  --out runtime/practice/model/kimi-official-tools/manual.json
```
