# Pagecast — מסמך תכנון (Design Spec)

> תאריך: 2026-09-13 · סטטוס: **ממתין לאישור** · מקור הדרישות: `pagecast-claude-code-prompt.md` + הסקילים ב-`.claude/skills/`

## 1. מה בונים, במשפט

פודקאסט ספרים אישי: ספרייה של תקצירי ספרים עם מסר, שכל אחד מהם הוא "פרק" עם טקסט, תסריט, הקראה בקול אישה חם (ElevenLabs), איור מקורי או כריכה, ופלייליסטים. עברית RTL, mobile-first, PWA, משתמש יחיד, רץ מקומית עם אפשרות deploy עתידי ל-Vercel.

## 2. החלטות ארכיטקטורה (ADR)

### ADR-001: Next.js 15 App Router כ-full-stack יחיד
- **הקשר:** צריך UI + backend שמחזיק מפתחות API בסתר, ללא שרת נפרד.
- **החלטה:** Route Handlers בתוך Next. הקליינט לעולם לא רואה מפתח.
- **השלכות:** deploy ל-Vercel עתידי דורש רק env vars + החלפת StorageProvider.

### ADR-002: SQLite (better-sqlite3 + Drizzle) + MP3 על דיסק
- **הקשר:** משתמש יחיד, מקומי, נתונים קטנים (טקסט) + קבצי אודיו של כמה MB.
- **החלטה:** `data/pagecast.db` ל-metadata, `data/audio/<episodeId>/<hash>.mp3` לאודיו. שניהם מחוץ ל-git.
- **סיכון:** `better-sqlite3` הוא מודול native. Node 24 מותקן במחשב; אם ה-prebuilt לא זמין, נופלים ל-`node:sqlite` המובנה דרך שכבת DB דקה (אותו SQL, Drizzle לא חובה). ההחלטה תיבדק בפועל באבן דרך 1 לפני שמתקדמים.

### ADR-003: ספקים חיצוניים מאחורי ממשקים, עם מימוש מזויף
- `TtsProvider` (ElevenLabs / Fake), `LlmProvider` (Anthropic / Fake), `StorageProvider` (LocalFs / בעתיד Blob), `CoverSearchProvider` (OpenLibrary+GoogleBooks / Fake).
- `PAGECAST_MOCK_PROVIDERS=1` בוחר את המזויפים. Playwright רץ כך: אפס רשת, אפס עלות, דטרמיניסטי.
- ה-Fake TTS מייצר MP3 שקט באורך פרופורציונלי לטקסט (עם ffmpeg אם קיים, אחרת קובץ MP3 מינימלי קבוע) כדי שהנגן והסנכרון ייבדקו באמת.

### ADR-004: "במאי קריינות" הוא שלב נפרד ונשמר
- התסריט הכתוב (`script`) והתסריט המבוצע (`performedScript`) הם שני שדות. המשתמש רואה ועורך את המבוצע לפני הפקה.
- `scriptHash = sha256(performedScript + voiceId + modelId + JSON(voiceSettings))`. הפקה מחדש רק אם השתנה.

### ADR-005: סנכרון טרנסקריפט מ-alignment אמיתי
- ElevenLabs `with-timestamps` מחזיר alignment ברמת תו לכל chunk. מצרפים עם offset מצטבר, ממפים לגבולות משפטים, ושומרים `alignment: {sentences: [{start, end, text}]}` ב-`audio_assets`.
- fallback: הערכה לפי מילים (150 מילים לדקה) כשה-alignment חסר (Fake, או קול ישן).

### ADR-006: נגן גלובלי אחד
- `<audio>` יחיד ב-root layout, מנוהל ע"י zustand store. עובר בין מסכים בלי להפסיק. MediaSession לנעילת מסך. אין iframes, אין ספריית נגן חיצונית.

### ADR-007: PWA ידני ומינימלי
- `public/manifest.webmanifest` + `public/sw.js` שנכתב ידנית (בלי Workbox): cache-first ל-app shell ולסטטי, network-first ל-`/api/**`, ו-Cache API ייעודי לאודיו לפי בקשה ("שמור לאופליין" בעמוד הפרק). פרקים שהופקו ונשמרו מנוגנים אופליין.

## 3. מבנה תיקיות

