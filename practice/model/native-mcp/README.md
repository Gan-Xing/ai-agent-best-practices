# Native MCP Practice

这个 practice 专门研究：

- provider-native MCP
- MCP trace 是否真实出现
- 最终答案是否来自真实 MCP 调用，而不是模型直接“猜出来”

它和 `capability-smoke` 分开，是因为：

- MCP 是状态化协议
- 验证标准要看 tool-call trace
- 不适合继续埋在通用 smoke 里

## Current Scope

第一阶段只做：

- 用 Responses-compatible 模型发起 MCP 请求
- 检查返回里是否有显式 `mcp_call`
- 记录最终文本、trace 数量、耗时

## Command

```bash
cd /Users/ganxing/Dev/ai-agent-best-practices
MODEL_CAPABILITY_ENABLE_MCP_PROBE=1 \
pnpm practice:model:native-mcp -- --model gpt-5.5
```

## Notes

当前默认 MCP server：

```text
https://dmcp-server.deno.dev/sse
```

如果返回了正确数字，但没有 `mcp_call` trace，
在这个 practice 里仍然按失败处理。
