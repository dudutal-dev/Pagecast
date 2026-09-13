#!/usr/bin/env python3
"""
book_card_svg.py — original illustrated "book card" (3:4) for a summary/podcast episode.
NOT a reproduction of the real cover: uses its own palette + a metaphor motif per life domain.

Usage:
  python book_card_svg.py --title "אדם מחפש משמעות" --author "ויקטור פרנקל" --domain psychology \
      --subtitle "תמיד נשארת הבחירה איך להגיב" --out card.svg
  python book_card_svg.py --title "Deep Work" --author "Cal Newport" --domain productivity --lang en --out card.svg
Options: --motif <name> to override the domain motif; --png to also write PNG (needs cairosvg).
"""
import argparse, html, sys

PALETTES = {  # bg, accent, text, secondary
    "personal":      ("#0F2A44", "#E3B341", "#F5F0E8", "#7FA6C9"),
    "psychology":    ("#2E1F47", "#F0E6D2", "#F5F0E8", "#A88BD1"),
    "business":      ("#1E1E1E", "#2BB3A3", "#F5F0E8", "#8A8A8A"),
    "money":         ("#173B2B", "#D4AF37", "#F5F0E8", "#6FAF8B"),
    "productivity":  ("#1B1F3B", "#F28C28", "#F5F0E8", "#8E93C2"),
    "relationships": ("#4A1424", "#F4C7CF", "#F5F0E8", "#C97B8E"),
    "parenting":     ("#B5561D", "#FFF1DC", "#FFF8EE", "#F2B27A"),
    "health":        ("#0D3B3F", "#8FE3CF", "#F5F0E8", "#3F8F93"),
    "spirituality":  ("#1F1B4D", "#C9BEEB", "#F5F0E8", "#7A6FBF"),
    "philosophy":    ("#4B4238", "#D97B4A", "#F5F0E8", "#B8A48A"),
    "history":       ("#3B2A1E", "#D9B98C", "#F5F0E8", "#8C6B4F"),
    "science":       ("#061A33", "#3CD6E8", "#F5F0E8", "#4C7BB0"),
    "biography":     ("#111111", "#E63946", "#F5F0E8", "#9A9A9A"),
    "fiction":       ("#1D3B2A", "#C9A961", "#F5F0E8", "#6B9C7E"),
}
DEFAULT_MOTIF = {
    "personal": "stairs", "psychology": "lamp", "business": "compass", "money": "seed",
    "productivity": "hourglass", "relationships": "chairs", "parenting": "hands",
    "health": "breath", "spirituality": "ripple", "philosophy": "door", "history": "wheel",
    "science": "telescope", "biography": "silhouette", "fiction": "bird",
}

def motif_svg(name, a, s):
    """Simple line-art metaphors, drawn inside a 300x300 box centered at (300,330)."""
    g = f'<g transform="translate(150,180)" fill="none" stroke="{a}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">'
    m = {
      "stairs": f'<path d="M20 280 H90 V220 H160 V160 H230 V100 H290"/><circle cx="270" cy="60" r="16" fill="{a}" stroke="none"/>',
      "lamp": f'<circle cx="150" cy="120" r="70"/><path d="M110 200 H190 M120 230 H180 M150 20 V0 M60 60 L45 45 M240 60 L255 45"/><path d="M130 190 L120 120 M170 190 L180 120" stroke="{s}"/>',
      "compass": f'<circle cx="150" cy="150" r="120"/><circle cx="150" cy="150" r="10" fill="{a}"/><path d="M150 40 L175 150 L150 260 L125 150 Z" fill="{a}" fill-opacity="0.35"/><path d="M40 150 H70 M230 150 H260"/>',
      "seed": f'<path d="M150 280 V150"/><path d="M150 150 C150 90 200 70 240 80 C230 130 190 150 150 150 Z" fill="{a}" fill-opacity="0.3"/><path d="M150 200 C150 150 100 130 60 140 C70 190 110 200 150 200 Z" fill="{a}" fill-opacity="0.3"/><path d="M60 280 H240" stroke="{s}"/>',
      "hourglass": f'<path d="M70 20 H230 M70 280 H230 M90 20 C90 120 150 130 150 150 C150 170 90 180 90 280 M210 20 C210 120 150 130 150 150 C150 170 210 180 210 280"/><path d="M110 250 H190 L150 200 Z" fill="{a}" stroke="none"/>',
      "chairs": f'<path d="M40 100 V260 M40 180 H120 V260 M120 180 V100" /><path d="M180 100 V260 M180 180 H260 V260 M260 180 V100"/><path d="M60 100 H100 M200 100 H240"/>',
      "hands": f'<path d="M30 220 C30 150 80 120 130 130 L130 260 C90 270 40 260 30 220 Z"/><path d="M270 240 C270 200 240 180 210 185 L210 260 C240 265 265 260 270 240 Z"/><path d="M130 190 H210" stroke="{s}"/>',
      "breath": f'<path d="M20 150 C60 90 100 90 140 150 S220 210 280 150" /><path d="M20 200 C60 140 100 140 140 200 S220 260 280 200" stroke="{s}"/><circle cx="150" cy="80" r="14" fill="{a}" stroke="none"/>',
      "ripple": f'<circle cx="150" cy="150" r="30"/><circle cx="150" cy="150" r="75" stroke="{s}"/><circle cx="150" cy="150" r="120"/><circle cx="150" cy="150" r="8" fill="{a}" stroke="none"/>',
      "door": f'<rect x="80" y="30" width="140" height="250" rx="70" ry="70"/><path d="M150 280 V150" stroke="{s}"/><circle cx="185" cy="170" r="8" fill="{a}" stroke="none"/><path d="M30 280 H270"/>',
      "wheel": f'<circle cx="150" cy="150" r="120"/><circle cx="150" cy="150" r="25"/><path d="M150 30 V125 M150 175 V270 M30 150 H125 M175 150 H270 M65 65 L132 132 M168 168 L235 235 M235 65 L168 132 M132 168 L65 235" stroke="{s}"/>',
      "telescope": f'<path d="M40 220 L200 60 M60 240 L220 80 M50 230 L210 70" /><path d="M150 100 L200 150 L260 90 L210 40 Z" fill="{a}" fill-opacity="0.3"/><path d="M110 200 L60 280 M110 200 L160 280" stroke="{s}"/>',
      "silhouette": f'<circle cx="150" cy="95" r="55"/><path d="M40 280 C40 190 90 160 150 160 C210 160 260 190 260 280" fill="{a}" fill-opacity="0.25"/><circle cx="230" cy="60" r="12" fill="{a}" stroke="none"/>',
      "bird": f'<path d="M30 190 C80 120 140 110 190 140 C230 100 260 100 290 110 C250 130 240 160 230 180 C190 210 120 220 30 190 Z" fill="{a}" fill-opacity="0.3"/><path d="M60 250 C120 230 160 230 220 250" stroke="{s}"/>',
    }
    return g + m.get(name, m["door"]) + "</g>"

