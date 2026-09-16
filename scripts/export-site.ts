/*
 * Exports the produced library into the static app under site/:
 *   site/data/episodes.json      all episodes (summary text, durations)
 *   site/data/precache.json      files the service worker pre-caches
 *   site/audio/<slug>.mp3        narration
 *   site/assets/illustrations/<slug>.svg   original book plates
 *   site/assets/icons/*.png      app icons (from the SVG emblem)
 *
 *   npm run export-site
 */
import "./_env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb, AUDIO_DIR } from "../src/server/db/client";
import { audioAssets, episodes } from "../src/server/db/schema";
import { DOMAIN_LABELS } from "../src/lib/domains";
import { buildEmblem, buildPlate } from "../src/lib/svg/plate";

const SITE = path.resolve("site");
// --audio-only a,b,c : ship audio only for these slugs (others export as text-only)
const argv = process.argv.slice(2);
const audioOnlyIdx = argv.indexOf("--audio-only");
const AUDIO_ONLY: Set<string> | null =
  audioOnlyIdx >= 0
    ? new Set((argv[audioOnlyIdx + 1] ?? "").split(",").filter(Boolean))
    : null;
const VERSION = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

interface SeriesBook {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
}
interface SeriesFile {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  parts: { id: string; title: string; books: SeriesBook[] }[];
}

/**
 * Series are ordered collections that live beside the library, such as the
 * Tanakh: canonical order and parts come from content/series/<id>.json rather
 * than from the database, so a series can grow book by book without a migration.
 */
function loadSeries(): SeriesFile[] {
  const dir = path.resolve("content/series");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as SeriesFile);
}

