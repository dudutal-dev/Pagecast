import { z } from "zod";
import { sseResponse } from "@/server/sse";
import { parseBody, withErrorBoundary, type RouteContext } from "@/server/http";
import { acquireSlot } from "@/server/rateLimit";
import { produceNarration } from "@/server/services/narration/produce";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

const bodySchema = z.object({ force: z.boolean().optional() }).default({});

/** Produces the narration. SSE: `progress` events, then `done` or `error`. */
export const POST = withErrorBoundary(
  "POST /api/episodes/[id]/narrate",
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const { id } = await ctx.params;
    const text = await req.text();
    const parsed = bodySchema.safeParse(text ? JSON.parse(text) : {});
    const force = parsed.success ? (parsed.data.force ?? false) : false;
    void parseBody; // body is optional here
    const release = acquireSlot("narrate", 2);
    return sseResponse(async (w) => {
      try {
        const r = await produceNarration(id, {
          force,
          signal: req.signal,
          onProgress: (p) => w.send("progress", p),
        });
        if (r.ok) w.send("done", r.data);
        else
          w.send("error", {
            code: r.error.code,
            message: r.error.message,
            hint: r.error.hint,
          });
      } finally {
        release();
      }
    });
  },
);
