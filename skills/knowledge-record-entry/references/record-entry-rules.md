# Knowledge Record Entry Rules

This reference keeps drafting decisions consistent without duplicating the live
schema. Always prefer the current output of `pnpm content:fields` when it
differs from this guidance.

## Default Field Policy

- `schemaVersion`: `1`.
- `language`: `zh` unless the source content is primarily another language.
- `type`: use `PRACTICE` for actionable guidance; use a narrower project
  convention only if one already exists in content JSON.
- `visibility`: `PUBLIC` for general best practices; `INTERNAL` for
  project-specific or operational notes.
- `status`: `DRAFT` for new unreviewed records. Use `PUBLISHED` only when the
  user explicitly wants it published.
- `maturity`: `SEED` for first drafts, `REVIEWED` only when evidence and wording
  are already checked.
- `freshness`: `FRESH` for current guidance, `NEEDS_REVIEW` when the source
  depends on unstable product behavior.
- `confidence`: choose `0.55` to `0.75` for inferred guidance, `0.8` or above
  only when the source is strong and specific.
- `publishedAt` and `lastVerifiedAt`: current date in ISO format.
- `reviewAfter`: about 90 days after `lastVerifiedAt` unless the topic is more
  volatile.
- `translations`: present as an array; use `[]` unless a real translation is
  provided.
- `aliases`: present as an array; may be empty.
- `relations`: present as an array; may be empty.

## Identity

- Generate `externalKey` as the next `kb-000001` style value by scanning all
  `content/knowledge/**/*.json`.
- Generate `slug` from the title in lowercase kebab-case. Keep technical terms
  readable, for example `tool-schema-should-reject-unknown-fields`.
- Reject or ask before changing category for an existing `externalKey`.

## Required Content Fields

- `title`: concise, specific, and searchable.
- `summary`: one sentence stating the practice and why it matters.
- `body`: enough detail for future retrieval and reuse.
- `problem`: the failure mode or ambiguity this record prevents.
- `recommendation`: the action to take.
- `keywords`: exact searchable terms, tool names, APIs, field names, and
  synonyms. Must not be empty.
- `tags`: normalized lowercase tags. Must not be empty.

## Structured Objects

Keep these objects non-empty:

- `metadata`: include `contentSource`, `draftedFrom`, or other traceable notes.
- `applicability`: audience, project stage, or use case.
- `compatibility`: affected tools, APIs, models, databases, or frameworks.
- `tradeoffs`: `pros` and `cons` arrays when possible.
- `evidence`: source basis and confidence reason.
- `metrics`: expected quality, risk, latency, cost, or complexity signals.
- `curation`: owner and review status.
- `extensions`: next steps, caveats, or future automation notes.

## Sources

For first-party repository records, use a record-level canonical source:

```json
{
  "sourceType": "GITHUB_JSON",
  "sourceKey": "content/knowledge/{categoryCode}-{categorySlug}/records-0001.json#{externalKey}",
  "title": "{title}",
  "role": "PRIMARY",
  "note": "Record-level canonical source."
}
```

Use additional external sources only when the user supplied concrete source
metadata. Otherwise put supporting rationale in `evidence`.

## Relations

- Use `toExternalKey` when the target record is known.
- Use `toSlug` only when `externalKey` is unavailable.
- If both are present, they must resolve to the same target.
- Do not create a relation to the same record.
- If a likely relation target is ambiguous, ask the user instead of guessing.

## Confirmation Questions

Ask only for blockers. Good questions are:

- "这个内容应该归到哪个分类：04-skills 还是 05-tools?"
- "这条 relation 要指向哪条已有记录的 externalKey?"
- "这条记录是 DRAFT 还是可以直接 PUBLISHED?"
- "这个建议有没有外部来源 URL 需要作为 source 保存?"
