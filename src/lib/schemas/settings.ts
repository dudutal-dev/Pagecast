import { z } from "zod";

export const VOICE_MODELS = ["eleven_v3", "eleven_multilingual_v2"] as const;
export type VoiceModel = (typeof VOICE_MODELS)[number];

export const THEMES = ["auto", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const voiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1),
  similarityBoost: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
  speakerBoost: z.boolean(),
});
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.4,
  similarityBoost: 0.8,
  style: 0.55,
  speakerBoost: true,
};

export const settingsSchema = z.object({
  podcastName: z.string().trim().min(1).max(60),
  hostName: z.string().trim().max(60),
  voiceId: z.string().nullable(),
  voiceName: z.string().nullable(),
  voiceModel: z.enum(VOICE_MODELS),
  voiceSettings: voiceSettingsSchema,
  defaultRate: z.number().min(0.8).max(1.5),
  theme: z.enum(THEMES),
  onboardingDone: z.boolean(),
  /** USD per character, used only for the pre-narration cost estimate. */
  pricePerChar: z.number().min(0),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  podcastName: "Pagecast",
  hostName: "",
  voiceId: null,
  voiceName: null,
  voiceModel: "eleven_v3",
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  defaultRate: 1,
  theme: "auto",
  onboardingDone: false,
  pricePerChar: 0.00003,
};

export const settingsPatchSchema = settingsSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "אין שדות לעדכון" });
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
