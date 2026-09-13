import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsProvider } from "@/server/providers/tts/elevenlabs";
import { DEFAULT_VOICE_SETTINGS } from "@/lib/schemas/settings";
import { AppError } from "@/lib/result";

const opts = {
  voiceId: "v1",
  model: "eleven_v3" as const,
  settings: DEFAULT_VOICE_SETTINGS,
};

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  vi.stubGlobal("fetch", vi.fn(handler));
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("ElevenLabsProvider", () => {
  it("throws NO_API_KEY without a key", async () => {
    const p = new ElevenLabsProvider(undefined);
    await expect(p.listVoices()).rejects.toMatchObject({ code: "NO_API_KEY" });
  });

  it("maps 401 to INVALID_API_KEY", async () => {
    mockFetch(() => json(401, { detail: { status: "invalid_api_key", message: "bad" } }));
    const p = new ElevenLabsProvider("sk_test");
    await expect(p.synthesize("שלום", opts)).rejects.toMatchObject({
      code: "INVALID_API_KEY",
    });
  });

  it("maps quota and rate limit errors", async () => {
    mockFetch(() => json(402, { detail: { status: "quota_exceeded", message: "x" } }));
    await expect(new ElevenLabsProvider("k").synthesize("a", opts)).rejects.toMatchObject(
      { code: "QUOTA_EXCEEDED" },
    );
    mockFetch(() => json(429, { detail: "too many" }));
    await expect(new ElevenLabsProvider("k").synthesize("a", opts)).rejects.toMatchObject(
      { code: "RATE_LIMITED" },
    );
  });

  it("falls back to multilingual_v2 when v3 is unavailable", async () => {
    const calls: string[] = [];
    mockFetch(async (url, init) => {
      const body = JSON.parse(String(init?.body)) as { model_id: string };
      calls.push(body.model_id);
      if (body.model_id === "eleven_v3") {
        return json(400, {
          detail: {
            status: "model_not_found",
            message: "model does not exist or access denied",
          },
        });
      }
      return json(200, {
        audio_base64: Buffer.from("mp3").toString("base64"),
        alignment: {
          characters: ["א"],
          character_start_times_seconds: [0],
          character_end_times_seconds: [0.1],
        },
      });
    });
    const r = await new ElevenLabsProvider("k").synthesize("א", {
      ...opts,
      withTimestamps: true,
    });
    expect(calls).toEqual(["eleven_v3", "eleven_multilingual_v2"]);
    expect(r.model).toBe("eleven_multilingual_v2");
    expect(r.alignment?.characters).toEqual(["א"]);
    expect(r.audio.toString()).toBe("mp3");
  });

  it("retries transient 5xx then succeeds", async () => {
    let n = 0;
    mockFetch(async () =>
      n++ === 0
        ? json(503, { detail: "busy" })
        : new Response(Buffer.from("ok"), { status: 200 }),
    );
    const r = await new ElevenLabsProvider("k").synthesize("א", opts);
    expect(n).toBe(2);
    expect(r.audio.toString()).toBe("ok");
    expect(r.alignment).toBeNull();
  });

  it("filters voices into VoiceInfo with languages", async () => {
    mockFetch(() =>
      json(200, {
        voices: [
          {
            voice_id: "a",
            name: "A",
            labels: { gender: "female" },
            verified_languages: [{ language: "he" }, { locale: "en-US" }],
            category: "premade",
          },
        ],
      }),
    );
    const v = await new ElevenLabsProvider("k").listVoices();
    expect(v[0]).toMatchObject({
      voiceId: "a",
      languages: ["he", "en"],
      category: "premade",
    });
    expect(new AppError("NOT_FOUND", "x").code).toBe("NOT_FOUND");
  });
});
