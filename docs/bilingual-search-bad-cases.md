# Bilingual Search Bad Cases

更新日期：`2026-05-23`

这份清单用于持续验证双语检索。目标不是证明所有查询都能完美命中，而是把中英文混合查询的失败样本沉淀下来，后续用于调整关键词、翻译、同义词、权重和 RAG 召回策略。

## Current Acceptance Queries

| 查询 | 页面语言 | 预期行为 |
|---|---|---|
| `agent tool permission` | `zh` | 中文页面可以召回英文索引内容，并显示命中语言。 |
| `工具 权限 审计` | `en` | 英文页面可以召回中文索引内容，并显示 fallback 状态。 |
| `MCP Server 企业` | `zh` | 中英混合查询应优先召回 Tools / MCP / Security 相关记录。 |
| `RAG evaluation` | `zh` | 英文术语应能召回中文记录中的 RAG / 评测内容。 |
| `模型 路由 cost` | `en` | 混合术语应能召回 Models / Adapters 相关记录。 |

## Logging Requirements

搜索日志需要保留：

```text
locale
matchSource
matchLanguage
displayLanguage
usedFallback
fallbackRecordIds
```

## Follow-up Rules

每出现一个 bad case，需要记录：

```text
query
locale
expected record
actual top results
missing language / missing keyword / ranking issue
fix type: translation | alias | keyword | search weight | content gap
```

