import { readFileSync } from "node:fs";
import { sql } from "../lib/db";
import { generate } from "../lib/synth";

const { wells, production, events } = generate();

await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
await sql.begin(async (tx) => {
  await tx`TRUNCATE production_daily, events, wells CASCADE`;
  await tx`INSERT INTO wells ${tx(wells)}`;
  for (let i = 0; i < production.length; i += 5000) {
    await tx`INSERT INTO production_daily ${tx(production.slice(i, i + 5000))}`;
  }
  await tx`INSERT INTO events ${tx(events)}`;
});

const [open] = await sql`SELECT count(*)::int AS n FROM events WHERE category = 'incident' AND status = 'open'`;
console.log(`wells=${wells.length} production_rows=${production.length} events=${events.length} open_incidents=${open.n}`);
await sql.end();
