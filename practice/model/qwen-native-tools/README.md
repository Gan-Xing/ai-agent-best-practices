# Qwen Native Tools

这个 practice 专门验证 `qwen3.6-plus` 在百炼官方平台上的原生工具能力。

当前覆盖：

- `previous_response_id` 多轮上下文
- `web_search`
- `code_interpreter`
- `web_extractor`
- `mcp`
- `file_search`（需要知识库 ID）

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
