import { z } from "zod";
import { parseBody, respond, withErrorBoundary, type RouteContext } from "@/server/http";
import { markStatus, saveProgress } from "@/server/services/episodes";
import { EPISODE_STATUSES } from "@/lib/schemas/episode";

export const dynamic = "force-dynamic";

const bodySchema = z.union([
  z.object({
    positionSec: z.number().min(0),
    durationSec: z.number().min(0).nullable().default(null),
  }),
  z.object({ status: z.enum(EPISODE_STATUSES) }),
]);

export const PATCH = withErrorBoundary(
  "PATCH /api/episodes/[id]/progress",
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const { id } = await ctx.params;
    const body = await parseBody(req, bodySchema);
    if (!body.ok) return body.response;
    if ("status" in body.data) return respond(markStatus(id, body.data.status));
    return respond(saveProgress(id, body.data.positionSec, body.data.durationSec));
  },
);
