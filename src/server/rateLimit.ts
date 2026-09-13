import { AppError } from "@/lib/result";

/**
 * In-process limits for the expensive routes. Single-user app, so the key is
 * the route name; this protects the ElevenLabs quota from runaway clients.
 */
const windows = new Map<string, number[]>();
const inflight = new Map<string, number>();

export function checkRate(key: string, max: number, perMs: number): void {
  const now = Date.now();
  const arr = (windows.get(key) ?? []).filter((t) => now - t < perMs);
  if (arr.length >= max) {
    throw new AppError("RATE_LIMITED", "יותר מדי בקשות. חכה רגע ונסה שוב.", {
      hint: `עד ${max} בקשות ב-${Math.round(perMs / 1000)} שניות`,
    });
  }
  arr.push(now);
  windows.set(key, arr);
}

/** Returns a release function; throws when too many are already running. */
export function acquireSlot(key: string, max: number): () => void {
  const n = inflight.get(key) ?? 0;
  if (n >= max) {
    throw new AppError("RATE_LIMITED", "הפקה אחרת כבר רצה. חכה שתסתיים.", {
      hint: `עד ${max} הפקות במקביל`,
    });
  }
  inflight.set(key, n + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inflight.set(key, Math.max(0, (inflight.get(key) ?? 1) - 1));
  };
}

export function resetRateLimitsForTests() {
  windows.clear();
  inflight.clear();
}
