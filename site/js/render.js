/* View templates. Pure functions from data + state to HTML strings. */
import { esc, markdownToHtml } from "./markdown.js";
import { fmt } from "./player.js";

export const DOMAINS = [
  ["personal", "התפתחות אישית"],
  ["psychology", "פסיכולוגיה"],
  ["business", "עסקים"],
  ["money", "כסף"],
  ["productivity", "פרודוקטיביות"],
  ["relationships", "זוגיות"],
  ["parenting", "הורות"],
  ["health", "בריאות"],
  ["spirituality", "רוחניות"],
  ["philosophy", "פילוסופיה"],
  ["history", "היסטוריה"],
  ["science", "מדע"],
  ["biography", "ביוגרפיה"],
  ["fiction", "ספרות יפה"],
];

export const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 4h4v16H7zM13 4h4v16h-4z"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg>',
  share:
    '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="m10 6 6 6-6 6"/></svg>',
  back15: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg>',
  fwd30: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>',
};

export function minutes(sec) {
  if (!sec) return "";
  return `${Math.max(1, Math.round(sec / 60))} דק׳`;
}

export function card(ep, st) {
  const p = st.progress[ep.slug];
  const pct = p && ep.durationSec ? Math.min(100, (p.pos / ep.durationSec) * 100) : 0;
  const badge = !ep.audio
    ? '<span class="badge text">לקריאה</span>'
    : p?.done
      ? '<span class="badge done">הושמע</span>'
      : p && p.pos > 5
        ? '<span class="badge">באמצע</span>'
        : '<span class="badge">חדש</span>';
  return `<a class="card" href="#/book/${ep.slug}" aria-label="${esc(ep.title)}, ${esc(ep.author)}">
    <span class="tile-img"><img src="${ep.illustration}" alt="" loading="lazy">${badge}${pct > 0 && !p?.done ? `<span class="progress-line"><i style="width:${pct}%"></i></span>` : ""}</span>
    <span class="card-title">${esc(ep.title)}</span>
    <span class="card-author">${esc(ep.author)}</span>
    <span class="card-meta">${esc(ep.domainLabel)}${ep.durationSec ? `<i class="dot"></i>${minutes(ep.durationSec)}` : ""}</span>
  </a>`;
}

export function home(eps, st, stats) {
  const cont = eps
    .filter(
      (e) =>
        e.audio &&
        st.progress[e.slug] &&
        !st.progress[e.slug].done &&
        st.progress[e.slug].pos > 5,
    )
    .sort((a, b) => st.progress[b.slug].at - st.progress[a.slug].at)
    .slice(0, 3);
  const featured = eps.slice(0, 3);
  return `<section class="cover">
    <div class="cover-inner">
      <div class="cover-ornament"><img src="assets/icons/icon-512.png" alt=""></div>
      <h1 class="brand-title">PAGECAST</h1>
      <div class="en-title">Books, Narrated</div>
      <div class="sub-title">פודקאסט הספרים: תקציר עם מסר לכל ספר, בקריינות עברית</div>
      <div class="cover-tag">${stats.count} ספרים · ${stats.narrated} מוקראים · ${stats.minutes} דקות האזנה</div>
      <div class="cover-tiles">${featured.map((e) => `<a class="tile" href="#/book/${e.slug}"><span class="tile-img"><img src="${e.illustration}" alt=""></span><span class="tile-name">${esc(e.title)}</span><span class="tile-sub">${esc(e.author)}</span></a>`).join("")}</div>
      <div class="cover-actions"><a class="btn primary" href="#/library">${ICONS.book} לספרייה</a><a class="btn" href="#/paths">מסלולי האזנה</a></div>
    </div>
  </section>
  ${cont.length ? `<div class="section-title"><h2>המשך האזנה</h2><a href="#/library">לכל הספרים</a></div><div class="grid">${cont.map((e) => card(e, st)).join("")}</div>` : ""}
  <div class="section-title"><h2>הצטרפו לאחרונה</h2><a href="#/library">לכל הספרים</a></div>
  <div class="grid">${eps
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((e) => card(e, st))
    .join("")}</div>`;
}

