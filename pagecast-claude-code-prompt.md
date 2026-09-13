# Pagecast — פרומפט בנייה ל-Claude Code

## שם האפליקציה
**Pagecast** — "podcast of pages". ריפו: `pagecast`. חלופות אם תפוס: `Bookwave`, `Marginalia`.

---

## שלב 0 — הכנת הספרייה המקומית (לפני הפרומפט)

```bash
mkdir pagecast && cd pagecast
git init
mkdir -p .claude/skills
# העתק לכאן את הסקילים (unzip של קובצי ה-.skill):
#   .claude/skills/book-message-expert/
#   .claude/skills/ui-ux-pro-max/
#   .claude/skills/app-builder/
#   .claude/skills/hebrew-tts-expert/
#   .claude/skills/generic-application-validation/
cat > .env.local << 'ENV'
ELEVENLABS_API_KEY=sk_...
ANTHROPIC_API_KEY=sk-ant-...
ENV
printf ".env*\nnode_modules\n.next\ndata/\n*.mp3\n" > .gitignore
claude
```

בתוך Claude Code — הדבק את הפרומפט שמתחת לקו.

---

## הפרומפט

אתה בונה עבורי אפליקציה מלאה בשם **Pagecast** — פודקאסט ספרים אישי: ספרייה של תקצירי ספרים עם מסר, שכל אחד מהם הוא "פרק" עם טקסט, תסריט קריינות, הקראה בקול אנושי של אישה (ElevenLabs), כריכה/איור, ופלייליסטים. עברית RTL, מותאם לנייד קודם כל, מעוצב ברמה של אפליקציה מסחרית מובילה. זו אמורה להיות האפליקציה המושלמת שלך — קח את הזמן, אל תקצר.

### לפני שאתה כותב שורת קוד
1. הרץ `/init` וכתוב `CLAUDE.md` שמסכם את ההנחיות האלה, את הסטאק ואת מוסכמות הפרויקט.
2. קרא במלואם את הסקילים ב-`.claude/skills/`: `book-message-expert` (המומחיות לתוכן, הפורמטים, מודל הנתונים ואפיון האפליקציה ב-`references/podcast-app-spec.md` — זה הבסיס), `ui-ux-pro-max` (עיצוב), `app-builder` (ארכיטקטורה ובדיקות), `hebrew-tts-expert` (עיבוד עברית ל-TTS), `generic-application-validation` (QA לפני מסירה).
3. הצג לי תוכנית (`/plan`): ארכיטקטורה, מבנה תיקיות, מסכים, סדר בנייה ב-6 אבני דרך. חכה לאישור שלי.

### סטאק (קבוע)
- **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4**, PWA (manifest + service worker, "הוסף למסך הבית", עובד אופליין לפרקים שכבר הופקו).
- **Backend בתוך Next (Route Handlers)** — מפתחות ה-API יושבים רק בשרת (`.env.local`), לעולם לא בקליינט ולעולם לא ב-git. ראוט `/api/tts` מפנה ל-ElevenLabs, ראוט `/api/generate` מפנה ל-Anthropic.
- **SQLite** דרך `better-sqlite3` + Drizzle ORM (קובץ `data/pagecast.db`), קובצי MP3 ב-`data/audio/`. שני אלה ב-`.gitignore`. סקריפט `npm run backup` שמייצא JSON + zip של האודיו.
- ספריות: `zustand` (state), `framer-motion` (אנימציות), `lucide-react` (אייקונים), `zod` (ולידציה), `@anthropic-ai/sdk`. גופנים: **Heebo** לעברית, **Inter** לאנגלית, דרך `next/font`.
- `npm run dev` להרצה מקומית; המבנה חייב לאפשר deploy ל-Vercel בעתיד רק עם משתני סביבה (אודיו יעבור ל-Blob storage — תכנן abstraction `StorageProvider` עם מימוש local-fs עכשיו).

