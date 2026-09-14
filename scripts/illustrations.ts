/*
 * Generates the episode illustrations with ElevenLabs Image & Video (Flows API)
 * in the Pagecast/Elixir plate style: antique engraving, gold-ochre line work on
 * near-black, restrained washes. Writes site/assets/illustrations/<slug>.jpg.
 *
 *   npm run illustrations                 # every episode missing an image
 *   npm run illustrations -- --force      # regenerate all
 *   npm run illustrations -- --only deep-work
 *   npm run illustrations -- --emblem     # also the app emblem
 * Needs ELEVENLABS_API_KEY with the Image & Video permission (Pro plan).
 */
import "./_env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BASE = "https://api.elevenlabs.io/v1/flows/image";
const MODEL = process.env.PAGECAST_IMAGE_MODEL ?? "gemini-3-pro-image";
const OUT = path.resolve("site/assets/illustrations");
const KEY = process.env.ELEVENLABS_API_KEY;

const STYLE =
  "Vintage engraving illustration in the style of an antique book plate: fine gold-ochre etched line work with delicate crosshatching on a solid near-black background (#0f0e0c), restrained muted watercolor washes in sage green, peach and dusty teal. One centered motif with generous empty margins, elegant and quiet. No text, no letters, no numbers, no frame, no signature, no watermark. Square composition.";

const MOTIFS: Record<string, string> = {
  "man-search-for-meaning":
    "a heavy wooden door standing slightly ajar in darkness, warm light spilling through the gap onto a stone floor, a single small wildflower growing at the threshold",
  "atomic-habits":
    "a young seedling with two leaves in a small clay pot standing on a short flight of stone steps, each step slightly larger than the last, a few pebbles beside it",
  "thinking-fast-and-slow":
    "a hare and a tortoise facing each other on the two pans of an antique brass balance scale, the scale perfectly level",
  "psychology-of-money":
    "an old oak tree whose canopy is made of hundreds of small round coins, its roots flowing down into the top of an hourglass",
  "deep-work":
    "a single lit brass desk lamp on a wooden writing desk inside a vast dark library, tall bookshelves fading into darkness, a closed pocket watch beside the lamp",
  "start-with-why":
    "three concentric engraved circles like a target, a golden compass needle resting at the very center pointing upward",
  "seven-principles-marriage":
    "two porcelain teacups on saucers on a small round table, their steam rising and intertwining into one ribbon, a small potted plant on the windowsill behind",
  "why-we-sleep":
    "a crescent moon cradling a soft feather pillow, a pocket watch and a sprig of lavender resting beside it",
  "power-of-now":
    "an hourglass with its sand frozen mid-fall, a single leaf resting on its top, a perfectly still pond reflecting it",
  "meditations-marcus-aurelius":
    "a classical Roman ionic column with a laurel wreath hanging on it, an open scroll and a small burning oil lamp at its base",
  "the-alchemist":
    "a shepherd's crook planted in desert sand beside a sleeping lamb, a distant pyramid, and one large bright star in the night sky",
  "being-you-anil-seth":
    "a human eye seen from the front, its iris containing a tiny lighthouse whose beam sweeps outward, faint waves below",
  "waking-up-sam-harris":
    "a single candle flame, and beneath it the silhouette of a person seated cross-legged in meditation, soft rings of light radiating",
  "incognito-eagleman":
    "an iceberg at night with a tiny lit window at its tip above the waterline, and its vast hidden mass below the water, small fish drifting",
  "untethered-soul":
    "an open birdcage on a windowsill, a small bird flying out of it toward a bright moon, the cage door swinging",
  "thus-spoke-zarathustra":
    "a lone figure standing on a high mountain ridge at dawn, an eagle circling above with a serpent coiled around its neck, a rising sun behind the peaks",
  "myth-of-sisyphus":
    "a large round boulder resting at the foot of a steep mountain path, a single set of footprints climbing away into the rock",
  "celestine-prophecy":
    "an ancient rolled manuscript lying on a jungle floor, shafts of light falling through broad leaves onto it, a small stone step beside it",
  "doors-of-perception":
    "an open doorway standing alone in a blank wall, a glass vase of three flowers glowing on the floor beside it, light pouring through the opening",
  "flow-csikszentmihalyi":
    "a river curving between two rocky banks, one small empty rowing boat perfectly centred in the current, reeds along the edges",
  "body-keeps-the-score":
    "a calm human silhouette seen from the front, and inside the chest the fine root system of a tree, a single small leaf at the heart",
  sapiens:
    "a spiral path of tiny walking human figures leading from a cave mouth toward a distant skyline of towers, a hand print on the cave wall",
  "altered-traits":
    "a seated meditating figure in silhouette, and directly beside it the same silhouette grown into a slender tree with a full crown",
  "stealing-fire":
    "a lit torch being passed from one open hand to another against darkness, sparks rising from the flame",
  "master-and-his-emissary":
    "two birds perched on the same bare branch, one bending down to a single seed, the other lifting its head to scan a wide horizon",
  "how-to-talk-so-kids-listen":
    "a small paper boat and a large paper boat floating side by side on still water, a length of string loosely joining them, gentle ripples spreading outward",
  "educated-tara-westover":
    "a single open book resting on a weathered mountain boulder, a narrow footpath climbing behind it toward a distant ridge, one lit window far below in the valley",
  "attached-levine-heller":
    "two anchors resting on a seabed joined by one slack rope, small fish circling between them, light filtering down from the surface",
  "siddhartha-hesse":
    "a wooden ferry oar leaning against a post at a river bank at dusk, a lotus flower drifting in the current, the far shore faint in mist",
  "mindset-dweck":
    "a bare seed and a young sapling side by side under one arched trellis, their roots meeting in the soil beneath",
};