function ensure(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const db = getDb();
  ensure(path.join(SITE, "data"));
  ensure(path.join(SITE, "audio"));
  ensure(path.join(SITE, "assets/illustrations"));
  ensure(path.join(SITE, "assets/icons"));

  const allSeries = loadSeries();
  // slug -> where it sits in its series, for the book page's breadcrumb and prev/next.
  const seriesOf = new Map<
    string,
    { id: string; title: string; part: string; partTitle: string; order: number }
  >();
  for (const sr of allSeries) {
    let order = 0;
    for (const part of sr.parts)
      for (const b of part.books)
        seriesOf.set(b.slug, {
          id: sr.id,
          title: sr.title,
          part: part.id,
          partTitle: part.title,
          order: order++,
        });
  }

  const rows = db
    .select()
    .from(episodes)
    .all()
    .filter((r) => r.slug);
  const out: unknown[] = [];
  const precache: string[] = [];
  let withAudio = 0;
  let totalSec = 0;

  for (const ep of rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const slug = ep.slug!;
    const asset = db
      .select()
      .from(audioAssets)
      .where(eq(audioAssets.episodeId, ep.id))
      .get();
    // Prefer a generated illustration (ElevenLabs Image API); fall back to the SVG plate.
    const jpgRel = `assets/illustrations/${slug}.jpg`;
    let plateRel: string;
    if (fs.existsSync(path.join(SITE, jpgRel))) {
      plateRel = jpgRel;
    } else {
      plateRel = `assets/illustrations/${slug}.svg`;
      fs.writeFileSync(
        path.join(SITE, plateRel),
        buildPlate({ slug, domain: ep.domain }),
        "utf8",
      );
    }
    precache.push(`./${plateRel}`);

    // Conversation version, produced separately by scripts/produce-dialogue.ts
    const dialogueMetaPath = path.resolve("content/dialogues", `${slug}.meta.json`);
    const dialogueRel = `audio/${slug}.dialogue.mp3`;
    let dialogue: {
      audio: string;
      durationSec: number;
      sizeBytes: number;
      turns: number;
      hostVoiceName: string | null;
    } | null = null;
    if (fs.existsSync(dialogueMetaPath) && fs.existsSync(path.join(SITE, dialogueRel))) {
      const meta = JSON.parse(fs.readFileSync(dialogueMetaPath, "utf8")) as {
        durationSec: number;
        sizeBytes: number;
        turns: number;
        hostVoiceName?: string;
      };
      dialogue = {
        audio: dialogueRel,
        durationSec: meta.durationSec,
        sizeBytes: meta.sizeBytes,
        turns: meta.turns,
        hostVoiceName: meta.hostVoiceName ?? null,
      };
    }

    let audio: string | null = null;
    let durationSec: number | null = null;
    let sizeBytes = 0;
    if (asset && (!AUDIO_ONLY || AUDIO_ONLY.has(slug))) {
      const src = path.join(AUDIO_DIR, asset.path);
      if (fs.existsSync(src)) {
        audio = `audio/${slug}.mp3`;
        fs.copyFileSync(src, path.join(SITE, audio));
        durationSec = asset.durationSec;
        sizeBytes = asset.sizeBytes;
        withAudio++;
        totalSec += asset.durationSec;
      }
    }
    out.push({
      slug,
      title: ep.title,
      titleEn: ep.titleEn,
      author: ep.author,
      authorEn: ep.authorEn,
      year: ep.year,
      domain: ep.domain,
      domainLabel: DOMAIN_LABELS[ep.domain],
      kind: ep.kind,
      message: ep.message,
      summaryMd: ep.summaryMd,
      takeaways: ep.takeaways,
      caveat: ep.caveat,
      knowledgeToday: ep.knowledgeToday,
      illustration: plateRel,
      audio,
      dialogue,
      durationSec,
      sizeBytes,
      series: seriesOf.get(slug) ?? null,
      createdAt: ep.createdAt,
    });
  }

  // Remove audio files that are no longer referenced (stale or held back).
  const keep = new Set(
    (out as { audio: string | null; dialogue: { audio: string } | null }[])
      .flatMap((e) => [e.audio, e.dialogue?.audio])
      .filter((a): a is string => Boolean(a))
      .map((a) => path.basename(a)),
  );
  for (const f of fs.readdirSync(path.join(SITE, "audio"))) {
    if (f.endsWith(".mp3") && !keep.has(f)) fs.rmSync(path.join(SITE, "audio", f));
  }

  fs.writeFileSync(
    path.join(SITE, "data/episodes.json"),
    JSON.stringify({
      version: VERSION,
      generatedAt: new Date().toISOString(),
      episodes: out,
      // Only the books that exist, in canonical order, so a partly written
      // series still renders cleanly.
      series: allSeries.map((sr) => ({
        id: sr.id,
        title: sr.title,
        subtitle: sr.subtitle,
        intro: sr.intro,
        total: sr.parts.reduce((a, p) => a + p.books.length, 0),
        parts: sr.parts.map((p) => ({
          id: p.id,
          title: p.title,
          books: p.books
            .map((b) => b.slug)
            .filter((slug) => rows.some((r) => r.slug === slug)),
        })),
      })),
    }),
    "utf8",
  );

  // Icons: the generated emblem (ElevenLabs Image API) when present, else the SVG emblem.
  const emblemSvg = buildEmblem();
  fs.writeFileSync(path.join(SITE, "assets/icons/emblem.svg"), emblemSvg, "utf8");
  const emblemJpg = path.join(SITE, "assets/icons/emblem.jpg");
  const source = fs.existsSync(emblemJpg)
    ? sharp(emblemJpg)
    : sharp(Buffer.from(emblemSvg));
  const base = await source.resize(1024, 1024, { fit: "cover" }).png().toBuffer();
  for (const size of [64, 180, 192, 512]) {
    await sharp(base)
      .resize(size, size)
      .png()
      .toFile(path.join(SITE, `assets/icons/icon-${size}.png`));
  }
  // Maskable: the emblem inside the safe zone on a dark square.
  const inner = await sharp(base).resize(400, 400).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0f0e0c" } })
    .composite([{ input: inner, left: 56, top: 56 }])
    .png()
    .toFile(path.join(SITE, "assets/icons/icon-512-maskable.png"));

  fs.writeFileSync(
    path.join(SITE, "data/precache.json"),
    JSON.stringify({ version: VERSION, files: precache }),
    "utf8",
  );
  // Stamp the version into sw.js so browsers pick up new content.
  const swPath = path.join(SITE, "sw.js");
  if (fs.existsSync(swPath)) {
    const sw = fs
      .readFileSync(swPath, "utf8")
      .replace(/const VERSION = "[^"]*";/, `const VERSION = "pagecast-${VERSION}";`);
    fs.writeFileSync(swPath, sw, "utf8");
  }
  console.log(
    `exported ${out.length} episodes (${withAudio} with audio, ${Math.round(totalSec / 60)} min total) → site/  version ${VERSION}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