### הקול — הדרישה החשובה ביותר
- ספק: **ElevenLabs**, מודל **`eleven_v3`** (expressive; אם לא זמין לחשבון — `eleven_multilingual_v2`). קול **אישה, אנושי, חם, מספרת סיפורים** — לא רדיופוני, לא "קריינית חדשות". הקול צריך להעביר את התוכן בצורה מעניינת ומרתקת: שינויי טון, השהיות דרמטיות, חיוך שנשמע.
- בשלב ההקמה: בנה ראוט `/api/voices` שמושך את רשימת הקולות מהחשבון, מסנן נשים עם תמיכה בעברית/multilingual, ומסך **"בחירת קול"** בהגדרות שמפיק דוגמה של 20 שניות בעברית מפסקה קבועה (טקסט דוגמה מסופק בסקיל, קטע מ"אדם מחפש משמעות") לכל קול מועמד — כדי שאבחר בהאזנה. שמור `voiceId` נבחר ב-DB. הצע לי 3 קולות מומלצים אחרי שהאזנת לפרמטרים (תיאור הקול, labels: female, narrative, warm).
- הגדרות ברירת מחדל: `stability 0.4`, `similarity_boost 0.8`, `style 0.55`, `use_speaker_boost true`. ניתנות לשינוי בהגדרות עם preview.
- **"במאי קריינות"**: לפני שליחה ל-TTS, שלב שבו Claude (Anthropic API, system prompt מהסקיל `hebrew-tts-expert` + `book-message-expert/references/hebrew-narration.md`) הופך את התסריט הכתוב לתסריט מבוצע — משפטים קצרים, מספרים במילים, שמות לועזיים בתעתיק, ובמודל v3: תגי ביטוי (`[pause]`, `[thoughtful]`, `[warm]`, `[excited]`, `[softly]`) במקומות הנכונים — במידה, לא בכל משפט. הצג לי את התסריט המבוצע לפני ההפקה עם אפשרות עריכה.
- חלוקה ל-chunks ≤ 4,000 תווים לפי פסקאות, תפירה עם `ffmpeg` (בדוק שמותקן; אם לא — הנחה להתקנה), שמירה כ-MP3 128kbps, ומטא-דאטה (משך, גודל, voiceId, מודל). הפקה מחדש רק אם התסריט השתנה (hash).
- הצג התקדמות הפקה (SSE) ומשך משוער; מחיר משוער בתווים לפני אישור.

