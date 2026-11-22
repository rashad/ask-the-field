import { sql } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/data/documents/[id]">) {
  const { id } = await ctx.params;
  const [doc] = await sql`SELECT doc_id, doc_type, well_id, field, date::text, title FROM documents WHERE doc_id = ${id}`;
  if (!doc) return Response.json({ error: "Document not found." }, { status: 404 });
  const chunks = await sql`
    SELECT id, ordinal, section, text, tokens, well_id, field, date::text, doc_type, embedding_model,
      (embedding::real[])[1:8] AS vector_head, vector_dims(embedding) AS dims
    FROM chunks WHERE document_id = ${id} ORDER BY ordinal`;
  return Response.json({ document: doc, chunks });
}
