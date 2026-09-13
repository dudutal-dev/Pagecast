import { jsonOk, withErrorBoundary } from "@/server/http";
import { listRankedVoices } from "@/server/services/narration/voices";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/** Voices from the account, ranked for a warm female Hebrew narrator. `?refresh=1` bypasses the cache. */
export const GET = withErrorBoundary("GET /api/voices", async (req: Request) => {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const voices = await listRankedVoices(refresh);
  const settings = getSettings();
  return jsonOk({
    voices,
    selectedVoiceId: settings.voiceId,
    eligible: voices.filter((v) => v.female && v.hebrewCapable).length,
  });
});
