import { jsonOk, withErrorBoundary } from "@/server/http";
import { countEpisodes } from "@/server/services/episodes";
import { detectFfmpeg } from "@/server/ffmpeg";
import { providerStatus } from "@/server/providers";

export const dynamic = "force-dynamic";

/** Used by the settings screen and the onboarding to explain what is missing. */
export const GET = withErrorBoundary("GET /api/health", async () => {
  const ffmpeg = await detectFfmpeg();
  return jsonOk({
    ok: true,
    episodes: countEpisodes(),
    ffmpeg,
    providers: providerStatus(),
  });
});
