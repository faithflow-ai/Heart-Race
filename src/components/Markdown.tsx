import { Fragment, type ReactNode } from "react";

/** Inline markup: **bold**, *italic*, `code`. */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<b key={k++}>{inline(t.slice(2, -2))}</b>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else out.push(<i key={k++}>{inline(t.slice(1, -1))}</i>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/**
 * A small Markdown renderer for the app's own lesson and scenario text (headings, paragraphs,
 * lists, tables, quote blocks). Quote blocks are instructor notes: shown only when `notes` is true.
 */
export function Markdown({ text, notes = false }: { text: string; notes?: boolean }) {
  const blocks = text.split(/\n\s*\n/);
  const out: ReactNode[] = [];
  blocks.forEach((b, i) => {
    const lines = b.split("\n");
    if (lines.every((l) => l.startsWith(">"))) {
      if (notes) out.push(<div key={i} className="notice info small"><b>Instructor only. </b><Markdown text={lines.map((l) => l.replace(/^> ?/, "")).join("\n").replace(/^Instructor note:\s*/i, "")} /></div>);
      return;
    }
    const rows: ReactNode[] = [];
    let j = 0;
    while (j < lines.length) {
      const l = lines[j];
      if (l.startsWith("### ")) {
        rows.push(<h4 key={j} style={{ margin: "12px 0 4px" }}>{inline(l.slice(4))}</h4>);
        j++;
      } else if (l.startsWith("|")) {
        const tbl: string[] = [];
        while (j < lines.length && lines[j].startsWith("|")) tbl.push(lines[j++]);
        const head = cells(tbl[0]);
        const body = tbl.slice(tbl[1] && /^\|[\s:|-]+\|?$/.test(tbl[1]) ? 2 : 1).map(cells);
        rows.push(
          <div className="scroll" key={j}>
            <table>
              <thead><tr>{head.map((c, x) => <th key={x}>{inline(c)}</th>)}</tr></thead>
              <tbody>{body.map((r, y) => <tr key={y}>{r.map((c, x) => <td key={x}>{inline(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>,
        );
      } else if (/^(- |\d+\. )/.test(l)) {
        const ordered = /^\d+\. /.test(l);
        const items: string[] = [];
        while (j < lines.length && /^(- |\d+\. )/.test(lines[j])) items.push(lines[j++].replace(/^(- |\d+\. )/, ""));
        const kids = items.map((t, x) => <li key={x}>{inline(t)}</li>);
        rows.push(ordered ? <ol key={j}>{kids}</ol> : <ul key={j}>{kids}</ul>);
      } else {
        const para: string[] = [];
        while (j < lines.length && !/^(- |\d+\. |\||### )/.test(lines[j])) para.push(lines[j++]);
        rows.push(<p key={j}>{inline(para.join(" "))}</p>);
      }
    }
    out.push(<Fragment key={i}>{rows}</Fragment>);
  });
  return <>{out}</>;
}
