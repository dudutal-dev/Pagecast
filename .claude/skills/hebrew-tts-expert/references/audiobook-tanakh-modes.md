# מצבי Audiobook, תנ"ך ופרשנות — מדריך מלא

> קובץ זה פוצל מ-SKILL.md לטובת טעינה לפי דרישה.

## שלב 7 — מצב Audiobook: הקראת ספר 📖

### עקרונות הקראת פרוזה ספרותית

הקראת ספר שונה מהותית מ-TTS רגיל. המטרה: **חוויה סינמטית, לא קריינות**. הקורא צריך להישאב לעולם הספר.

#### מבנה קראה לפרק

```
1. כותרת הפרק      → הפסקה ארוכה (1.5 שניות), טון גבוה מעט
2. גוף הפרק        → קצב 0.88×, stability 0.55
3. דיאלוג דמות     → שנה קול/טון לפי הדמות (ראה טבלה)
4. סוף פרק         → הפסקה ארוכה (2 שניות), ירידת טון
```

#### ניהול דמויות (Character Voices)

כאשר הספר מכיל דיאלוגים, **שמור מיפוי קול ↔ דמות** לעקביות לאורך כל הספר:

```javascript
const characterVoiceMap = {
  // דמויות ראשיות — קול ייחודי
  narrator:    { voiceId: 'Josh',    stability: 0.55, style: 0.40, speed: 0.88 },
  protagonist: { voiceId: 'Antoni',  stability: 0.45, style: 0.55, speed: 0.92 },
  antagonist:  { voiceId: 'Arnold',  stability: 0.70, style: 0.20, speed: 0.85 },
  female_lead: { voiceId: 'Rachel',  stability: 0.50, style: 0.50, speed: 0.90 },
  child:       { voiceId: 'Bella',   stability: 0.35, style: 0.65, speed: 0.95 },
  elder:       { voiceId: 'Dorothy', stability: 0.75, style: 0.15, speed: 0.80 },
};
```

#### SSML לאפקטים ספרותיים

```xml
<!-- כותרת פרק -->
<prosody rate="slow" pitch="+3st">
  פרק שלושה — לילה ללא שינה
</prosody>
<break time="1500ms"/>

<!-- דיאלוג — הדמות מדברת -->
<prosody rate="medium-fast" pitch="+5st">
  "אני לא יכולה להאמין לך יותר," אמרה בקול רועד.
</prosody>

<!-- תיאור פנימי של הגיבור -->
<prosody rate="slow" pitch="-2st">
  הוא הביט בה ולא ידע מה לומר.
</prosody>
<break time="800ms"/>

<!-- מתח / שיא דרמטי -->
<prosody rate="fast" pitch="+8st">
  לפתע — פוצץ הדלת לרסיסים.
</prosody>
<break time="1200ms"/>

<!-- חלום / פלאשבק -->
<prosody rate="slow" pitch="-5st" volume="soft">
  הוא זכר את אמו... ילד קטן, בוכה בחושך.
</prosody>
```

#### זיהוי אוטומטי של דיאלוג בטקסט עברי

```javascript
function parseBookText(text) {
  const segments = [];
  // זיהוי ציטוט ישיר (מרכאות עבריות וכפולות)
  const dialogRegex = /"([^"]+)"|"([^"]+)"|«([^»]+)»/g;
  let lastIndex = 0;
  let match;

  while ((match = dialogRegex.exec(text)) !== null) {
    // נרטיב לפני הדיאלוג
    if (match.index > lastIndex) {
      segments.push({ type: 'narration', text: text.slice(lastIndex, match.index) });
    }
    // הדיאלוג עצמו
    segments.push({ type: 'dialog', text: match[1] || match[2] || match[3] });
    lastIndex = match.index + match[0].length;
  }
  // נרטיב אחרי הדיאלוג האחרון
  if (lastIndex < text.length) {
    segments.push({ type: 'narration', text: text.slice(lastIndex) });
  }
  return segments;
}
```

---

## שלב 8 — מצב תנ"ך: הקראת פרקים 📜

### עקרונות יסוד להקראת לשון קדש

לשון התנ"ך שונה מעברית מודרנית. הקראה נאותה דורשת הבנה של:
- **טעמי המקרא** — הם לא רק נגינה; הם פיסוק, הפסקה, ומשמעות
- **מבנה הפסוק** — כל פסוק הוא יחידה עצמאית; הפסקה מלאה בסיומו
- **שם ה' והכינויים** — "יהוה" → "השם" או "אדוני"; "אלוהים" נשאר
- **לשון עתיקה** — קצב איטי, ברור, עם כבוד לכל מילה

