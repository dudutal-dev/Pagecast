---
name: hebrew-tts-expert
description: >
  מומחה להמרת טקסט לדיבור בעברית (Hebrew Text-to-Speech). הפעל סקיל זה בכל פעם שהמשתמש מבקש:
  לקרוא טקסט עברי בקול, להמיר טקסט לקובץ שמע, לייצר קריינות בעברית, לבחור קול גברי או נשי עם טון מסוים,
  לבנות אפליקציית TTS, להפיק אודיו מטקסט, לנתח טקסט לצורך הקראה, להוסיף הפסקות ופסנקטואציה לדיבור,
  לקרוא ספר בקול (audiobook), לקרוא פרקים מהתנ"ך בקול (תורה, נביאים, כתובים, תהלים, משלי, קהלת),
  לספק פרשנות לפסוקים לפני/אחרי הקראתם, לשלב הקראה עם ביאור רש"י/רמב"ן/אבן עזרא,
  או כל בקשה הקשורה לדיבור סינתטי בעברית. מכסה: ניתוח טקסט עברי, ניקוד ופונטיקה, עיבוד מקדים,
  בחירת קול (נשי/גברי עם גוונים שונים), ושימוש ב-APIs של ElevenLabs, OpenAI TTS, Azure Cognitive Services,
  Google Cloud TTS. אפילו אם המשתמש אומר "תקרא לי את הפרק" / "תקריין את הספר" / "תסביר את הפסוק" — הפעל סקיל זה מיד.
---

# Hebrew TTS Expert — מומחה המרת טקסט לדיבור בעברית

## תפקיד הסקיל

המומחה ידריך, יתכנן, וייצר פתרונות TTS בעברית ברמה גבוהה — טבעי, שוטף, ולא רובוטי.
הדגש הוא על **הבנת הטקסט העברי לעומקו** לפני ההמרה, ועל בחירת הקול, הטון, הקצב, והפסיעה הנכונים.

---

## שלב 1 — ניתוח וקריאת הטקסט (Text Analysis)

לפני כל המרה, נתח את הטקסט לפי הסדר הבא:

### א. זיהוי סוג הטקסט
| סוג | מאפיינים | שיטת הקראה |
|-----|----------|------------|
| נאום / מצגת | פורמלי, ארוך | קצב מתון, הדגשות, הפסקות בין פסקאות |
| חדשות / כתבה | אינפורמטיבי, עובדתי | מקצועי, יציב, רצינות |
| שיחה / דיאלוג | יומיומי, קצר | טבעי, אנרגטי, וריאציות בטון |
| מסמך משפטי/כספי | מדויק, טכני | איטי, בהיר, חד-משמעי |
| ספרות / שירה | יצירתי, רגשי | אקספרסיבי, הפסקות דרמטיות |
| הסברה / ילדים | פשוט, חינוכי | חם, ברור, אטי יותר |
| **הקראת ספר (Audiobook)** | פרוזה ספרותית, דמויות, עלילה | ראה שלב 7 — מצב Audiobook |
| **פרקי תנ"ך** | לשון קדש, מבנה פסוקים, טעמים | ראה שלב 8 — מצב תנ"ך |
| **פרשנות תנ"כית** | ביאור, דרש, מקורות | ראה שלב 9 — מצב פרשנות |

### ב. עיבוד מקדים של הטקסט (Preprocessing)

**חובה לטפל בכל הבאים לפני שליחה ל-API:**

```
מספרים        → "15,000" = "חמישה עשר אלף"
תאריכים       → "12.3.2026" = "שנים עשר במרץ אלפיים עשרים ושש"
ראשי תיבות    → "מע"מ" = "מס ערך מוסף" (או להשאיר אם נהוג לומר כמות שהוא)
סימנים        → "₪", "$", "%" = "שקלים", "דולרים", "אחוזים"
שמות לועזיים  → שמור כמות שהם, ElevenLabs יודע להגות
קיצורים       → "בע"מ" = "בערבון מוגבל", "בכ"מ" = "בכל מקום"
אנגלית בתוך עברית → המיר ל-SSML עם lang attribute
```

### ג. SSML Tags — לשליטה על הדיבור

כאשר ה-API תומך ב-SSML (כגון Azure, Google), השתמש בתגים הבאים:

```xml
<!-- הפסקה קצרה -->
<break time="300ms"/>

<!-- הפסקה בין פסקאות -->
<break time="700ms"/>

<!-- הדגשה -->
<emphasis level="strong">מילה חשובה</emphasis>

<!-- קצב מואט -->
<prosody rate="slow">טקסט איטי יותר</prosody>

<!-- טון גבוה יותר -->
<prosody pitch="+2st">שאלה?</prosody>

<!-- מספרים כמילים -->
<say-as interpret-as="cardinal">15000</say-as>

<!-- תאריכים -->
<say-as interpret-as="date" format="dmy">12.3.2026</say-as>
```

---

## שלב 2 — בחירת קול (Voice Selection)

