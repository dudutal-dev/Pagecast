import { AppError } from "@/lib/result";
import { estimateAlignment } from "@/lib/narration/alignment";
import { stripExpressionTags } from "@/lib/narration/sentences";
import { jsonError, jsonOk, withErrorBoundary, type RouteContext } from "@/server/http";
import { getAudioAsset } from "@/server/services/audio";
import { getEpisode } from "@/server/services/episodes";

export const dynamic = "force-dynamic";

/**
 * Sentence timings for the transcript. Real alignment from the asset when
 * available, otherwise a word-count estimate over the performed script.
 */
export const GET = withErrorBoundary(
  "GET /api/episodes/[id]/alignment",
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    const { id } = await ctx.params;
    const ep = getEpisode(id);
    if (!ep.ok) return jsonError(ep.error);
    const asset = getAudioAsset(id);
    if (!asset) return jsonError(new AppError("NOT_FOUND", "לפרק הזה עדיין אין קריינות"));
    if (asset.alignment && asset.alignment.length > 0) {
      return jsonOk({ source: "provider" as const, sentences: asset.alignment });
    }
    const text = stripExpressionTags(ep.data.performedScript ?? ep.data.script);
    return jsonOk({
      source: "estimated" as const,
      sentences: estimateAlignment(text, asset.durationSec),
    });
  },
);
