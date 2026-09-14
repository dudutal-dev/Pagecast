import { AppError } from "@/lib/result";
import type { CharAlignment } from "@/lib/narration/alignment";
import type { VoiceModel } from "@/lib/schemas/settings";
import { logger } from "@/server/logger";
import type {
  SynthesizeOptions,
  SynthesizeResult,
  TtsProvider,
  VoiceInfo,
} from "./types";

const BASE = "https://api.elevenlabs.io/v1";
const OUTPUT_FORMAT = "mp3_44100_128";
const FALLBACK_MODEL: VoiceModel = "eleven_multilingual_v2";

interface ElevenVoice {
  voice_id: string;
  name: string;
  description?: string | null;
  labels?: Record<string, string>;
  preview_url?: string | null;
  category?: string | null;
  verified_languages?: { language?: string; locale?: string }[];
  high_quality_base_model_ids?: string[];
}

interface TimestampsResponse {
  audio_base64: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
  normalized_alignment?: TimestampsResponse["alignment"];
}

export class ElevenLabsProvider implements TtsProvider {
  readonly name = "elevenlabs" as const;
  private modelFallbackNoted = false;

  constructor(
    private readonly apiKey: string | undefined = process.env.ELEVENLABS_API_KEY,
  ) {}

  private key(): string {
    if (!this.apiKey) {
      throw new AppError("NO_API_KEY", "חסר מפתח ElevenLabs", {
        hint: "הוסף ELEVENLABS_API_KEY לקובץ .env.local והפעל מחדש את השרת.",
      });
    }
    return this.apiKey;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    const res = await this.fetchWithRetry(`${BASE}/voices?show_legacy=true`, {
      headers: { "xi-api-key": this.key() },
    });
    const json = (await res.json()) as { voices?: ElevenVoice[] };
    return (json.voices ?? []).map((v) => ({
      voiceId: v.voice_id,
      name: v.name,
      description: v.description ?? null,
      labels: v.labels ?? {},
      previewUrl: v.preview_url ?? null,
      languages: (v.verified_languages ?? [])
        .map((l) => (l.language ?? l.locale ?? "").toLowerCase().slice(0, 2))
        .filter(Boolean),
      category: v.category ?? null,
    }));
  }

