/** Human-friendly relative time, e.g. "2 hours ago" / "just now". */
export function relativeTime(timestamp?: number | null): string {
  if (timestamp == null) return "never";
  const now = Date.now();
  // Accept both seconds and milliseconds epochs.
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const diff = now - ms;
  if (diff < 0) return "just now";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Format a byte count into a readable string. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Format a duration in milliseconds into a compact human string. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${rem}s`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hours}h ${remMin}m`;
}

/** Format a duration expressed in seconds into "Xh Ym". */
export function formatHours(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Truncate a filesystem path from the left for compact display. */
export function shortenPath(path: string, max = 42): string {
  if (path.length <= max) return path;
  return `…${path.slice(path.length - max + 1)}`;
}
