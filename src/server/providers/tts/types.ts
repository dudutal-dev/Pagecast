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

export interface TtsProvider {
  readonly name: "elevenlabs" | "fake";
  listVoices(): Promise<VoiceInfo[]>;
  synthesize(text: string, opts: SynthesizeOptions): Promise<SynthesizeResult>;
}
