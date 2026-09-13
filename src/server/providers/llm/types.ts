export interface LlmMessage {
  role: "user" | "assistant";
  content: string | LlmContentBlock[];
}

export type LlmContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      base64: string;
    };

export interface CompleteOptions {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Called with incremental text while streaming. */
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export interface CompleteResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

export interface LlmProvider {
  readonly name: "anthropic" | "fake";
  complete(opts: CompleteOptions): Promise<CompleteResult>;
}
