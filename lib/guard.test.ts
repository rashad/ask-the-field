import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp, crossSite, readBody } from "./guard";

test("client IP comes from X-Real-IP only behind a trusted proxy", () => {
  const h = new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7, 198.51.100.4" });
  assert.equal(clientIp(h, true), "198.51.100.4");
  assert.equal(clientIp(h, false), "shared");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" }), true), "shared");
});

const post = (body: BodyInit, headers: Record<string, string> = {}) => new Request("http://x/api/ask", { method: "POST", body, headers, duplex: "half" } as RequestInit);
const chunked = (parts: string[]) => new ReadableStream({ start(c) { for (const p of parts) c.enqueue(new TextEncoder().encode(p)); c.close(); } });

test("readBody returns the text under the cap", async () => {
  assert.equal(await readBody(post('{"question":"hi there"}'), 2048), '{"question":"hi there"}');
});

test("readBody stops at the cap without a content-length", async () => {
  let pulled = 0;
  const endless = new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(1000)); } });
  assert.equal(await readBody(post(endless), 2048), null);
  assert.ok(pulled < 10);
  assert.equal(await readBody(post(chunked(["a".repeat(1500), "b".repeat(1500)])), 2048), null);
});

test("readBody rejects a large content-length before it reads", async () => {
  assert.equal(await readBody(post("x", { "content-length": "999999" }), 2048), null);
});

test("crossSite rejects other sites and keeps same-origin and server callers", () => {
  const h = (o: Record<string, string>) => crossSite(new Headers({ host: "app.example", ...o }));
  assert.equal(h({}), false);
  assert.equal(h({ "sec-fetch-site": "same-origin", origin: "https://app.example" }), false);
  assert.equal(h({ "sec-fetch-site": "none" }), false);
  assert.equal(h({ "sec-fetch-site": "same-site" }), true);
  assert.equal(h({ "sec-fetch-site": "cross-site" }), true);
  assert.equal(h({ origin: "https://evil.example" }), true);
  assert.equal(h({ origin: "not a url" }), true);
  assert.equal(h({ origin: "https://edge.example", "x-forwarded-host": "edge.example" }), false);
  process.env.SITE_URL = "https://site.example/path";
  try {
    assert.equal(h({ origin: "https://site.example" }), false);
  } finally {
    delete process.env.SITE_URL;
  }
});
