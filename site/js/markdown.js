/* Tiny, safe Markdown → HTML for our own summaries: paragraphs, headings, bold, italic, lists. */
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function inline(text) {
  let out = "";
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    out += esc(text.slice(last, m.index)).replace(/\n/g, "<br>");
    const tok = m[0];
    if (tok.startsWith("**")) out += `<strong>${esc(tok.slice(2, -2))}</strong>`;
    else if (tok.startsWith("`")) out += `<code>${esc(tok.slice(1, -1))}</code>`;
    else out += `<em>${esc(tok.slice(1, -1))}</em>`;
    last = m.index + tok.length;
  }
  out += esc(text.slice(last)).replace(/\n/g, "<br>");
  return out;
}

export function markdownToHtml(md) {
  const lines = String(md || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const html = [];
  let para = [];
  let list = null;
  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join("\n"))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list)
      html.push(
        `<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`,
      );
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
      const lvl = Math.min(h[1].length + 1, 4);
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (ol || ul) {
      flushPara();
      const type = ol ? "ol" : "ul";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((ol || ul)[1]);
      continue;
    }
    if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += " " + line.trim();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return html.join("");
}

export { esc };
