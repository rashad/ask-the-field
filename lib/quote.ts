const MIN_QUOTE = 20;
const MAX_QUOTE = 300;

function normalize(raw: string) {
  let text = "";
  const map: number[] = [];
  let lineStart = true;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (lineStart && c === "#") {
      let j = i;
      while (raw[j] === "#") j++;
      if (raw[j] === " ") {
        i = j;
        continue;
      }
    }
    if (c === "\n") lineStart = true;
    else if (c !== " " && c !== "\t") lineStart = false;
    if (c === "*" || c === "`") continue;
    if (/\s|\|/.test(c)) {
      if (text && !text.endsWith(" ")) {
        text += " ";
        map.push(i);
      }
      continue;
    }
    const lower = c.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase();
    text += lower.length === 1 ? lower : c;
    map.push(i);
  }
  return { text, map };
}

const wordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

export function findQuote(chunk: string, quote: string | null | undefined): [number, number] | null {
  if (!quote) return null;
  const q = normalize(quote).text.trim();
  if (!q || q.length > MAX_QUOTE) return null;
  if (q.length < MIN_QUOTE && !chunk.split("\n").some((line) => line.includes("|") && normalize(line).text.trim() === q)) return null;
  const n = normalize(chunk);
  for (let at = n.text.indexOf(q); at >= 0; at = n.text.indexOf(q, at + 1)) {
    const end = at + q.length;
    if (wordChar(n.text[at - 1]) && wordChar(q[0])) continue;
    if (wordChar(n.text[end]) && wordChar(q.at(-1))) continue;
    return [n.map[at], n.map[end - 1] + 1];
  }
  return null;
}
