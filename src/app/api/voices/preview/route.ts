import { z } from "zod";
import { voiceSettingsSchema, VOICE_MODELS } from "@/lib/schemas/settings";
import { jsonOk, parseBody, respond, withErrorBoundary } from "@/server/http";
import { checkRate } from "@/server/rateLimit";
import { getOrCreatePreview } from "@/server/services/narration/voices";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  voiceId: z.string().min(1),
  model: z.enum(VOICE_MODELS).optional(),
  settings: voiceSettingsSchema.optional(),
});

/** Produces (or reuses) a ~20s Hebrew sample; returns a streamable URL. */
export const POST = withErrorBoundary(
  "POST /api/voices/preview",
  async (req: Request) => {
    const body = await parseBody(req, bodySchema);
    if (!body.ok) return body.response;
    checkRate("voices.preview", 20, 60_000);
    const s = getSettings();
    const r = await getOrCreatePreview(
      body.data.voiceId,
      body.data.model ?? s.voiceModel,
      body.data.settings ?? s.voiceSettings,
    );
    if (!r.ok) return respond(r);
    return jsonOk({ ...r.data, url: `/api/voices/preview/${r.data.key}` });
  },
);
