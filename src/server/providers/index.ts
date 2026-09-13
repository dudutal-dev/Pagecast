import { LocalFsStorage, type StorageProvider } from "./storage";
import type { TtsProvider } from "./tts/types";
import { FakeTtsProvider } from "./tts/fake";
import { ElevenLabsProvider } from "./tts/elevenlabs";
import type { LlmProvider } from "./llm/types";
import { FakeLlmProvider } from "./llm/fake";
import { AnthropicProvider, DEFAULT_LLM_MODEL } from "./llm/anthropic";

/**
 * Provider factory. Real implementations talk to ElevenLabs / Anthropic; fakes
 * are selected by PAGECAST_MOCK_PROVIDERS=1 so tests and demos never touch the
 * network. Instances are kept on globalThis to survive Next dev reloads.
 */
export const isMockMode = () => process.env.PAGECAST_MOCK_PROVIDERS === "1";

const g = globalThis as unknown as {
  __pagecastStorage?: StorageProvider;
  __pagecastTts?: TtsProvider;
  __pagecastLlm?: LlmProvider;
};

export function getStorage(): StorageProvider {
  if (!g.__pagecastStorage) g.__pagecastStorage = new LocalFsStorage();
  return g.__pagecastStorage;
}

export function getTts(): TtsProvider {
  if (!g.__pagecastTts)
    g.__pagecastTts = isMockMode() ? new FakeTtsProvider() : new ElevenLabsProvider();
  return g.__pagecastTts;
}

export function getLlm(): LlmProvider {
  if (!g.__pagecastLlm)
    g.__pagecastLlm = isMockMode() ? new FakeLlmProvider() : new AnthropicProvider();
  return g.__pagecastLlm;
}

/** Test helper. */
export function resetProvidersForTests() {
  g.__pagecastTts = undefined;
  g.__pagecastLlm = undefined;
}

export interface ProviderStatus {
  mock: boolean;
  elevenlabs: "configured" | "missing" | "mock";
  anthropic: "configured" | "missing" | "mock";
  llmModel: string;
  storage: StorageProvider["kind"];
}

export function providerStatus(): ProviderStatus {
  const mock = isMockMode();
  return {
    mock,
    elevenlabs: mock ? "mock" : process.env.ELEVENLABS_API_KEY ? "configured" : "missing",
    anthropic: mock ? "mock" : process.env.ANTHROPIC_API_KEY ? "configured" : "missing",
    llmModel: mock ? "fake" : DEFAULT_LLM_MODEL,
    storage: getStorage().kind,
  };
}
