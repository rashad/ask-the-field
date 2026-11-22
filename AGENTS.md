# ops-rag-demo

Concept prototype: ask questions of synthetic upstream oil and gas operations data (Next.js, Postgres + pgvector, Claude, Voyage embeddings). Stage 1 holds the data pipeline only; the API and the UI come later.

## Layout

- `db/schema.sql`: tables `wells`, `production_daily`, `events`, `documents`, `chunks`.
- `lib/synth.ts`: seeded generator for wells, daily production and events (no LLM).
- `lib/chunker.ts`: structure-aware chunker (headings, then paragraphs, then sentences, ~500 tokens, no overlap).
- `lib/voyage.ts`, `lib/search.ts`: embeddings and hybrid search (vector + full-text, RRF k=60).
- `scripts/`: seed, document generation, ingest, search, dump, restore.
- `data/docs/*.md`: generated documents with YAML front matter. `data/dump.sql.gz`: indexed database.

## Scripts

Postgres runs in Docker (OrbStack), compose project `opsrag`, container `opsrag-postgres`, host port 5442. `DATABASE_URL` defaults to `postgres://opsrag:opsrag@localhost:5442/opsrag`.

- `pnpm db:up`: start Postgres.
- `pnpm restore`: start Postgres and load `data/dump.sql.gz` (fastest way to a working database; no keys needed).
- `pnpm db:seed`: apply the schema and regenerate wells, production and events (deterministic).
- `sec opsrag pnpm gen:docs`: generate the documents with Claude. Resumable: skips files that exist. `--dry --list` prints the plan, `--ids=A,B` generates selected ids.
- `sec opsrag pnpm ingest`: chunk, embed (voyage-4, 1024 dims) and upsert. Idempotent: only new or changed documents are embedded.
- `sec opsrag pnpm search "question"`: hybrid search smoke check.
- `pnpm db:dump`: write `data/dump.sql.gz` after an ingest.
- `pnpm test`: chunker test.
- `pnpm dev`: Next.js app.

## Rules

- Keys: `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` come from 1Password through `sec opsrag <command>`. Never print or log a key, never commit one, never use `op read`. `.env.example` holds names only.
- Data is synthetic. Never use real company, client, field or well names anywhere in the repo.
- No em dashes in generated text.
- Keep it minimal: plain SQL with the `postgres` driver, no ORM. No code comments except a rare one-line WHY.
- English everywhere. Plain commit messages, no co-author or trailer lines.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
