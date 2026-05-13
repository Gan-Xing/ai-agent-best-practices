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

3. Validate the local contract:

   ```bash
   DATABASE_URL="$DATABASE_URL" pnpm content:verify
   ```

4. Sync to the server only after validation passes:

   ```bash
   DATABASE_URL="$DATABASE_URL" pnpm content:import
   ```

   If `DATABASE_URL` is not set, inspect the project's normal environment
   source or ask the user before validating or importing. Do not guess
   credentials.

5. Report the changed file path, record `externalKey`, `slug`, import job id,
   and final status.

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