### קולות נשיים (Female Voices)

| טון | אופי | מתאים ל | מזהה (ElevenLabs) |
|-----|------|---------|------------------|
| **חמה ואמפתית** | רך, אנושי, קרוב | שירות לקוחות, ילדים, פודקאסטים | `Aria` |
| **מקצועית-עסקית** | בהיר, מהיר, אסרטיבי | מצגות, כתבות, הסברה | `Rachel` |
| **אנרגטית-צעירה** | עליז, נמרץ, ידידותי | מדיה חברתית, פרסום, בידור | `Bella` |
| **כבדת-סמכות** | עמוק יותר, רציני, מרשים | חדשות, דוקומנטרים, הכרזות | `Dorothy` |

### קולות גבריים (Male Voices)

| טון | אופי | מתאים ל | מזהה (ElevenLabs) |
|-----|------|---------|------------------|
| **קריין מקצועי** | עמוק, חלק, מרשים | פרסומות, קריינות, הכרזות | `Antoni` |
| **שיחתי-ידידותי** | חם, קרוב, טבעי | פודקאסט, הסבר, הדרכה | `Josh` |
| **סמכותי-רשמי** | רציני, איטי, בהיר | חדשות, מסמכים, נאומים | `Arnold` |
| **צעיר-נמרץ** | אנרגטי, ישיר, נגיש | סרטוני הסבר, סטארטאפ, אפליקציות | `Sam` |

> **הערה:** לעברית, ElevenLabs מאפשר Multilingual v2 שמבין עברית נפלא. Azure ו-Google יש להם קולות עבריים ייעודיים — ראה `references/api-guides.md`.

---

## שלב 3 — שימוש ב-API

### ElevenLabs (מומלץ לאיכות הגבוהה ביותר)

```javascript
// המרה בסיסית — עברית עם ElevenLabs
async function hebrewTTS(text, voiceId = 'EXAVITQu4vr4xnSDxMaL', options = {}) {
  const processedText = preprocessHebrewText(text);
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': YOUR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: processedText,
        model_id: 'eleven_multilingual_v2', // חובה לעברית!
        voice_settings: {
          stability: options.stability ?? 0.5,         // 0=דרמטי, 1=יציב
          similarity_boost: options.similarity ?? 0.75,
          style: options.style ?? 0.3,                 // 0=נייטרל, 1=אקספרסיבי
          use_speaker_boost: true
        }
      }),
    }
  );
  
  const audioBuffer = await response.arrayBuffer();
  return audioBuffer;
}
```

### OpenAI TTS

```javascript
// OpenAI — פשוט ומהיר, עברית בסיסית
async function openaiHebrewTTS(text, voice = 'nova') {
  // קולות: alloy, echo, fable, onyx, nova, shimmer
  // nova / shimmer = נשי | onyx / echo = גברי
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',   // איכות גבוהה
      input: text,
      voice: voice,
      speed: 0.95,         // מעט איטי יותר — טבעי יותר בעברית
      response_format: 'mp3',
    }),
  });
  
  return response.blob();
}
```

### Azure Cognitive Services (SSML מלא)

