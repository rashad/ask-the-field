import { sql } from "../lib/db";
import { hybridSearch } from "../lib/search";

const queries = process.argv.slice(2);
for (const q of queries.length ? queries : ["Why did W-17 go down in March?", "sand production alarm Bayda"]) {
  const { vector, fullText, fused } = await hybridSearch(q);
  console.log(`\nQuery: ${q}`);
  console.log(`vector top ${vector.length}: ${vector.map((h) => `${h.document_id}#${h.id.split("#")[1]} (${Number(h.score).toFixed(3)})`).join(", ")}`);
  console.log(`full-text top ${fullText.length}: ${fullText.map((h) => `${h.document_id}#${h.id.split("#")[1]} (${Number(h.score).toFixed(3)})`).join(", ")}`);
  console.log("fused top 5 (RRF k=60):");
  fused.slice(0, 5).forEach((h, i) => {
    const preview = h.text.replace(/\s+/g, " ").slice(0, 110);
    console.log(`  ${i + 1}. ${h.rrf.toFixed(4)} [vec ${h.ranks[0] ?? "-"} | fts ${h.ranks[1] ?? "-"}] ${h.id} ${h.doc_type} ${h.well_id ?? "-"} ${h.date} ${h.section ? `"${h.section}" ` : ""}| ${preview}`);
  });
}
await sql.end();
