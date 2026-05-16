# AI Agent Best Practices

Knowledge-base app for searchable AI-agent best-practice records.

## Content Source

Repository JSON content lives under:

```text
content/knowledge/{categoryCode}-{categorySlug}/records-0001.json
```

The local JSON contract is defined in:

```text
src/lib/validation/content.ts
```

Use this command to inspect the current writable JSON fields:

```bash
pnpm content:fields
```

## GitHub Resource Cards

Use lightweight GitHub repo cards for fast capture and classified browsing
alongside the main knowledge records:

```text
content/resources/github/cards/{owner}__{repo}.json
```

Each card keeps:

- your own tags, summary, and judgment
- a primary `categoryCode` and `recordType` that stay compatible with the main
  knowledge model
- stable repo identity plus curation lifecycle fields in Git
- dynamic upstream facts in the database snapshot layer
- optional links to related records when a repo is relevant to your internal
  best-practice notes

Design notes and workflow:

```text
docs/github-resource-cards.md
content/resources/github/README.md
```

Validate the lightweight card layer with:

```bash
pnpm resources:github:validate
pnpm resources:github:sync-upstreams -- --card-key owner__repo
```

Batch and weekly sync note:

- set `GITHUB_TOKEN` in `.env` or `.env.local` before enabling `--all` sync in
  production
- the current sync pipeline can use up to about 4 GitHub API requests per repo
  during one refresh pass
- anonymous GitHub rate limits are therefore only safe for a very small card
  library

Production weekly refresh is designed to run through:

```text
ops/systemd/ai-agent-best-practices-github-sync.service
ops/systemd/ai-agent-best-practices-github-sync.timer
ops/systemd/ai-agent-best-practices-github-sync-alert@.service
```

Failure alerts are written locally under:

```text
runtime/alerts/github-sync/latest-failure.json
runtime/alerts/github-sync/latest-failure.txt
runtime/alerts/github-sync/history/
```

If `GITHUB_SYNC_ALERT_WEBHOOK_URL` is configured in `.env`, the same failure
payload is also sent to that webhook as JSON.

Public-repo boundary:

- this repository only ships a generic webhook failure hook
- personal Telegram, WeChat, Slack, or other destination-specific sender code
  must live outside this public repo
- if you want Telegram delivery, run your own private webhook consumer or
  bridge service and point `GITHUB_SYNC_ALERT_WEBHOOK_URL` at that endpoint

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
