/**
 * Typed result pattern used by every service. Route handlers map `AppError.code`
 * to an HTTP status and a Hebrew message the UI can show as-is.
 */
export type AppErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NO_API_KEY"
  | "INVALID_API_KEY"
  | "NO_FFMPEG"
  | "QUOTA_EXCEEDED"
  | "VOICE_NOT_FOUND"
  | "MODEL_UNAVAILABLE"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN_BOOK"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly hint: string | undefined;
  readonly details: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    opts?: { hint?: string; details?: unknown },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.hint = opts?.hint;
    this.details = opts?.details;
  }
}

export type Result<T, E = AppError> = { ok: true; data: T } | { ok: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export const err = <E = AppError>(error: E): Result<never, E> => ({ ok: false, error });

export const fail = (
  code: AppErrorCode,
  message: string,
  opts?: { hint?: string; details?: unknown },
): Result<never> => err(new AppError(code, message, opts));

export const HTTP_STATUS: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  NO_API_KEY: 503,
  INVALID_API_KEY: 502,
  NO_FFMPEG: 503,
  QUOTA_EXCEEDED: 402,
  VOICE_NOT_FOUND: 404,
  MODEL_UNAVAILABLE: 503,
  PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
  UNKNOWN_BOOK: 422,
  INTERNAL_ERROR: 500,
};
