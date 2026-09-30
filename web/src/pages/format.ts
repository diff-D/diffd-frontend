import { testInfo } from "../tests/catalog";

/** A score in one line with its test's unit, e.g. "87.4 wpm" or "level 9". */
export function formatScore(test: string, primary: number): string {
  return testInfo(test)?.formatScore(primary) ?? String(Math.round(primary * 100) / 100);
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** A day that reads the same everywhere, e.g. "29 Sep 2026" (in the visitor's language). */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Time played, roughly: "45s", "12m", "3h 12m". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return `${Math.round(ms / 1000)}s`;
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
