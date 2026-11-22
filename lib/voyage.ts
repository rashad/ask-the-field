import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const EMBEDDING_MODEL = "voyage-4";
export const EMBEDDING_DIM = 1024;

const QUERY_CACHE = "data/cache/query-vectors.json";
const QUERY_TIMEOUT_MS = 8000;

async function request(inputs: string[], inputType: "document" | "query", signal?: AbortSignal) {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set (run through `sec opsrag ...`)");
  return fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: inputs, model: EMBEDDING_MODEL, input_type: inputType, output_dimension: EMBEDDING_DIM }),
    signal,
  });
}

async function vectors(res: Response) {
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embed(inputs: string[], inputType: "document" | "query"): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    const res = await request(inputs, inputType);
    if (res.ok) return vectors(res);
    if ((res.status === 429 || res.status >= 500) && attempt < 30) {
      const wait = res.status === 429 ? 30 : 5;
      console.warn(`voyage ${res.status}, retrying in ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`voyage ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

const queryCache = new Map<string, number[]>(existsSync(QUERY_CACHE) ? Object.entries(JSON.parse(readFileSync(QUERY_CACHE, "utf8"))) : []);
const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

// One attempt with a short timeout: a question should fall back to full text rather than wait on a rate limit.
export async function embedQuery(query: string): Promise<number[] | null> {
  const key = normalize(query);
  const hit = queryCache.get(key);
  if (hit) return hit;
  try {
    const res = await request([query], "query", AbortSignal.timeout(QUERY_TIMEOUT_MS));
    if (!res.ok) {
      console.warn(`voyage ${res.status}, full text only`);
      return null;
    }
    const [vec] = await vectors(res);
    queryCache.set(key, vec);
    return vec;
  } catch (err) {
    console.warn(`voyage failed (${(err as Error).name}), full text only`);
    return null;
  }
}

export function saveQueryCache() {
  writeFileSync(QUERY_CACHE, JSON.stringify(Object.fromEntries(queryCache)) + "\n");
}

export const toVector = (v: number[]) => `[${v.join(",")}]`;
