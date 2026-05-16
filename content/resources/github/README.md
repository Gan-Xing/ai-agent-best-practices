# GitHub Resource Cards

Lightweight repo cards live here as a parallel reference index beside the main
`KnowledgeRecord` content.

The JSON files are the curated source of truth. Dynamic upstream GitHub facts
such as stars, pushed-at timestamps, README snapshots, and root file signals
are synced into the database snapshot layer.

## Paths

```text
content/resources/github/schema.v1.json
content/resources/github/cards/{owner}__{repo}.json
content/resources/github/examples/repo-card.v1.example.json
```

## Quick Start

1. Copy `examples/repo-card.v1.example.json`
2. Rename it to `cards/{owner}__{repo}.json`
3. Fill `summary`, `whyItMatters`, `classification.tags`, and `review`
4. Run `pnpm resources:github:validate`
5. Run `pnpm resources:github:sync-upstreams -- --card-key {owner}__{repo}`

For production scheduled sync, set `GITHUB_TOKEN` in `.env` or `.env.local`.
The sync path now uses conditional requests plus incremental scheduled batches,
but first-time or changed repos can still use about 4 GitHub API requests per
repo, so anonymous rate limits are only safe for a very small library.

## Conventions

- one repository per file
- lowercase `owner` and `repo`
- file name must match `cardKey`
- `classification.categoryCode` must use an existing seeded category
- `classification.recordType` should use an existing seeded `record_type`
- `connections.relatedRecordSlugs` is optional and should only be used when the
  repo is meaningfully related to one or more formal records

## Relationship To Records

Cards and records are parallel assets. A record may mention a repo, and a repo
card may optionally link back to one or more record slugs, but neither depends
on the other to exist.

For public-repo alerting, keep the boundary clean:

- this repo may emit generic webhook alerts
- personal Telegram, WeChat, Slack, or other destination-specific sender code
  should stay outside the public repository
