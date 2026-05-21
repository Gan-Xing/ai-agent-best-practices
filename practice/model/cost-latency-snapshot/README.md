# Cost Latency Snapshot

这个 practice 的目标很简单：

把 `capability-smoke` 结果里的成本和延迟信息单独抽出来，形成一个更容易横向比较的快照。

它不重新发请求，只消费已有报告文件。

## Files

```text
practice/model/cost-latency-snapshot/
  README.md
  run.ts
```

## Command

```bash
cd /Users/ganxing/Dev/ai-agent-best-practices
pnpm practice:model:cost-latency-snapshot
```

也可以手动指定输入：

```bash
pnpm practice:model:cost-latency-snapshot -- \
  --report runtime/practice/model/capability-smoke/gpt-5.5.v4.json,runtime/practice/model/capability-smoke/deepseek-claude-gemini.v3.json
```

输出会写到：

```text
runtime/practice/model/cost-latency-snapshot/
```
