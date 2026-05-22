# Qwen Native Tools

这个 practice 专门验证 `qwen3.6-plus` 在百炼官方平台上的原生工具能力。

## Latest Snapshot

`2026-05-22.selfhosted-mcp` 复跑结论：

- `previous_response_id`：PASS
- `web_search`：PASS
- `web_extractor`：PASS
- `code_interpreter`：PASS，本轮拿到 `codeInterpreterCalls=1` 和 `usageCount=1`
- `mcp`：FAIL，已换成本项目自建 SSE MCP server，仍没有结构化 `mcp_call`
- `file_search`：SKIP，按当前策略不测；这项需要百炼知识库 ID / `vector_store_ids`

结果文件：

```text
runtime/practice/model/qwen-native-tools/run-2026-05-22.r3.json
runtime/practice/model/qwen-native-tools/run-2026-05-22.mcp-diagnostic.json
runtime/practice/model/qwen-native-tools/run-2026-05-22.selfhosted-mcp.json
```

`code_interpreter` 需要带备注理解：`2026-05-22` 早些时候多次复跑没有真实工具调用痕迹，但最新 `selfhosted-mcp` 批次重新拿到真实 trace。因此矩阵里记为 PASS，但仍按有波动能力处理。

当前覆盖：

- `previous_response_id` 多轮上下文
- `web_search`
- `code_interpreter`
- `web_extractor`
- `mcp`
- `file_search`（需要知识库 ID）

## Self-hosted MCP Probe

本项目已提供一个只读、无副作用的最小 SSE MCP server：

```text
https://aiagent.byganxing.com/api/mcp/dice/sse
```

它暴露一个 `roll_dice` 工具，用于验证厂商 Responses 结构里是否会产生真实 `mcp_call`。本地协议链路已经验证通过：

- `initialize`
- `tools/list`
- `tools/call`

Qwen 复测结论：

- MCP server 本身可访问。
- Qwen Responses 返回的是普通文本工具调用样式：`{"name":"roll_dice","arguments":...}`。
- Responses `output` 里仍没有 `mcp_call` 或 `mcp_list_tools`。
- 因此当前 Qwen MCP 仍不能记为 PASS。

## MCP Verification Notes

Qwen 官方文档确认 MCP 走 Responses API，并且 MCP 工具配置必须包含：

- `type: "mcp"`
- `server_protocol: "sse"`
- `server_label`
- `server_url`

当前自查结论：

- 旧脚本里的 `https://dashscope.aliyuncs.com/api/v1/mcps/WebParser/sse` 是中国区百炼 MCP endpoint。
- 当前服务器上的 Qwen key 可以调用 `https://dashscope-us.aliyuncs.com/compatible-mode/v1/responses`，但直接探测中国区 MCP endpoint 返回 `InvalidApiKey`。
- `dashscope-us.aliyuncs.com/api/v1/mcps/.../sse` 和 `dashscope-intl.aliyuncs.com/api/v1/mcps/.../sse` 当前返回 `404`，不能简单把中国区 MCP endpoint 替换成 US / intl 域名。
- 缺少 `server_protocol: "sse"` 会直接触发 Qwen 参数错误；已在 MCP 专项脚本里按 Qwen 要求补齐。
- 使用可连通的公开 SSE MCP demo server 后，当前 US Responses endpoint 仍只返回 `reasoning`/`message`，没有 `mcp_call`；`run-2026-05-22.mcp-diagnostic.json` 的结果是 `mcpCalls=0`、`mcpListTools=0`、`outputTypes=reasoning,message`，因此不能记为 PASS。
- 使用本项目自建 SSE MCP server 后，模型只返回普通文本 `{"name":"roll_dice","arguments":...}`，仍没有 `mcp_call` 或 `mcp_list_tools`；`run-2026-05-22.selfhosted-mcp.json` 继续确认 MCP 当前链路不可验证。

因此这里不是“证明 Qwen 没有 MCP 能力”，而是：

- 官方文档能力存在。
- 当前 key / region / endpoint 组合没有验证出真实 `mcp_call`。
- 要让这项通过，必须在 Responses 结构化 `output` 里看到真实 `mcp_call`。只返回“看起来像工具调用”的 JSON 文本不算通过。

可配置项：

```bash
export QWEN_MCP_SERVER_URL=https://your-mcp-server.example.com/sse
export QWEN_MCP_SERVER_LABEL=your-server
export QWEN_MCP_SERVER_DESCRIPTION="Readable description for tool selection."

# 如果 MCP server 需要鉴权：
export QWEN_MCP_AUTH_TOKEN=your_mcp_server_token
```

通过标准：

- 响应 `output` 里必须出现 `mcp_call`。
- 最终回答不能只看文本自称“已调用 MCP”；没有结构化 `mcp_call` 一律不算通过。

## File Search Prerequisite

`file_search` 不是只靠 `QWEN_API_KEY` 就能测的模型裸能力。它需要先在百炼侧准备好知识库 / 向量库，然后把对应的知识库 ID 作为 `vector_store_ids` 传给 Responses API。

因此：

- 只有 API Key 时，`file_search` 应该保持 `SKIP`，不能记成模型失败。
- 如果没有要接入的百炼知识库，这项测试对当前项目没有实际意义。
- 如果要测，必须先创建一个可控测试知识库，并放入只有该知识库才知道的哨兵内容，避免模型靠自身知识误答。
- 文档和矩阵里提到的 `Qwen native file_search` 指的是“百炼知识库检索链路”，不是普通文件上传、不是前端搜索、也不是数据库 RAG。

需要配置其一：

```bash
export QWEN_FILE_SEARCH_VECTOR_STORE_ID=your_bailian_knowledge_base_id
# 或
export MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID=your_bailian_knowledge_base_id
```

运行：

```bash
cd /Users/ganxing/Dev/ai-agent-best-practices
pnpm practice:model:qwen-native-tools
```

可选输出路径：

```bash
pnpm practice:model:qwen-native-tools -- \
  --out runtime/practice/model/qwen-native-tools/manual.json
```

如需启用知识检索：

```bash
export QWEN_FILE_SEARCH_VECTOR_STORE_ID=your_knowledge_base_id
pnpm practice:model:qwen-native-tools
```
