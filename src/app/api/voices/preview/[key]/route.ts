import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/result";
import { parseRange } from "@/lib/httpRange";
import { jsonError, withErrorBoundary, type RouteContext } from "@/server/http";
import { getPreviewFile } from "@/server/services/narration/voices";

export const dynamic = "force-dynamic";

export const GET = withErrorBoundary(
  "GET /api/voices/preview/[key]",
  async (req: Request, ctx: RouteContext<{ key: string }>) => {
    const { key } = await ctx.params;
    if (!/^[a-f0-9]{20}$/.test(key))
      return jsonError(new AppError("NOT_FOUND", "דוגמה לא נמצאה"));
    const file = getPreviewFile(key);
    if (!file) return jsonError(new AppError("NOT_FOUND", "דוגמה לא נמצאה"));
    const stat = await file.storage.stat(file.path);
    if (!stat) return jsonError(new AppError("NOT_FOUND", "קובץ הדוגמה חסר"));
    const size = stat.sizeBytes;
    const range = parseRange(req.headers.get("range"), size);
    if (range === "unsatisfiable") {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? size - 1;
    const body = Readable.toWeb(
      file.storage.readRange(file.path, start, end),
    ) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400",
    };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    return new NextResponse(body, { status: range ? 206 : 200, headers });
  },
);
