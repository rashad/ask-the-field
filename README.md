# Ask the Field

A concept RAG app that answers questions about upstream oil and gas operations. All data is synthetic: the fields, wells, people, events and documents are invented, and describe no real company or asset.

Live demo: https://askthefield.darmina.com

![Ask the Field: the morning briefing](docs/screenshot.png)

![An answer that links three pump failures from the same batch](docs/answer.png)

## How it works

```mermaid
flowchart TD
    Q[Question] --> C[Claude with four typed tools]
    C --> P[query_production]
    C --> E[list_events]
    C --> W[get_wells]
    C --> S[search_documents]
    P --> DB[(Postgres + pgvector)]
    E --> DB
    W --> DB
    S --> H[Hybrid search: vector + full text, RRF k=60]
    H --> DB
    C --> A[Structured answer: text, chart or map request, sources, confidence, could-not-verify]
    A --> V[Server: lib/chart.ts builds the chart from the referenced tool rows; lib/quote.ts checks each quote word for word]
    V --> U[UI: answer, chart, sources, how it was built]
```

- The API (`POST /api/ask`) runs `streamText` from the Vercel AI SDK with `claude-sonnet-5-5` and returns a final answer as a typed object. Events stream as NDJSON: tool calls, tool results, then the answer.
- `query_production`, `list_events` and `get_wells` read the structured tables. `search_documents` runs hybrid search over document chunks.
- Hybrid search merges a pgvector cosine search (Voyage `voyage-4`, 1024 dimensions) and a Postgres full-text search with reciprocal rank fusion. Metadata filters (well, field, document type, date) apply in SQL on both sides.
- If Voyage fails for a query, search falls back to full text only and the retrieval trace says so.
- The model picks the chart and points at a tool call; the server fills it from the database rows that call returned. Every quote is checked word for word against its report before the UI highlights it.
- The UI shows live steps, the answer with numbered citations, an evidence panel with one card per source (a line links each citation to its card), and a "How this answer was built" section with the tool calls, the hybrid search ranks and the quote check. The `/evals` page shows the saved multi-model eval runs.
- The app replays recorded answers for the five suggested questions when keys are missing, the daily cap or the rate limit is reached, the API fails, or a live answer takes more than 20 seconds. The UI labels every replay.

## Data

- 3 fields, 41 wells, 18 months of daily production (2025-05-23 to 2026-11-22), and maintenance and incident events. A seeded script generates them (`lib/synth.ts`), so the output is deterministic. The briefing stories are planted on purpose in `lib/synth.ts`: a bad ESP pump batch (7Q-0419) behind failures on W-09, W-17 and W-27, a water cut rise in Wadi Field, an open sand alarm on W-34 and this morning's other open incidents. The five briefing questions have real answers because of them; everything else is seeded noise.
- About 400 documents in `data/docs/*.md` (incident notes, reports and similar), written by Claude from the structured data, with YAML front matter.
- Chunking (`lib/chunker.ts`): structure-aware. It splits on headings, then paragraphs, then sentences, to about 500 tokens with no overlap. Documents under 600 tokens stay whole. Token counts are approximate (characters divided by 4).
- `data/dump.sql.gz` is the indexed database (chunks and embeddings included), so you do not need any key to run the app.

Field names: Dune Field, Wadi Field and Salt Flat Field.

## Quick start without keys

Needs Node, pnpm and Docker.

```bash
pnpm install
pnpm restore   # starts Postgres with pgvector in Docker and loads data/dump.sql.gz
pnpm dev
```

Open http://localhost:3000 and use the suggested questions. Without keys, the app replays the recorded answers for those five questions. Other questions return "Live answers are off".

## Quick start with keys

Copy the names from `.env.example` into a `.env.local` file and set your values.

| Name | Use |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude answers and document generation |
| `VOYAGE_API_KEY` | Query and document embeddings |
| `ASK_MODEL` | Model for answers. Default `claude-sonnet-5-5`. `claude-*` ids call Anthropic directly; any other id is an OpenRouter model id |
| `OPENROUTER_API_KEY` | Only for a non-Claude `ASK_MODEL` or `pnpm eval --model=<openrouter id>` |
| `DATABASE_URL` | Postgres URL. Default: `postgres://opsrag:opsrag@localhost:5442/opsrag` |
| `RATE_LIMIT_PER_MINUTE` | Questions per IP per minute. Default 6 |
| `LLM_DAILY_CAP` | Live questions per day. Default 300; 0 turns live answers off |
| `LLM_DAILY_PER_IP` | Live questions per client IP per day. Default 20 |
| `CF_BEACON_TOKEN` | Cloudflare Web Analytics site token. Set at build time. Unset, no beacon and no CSP change |
| `TRUST_PROXY` | `1` behind Railway: key the limits on `X-Real-IP`, which Railway's edge sets. Unset, every caller shares one key |
| `SITE_URL` | Base URL for link previews |

