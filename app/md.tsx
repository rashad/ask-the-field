import { Fragment, type ReactNode } from "react";

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const OPEN = "\uE000";
const CLOSE = "\uE001";

// Each line of the span gets its own open/close pair so block parsing never sees a span cross a line.
function withSpan(text: string, span?: [number, number] | null) {
  if (!span) return text;
  const [a, b] = span;
  return text.slice(0, a) + OPEN + text.slice(a, b).split("\n").join(`${CLOSE}\n${OPEN}`) + CLOSE + text.slice(b);
}

const MARKS = /[\uE000\uE001]/g;
// A span edge outside a row's outer pipes would break the table: move it inside them.
const insidePipes = (line: string) => line.replace(/^(\s*)\uE000(\s*\|)/, "$1$2\uE000").replace(/(\|\s*)\uE001(\s*)$/, "\uE001$1$2");

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r/g, "").split("\n").map(insidePipes);
  for (let i = 0; i < lines.length; i++) {
    const lead = lines[i].trimStart().startsWith(OPEN) ? OPEN : "";
    const line = lead ? lines[i].replace(OPEN, "") : lines[i];
    const t = line.trim();
    const last = blocks.at(-1);
    if (!t.replaceAll(OPEN, "").replaceAll(CLOSE, "")) {
      blocks.push({ kind: "p", lines: [] });
      continue;
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: "h", level: h[1].length, text: lead + h[2] });
      continue;
    }
    if (t.startsWith("|") && lines[i + 1]?.replace(MARKS, "").trim().match(/^\|?\s*:?-{2,}/)) {
      const table: Block = { kind: "table", head: cells(t), rows: [] };
      if (lead) table.head[0] = lead + table.head[0];
      i += 2;
      for (let r = lines[i]?.trim() ?? ""; i < lines.length && (r.startsWith("|") || r.startsWith(OPEN + "|")); r = lines[++i]?.trim() ?? "") {
        const open = r.startsWith(OPEN);
        const row = cells(open ? r.slice(1) : r);
        if (open) row[0] = OPEN + row[0];
        table.rows.push(row);
      }
      i--;
      blocks.push(table);
      continue;
    }
    const li = t.match(/^(?:([-*])|(\d+)[.)])\s+(.*)$/);
    if (li) {
      const kind = li[1] ? "ul" : "ol";
      if (last?.kind === kind) last.items.push(lead + li[3]);
      else blocks.push({ kind, items: [lead + li[3]] });
      continue;
    }
    if (/^\s{2,}\S/.test(line) && (last?.kind === "ul" || last?.kind === "ol")) {
      last.items[last.items.length - 1] += ` ${lead}${t}`;
      continue;
    }
    if (last?.kind === "p") last.lines.push(lead + t);
    else blocks.push({ kind: "p", lines: [lead + t] });
  }
  return blocks.filter((b) => b.kind !== "p" || b.lines.length);
}

function marked(text: string, st: { on: boolean }): ReactNode[] {
  return text.split(/([\uE000\uE001])/).flatMap((part, i) => {
    if (part === OPEN || part === CLOSE) {
      st.on = part === OPEN;
      return [];
    }
    return part ? [st.on ? <mark key={i}>{part}</mark> : part] : [];
  });
}

function inline(text: string, st = { on: false }): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{marked(part.slice(2, -2), st)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{marked(part.slice(1, -1), st)}</code>;
    return <Fragment key={i}>{marked(part, st)}</Fragment>;
  });
}

export function Md({ text, span, skipTitle }: { text: string; span?: [number, number] | null; skipTitle?: boolean }) {
  const blocks = parse(withSpan(text, span));
  if (skipTitle && blocks[0]?.kind === "h" && blocks[0].level === 1) blocks.shift();
  return (
    <div className="md body-6">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} className={b.level <= 1 ? "md-h1 body-4" : "md-h body-5"}>{inline(b.text)}</p>;
        if (b.kind === "p")
          return (
            <p key={i}>
              {b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}
            </p>
          );
        if (b.kind === "table")
          return (
            <div key={i} className="md-table">
              <table>
                <thead><tr>{(() => { const st = { on: false }; return b.head.map((c, j) => <th key={j}>{inline(c, st)}</th>); })()}</tr></thead>
                <tbody>{b.rows.map((r, j) => { const st = { on: false }; return <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c, st)}</td>)}</tr>; })}</tbody>
              </table>
            </div>
          );
        const List = b.kind;
        return <List key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</List>;
      })}
    </div>
  );
}
