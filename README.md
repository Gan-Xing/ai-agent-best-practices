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
pnpm content:verify
pnpm lint
DATABASE_URL="postgresql://knowledge:knowledge@localhost:5432/knowledge" pnpm build
```