  /**
   * Text-to-dialogue: the provider renders the whole exchange in one pass, so the
   * speakers react to each other. Capped by the API at 2,000 characters and 10
   * distinct voices per request.
   */
  async synthesizeDialogue(
    turns: { voiceId: string; text: string }[],
    opts: { model: VoiceModel; stability: number; languageCode?: string },
  ): Promise<{ audio: Buffer; model: VoiceModel }> {
    const res = await this.fetchWithRetry(
      `${BASE}/text-to-dialogue?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.key(),
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          inputs: turns.map((t) => ({ text: t.text, voice_id: t.voiceId })),
          model_id: opts.model,
          settings: { stability: opts.stability },
          ...(opts.languageCode ? { language_code: opts.languageCode } : {}),
        }),
      },
    );
    return { audio: Buffer.from(await res.arrayBuffer()), model: opts.model };
  }

  async synthesize(text: string, opts: SynthesizeOptions): Promise<SynthesizeResult> {
    try {
      return await this.synthesizeWith(text, opts, opts.model);
    } catch (e) {
      if (
        e instanceof AppError &&
        e.code === "MODEL_UNAVAILABLE" &&
        opts.model !== FALLBACK_MODEL
      ) {
        if (!this.modelFallbackNoted) {
          logger.warn({ from: opts.model, to: FALLBACK_MODEL }, "tts model fallback");
          this.modelFallbackNoted = true;
        }
        return this.synthesizeWith(text, opts, FALLBACK_MODEL);
      }
      throw e;
    }
  }

  private async synthesizeWith(
    text: string,
    opts: SynthesizeOptions,
    model: VoiceModel,
  ): Promise<SynthesizeResult> {
    const endpoint = opts.withTimestamps ? "with-timestamps" : "";
    const url = `${BASE}/text-to-speech/${encodeURIComponent(opts.voiceId)}${endpoint ? `/${endpoint}` : ""}?output_format=${OUTPUT_FORMAT}`;
    const body: Record<string, unknown> = {
      text,
      model_id: model,
      voice_settings: {
        stability: opts.settings.stability,
        similarity_boost: opts.settings.similarityBoost,
        style: opts.settings.style,
        use_speaker_boost: opts.settings.speakerBoost,
      },
    };
    if (opts.previousText) body.previous_text = opts.previousText;
    if (opts.nextText) body.next_text = opts.nextText;

    const res = await this.fetchWithRetry(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.key(),
        "content-type": "application/json",
        accept: opts.withTimestamps ? "application/json" : "audio/mpeg",
      },
      body: JSON.stringify(body),
    });

    if (opts.withTimestamps) {
      const json = (await res.json()) as TimestampsResponse;
      const a = json.normalized_alignment ?? json.alignment ?? null;
      const alignment: CharAlignment | null = a
        ? {
            characters: a.characters,
            startTimes: a.character_start_times_seconds,
            endTimes: a.character_end_times_seconds,
          }
        : null;
      return { audio: Buffer.from(json.audio_base64, "base64"), alignment, model };
    }
    return { audio: Buffer.from(await res.arrayBuffer()), alignment: null, model };
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempts = 3,
  ): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, init);
        if (res.ok) return res;
        const err = await mapError(res);
        // Retry only transient server errors.
        if (res.status >= 500 && i < attempts - 1) {
          lastErr = err;
          await sleep(500 * 2 ** i);
          continue;
        }
        throw err;
      } catch (e) {
        if (e instanceof AppError) throw e;
        lastErr = e;
        if (i < attempts - 1) await sleep(500 * 2 ** i);
      }
    }
    throw new AppError("PROVIDER_ERROR", "ElevenLabs לא זמין כרגע", {
      hint:
        lastErr instanceof Error ? lastErr.message : "בדוק את החיבור לאינטרנט ונסה שוב",
    });
  }
}

async function mapError(res: Response): Promise<AppError> {
  let detail = "";
  let status = "";
  try {
    const j = (await res.json()) as {
      detail?: { status?: string; message?: string } | string;
    };
    if (typeof j.detail === "string") detail = j.detail;
    else {
      status = j.detail?.status ?? "";
      detail = j.detail?.message ?? "";
    }
  } catch {
    /* non-JSON body */
  }
  const lower = `${status} ${detail}`.toLowerCase();
  // ElevenLabs answers 401 for an exhausted quota as well; check the reason first.
  if (lower.includes("quota") || res.status === 402) {
    return new AppError("QUOTA_EXCEEDED", "נגמרה מכסת התווים בחשבון ElevenLabs", {
      hint: detail || "בדוק את המכסה בחשבון, הפעל חריגה בתשלום, או חכה לחידוש החודשי",
    });
  }
  if (res.status === 401) {
    return new AppError("INVALID_API_KEY", "מפתח ElevenLabs לא תקין", {
      hint: "בדוק את ELEVENLABS_API_KEY ב-.env.local",
    });
  }
  if (res.status === 402 || lower.includes("quota")) {
    return new AppError("QUOTA_EXCEEDED", "נגמרה מכסת התווים בחשבון ElevenLabs", {
      hint: "שדרג את התוכנית או חכה לחידוש המכסה",
    });
  }
  if (res.status === 404 && lower.includes("voice")) {
    return new AppError("VOICE_NOT_FOUND", "הקול שנבחר לא נמצא בחשבון", {
      hint: "בחר קול אחר בהגדרות",
    });
  }
  if (
    lower.includes("model") &&
    (lower.includes("not") || lower.includes("invalid") || lower.includes("access"))
  ) {
    return new AppError("MODEL_UNAVAILABLE", "המודל לא זמין לחשבון שלך", {
      hint: "עוברים אוטומטית ל-eleven_multilingual_v2",
    });
  }
  if (res.status === 429) {
    return new AppError("RATE_LIMITED", "ElevenLabs מגביל בקשות כרגע", {
      hint: "נסה שוב בעוד רגע",
    });
  }
  return new AppError("PROVIDER_ERROR", `ElevenLabs החזיר שגיאה (${res.status})`, {
    hint: detail || status || undefined,
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
