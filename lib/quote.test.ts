import assert from "node:assert/strict";
import { test } from "node:test";
import { findQuote } from "./quote";

const doc = "# Work order\n\n| Field | Detail |\n|---|---|\n| WO number | WO-048 |\n| Event reference | EV-0094 (ESP trip) |\n\n## Findings\n- **Cause:** Teardown found motor winding   insulation breakdown.\n";

test("matches across bold, pipes, whitespace and case", () => {
  const span = findQuote(doc, "Cause: teardown found motor winding insulation breakdown.");
  assert.ok(span);
  assert.equal(doc.slice(...span), "Cause:** Teardown found motor winding   insulation breakdown.");
  assert.equal(doc.slice(...findQuote(doc, "| Event reference | EV-0094 (ESP trip) |")!), "Event reference | EV-0094 (ESP trip)");
});

test("rejects paraphrase and too-short quotes", () => {
  assert.equal(findQuote(doc, "Teardown showed the motor insulation had broken down."), null);
  assert.equal(findQuote(doc, "motor"), null);
  assert.equal(findQuote(doc, null), null);
});
