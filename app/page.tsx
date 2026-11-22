import { connection } from "next/server";
import { Suspense } from "react";
import { morning } from "@/lib/morning";
import { Ask } from "./ask";

async function WithMorning() {
  await connection();
  const m = await morning().catch((err) => (console.error("morning snapshot failed:", err.message), null));
  return <Ask morning={m} />;
}

export default function Home() {
  return (
    <Suspense>
      <WithMorning />
    </Suspense>
  );
}
