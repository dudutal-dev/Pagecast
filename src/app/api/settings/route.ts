import { settingsPatchSchema } from "@/lib/schemas/settings";
import { jsonOk, parseBody, respond, withErrorBoundary } from "@/server/http";
import { getSettings, updateSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export const GET = withErrorBoundary("GET /api/settings", () => jsonOk(getSettings()));

export const PATCH = withErrorBoundary("PATCH /api/settings", async (req: Request) => {
  const body = await parseBody(req, settingsPatchSchema);
  if (!body.ok) return body.response;
  return respond(updateSettings(body.data));
});
