import { sql } from "./db";
import { embed, toVector } from "./voyage";

export interface Hit {
  id: string;
  document_id: string;
  title: string;
  doc_type: string;
  well_id: string | null;
  field: string | null;
  date: string;
  section: string | null;
  text: string;
  score: number;
}

export interface Filters {
  well_ids?: string[];
  field?: string;
  doc_type?: string;
  from?: string;
  to?: string;
}

const RRF_K = 60;

// Shift reports and procedures carry no well_id, so a well filter also matches chunks that name the well.
function where(f: Filters) {
  const wells = f.well_ids?.length ? f.well_ids : null;
  const wellPattern = wells ? `\\m(${wells.join("|")})\\M` : null;
  return sql`
    ${wells ? sql`AND (c.well_id = ANY(${wells}) OR (c.well_id IS NULL AND c.text ~ ${wellPattern}))` : sql``}
    ${f.field ? sql`AND c.field = ${f.field}` : sql``}
    ${f.doc_type ? sql`AND c.doc_type = ${f.doc_type}` : sql``}
    ${f.from ? sql`AND c.date >= ${f.from}` : sql``}
    ${f.to ? sql`AND c.date <= ${f.to}` : sql``}`;
}

// Exact scan on a materialized CTE: 484 chunks are cheap, and filters never starve the HNSW candidate list.
export async function vectorSearch(query: string, k = 8, f: Filters = {}): Promise<Hit[]> {
  const [vec] = await embed([query], "query");
  return sql<Hit[]>`
    WITH s AS MATERIALIZED (
      SELECT c.id, c.document_id, d.title, c.doc_type, c.well_id, c.field, c.date::text, c.section, c.text,
        1 - (c.embedding <=> ${toVector(vec)}::vector) AS score
      FROM chunks c JOIN documents d ON d.doc_id = c.document_id WHERE true ${where(f)}
    )
    SELECT * FROM s ORDER BY score DESC LIMIT ${k}`;
}

// Hyphenated codes like W-17 also index their parts ("w", "17"); drop those so the code itself decides the match.
export async function fullTextSearch(query: string, k = 8, f: Filters = {}): Promise<Hit[]> {
  return sql<Hit[]>`
    WITH q AS (
      SELECT to_tsquery('english', coalesce(
        string_agg(quote_literal(lex), ' | ') FILTER (WHERE lex !~ '^[0-9]+$' AND length(lex) > 1),
        string_agg(quote_literal(lex), ' | ')
      )) AS tq
      FROM unnest(tsvector_to_array(to_tsvector('english', ${query}))) AS lex
    )
    SELECT c.id, c.document_id, d.title, c.doc_type, c.well_id, c.field, c.date::text, c.section, c.text, ts_rank_cd(c.tsv, q.tq) AS score
    FROM chunks c JOIN documents d ON d.doc_id = c.document_id, q
    WHERE c.tsv @@ q.tq ${where(f)} ORDER BY score DESC LIMIT ${k}`;
}

export function rrf(...lists: Hit[][]): (Hit & { rrf: number; ranks: (number | null)[] })[] {
  const fused = new Map<string, Hit & { rrf: number; ranks: (number | null)[] }>();
  lists.forEach((list, li) =>
    list.forEach((hit, i) => {
      const entry = fused.get(hit.id) ?? { ...hit, rrf: 0, ranks: lists.map(() => null) };
      entry.rrf += 1 / (RRF_K + i + 1);
      entry.ranks[li] = i + 1;
      fused.set(hit.id, entry);
    }),
  );
  return [...fused.values()].sort((a, b) => b.rrf - a.rrf);
}

export async function hybridSearch(query: string, k = 8, f: Filters = {}) {
  const [vector, fullText] = await Promise.all([vectorSearch(query, k, f), fullTextSearch(query, k, f)]);
  return { vector, fullText, fused: rrf(vector, fullText) };
}