export function library(eps, st, q) {
  const chips = [["", "הכול"], ...DOMAINS]
    .map(
      ([id, label]) =>
        `<button class="chip ${q.domain === id ? "on" : ""}" data-domain="${id}">${label}</button>`,
    )
    .join("");
  return `<div class="section-title"><h2>הספרייה</h2><span class="muted small">${eps.length} ספרים</span></div>
  <div class="toolbar">
    <div class="chips" role="radiogroup" aria-label="סינון לפי תחום">${chips}</div>
    <div class="sortrow"><span>${q.status === "unplayed" ? "רק מה שלא הושמע" : ""}</span>
      <label>מיון <select id="sort"><option value="newest" ${q.sort === "newest" ? "selected" : ""}>נוסף לאחרונה</option><option value="title" ${q.sort === "title" ? "selected" : ""}>לפי כותר</option><option value="duration" ${q.sort === "duration" ? "selected" : ""}>לפי משך</option><option value="unplayed" ${q.sort === "unplayed" ? "selected" : ""}>לא הושמע קודם</option></select></label>
    </div>
  </div>
  ${eps.length ? `<div class="grid">${eps.map((e) => card(e, st)).join("")}</div>` : `<div class="empty"><h3>לא נמצאו ספרים</h3><p>נסה תחום אחר או חיפוש אחר.</p></div>`}`;
}

export function favorites(eps, st) {
  return `<div class="section-title"><h2>מועדפים</h2></div>${eps.length ? `<div class="grid">${eps.map((e) => card(e, st)).join("")}</div>` : `<div class="empty"><h3>עדיין אין מועדפים</h3><p>לחץ על הלב בעמוד הספר כדי לשמור אותו כאן.</p></div>`}`;
}

export function transcript(ep, activeIdx, clickable) {
  if (ep.alignment && ep.alignment.length) {
    // Group sentences into paragraphs by matching them back to the script's blank lines.
    const paras = ep.script.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim());
    let pi = 0,
      consumed = "";
    const groups = [];
    let cur = [];
    ep.alignment.forEach(([s, e, text], i) => {
      cur.push(i);
      consumed += (consumed ? " " : "") + text;
      const target = paras[pi] || "";
      if (consumed.length >= target.length - 2 && pi < paras.length - 1) {
        groups.push(cur);
        cur = [];
        consumed = "";
        pi++;
      }
    });
    if (cur.length) groups.push(cur);
    return `<div class="transcript-note">${clickable ? "לחיצה על משפט מדלגת אליו. " : ""}המשפט המושמע מודגש.</div>
    <div class="transcript" id="transcript">${groups.map((g) => `<p>${g.map((i) => `<span class="s ${clickable ? "click" : ""} ${i === activeIdx ? "on" : ""}" data-i="${i}" data-t="${ep.alignment[i][0]}">${esc(ep.alignment[i][2])}</span> `).join("")}</p>`).join("")}</div>`;
  }
  return `<div class="transcript">${ep.script
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("")}</div>`;
}

