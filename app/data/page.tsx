import { Suspense } from "react";
import { DataView } from "./data-view";

export default function DataPage() {
  return (
    <Suspense>
      <DataView />
    </Suspense>
  );
}
