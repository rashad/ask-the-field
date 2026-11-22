import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://opsrag:opsrag@localhost:5442/opsrag";

export const sql = postgres(DATABASE_URL, { onnotice: () => {} });
