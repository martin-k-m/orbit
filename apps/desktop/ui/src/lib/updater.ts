// Auto-update helpers. These wrap the Tauri updater + process plugins behind a
// small, browser-safe surface: outside Tauri (demo/dev in a browser) they are
// no-ops so the UI never breaks.

import { isTauri } from "./ipc";

/** Metadata about an available update. */
export interface UpdateInfo {
  version: string;
  notes?: string;
  date?: string;
}

/**
 * Check whether a newer version is available. Returns `null` when up to date,
 * when running outside Tauri, or if the check fails (e.g. offline).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      notes: update.body ?? undefined,
      date: update.date ?? undefined,
    };
  } catch {
    // Network errors, no endpoint, etc. — silently treat as "no update".
    return null;
  }
}

/**
 * Download and install the available update, then relaunch the app. Progress is
 * reported through the optional `onProgress` callback (0–1), best effort.
 */
export async function installUpdate(
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (!isTauri()) return;
  const { check } = await import("@tauri-apps/plugin-updater");
  const { relaunch } = await import("@tauri-apps/plugin-process");

  const update = await check();
  if (!update) return;

  let downloaded = 0;
  let total = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0;
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      if (total > 0) onProgress?.(Math.min(downloaded / total, 1));
    } else if (event.event === "Finished") {
      onProgress?.(1);
    }
  });

  await relaunch();
}
