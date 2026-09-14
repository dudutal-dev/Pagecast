import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { countWords } from "@/lib/narration/sentences";
import type { CharAlignment } from "@/lib/narration/alignment";
import type {
  SynthesizeOptions,
  SynthesizeResult,
  TtsProvider,
  VoiceInfo,
} from "./types";

const exec = promisify(execFile);

/**
 * Fake TTS for tests and demos. Produces a real, playable MP3 whose length is
 * proportional to the text (150 words/min) so the player, progress and
 * transcript sync can be exercised end-to-end with zero network and zero cost.
 * With ffmpeg: a soft, slowly pulsing tone. Without ffmpeg: a tiny embedded
 * silent MP3 frame repeated to the right duration.
 */
export class FakeTtsProvider implements TtsProvider {
  readonly name = "fake" as const;

  async listVoices(): Promise<VoiceInfo[]> {
    return [
      {
        voiceId: "fake-noa",
        name: "נועה (מדומה)",
        description: "קול בדיקה חם ומספר-סיפורים",
        labels: { gender: "female", use_case: "narrative_story", accent: "israeli" },
        previewUrl: null,
        languages: ["he", "en"],
        category: "fake",
      },
      {
        voiceId: "fake-maya",
        name: "מאיה (מדומה)",
        description: "קול בדיקה רגוע",
        labels: { gender: "female", use_case: "audiobook" },
        previewUrl: null,
        languages: ["he"],
        category: "fake",
      },
      {
        voiceId: "fake-dan",
        name: "דן (מדומה)",
        description: "קול גברי, לא אמור להופיע ברשימה המסוננת",
        labels: { gender: "male" },
        previewUrl: null,
        languages: ["he"],
        category: "fake",
      },
    ];
  }

  async synthesizeDialogue(
    turns: { voiceId: string; text: string }[],
    opts: { model: SynthesizeOptions["model"]; stability: number },
  ): Promise<{ audio: Buffer; model: SynthesizeOptions["model"] }> {
    const words = turns.reduce((a, t) => a + countWords(t.text), 0);
    const durationSec = Math.max(1, Math.round((words / 150) * 60));
    return { audio: await makeTone(durationSec), model: opts.model };
  }

  async synthesize(text: string, opts: SynthesizeOptions): Promise<SynthesizeResult> {
    const durationSec = Math.max(1, Math.round((countWords(text) / 150) * 60));
    const audio = await makeTone(durationSec);
    const alignment = opts.withTimestamps ? fakeAlignment(text, durationSec) : null;
    return { audio, alignment, model: opts.model };
  }
}

/** Evenly spaced character timestamps: good enough to test sync end-to-end. */
export function fakeAlignment(text: string, durationSec: number): CharAlignment {
  const characters = Array.from(text);
  const n = characters.length || 1;
  const step = durationSec / n;
  return {
    characters,
    startTimes: characters.map((_, i) => i * step),
    endTimes: characters.map((_, i) => (i + 1) * step),
  };
}

async function makeTone(durationSec: number): Promise<Buffer> {
  const tmp = path.join(os.tmpdir(), `pagecast-fake-${process.pid}-${Date.now()}.mp3`);
  try {
    await exec(process.env.FFMPEG_PATH ?? "ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=196:sample_rate=44100:duration=${durationSec}`,
      "-af",
      "volume=0.08,tremolo=f=0.5:d=0.6",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      tmp,
    ]);
    const buf = await fs.readFile(tmp);
    return buf;
  } catch {
    return silentMp3(durationSec);
  } finally {
    await fs.rm(tmp, { force: true }).catch(() => undefined);
  }
}

// One valid 128 kbps / 44.1 kHz MPEG-1 Layer III silent frame (417 bytes) ≈ 26.1 ms.
const SILENT_FRAME = Buffer.from(
  "fffb90640000000000000000000000000000000000000000000000000000000000000000" +
    "00".repeat(417 - 36),
  "hex",
);

export function silentMp3(durationSec: number): Buffer {
  const frames = Math.ceil(durationSec / 0.0261);
  return Buffer.concat(Array.from({ length: frames }, () => SILENT_FRAME));
}