export function book(ep, st, ps, tab) {
  const fav = st.favorites.includes(ep.slug);
  const p = st.progress[ep.slug];
  const done = !!p?.done;
  const isCur = ps.ep && ps.ep.slug === ep.slug;
  const resume = p && !done && p.pos > 5 && p.pos < (ep.durationSec || 0) - 5;
  const playLabel = !ep.audio
    ? "הקריינות בהכנה"
    : isCur && ps.playing
      ? "מנגן…"
      : resume
        ? `המשך · ${fmt(ep.durationSec - p.pos)} נותרו`
        : `השמע · ${minutes(ep.durationSec)}`;
  const tabs = [
    ["summary", "תקציר"],
    ["script", "תסריט"],
    ["takeaways", ep.kind === "fiction" ? "למחשבה" : "לקחת הביתה"],
    ["notes", "הערות שלי"],
  ];
  let body = "";
  if (tab === "summary") {
    body = `<div class="prose">${markdownToHtml(ep.summaryMd)}</div>
      ${ep.knowledgeToday ? `<div class="aside gold"><div class="k">מצב הידע היום</div><p>${esc(ep.knowledgeToday)}</p></div>` : ""}
      ${ep.caveat ? `<div class="aside"><div class="k">הסתייגות</div><p>${esc(ep.caveat)}</p></div>` : ""}`;
  } else if (tab === "script") {
    body = transcript(ep, isCur ? ps.activeIdx : -1, !!ep.audio);
  } else if (tab === "takeaways") {
    const ticks = st.ticks[ep.slug] || [];
    body = `<div class="transcript-note">${ep.kind === "fiction" ? "שלוש שאלות למחשבה." : "שלושה צעדים לשבוע הקרוב. סמן מה עשית."}</div>
      <div class="checklist">${ep.takeaways.map((t, i) => `<button class="check ${ticks[i] ? "on" : ""}" data-tick="${i}" role="checkbox" aria-checked="${!!ticks[i]}"><span class="box"></span><span class="txt">${esc(t)}</span></button>`).join("")}</div>`;
  } else {
    body = `<div class="notes"><textarea id="notes" placeholder="מה לקחת מהספר? מחשבות, קישור לחיים שלך…">${esc(st.notes[ep.slug] || "")}</textarea><div class="status" id="notes-status"></div></div>`;
  }
  return `<a class="crumb" href="#/library">${ICONS.back} לספרייה</a>
  <article class="book-frame">
    <span class="running-head">${esc(ep.domainLabel)}</span>
    <div class="book-hero">
      <div><div class="plate"><img src="${ep.illustration}" alt="איור מקורי לספר ${esc(ep.title)}"></div><div class="plate-caption">איור מקורי · לא הכריכה המקורית</div></div>
      <div class="book-head">
        <h1>${esc(ep.title)}</h1>
        ${ep.titleEn ? `<span class="en-title">${esc(ep.titleEn)}</span>` : ""}
        <div class="byline">${esc(ep.author)}${ep.year ? ` · ${ep.year}` : ""}${ep.kind === "fiction" ? " · ספרות" : ""}${ep.durationSec ? ` · ${minutes(ep.durationSec)}` : ""}</div>
        <blockquote class="message">${esc(ep.message)}</blockquote>
        <div class="book-actions">
          <button class="btn primary" id="btn-play" ${ep.audio ? "" : "disabled"}>${isCur && ps.playing ? ICONS.pause : ICONS.play} ${playLabel}</button>
          <button class="icon-btn ${fav ? "on" : ""}" id="btn-fav" aria-label="${fav ? "הסר ממועדפים" : "הוסף למועדפים"}" aria-pressed="${fav}">${ICONS.heart}</button>
          <button class="icon-btn ${done ? "on" : ""}" id="btn-done" aria-label="${done ? "סמן כלא הושמע" : "סמן כהושמע"}" aria-pressed="${done}">${ICONS.check}</button>
          <button class="icon-btn" id="btn-share" aria-label="שתף">${ICONS.share}</button>
          ${ep.audio ? `<button class="icon-btn" id="btn-offline" aria-label="שמור לאופליין" title="שמור לאופליין">${ICONS.download}</button>` : ""}
          <button class="icon-btn" id="btn-path" aria-label="הוסף למסלול" title="הוסף למסלול">${ICONS.plus}</button>
        </div>
      </div>
    </div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
    <div role="tabpanel" id="tabpanel">${body}</div>
  </article>`;
}

export function paths(st, eps) {
  const by = Object.fromEntries(eps.map((e) => [e.slug, e]));
  return `<div class="section-title"><h2>מסלולי האזנה</h2><button class="btn" id="btn-new-path">${ICONS.plus} מסלול חדש</button></div>
  <p class="muted small">מסלול הוא רשימה מסודרת של ספרים להאזנה רציפה, למשל "כסף למתחילים" או "לפני השינה".</p>
  ${
    st.paths.length
      ? `<div class="list">${st.paths
          .map((p) => {
            const items = p.slugs.map((s) => by[s]).filter(Boolean);
            const total = items.reduce((a, e) => a + (e.durationSec || 0), 0);
            return `<a class="row" href="#/path/${p.id}"><img src="${items[0]?.illustration || "assets/icons/emblem.svg"}" alt=""><span class="grow"><span class="t">${esc(p.name)}</span><br><span class="s">${items.length} ספרים${total ? ` · ${minutes(total)}` : ""}</span></span>${ICONS.back}</a>`;
          })
          .join("")}</div>`
      : `<div class="empty"><h3>עדיין אין מסלולים</h3><p>צור מסלול ראשון והוסף אליו ספרים מעמוד הספר.</p></div>`
  }`;
}

