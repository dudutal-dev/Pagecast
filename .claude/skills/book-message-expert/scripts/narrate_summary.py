#!/usr/bin/env python3
"""
narrate_summary.py — Hebrew narration of a book-summary script.
Reads a .md/.txt narration script, preprocesses it for TTS (numbers → words, markdown stripped,
section headers → pauses), splits into ≤max-chars chunks, sends to ElevenLabs or OpenAI TTS,
and concatenates to one MP3. With --dry-run (or no API key) it only writes the cleaned script + SSML.

  python narrate_summary.py script.md --provider elevenlabs --voice <voice_id> --out episode.mp3
  python narrate_summary.py script.md --provider openai --voice alloy --out episode.mp3
  python narrate_summary.py script.md --dry-run
Env: ELEVENLABS_API_KEY / OPENAI_API_KEY. Needs `requests`; ffmpeg optional (used to join chunks).
"""
import argparse, os, re, sys, subprocess, tempfile, shutil, json

UNITS = ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע"]
TEENS = ["עשר", "אחת עשרה", "שתים עשרה", "שלוש עשרה", "ארבע עשרה", "חמש עשרה", "שש עשרה", "שבע עשרה", "שמונה עשרה", "תשע עשרה"]
TENS = ["", "", "עשרים", "שלושים", "ארבעים", "חמישים", "שישים", "שבעים", "שמונים", "תשעים"]
HUNDREDS = ["", "מאה", "מאתיים", "שלוש מאות", "ארבע מאות", "חמש מאות", "שש מאות", "שבע מאות", "שמונה מאות", "תשע מאות"]

def num_he(n):
    """Feminine-form Hebrew number words (fine for years, percentages, counts in narration)."""
    n = int(n)
    if n == 0: return "אפס"
    parts = []
    if n >= 1_000_000:
        m, n = divmod(n, 1_000_000); parts.append("מיליון" if m == 1 else f"{num_he(m)} מיליון")
    if n >= 1000:
        k, n = divmod(n, 1000)
        SMALL_K = {1: "אלף", 2: "אלפיים", 3: "שלושת אלפים", 4: "ארבעת אלפים", 5: "חמשת אלפים", 6: "ששת אלפים", 7: "שבעת אלפים", 8: "שמונת אלפים", 9: "תשעת אלפים", 10: "עשרת אלפים"}
        parts.append(SMALL_K.get(k, f"{num_he(k)} אלף"))
    if n >= 100:
        h, n = divmod(n, 100); parts.append(HUNDREDS[h])
    if n >= 20:
        t, n = divmod(n, 10); parts.append(TENS[t] + (f" ו{UNITS[n]}" if n else ""))
    elif n >= 10:
        parts.append(TEENS[n - 10])
    elif n:
        parts.append(UNITS[n])
    out = parts[0]
    for p in parts[1:]:
        out += " ו" + p
    return out

def preprocess(text):
    # strip markdown
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    text = re.sub(r"\*\*|__|\*|`", "", text)
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    # bracketed stage directions like [פתיח · 20 שנ'] → paragraph pause marker
    text = re.sub(r"^\s*\[[^\]]*\]\s*$", "\n§\n", text, flags=re.M)
    # symbols
    text = text.replace("₪", " שקלים").replace("$", " דולר").replace("€", " יורו")
    text = re.sub(r"(\d+)\s*%", lambda m: f"{num_he(m.group(1))} אחוז", text)
    text = re.sub(r"\b(\d{1,3}(?:,\d{3})+|\d+)\b", lambda m: num_he(m.group(1).replace(",", "")), text)
    # common abbreviations
    for k, v in {'ד"ר': "דוקטור", 'רו"ח': "רואה חשבון", 'ארה"ב': "ארצות הברית", 'בע"מ': "בערבון מוגבל", 'עמ\'': "עמודים"}.items():
        text = text.replace(k, v)
    text = text.replace("…", ".").replace(" — ", ", ").replace("—", ",")
    text = re.sub(r"([בלמכשוה])-(?=[א-ת])", r"\1", text)  # ב-אלף → באלף
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def to_ssml(text):
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    body = ""
    for p in paras:
        if p == "§": body += '<break time="700ms"/>'; continue
        body += f"<p>{p}</p>"
    return f'<speak xml:lang="he-IL">{body}</speak>'

def chunks(text, max_chars):
    paras = [p for p in text.replace("§", "").split("\n\n") if p.strip()]
    out, cur = [], ""
    for p in paras:
        if len(cur) + len(p) + 2 > max_chars and cur:
            out.append(cur); cur = p
        else:
            cur = (cur + "\n\n" + p).strip()
    if cur: out.append(cur)
    return out

def tts_elevenlabs(text, voice, key, model="eleven_multilingual_v2"):
    import requests
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": model, "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.2}}, timeout=120)
    r.raise_for_status(); return r.content

def tts_openai(text, voice, key, model="gpt-4o-mini-tts"):
    import requests
    r = requests.post("https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "voice": voice, "input": text, "response_format": "mp3",
              "instructions": "Warm, calm Hebrew podcast narrator. Natural pace, clear diction, slight pauses between ideas."}, timeout=120)
    r.raise_for_status(); return r.content

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script"); ap.add_argument("--provider", choices=["elevenlabs", "openai"], default="elevenlabs")
    ap.add_argument("--voice", default=None); ap.add_argument("--out", default="episode.mp3")
    ap.add_argument("--max-chars", type=int, default=4000); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    raw = open(a.script, encoding="utf-8").read()
    clean = preprocess(raw)
    base = os.path.splitext(a.out)[0]
    open(base + ".clean.txt", "w", encoding="utf-8").write(clean.replace("§", ""))
    open(base + ".ssml.xml", "w", encoding="utf-8").write(to_ssml(clean))
    words = len(clean.split()); print(f"cleaned script: {words} words ≈ {words/150:.1f} min → {base}.clean.txt / .ssml.xml")
    key = os.environ.get("ELEVENLABS_API_KEY" if a.provider == "elevenlabs" else "OPENAI_API_KEY")
    if a.dry_run or not key:
        print("dry run (no API key or --dry-run): no audio produced. Run locally with the key set, or open the HTML player (Web Speech)."); return
    voice = a.voice or ("alloy" if a.provider == "openai" else None)
    if not voice: sys.exit("--voice <voice_id> is required for ElevenLabs")
    parts = chunks(clean, a.max_chars); tmp = tempfile.mkdtemp(); files = []
    for i, p in enumerate(parts):
        audio = (tts_elevenlabs if a.provider == "elevenlabs" else tts_openai)(p, voice, key)
        f = os.path.join(tmp, f"part{i:02d}.mp3"); open(f, "wb").write(audio); files.append(f); print("chunk", i + 1, "/", len(parts))
    if len(files) == 1 or not shutil.which("ffmpeg"):
        with open(a.out, "wb") as o:
            for f in files: o.write(open(f, "rb").read())  # raw concat works for most mp3 players
    else:
        lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{f}'\n" for f in files))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", a.out], check=True)
    print("wrote", a.out)

if __name__ == "__main__":
    main()
