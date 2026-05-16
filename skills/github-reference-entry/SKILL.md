---
name: github-reference-entry
description: Use this repo-local skill when turning a user’s GitHub links and natural-language notes into confirmed GitHub reference repo cards under content/resources/github, using compact GitHub metadata fetching, AI-assisted classification against the 15 existing categories, contradiction checks against user claims, concise follow-up questions, and confirmation-before-write.
---

# GitHub Reference Entry

Use this skill for recording new or updated GitHub reference repository cards in
this repo. The workflow is intentionally two-phase: draft first, write only
after explicit user confirmation.

## Hard Rules

- The local JSON files under `content/resources/github/cards/` are the curated
  source of truth for GitHub reference cards.
- Dynamic upstream facts such as stars, last push time, README snapshots, and
  root file signals belong in the database snapshot layer, not in the card
  JSON.
- Never write card JSON before the user confirms the draft.
- Use the compact GitHub fetch script first for each public repo instead of
  relying on memory or reading full pages by default.
- Prefer fetched repository facts over user recollection when they conflict. If
  there is a mismatch, say so plainly and ask a focused question.
- Fill every field you can infer safely. Ask the user only for points that are
  genuinely ambiguous or user-specific.
- Treat `records` and GitHub cards as parallel assets. `connections` are
  optional and should only be filled when there is a meaningful relationship.
- Default final user-facing text to Chinese unless the user asks otherwise.

## Gather Context

Run these before drafting:

```bash
cat prisma/seed-data/categories.json
find content/resources/github/cards -maxdepth 3 -name '*.json'
pnpm github:repo:fetch -- --url <github-url>
```

The underlying compact fetch helper lives at:

```text
skills/github-reference-entry/scripts/fetch-repo-context.ts
```

If classification is ambiguous, read:

```text
skills/github-reference-entry/references/category-mapping.md
skills/github-reference-entry/references/card-entry-rules.md
```

Use the fetch script output as the primary low-token fact pack. It is designed
to return:

- normalized repo identity
- upstream metadata and the normalized DB snapshot payload
- README title, intro, and headings
- root file signals
- suggested categories, tags, and record type
- warnings such as archived or stale repos

Only go beyond that context when the user explicitly needs deeper validation.

## Draft Phase

Combine three inputs:

1. the user's description and intent
2. the verified GitHub fact pack
3. the existing 15-category taxonomy

Use this response shape:

```text
草稿状态: 待确认
目标文件: content/resources/github/cards/{owner}__{repo}.json
仓库核验: ...
我已推断: ...
需要确认: ...
```

Then include the candidate card JSON in a fenced `json` block.

### During Drafting

- Use the strongest category suggestion as the primary `categoryCode`.
- Use one or two secondary categories only when they genuinely help discovery.
- Prefer `status: "inbox"` for first capture, `watching` when the user already
  knows it is worth tracking, `curated` only when the fit is already clear, and
  `archived` for obsolete or unhelpful repos.
- Keep `tags` short, normalized, and retrieval-friendly.
- Set `whyItMatters` from the user's actual learning or reference intent, not
  from generic GitHub popularity.
- If the user says something that the fetched repo facts do not support, call
  it out under `需要确认`.

### Ask Only Targeted Questions

Good questions are:

- “主分类更适合 `06-mcp` 还是 `05-tools`？”
- “你收藏这个仓库最主要是为了什么：MCP 参考、工作流参考，还是 UI 参考？”
- “这张卡片先记成 `inbox` 还是你已经确认值得长期跟踪，直接记成 `watching`？”
- “需要把它和某条已有 record 关联吗？如果不需要，可以留空 `connections`。”

## Confirmation Phase

Only after the user explicitly says to confirm, apply, land, write, or save the
draft:

1. Write the confirmed card object to a temporary JSON file outside the repo,
   for example `/tmp/github-reference-card-draft.json`.
2. Apply it to local content:

   ```bash
   pnpm skill:github-reference:apply -- --draft /tmp/github-reference-card-draft.json
   ```

3. Validate the local contract:

   ```bash
   pnpm resources:github:validate
   ```

4. Sync the upstream snapshot into the database:

   ```bash
   pnpm resources:github:sync-upstreams -- --card-key <owner__repo>
   ```

5. Report the changed file path, `cardKey`, repo full name, and final status.

## Safe Apply Script

Use `skills/github-reference-entry/scripts/apply-draft.ts` for JSON writes
instead of manual editing. It validates the draft against the live card schema,
creates the cards directory when needed, rejects conflicting repo identities,
and updates the existing file when the same `cardKey` already exists.

Use dry-run before applying when needed:

```bash
pnpm tsx skills/github-reference-entry/scripts/apply-draft.ts --draft /tmp/github-reference-card-draft.json --dry-run
```

## Validation

Validate the skill package itself with:

```bash
pnpm skill:github-reference:validate
```