export function path(p, st, eps) {
  const by = Object.fromEntries(eps.map((e) => [e.slug, e]));
  const items = p.slugs.map((s) => by[s]).filter(Boolean);
  const playable = items.filter((e) => e.audio);
  return `<a class="crumb" href="#/paths">${ICONS.back} למסלולים</a>
  <div class="section-title"><h2 id="path-name">${esc(p.name)}</h2><span class="muted small">${items.length} ספרים</span></div>
  <div class="inline" style="margin-bottom:16px">
    <button class="btn primary" id="btn-play-path" ${playable.length ? "" : "disabled"}>${ICONS.play} השמע ברצף</button>
    <button class="btn ghost" id="btn-rename-path">שנה שם</button>
    <button class="btn danger" id="btn-delete-path">מחק מסלול</button>
  </div>
  ${items.length ? `<div class="list">${items.map((e, i) => `<div class="row"><img src="${e.illustration}" alt=""><a class="grow" href="#/book/${e.slug}"><span class="t">${esc(e.title)}</span><br><span class="s">${esc(e.author)}${e.durationSec ? ` · ${minutes(e.durationSec)}` : " · לקריאה"}</span></a><span class="ops"><button class="icon-btn" data-move="-1" data-slug="${e.slug}" aria-label="הזז למעלה" ${i === 0 ? "disabled" : ""}>${ICONS.up}</button><button class="icon-btn" data-move="1" data-slug="${e.slug}" aria-label="הזז למטה" ${i === items.length - 1 ? "disabled" : ""}>${ICONS.down}</button><button class="icon-btn" data-remove="${e.slug}" aria-label="הסר מהמסלול">${ICONS.x}</button></span></div>`).join("")}</div>` : `<div class="empty"><p>המסלול ריק. הוסף ספרים מעמוד הספר, בכפתור ＋.</p></div>`}`;
}

export function settings(st, info) {
  return `<div class="section-title"><h2>הגדרות</h2></div>
  <div class="settings-grid">
    <div class="setting"><h3>מראה</h3><p>כהה כברירת מחדל, כמו ספרייה בלילה.</p><div class="seg"><button data-theme="dark" class="${st.settings.theme === "dark" ? "on" : ""}">כהה</button><button data-theme="light" class="${st.settings.theme === "light" ? "on" : ""}">בהיר</button></div></div>
    <div class="setting"><h3>מהירות השמעה</h3><p>ברירת המחדל לפרקים חדשים.</p><div class="seg">${[0.8, 0.9, 1, 1.1, 1.25, 1.5].map((r) => `<button data-rate="${r}" class="${st.settings.rate === r ? "on" : ""}">${r}×</button>`).join("")}</div></div>
    <div class="setting"><h3>אופליין</h3><p>הטקסטים והאיורים נשמרים אוטומטית. הקריינות נשמרת בהשמעה ראשונה, או כולה כאן.</p><div class="inline"><button class="btn" id="btn-download-all">${ICONS.download} שמור את כל הקריינות (${info.audioMb} MB)</button><span class="small muted" id="download-status">${info.cached} מתוך ${info.narrated} שמורים</span></div></div>
    <div class="setting"><h3>סטטיסטיקות</h3><div class="kv"><span>ספרים בספרייה</span><b>${info.count}</b></div><div class="kv"><span>עם קריינות</span><b>${info.narrated}</b></div><div class="kv"><span>הושמעו עד הסוף</span><b>${info.done}</b></div><div class="kv"><span>דקות האזנה משוערות</span><b>${info.listened}</b></div><div class="kv"><span>גרסת תוכן</span><b class="en" style="letter-spacing:.04em">${esc(info.version)}</b></div></div>
    <div class="setting"><h3>גיבוי ההתקדמות</h3><p>מועדפים, הערות, סימונים ומסלולים נשמרים רק במכשיר הזה.</p><div class="inline"><button class="btn" id="btn-export">ייצא</button><label class="btn">ייבא<input type="file" id="import-file" accept="application/json" hidden></label></div></div>
    <div class="setting"><h3>אזור סכנה</h3><p>מוחק את ההתקדמות, ההערות והמסלולים במכשיר הזה. הספרים נשארים.</p><button class="btn danger" id="btn-reset">אפס נתונים</button></div>
  </div>`;
}

