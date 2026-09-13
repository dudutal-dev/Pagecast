/**
 * Tiny structured logger. Redacts anything that looks like a secret so provider
 * errors can be logged safely. Swap for pino later if needed.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;

const SECRET_RE =
  /(sk[-_][A-Za-z0-9_-]{8,}|xi-api-key[^,}]*|api[_-]?key["':= ]+[^,}\s]+)/gi;

function redact(v: unknown): unknown {
  if (typeof v === "string") return v.replace(SECRET_RE, "[redacted]");
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [
        k,
        /key|token|secret|authorization/i.test(k) ? "[redacted]" : redact(x),
      ]),
    );
  }
  return v;
}

function log(level: Level, ctx: Record<string, unknown>, msg: string) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...(redact(ctx) as object),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (ctx: Record<string, unknown>, msg: string) => log("debug", ctx, msg),
  info: (ctx: Record<string, unknown>, msg: string) => log("info", ctx, msg),
  warn: (ctx: Record<string, unknown>, msg: string) => log("warn", ctx, msg),
  error: (ctx: Record<string, unknown>, msg: string) => log("error", ctx, msg),
};