```javascript
// Azure — תומך SSML מלא עם קול עברי ייעודי
const AZURE_VOICE_HEBREW = {
  female_warm:       'he-IL-HilaNeural',       // חמה ונגישה
  female_professional: 'he-IL-AvriNeural',     // (גם זמין) 
  male_professional: 'he-IL-AvriNeural',       // גברי מקצועי
};

async function azureHebrewTTS(ssmlText, voice = 'he-IL-HilaNeural') {
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="he-IL">
      <voice name="${voice}">
        ${ssmlText}
      </voice>
    </speak>
  `;
  
  const response = await fetch(
    `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    }
  );
  return response.blob();
}
```

---

## שלב 4 — פרמטרים לדיבור טבעי

### כוונון לפי מטרה

| מטרה | Stability | Similarity | Style | קצב |
|------|-----------|------------|-------|-----|
| נאום רשמי | 0.7 | 0.75 | 0.1 | 0.90× |
| שיחה יומיומית | 0.4 | 0.70 | 0.5 | 1.00× |
| פרסומת / הכרזה | 0.5 | 0.80 | 0.6 | 1.05× |
| קריאת ספר | 0.6 | 0.75 | 0.4 | 0.85× |
| ילדים | 0.3 | 0.70 | 0.7 | 0.90× |
| כתבת חדשות | 0.8 | 0.80 | 0.1 | 0.95× |
| **Audiobook — ספר** | 0.55 | 0.75 | 0.45 | 0.88× |
| **תנ"ך — הקראה** | 0.65 | 0.80 | 0.25 | 0.80× |
| **תנ"ך — פרשנות** | 0.50 | 0.75 | 0.35 | 0.90× |

### כללי טבעיות (Naturalness Rules)

1. **הפסקות** — הוסף `<break time="400ms"/>` אחרי פסיק ו-`<break time="700ms"/>` אחרי נקודה
2. **שאלות** — עלה בטון בסוף; ב-SSML: `<prosody pitch="+1st">`
3. **רשימות** — הפסקה קצרה בין פריטים, ירידת טון בפריט האחרון
4. **מספרים גדולים** — תמיד המר לטקסט לפני שליחה
5. **שמות פרטיים** — אל תשנה; תן ל-API להגות
6. **ציטוטים** — שקול שינוי טון (`prosody rate="slow"`)
7. **רגש** — ב-ElevenLabs, הגדל `style` ל-0.6–0.8; הפחת `stability` ל-0.3–0.4

---

## שלב 5 — פונקציית עיבוד מקדים (Preprocessing)

```javascript
function preprocessHebrewText(text) {
  return text
    // המר מספרים
    .replace(/(\d{1,3}(?:,\d{3})+)/g, (match) => 
      parseInt(match.replace(/,/g, '')).toLocaleString('he-IL', { style: 'decimal' }))
    
    // סימני מטבע
    .replace(/₪\s?(\d+)/g, '$1 שקלים')
    .replace(/\$\s?(\d+)/g, '$1 דולרים')
    .replace(/€\s?(\d+)/g, '$1 יורו')
    
    // אחוזים
    .replace(/(\d+)%/g, '$1 אחוזים')
    
    // ראשי תיבות נפוצים
    .replace(/\bבע"מ\b/g, 'בערבון מוגבל')
    .replace(/\bמע"מ\b/g, 'מס ערך מוסף')
    .replace(/\bד"ר\b/g, 'דוקטור')
    .replace(/\bפרופ'\b/g, 'פרופסור')
    .replace(/\bח"כ\b/g, 'חבר כנסת')
    .replace(/\bרה"מ\b/g, 'ראש הממשלה')
    
    // נקה תווים בעייתיים
    .replace(/\*/g, '')
    .replace(/_/g, ' ')
    .replace(/#{1,6}\s/g, '') // כותרות markdown
    
    .trim();
}
```

---

## שלב 6 — בניית אפליקציית TTS (Web App Pattern)

כאשר המשתמש מבקש אפליקציית TTS מלאה, השתמש בתבנית הבאה:

```html
<!-- תבנית בסיסית: ממשק RTL עם בחירת קול ופלייר -->
<div dir="rtl" lang="he">
  <!-- אזור הקלט -->
  <textarea id="input" placeholder="הכנס טקסט עברי כאן..."></textarea>
  
  <!-- בחירת קול -->
  <select id="voice-gender">
    <option value="female">נשי</option>
    <option value="male">גברי</option>
  </select>
  <select id="voice-tone">
    <!-- יאוכלס דינמית לפי מגדר -->
  </select>
  
  <!-- כוונון -->
  <input type="range" id="stability" min="0" max="1" step="0.1" value="0.5">
  <input type="range" id="style" min="0" max="1" step="0.1" value="0.3">
  <input type="range" id="speed" min="0.7" max="1.3" step="0.05" value="0.95">
  
  <!-- כפתורים -->
  <button onclick="generateSpeech()">🎙️ המר לדיבור</button>
  <button onclick="downloadAudio()">⬇️ הורד MP3</button>
  
  <!-- פלייר -->
  <audio id="player" controls></audio>
</div>
```

---

---


## שלב 7 — מצב Audiobook: הקראת ספר 📖

> 📁 **פירוט מלא:** קרא את `references/audiobook-tanakh-modes.md` — מצבי Audiobook, תנ"ך ופרשנות — מדריך מלא.

## מדריכי עיון נוספים

לפרטים נוספים, קרא את הקבצים הבאים:
- `references/api-guides.md` — מדריך מלא לכל API: ElevenLabs, OpenAI, Azure, Google
- `references/hebrew-phonetics.md` — כללי הגייה עברית, מילים בעייתיות, ראשי תיבות
- `references/bible-reading.md` — רשימת ספרי תנ"ך, טעמי מקרא, מקורות Sefaria

---

## קיצורי דרך — תרשים החלטה

```
האם המשתמש צריך:
├── איכות גבוהה + גוונים עשירים?       → ElevenLabs Multilingual v2
├── פשוט ומהיר + תקציב נמוך?           → OpenAI TTS-1-HD
├── SSML + שליטה מלאה + עברית?         → Azure he-IL-HilaNeural / AvriNeural
├── ענן Google + קולות מגוונים?        → Google WaveNet he-IL
│
├── הקראת ספר (Audiobook)?             → שלב 7 | ElevenLabs + Character Map
├── הקראת תנ"ך (פסוקים/פרק)?           → שלב 8 | Azure AvriNeural + Sefaria API
└── פרשנות + הקראה (ביאור)?            → שלב 9 | Azure SSML + Sefaria Commentary
```

**כלל הזהב:** תמיד הפעל `preprocessHebrewText()` לפני שליחה לכל API.
**לתנ"ך:** הפעל `preprocessBibleText()` ו-`fetchBibleVerse()` מ-Sefaria.
