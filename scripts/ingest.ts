import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { approxTokens, chunkDocument } from "../lib/chunker";
import { sql } from "../lib/db";
import { embed, EMBEDDING_MODEL, toVector } from "../lib/voyage";

const DIR = "data/docs";
const BATCH_TOKENS = 5000;

interface Doc {
  doc_id: string;
  doc_type: string;
  well_id: string | null;
  field: string | null;
  date: string;
  title: string;
  body: string;
  sha256: string;
}

function read(file: string): Doc {
  const raw = readFileSync(`${DIR}/${file}`, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = parse(m[1]);
  const body = m[2].trim();
  const fingerprint = raw + EMBEDDING_MODEL + JSON.stringify(chunkDocument(body));
  return { ...meta, date: String(meta.date), body, sha256: createHash("sha256").update(fingerprint).digest("hex") };
}

const docs = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort().map(read);
const existing = new Map((await sql<{ doc_id: string; sha256: string }[]>`SELECT doc_id, sha256 FROM documents`).map((r) => [r.doc_id, r.sha256]));
const changed = docs.filter((d) => existing.get(d.doc_id) !== d.sha256);
const removed = [...existing.keys()].filter((id) => !docs.some((d) => d.doc_id === id));

const chunksOf = (d: Doc) =>
  chunkDocument(d.body).map((c) => ({
    id: `${d.doc_id}#${c.ordinal}`, document_id: d.doc_id, ordinal: c.ordinal, section: c.section, text: c.text, tokens: c.tokens,
    well_id: d.well_id, field: d.field, date: d.date, doc_type: d.doc_type, embedding_model: EMBEDDING_MODEL,
    input: `${d.title}${c.section && c.section !== d.title ? ` | ${c.section}` : ""}\n\n${c.text}`,
  }));
const work = changed.map((d) => ({ doc: d, chunks: chunksOf(d) }));
console.log(`documents: ${docs.length} on disk, ${changed.length} new or changed, ${removed.length} removed; chunks to embed: ${work.reduce((n, w) => n + w.chunks.length, 0)}`);

if (removed.length) await sql`DELETE FROM documents WHERE doc_id IN ${sql(removed)}`;

const cost = (w: (typeof work)[0]) => w.chunks.reduce((n, c) => n + approxTokens(c.input), 0);
let done = 0;
for (let i = 0; i < work.length; ) {
  let j = i + 1;
  for (let budget = cost(work[i]); j < work.length && budget + cost(work[j]) <= BATCH_TOKENS; j++) budget += cost(work[j]);
  const batch = work.slice(i, j);
  const chunks = batch.flatMap((w) => w.chunks);
  const vectors = await embed(chunks.map((c) => c.input), "document");
  await sql.begin(async (tx) => {
    for (const { doc } of batch) {
      await tx`INSERT INTO documents ${tx(doc, "doc_id", "doc_type", "well_id", "field", "date", "title", "body", "sha256")}
        ON CONFLICT (doc_id) DO UPDATE SET doc_type = EXCLUDED.doc_type, well_id = EXCLUDED.well_id, field = EXCLUDED.field,
        date = EXCLUDED.date, title = EXCLUDED.title, body = EXCLUDED.body, sha256 = EXCLUDED.sha256`;
      await tx`DELETE FROM chunks WHERE document_id = ${doc.doc_id}`;
    }
    const rows = chunks.map(({ input: _input, ...c }, k) => ({ ...c, embedding: toVector(vectors[k]) }));
    await tx`INSERT INTO chunks ${tx(rows)}`;
  });
  done += chunks.length;
  console.log(`indexed ${j}/${work.length} documents, ${done} chunks`);
  i = j;
}

const stats = await sql`SELECT doc_type, count(DISTINCT document_id)::int AS documents, count(*)::int AS chunks FROM chunks GROUP BY doc_type ORDER BY doc_type`;
console.table(stats);
await sql.end();
