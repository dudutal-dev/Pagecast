# פייג'קאסט · PAGECAST — פודקאסט הספרים

אפליקציית ספרים לטלפון ולמחשב, בעברית, מימין לשמאל: לכל ספר תקציר במילים שלנו עם המסר שהמחבר התכוון אליו,
תסריט שנכתב לאוזן, **קריינות בעברית בקול אנושי** (ElevenLabs), ואיור מקורי. הכול ארוז בתוך האפליקציה:
היא עובדת אופליין, מתקינה למסך הבית (PWA), ולא פונה לשום שרת או API בזמן ריצה.

**האפליקציה:** `site/` — HTML + CSS + JavaScript, בלי שלב בנייה. מתארחת ב-GitHub Pages.

## מה יש בפנים

- **הספרייה:** רשת איורים, חיפוש, סינון לפי 14 תחומי חיים, מיון, סטטוס האזנה.
- **עמוד ספר:** האיור, המסר במשפט אחד, נגן, ולשוניות: תקציר · תסריט (המשפט המושמע מודגש בזמן אמת, לחיצה מדלגת) · לקחת הביתה (רשימת סימון) · הערות שלי.
- **נגן:** אחד לכל האפליקציה, ממשיך בין מסכים, מסך נעול ואוזניות (MediaSession), 15 שניות אחורה / 30 קדימה, מהירות, המשך מהנקודה שעצרת.
- **מסלולים:** רשימות האזנה מסודרות עם השמעה רציפה.
- **אופליין:** הטקסטים והאיורים נשמרים אוטומטית; הקריינות נשמרת בהשמעה ראשונה או בלחיצה על "שמור לאופליין".
- **פרטיות:** מועדפים, הערות, סימונים, מסלולים והתקדמות נשמרים במכשיר בלבד (localStorage).

## הרצה מקומית

```bash
python -m http.server 5173 --directory site
```

ואז http://localhost:5173. בטלפון: פתח את כתובת GitHub Pages ב-Safari/Chrome ובחר "הוסף למסך הבית".

## איך נוצר התוכן (הסטודיו)

שאר הריפו הוא סטודיו ההפקה (Next.js + SQLite) שמייצר את התוכן פעם אחת, מחוץ לאפליקציה:

```bash
npm install
cp .env.example .env.local           # ELEVENLABS_API_KEY (Pro, עם הרשאת Image & Video)
npm run voices                       # דירוג קולות + דוגמאות של 20 שניות בעברית
npm run set-voice -- <voiceId>       # בחירת הקריינית
npm run ingest -- --produce          # קליטת content/episodes/*.json + הפקת קריינות
npm run illustrations -- --emblem    # איורים בסגנון תחריט עם ElevenLabs Image API
npm run export-site                  # אריזה ל-site/ (טקסטים, אודיו, איורים, אייקונים)
```

כל פרק הוא קובץ `content/episodes/<slug>.json` בפורמט של הסקיל `book-message-expert`: תקציר, תסריט, תסריט מבוצע
(משפטים קצרים, מספרים במילים, תגי ביטוי של eleven_v3 במידה), שלושה צעדים לשבוע והסתייגות. הכללים: במילים שלנו בלבד,
לכל היותר ציטוט אחד עד 12 מילים, דעה מסומנת, "מצב הידע היום" בספרי בריאות/כסף/מדע, בלי ספוילרים בספרות יפה.

## פריסה

דחיפה ל-`main` שמשנה את `site/` מפעילה את ה-workflow `pages.yml` שמפרסם את התיקייה ל-GitHub Pages.

## רישיון

הקוד: MIT. הטקסטים, הקריינות והאיורים: © דודו טל, כל הזכויות שמורות (ראו `LICENSE`).

---

**Pagecast — Books, Narrated.** A Hebrew (RTL) book-summary podcast app: one page per book with a summary in our own
words, a script written for the ear, human-sounding Hebrew narration (ElevenLabs) and an original engraving-style
illustration. Everything ships inside the app (`site/`, static PWA on GitHub Pages): works offline, installs to the home
screen, makes no API calls at runtime. The rest of the repo is the production studio (Next.js + SQLite) that authors,
narrates and exports the content once. Code is MIT; texts, audio and illustrations © Dudu Tal.
