import assert from "node:assert/strict";
import { test } from "node:test";
import { approxTokens, chunkDocument } from "./chunker";

const sentence = (i: number) => `Step ${i} checks the separator level, logs the reading and informs the Lead Operator.`;

test("a short document stays one chunk", () => {
  const body = "# Shift report\n\nAll wells online. Field oil 12,000 bbl/d.\n\nNo events.";
  const chunks = chunkDocument(body);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, body);
  assert.equal(chunks[0].section, null);
});

test("a procedure splits on ## headings and keeps section titles", () => {
  const section = (name: string) => `## ${name}\n\n${Array.from({ length: 12 }, (_, i) => sentence(i)).join(" ")}`;
  const body = ["# SOP-1 Test", section("Purpose"), section("Roles"), section("Steps")].join("\n\n");
  const chunks = chunkDocument(body);
  assert.deepEqual(chunks.map((c) => c.section), ["Purpose", "Roles", "Steps"]);
  assert.ok(chunks[1].text.startsWith("## Roles"));
  assert.deepEqual(chunks.map((c) => c.ordinal), [0, 1, 2]);
});

test("an oversized section splits on paragraphs without cutting a sentence", () => {
  const paragraphs = Array.from({ length: 6 }, (_, p) => Array.from({ length: 8 }, (_, i) => sentence(p * 10 + i)).join(" "));
  const body = `# SOP-2 Test\n\n## Response\n\n${paragraphs.join("\n\n")}`;
  const chunks = chunkDocument(body, 300);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.equal(c.section, "Response");
    assert.ok(c.tokens <= 300, `chunk of ${c.tokens} tokens`);
    assert.match(c.text.trim(), /[.:]$|^## Response$/);
  }
  const joined = chunks.map((c) => c.text).join(" ");
  for (let i = 0; i < 58; i += 10) assert.ok(joined.includes(sentence(i)));
  assert.equal(chunks.reduce((n, c) => n + c.text.split("Step ").length - 1, 0), 48);
  assert.ok(approxTokens(paragraphs[0]) < 300);
});
