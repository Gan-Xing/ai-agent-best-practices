# Hosted File Search Practice

这个 practice 专门解决一件事：

给 `gpt-5.5` 准备一个**真实的 file search 数据源**，而不是只在 smoke 里留一个空的 `vector_store_id`。

当前策略：

- 先只服务 `gpt-5.5`
- 先用 OpenAI 原生 vector store 准备数据源
- 准备好 `vector_store_id` 后，再回到 `capability-smoke` 里打开 `hostedFileSearch` probe

## Files

```text
practice/model/hosted-file-search/
  README.md
  fixture/
    gpt-5.5-knowledge-base.md
  prepare-openai-vector-store.ts
```

## Env

需要：

```text
OPENAI_API_KEY=
```

可选：

```text
OPENAI_BASE_URL=https://api.openai.com/v1
```

## Prepare A Real Data Source

```bash
cd /Users/ganxing/Dev/ai-agent-best-practices
pnpm practice:model:hosted-file-search:prepare
```

这条命令会：

1. 上传 fixture 文件
2. 创建 vector store
3. 把文件加入 vector store
4. 轮询直到索引完成
5. 打印并保存 `vector_store_id`

结果会写到：

```text
runtime/practice/model/hosted-file-search/
```

## Next Step

拿到 `vector_store_id` 以后，可以临时这样跑：

```bash
MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID=vs_xxx \
pnpm practice:model:capability-smoke -- --model gpt-5.5
```
