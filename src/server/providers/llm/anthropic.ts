import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/lib/result";
import { logger } from "@/server/logger";
import type { CompleteOptions, CompleteResult, LlmProvider } from "./types";

/**
 * Claude via the official SDK. The spec asks for "the current Sonnet"; the
 * model id is overridable with PAGECAST_LLM_MODEL. Adaptive thinking is on and
 * streaming is always used so long scripts never hit request timeouts.
 */
export const DEFAULT_LLM_MODEL = process.env.PAGECAST_LLM_MODEL ?? "claude-sonnet-5";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic | null = null;

  constructor(
    private readonly apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
    private readonly model: string = DEFAULT_LLM_MODEL,
  ) {}

  private getClient(): Anthropic {
    if (!this.apiKey) {
      throw new AppError("NO_API_KEY", "חסר מפתח Anthropic", {
        hint: "הוסף ANTHROPIC_API_KEY לקובץ .env.local והפעל מחדש את השרת.",
      });
    }
    if (!this.client) this.client = new Anthropic({ apiKey: this.apiKey, maxRetries: 2 });
    return this.client;
  }

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const client = this.getClient();
    const messages: Anthropic.MessageParam[] = opts.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : m.content.map((b) =>
              b.type === "text"
                ? { type: "text" as const, text: b.text }
                : {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: b.mediaType,
                      data: b.base64,
                    },
                  },
            ),
    }));
    try {
      const stream = client.messages.stream(
        {
          model: this.model,
          max_tokens: opts.maxTokens ?? 16000,
          system: [
            { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
          ],
          messages,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
        },
        { signal: opts.signal },
      );
      if (opts.onDelta) stream.on("text", (delta) => opts.onDelta?.(delta));
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") {
        throw new AppError("PROVIDER_ERROR", "Claude סירב לבקשה הזו", {
          hint: final.stop_details?.explanation ?? undefined,
        });
      }
      const text = final.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return {
        text,
        model: final.model,
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        stopReason: final.stop_reason,
      };
    } catch (e) {
      throw mapError(e);
    }
  }
}

function mapError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof Anthropic.AuthenticationError) {
    return new AppError("INVALID_API_KEY", "מפתח Anthropic לא תקין", {
      hint: "בדוק את ANTHROPIC_API_KEY ב-.env.local",
    });
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new AppError("RATE_LIMITED", "Anthropic מגביל בקשות כרגע", {
      hint: "נסה שוב בעוד רגע",
    });
  }
  if (e instanceof Anthropic.NotFoundError) {
    return new AppError("MODEL_UNAVAILABLE", "המודל שנבחר לא זמין", {
      hint: `בדוק את PAGECAST_LLM_MODEL (כרגע ${DEFAULT_LLM_MODEL})`,
    });
  }
  if (e instanceof Anthropic.APIError) {
    logger.error({ status: e.status, err: e.message }, "anthropic api error");
    return new AppError("PROVIDER_ERROR", `Claude החזיר שגיאה (${e.status})`, {
      hint: e.message,
    });
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new AppError("PROVIDER_ERROR", "אין חיבור ל-Anthropic", {
      hint: "בדוק את הרשת ונסה שוב",
    });
  }
  if (e instanceof Error && e.name === "AbortError") {
    return new AppError("PROVIDER_ERROR", "הבקשה בוטלה");
  }
  return new AppError("PROVIDER_ERROR", "שגיאה לא צפויה מול Claude", {
    hint: e instanceof Error ? e.message : undefined,
  });
}
