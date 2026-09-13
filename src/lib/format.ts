/** Formatting helpers for the Hebrew UI. Pure, safe on server and client. */

export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec <= 0) return "";
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "6 דק׳" style, for cards. */
export function formatMinutes(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec <= 0) return "";
  const min = Math.max(1, Math.round(totalSec / 60));
  return `${min} דק׳`;
}

/** Estimated narration length from word count at ~150 Hebrew words per minute. */
export function estimateDurationSec(text: string, wordsPerMinute = 150): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / wordsPerMinute) * 60);
}

const relFmt = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

export function formatRelativeDate(iso: string, now = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const days = Math.round(diffMs / 86_400_000);
  if (Math.abs(days) < 1) return "היום";
  if (Math.abs(days) < 30) return relFmt.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return relFmt.format(months, "month");
  return relFmt.format(Math.round(months / 12), "year");
}

export function formatNumberHe(n: number): string {
  return new Intl.NumberFormat("he-IL").format(n);
}
