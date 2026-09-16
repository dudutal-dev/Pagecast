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
  "guns-germs-and-steel":
    "an ear of wheat, a plough and a horseshoe arranged on an unrolled antique map whose lines run east to west, a compass rose in one corner",
  "silk-roads-frankopan":
    "a laden camel in silhouette on a caravan route between two distant walled cities, a length of unrolled silk trailing behind it like a road",
  "tao-te-ching":
    "a stream flowing around a large smooth boulder and closing again behind it, one bamboo stem bending over the water, an empty bowl on the bank",
  "zen-mind-beginners-mind":
    "an empty round meditation cushion on bare wooden boards, a single open window casting one rectangle of light across the floor",
  "beyond-good-and-evil":
    "an antique brass balance scale with both pans empty, a thin cracked mask resting on the ground beside it, a long shadow behind",
  "tanakh-bereshit":
    "a single great tree in a walled garden at first light, a river flowing out from beneath it and dividing into four streams, a scatter of new stars in the sky",
  "tanakh-shemot":
    "a thorn bush in a rocky desert at night, wrapped in tall flames that do not consume a single leaf, a pair of sandals left on the ground before it",
  "tanakh-vayikra":
    "a small altar of uncut stones with one thin column of smoke rising straight up, two turtledoves resting on the ground beside it",
  "tanakh-bamidbar":
    "a desert encampment of small tents arranged in a square around one central tent, a tall column of cloud standing above it",
  "tanakh-devarim":
    "an unrolled scroll with blank ruled lines and a shepherd's staff resting on a mountaintop, a green valley and a winding river far below",
  "tanakh-yehoshua":
    "a curved ram's horn resting on stones before tall ancient city walls, a long crack running down through the wall",
  "tanakh-shoftim":
    "a lone date palm on a hillside with a simple wooden seat beneath it, a sword planted upright in the ground nearby",
  "tanakh-shmuel":
    "a small leather sling and five smooth river stones lying beside an ancient lyre on a rock",
  "tanakh-melachim":
    "two tall bronze pillars at the porch of a temple, a raven flying above them carrying a piece of bread in its beak",
  "tanakh-yeshayahu":
    "a sword laid across an anvil, its blade bending into the curved blade of a plough, a hammer resting beside it",
  "tanakh-yirmiyahu":
    "a broken clay jar lying in pieces on the ground, an almond branch in full blossom arching above it",
  "tanakh-yechezkel":
    "a wide valley of scattered dry stones with small green shoots rising between them, a strong wind sweeping in from the horizon",
  "tanakh-trei-asar":
    "a great fish beneath rolling sea waves, a small wooden boat on the surface above, a leafy gourd vine growing on the distant shore",
  "tanakh-tehilim":
    "an ancient lyre hung on the branch of a willow tree beside a slow river",
  "tanakh-mishlei":
    "a small stone house built on seven carved pillars, its door open, a single oil lamp glowing in the window",
  "tanakh-iyov":
    "a whirlwind descending from a vast starry sky over a barren plain, a single broken potsherd lying on the ground",
  "tanakh-shir-hashirim":
    "a lily growing among thorns, a split pomegranate beside it, a small gazelle standing on a distant hill",
  "tanakh-ruth":
    "sheaves of barley standing in a harvested field at dusk, a few uncut stalks left standing at the corner of the field",
  "tanakh-eicha":
    "an empty city gate on a hill at dusk, a single small oil lamp flickering in the archway, fallen stones below",
  "tanakh-kohelet":
    "an hourglass beside a low sun on the horizon, a river flowing out toward the sea, a single leaf drifting on the water",
  "tanakh-esther":
    "a signet ring resting on a rolled scroll sealed with wax, a slender golden sceptre lying beside it",
  "tanakh-daniel":
    "a lion lying calmly at the mouth of a stone den, an open window above with a single oil lamp facing the east",
  "tanakh-ezra-nechemia":
    "a stone city wall half rebuilt, a mason's trowel and a sword resting together on the top course of stones",
  "tanakh-divrei-hayamim":
    "a long scroll with blank ruled lines unrolling across the frame, ending at a flight of stone steps rising toward an open gate",
  "genealogy-of-morality":
    "a lantern held low over a deep archaeological trench, layers of earth visible in the wall, a small broken clay tablet part-uncovered at the bottom",
};

const EMBLEM =
  "an open book seen from the front whose lines of text on the right-hand page turn into rising sound waves, a small gold circle above like a sun, centered emblem, suitable as an app icon";

const args = process.argv.slice(2);
const force = args.includes("--force");
const wantEmblem = args.includes("--emblem");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;
const reserveIdx = args.indexOf("--reserve");
/** Characters held back so an image run never empties the month's quota. */
const RESERVE = reserveIdx >= 0 ? Number(args[reserveIdx + 1] ?? 8000) : 8000;
/**
 * Each image draws on the same monthly character quota as narration, about
 * 1,200 characters per image (measured 2026-09-14: six images took ~7,300).
 * This was once assumed to be free, and spent without warning.
 */
const CHARS_PER_IMAGE = 1250;

async function remainingCharacters(): Promise<number | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": KEY! },
    });
    const j = (await res.json()) as {
      character_count?: number;
      character_limit?: number;
    };
    if (typeof j.character_count !== "number" || typeof j.character_limit !== "number")
      return null;
    return Math.max(0, j.character_limit - j.character_count);
  } catch {
    return null;
  }
}

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
  const all = Object.keys(MOTIFS).filter((s) => !only || s === only);
  // Only the images that will actually be generated count against the quota.
  const todo = all.filter((s) => force || !fs.existsSync(path.join(OUT, `${s}.jpg`)));
  const cost = (todo.length + (wantEmblem ? 1 : 0)) * CHARS_PER_IMAGE;
  const left = await remainingCharacters();
  if (cost > 0) {
    console.log(
      `${todo.length} איורים לייצור, כ-${cost.toLocaleString()} תווים` +
        (left == null
          ? ""
          : ` · במכסה ${left.toLocaleString()}, שמורים ${RESERVE.toLocaleString()}`),
    );
  }
  if (left != null && cost > 0 && left - cost < RESERVE) {
    console.error(
      `אין מספיק מכסה: נדרשים כ-${cost.toLocaleString()} תווים ונותרו ${left.toLocaleString()}. ` +
        `הקטן עם --only <slug>, או חכה לחידוש המכסה.`,
    );
    // exitCode rather than exit(): exiting while the quota request's socket is
    // still closing trips a libuv assertion on Windows.
    process.exitCode = 5;
    return;
  }
  const slugs = all;
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
