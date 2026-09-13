import { episodePatchSchema } from "@/lib/schemas/episode";
import { parseBody, respond, withErrorBoundary, type RouteContext } from "@/server/http";
import { deleteEpisode, getEpisode, updateEpisode } from "@/server/services/episodes";
import { getStorage } from "@/server/providers";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<{ id: string }>;

export const GET = withErrorBoundary(
  "GET /api/episodes/[id]",
  async (_req: Request, ctx: Ctx) => {
    const { id } = await ctx.params;
    return respond(getEpisode(id));
  },
);

export const PATCH = withErrorBoundary(
  "PATCH /api/episodes/[id]",
  async (req: Request, ctx: Ctx) => {
    const { id } = await ctx.params;
    const body = await parseBody(req, episodePatchSchema);
    if (!body.ok) return body.response;
    return respond(updateEpisode(id, body.data));
  },
);

export const DELETE = withErrorBoundary(
  "DELETE /api/episodes/[id]",
  async (_req: Request, ctx: Ctx) => {
    const { id } = await ctx.params;
    const result = deleteEpisode(id);
    if (result.ok && result.data.audioPath) {
      await getStorage().remove(result.data.audioPath);
    }
    return respond(result);
  },
);
