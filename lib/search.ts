import { sql } from "./db";
import { embed, toVector } from "./voyage";

export interface Hit {
  id: string;
  document_id: string;
  doc_type: string;
  well_id: string | null;
  date: string;
  section: string | null;
  text: string;
  score: number;
}

const RRF_K = 60;

export async function vectorSearch(query: string, k = 8): Promise<Hit[]> {
  const [vec] = await embed([query], "query");
  return sql<Hit[]>`
    SELECT id, document_id, doc_type, well_id, date::text, section, text, 1 - (embedding <=> ${toVector(vec)}::vector) AS score
    FROM chunks ORDER BY embedding <=> ${toVector(vec)}::vector LIMIT ${k}`;
}

// Hyphenated codes like W-17 also index their parts ("w", "17"); drop those so the code itself decides the match.
export async function fullTextSearch(query: string, k = 8): Promise<Hit[]> {
  return sql<Hit[]>`
    WITH q AS (
      SELECT to_tsquery('english', coalesce(
        string_agg(quote_literal(lex), ' | ') FILTER (WHERE lex !~ '^[0-9]+$' AND length(lex) > 1),
        string_agg(quote_literal(lex), ' | ')
      )) AS tq
      FROM unnest(tsvector_to_array(to_tsvector('english', ${query}))) AS lex
    )
    SELECT id, document_id, doc_type, well_id, date::text, section, text, ts_rank_cd(tsv, q.tq) AS score
    FROM chunks, q WHERE tsv @@ q.tq ORDER BY score DESC LIMIT ${k}`;
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

export async function hybridSearch(query: string, k = 8) {
  const [vector, fullText] = await Promise.all([vectorSearch(query, k), fullTextSearch(query, k)]);
  return { vector, fullText, fused: rrf(vector, fullText) };
}