### מיפוי טעמים ← הפסקות SSML

| טעם | תפקיד | הפסקה |
|-----|--------|--------|
| סילוק (סוף פסוק) | סיום פסוק מוחלט | `<break time="900ms"/>` |
| אתנח (ב) | הפסקה גדולה באמצע פסוק | `<break time="600ms"/>` |
| זקף קטן (ז) | הפסקה בינונית | `<break time="350ms"/>` |
| טפחא (ט) | הפסקה קלה | `<break time="200ms"/>` |
| פשטא / מרכא | חיבור, ללא הפסקה | `<break time="50ms"/>` |

### SSML להקראת תנ"ך

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="he-IL">
<voice name="he-IL-AvriNeural">
  <prosody rate="-15%" pitch="-2st">

    <!-- כותרת -->
    <prosody rate="slow" pitch="+3st">
      בְּרֵאשִׁית, פרק ראשון
    </prosody>
    <break time="1500ms"/>

    <!-- פסוק א — פסוק שלם -->
    בְּרֵאשִׁית
    <break time="50ms"/>
    בָּרָא אֱלֹהִים
    <break time="200ms"/>
    אֵת הַשָּׁמַיִם
    <break time="50ms"/>
    וְאֵת הָאָרֶץ.
    <break time="900ms"/>

    <!-- פסוק ב — עם אתנח באמצע -->
    וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ,
    <break time="600ms"/>
    וְחֹשֶׁךְ עַל פְּנֵי תְהוֹם,
    <break time="350ms"/>
    וְרוּחַ אֱלֹהִים מְרַחֶפֶת עַל פְּנֵי הַמָּיִם.
    <break time="900ms"/>

  </prosody>
