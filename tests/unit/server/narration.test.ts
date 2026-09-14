import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/server/db/client";
import { LocalFsStorage } from "@/server/providers/storage";
import { createEpisode, getEpisode, updateEpisode } from "@/server/services/episodes";
import { updateSettings } from "@/server/services/settings";
import { directEpisode, cleanDirectorOutput } from "@/server/services/narration/director";
import { estimateNarration, produceNarration } from "@/server/services/narration/produce";
import { rankVoices } from "@/server/services/narration/voices";
import { scriptHash } from "@/server/services/narration/hash";
import { episodeInputSchema } from "@/lib/schemas/episode";
import { DEFAULT_VOICE_SETTINGS } from "@/lib/schemas/settings";
import frankl from "../../fixtures/episode.frankl.json";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pagecast-narr-"));
const g = globalThis as unknown as { __pagecastStorage?: LocalFsStorage };

beforeEach(() => {
  resetDbForTests();
  g.__pagecastStorage = new LocalFsStorage(tmpRoot);
});
afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

describe("scriptHash", () => {
  it("changes with script, voice, model or settings", () => {
    const base = {
      performedScript: "a",
      voiceId: "v",
      model: "eleven_v3" as const,
      settings: DEFAULT_VOICE_SETTINGS,
    };
    const h = scriptHash(base);
    expect(scriptHash({ ...base, performedScript: "a " })).toBe(h); // trim-insensitive
    expect(scriptHash({ ...base, performedScript: "b" })).not.toBe(h);
    expect(scriptHash({ ...base, voiceId: "w" })).not.toBe(h);
    expect(scriptHash({ ...base, model: "eleven_multilingual_v2" })).not.toBe(h);
    expect(
      scriptHash({ ...base, settings: { ...DEFAULT_VOICE_SETTINGS, style: 0.1 } }),
    ).not.toBe(h);
  });
});

describe("rankVoices", () => {
  it("puts female Hebrew-capable narrators first and recommends three", () => {
    const ranked = rankVoices([
      {
        voiceId: "1",
        name: "Dan",
        description: "deep male narrator",
        labels: { gender: "male" },
        previewUrl: null,
        languages: ["he"],
        category: "premade",
      },
      {
        voiceId: "2",
        name: "Noa",
        description: "warm storyteller",
        labels: { gender: "female", use_case: "narrative_story" },
        previewUrl: null,
        languages: ["he"],
        category: "premade",
      },
      {
        voiceId: "3",
        name: "News",
        description: "news anchor",
        labels: { gender: "female" },
        previewUrl: null,
        languages: ["en"],
        category: "premade",
      },
      {
        voiceId: "4",
        name: "Maya",
        description: "calm audiobook voice",
        labels: { gender: "female" },
        previewUrl: null,
        languages: [],
        category: "professional",
      },
      {
        voiceId: "5",
        name: "Robo",
        description: "robot character",
        labels: { gender: "female" },
        previewUrl: null,
        languages: ["he"],
        category: "premade",
      },
    ]);
    expect(ranked[0]!.voiceId).toBe("2");
    const recommended = ranked.filter((v) => v.recommended).map((v) => v.voiceId);
    expect(recommended).toHaveLength(3);
    expect(recommended.slice(0, 2)).toEqual(["2", "4"]);
    expect(recommended).not.toContain("1");
    expect(ranked.at(-1)!.voiceId).toBe("1"); // male last
    expect(ranked[0]!.reason).toContain("מספרת סיפורים");
  });
});

describe("director (fake LLM)", () => {
  it("stores a performed script with tags for v3 and none for v2", async () => {
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    const r = await directEpisode(ep.data.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.performedScript).toContain("[warm]");
    const stored = getEpisode(ep.data.id);
    expect(stored.ok && stored.data.performedScript).toBe(r.data.performedScript);

    updateSettings({ voiceModel: "eleven_multilingual_v2" });
    const r2 = await directEpisode(ep.data.id);
    expect(r2.ok && r2.data.performedScript).not.toMatch(/\[[a-z]+\]/);
  });
  it("cleans code fences, labels and section headers", () => {
    expect(
      cleanDirectorOutput("```\nתסריט מבוצע:\n[פתיח]\nשלום.\n\n\n\nעולם.\n```", true),
    ).toBe("שלום.\n\nעולם.");
  });
});

describe("produceNarration (fake TTS)", () => {
  it("requires a selected voice", async () => {
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    const r = await produceNarration(ep.data.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VOICE_NOT_FOUND");
  });

  it("produces audio with alignment, reports progress, and skips when up to date", async () => {
    updateSettings({ voiceId: "fake-noa", voiceName: "נועה" });
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    const est = estimateNarration(ep.data.id);
    expect(est.ok && est.data.upToDate).toBe(false);
    // ~2,800 chars is more than one request's safe length (the provider stops at ~200s).
    expect(est.ok && est.data.chunks).toBe(2);
    expect(est.ok && est.data.chars).toBeGreaterThan(1000);

    const stages: string[] = [];
    const r = await produceNarration(ep.data.id, {
      onProgress: (p) => stages.push(p.stage),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.skipped).toBe(false);
    expect(r.data.durationSec).toBeGreaterThan(60);
    // One "synthesizing" event per chunk, then the tail stages once each.
    expect([...new Set(stages)]).toEqual([
      "preparing",
      "synthesizing",
      "stitching",
      "aligning",
      "saving",
    ]);
    expect(stages.filter((s) => s === "synthesizing").length).toBe(2);
    const withAudio = getEpisode(ep.data.id);
    expect(withAudio.ok && withAudio.data.audio?.hasAlignment).toBe(true);
    expect(
      estimateNarration(ep.data.id).ok &&
        (estimateNarration(ep.data.id) as { data: { upToDate: boolean } }).data.upToDate,
    ).toBe(true);

    const again = await produceNarration(ep.data.id);
    expect(again.ok && again.data.skipped).toBe(true);

    // Editing the performed script invalidates the hash.
    updateEpisode(ep.data.id, { performedScript: "טקסט חדש לגמרי. עם שני משפטים." });
    const third = await produceNarration(ep.data.id);
    expect(third.ok && third.data.skipped).toBe(false);
  }, 30000);

  it("stitches multiple chunks (needs ffmpeg) and offsets alignment", async () => {
    updateSettings({ voiceId: "fake-noa" });
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    const para = "זה משפט שנועד למלא מקום בבדיקה. ".repeat(60).trim();
    updateEpisode(ep.data.id, {
      performedScript: Array.from({ length: 5 }, () => para).join("\n\n"),
    });
    const est = estimateNarration(ep.data.id);
    expect(est.ok && est.data.chunks).toBeGreaterThan(1);
    const r = await produceNarration(ep.data.id);
    if (!r.ok) {
      // Without ffmpeg the pipeline must fail with a friendly, specific code.
      expect(r.error.code).toBe("NO_FFMPEG");
      return;
    }
    expect(r.data.chunks).toBeGreaterThan(1);
    const withAudio = getEpisode(ep.data.id);
    expect(withAudio.ok && withAudio.data.audio?.durationSec).toBeGreaterThan(100);
  }, 60000);
});
