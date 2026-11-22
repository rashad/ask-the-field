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
    C --> A[Structured answer: text, chart or map, sources, confidence, could-not-verify]
```

- The API (`POST /api/ask`) runs `streamText` from the Vercel AI SDK with `claude-sonnet-5-5` and returns a final answer as a typed object. Events stream as NDJSON: tool calls, tool results, then the answer.
- `query_production`, `list_events` and `get_wells` read the structured tables. `search_documents` runs hybrid search over document chunks.
- Hybrid search merges a pgvector cosine search (Voyage `voyage-4`, 1024 dimensions) and a Postgres full-text search with reciprocal rank fusion. Metadata filters (well, field, document type, date) apply in SQL on both sides.
- If Voyage fails for a query, search falls back to full text only and the retrieval trace says so.
- The model picks the chart and points at a tool call; the server fills it from the database rows that call returned. Every quote is checked word for word against its report before the UI highlights it.
- The UI shows live steps and a "How this answer was built" drawer with the tool calls and retrieved chunks.
- The app replays recorded answers for the four suggested questions when keys are missing, the daily cap or the rate limit is reached, the API fails, or a live answer takes more than 20 seconds. The UI labels every replay.

## Data

- 3 fields, 41 wells, 18 months of daily production (2025-05-23 to 2026-11-22), and maintenance and incident events. A seeded script generates them (`lib/synth.ts`), so the output is deterministic.
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

Open http://localhost:3000 and use the suggested questions. Without keys, the app replays the recorded answers for those four questions. Other questions return "Live answers are off".

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
| `LLM_DAILY_CAP` | Live questions per day. Default 300 |
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
pnpm eval --record    # rewrite data/cache for the suggested questions that pass
```

The script asks the four suggested questions plus one extra check, runs assertions on the answer (chart type, wells found, cited sources, answer length), and prints pass or fail, latency, tool calls and tokens. `pnpm test` runs the chunker unit tests and needs no key.

## Deploy notes

- Any host that runs Next.js and a Postgres with the `vector` extension works. The live demo runs on Railway with the pgvector Postgres template.
- Set the environment names above on the app service. Point `DATABASE_URL` at the database.
- Load the data once: `gunzip -c data/dump.sql.gz | psql "$DATABASE_URL"`. The dump uses `--clean --if-exists`, so it replaces existing tables.
- `pnpm build` needs no keys and no database. I verified it with all three variables unset.
- The app has no login. Keep `LLM_DAILY_CAP` and `RATE_LIMIT_PER_MINUTE` set on a public deployment.

## Project layout

```
app/          Next.js App Router: Ask page, Data browser, About page, API routes
lib/          synth, chunker, voyage, search, tools, answer, cache, guard
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
- Recorded answers cover only the four suggested questions.
- Eval assertions are specific to this dataset.

## License

MIT. See `LICENSE`.