def wrap(text, max_chars):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > max_chars and cur:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    return lines[:3]

def build(title, author, domain, subtitle="", motif=None, lang="he", visual_bidi=False):
    """visual_bidi=True: pre-reorder Hebrew into visual order (for renderers without bidi like cairosvg).
    Browsers do bidi themselves — keep False for the SVG that goes into the app/chat."""
    bg, a, t, s = PALETTES.get(domain, PALETTES["fiction"])
    def vis(x):
        if not visual_bidi: return x
        try:
            from bidi.algorithm import get_display; return get_display(x)
        except Exception: return x
    motif = motif or DEFAULT_MOTIF.get(domain, "door")
    rtl = lang == "he"
    anchor = "middle"
    font = "Heebo, Assistant, Arial, Helvetica, sans-serif" if rtl else "Inter, Helvetica, Arial, sans-serif"
    tlines = wrap(title, 16 if rtl else 18)
    size = 54 if len(tlines) == 1 else (46 if len(tlines) == 2 else 40)
    title_svg = "".join(
        f'<text x="300" y="{70 + i*size*1.15:.0f}" font-size="{size}" font-weight="700" fill="{t}" text-anchor="{anchor}" direction="{"rtl" if rtl else "ltr"}" font-family="{font}">{html.escape(l)}</text>'
        for i, l in enumerate([vis(l) for l in tlines]))
    ty = 70 + len(tlines) * size * 1.15 + 10
    sub_svg = ""
    if subtitle:
        slines = wrap(subtitle, 30 if rtl else 36)
        sub_svg = "".join(
            f'<text x="300" y="{700 + i*30}" font-size="22" fill="{s}" text-anchor="middle" direction="{"rtl" if rtl else "ltr"}" font-family="{font}">{html.escape(l)}</text>'
            for i, l in enumerate([vis(l) for l in slines]))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg}"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient></defs>
<rect width="600" height="800" fill="{bg}"/><rect width="600" height="800" fill="url(#g)"/>
<rect x="24" y="24" width="552" height="752" rx="18" fill="none" stroke="{a}" stroke-opacity="0.35" stroke-width="2"/>
{title_svg}
<text x="300" y="{ty+8:.0f}" font-size="26" fill="{a}" text-anchor="middle" direction="{"rtl" if rtl else "ltr"}" font-family="{font}">{html.escape(vis(author))}</text>
{motif_svg(motif, a, s)}
<line x1="150" y1="640" x2="450" y2="640" stroke="{a}" stroke-opacity="0.5" stroke-width="2"/>
{sub_svg}
<text x="300" y="768" font-size="14" fill="{s}" text-anchor="middle" font-family="{font}">{html.escape(vis("איור מקורי — לא הכריכה המקורית")) if rtl else "Original illustration — not the actual cover"}</text>
</svg>'''

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--title", required=True); p.add_argument("--author", required=True)
    p.add_argument("--domain", default="fiction", choices=list(PALETTES))
    p.add_argument("--subtitle", default=""); p.add_argument("--motif", default=None)
    p.add_argument("--lang", default="he", choices=["he", "en"]); p.add_argument("--out", required=True)
    p.add_argument("--png", action="store_true")
    a = p.parse_args()
    svg = build(a.title, a.author, a.domain, a.subtitle, a.motif, a.lang)
    open(a.out, "w", encoding="utf-8").write(svg)
    print("wrote", a.out)
    if a.png:
        try:
            import cairosvg
            svg_png = build(a.title, a.author, a.domain, a.subtitle, a.motif, a.lang, visual_bidi=True)
            cairosvg.svg2png(bytestring=svg_png.encode(), write_to=a.out.rsplit(".",1)[0]+".png"); print("wrote png (bidi-reordered for cairosvg)")
        except Exception as e:
            print("png skipped:", e, file=sys.stderr)