const EMBLEM =
  "an open book seen from the front whose lines of text on the right-hand page turn into rising sound waves, a small gold circle above like a sun, centered emblem, suitable as an app icon";

const args = process.argv.slice(2);
const force = args.includes("--force");
const wantEmblem = args.includes("--emblem");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;

async function create(prompt: string): Promise<string> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "xi-api-key": KEY!, "content-type": "application/json" },
    body: JSON.stringify({ model_id: MODEL, prompt, aspect_ratio: "1:1" }),
  });
  const json = (await res.json()) as { id?: string; status?: string; detail?: unknown };
  if (!res.ok || !json.id)
    throw new Error(
      `create failed ${res.status}: ${JSON.stringify(json.detail ?? json)}`,
    );
  return json.id;
}

async function waitFor(id: string): Promise<{ url: string; mime: string }> {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${BASE}/${id}`, { headers: { "xi-api-key": KEY! } });
    const j = (await res.json()) as {
      status: string;
      content_url?: string;
      content_mime_type?: string;
      error_message?: string;
      failure_reason?: string;
    };
    if (j.status === "completed" && j.content_url)
      return { url: j.content_url, mime: j.content_mime_type ?? "image/png" };
    if (j.status === "failed")
      throw new Error(`${j.failure_reason ?? "failed"}: ${j.error_message ?? ""}`);
    process.stdout.write(".");
  }
  throw new Error("timeout");
}

async function generate(slug: string, motif: string) {
  const out = path.join(OUT, `${slug}.jpg`);
  if (fs.existsSync(out) && !force) {
    console.log(`= ${slug}: קיים`);
    return;
  }
  process.stdout.write(`▶ ${slug} `);
  const id = await create(`${STYLE} Motif: ${motif}.`);
  const { url } = await waitFor(id);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await sharp(buf)
    .resize(1024, 1024, { fit: "cover" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out);
  console.log(
    ` ✓ ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`,
  );
}

async function main() {
  if (!KEY) {
    console.error("חסר ELEVENLABS_API_KEY ב-.env.local");
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const slugs = Object.keys(MOTIFS).filter((s) => !only || s === only);
  let failed = 0;
  // Three at a time: gentle on rate limits, still quick.
  for (let i = 0; i < slugs.length; i += 3) {
    const batch = slugs.slice(i, i + 3);
    const results = await Promise.allSettled(batch.map((s) => generate(s, MOTIFS[s]!)));
    for (const [j, r] of results.entries()) {
      if (r.status === "rejected") {
        failed++;
        console.error(`\n✗ ${batch[j]}: ${(r.reason as Error).message}`);
      }
    }
  }
  if (wantEmblem) {
    try {
      const out = path.join(OUT, "..", "icons", "emblem.jpg");
      process.stdout.write("▶ emblem ");
      const id = await create(`${STYLE} Motif: ${EMBLEM}.`);
      const { url } = await waitFor(id);
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await sharp(buf).resize(1024, 1024).jpeg({ quality: 88 }).toFile(out);
      console.log(` ✓ ${path.relative(process.cwd(), out)}`);
    } catch (e) {
      failed++;
      console.error(`\n✗ emblem: ${(e as Error).message}`);
    }
  }
  console.log(`\n${slugs.length - failed} הופקו, ${failed} נכשלו (מודל ${MODEL})`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
