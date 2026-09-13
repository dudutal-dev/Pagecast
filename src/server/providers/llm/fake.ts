import type { CompleteOptions, CompleteResult, LlmProvider } from "./types";

/**
 * Deterministic stand-in for Claude. Recognises the two prompts we use
 * (narration director, episode generation) by markers in the system prompt and
 * returns plausible output so the full UI flow runs offline.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly name = "fake" as const;

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const user = lastUserText(opts);
    let text: string;
    if (opts.system.includes("<<DIRECTOR>>"))
      text = fakeDirect(user, opts.system.includes("eleven_v3"));
    else if (opts.system.includes("<<GENERATE>>")) text = fakeGenerate(user);
    else if (opts.system.includes("<<IDENTIFY>>"))
      text = JSON.stringify({
        title: "ספר לדוגמה",
        author: "מחבר לדוגמה",
        confidence: 0.5,
      });
    else text = "OK";
    // Emulate streaming in a few pieces.
    if (opts.onDelta) {
      const step = Math.max(20, Math.ceil(text.length / 8));
      for (let i = 0; i < text.length; i += step) {
        await new Promise((r) => setTimeout(r, 30));
        opts.onDelta(text.slice(i, i + step));
      }
    }
    return {
      text,
      model: "fake",
      inputTokens: Math.ceil((opts.system.length + user.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      stopReason: "end_turn",
    };
  }
}

function lastUserText(opts: CompleteOptions): string {
  const m = [...opts.messages].reverse().find((x) => x.role === "user");
  if (!m) return "";
  if (typeof m.content === "string") return m.content;
  return m.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
}

/** Shorter sentences + a handful of tags, deterministic. */
export function fakeDirect(script: string, v3: boolean): string {
  const body =
    script.replace(/^[\s\S]*?<script>|<\/script>[\s\S]*$/g, "").trim() || script;
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  return paragraphs
    .map((p, i) => {
      let out = p.replace(/\s[—–-]\s/g, ", ").replace(/;/g, ".");
      if (v3) {
        if (i === 0) out = `[warm] ${out}`;
        if (i === paragraphs.length - 1) out = `[softly] ${out}`;
        if (i > 0 && i % 3 === 0) out = `[pause] ${out}`;
      }
      return out;
    })
    .join("\n\n");
}

function fakeGenerate(user: string): string {
  const title = /כותר[:\s]+"?([^"\n]+)"?/.exec(user)?.[1]?.trim() ?? "ספר לדוגמה";
  const author = /מחבר[:\s]+"?([^"\n]+)"?/.exec(user)?.[1]?.trim() ?? "מחבר לדוגמה";
  if (/unknownbook/i.test(user))
    return JSON.stringify({ unknown: true, reason: "לא מצאתי ספר בשם הזה" });
  return JSON.stringify({
    title,
    author,
    year: 2020,
    domain: "personal",
    kind: "nonfiction",
    message: `המסר של ${title} במשפט אחד: שינוי קטן ועקבי מנצח החלטה גדולה חד-פעמית.`,
    summaryMd: `**המסר במשפט אחד:** שינוי קטן ועקבי מנצח החלטה גדולה חד-פעמית.\n\n**על מה הספר:** ${title} של ${author} הוא ספר לדוגמה שנוצר על ידי ספק מדומה.\n\n**הרעיונות המרכזיים:**\n1. **רעיון ראשון.** הסבר קצר.\n2. **רעיון שני.** הסבר קצר.\n3. **רעיון שלישי.** הסבר קצר.\n\n**למי מתאים:** למי שרוצה לבדוק את האפליקציה. **למי פחות:** למי שמצפה לתוכן אמיתי.\n\n**הסתייגות:** להערכתי, זהו טקסט דמה.\n\n**המשפט שנשאר:** קטן, עקבי, כל יום.`,
    script: `שלום, וברוכים הבאים. היום נדבר על ${title}, של ${author}. והמשפט שאני רוצה שתצאו איתו הוא זה: שינוי קטן ועקבי מנצח החלטה גדולה.\n\nהרעיון הראשון. שינוי קטן. כשעושים משהו קטן כל יום, הוא מצטבר.\n\nהרעיון השני. עקביות. לא צריך להיות מושלם. צריך להיות שם.\n\nעכשיו, כמו בכל ספר, יש גם ביקורת. לדעתי, זה טקסט דמה.\n\nאז אם לוקחים משהו אחד מהספר, זה זה: קטן, עקבי, כל יום. תודה שהאזנתם.`,
    takeaways: ["בחר הרגל אחד קטן לשבוע.", "הצמד אותו להרגל קיים.", "סמן כל יום שעשית."],
    caveat: "להערכתי, זהו טקסט דמה שנוצר לבדיקות.",
    knowledgeToday: null,
  });
}
