# ops-rag-demo

Ask the Field. Concept prototype: ask questions of synthetic upstream oil and gas operations data (Next.js, Postgres + pgvector, Claude, Voyage embeddings). Stage 1 holds the data pipeline, stage 2 the ask API, stage 3 the UI (Ask, Data, About).

## Layout

- `db/schema.sql`: tables `wells`, `production_daily`, `events`, `documents`, `chunks`.
- `lib/synth.ts`: seeded generator for wells, daily production and events (no LLM).
- `lib/chunker.ts`: structure-aware chunker (headings, then paragraphs, then sentences, ~500 tokens, no overlap).
- `lib/voyage.ts`, `lib/search.ts`: embeddings and hybrid search (vector + full-text, RRF k=60), with metadata filters in SQL on both sides. Query vectors are cached in memory and in `data/cache/query-vectors.json`; if Voyage fails or rate limits a query, search runs full text only and the trace says so (`full_text_only`). The 30 s retry is for ingest only.
- `lib/tools.ts`: the four LLM tools (`query_production`, `list_events`, `search_documents`, `get_wells`) with Zod inputs; `search_documents` records the retrieval trace. A repeated call (same args, or an earlier complete result narrowed by a filter) returns a short note instead of hitting the database, and the next step must answer.
- `lib/prompt.ts`: the system prompt, with a scope rule and per-question guidance for the briefing questions. `lib/answer.ts`: `ask()` runs `streamText` (AI SDK, `claude-sonnet-5-5` unless `ASK_MODEL` is set) with the tools and `Output.object` for the final answer, and yields NDJSON events. `claude-*` ids go direct through `@ai-sdk/anthropic` (prompt caching, `effort`); any other id goes through OpenRouter (`@openrouter/ai-sdk-provider`, `OPENROUTER_API_KEY`), whose reported cost becomes `usage.cost_usd`.
- `lib/chart.ts`: the model never writes chart values. For `line` and `bar` it gives a tool result `ref` (P1, E1, set in call order by `lib/tools.ts`), a metric and which series, wells or event groups; `buildChart()` reads the values from that result. A bad reference gives viz `none` and `checks.viz_error`.
- `lib/quote.ts`: `findQuote()` finds a source quote in its chunk after it normalizes whitespace, bold, heading hashes, table pipes and case. The server sets `quote_verified` on each chunk source; the drawer and `/data?chunk=<id>&quote=<text>` highlight only that span.
- `app/api/ask/route.ts`: `POST /api/ask { question }`, streams `application/x-ndjson` events: `start`, `tool-call` (with a UI label), `tool-result`, `tool-error`, `fallback`, `final` (answer, viz, sources, confidence, retrieval trace, usage), `error`.
- `lib/stakes.ts`: the morning snapshot for 22 Nov 2026 (oil yesterday, wells down, open incidents, oil lost this month) and the stakes on the briefing questions, all from the database. Lost oil = normal rate in the 30 days before the event times hours offline. `lib/money.ts`: lost revenue at an assumed $70 a barrel (demo assumption). `lib/questions.ts`: the five briefing questions and the demo pair.
- `app/scene.tsx`, `app/term.tsx`: the scene above the question bar (role, snapshot, field map), the briefing list and the hover/tap glossary. `/?q=...&demo=1` plays the W-17 question, then the one-off question.
- `app/page.tsx` + `app/ask.tsx`: Ask page; reads the NDJSON stream, shows live steps, the answer, SVG viz (`app/viz.tsx`) and the "How this answer was built" drawer (`app/drawer.tsx`). `/?q=<question>` asks on load for the five briefing questions and prefills any other question, `&how=1` opens the drawer.
- `app/human.ts`: plain-English sentences for each live step and its result (the narration and the drawer use them; `label()` in `lib/answer.ts` stays for the eval log). `app/md.tsx`: small Markdown renderer for chunk text (headings, bold, lists, tables), with line highlight for cited passages.
- Fonts come from `next/font` (IBM Plex, self-hosted) and icons from `@phosphor-icons/react/ssr` (inline SVG). No runtime request to Google Fonts or unpkg.
- Link preview: `app/opengraph-image.png`, `app/twitter-image.png` (1200x630, rendered with headless Chrome), `app/icon.svg`, `app/apple-icon.png`. `SITE_URL` sets `metadataBase` (default `https://askthefield.darmina.com`).
- `app/data`, `app/about`, `app/api/data/*`: read-only data browser (documents, chunks with their first vector values, tables) and the About page, all from the database. `/data?chunk=<id>` highlights a chunk.
- `lib/cache.ts`, `data/cache/*.json`: recorded runs of the 5 briefing questions, replayed when a key is missing, the daily cap or the rate limit is reached, the API fails, or the live answer takes more than 20 s (reason `slow`). The UI labels every replay.
- `lib/guard.ts`: in-memory rate limit per IP (`RATE_LIMIT_PER_MINUTE`, default 6), daily quota per IP (`LLM_DAILY_PER_IP`, default 20) and daily cap on questions (`LLM_DAILY_CAP`, default 300); bad env values fall back to the defaults. The client IP is `X-Real-IP` only when `TRUST_PROXY=1`, else one shared key. Also the same-origin check and the capped body reader for `/api/ask`.
- `scripts/`: seed, document generation, ingest, search, dump, restore.
- `data/docs/*.md`: generated documents with YAML front matter. `data/dump.sql.gz`: indexed database.

## Scripts

Postgres runs in Docker, compose project `opsrag`, container `opsrag-postgres`, host port 5442. `DATABASE_URL` defaults to `postgres://opsrag:opsrag@localhost:5442/opsrag`.

- `pnpm db:up`: start Postgres.
- `pnpm restore`: start Postgres and load `data/dump.sql.gz` (fastest way to a working database; no keys needed).
- `pnpm db:seed`: apply the schema and regenerate wells, production and events (deterministic).
- `pnpm gen:docs`: generate the documents with Claude. Resumable: skips files that exist. `--dry --list` prints the plan, `--ids=A,B` generates selected ids.
- `pnpm ingest`: chunk, embed (voyage-4, 1024 dims) and upsert. Idempotent: only new or changed documents are embedded.
- `pnpm smoke ["question" ...]`: hybrid search smoke check (defaults to two sample queries).
- `pnpm db:dump`: write `data/dump.sql.gz` after an ingest.
- `pnpm eval`: ask the 5 briefing questions, print pass/fail, latency, tool calls and tokens. `--only=1,3` runs a subset; `--model=<id>` picks the model; `--runs=3` repeats each question; `--save` writes `evals/<date>-<model>.json`; `--record` rewrites `data/cache` (answers and query vectors) for the suggested questions that pass, and only with the default model. `evals/README.md` holds the multi-model benchmark.
- `pnpm test`: unit tests for the chunker, the chart builder, the quote check and the request guard (no key, no database).
- `pnpm dev`: Next.js app.

## Rules

- Keys: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` and (for non-Claude models) `OPENROUTER_API_KEY` come from the environment (`.env.local`, which is gitignored, or your secret manager). Scripts marked as needing keys: `gen:docs`, `ingest`, `smoke`, `eval`, and live answers in `dev`. Never print, log or commit a key. `.env.example` holds names only.
- Data is synthetic. Never use real company, client, field or well names anywhere in the repo.
- No em dashes in generated text.
- Keep it minimal: plain SQL with the `postgres` driver, no ORM. No code comments except a rare one-line WHY.
- English everywhere. Plain commit messages, no co-author or trailer lines.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
