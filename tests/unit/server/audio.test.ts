import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/server/db/client";
import { LocalFsStorage } from "@/server/providers/storage";
import { attachAudio, deleteAudio, getAudioAsset } from "@/server/services/audio";
import { createEpisode, getEpisode, deleteEpisode } from "@/server/services/episodes";
import { episodeInputSchema } from "@/lib/schemas/episode";
import { DEFAULT_VOICE_SETTINGS } from "@/lib/schemas/settings";
import { silentMp3 } from "@/server/providers/tts/fake";
import frankl from "../../fixtures/episode.frankl.json";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pagecast-audio-"));
const g = globalThis as unknown as { __pagecastStorage?: LocalFsStorage };

beforeEach(() => {
  resetDbForTests();
  g.__pagecastStorage = new LocalFsStorage(tmpRoot);
});
afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const base = () => ({
  durationSec: 12,
  voiceId: "fake-noa",
  modelId: "eleven_v3" as const,
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  alignment: [{ start: 0, end: 12, text: "x" }],
});

describe("audio service", () => {
  it("attaches audio, exposes it on the episode, and replaces on re-attach", async () => {
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    const first = await attachAudio({
      ...base(),
      episodeId: ep.data.id,
      audio: silentMp3(1),
      scriptHash: "h1",
    });
    expect(first.ok).toBe(true);
    const withAudio = getEpisode(ep.data.id);
    expect(withAudio.ok && withAudio.data.audio?.scriptHash).toBe("h1");
    expect(withAudio.ok && withAudio.data.audio?.hasAlignment).toBe(true);
    const p1 = path.join(tmpRoot, ep.data.id, "h1.mp3");
    expect(fs.existsSync(p1)).toBe(true);

    const second = await attachAudio({
      ...base(),
      episodeId: ep.data.id,
      audio: silentMp3(2),
      scriptHash: "h2",
    });
    expect(second.ok && second.data.id).toBe(first.ok ? first.data.id : "");
    expect(fs.existsSync(p1)).toBe(false);
    expect(fs.existsSync(path.join(tmpRoot, ep.data.id, "h2.mp3"))).toBe(true);
  });

  it("returns NOT_FOUND for unknown episode and removes file on deleteAudio", async () => {
    const r = await attachAudio({
      ...base(),
      episodeId: "ep_nope",
      audio: silentMp3(1),
      scriptHash: "h",
    });
    expect(r.ok).toBe(false);
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    await attachAudio({
      ...base(),
      episodeId: ep.data.id,
      audio: silentMp3(1),
      scriptHash: "h3",
    });
    const del = await deleteAudio(ep.data.id);
    expect(del.ok && del.data.removed).toBe(true);
    expect(getAudioAsset(ep.data.id)).toBeNull();
    expect(fs.existsSync(path.join(tmpRoot, ep.data.id, "h3.mp3"))).toBe(false);
  });

  it("cascades the asset row when the episode is deleted", async () => {
    const ep = createEpisode(episodeInputSchema.parse(frankl));
    if (!ep.ok) throw new Error("setup");
    await attachAudio({
      ...base(),
      episodeId: ep.data.id,
      audio: silentMp3(1),
      scriptHash: "h4",
    });
    const d = deleteEpisode(ep.data.id);
    expect(d.ok && d.data.audioPath).toBe(`${ep.data.id}/h4.mp3`);
    expect(getAudioAsset(ep.data.id)).toBeNull();
  });
});
