# ops-rag-demo

Ask the Field. Concept prototype: ask questions of synthetic upstream oil and gas operations data (Next.js, Postgres + pgvector, Claude, Voyage embeddings).

## Layout

- `db/schema.sql`: tables `wells`, `production_daily`, `events`, `documents`, `chunks`.
- `lib/domain.ts`: the demo date (`TODAY`), data start, fields, document types with labels, and date formats. Client and server both import it.
- `lib/synth.ts`: seeded generator for wells, daily production and events (no LLM). The briefing stories are planted here on purpose.
- `lib/chunker.ts`: structure-aware chunker (headings, then paragraphs, then sentences, ~500 tokens, no overlap).
- `lib/voyage.ts`, `lib/search.ts`: embeddings and hybrid search (vector + full-text, RRF k=60), with metadata filters in SQL on both sides. Query vectors are cached in memory and in `data/cache/query-vectors.json`; if Voyage fails or rate limits a query, search runs full text only and the trace says so (`full_text_only`). The 30 s retry is for ingest only.
- `lib/tools.ts`: the four LLM tools (`query_production`, `list_events`, `search_documents`, `get_wells`) with Zod inputs. `makeTools()` returns `{ tools, runs, traces }`: every tool output with its ref, and the retrieval trace of each search. A repeated call (same args, or an earlier complete `list_events`, `get_wells` or `query_production group_by=well` result narrowed by a filter) returns a `RepeatedResult` note instead of hitting the database, and the next step must answer. It also owns `lostOil()` and the `ToolRun` and `EventRow` types.
- `lib/prompt.ts`: the system prompt, with a scope rule and per-question guidance for the briefing questions. `lib/answer.ts`: `ask()` runs `streamText` (AI SDK, `claude-sonnet-5-5` unless `ASK_MODEL` is set) with the tools and `Output.object` for the final answer, and yields NDJSON events. `claude-*` ids go direct through `@ai-sdk/anthropic` (prompt caching, `effort`); any other id goes through OpenRouter (`@openrouter/ai-sdk-provider`, `OPENROUTER_API_KEY`), whose reported cost becomes `usage.cost_usd`.
- `lib/chart.ts`: `buildViz()` turns the model's viz request into the final viz (map, line, bar or none). The model never writes chart values. For `line` and `bar` it gives a tool result `ref` (P1, E1, set in call order by `lib/tools.ts`), a metric and which series, wells or event groups; `buildChart()` reads the values from that result; a map gets its well coordinates from the database. A bad reference gives viz `none` and `checks.viz_error`.
- `lib/quote.ts`: `findQuote()` finds a source quote in its chunk after it normalizes whitespace, bold, heading hashes, table pipes and case. The server sets `quote_verified` on each chunk source; the evidence panel and `/data?chunk=<id>&quote=<text>` highlight only that span.
- `app/api/ask/route.ts`: `POST /api/ask { question }`, streams `application/x-ndjson` events: `start`, `tool-call` (with a UI label), `tool-result`, `tool-error`, `fallback`, `final` (answer, viz, sources, confidence, retrieval trace, usage), `error`.
- `lib/morning.ts`: the morning snapshot for 22 Nov 2026 (oil yesterday, wells down, open incidents, oil lost this month) and the stakes on the briefing questions, all from the database. Lost oil = normal rate in the 30 days before the event times hours offline. `lib/money.ts`: lost revenue at an assumed $70 a barrel (demo assumption). `lib/questions.ts`: the five briefing questions and the demo pair.
- `app/layout.tsx` + `app/shell.tsx`: the app shell on every page: sidebar (product mark, nav, the five briefing questions, GitHub, the theme control and credit), top bar (breadcrumb, ask field with the `/` shortcut, model chip) and, under 900px, the sidebar as a drawer behind a menu button (its close button, Esc, a link click or a wider viewport closes it; the main area is inert while it is open).
- `app/globals.css`: every color is a token on `:root`, defined once with `light-dark()`; `:root` has `color-scheme: light dark`. `app/theme.tsx`: the Auto, Light, Dark control in the sidebar footer. Light or Dark sets `data-theme` on `<html>` (which sets `color-scheme`) and stores the choice in `localStorage` (`theme`); Auto removes both and follows the system. An inline script in `app/layout.tsx` applies the stored choice before first paint.
- `app/scene.tsx`, `app/term.tsx`: the Ask empty state (headline, snapshot tiles, field map, briefing rows, how it works) and the hover/tap glossary. `/?q=...&demo=1` plays the W-17 question, then the one-off question.
- `app/page.tsx` + `app/ask.tsx`: Ask page; reads the NDJSON stream, shows live steps, the answer with citation markers, SVG viz (`app/viz.tsx`), the evidence panel (`app/evidence.tsx`, one card per source) and the "How this answer was built" section (`app/built.tsx`, seven stages from the stream and the retrieval trace). `/?q=<question>` asks on load for the five briefing questions and for a question just typed in this tab (a one-shot marker in `app/shell.tsx`, never in the URL), and prefills any other question, `&how=1` opens every stage and scrolls to the section.
- `app/connector.tsx`: `useConnector()` draws the SVG line from a citation marker to its source card on hover, focus or click (click pins and scrolls the card into view, Esc clears) and from a card back to its markers. Keyboard activation of a marker moves focus to its card, whose "Back to answer" link returns to a marker of that card. The answer column is sticky when it fits the viewport. Under 1280px the gutter and the evidence column narrow; under 1120px the stage stacks (evidence below the answer) and it draws no line: a marker tap scrolls to the card. The CSS owns that breakpoint; the hook reads it from the computed `display` of the links layer. `lib/sources.ts`: `producer()` maps a table source id to the tool call that returned it, and `coveredEvents()` finds the event rows a source label names or spans, so an evidence card shows them all with a total.
- `app/evals/page.tsx` + `lib/evals.ts`: `/evals`, read at build time from `evals/*.json` (latest run per model, unreadable files skipped, null means print n/a), plus one typed constant for the stopped Gemini run, shown only while no saved run has that model. No production row when `MODEL` has no saved run.
- `app/human.ts`: plain-English sentences for each live step and its result (the narration and the build section use them). `app/md.tsx`: small Markdown renderer for chunk text (headings, bold, lists, tables), with line highlight for cited passages.
- Fonts come from `next/font` (Geist and Geist Mono, self-hosted) and icons from `@phosphor-icons/react/ssr` (inline SVG). No runtime request to Google Fonts or unpkg.
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
- `pnpm test`: unit tests for the chunker, the chart builder, the quote check, the request guard, the eval loader and the source matcher (no key, no database).
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