```
pagecast/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # html dir=rtl, fonts, GlobalPlayer, theme
│   │   ├── globals.css                # Tailwind 4 + design tokens
│   │   ├── page.tsx                   # 1. הספרייה
│   │   ├── episodes/[id]/page.tsx     # 2. הפרק
│   │   ├── new/page.tsx               # 3. פרק חדש (AI / JSON / ידני)
│   │   ├── playlists/page.tsx         # 4. מסלולים
│   │   ├── playlists/[id]/page.tsx
│   │   ├── settings/page.tsx          # 5. הגדרות
│   │   ├── settings/voice/page.tsx    #    בחירת קול
│   │   ├── onboarding/page.tsx        # 6. פתיחה
│   │   ├── error.tsx · not-found.tsx · loading.tsx
│   │   └── api/
│   │       ├── episodes/route.ts                  GET, POST
│   │       ├── episodes/[id]/route.ts             GET, PATCH, DELETE
│   │       ├── episodes/[id]/direct/route.ts      POST  (במאי קריינות → performedScript)
│   │       ├── episodes/[id]/narrate/route.ts     POST  (SSE)
│   │       ├── episodes/[id]/progress/route.ts    PATCH
│   │       ├── generate/route.ts                  POST  (SSE, Claude)
│   │       ├── identify/route.ts                  POST  (צילום כריכה → Claude vision)
│   │       ├── audio/[id]/route.ts                GET   (Range streaming)
│   │       ├── voices/route.ts                    GET
│   │       ├── voices/preview/route.ts            POST
│   │       ├── cover/route.ts                     GET   ?q=
│   │       ├── playlists/route.ts · playlists/[id]/route.ts
│   │       ├── settings/route.ts                  GET, PATCH
│   │       ├── stats/route.ts                     GET
│   │       ├── backup/route.ts · restore/route.ts POST
│   │       └── health/route.ts                    GET   (ffmpeg? keys? db?)
│   ├── components/
│   │   ├── ui/            # Button, Chip, Card, Sheet, Tabs, Slider, Toast, Skeleton
│   │   ├── library/       # EpisodeCard, LibraryGrid, FilterChips, SearchBar, Fab
│   │   ├── episode/       # Hero, MessageBanner, TranscriptView, TakeawaysChecklist, NotesEditor
│   │   ├── player/        # GlobalPlayer, MiniPlayer, Waveform, SpeedMenu
│   │   ├── new/           # AiForm, JsonPaste, ManualForm, CoverPicker, EpisodePreview
│   │   ├── narration/     # DirectorReview, NarrateProgress, CostEstimate
│   │   ├── playlists/     # PlaylistList, SortableEpisodes
│   │   ├── settings/      # VoicePicker, VoiceSettingsSliders, ThemeToggle, DangerZone
│   │   └── layouts/       # AppShell, BottomNav, SafeArea
│   ├── store/             # player.ts, ui.ts (zustand)
│   ├── hooks/             # useSse, useMediaSession, useOffline, usePullToRefresh
│   ├── lib/               # קוד משותף קליינט/שרת, ללא I/O
│   │   ├── schemas/       # episode.ts, playlist.ts, settings.ts (zod, מקור האמת לטיפוסים)
│   │   ├── svg/bookCard.ts            # פורט מדויק של book_card_svg.py
│   │   ├── narration/     # preprocess.ts, chunk.ts, sentences.ts, alignment.ts, hash.ts
│   │   ├── domains.ts     # 14 התחומים + שמות בעברית
│   │   ├── result.ts      # Result<T,E>
│   │   └── format.ts      # משך, תאריכים בעברית
│   └── server/            # רץ רק בשרת
│       ├── db/            # client.ts, schema.ts, migrate.ts
│       ├── providers/     # tts/{elevenlabs,fake}.ts, llm/{anthropic,fake}.ts, storage/{localFs}.ts, cover/{openLibrary,googleBooks,fake}.ts, index.ts (factory)
│       ├── services/      # episodes.ts, playlists.ts, settings.ts, narration/{director,produce,voices}.ts, generation.ts, covers.ts, backup.ts
│       ├── ai/prompts/    # generate.system.md, director.system.md (מקומפלים מהסקילים)
│       ├── ffmpeg.ts      # detect + concat
│       ├── rateLimit.ts
│       ├── sse.ts
│       └── logger.ts
├── public/                # manifest, sw.js, icons/ (SVG → PNG בכל הגדלים), splash/
├── scripts/               # backup.ts, build-icons.ts, build-prompts.ts, lighthouse.mjs
├── drizzle/               # migrations
├── tests/
│   ├── unit/              # lib/**, services/** (Vitest)
│   ├── e2e/               # create-ai.spec.ts, narrate.spec.ts, playback.spec.ts (Playwright, iPhone 14)
│   └── fixtures/          # episode.frankl.json, silent.mp3
├── docs/superpowers/{specs,plans}/
├── .github/workflows/ci.yml
├── .husky/pre-commit
├── CLAUDE.md · README.md · .env.example · LICENSE (MIT)
└── data/  (gitignored)    # pagecast.db, audio/, backups/
```

