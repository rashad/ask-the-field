import { sql } from "@/lib/db";
import { DOC_TYPES } from "@/lib/tools";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const type = params.get("type");
  const well = params.get("well");
  if (type && !(DOC_TYPES as readonly string[]).includes(type)) return Response.json({ error: "Unknown document type." }, { status: 400 });
  if (well && !/^W-\d{2}$/.test(well)) return Response.json({ error: "Well ids look like W-17." }, { status: 400 });
  const docs = await sql`
    SELECT d.doc_id, d.doc_type, d.well_id, d.field, d.date::text, d.title, count(c.id)::int AS chunks
    FROM documents d LEFT JOIN chunks c ON c.document_id = d.doc_id
    WHERE true ${type ? sql`AND d.doc_type = ${type}` : sql``} ${well ? sql`AND d.well_id = ${well}` : sql``}
    GROUP BY d.doc_id ORDER BY d.date DESC, d.doc_id`;
  return Response.json({ documents: docs });
}
