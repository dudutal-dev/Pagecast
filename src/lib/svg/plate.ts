/**
 * "Book plate" illustrations for the static app, in the Elixir visual language:
 * an antique engraving on near-black paper, gold-ochre monoline with hatching,
 * and one or two restrained watercolour washes. Original work, never a cover.
 * Square 1024×1024, one motif per life domain, with per-episode variation
 * (seeded by slug) so two books in the same domain don't look identical.
 */
import type { DomainId } from "@/lib/domains";

const BG = "#0f0e0c";
const GOLD = "#c9a24a";
const GOLD_2 = "#e2c477";
const INK = "#efe7d6";

/** Muted washes, per domain. */
const WASH: Record<DomainId, [string, string]> = {
  personal: ["#7f9a6e", "#e6b98a"],
  psychology: ["#8a7fb0", "#e6b98a"],
  business: ["#5f8f8a", "#d9c28a"],
  money: ["#6f9a7a", "#d4af37"],
  productivity: ["#c98a4a", "#7f8fb0"],
  relationships: ["#c98a8a", "#e6c2a0"],
  parenting: ["#e6b98a", "#8fb0a0"],
  health: ["#7fb0a0", "#c9d9c0"],
  spirituality: ["#8f8fc0", "#d9c9a0"],
  philosophy: ["#b09070", "#c9a24a"],
  history: ["#a08a6a", "#c9b090"],
  science: ["#6f9fb0", "#c9d9e0"],
  biography: ["#b07070", "#d9c9b0"],
  fiction: ["#7f9a6e", "#c9a24a"],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic pseudo-random in [0,1) from a seed and index. */
function rnd(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
}

function hatch(id: string, angle: number, gap = 7): string {
  return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${GOLD}" stroke-width="0.9" stroke-opacity="0.55"/></pattern>`;
}

function wash(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  rot = 0,
): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="0.22" transform="rotate(${rot} ${cx} ${cy})" filter="url(#soft)"/>`;
}

const S = `stroke="${GOLD}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`;
const S2 = `stroke="${GOLD_2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
const S1 = `stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round"`;

/** Small stars/dust for atmosphere, seeded. */
function dust(seed: number, n = 14): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = 120 + rnd(seed, i) * 784;
    const y = 90 + rnd(seed, i + 100) * 300;
    const r = 1 + rnd(seed, i + 200) * 2.2;
    out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${GOLD_2}" fill-opacity="${(0.25 + rnd(seed, i + 300) * 0.5).toFixed(2)}"/>`;
  }
  return out;
}

/** Ground line with engraved hatching, common to most plates. */
function ground(y = 760, w = 1): string {
  return `<path d="M${180 * w} ${y} H${1024 - 180 * w}" ${S1}/><path d="M${230 * w} ${y + 16} H${1024 - 230 * w}" ${S1} stroke-opacity="0.45"/><path d="M${300 * w} ${y + 30} H${1024 - 300 * w}" ${S1} stroke-opacity="0.25"/>`;
}