## 4. מודל נתונים

טיפוסים מוגדרים פעם אחת ב-zod (`src/lib/schemas`) ומהם נגזרים גם טבלאות Drizzle וגם טיפוסי TS.

**episodes**
| שדה | טיפוס | הערות |
|---|---|---|
| id | text PK | `ep_<ulid>` |
| title, titleEn, author, authorEn | text | titleEn/authorEn אופציונליים |
| year | int? | |
| domain | text | אחד מ-14 |
| kind | `nonfiction` \| `fiction` | |
| message | text | המסר במשפט אחד (hero) |
| summaryMd | text | |
| script | text | התסריט הכתוב |
| performedScript | text? | פלט הבמאי, אחרי עריכת המשתמש |
| takeaways | json string[] | |
| caveat | text | הסתייגות |
| knowledgeToday | text? | "מצב הידע היום" |
| coverUrl | text? | קישור בלבד |
| cardSvg | text | נוצר בשרת בעת יצירה |
| status | `new` \| `in_progress` \| `done` | נגזר מ-progress, נשמר לצורך סינון |
| favorite | bool | |
| notes | text | |
| takeawaysDone | json bool[] | checklist |
| createdAt, updatedAt | text ISO | |

**audio_assets**: id, episodeId (FK, unique), path, durationSec, sizeBytes, voiceId, modelId, voiceSettings (json), scriptHash, alignment (json?), createdAt.

**listen_progress**: episodeId PK, positionSec, updatedAt, completedAt?.

**playlists**: id, name, createdAt. **playlist_items**: playlistId, episodeId, position (PK מורכב).

**settings** (שורה אחת, id=1): podcastName, hostName, voiceId?, voiceModel (`eleven_v3`/`eleven_multilingual_v2`), stability 0.4, similarityBoost 0.8, style 0.55, speakerBoost true, defaultRate 1.0, theme (`auto`/`dark`/`light`), onboardingDone.

**חוזה הדבקה מהצ'אט:** אובייקט `Episode` ללא id/createdAt/cardSvg/audio; zod עם `.strip()` וסובלנות לשדות חסרים לא-חיוניים (takeaways ריק → מותר, message חסר → שגיאה ברורה).

## 5. הצינור החשוב ביותר: קריינות

```
script ──(1) /direct: Claude, system=director.system.md──▶ performedScript
        ──(2) המשתמש עורך/מאשר, רואה אומדן תווים ומחיר──▶
        ──(3) preprocess: מספרים→מילים, ראשי תיבות, תעתיק, ניקוי markdown──▶
        ──(4) chunk ≤4000 תווים בגבולות פסקאות (ואם פסקה ארוכה — משפטים)──▶
        ──(5) לכל chunk: ElevenLabs /with-timestamps (retry x2, backoff)──▶ mp3 + alignment
        ──(6) ffmpeg concat → 128kbps mono/stereo לפי המקור──▶ data/audio/<ep>/<hash>.mp3
        ──(7) alignment ממוזג → משפטים; audio_assets upsert; SSE done
```
- SSE events: `{stage, chunk, total, etaSec, message}` → `done {assetId, durationSec}` או `error {code, hint}`.
- קודי שגיאה ידידותיים: `NO_API_KEY`, `INVALID_API_KEY`, `NO_FFMPEG`, `QUOTA_EXCEEDED`, `VOICE_NOT_FOUND`, `MODEL_UNAVAILABLE` (נופל אוטומטית ל-multilingual_v2 ומדווח).
- תגי ביטוי של v3 (`[pause]`, `[warm]`…) נשארים בטקסט רק כשהמודל הוא v3; ל-v2 הם מוסרים ומומרים ל-פיסוק/שורות ריקות.
- Rate limit: 3 הפקות במקביל לכל היותר, 20 previews לדקה.
- מחיר משוער: תווים אחרי preprocess × מחיר לתו מהגדרה (ברירת מחדל 0.00003$ לתו, ניתן לשינוי) — מוצג לפני אישור.

**בחירת קול (הגדרות → קול):** `/api/voices` מושך את כל הקולות, מסנן `labels.gender=female` ו-(`multilingual`/`he` ב-`verified_languages`/`labels.language` או קול מ-Voice Library עם תמיכה מרובת-שפות), ומדרג לפי labels `narrative`, `warm`, `storytelling`, `calm`. לכל מועמד כפתור "הפק דוגמה" (20 שניות, קטע קבוע מ"אדם מחפש משמעות" בעברית, נשמר ב-cache לפי voiceId+settings). מוצגים 3 מומלצים למעלה עם נימוק. שמירה → `settings.voiceId`.

