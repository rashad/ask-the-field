export interface Chunk {
  ordinal: number;
  section: string | null;
  text: string;
  tokens: number;
}

export const SHORT_DOC_TOKENS = 600;

export const approxTokens = (s: string) => Math.ceil(s.length / 4);

function sentences(paragraph: string): string[] {
  return paragraph
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9*("\[])/))
    .filter((s) => s.trim());
}

function pack(units: string[], sep: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const u of units) {
    const next = cur ? cur + sep + u : u;
    if (cur && approxTokens(next) > max) {
      out.push(cur);
      cur = u;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

function splitSection(text: string, max: number): string[] {
  if (approxTokens(text) <= max) return [text];
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const units = paragraphs.flatMap((p) => (approxTokens(p) <= max ? [p] : pack(sentences(p), "\n", max)));
  return pack(units, "\n\n", max);
}

export function chunkDocument(body: string, max = 500): Chunk[] {
  const text = body.trim();
  if (approxTokens(text) <= Math.max(max, SHORT_DOC_TOKENS)) return [{ ordinal: 0, section: null, text, tokens: approxTokens(text) }];

  const title = text.match(/^#\s+(.+)$/m)?.[1].trim() ?? null;
  const parts = text.split(/^(?=## )/m);
  const sections = parts.map((part) => {
    const heading = part.match(/^## (.+)$/m);
    return { section: heading && part.startsWith("## ") ? heading[1].trim() : title, text: part.trim() };
  });

  const chunks: Chunk[] = [];
  for (const s of sections) {
    if (!s.text || /^#\s+[^\n]*$/.test(s.text)) continue;
    for (const piece of splitSection(s.text, max)) {
      chunks.push({ ordinal: chunks.length, section: s.section, text: piece, tokens: approxTokens(piece) });
    }
  }
  return chunks;
}
