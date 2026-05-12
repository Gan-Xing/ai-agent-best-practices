# TODO-1: Database Bootstrap First

This phase is only for proving the database path end to end.

Do not start search UI, search API, ranking, RAG, or answer generation in this phase.

## Goal

Get this repository to a state where:

- PostgreSQL is running locally on the server.
- `pgvector` is available in the database.
- Prisma dependencies are installed.
- `DATABASE_URL` is configured.
- `prisma/schema.prisma` validates successfully.
- The first migration can be generated and applied.
- Raw SQL for extension and search-specific indexes is added after the base migration.

## Current State

- The repository already contains [prisma/schema.prisma](/home/ubuntu/dev/ai-agent-best-practices/prisma/schema.prisma).
- The schema already models `Unsupported("tsvector")` and `Unsupported("vector")`.
- `@prisma/client` and `prisma` are not installed yet.
- There is no committed `.env.example`.
- There is no committed `docker-compose.yml` for PostgreSQL.
- There is no initial migration yet.

## Scope

In scope:

- Server code sync
- Dependency install
- PostgreSQL + `pgvector`
- Environment configuration
- Prisma validation
- First migration
- Raw SQL migration patching

Out of scope:

- Search page
- Search API
- Hybrid retrieval
- Embedding worker implementation
- LLM answer flow
- Frontend polish

## Execution Order

### 1. Sync code and install project dependencies

```bash
git pull origin main
pnpm install
```

Exit criteria:

- Working tree is clean enough to continue.
- `pnpm install` completes successfully.

### 2. Install Prisma runtime and CLI

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

Exit criteria:

- `package.json` includes both packages.
- Lockfile is updated.

### 3. Add local database infrastructure

Add a committed `docker-compose.yml` that starts:

- `postgres`
- `pgvector`

Expected direction:

- Use a Postgres image with `pgvector` support, or add the extension in init SQL.
- Persist database data in a named volume.
- Expose a local port for Prisma.

Exit criteria:

- The container starts successfully.
- A database named for this project exists.
- `CREATE EXTENSION vector;` can run successfully.

### 4. Add environment template

Add `.env.example` with at least:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/knowledge"
```

Local `.env` should point Prisma at the running database.

Exit criteria:

- `.env.example` is committed.
- Local `.env` is usable on the server.

### 5. Validate schema before doing anything else

```bash
pnpm exec prisma validate
```

Stop rule:

- If validation fails, fix schema problems first.
- Do not continue to migration generation until validation passes.

Exit criteria:

- `prisma validate` passes cleanly.

### 6. Generate the first migration

```bash
pnpm exec prisma migrate dev --name init_knowledge_schema
```

Exit criteria:

- Initial migration is created.
- Database tables are created successfully.
- Prisma client can be generated successfully as part of the migration flow.

### 7. Patch migration with raw SQL

Prisma should own the normal relational schema.

Raw SQL should own the pieces Prisma does not manage well enough here:

- `CREATE EXTENSION IF NOT EXISTS vector;`
- FTS `tsvector` support
- GIN index for full-text search
- `pgvector` index
- Required `CHECK` constraints if they are not expressible cleanly in Prisma

Important constraint:

- Do not implement application search behavior in this step.
- Only land the database structures needed for later search work.

## Suggested Raw SQL Follow-Up

This should be handled inside the generated migration or in a follow-up SQL migration:

- Enable `vector`
- Create or maintain `search_vector` for `record_search_indexes`
- Create a GIN index on `search_vector`
- Create a vector index for `record_embeddings.embedding`
- Add any required database-level constraints that Prisma cannot express directly

## Definition of Done

`TODO-1` is complete only when all of the following are true:

- `pnpm install` succeeds
- Prisma packages are present
- PostgreSQL is running locally
- `pgvector` is enabled
- `DATABASE_URL` is configured
- `pnpm exec prisma validate` passes
- Initial migration exists in the repo
- Raw SQL migration additions for `vector` and FTS are committed

## Next Step After TODO-1

Only after this phase is green:

1. Add a minimal seed path if needed.
2. Add a record create/read path to verify the schema in application code.
3. Start search work from the database side, not from the UI side.
