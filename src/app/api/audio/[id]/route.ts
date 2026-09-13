import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/result";
import { parseRange } from "@/lib/httpRange";
import { jsonError, withErrorBoundary, type RouteContext } from "@/server/http";
import { getStorage } from "@/server/providers";
import { getAudioAsset } from "@/server/services/audio";

export const dynamic = "force-dynamic";

/**
 * Streams the episode's MP3 with HTTP Range support (required by Safari/iOS and
 * for seeking). `id` is the EPISODE id, so the client URL stays stable across
 * re-generations; the ETag changes with the script hash.
 */
export const GET = withErrorBoundary(
  "GET /api/audio/[id]",
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const { id } = await ctx.params;
    const asset = getAudioAsset(id);
    if (!asset) return jsonError(new AppError("NOT_FOUND", "לפרק הזה עדיין אין קריינות"));
    const storage = getStorage();
    const stat = await storage.stat(asset.path);
    if (!stat)
      return jsonError(new AppError("NOT_FOUND", "קובץ השמע חסר בדיסק. הפק מחדש."));

    const size = stat.sizeBytes;
    const etag = `"${asset.scriptHash}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const range = parseRange(req.headers.get("range"), size);
    if (range === "unsatisfiable") {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? size - 1;
    const stream = storage.readRange(asset.path, start, end);
    const body = Readable.toWeb(stream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
      "X-Duration-Sec": String(asset.durationSec),
    };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    return new NextResponse(body, { status: range ? 206 : 200, headers });
  },
);
