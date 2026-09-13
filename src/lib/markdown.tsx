import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown renderer for our own summaries: paragraphs,
 * headings (#, ##, ###), **bold**, *italic*, ordered/unordered lists, and
 * line breaks. No raw HTML, no links to external scripts, no images. Output is
 * React elements, so nothing is ever injected as HTML.
 */

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 2 | 3 | 4; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = (Math.min(h[1]!.length + 1, 4) as 2 | 3 | 4) ?? 2;
      blocks.push({ type: "h", level, text: h[2]! });
      continue;
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (ol || ul) {
      flushPara();
      const type = ol ? "ol" : "ul";
      const item = (ol ?? ul)![1]!;
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(item);
      continue;
    }
    if (list && /^\s{2,}/.test(raw)) {
      // continuation of a list item
      list.items[list.items.length - 1] += " " + line.trim();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Inline: **bold**, *italic*, `code`. */
export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(withBreaks(text.slice(last, m.index), k++));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`"))
      out.push(
        <code key={k++} className="rounded bg-surface-2 px-1 text-[0.9em]">
          {tok.slice(1, -1)}
        </code>,
      );
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(withBreaks(text.slice(last), k++));
  return out;
}

function withBreaks(text: string, key: number): ReactNode {
  const parts = text.split("\n");
  if (parts.length === 1) return <Fragment key={key}>{text}</Fragment>;
  return (
    <Fragment key={key}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {p}
        </Fragment>
      ))}
    </Fragment>
  );
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`prose-he ${className}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4";
            return <Tag key={i}>{renderInline(b.text)}</Tag>;
          }
          case "ul":
            return (
              <ul key={i} className="list-disc">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            );
          default:
            return <p key={i}>{renderInline(b.text)}</p>;
        }
      })}
    </div>
  );
}
