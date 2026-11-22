import { Suspense } from "react";
import { Ask } from "./ask";

export default function Home() {
  return (
    <Suspense>
      <Ask />
    </Suspense>
  );
}
