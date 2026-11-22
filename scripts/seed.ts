import { readFileSync } from "node:fs";
import { sql } from "../lib/db";
import { generate } from "../lib/synth";

const { wells, production, events } = generate();

await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
await sql.begin(async (tx) => {
  await tx`TRUNCATE production_daily, events`;
  const update = Object.keys(wells[0]).filter((c) => c !== "well_id").map((c) => `${c} = excluded.${c}`).join(", ");
  await tx`INSERT INTO wells ${tx(wells)} ON CONFLICT (well_id) DO UPDATE SET ${tx.unsafe(update)}`;
  for (let i = 0; i < production.length; i += 5000) {
    await tx`INSERT INTO production_daily ${tx(production.slice(i, i + 5000))}`;
  }
  await tx`INSERT INTO events ${tx(events)}`;
});

const [open] = await sql`SELECT count(*)::int AS n FROM events WHERE category = 'incident' AND status = 'open'`;
console.log(`wells=${wells.length} production_rows=${production.length} events=${events.length} open_incidents=${open.n}`);
await sql.end();
