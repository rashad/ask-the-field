import { sql } from "./db";

// Created here, not in db/schema.sql: production loads a dump, so seed never runs there.
let ready: Promise<unknown> | undefined;

export function logAsk(question: string, outcome: string, cached: boolean) {
  ready ??= sql`CREATE TABLE IF NOT EXISTS ask_log (
    id         bigserial PRIMARY KEY,
    at         timestamptz NOT NULL DEFAULT now(),
    question   text NOT NULL,
    outcome    text NOT NULL,
    cached     boolean NOT NULL
  )`;
  ready
    .then(() => sql`INSERT INTO ask_log (question, outcome, cached) VALUES (${question}, ${outcome}, ${cached})`)
    .catch((err) => {
      ready = undefined;
      console.error("ask_log failed:", (err as Error).message);
    });
}
