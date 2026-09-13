# מדריך הקראת תנ"ך ופרשנות

## תוכן עניינים
1. [רשימת ספרי תנ"ך ל-Sefaria API](#books)
2. [טעמי מקרא והפסקות](#cantillation)
3. [פרשנים מרכזיים ומבנה הפרשנות](#commentators)
4. [דוגמאות SSML לפסוקים נבחרים](#examples)
5. [מבנה אפליקציית תנ"ך מלאה](#app)

---

## רשימת ספרי תנ"ך ל-Sefaria API {#books}

### תורה
| שם עברי | Sefaria ID | פרקים |
|---------|-----------|-------|
| בראשית | Genesis | 50 |
| שמות | Exodus | 40 |
| ויקרא | Leviticus | 27 |
| במדבר | Numbers | 36 |
| דברים | Deuteronomy | 34 |

### נביאים ראשונים
| שם עברי | Sefaria ID | פרקים |
|---------|-----------|-------|
| יהושע | Joshua | 24 |
| שופטים | Judges | 21 |
| שמואל א | I Samuel | 31 |
| שמואל ב | II Samuel | 24 |
| מלכים א | I Kings | 22 |
| מלכים ב | II Kings | 25 |

### נביאים אחרונים
| שם עברי | Sefaria ID | פרקים |
|---------|-----------|-------|
| ישעיהו | Isaiah | 66 |
| ירמיהו | Jeremiah | 52 |
| יחזקאל | Ezekiel | 48 |
| הושע | Hosea | 14 |
| יואל | Joel | 4 |
| עמוס | Amos | 9 |
| מיכה | Micah | 7 |
| זכריה | Zechariah | 14 |
| מלאכי | Malachi | 3 |

### כתובים
| שם עברי | Sefaria ID | פרקים | מאפיין מיוחד |
|---------|-----------|-------|-------------|
| תהלים | Psalms | 150 | שירה, רגשי מאוד |
| משלי | Proverbs | 31 | פסוקים קצרים, חוכמה |
| איוב | Job | 42 | דרמה, דיאלוג |
| שיר השירים | Song of Songs | 8 | שירה, רומנטי |
| קהלת | Ecclesiastes | 12 | פילוסופי, עמוק |
| רות | Ruth | 4 | סיפור, נרטיבי |
| אסתר | Esther | 10 | סיפור, הרפתקאות |
| דניאל | Daniel | 12 | חזיונות, דרמה |

---

## טעמי מקרא והפסקות {#cantillation}

### המרה מטעמים להפסקות TTS

הטעמים מחולקים לשתי קבוצות: **מפסיקים** (עוצרים את הנגינה) ו**משרתים** (ממשיכים).

#### מפסיקים — הפסקות TTS

| טעם | סמל | חוזק | break time |
|-----|-----|------|-----------|
| סִלּוּק (סוף פסוק) | ◌ֽ | חזק מאוד (סוף פסוק) | `1000ms` |
| אַתְנָח | ◌ֽ (באמצע) | חזק (חצי פסוק) | `650ms` |
| זָקֵף קָטֹן | ◌֔ | בינוני | `380ms` |
| זָקֵף גָּדוֹל | ◌֕ | בינוני | `380ms` |
| שַׁלְשֶׁלֶת | ◌֓ | חזק-מיוחד | `600ms` |
| רְבִיעַ | ◌֗ | קל-בינוני | `250ms` |
| טִפְּחָא | ◌֖ | קל | `180ms` |
| פַּשְׁטָא | ◌֙ | קל | `150ms` |

#### משרתים — ללא הפסקה משמעותית
מרכא, מונח, דרגא, תלישא — `break time="50ms"` בלבד.

### זיהוי אוטומטי של טעמים מניקוד

```javascript
const CANTILLATION_BREAKS = {
  '\u05BD': '1000ms', // sof pasuk / silluq
  '\u0591': '650ms',  // etnahta
  '\u0594': '380ms',  // zaqef qatan
  '\u0595': '380ms',  // zaqef gadol
  '\u0593': '600ms',  // shalshelet
  '\u0597': '250ms',  // revia
  '\u0596': '180ms',  // tipeha
  '\u0599': '150ms',  // pashta
};

function insertBreaksFromCantillation(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += text[i];
    const breakTime = CANTILLATION_BREAKS[text[i]];
    if (breakTime) {
      result += `<break time="${breakTime}"/>`;
    }
  }
  return result;
}
```

---

## פרשנים מרכזיים ומבנה הפרשנות {#commentators}

### מי הם הפרשנים ומה הם מביאים

#### רש"י (Rabbi Shlomo Yitzchaki, 1040–1105)
- **גישה:** פשט + מדרש, עברית תמציתית
- **מתאים ל:** ביאור ראשוני, נגיש לכל
- **Sefaria:** `Rashi on Genesis.1.1` וכו'
- **טון קריאה:** ברור, קצר, ישיר. stability 0.65

#### רמב"ן (Nachmanides, 1194–1270)
- **גישה:** עמקות פילוסופית, קבלה, ויכוח עם רש"י
- **מתאים ל:** עיון מעמיק, מחשבה
- **Sefaria:** `Ramban on Genesis.1.1`
- **טון קריאה:** איטי, נשגב. rate -15%, stability 0.70

#### אבן עזרא (Ibn Ezra, 1089–1167)
- **גישה:** דקדוק, לשון, ביקורת ספרותית
- **מתאים ל:** ניתוח לשוני, חוקרים
- **Sefaria:** `Ibn Ezra on Genesis.1.1`
- **טון קריאה:** מדויק, אנליטי. rate -5%

#### ספורנו (Sforno, 1470–1550)
- **גישה:** רציונלי, הוסיאני, עכשווי
- **מתאים ל:** יישום לחיים, מסרים ברורים
- **Sefaria:** `Sforno on Genesis.1.1`
- **טון קריאה:** חם, ישיר. style +0.1

#### אור החיים (Chaim ibn Attar, 1696–1743)
- **גישה:** עמוק, מיסטי, רגשי
- **Sefaria:** `Or HaChaim on Genesis.1.1`
- **טון קריאה:** עמוק, דרמטי. pitch -3st

### בנייה אוטומטית של פרשנות לדיבור

```javascript
const COMMENTATORS = {
  rashi:     { sefariaId: 'Rashi',         label: 'רש"י אומר',          rate: '-5%',  stability: 0.65 },
  ramban:    { sefariaId: 'Ramban',        label: 'הרמב"ן מסביר',        rate: '-15%', stability: 0.70 },
  ibn_ezra:  { sefariaId: 'Ibn Ezra',      label: 'אבן עזרא מציין',      rate: '-5%',  stability: 0.68 },
  sforno:    { sefariaId: 'Sforno',        label: 'הספורנו מוסיף',       rate: '0%',   stability: 0.55 },
  orhachaim: { sefariaId: 'Or HaChaim',   label: 'אור החיים הקדוש',     rate: '-10%', stability: 0.72 },
};

async function buildFullCommentarySSML(book, chapter, verse, selectedCommentators) {
  const verseRef = `${SEFARIA_BOOKS[book]}.${chapter}.${verse}`;
  
  // שלוף פסוק מנוקד
  const verseData = await fetchBibleVerse(verseRef);
  const processedVerse = preprocessBibleText(insertBreaksFromCantillation(verseData.he));
  
  let ssml = `
    <!-- הקראת הפסוק -->
    <prosody rate="-15%" pitch="-2st">
      ${processedVerse}
    </prosody>
    <break time="1500ms"/>
  `;

  // הוסף כל פרשן
  for (const commentatorKey of selectedCommentators) {
    const c = COMMENTATORS[commentatorKey];
    const commentaryData = await fetchCommentary(verseRef, c.sefariaId);
    const commentaryText = cleanCommentaryText(commentaryData.he);

    ssml += `
      <emphasis level="moderate">${c.label}:</emphasis>
      <break time="400ms"/>
      <prosody rate="${c.rate}">
        ${commentaryText}
      </prosody>
      <break time="1000ms"/>
    `;
  }
  
  return wrapInAzureSSML(ssml, 'he-IL-AvriNeural');
}

function cleanCommentaryText(text) {
  // נקה HTML tags ממקורות Sefaria
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '') // הסר הפניות
    .trim();
}
```

---

## דוגמאות SSML לפסוקים נבחרים {#examples}

### בראשית א:א — הקראה בסיסית

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="he-IL">
<voice name="he-IL-AvriNeural">
  <prosody rate="-15%" pitch="-2st">
    בְּרֵאשִׁית<break time="50ms"/>
    בָּרָא אֱלֹהִים<break time="180ms"/>
    אֵת הַשָּׁמַיִם<break time="50ms"/>
    וְאֵת הָאָרֶץ.<break time="1000ms"/>
  </prosody>
</voice>
</speak>
```

### תהלים כ"ג — שיר הרועה (שירה, רגשי)

```xml
<speak version="1.0" xml:lang="he-IL">
<voice name="he-IL-HilaNeural">
  <prosody rate="-20%" pitch="-1st">

    <prosody pitch="+3st">מִזְמוֹר לְדָוִד.</prosody>
    <break time="1200ms"/>

    יְהוָה<break time="50ms"/> רֹעִי,<break time="380ms"/>
    לֹא אֶחְסָר.<break time="1000ms"/>

    בִּנְאוֹת דֶּשֶׁא<break time="180ms"/> יַרְבִּיצֵנִי,<break time="650ms"/>
    עַל מֵי מְנֻחוֹת<break time="180ms"/> יְנַהֲלֵנִי.<break time="1000ms"/>

  </prosody>
</voice>
</speak>
```

### משלי ג:ה–ו — חוכמה (פסוקים קצרים)

```xml
<speak version="1.0" xml:lang="he-IL">
<voice name="he-IL-AvriNeural">
  <prosody rate="-10%">

    בְּטַח אֶל יְהוָה<break time="380ms"/>
    בְּכָל לִבֶּךָ,<break time="650ms"/>
    וְאֶל בִּינָתְךָ<break time="180ms"/> אַל תִּשָּׁעֵן.<break time="1000ms"/>

    בְּכָל דְּרָכֶיךָ<break time="180ms"/> דָעֵהוּ,<break time="380ms"/>
    וְהוּא יְיַשֵּׁר<break time="50ms"/> אֹרְחֹתֶיךָ.<break time="1000ms"/>

  </prosody>
</voice>
</speak>
```

---

## מבנה אפליקציית תנ"ך מלאה {#app}

```
אפליקציית TTS תנ"ך — רכיבים:

├── Navigator (ניווט)
│   ├── dropdown: בחר ספר (24 ספרים)
│   ├── dropdown: בחר פרק
│   └── input: מספר פסוק (אופציונלי)
│
├── Display Panel (תצוגה)
│   ├── הטקסט המנוקד (RTL, פונט Frank Ruehl / SBL Hebrew)
│   ├── הדגשת פסוק נוכחי בזמן הקראה
│   └── Toggle: ניקוד / ללא ניקוד
│
├── Commentary Panel (פרשנות)
│   ├── checkboxes: בחר פרשנים (רש"י / רמב"ן / אב"ע...)
│   ├── slider: עומק הפרשנות (קצר / מלא)
│   └── toggle: פשט בלבד / פשט + דרש
│
├── Audio Controls (אודיו)
│   ├── בחר קול (Azure: Avri/Hila | ElevenLabs: Arnold/Dorothy)
│   ├── slider: מהירות (0.7× – 1.1×)
│   ├── ▶ הקרא פסוק / ▶ הקרא פרק / ▶ הקרא עם פרשנות
│   ├── ⬇ הורד MP3
│   └── audio player עם timeline לפי פסוקים
│
└── Settings
    ├── API key (Azure / ElevenLabs)
    ├── שמור מיפוי קולות לדמויות
    └── Cache: שמור אודיו שנוצר
```

### פונטים מומלצים לתצוגת תנ"ך בממשק

```css
/* פונטים לניקוד נכון */
@font-face {
  font-family: 'SBL Hebrew';
  src: url('https://fonts.sbl.edu/SBLHebrew.woff2');
}

.bible-text {
  font-family: 'SBL Hebrew', 'David', 'Frank Ruehl CLM', serif;
  font-size: 1.4rem;
  line-height: 2.2;
  direction: rtl;
  unicode-bidi: embed;
  color: #2c1810;
  letter-spacing: 0.02em;
}

.verse-number {
  font-size: 0.75rem;
  color: #888;
  vertical-align: super;
  margin-left: 4px;
}

.verse-active {
  background: #fef3cd;
  border-radius: 4px;
  padding: 2px 4px;
}
```
