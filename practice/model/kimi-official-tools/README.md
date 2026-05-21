# Kimi Official Tools

这个 practice 用来验证 Kimi 官方工具与平台能力，而不只是通用 chat 能力。

当前覆盖：

- 内置 `$web_search`
- `moonshot/web-search:latest` 发现
- `moonshot/fetch:latest` 发现与执行
- `moonshot/quickjs:latest` 发现与执行
- `moonshot/memory:latest` 发现
- `moonshot/code_runner:latest` 可发现性检查
- `JSON Mode`
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
