# GitHub Reference Card Entry Rules

Use this reference to keep GitHub card drafting consistent.

## Default Field Policy

- `schemaVersion`: `1`
- `kind`: `github-repo-card`
- `status`
  - `inbox` for first-pass capture
  - `watching` for repos you already expect to revisit
  - `curated` for clearly useful and already-understood repos
  - `archived` for stale or intentionally deprioritized repos
- `review.addedAt` and `review.lastReviewedAt`: current ISO timestamp
- `review.reviewAfter`: about 90 days after `lastReviewedAt`

## Classification

- Use one primary `categoryCode`.
- Add `secondaryCategoryCodes` only when they materially improve later lookup.
- `recordType` should usually be one of:
  - `FRAMEWORK`
  - `TOOL`
  - `REFERENCE`
- Use `REFERENCE` when the repo is mainly a reading or inspiration target and
  not a clear framework or tool.

## Tags And Keywords

- Keep `tags` lowercase and compact, usually 3 to 8 items.
- Keep `keywords` directly searchable:
  - repo name
  - canonical product name
  - major technical terms
  - distinctive protocol or framework names

## Summary And Judgment

- `summary`: say what the repo is.
- `whyItMatters`: say why this user should care about it.
- `notes`: keep short and opinionated if useful.

## Connections

- `connections` are optional.
- Only add `relatedRecordSlugs` when the repo is meaningfully related to an
  existing formal record.
- Do not invent record links just to make the graph denser.

## Contradiction Handling

If the user says something that the fetched repo facts do not support:

- keep the contradiction explicit
- ask a short clarification question
- do not silently copy the user's claim into the final JSON