</voice>
</speak>
```

### קולות מומלצים לתנ"ך

| קול | API | מתאים ל | הערה |
|-----|-----|---------|------|
| `he-IL-AvriNeural` | Azure | הקראה רשמית-קנונית | קול גברי עברי ייעודי — הטוב ביותר לתנ"ך |
| `he-IL-HilaNeural` | Azure | הקראה נגישה-חינוכית | נשי, חמה, מתאים לילדים ולהסבר |
| `Arnold` | ElevenLabs | הקראה דרמטית-עמוקה | אם רוצים קול "נביאי" עשיר |
| `Dorothy` | ElevenLabs | הקראה נשית-כבודה | לתהלים ולשיר השירים |

### עיבוד מקדים מיוחד לתנ"ך

```javascript
function preprocessBibleText(verseText) {
  return verseText
    // שם ה' — החלף לפני שליחה
    .replace(/יְהוָה|יהוה|ה'/g, 'השם')
    .replace(/אֲדֹנָי/g, 'אדוני')

    // ניקוד — השאר כמות שהוא (Azure קורא ניקוד נכון)
    
    // מספרי פסוקים — הסר אם קיימים בטקסט
    .replace(/^\d+\s+/gm, '')

    // פסיק עברי עתיק (מקף) — הוסף הפסקה
    .replace(/׃/g, '.<break time="900ms"/>')  // סוף פסוק
    .replace(/[,،]/g, ',<break time="350ms"/>')

    .trim();
}
```

### מבנה אפליקציית תנ"ך TTS

```
ממשק משתמש:
├── בחירת ספר (dropdown) — 24 ספרי תנ"ך
├── בחירת פרק (1–N לפי הספר)
├── אפשרויות הצגה:
│   ├── ☐ הצג ניקוד
│   ├── ☐ הצג מספרי פסוקים
│   └── ☐ הצג תרגום (אונקלוס / LXX)
├── בחירת קול + מהירות
├── כפתור הקרא פרק / פסוק בודד
└── פלייר עם timeline לפי פסוקים
```

---

## שלב 9 — מצב פרשנות: ביאור ופרוש 🔍

### מבנה הפרשנות לדיבור

כאשר המשתמש מבקש פרשנות לפסוק, השתמש בפורמט הקולי הבא:

```
[הקראת הפסוק] → [הפסקה 1.5 שניות] → [ביאור] → [הפסקה 1 שניה] → [מסקנה/יישום]
```

#### שכבות פרשנות אפשריות

| שכבה | תוכן | קול |
|------|------|-----|
| **פשט** | המשמעות הפשוטה, הפשוטה | קול ראשי (narrator) |
| **רש"י** | פרשנות רש"י — תמציתית | קול שונה מעט (stability +0.1) |
| **רמב"ן** | עומק פילוסופי/מיסטי | קצב איטי יותר (rate -10%) |
| **אבן עזרא** | פרשנות לשונית-דקדוקית | קצב מנוח, בהיר |
| **דרש/אגדה** | מדרש, סיפורים | יותר אנרגטי (style +0.15) |
| **קבלה** | פנימיות הטקסט | איטי ורציני (rate -20%) |
| **יישום לחיים** | מסר עכשווי | חם ואישי (stability -0.1) |

#### SSML לפרשנות

```xml
<speak version="1.0" xml:lang="he-IL">
<voice name="he-IL-AvriNeural">

  <!-- הקראת הפסוק -->
  <prosody rate="-15%" pitch="-2st">
    "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ"
  </prosody>
  <break time="1500ms"/>

  <!-- מעבר לפרשנות — שינוי קול -->
  <prosody rate="-5%" pitch="+1st">

    <!-- פשט -->
    הפסוק הראשון בתורה מלמד שהעולם לא היה קיים מאז ומעולם —
    <break time="300ms"/>
    אלא נברא, בנקודת זמן מסוימת, על ידי כוח עליון.
    <break time="800ms"/>

    <!-- רש"י -->
    <emphasis level="moderate">רש"י מסביר:</emphasis>
    <break time="300ms"/>
    <prosody rate="-10%">
      לא פתחה התורה בבראשית כדי לספר סיפור, אלא כדי ללמד שארץ ישראל שייכת לעם ישראל —
      שהוא שבורא הכול יכול לתת אותה למי שירצה.
    </prosody>
    <break time="1000ms"/>

    <!-- יישום -->
    <prosody rate="+5%" pitch="+2st">
      כל אחד מאיתנו יכול לשאול: מה "בראשית" שלי? מה הדבר הראשון שברצוני לבנות?
    </prosody>

  </prosody>
</voice>
</speak>
```

#### תבנית JavaScript — הפקת פרשנות + TTS

```javascript
async function generateVerseWithCommentary(book, chapter, verse, layers = ['peshat', 'rashi']) {
  // שלב 1: שלוף את הפסוק (ממסד נתונים / API)
  const verseText = await fetchBibleVerse(book, chapter, verse);
  
  // שלב 2: שלוף פרשנות רלוונטית
  const commentary = await fetchCommentary(book, chapter, verse, layers);
  
  // שלב 3: בנה SSML משולב
  const ssml = buildCommentarySSML(verseText, commentary);
  
  // שלב 4: המר ל-TTS
  const audio = await azureHebrewTTS(ssml, 'he-IL-AvriNeural');
  return audio;
}

function buildCommentarySSML(verseText, commentary) {
  const layerLabels = {
    peshat: 'הפשט:',
    rashi: 'רש"י מסביר:',
    ramban: 'הרמב"ן מוסיף:',
    ibn_ezra: 'אבן עזרא אומר:',
    midrash: 'המדרש מספר:',
    kabbalah: 'על פי הקבלה:',
    application: 'למחשבה:'
  };

  let ssml = `
    <prosody rate="-15%" pitch="-2st">${preprocessBibleText(verseText)}</prosody>
    <break time="1500ms"/>
  `;

  for (const layer of commentary) {
    ssml += `
      <emphasis level="moderate">${layerLabels[layer.type]}</emphasis>
      <break time="300ms"/>
      <prosody rate="-5%">${layer.text}</prosody>
      <break time="900ms"/>
    `;
  }
  return ssml;
}
```

#### מקורות API לתנ"ך ופרשנות

```javascript
// Sefaria API — חינמי, מקיף, כולל פרשנות
const SEFARIA_BASE = 'https://www.sefaria.org/api';

// שליפת פסוק בעברית
async function fetchBibleVerse(ref) {
  // ref = "Genesis.1.1" / "Psalms.23.1" / "בראשית.א.א"
  const res = await fetch(`${SEFARIA_BASE}/texts/${encodeURIComponent(ref)}?lang=he`);
  const data = await res.json();
  return data.he; // טקסט עברי מנוקד
}

// שליפת פרשנות
async function fetchCommentary(ref, commentator = 'Rashi') {
  // commentators: Rashi, Ramban, Ibn Ezra, Sforno, Nachmanides
  const res = await fetch(`${SEFARIA_BASE}/texts/${commentator} on ${ref}?lang=he`);
  const data = await res.json();
  return data.he;
}

// שליפת פרק שלם
async function fetchChapter(book, chapter) {
  const res = await fetch(`${SEFARIA_BASE}/texts/${book}.${chapter}?lang=he`);
  const data = await res.json();
  return data.he; // מערך פסוקים מנוקדים
}
```

---
