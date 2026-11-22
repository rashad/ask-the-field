import { Fragment, type ReactNode } from "react";

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    const last = blocks.at(-1);
    if (!t) {
      blocks.push({ kind: "p", lines: [] });
      continue;
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: "h", level: h[1].length, text: h[2] });
      continue;
    }
    if (t.startsWith("|") && lines[i + 1]?.trim().match(/^\|?\s*:?-{2,}/)) {
      const table: Block = { kind: "table", head: cells(t), rows: [] };
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) table.rows.push(cells(lines[i++]));
      i--;
      blocks.push(table);
      continue;
    }
    const li = t.match(/^(?:([-*])|(\d+)[.)])\s+(.*)$/);
    if (li) {
      const kind = li[1] ? "ul" : "ol";
      if (last?.kind === kind) last.items.push(li[3]);
      else blocks.push({ kind, items: [li[3]] });
      continue;
    }
    if (/^\s{2,}\S/.test(line) && (last?.kind === "ul" || last?.kind === "ol")) {
      last.items[last.items.length - 1] += ` ${t}`;
      continue;
    }
    if (last?.kind === "p") last.lines.push(t);
    else blocks.push({ kind: "p", lines: [t] });
  }
  return blocks.filter((b) => b.kind !== "p" || b.lines.length);
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function Md({ text, mark, skipTitle }: { text: string; mark?: (line: string) => boolean; skipTitle?: boolean }) {
  const blocks = parse(text);
  if (skipTitle && blocks[0]?.kind === "h" && blocks[0].level === 1) blocks.shift();
  const m = (line: string, node: ReactNode) => (mark?.(line) ? <mark>{node}</mark> : node);
  return (
    <div className="md body-6">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} className={b.level <= 1 ? "md-h1 body-4" : "md-h body-5"}>{inline(b.text)}</p>;
        if (b.kind === "p")
          return (
            <p key={i}>
              {b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{m(l, inline(l))}</Fragment>)}
            </p>
          );
        if (b.kind === "table")
          return (
            <div key={i} className="md-table">
              <table>
                <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j} className={mark?.(r.join(" ")) ? "hl" : undefined}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        const List = b.kind;
        return <List key={i}>{b.items.map((it, j) => <li key={j}>{m(it, inline(it))}</li>)}</List>;
      })}
    </div>
  );
}
