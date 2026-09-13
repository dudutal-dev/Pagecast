# פונטיקה עברית ומדריך הגייה

## מילים ומונחים בעייתיים

### ראשי תיבות נפוצים — כיצד להמיר לפני TTS

| ראשי תיבות | המרה לקריאה |
|-----------|------------|
| בע"מ | בערבון מוגבל |
| מע"מ | מס ערך מוסף |
| ד"ר | דוקטור |
| פרופ' | פרופסור |
| ח"כ | חבר כנסת / חברת כנסת |
| רה"מ | ראש הממשלה |
| שר"פ | שירותים רפואיים פרטיים |
| בכ"מ | בכל מקום |
| כל"ב | כלב (לא לשנות) |
| מנכ"ל | מנהל כללי |
| סמנכ"ל | סגן מנהל כללי |
| ו"ע | ועדה |
| מ"מ | ממלא מקום |
| יו"ר | יושב ראש |
| כב' | כבוד |
| עמ' | עמוד |
| פר' | פרופסור |
| ת"א | תל אביב |
| י-ם | ירושלים |

### ניקוד — כיצד TTS מתמודד

כאשר הטקסט **מנוקד** — רוב ה-APIs יקראו נכון.
כאשר הטקסט **לא מנוקד** — יש מקרי קצה:

| מילה | הגייה נפוצה | בעיה |
|------|------------|------|
| שָׁלוֹם / שלום | שלום | בד"כ נכון |
| מֶלֶך / מלך | מלך | נכון |
| כֹּל / כל | כל/כול | לפעמים שגוי |
| אוֹר / אור | אור | נכון |
| עוֹלָם / עולם | עולם | נכון |
| אָחִי / אחי | אחי (לא אחי) | לפעמים שגוי |

**פתרון:** אם מנגנון TTS מגייה שגוי — הוסף ניקוד לאותה מילה בטקסט.

---

## כללי הגייה עברית לעיצוב SSML

### הטעמה (Stress)

בעברית, ברוב המילים ההטעמה על ההברה **האחרונה** (מלרע).
מילאל (הטעמה על ההברה לפני האחרונה) — דוגמאות:

```
אֶ֫רֶץ, שַׁ֫בָּת, מֶ֫לֶך, יֶ֫לֶד
```

ElevenLabs ו-Azure מתמודדים עם זה היטב ללא התערבות.

### משפטים ריגשיים

| סוג | תבנית טון | SSML |
|-----|----------|------|
| שאלה | עולה בסוף | `<prosody pitch="+15%">` |
| קריאה | גבוה ומהיר | `<prosody pitch="+10%" rate="fast">` |
| תגובה תמוהה | גבוה מאוד | `<prosody pitch="+20%">` |
| עצב/רציני | נמוך ואיטי | `<prosody pitch="-5%" rate="slow">` |
| שמחה | גבוה ומהיר | `<prosody pitch="+10%" rate="medium-fast">` |

---

## המרת מספרים לעברית

```javascript
const hebrewNumbers = {
  ones: ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'],
  teens: ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה',
          'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'],
  tens: ['', 'עשר', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'],
};

function numberToHebrew(num) {
  if (num === 0) return 'אפס';
  if (num < 10) return hebrewNumbers.ones[num];
  if (num < 20) return hebrewNumbers.teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return one === 0 ? hebrewNumbers.tens[ten] : `${hebrewNumbers.tens[ten]} ו${hebrewNumbers.ones[one]}`;
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const hundredStr = hundred === 1 ? 'מאה' : hundred === 2 ? 'מאתיים' : `${hebrewNumbers.ones[hundred]} מאות`;
    return rest === 0 ? hundredStr : `${hundredStr} ו${numberToHebrew(rest)}`;
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandStr = thousand === 1 ? 'אלף' : thousand === 2 ? 'אלפיים' : `${numberToHebrew(thousand)} אלף`;
    return rest === 0 ? thousandStr : `${thousandStr} ו${numberToHebrew(rest)}`;
  }
  // מיליון ומעלה
  const million = Math.floor(num / 1000000);
  const rest = num % 1000000;
  const millionStr = `${numberToHebrew(million)} מיליון`;
  return rest === 0 ? millionStr : `${millionStr} ו${numberToHebrew(rest)}`;
}
```

---

## המרת תאריכים לעברית

```javascript
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

function dateToHebrew(dateStr) {
  // תומך ב: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
  const parts = dateStr.split(/[./\-]/);
  let day, month, year;
  
  if (parts[0].length === 4) { // YYYY-MM-DD
    [year, month, day] = parts;
  } else { // DD.MM.YYYY
    [day, month, year] = parts;
  }
  
  return `${numberToHebrew(parseInt(day))} ב${hebrewMonths[parseInt(month) - 1]} ${numberToHebrew(parseInt(year))}`;
}
// "12.3.2026" → "שנים עשר במרץ אלפיים עשרים ושש"
```

---

## בעיות נפוצות ופתרונות

### בעיה: מילה לועזית בתוך טקסט עברי
**פתרון:** השאר כמות שהיא — ElevenLabs ו-Azure מטפלים מצוין
```
"הצוות עבד עם Docker ו-Kubernetes"
→ שלח כמות שהוא — יקרא נכון
```

### בעיה: קיצור שנקרא כ-acronym
**פתרון:** הוסף רווחים
```
"ה-AI" → "הבינה המלאכותית" / "ה-A.I."
"CEO" → "המנכ"ל" / "C.E.O."
```

### בעיה: שם ייחודי
**פתרון:** אל תשנה — ה-API ינסה; אם שגוי, השתמש ב-phoneme tag
```xml
<phoneme alphabet="x-sampa" ph="du:'du">דודו</phoneme>
```

### בעיה: ניסוח ביורוקרטי יבש
**פתרון:** הגדל style ב-ElevenLabs ל-0.5+, או הוסף SSML emphasis
```xml
<emphasis level="moderate">החלטה זו</emphasis> מחייבת
```

### בעיה: טקסט ארוך מ-4,096 תווים (OpenAI)
**פתרון:** חלק לפסקאות ואחד את האודיו
```javascript
function splitTextToChunks(text, maxLength = 4000) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLength) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += ' ' + s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}
```
