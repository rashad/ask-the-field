# ops-rag-demo

Concept prototype: ask questions of synthetic upstream oil and gas operations data (Next.js, Postgres + pgvector, Claude, Voyage embeddings). Stage 1 holds the data pipeline, stage 2 the ask API, stage 3 the UI (Ask, Data, About).

## Layout

- `db/schema.sql`: tables `wells`, `production_daily`, `events`, `documents`, `chunks`.
- `lib/synth.ts`: seeded generator for wells, daily production and events (no LLM).
- `lib/chunker.ts`: structure-aware chunker (headings, then paragraphs, then sentences, ~500 tokens, no overlap).
- `lib/voyage.ts`, `lib/search.ts`: embeddings and hybrid search (vector + full-text, RRF k=60), with metadata filters in SQL on both sides. Query vectors are cached in memory and in `data/cache/query-vectors.json`; if Voyage fails or rate limits a query, search runs full text only and the trace says so (`full_text_only`). The 30 s retry is for ingest only.
- `lib/tools.ts`: the four LLM tools (`query_production`, `list_events`, `search_documents`, `get_wells`) with Zod inputs; `search_documents` records the retrieval trace. A repeated call (same args, or an earlier complete result narrowed by a filter) returns a short note instead of hitting the database, and the next step must answer.
- `lib/answer.ts`: `ask()` runs `streamText` (AI SDK, `claude-sonnet-5-5`) with the tools and `Output.object` for the final answer, and yields NDJSON events.
- `app/api/ask/route.ts`: `POST /api/ask { question }`, streams `application/x-ndjson` events: `start`, `tool-call` (with a UI label), `tool-result`, `tool-error`, `fallback`, `final` (answer, viz, sources, confidence, retrieval trace, usage), `error`.
- `app/page.tsx` + `app/ask.tsx`: Ask page; reads the NDJSON stream, shows live steps, the answer, SVG viz (`app/viz.tsx`) and the "How this answer was built" drawer (`app/drawer.tsx`). `/?q=<question>` asks on load, `&how=1` opens the drawer.
- `app/data`, `app/about`, `app/api/data/*`: read-only data browser (documents, chunks with their first vector values, tables) and the About page, all from the database. `/data?chunk=<id>` highlights a chunk.
- `lib/cache.ts`, `data/cache/*.json`: recorded runs of the 4 suggested questions, replayed when a key is missing, the daily cap is reached, or the API fails.
- `lib/guard.ts`: in-memory rate limit per IP (`RATE_LIMIT_PER_MINUTE`, default 6) and daily cap on questions (`LLM_DAILY_CAP`, default 300).
- `scripts/`: seed, document generation, ingest, search, dump, restore.
- `data/docs/*.md`: generated documents with YAML front matter. `data/dump.sql.gz`: indexed database.

## Scripts

Postgres runs in Docker (OrbStack), compose project `opsrag`, container `opsrag-postgres`, host port 5442. `DATABASE_URL` defaults to `postgres://opsrag:opsrag@localhost:5442/opsrag`.

- `pnpm db:up`: start Postgres.
- `pnpm restore`: start Postgres and load `data/dump.sql.gz` (fastest way to a working database; no keys needed).
- `pnpm db:seed`: apply the schema and regenerate wells, production and events (deterministic).
- `sec opsrag pnpm gen:docs`: generate the documents with Claude. Resumable: skips files that exist. `--dry --list` prints the plan, `--ids=A,B` generates selected ids.
- `sec opsrag pnpm ingest`: chunk, embed (voyage-4, 1024 dims) and upsert. Idempotent: only new or changed documents are embedded.
- `sec opsrag pnpm smoke ["question" ...]`: hybrid search smoke check (defaults to two sample queries).
- `pnpm db:dump`: write `data/dump.sql.gz` after an ingest.
- `sec opsrag pnpm eval`: ask the 4 suggested questions plus a Bayda check, print pass/fail, latency, tool calls and tokens. `--only=1,3` runs a subset; `--record` rewrites `data/cache` (answers and query vectors) for the suggested questions that pass.
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
