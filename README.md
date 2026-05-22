# AI Agent Best Practices

一个面向 AI Agent 工程实践的最佳实践知识库。

这个项目的目标不是做 AI 新闻聚合，而是沉淀可以反复搜索、引用和复用的实践判断：

- 企业 Agent 如何安全调用工具和业务系统
- RAG、知识库、评测、追踪和安全边界应该怎么设计
- 开源项目、论文、文档和真实案例中有哪些值得长期复看的实现
- 一条经验为什么可信、适合什么场景、有哪些风险和取舍

网站当前包含两类内容：

- **最佳实践记录**：已经形成明确结论的知识条目。
- **开源项目参考库**：值得反复打开的 AI Agent 相关项目，用来帮助理解实现方式和工程取舍。

## Website

生产站点：

```text
https://aiagent.byganxing.com/
```

主要入口：

- [最佳实践搜索](https://aiagent.byganxing.com/)：搜索和浏览知识记录。
- [项目路线图](https://aiagent.byganxing.com/roadmap)：查看这个知识库接下来怎么建设。
- [开源项目参考库](https://aiagent.byganxing.com/resources/github)：浏览值得复看的 AI Agent 开源项目。

## What Makes A Good Record

一条好的记录不只是“某个框架介绍”，而应该回答：

- 它解决什么 AI Agent 落地问题？
- 为什么这个问题值得记录？
- 推荐架构或做法是什么？
- 适用边界、失败风险和安全问题在哪里？
- 如何评测它是否真的有效？
- 来源是什么，是否可追溯？

## Maintainer Notes

下面是维护者和自动化脚本需要关心的内容。普通读者只需要使用网站即可。

### Content Source

知识记录的 JSON source of truth 位于：

```text
content/knowledge/{categoryCode}-{categorySlug}/records-0001.json
```

本地 JSON 合同定义在：

```text
src/lib/validation/content.ts
```

查看当前可写字段：

```bash
pnpm content:fields
```

### Open Source References

开源项目参考库使用轻量 JSON 保存策展判断：

```text
content/resources/github/cards/{owner}__{repo}.json
```

动态信息，例如 stars、README 摘要、最近 push 时间，不写进 JSON，走数据库快照层。

维护文档：

```text
docs/github-resource-cards.md
content/resources/github/README.md
```

校验与同步：

```bash
pnpm resources:github:validate
pnpm resources:github:sync-upstreams -- --card-key owner__repo
```

生产同步建议配置 `GITHUB_TOKEN`。当前链路已经改成条件请求 + 增量批次 + 分批分时定时刷新，但卡片库增长后，匿名额度依然不适合作为常态方案。

生产环境的增量定时刷新使用：

```text
ops/systemd/ai-agent-best-practices-github-sync.service
ops/systemd/ai-agent-best-practices-github-sync.timer
ops/systemd/ai-agent-best-practices-github-sync-alert@.service
```

公开仓库只保留通用 webhook 告警出口。Telegram、微信、Slack 等个人通知链路应放在私有服务里。

### Practice

所有“自己实践出来的小脚本、小工具、小实验代码”统一放在 `practice/`
目录下，而不是混进仓库维护脚本 `scripts/`。

当前模型能力 smoke 测试位于：

```text
practice/model/capability-smoke/
```

运行与测试：

```bash
pnpm practice:model:capability-smoke -- --model deepseek-v4-pro
pnpm practice:model:capability-smoke -- --model qwen3.6-plus,gpt-5.5
pnpm practice:model:capability-smoke:test
```

更详细的命令、日志和输出说明见：

```text
practice/model/capability-smoke/README.md
```

### Practice Output vs Final Artifact

`practice/`、`runtime/`、`public/artifacts/` 和 `records` 在这个仓库里不是一回事：

- `practice/`
  - 放实践代码、测试脚本、小工具源码
- `runtime/practice/`
  - 放运行结果、日志、JSON 快照、本地汇总页
  - 这是工作区，当前被 `.gitignore` 忽略，不作为最终发布内容
- `public/artifacts/`
  - 放已经确认要保留、要提交、要部署、要被 record 引用的最终静态页面
- `records`
  - 放整理后的结论、判断和长期知识记录
  - record 正文引用 `public/artifacts/...` 下的最终页面，而不是直接引用 `runtime/...`

当前模型能力矩阵的工作副本位于：

```text
runtime/practice/model/summary/model-capability-matrix-2026-05-22.html
```

当前已晋升的最终页面位于：

```text
public/artifacts/model/summary/model-capability-matrix-2026-05-22.html
```

也就是说：

- `runtime/...` 继续做实验和快照
- `public/artifacts/...` 才是最终要进 Git、能部署、能被 records 引用的页面

更完整的目录约定见：

```text
docs/practice-artifacts-and-records.md
```

## Repo-Local Skills

This repository includes a project-local skill for KnowledgeRecord entry:

```text
skills/knowledge-record-entry/SKILL.md
```

Use it when turning raw notes into a confirmed KnowledgeRecord. The workflow is
draft first, then write JSON only after confirmation, then validate and sync.

```bash
pnpm skill:knowledge-record:validate
pnpm skill:knowledge-record:apply -- --draft /tmp/knowledge-record-draft.json
DATABASE_URL="postgresql://knowledge:knowledge@localhost:5432/knowledge" pnpm content:verify
DATABASE_URL="postgresql://knowledge:knowledge@localhost:5432/knowledge" pnpm content:import
```

## API Contract

The public write surface is intentionally RESTful and resource-based:

```text
GET  /api/records              List records
POST /api/records              Create/update records through the import-job pipeline
GET  /api/records/[slug]       Read one record
GET  /api/jobs                 List write jobs
GET  /api/jobs/[jobId]
                               Read one write job
```

`POST /api/records` uses the same normalized batch payload that content JSON imports use:

```json
{
  "sourceType": "GITHUB_JSON",
  "sourceLabel": "content/knowledge/01-models/records-0001.json",
  "metadata": {
    "purpose": "manual import"
  },
  "source": {
    "sourceType": "GITHUB_JSON",
    "sourceKey": "content/knowledge/01-models/records-0001.json",
    "title": "Models category content batch 0001",
    "role": "COLLECTION",
    "note": "Batch-level source for records stored in this JSON file."
  },
  "records": [
    {
      "externalKey": "kb-000001",
      "slug": "example-record",
      "schemaVersion": 1,
      "type": "PRACTICE",
      "categoryCode": "01",
      "visibility": "INTERNAL",
      "status": "DRAFT",
      "maturity": "SEED",
      "freshness": "FRESH",
      "confidence": 0.8,
      "language": "zh",
      "title": "示例记录",
      "summary": "一段用于列表和搜索结果展示的摘要。",
      "body": "正文说明这条知识记录的完整内容、适用边界和背景。",
      "problem": "这条记录要解决的问题。",
      "recommendation": "推荐采用的做法。",
      "metadata": {
        "purpose": "example"
      },
      "applicability": {
        "audience": ["agent-builders"]
      },
      "compatibility": {
        "database": "postgresql"
      },
      "tradeoffs": {
        "benefits": ["searchable"],
        "costs": ["requires complete fields"]
      },
      "evidence": {
        "basis": "internal knowledge record"
      },
      "metrics": {
        "signals": ["tags", "keywords", "confidence"]
      },
      "curation": {
        "owner": "Gan-Xing"
      },
      "extensions": {
        "notes": "reserved for future structured data"
      },
      "publishedAt": "2026-05-13",
      "lastVerifiedAt": "2026-05-13",
      "reviewAfter": "2026-08-13",
      "translations": [],
      "aliases": [],
      "keywords": ["PostgreSQL", "hybrid search"],
      "tags": ["postgres", "hybrid-search"],
      "sources": [
        {
          "sourceType": "GITHUB_JSON",
          "sourceKey": "content/knowledge/01-models/records-0001.json#kb-000001",
          "title": "示例记录来源",
          "role": "PRIMARY",
          "note": "Record-level canonical source."
        }
      ],
      "relations": []
    }
  ]
}
```

Required request fields are `sourceType`, `sourceLabel`, `metadata`, `source`, and `records`. Records must be complete knowledge units: identity, classification, readable content, retrieval fields, provenance, and lifecycle fields are required. The top-level `source` is attached to each record as batch/collection provenance; each record's `sources[]` keeps record-level provenance. `externalId` and `archivedAt` are optional because they only exist for external-system records or archived records. The content write is atomic at the job level: if any record or relation fails, record/source/relation writes are rolled back, the response returns `ok: false`, the job status becomes `FAILED`, and the HTTP status is `422`.

There is no public `/api/import` route. Import jobs are an internal write mechanism and a readable job resource, not a separate action API.

## Relations

Record relations are written in JSON with stable business keys, never database IDs:

```json
{
  "relations": [
    {
      "toExternalKey": "kb-000002",
      "relationType": "RELATED",
      "strength": 0.8,
      "description": "Related retrieval practice.",
      "metadata": {}
    }
  ]
}
```

`toSlug` is also supported when `externalKey` is not available. If both `toExternalKey` and `toSlug` are provided, they must resolve to the same target record.

## Verification

```bash
pnpm resources:github:validate
pnpm content:verify
pnpm lint
DATABASE_URL="postgresql://knowledge:knowledge@localhost:5432/knowledge" pnpm build
```
