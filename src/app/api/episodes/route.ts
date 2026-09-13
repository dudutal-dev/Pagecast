import { episodeInputSchema, libraryQuerySchema } from "@/lib/schemas/episode";
import { jsonOk, parseBody, parseQuery, respond, withErrorBoundary } from "@/server/http";
import { createEpisode, listEpisodes } from "@/server/services/episodes";

export const dynamic = "force-dynamic";

export const GET = withErrorBoundary("GET /api/episodes", (req: Request) => {
  const q = parseQuery(req, libraryQuerySchema);
  if (!q.ok) return q.response;
  return jsonOk(listEpisodes(q.data));
});

export const POST = withErrorBoundary("POST /api/episodes", async (req: Request) => {
  const body = await parseBody(req, episodeInputSchema);
  if (!body.ok) return body.response;
  return respond(createEpisode(body.data), 201);
});
