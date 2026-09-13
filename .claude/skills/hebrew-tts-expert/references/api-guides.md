# מדריכי API — Hebrew TTS

## תוכן עניינים
1. [ElevenLabs](#elevenlabs)
2. [OpenAI TTS](#openai-tts)
3. [Azure Cognitive Services](#azure)
4. [Google Cloud TTS](#google)
5. [השוואת APIs](#comparison)

---

## ElevenLabs {#elevenlabs}

### הגדרה
```
Base URL: https://api.elevenlabs.io/v1
מודל לעברית: eleven_multilingual_v2 (חובה!)
```

### קולות מומלצים לעברית

#### נשי
| שם | Voice ID | אופי | מתאים ל |
|-----|---------|------|---------|
| Rachel | 21m00Tcm4TlvDq8ikWAM | מקצועי, בהיר | מצגות, כתבות |
| Bella | EXAVITQu4vr4xnSDxMaL | חמה, ידידותית | שיחות, הסבר |
| Elli | MF3mGyEYCl7XYWbV9V6O | צעירה, נמרצת | בידור, מדיה |
| Grace | oWsMb4a16KJjSfCx1set | עמוקה, סמכותית | חדשות, דוקו |

#### גברי
| שם | Voice ID | אופי | מתאים ל |
|-----|---------|------|---------|
| Antoni | ErXwobaYiN019PkySvjV | קריין מקצועי | פרסומות |
| Josh | TxGEqnHWrfWFTfGW9XjX | שיחתי, חם | פודקאסט |
| Arnold | VR6AewLTigWG4xSOukaG | רציני, סמכותי | נאומים |
| Sam | yoZ06aMxZJJ28mfd3POQ | צעיר, נמרץ | הסברים |

### פרמטרים
```json
{
  "stability": 0.0–1.0,
  // 0 = דרמטי, וריאציות גדולות בטון
  // 1 = יציב ואחיד לחלוטין
  // מומלץ לעברית: 0.45–0.6

  "similarity_boost": 0.0–1.0,
  // עד כמה קרוב לאימון המקורי
  // מומלץ: 0.75

  "style": 0.0–1.0,
  // 0 = נייטרל, 1 = אקספרסיבי מאוד
  // מומלץ: 0.2–0.4 לרוב השימושים

  "use_speaker_boost": true
  // תמיד true לאיכות טובה יותר
}
```

### Streaming (לאפליקציות real-time)
```javascript
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
  { method: 'POST', headers: { 'xi-api-key': KEY }, body: JSON.stringify(payload) }
);

const reader = response.body.getReader();
const audioChunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  audioChunks.push(value);
}
```

---

## OpenAI TTS {#openai-tts}

### הגדרה
```
Base URL: https://api.openai.com/v1/audio/speech
מודלים: tts-1 (מהיר), tts-1-hd (איכות גבוהה)
```

### קולות
| קול | מגדר | אופי |
|-----|------|------|
| nova | נשי | חמה, טבעית — הכי טובה לעברית |
| shimmer | נשי | עדינה, נעימה |
| alloy | ניטרלי | נקי, מקצועי |
| echo | גברי | קריין רדיו |
| fable | גברי | חם, אנגלי |
| onyx | גברי | עמוק, סמכותי |

### הגדרות
```javascript
{
  model: 'tts-1-hd',
  voice: 'nova',
  speed: 0.95,           // 0.25–4.0
  response_format: 'mp3' // mp3, opus, aac, flac
}
```

### מגבלות OpenAI לעברית
- אין תמיכה ב-SSML
- RTL — עובד אבל לא מושלם
- מספרים — יש להמיר ידנית לטקסט לפני שליחה
- מקסימום: 4,096 תווים לבקשה

---

## Azure Cognitive Services {#azure}

### הגדרה
```
Base URL: https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
קולות עבריים ייעודיים: he-IL-HilaNeural, he-IL-AvriNeural
```

### קולות עבריים (ייעודיים!)
| קול | מגדר | אופי | Voice Name |
|-----|------|------|-----------|
| Hila | נשי | חמה, טבעית, שוטפת | he-IL-HilaNeural |
| Avri | גברי | מקצועי, ברור, נעים | he-IL-AvriNeural |

### SSML מלא לעברית
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="he-IL">
  <voice name="he-IL-HilaNeural">
    <!-- הגדרת סגנון (Azure-specific) -->
    <mstts:express-as style="newscast" styledegree="1.5">
      הטקסט כאן
    </mstts:express-as>
    
    <!-- הפסקה -->
    <break time="500ms"/>
    
    <!-- הדגשה -->
    <emphasis level="moderate">מילה חשובה</emphasis>
    
    <!-- שינוי קצב -->
    <prosody rate="-10%" pitch="+5%">טקסט מכוונן</prosody>
  </voice>
</speak>
```

### סגנונות Azure (mstts:express-as)
```
newscast      = כתב חדשות
customerservice = שירות לקוחות
chat          = שיחה יומיומית
assistant     = עוזר וירטואלי
cheerful      = שמח ועליז
empathetic    = אמפתי
```

### פורמטי פלט
```
audio-16khz-32kbitrate-mono-mp3   → קטן, מהיר
audio-16khz-128kbitrate-mono-mp3  → איכות טובה (מומלץ)
audio-24khz-160kbitrate-mono-mp3  → איכות גבוהה
riff-24khz-16bit-mono-pcm         → WAV איכות גבוהה
```

---

## Google Cloud TTS {#google}

### הגדרה
```
API: texttospeech.googleapis.com/v1/text:synthesize
קול עברי: he-IL-Wavenet-A/B/C/D
```

### קולות עבריים
| Voice | מגדר | אופי |
|-------|------|------|
| he-IL-Wavenet-A | נשי | טבעי |
| he-IL-Wavenet-B | גברי | מקצועי |
| he-IL-Wavenet-C | נשי | אלטרנטיבי |
| he-IL-Wavenet-D | גברי | אלטרנטיבי |
| he-IL-Standard-A | נשי | זול יותר |
| he-IL-Standard-B | גברי | זול יותר |

### קריאת API
```javascript
const response = await fetch(
  'https://texttospeech.googleapis.com/v1/text:synthesize',
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${GOOGLE_TOKEN}` },
    body: JSON.stringify({
      input: { ssml: '<speak>שלום עולם</speak>' },
      voice: { languageCode: 'he-IL', name: 'he-IL-Wavenet-A' },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,
        pitch: 0.0,
        volumeGainDb: 0.0,
        effectsProfileId: ['headphone-class-device']
      }
    })
  }
);
const { audioContent } = await response.json(); // base64 MP3
```

---

## השוואת APIs {#comparison}

| קריטריון | ElevenLabs | OpenAI TTS | Azure | Google |
|---------|-----------|------------|-------|--------|
| איכות עברית | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★☆ |
| SSML | ✗ | ✗ | ✓ מלא | ✓ מלא |
| קולות עבריים ייעודיים | ✗ רב-לשוני | ✗ | ✓ | ✓ |
| וריאציה רגשית | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ |
| Streaming | ✓ | ✓ | ✓ | ✓ |
| מחיר ($/1M תווים) | ~$180 | ~$15–30 | ~$16 | ~$16 |
| קלות שימוש | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ |

### המלצה לפי תרחיש:
- **איכות מקסימלית** → ElevenLabs Multilingual v2
- **פרויקט מהיר / תקציב** → OpenAI nova
- **עברית ייעודית + SSML** → Azure he-IL-HilaNeural
- **Google Workspace integration** → Google Wavenet
