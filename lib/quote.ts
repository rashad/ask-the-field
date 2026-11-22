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

export function findQuote(chunk: string, quote: string | null | undefined): [number, number] | null {
  if (!quote) return null;
  const q = normalize(quote).text.trim();
  if (q.length < MIN_QUOTE || q.length > MAX_QUOTE) return null;
  const n = normalize(chunk);
  const at = n.text.indexOf(q);
  if (at < 0) return null;
  return [n.map[at], n.map[at + q.length - 1] + 1];
}
