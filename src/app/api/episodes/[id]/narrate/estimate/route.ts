import { jsonOk, respond, withErrorBoundary, type RouteContext } from "@/server/http";
import { detectFfmpeg } from "@/server/ffmpeg";
import { estimateNarration } from "@/server/services/narration/produce";

export const dynamic = "force-dynamic";

/** Characters, chunks, estimated duration and cost before the user commits. */
export const GET = withErrorBoundary(
  "GET /api/episodes/[id]/narrate/estimate",
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    const { id } = await ctx.params;
    const r = estimateNarration(id);
    if (!r.ok) return respond(r);
    const ffmpeg = await detectFfmpeg();
    return jsonOk({
      ...r.data,
      ffmpeg: ffmpeg.available,
      ffmpegHint: ffmpeg.installHint,
    });
  },
);
