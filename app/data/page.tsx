import { Suspense } from "react";
import { DataView } from "./data-view";

export default function DataPage() {
  return (
    <div className="page">
      <Suspense>
        <DataView />
      </Suspense>
    </div>
  );
}
