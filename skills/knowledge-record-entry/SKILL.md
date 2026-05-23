---
name: knowledge-record-entry
description: Use this repo-local skill when turning user-provided AI-agent best-practice content into a KnowledgeRecord draft, asking for missing required information, applying a confirmed draft to content/knowledge JSON, validating it, and syncing it through the project's import pipeline.
---

# Knowledge Record Entry

Use this skill for recording new or updated `KnowledgeRecord` content in this
repo. The workflow is intentionally two-phase: draft first, write only after
explicit user confirmation.

## Hard Rules

- The local JSON files under `content/knowledge/` are the source of truth.
- Never write JSON or sync the server before the user confirms the draft.
- Fill every required field you can infer. Ask the user only for fields that are
  genuinely unclear or unsafe to infer.
- Do not write database IDs in JSON. Relations must use `toExternalKey` or
  `toSlug`.
- Do not bypass the import pipeline. After local JSON is confirmed and valid,
  sync with `pnpm content:import`, which uses the same `runImportJob` pipeline
  as `POST /api/records`.
- Do not treat an empty `printenv DATABASE_URL` as proof that the project has no
  database configuration. Check the repo's normal environment sources first,
  especially `.env.local`, `.env`, and the code path that loads env files.
- Default final user-facing text to Chinese unless the user asks otherwise.

## Gather Context

Run these before drafting:

```bash
pnpm content:fields
cat prisma/seed-data/categories.json
find content/knowledge -maxdepth 3 -name '*.json'
```

Read existing records in the likely category to avoid duplicate
`externalKey`, `slug`, `tags`, and relation targets. If schema details are
unclear, read:

```text
src/lib/validation/content.ts
src/lib/validation/records.ts
scripts/content-common.ts
```

If you need to inspect the database directly, read `prisma/schema.prisma`
first. Do not guess SQL table or column names from Prisma model names.

- In this repo, many SQL tables are mapped with `@@map(...)`, for example
  `ImportJob -> import_jobs`, `ImportJobItem -> import_job_items`,
  `KnowledgeRecord -> knowledge_records`.
- Column names are not automatically snake_case guesses. When querying raw SQL,
  verify the real column names from `prisma/schema.prisma` first, for example
  `knowledge_records."externalKey"` and `import_jobs."sourceType"`.
- Prefer Prisma/client code or existing repo scripts over ad hoc SQL when
  possible.
- If raw SQL is still needed, treat `prisma/schema.prisma` as the source of
  truth before issuing any query.

For detailed drafting rules, read
`skills/knowledge-record-entry/references/record-entry-rules.md`.

## Draft Phase

Analyze the user's content and produce a complete candidate record object.
Include all required fields from `pnpm content:fields`.

Use this response shape:

```text
草稿状态: 待确认
目标文件: content/knowledge/{categoryCode}-{categorySlug}/records-0001.json
我已推断: ...
需要确认: ...
```

Then include the JSON record in a fenced `json` block.

If required information is missing and cannot be inferred, ask concise
questions instead of writing a placeholder. Typical unclear fields are
category, relation targets, evidence strength, compatibility boundaries, and
source details.

## Confirmation Phase

Only after the user explicitly says to confirm, apply, land, write, or sync the
draft:

1. Write the confirmed record object to a temporary JSON file outside the repo,
   for example `/tmp/knowledge-record-draft.json`.
2. Apply it to local content:

   ```bash
   pnpm tsx skills/knowledge-record-entry/scripts/apply-draft.ts --draft /tmp/knowledge-record-draft.json
   ```

3. Resolve `DATABASE_URL` using the project's normal environment flow before
   saying it is missing:

   ```bash
   printenv DATABASE_URL
   find . -maxdepth 2 \( -name '.env.local' -o -name '.env' \) | sort
   sed -n '1,40p' .env.local 2>/dev/null | sed 's/=.*/=[REDACTED]/'
   sed -n '1,40p' .env 2>/dev/null | sed 's/=.*/=[REDACTED]/'
   sed -n '1,80p' src/lib/prisma.ts
   ```

   Follow these rules:

   - If `DATABASE_URL` is available in the current shell, use it.
   - Otherwise, if the repo's normal env file contains `DATABASE_URL`, use that
     env source instead of stopping.
   - Do not claim the env is missing until both shell env and repo env files
     have been checked.
   - If local repo env sources still do not provide `DATABASE_URL`, then inspect
     the user's normal server or deployment env source before asking.

4. Validate the local contract:

   ```bash
   zsh -lc 'set -a; source .env.local 2>/dev/null || true; source .env 2>/dev/null || true; set +a; pnpm content:verify'
   ```

   If the repo already auto-loads env files for Node processes, it is still fine
   to use the explicit `source .env.local/.env` wrapper to avoid false negatives
   during record-import work.

5. Sync to the server only after validation passes:

   ```bash
   zsh -lc 'set -a; source .env.local 2>/dev/null || true; source .env 2>/dev/null || true; set +a; pnpm content:import'
   ```

   When the user explicitly asked to write the record into the project, default
   to completing the full pipeline `apply -> verify -> import` in the same turn
   whenever the repo's normal environment sources are available.

   For this repo, once the user confirms write/import, default the record state
   to published current knowledge unless the user explicitly wants a staged
   draft. In practice this means defaulting to `PUBLISHED` and `FRESH`, and to
   `REVIEWED` when the content has just been checked in the current turn.

6. Report the changed file path, record `externalKey`, `slug`, import job id,
   and final status.

## Repo-Specific Pitfalls

- Do not confuse Prisma model names with database table names in this repo.
  `ImportJob` is not the SQL table name; the SQL table is `import_jobs`.
- Do not invent snake_case column names such as `external_key` or `source_type`
  unless `prisma/schema.prisma` explicitly maps them that way. In this repo the
  real SQL columns include quoted camelCase names like `"externalKey"` and
  `"sourceType"`.
- Before checking whether an import succeeded via raw SQL, confirm the mapped
  table and column names from `prisma/schema.prisma`, then query the database.

## Safe Apply Script

Use `scripts/apply-draft.ts` for JSON writes instead of manual editing. It
validates the draft against the live project schema, creates the category batch
file when needed, rejects duplicate `externalKey` and `slug`, and updates by
`externalKey` when the record already exists in the same category file.

Use dry-run before applying when the draft is large or risky:

```bash
pnpm tsx skills/knowledge-record-entry/scripts/apply-draft.ts --draft /tmp/knowledge-record-draft.json --dry-run
```

## Validation

Validate the skill package itself with:

```bash
pnpm tsx skills/knowledge-record-entry/scripts/quick_validate.ts
```
