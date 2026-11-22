export const EMBEDDING_MODEL = "voyage-4";
export const EMBEDDING_DIM = 1024;

export async function embed(inputs: string[], inputType: "document" | "query"): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set (run through `sec opsrag ...`)");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: inputs, model: EMBEDDING_MODEL, input_type: inputType, output_dimension: EMBEDDING_DIM }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 30) {
      const wait = res.status === 429 ? 30 : 5;
      console.warn(`voyage ${res.status}, retrying in ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`voyage ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

export const toVector = (v: number[]) => `[${v.join(",")}]`;
