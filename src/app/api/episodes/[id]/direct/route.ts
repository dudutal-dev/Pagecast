import { sseResponse } from "@/server/sse";
import { withErrorBoundary, type RouteContext } from "@/server/http";
import { checkRate } from "@/server/rateLimit";
import { directEpisode } from "@/server/services/narration/director";

export const dynamic = "force-dynamic";

/**
 * Runs the narration director. Streams `delta` events with text as Claude
 * writes, then `done` with the stored performed script, or `error`.
 */
export const POST = withErrorBoundary(
  "POST /api/episodes/[id]/direct",
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const { id } = await ctx.params;
    checkRate("director", 10, 60_000);
    return sseResponse(async (w) => {
      const r = await directEpisode(id, {
        onDelta: (t) => w.send("delta", { text: t }),
        signal: req.signal,
      });
      if (r.ok) w.send("done", r.data);
      else
        w.send("error", {
          code: r.error.code,
          message: r.error.message,
          hint: r.error.hint,
        });
    });
  },
);
