import { LocalFsStorage, type StorageProvider } from "./storage";

/**
 * Provider factory. Real implementations (ElevenLabs, Anthropic, cover search)
 * are added in later milestones; each gets a fake selected by
 * PAGECAST_MOCK_PROVIDERS=1 so tests and demos never touch the network.
 */
export const isMockMode = () => process.env.PAGECAST_MOCK_PROVIDERS === "1";

const g = globalThis as unknown as { __pagecastStorage?: StorageProvider };

export function getStorage(): StorageProvider {
  if (!g.__pagecastStorage) g.__pagecastStorage = new LocalFsStorage();
  return g.__pagecastStorage;
}

export interface ProviderStatus {
  mock: boolean;
  elevenlabs: "configured" | "missing";
  anthropic: "configured" | "missing";
  storage: StorageProvider["kind"];
}

export function providerStatus(): ProviderStatus {
  return {
    mock: isMockMode(),
    elevenlabs: process.env.ELEVENLABS_API_KEY ? "configured" : "missing",
    anthropic: process.env.ANTHROPIC_API_KEY ? "configured" : "missing",
    storage: getStorage().kind,
  };
}