With both API keys set, any question goes live. Rate limit and daily cap are in memory, so they reset on restart.

## Regenerating the data

```bash
pnpm db:seed       # schema, wells, production, events (no LLM)
pnpm gen:docs      # ~400 documents with Claude; resumable, skips existing files
pnpm ingest        # chunk, embed with voyage-4, upsert; only new or changed documents are embedded
pnpm db:dump       # rewrite data/dump.sql.gz
```

`pnpm gen:docs --dry --list` prints the plan without calling the API. `gen:docs` and `ingest` need `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` in the environment. `gen:docs` makes one Claude call per document, about 400 calls with `claude-sonnet-5-5`, and logs token usage to `data/.gen-usage.jsonl`. A full run cost about $3.70. Embedding the ~480 chunks with Voyage fits in its free tier.

## Evals

```bash
pnpm eval                # needs both keys and a loaded database
pnpm eval --only=1,3  # subset
pnpm eval --record    # rewrite data/cache for the suggested questions that pass (default model only)
pnpm eval --model=openai/gpt-6.2-astra --runs=3 --save   # another model, 3 runs, raw results to evals/
```

The script asks the five briefing questions, runs assertions on the answer (chart type, wells found, cited sources, answer length), and prints pass or fail, latency, tool calls and tokens. `pnpm test` runs the unit tests for the chunker, the chart builder, the quote check, the request guard, the eval loader and the source matcher. It needs no key and no database.

Multi-model run on 2026-11-22, 5 questions, 3 runs each, 108 checks per model. Claude models go direct to Anthropic; the others go through OpenRouter. Details, prices and caching notes: [evals/README.md](evals/README.md).

| Model | Checks passed | Mean latency | Mean cost per question |
| --- | --- | --- | --- |
| `claude-sonnet-5-5` | 108/108 (100%) | 9.3 s | $0.0271 |
| `claude-haiku-5-5` | 106/108 (98.1%) | 13.6 s | $0.0026 |
| `openai/gpt-6.2-astra` | 108/108 (100%) | 11.3 s | $0.0765 |
| `google/gemini-4-argon` | 101/101 in 14 of 15 runs (stopped: over 11 min for 15 questions) | 57.9 s | $0.0702 |
| `deepseek/deepseek-v4-pro-0813` | 49/108 (45.4%), no tool call in any run | 4.9 s | $0.0032 |
| `moonshotai/kimi-k3.1-pro` | 44/108 (40.7%), no tool call in any run | 7.5 s | $0.0035 |

## Deploy notes

- Any host that runs Next.js and a Postgres with the `vector` extension works. The live demo runs on Railway with the pgvector Postgres template.
- Set the environment names above on the app service. Point `DATABASE_URL` at the database.
- Load the data once: `gunzip -c data/dump.sql.gz | psql "$DATABASE_URL"`. The dump uses `--clean --if-exists`, so it replaces existing tables.
- `pnpm build` needs no keys and no database. I verified it with all three variables unset.
- The app has no login. Keep `LLM_DAILY_CAP`, `LLM_DAILY_PER_IP` and `RATE_LIMIT_PER_MINUTE` set on a public deployment, and set `TRUST_PROXY=1` only behind a proxy that overwrites `X-Real-IP` (Railway does).
- `/api/ask` rejects cross-site browser calls (`Origin` or `Sec-Fetch-Site`) and bodies over 2 KB. A `?q=` link runs on open only for the five briefing questions; any other question is prefilled and waits for a click.

## Project layout

```
app/          Next.js App Router: Ask page, Data browser, Evals page, About page, API routes
lib/          domain, synth, chunker, voyage, search, tools, prompt, answer, chart, quote, morning, money, questions, cache, guard, db
scripts/      seed, gen-docs, ingest, search (smoke), eval, dump, restore
db/           schema.sql (wells, production_daily, events, documents, chunks)
data/docs/    generated documents
data/cache/   recorded answers and query vectors
data/dump.sql.gz  indexed database
```

## Limitations

- Concept only. The data is synthetic and small, so results say nothing about real fields.
- The 400 documents were written by an LLM from the structured data. They are consistent with it by construction, which makes retrieval easier than on real documents.
- No auth, no write access, no memory between questions.
- Rate limit and daily cap live in process memory. They do not work across several instances.
- Recorded answers cover only the five suggested questions.
- Eval assertions are specific to this dataset.
- The system prompt (`lib/prompt.ts`) carries per-question guidance for the five briefing questions (which tools to chain, how many sentences, what goes in each one), and the eval checks those same five questions. The briefing is a scripted demo, so the guidance keeps those answers short and stable for a non-engineer; free questions use only the general rules, and the eval does not measure them.

## License

MIT. See `LICENSE`.