## 6. יצירת פרק עם AI

- `/api/generate` (SSE): קלט `{title, author?, hints?}` או `{imageBase64}` דרך `/api/identify` קודם. system prompt = `generate.system.md` שמקומפל ב-`scripts/build-prompts.ts` מתוך SKILL.md + summary-formats + accuracy-and-copyright + hebrew-narration (מקוצרים, ~6k טוקנים). מודל: Claude Sonnet העדכני, `max_tokens 8000`, פלט JSON בלבד; `{"unknown": true, "reason"}` לספר לא מוכר → הממשק מציע לחפש/להזין ידנית.
- הפלט עובר zod; כישלון → ניסיון תיקון אחד ("החזר JSON תקין בלבד") ואז שגיאה ידנית.
- `cardSvg` נוצר בשרת; `coverUrl` מוצע דרך `/api/cover?q=` (Open Library search → Google Books fallback; מחזיר עד 6 מועמדים עם thumbnail; המשתמש בוחר או מדביק).
- תצוגה מקדימה מלאה (תקציר, תסריט, לקחת הביתה, הסתייגות, מצב הידע) → "שמור" → הצעה מיידית "להפיק קריינות?".

## 7. מסכים (mobile-first)

| # | מסך | עיקרי | מצבים |
|---|---|---|---|
| 1 | ספרייה `/` | grid 2/4, כרטיס 3:4 עם `cardSvg`, כותר, מחבר, צ'יפ תחום, משך, נקודת סטטוס; חיפוש, 14 צ'יפים, מיון (חדש/א"ב/משך/לא-הושמע); pull-to-refresh; FAB ＋ | ריק (CTA ליצירה), טעינה (skeleton), ללא תוצאות |
| 2 | פרק `/episodes/[id]` | כריכה עם parallax, hero של המסר, לשוניות תקציר/תסריט/לקחת הביתה/הערות, נגן צף, פעולות (מועדף, הושמע, שתף, שמור לאופליין, הפק/הפק מחדש, מחק) | אין אודיו (CTA להפקה), הפקה בתהליך, אופליין |
| 3 | פרק חדש `/new` | 3 לשוניות: AI / JSON / ידני; זרימת AI: טופס → צילום כריכה אופציונלי → SSE progress → preview → cover picker → שמירה | unknown book, JSON פגום (שגיאות שדה-שדה), מפתח חסר |
| 4 | מסלולים `/playlists` | רשימה, יצירה, מסך מסלול עם גרירה (framer-motion Reorder), השמעה רציפה + ג'ינגל WebAudio | ריק |
| 5 | הגדרות `/settings` | קול (מסך משנה), סליידרים עם preview, שם פודקאסט ומנחה, מהירות, ערכת נושא, גיבוי/שחזור, סטטיסטיקות, אזור סכנה | |
| 6 | פתיחה `/onboarding` | 3 מסכים: מה זה → בחר קול → צור פרק ראשון; מוצג פעם אחת | דילוג |

ניווט: BottomNav (ספרייה, מסלולים, ＋, הגדרות) עם safe-area; MiniPlayer מעל ה-nav כשמנגן.

## 8. עיצוב

- **טוקנים** (`globals.css`, `@theme` של Tailwind 4): `--bg 14110F`, `--surface 1E1A16`, `--surface-2 2A2520`, `--text F5F0E8`, `--muted A89F92`, `--accent C9A961`, `--accent-ink 14110F`, `--danger C4574A`, `--ok 7FA68B`. בהיר: `--bg F5F0E8`, `--surface FFFCF7`, `--text 1F1B18`, `--muted 6B6259`, אקסנט זהה.
- **טיפוגרפיה:** Heebo 400/500/700 לעברית, Inter לכותרים לועזיים (`dir="ltr"`). סקאלה: 12/14/16/18/22/28/36. גובה שורה 1.5 בגוף.
- **ריווח ורדיוס:** 4pt grid, כרטיסים rx 16–20, צל רך דו-שכבתי, גבול 1px שקוף-זהב במצב כהה.
- **אנימציה:** כניסת כרטיסים staggered (40ms), shared-element לכריכה (layoutId), גל שמע חי (canvas, AnalyserNode), מעברי מסך fade+slide 200ms. הכול נכבה ב-`prefers-reduced-motion`.
- **RTL:** `dir="rtl"` ב-html, לוגיים בלבד, חצים `rtl:-scale-x-100`, סליידר הנגן RTL-aware.
- **נגישות:** יעדי 44px, AA, aria בעברית, focus-visible זהב, מקלדת בנגן (רווח, חצים).
- **PWA:** אייקון מעוצב (ספר פתוח שקווי הטקסט שלו הופכים לגל שמע, זהב על כהה), splash לכל גדלי iOS, `100dvh`, safe-area insets, `overscroll-behavior: none`.

## 9. בדיקות ואיכות

- **Vitest:** preprocess (מספרים, ראשי תיבות, תעתיק), chunk (גבולות פסקאות, פסקה ארוכה מ-4000, ריק), sentences/alignment (מיזוג offset, fallback), hash (יציבות), bookCard (14 תחומים, wrap, escape), schemas (JSON פגום, unknown), services עם DB בזיכרון (`:memory:`).
- **Playwright** (iPhone 14, `PAGECAST_MOCK_PROVIDERS=1`, DB זמני): יצירה עם AI → פרק בספרייה; הפקת קריינות → נגן פעיל + הדגשה זזה; השמעה + התקדמות נשמרת אחרי reload. צילומי מסך מהריצה → README.
- **QA לפני מסירה** (generic-application-validation): פרק באנגלית, ללא כריכה, תסריט 1,500 מילים, מפתח חסר/שגוי, אין ffmpeg, JSON פגום, DB ריק, מודל v3 לא זמין.
- **Lighthouse Mobile ≥ 95** בכל הקטגוריות; אפס console errors.
- `npm run check` (eslint + prettier + tsc) ב-husky pre-commit וב-GitHub Action יחד עם vitest ו-playwright.

## 10. אבני דרך

| # | תוכן | תוצר נבדק | commit |
|---|---|---|---|
| 1 | שלד Next 15 + Tailwind 4 + tokens + fonts + RTL; DB + migrations + schemas; providers factory + fakes; ספרייה עם empty state, חיפוש/סינון/מיון על seed; BottomNav; `npm run check` + husky + Vitest | `npm run dev` מציג ספרייה עם פרק seed (פרנקל), בדיקות schemas/bookCard עוברות | `feat: project skeleton, db, library` |
| 2 | עמוד פרק, לשוניות, נגן גלובלי + MiniPlayer, `/api/audio` Range, טרנסקריפט מסונכרן (alignment + fallback), progress, מועדף/הושמע/שתף/מחק | Fake TTS מייצר אודיו לפרק ה-seed; הדגשה זזה; progress שורד reload | `feat: episode page and player` |
| 3 | `/api/voices`, preview, מסך בחירת קול, במאי קריינות + עריכה, preprocess/chunk/hash, הפקה SSE + ffmpeg + alignment, אומדן מחיר, שגיאות ידידותיות | הפקה אמיתית מול ElevenLabs עם המפתח שלך | `feat: narration pipeline` — **עצירה: אתה מאזין ובוחר קול** |
| 4 | `/api/generate` SSE + prompts מקומפלים, `/api/identify` vision, הדבקת JSON, טופס ידני, `/api/cover`, cover picker, preview | פרק חדש מכל שלוש הדרכים | `feat: episode creation` |
| 5 | מסלולים + גרירה + השמעה רציפה + ג'ינגל + MediaSession, הגדרות מלאות, onboarding, PWA (manifest, sw, אייקונים, אופליין לאודיו), backup/restore | התקנה למסך הבית, פרק מנוגן אופליין | `feat: playlists, settings, pwa` |
| 6 | Playwright ×3, QA לפי המתודולוגיה + תיקונים, Lighthouse, README דו-לשוני עם צילומים, `.env.example`, MIT, GitHub Action, בדיקת סודות | דוח QA, Lighthouse ≥ 95 | `chore: qa, docs, ci` |

אחרי כל אבן דרך: סיכום קצר של מה נבנה, מה נבדק, מה הלאה.

## 11. מה לא בגרסה 1

סנכרון בין מכשירים, משתמשים מרובים/auth, RSS ציבורי, ייצוא podcast feed, דירוגים, קהילה, Web Speech כ-fallback להקראה (רק ElevenLabs).

## 12. שאלות טעם (היחידות שנשארו)

1. **שם הפודקאסט** בפתיח (ברירת מחדל: "Pagecast").
2. **שם המנחה** בפתיח ("אני ___, והיום נדבר על…").
3. **ערכת נושא ברירת מחדל**: אוטומטי לפי המכשיר (מומלץ) / כהה תמיד.
4. **הקול** — נבחר בהאזנה בסוף אבן דרך 3.
