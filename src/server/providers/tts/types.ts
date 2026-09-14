import type { CharAlignment } from "@/lib/narration/alignment";
import type { VoiceModel, VoiceSettings } from "@/lib/schemas/settings";

export interface VoiceInfo {
  voiceId: string;
  name: string;
  description: string | null;
  labels: Record<string, string>;
  previewUrl: string | null;
  /** Provider-declared language support, lowercased ISO codes when known. */
  languages: string[];
  category: string | null;
}

export interface SynthesizeOptions {
  voiceId: string;
  model: VoiceModel;
  settings: VoiceSettings;
  /** Hebrew narration; passed to providers that accept a language hint. */
  languageCode?: string;
  /** Request character timestamps when supported. */
  withTimestamps?: boolean;
  /** Previous chunk text for prosody continuity (ElevenLabs `previous_text`). */
  previousText?: string;
  nextText?: string;
}

export interface SynthesizeResult {
  audio: Buffer;
  /** `null` when the provider/model does not return timestamps. */
  alignment: CharAlignment | null;
  /** The model actually used (may differ from requested after a fallback). */
  model: VoiceModel;
}

/** One turn of a two-speaker conversation. */
export interface DialogueTurn {
  voiceId: string;
  text: string;
}

export interface TtsProvider {
  readonly name: "elevenlabs" | "fake";
  listVoices(): Promise<VoiceInfo[]>;
  /**
   * Characters left in the account's quota, `null` when the provider does not
   * report one. Optional: a local or fake provider has no quota to report.
   */
  remainingCharacters?(): Promise<number | null>;
  synthesize(text: string, opts: SynthesizeOptions): Promise<SynthesizeResult>;
  /**
   * Multi-speaker take: the provider renders the whole exchange in one pass, so
   * the voices react to each other instead of being stitched from solo reads.
   */
  synthesizeDialogue(
    turns: DialogueTurn[],
    opts: { model: VoiceModel; stability: number; languageCode?: string },
  ): Promise<{ audio: Buffer; model: VoiceModel }>;
}
