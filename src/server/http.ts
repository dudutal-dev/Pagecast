import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, HTTP_STATUS, type Result } from "@/lib/result";
import { flattenIssues } from "@/lib/schemas/episode";
import { logger } from "@/server/logger";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    hint?: string;
    issues?: { path: string; message: string }[];
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function jsonError(error: AppError): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.hint ? { hint: error.hint } : {}),
      ...(Array.isArray(error.details)
        ? { issues: error.details as ApiErrorBody["error"]["issues"] }
        : {}),
    },
  };
  return NextResponse.json(body, { status: HTTP_STATUS[error.code] });
}

/** Maps a service Result to a JSON response. */
export function respond<T>(result: Result<T>, status = 200): NextResponse {
  if (result.ok) return jsonOk(result.data, { status });
  return jsonError(result.error);
}

/** Parses and validates a JSON body; returns a ready error response on failure. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: jsonError(new AppError("VALIDATION_ERROR", "גוף הבקשה אינו JSON תקין")),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(
        new AppError("VALIDATION_ERROR", "הנתונים שנשלחו אינם תקינים", {
          details: flattenIssues(parsed.error),
        }),
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export function parseQuery<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): { ok: true; data: z.infer<S> } | { ok: false; response: NextResponse } {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    if (v !== "") obj[k] = v;
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(
        new AppError("VALIDATION_ERROR", "פרמטרים לא תקינים", {
          details: flattenIssues(parsed.error),
        }),
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Wraps a handler so unexpected throws become a structured 500 instead of an HTML page. */
export function withErrorBoundary<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof AppError) return jsonError(e);
      logger.error(
        { route: name, err: e instanceof Error ? e.message : String(e) },
        "unhandled",
      );
      return jsonError(new AppError("INTERNAL_ERROR", "משהו השתבש בצד שלנו. נסה שוב."));
    }
  };
}

export type RouteContext<P extends Record<string, string>> = { params: Promise<P> };