export function about(info) {
  return `<div class="section-title"><h2>אודות</h2></div>
  <div class="book-frame"><span class="running-head">PAGECAST</span>
  <div class="prose">
    <p><strong>PAGECAST</strong> הוא פודקאסט ספרים אישי: לכל ספר תקציר במילים שלנו, עם המסר שהמחבר התכוון אליו, תסריט קריינות שנכתב לאוזן, קריינות בעברית בקול אנושי, ואיור מקורי.</p>
    <p>התקצירים אינם תחליף לספרים ואינם מצטטים מהם. הם כתובים במילים שלנו, דעות מסומנות כדעות, ובספרים עם טענות מדעיות או כספיות מופיעה שורת "מצב הידע היום". הזכויות על הספרים שייכות למחבריהם ולמוציאים לאור.</p>
    <p>האפליקציה עובדת אופליין ואינה שולחת שום דבר לשום שרת. ההתקדמות, ההערות והמסלולים נשמרים במכשיר בלבד.</p>
    <p class="muted small">גרסת תוכן ${esc(info.version)} · ${info.count} ספרים · הקריינות הופקה עם ElevenLabs, האיורים הופקו במיוחד עבור הספרייה · © דודו טל</p>
  </div></div>`;
}

export function searchResults(eps) {
  if (!eps.length) return `<div class="muted small" style="padding:10px">לא נמצא.</div>`;
  return eps
    .slice(0, 12)
    .map(
      (e) =>
        `<a href="#/book/${e.slug}"><img src="${e.illustration}" alt=""><span><span class="t">${esc(e.title)}</span><br><span class="s">${esc(e.author)} · ${esc(e.domainLabel)}</span></span></a>`,
    )
    .join("");
}

export function playerBar(ps) {
  const ep = ps.ep;
  if (!ep) return "";
  const pct = ps.duration ? Math.min(100, (ps.time / ps.duration) * 100) : 0;
  return `<div class="player-inner">
    <div class="p-top">
      <a href="#/book/${ep.slug}"><img class="p-thumb" src="${ep.illustration}" alt=""></a>
      <a class="p-title" href="#/book/${ep.slug}"><div class="t">${esc(ep.title)}</div><div class="a">${esc(ep.author)}</div></a>
      <div class="p-wave" aria-hidden="true"><canvas id="wave"></canvas></div>
      <button class="icon-btn p-close" id="p-close" aria-label="סגור נגן">${ICONS.x}</button>
    </div>
    <div class="p-bar">
      <span class="p-time">${fmt(ps.time)}</span>
      <div class="p-range"><div class="track"></div><div class="fill" style="width:${pct}%"></div><div class="knob" style="inset-inline-start:calc(${pct}% - 7px)"></div><input type="range" id="p-seek" min="0" max="${ps.duration || 1}" step="0.5" value="${ps.time}" aria-label="מיקום בפרק"></div>
      <span class="p-time">-${fmt(Math.max(0, ps.duration - ps.time))}</span>
    </div>
    <div class="p-ctl">
      <button class="p-rate" id="p-rate" aria-label="מהירות">${ps.rate}×</button>
      <button class="icon-btn skip" id="p-back" aria-label="אחורה 15 שניות">${ICONS.back15}<span>15</span></button>
      <button class="icon-btn big" id="p-toggle" aria-label="${ps.playing ? "השהה" : "השמע"}">${ps.playing ? ICONS.pause : ICONS.play}</button>
      <button class="icon-btn skip" id="p-fwd" aria-label="קדימה 30 שניות">${ICONS.fwd30}<span>30</span></button>
      <span style="min-width:52px"></span>
    </div>
    ${ps.error ? `<div class="small" style="color:var(--red)">${esc(ps.error)}</div>` : ""}
  </div>`;
}
