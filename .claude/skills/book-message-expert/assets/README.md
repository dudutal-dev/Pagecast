# assets/

- `player-template.html` — נגן הקראה בעברית (Web Speech API) לפרק בודד. החלף את המצייני-מקום:
  `{{TITLE}}`, `{{AUTHOR}}`, `{{YEAR}}`, `{{DOMAIN}}`, `{{MESSAGE}}`, `{{COVER_HTML}}` (תג `<img src=…>` לכריכה אמיתית או SVG מוטמע מ-`book_card_svg.py`), ו-`{{SCRIPT}}` (תסריט הקריינות; הימנע מגרש הפוך ` בתוך התסריט).
  שמור ל-`/mnt/user-data/outputs/<slug>-player.html` והצג עם present_files.