const MOTIFS: Record<DomainId, (seed: number, w: [string, string]) => string> = {
  // A door ajar with light: the choice that remains (psychology / meaning)
  psychology: (seed, w) => `
    ${wash(560, 520, 120, 250, w[1])}
    <path d="M330 220 V760 H600 V220 Z" ${S}/>
    <path d="M600 220 L690 260 V790 L600 760 Z" fill="url(#h1)" ${S2}/>
    <path d="M600 220 L690 260 V790 L600 760" ${S}/>
    <path d="M360 250 H570 V730 H360 Z" fill="url(#h2)" ${S1}/>
    <path d="M690 300 L760 420 L760 700 L690 760" ${S1} stroke-opacity="0.5"/>
    <circle cx="655" cy="500" r="7" fill="${GOLD}"/>
    <path d="M330 760 L250 790 H780 L690 760" ${S1}/>
    <path d="M760 420 C820 300 860 260 880 250" ${S1} stroke-opacity="0.35"/>
    <path d="M760 520 C830 430 870 420 890 415" ${S1} stroke-opacity="0.25"/>
    <path d="M250 790 C240 740 260 720 270 700 M270 700 C262 690 268 676 280 672 M270 700 C282 692 292 700 288 712" ${S2}/>
    ${dust(seed)}`,

  // Seedling on rising stone steps: small, compounding (personal)
  personal: (seed, w) => `
    ${wash(520, 560, 260, 120, w[0])}
    <path d="M200 760 H360 V690 H520 V620 H680 V550 H840" ${S}/>
    <path d="M360 690 V760 M520 620 V760 M680 550 V760 M840 550 V760" ${S1}/>
    <path d="M200 760 H840" ${S1}/>
    <rect x="365" y="695" width="150" height="60" fill="url(#h1)"/>
    <rect x="525" y="625" width="150" height="130" fill="url(#h2)"/>
    <path d="M280 760 V700 C260 690 262 660 280 650 C298 660 300 690 280 700 Z" fill="url(#h1)" ${S2}/>
    <path d="M280 700 V620" ${S}/>
    <path d="M280 640 C240 610 236 570 258 560 C286 570 290 615 280 640 Z" fill="${w[0]}" fill-opacity="0.35" ${S2}/>
    <path d="M280 655 C320 630 330 590 312 578 C286 588 278 630 280 655 Z" fill="${w[0]}" fill-opacity="0.35" ${S2}/>
    <path d="M760 520 C770 500 790 500 800 520 C810 500 830 500 840 520" ${S1} stroke-opacity="0.5"/>
    ${dust(seed, 10)}`,

  // Compass rose over concentric circles (business / why)
  business: (seed, w) => `
    ${wash(512, 470, 230, 230, w[0])}
    <circle cx="512" cy="470" r="250" ${S1}/>
    <circle cx="512" cy="470" r="170" ${S2}/>
    <circle cx="512" cy="470" r="90" ${S}/>
    <circle cx="512" cy="470" r="14" fill="${GOLD}"/>
    <path d="M512 210 L540 470 L512 730 L484 470 Z" fill="url(#h1)" ${S}/>
    <path d="M252 470 L512 442 L772 470 L512 498 Z" fill="url(#h2)" ${S2}/>
    <path d="M512 210 L540 470 L512 470 Z" fill="${GOLD}" fill-opacity="0.55"/>
    <path d="M330 290 L360 320 M694 650 L664 620 M694 290 L664 320 M330 650 L360 620" ${S1}/>
    ${ground(780)}
    ${dust(seed, 8)}`,

  // A tree whose canopy is coins, roots in an hourglass (money)
  money: (seed, w) => `
    ${wash(512, 380, 240, 170, w[0])}
    <path d="M512 780 V470" ${S}/>
    <path d="M512 560 C470 530 440 540 410 560 M512 610 C560 580 590 590 620 610 M512 660 C480 640 450 650 430 680" ${S2}/>
    ${[
      [512, 330, 120],
      [400, 400, 84],
      [624, 400, 84],
      [452, 300, 62],
      [572, 300, 62],
      [512, 440, 60],
    ]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#h2)" ${S2}/>`)
      .join("")}
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const x = 512 + Math.cos(a) * (110 + rnd(seed, i) * 40);
      const y = 370 + Math.sin(a) * (80 + rnd(seed, i + 7) * 30);
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="13" fill="${GOLD}" fill-opacity="0.85"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="6" fill="${BG}"/>`;
    }).join("")}
    <path d="M400 780 H624 M420 780 C440 860 584 860 604 780 M420 780 C440 740 584 740 604 780" ${S1}/>
    <path d="M512 700 C500 740 480 760 460 780 M512 700 C524 740 544 760 564 780 M512 700 C512 740 512 760 512 780" ${S1} stroke-opacity="0.5"/>
    ${dust(seed, 8)}`,

  // A lit desk lamp in a dark library (productivity / deep work)
  productivity: (seed, w) => `
    ${wash(430, 560, 200, 220, w[0])}
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${130 + i * 20} 160 V620" ${S1} stroke-opacity="${(0.12 + i * 0.03).toFixed(2)}"/>`).join("")}
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${770 + i * 20} 160 V620" ${S1} stroke-opacity="${(0.12 + i * 0.03).toFixed(2)}"/>`).join("")}
    <path d="M200 620 H824" ${S}/>
    <path d="M460 620 V400 C460 360 500 340 540 360" ${S}/>
    <path d="M500 350 L620 300 L680 380 L560 430 Z" fill="url(#h1)" ${S}/>
    <path d="M540 410 C560 470 600 520 660 560 C600 560 540 520 520 470 Z" fill="${w[1]}" fill-opacity="0.35"/>
    <ellipse cx="460" cy="620" rx="80" ry="14" fill="url(#h2)" ${S2}/>
    <path d="M300 620 V560 H380 V620 M300 590 H380" ${S2}/>
    <path d="M700 620 V590 H760 V620" ${S2}/>
    <circle cx="640" cy="330" r="22" ${S2}/>
    <path d="M640 318 V330 L648 336" ${S2}/>
    ${ground(700)}
    ${dust(seed, 6)}`,

  // Two cups, steam intertwining (relationships)
  relationships: (seed, w) => `
    ${wash(512, 560, 260, 150, w[0])}
    <path d="M330 560 H500 L488 680 C486 700 470 710 450 710 H380 C360 710 344 700 342 680 Z" fill="url(#h1)" ${S}/>
    <path d="M500 590 C540 590 545 650 500 660" ${S}/>
    <path d="M524 560 H694 L682 680 C680 700 664 710 644 710 H574 C554 710 538 700 536 680 Z" fill="url(#h2)" ${S}/>
    <path d="M694 590 C734 590 739 650 694 660" ${S}/>
    <path d="M300 740 H760" ${S1}/>
    <ellipse cx="512" cy="742" rx="260" ry="20" fill="url(#h1)" ${S1} stroke-opacity="0.4"/>
    <path d="M420 520 C400 480 440 460 420 420 C400 380 440 360 430 330" ${S2}/>
    <path d="M600 520 C620 480 580 460 600 420 C620 380 580 360 590 330" ${S2}/>
    <path d="M470 500 C512 460 512 420 470 380 M560 500 C512 460 512 420 560 380" ${S1} stroke-opacity="0.5"/>
    ${dust(seed, 6)}`,

  // A large hand and a small hand (parenting)
  parenting: (seed, w) => `
    ${wash(512, 520, 240, 200, w[1])}
    <path d="M250 640 C240 540 300 470 400 470 L410 700 C330 720 260 700 250 640 Z" fill="url(#h1)" ${S}/>
    <path d="M400 470 C440 440 500 450 520 500 C540 540 500 600 470 600" ${S}/>
    <path d="M600 560 C610 500 660 470 720 480 L724 640 C680 660 620 640 600 560 Z" fill="url(#h2)" ${S2}/>
    <path d="M720 480 C750 470 780 500 770 540" ${S2}/>
    <path d="M410 700 H724" ${S1}/>
    ${ground(780)}
    ${dust(seed, 8)}`,

  // Breath: soft double wave with a moon (health / sleep)
  health: (seed, w) => `
    ${wash(512, 400, 260, 160, w[0])}
    <path d="M160 520 C260 400 360 400 460 520 S660 640 760 520 S 860 400 900 460" ${S}/>
    <path d="M160 600 C260 480 360 480 460 600 S660 720 760 600 S 860 480 900 540" ${S2}/>
    <path d="M160 680 C260 560 360 560 460 680 S660 800 760 680" ${S1} stroke-opacity="0.45"/>
    <path d="M620 220 A110 110 0 1 0 700 400 A85 85 0 1 1 620 220 Z" fill="url(#h2)" ${S}/>
    <path d="M330 300 C350 250 400 250 420 300 C440 250 490 250 510 300" ${S1} stroke-opacity="0.5"/>
    ${dust(seed, 12)}`,

  // Ripples from a single drop (spirituality / presence)
  spirituality: (seed, w) => `
    ${wash(512, 560, 300, 120, w[0])}
    <ellipse cx="512" cy="560" rx="60" ry="22" ${S}/>
    <ellipse cx="512" cy="560" rx="150" ry="55" ${S2}/>
    <ellipse cx="512" cy="560" rx="250" ry="92" ${S1}/>
    <ellipse cx="512" cy="560" rx="340" ry="125" ${S1} stroke-opacity="0.4"/>
    <path d="M512 300 C500 330 496 350 512 380 C528 350 524 330 512 300 Z" fill="${GOLD}" fill-opacity="0.9"/>
    <path d="M512 400 V500" ${S1} stroke-dasharray="4 10"/>
    <path d="M300 360 C330 330 370 330 400 360 M624 360 C654 330 694 330 724 360" ${S1} stroke-opacity="0.35"/>
    ${dust(seed, 12)}`,

  // A column, a laurel and an oil lamp (philosophy)
  philosophy: (seed, w) => `
    ${wash(512, 500, 200, 260, w[0])}
    <path d="M420 300 H604 M440 330 H584" ${S}/>
    <path d="M460 330 V700 M564 330 V700" ${S}/>
    <path d="M480 340 V690 M512 340 V690 M544 340 V690" ${S1} stroke-opacity="0.5"/>
    <path d="M430 700 H594 M410 730 H614" ${S}/>
    <rect x="462" y="330" width="100" height="360" fill="url(#h1)"/>
    <path d="M300 700 C300 600 360 520 420 500" ${S2}/>
    <path d="M724 700 C724 600 664 520 604 500" ${S2}/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${316 + i * 14} ${680 - i * 28} c -20 -8 -30 -30 -24 -50 c 18 8 30 28 24 50 z" fill="${w[0]}" fill-opacity="0.4" ${S1}/><path d="M${708 - i * 14} ${680 - i * 28} c 20 -8 30 -30 24 -50 c -18 8 -30 28 -24 50 z" fill="${w[0]}" fill-opacity="0.4" ${S1}/>`).join("")}
    <path d="M470 250 C490 230 534 230 554 250 L540 270 H484 Z" fill="url(#h2)" ${S2}/>
    <path d="M512 250 C505 235 508 220 512 205 C516 220 519 235 512 250 Z" fill="${GOLD_2}" fill-opacity="0.9"/>
    ${ground(780)}
    ${dust(seed, 8)}`,

  // A wheel (history)
  history: (seed, w) => `
    ${wash(512, 480, 240, 240, w[0])}
    <circle cx="512" cy="480" r="240" ${S}/>
    <circle cx="512" cy="480" r="200" ${S1}/>
    <circle cx="512" cy="480" r="40" ${S}/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<path d="M${(512 + Math.cos(a) * 40).toFixed(0)} ${(480 + Math.sin(a) * 40).toFixed(0)} L${(512 + Math.cos(a) * 200).toFixed(0)} ${(480 + Math.sin(a) * 200).toFixed(0)}" ${S2}/>`;
    }).join("")}
    ${ground(760)}
    ${dust(seed, 10)}`,

  // Eye with a lighthouse beam in the iris (science of mind)
  science: (seed, w) => `
    ${wash(512, 460, 300, 130, w[0])}
    <path d="M160 460 C300 300 724 300 864 460 C724 620 300 620 160 460 Z" fill="url(#h1)" ${S}/>
    <circle cx="512" cy="460" r="110" fill="${BG}" ${S}/>
    <circle cx="512" cy="460" r="108" fill="url(#h2)"/>
    <circle cx="512" cy="460" r="46" fill="${BG}" ${S2}/>
    <path d="M512 460 L820 330 L820 380 Z" fill="${w[1]}" fill-opacity="0.45"/>
    <path d="M512 460 L820 540 L820 590 Z" fill="${w[1]}" fill-opacity="0.25"/>
    <path d="M500 420 V500 M524 420 V500 M494 420 H530 M496 500 H528" ${S2}/>
    <circle cx="512" cy="420" r="4" fill="${GOLD_2}"/>
    <path d="M200 300 C260 250 300 250 340 270 M684 270 C724 250 764 250 824 300" ${S1} stroke-opacity="0.35"/>
    ${dust(seed, 12)}`,

  // Iceberg: a lit window at the tip, the mass below (also mind); silhouette use
  biography: (seed, w) => `
    ${wash(512, 500, 220, 260, w[0])}
    <circle cx="512" cy="330" r="110" fill="url(#h1)" ${S}/>
    <path d="M300 780 C300 600 400 520 512 520 C624 520 724 600 724 780" fill="url(#h2)" ${S}/>
    <circle cx="700" cy="230" r="18" fill="${GOLD}"/>
    ${ground(790)}
    ${dust(seed, 10)}`,

  // A bird leaving an open cage toward a moon (fiction / soul)
  fiction: (seed, w) => `
    ${wash(400, 560, 180, 220, w[0])}
    <path d="M280 400 C280 320 520 320 520 400 V740 H280 Z" fill="url(#h1)" ${S}/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${310 + i * 36} 400 V740" ${S1}/>`).join("")}
    <path d="M520 460 L640 420 V700 L520 740" ${S2}/>
    <path d="M280 740 H520 M260 770 H700" ${S1}/>
    <path d="M600 320 C650 260 720 250 780 280 C820 250 860 260 890 290 C850 300 830 330 800 350 C740 370 660 380 600 320 Z" fill="${w[1]}" fill-opacity="0.4" ${S}/>
    <path d="M760 300 C790 330 830 340 870 330" ${S2}/>
    <circle cx="790" cy="150" r="60" fill="url(#h2)" ${S2}/>
    ${dust(seed, 14)}`,
};

/** Motif override per slug when the domain default doesn't fit the book. */
export const PLATE_OVERRIDES: Record<string, DomainId> = {
  "man-search-for-meaning": "psychology", // door ajar
  "thinking-fast-and-slow": "history", // the wheel: two systems turning
  "being-you-anil-seth": "science",
  "incognito-eagleman": "biography", // silhouette with the hidden mass
  "waking-up-sam-harris": "spirituality",
  "untethered-soul": "fiction", // bird leaving the cage
  "power-of-now": "spirituality",
  "why-we-sleep": "health",
};

export function buildPlate(opts: { slug: string; domain: DomainId }): string {
  const seed = hash(opts.slug);
  const motifDomain = PLATE_OVERRIDES[opts.slug] ?? opts.domain;
  const w = WASH[opts.domain];
  const draw = MOTIFS[motifDomain] ?? MOTIFS.fiction;
  const rot = ((seed % 7) - 3) * 0.6; // subtle per-book tilt of the washes
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="">
<defs>
  ${hatch("h1", 45)}${hatch("h2", -30, 6)}
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="28"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed % 100}"/><feColorMatrix values="0 0 0 0 0.79 0 0 0 0 0.64 0 0 0 0 0.29 0 0 0 0.06 0"/></filter>
</defs>
<rect width="1024" height="1024" fill="${BG}"/>
<g transform="rotate(${rot} 512 512)" fill="none">${draw(seed, w)}</g>
<rect width="1024" height="1024" filter="url(#grain)" opacity="0.6"/>
<circle cx="512" cy="512" r="6" fill="${INK}" fill-opacity="0"/>
</svg>`;
}