### מסכים (mobile-first, כל אחד מושלם)
1. **הספרייה** — כרטיסים 2 בטור (4 בדסקטופ), איור/כריכה 3:4, כותר, מחבר, תחום, משך, סטטוס (חדש / באמצע / הושמע). חיפוש, סינון לפי 14 התחומים (צ'יפים), מיון. Pull-to-refresh. כפתור צף "＋".
2. **הפרק** — כריכה גדולה עם parallax עדין, המסר במשפט אחד כ-hero, נגן צף בתחתית (השמע/השהה, ⏪15 / ⏩30, מהירות 0.8–1.5, סליידר), טרנסקריפט עם **הדגשת המשפט הנוכחי** מסונכרנת לזמן (חישוב מ-alignment של ElevenLabs אם זמין ב-`with-timestamps`, אחרת הערכה לפי מילים). לשוניות: תקציר / תסריט / לקחת הביתה (checklist נשמר) / הערות שלי. מועדף, סמן כהושמע, שתף (Web Share API), מחק.
3. **פרק חדש** — שלוש דרכים: (א) **"צור עם AI"**: כותר + מחבר (או צילום כריכה → Claude vision מזהה) → Claude מייצר את הפרק כ-JSON במבנה `Episode` מהסקיל (system prompt = SKILL.md + summary-formats + accuracy-and-copyright, מקוצרים) → תצוגה מקדימה → אישור → הפקת קריינות. (ב) הדבקת JSON מהצ'אט. (ג) טופס ידני. תצוגת "מצב הידע היום" והסתייגות כחלק מהמבנה.
4. **פלייליסטים ("מסלולים")** — יצירה, סידור בגרירה, השמעה רציפה עם MediaSession (מסך נעול, אוזניות), ג'ינגל מעבר קצר שאתה מייצר ב-WebAudio.
5. **הגדרות** — קול (ראה למעלה), מהירות ברירת מחדל, שם הפודקאסט ושם המנחה (נכנסים לפתיח), מצב כהה/בהיר/אוטומטי, גיבוי/שחזור, סטטיסטיקות (פרקים, דקות האזנה), אזור סכנה.
6. **מסך פתיחה (onboarding)** — 3 מסכים קצרים בפעם הראשונה: מה זה, בחר קול, צור פרק ראשון.

### כריכות ואיורים
- לכל פרק `coverUrl` (קישור לכריכה אמיתית — המשתמש מדביק, או שהאפליקציה מציעה חיפוש דרך `/api/cover?q=` שמשתמש ב-Open Library Covers API / Google Books API — ללא הטמעת התמונה בקוד) ו-`cardSvg` — איור מקורי שנוצר בצד השרת בפונקציית TS שמשקפת את `scripts/book_card_svg.py` מהסקיל (אותם 14 סמלים ופלטות). ברירת מחדל בספרייה: `cardSvg` (אחיד, אופליין); בעמוד הפרק: הכריכה אם קיימת. לעולם לא לשחזר עיצוב כריכה מקורית.

### עיצוב (ui-ux-pro-max)
- כיוון: "ספרייה שקטה בלילה" — רקע כהה חם (#14110F), שמנת לטקסט (#F5F0E8), זהב ישן כאקסנט (#C9A961), מצב בהיר עם שמנת (#F5F0E8) וכהה (#1F1B18). לא לבן טהור, לא כחול-סטארטאפ.
- טיפוגרפיה עם היררכיה ברורה, ריווח נדיב, כרטיסים עם צל רך, פינות 16–20px, מיקרו-אנימציות (framer-motion): כניסת כרטיסים staggered, גל שמע חי בזמן השמעה, מעבר בין מסכים עם shared-element לכריכה.
- RTL אמיתי: `dir="rtl"` על html, logical properties (`ps-`/`pe-`/`ms-`), אייקוני חצים מסובבים, כותרים באנגלית ב-`dir="ltr"` inline.
- נגישות AA: יעדי מגע ≥ 44px, ניגודיות, `aria-label` בעברית, ניווט מקלדת, `prefers-reduced-motion`.
- Safe areas ל-iPhone (`env(safe-area-inset-*)`), 100dvh, ללא bounce מיותר, splash + אייקון PWA שאתה מעצב (SVG → PNG בכל הגדלים).

### נתונים ו-API פנימי
- סכמת `Episode`, `Playlist`, `Settings` בדיוק לפי `podcast-app-spec.md` סעיף 3, + טבלת `AudioAsset` (episodeId, path, durationSec, voiceId, model, scriptHash, createdAt) ו-`ListenProgress`.
- ראוטים: `GET/POST /api/episodes`, `GET/PATCH/DELETE /api/episodes/[id]`, `POST /api/generate` (SSE), `POST /api/episodes/[id]/narrate` (SSE), `GET /api/audio/[id]` (streaming עם Range), `GET /api/voices`, `POST /api/voices/preview`, `GET /api/cover`, `POST /api/backup`, `POST /api/restore`. ולידציה עם zod, שגיאות מובנות, rate-limit בסיסי ל-TTS.
- כללי תוכן ב-system prompt של הייצור: תקציר במילים שלנו, לכל היותר ציטוט אחד עד 12 מילים, דעה מסומנת, "מצב הידע היום" לספרי בריאות/כסף, בלי ספוילרים לא-מסומנים בספרות יפה, חיפוש/סירוב מנומק לספר לא מוכר (החזר `{"unknown": true}` שהממשק מטפל בו).

### איכות ובדיקות
- Vitest ליחידות (preprocess של הקריינות, פיצול chunks, סכמות), Playwright ל-3 זרימות קריטיות בנייד (iPhone 14 viewport): יצירת פרק עם AI (מוקד ל-Anthropic), הפקת קריינות (מוקד ל-ElevenLabs), השמעה + התקדמות.
- ESLint + Prettier + `tsc --noEmit` ב-`npm run check`; hook pre-commit (`husky` + `lint-staged`).
- לפני מסירה: הרץ את המתודולוגיה של `generic-application-validation` — פרק באנגלית, פרק ללא כריכה, תסריט של 1,500 מילים, מפתח ElevenLabs חסר/שגוי (הודעה ידידותית, לא קריסה), אין ffmpeg, JSON פגום בייבוא, DB ריק.
- Lighthouse Mobile ≥ 95 בכל הקטגוריות. ללא console errors.

### GitHub
- `README.md` בעברית ובאנגלית עם צילומי מסך (הפק אותם ב-Playwright), הוראות התקנה, `.env.example`, סעיף "הקול" (איך לבחור voiceId), רישיון MIT. הוסף GitHub Action ל-`npm run check` + tests. ודא ש-`git status` נקי מסודות לפני ה-push הראשון (`git diff --cached | grep -i "sk_"` חייב להחזיר ריק).

### סדר עבודה
1. תוכנית → אישור שלי. 2. שלד + DB + ספרייה ריקה + עיצוב בסיסי → commit. 3. פרק + נגן + טרנסקריפט מסונכרן → commit. 4. TTS: voices, preview, במאי קריינות, הפקה, streaming → commit — **עצור כאן ותן לי לבחור קול**. 5. יצירה עם AI + JSON + ידני + כריכות → commit. 6. פלייליסטים, הגדרות, onboarding, PWA, גיבוי → commit. 7. QA, Lighthouse, README, Action → commit. אחרי כל אבן דרך: סיכום קצר של מה נבנה, מה נבדק, מה הלאה.

אל תשאל שאלות שאפשר להסיק מהסקילים; שאל רק על דברים שתלויים בטעם שלי (קול, צבע, שם המנחה). שמור על עברית מקצועית בממשק ובתקשורת איתי, ואנגלית בקוד ובקומיטים (Conventional Commits).
