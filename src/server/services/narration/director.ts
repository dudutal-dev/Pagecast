import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { episodes } from "@/server/db/schema";
import { getLlm } from "@/server/providers";
import { directorSystemPrompt } from "@/server/ai/prompts/director";
import { getSettings } from "@/server/services/settings";
import { nowIso } from "@/lib/ids";
import { AppError, fail, ok, type Result } from "@/lib/result";
import { stripExpressionTags } from "@/lib/narration/sentences";

export interface DirectResult {
  performedScript: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Runs the narration director on an episode's written script and stores the
 * result as `performedScript` (the user can still edit it before producing).
 */
export async function directEpisode(
  episodeId: string,
  opts?: { onDelta?: (t: string) => void; signal?: AbortSignal },
): Promise<Result<DirectResult>> {
  const db = getDb();
  const ep = db.select().from(episodes).where(eq(episodes.id, episodeId)).get();
  if (!ep) return fail("NOT_FOUND", "הפרק לא נמצא");
  const settings = getSettings();
  const system = directorSystemPrompt({
    model: settings.voiceModel,
    podcastName: settings.podcastName,
    hostName: settings.hostName,
  });
  let res;
  try {
    res = await getLlm().complete({
      system,
      messages: [
        {
          role: "user",
          content: `כותר: ${ep.title}\nמחבר: ${ep.author}\n\n<script>\n${ep.script}\n</script>\n\nהחזר את התסריט המבוצע בלבד.`,
        },
      ],
      maxTokens: 6000,
      temperature: 0.4,
      onDelta: opts?.onDelta,
      signal: opts?.signal,
    });
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e };
    return fail("PROVIDER_ERROR", "הבמאי לא הצליח לעבד את התסריט", {
      hint: e instanceof Error ? e.message : undefined,
    });
  }
  const performed = cleanDirectorOutput(res.text, settings.voiceModel === "eleven_v3");
  if (performed.length < Math.min(200, ep.script.length * 0.3)) {
    return fail("PROVIDER_ERROR", "הבמאי החזיר תסריט קצר מדי", {
      hint: "נסה שוב, או ערוך את התסריט ידנית",
    });
  }
  db.update(episodes)
    .set({ performedScript: performed, updatedAt: nowIso() })
    .where(eq(episodes.id, episodeId))
    .run();
  return ok({
    performedScript: performed,
    model: res.model,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
  });
}

/** Removes wrappers/labels the model sometimes adds; drops tags when not v3. */
export function cleanDirectorOutput(text: string, allowTags: boolean): string {
  let t = text.trim();
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
  t = t.replace(/^(תסריט מבוצע|התסריט המבוצע)[:\s]*\n/i, "");
  t = t.replace(/^\s*\[(פתיח|אינטרו|רקע|גוף|הסתייגות|סיום|מעבר)[^\]\n]*\]\s*$/gm, "");
  if (!allowTags) t = stripExpressionTags(t);
  return t
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