/** App emblem: an open book whose lines become sound waves. */
export function buildEmblem(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect width="512" height="512" fill="${BG}"/>
<circle cx="256" cy="256" r="236" fill="none" stroke="${GOLD}" stroke-opacity="0.45" stroke-width="3"/>
<circle cx="256" cy="256" r="222" fill="none" stroke="${GOLD}" stroke-opacity="0.2" stroke-width="1.5"/>
<path d="M256 170 C220 140 150 140 110 160 V360 C150 340 220 340 256 370 Z" fill="none" stroke="${GOLD}" stroke-width="10" stroke-linejoin="round"/>
<path d="M256 170 C292 140 362 140 402 160 V360 C362 340 292 340 256 370 Z" fill="none" stroke="${GOLD}" stroke-width="10" stroke-linejoin="round"/>
<path d="M256 170 V370" stroke="${GOLD}" stroke-width="6"/>
<path d="M140 210 h60 M140 250 h80 M140 290 h50" stroke="${GOLD_2}" stroke-width="7" stroke-linecap="round"/>
<path d="M290 250 v0 M310 236 v28 M330 220 v60 M350 232 v36 M370 244 v12" stroke="${GOLD_2}" stroke-width="9" stroke-linecap="round"/>
<path d="M290 244 v12" stroke="${GOLD_2}" stroke-width="9" stroke-linecap="round"/>
</svg>`;
}
