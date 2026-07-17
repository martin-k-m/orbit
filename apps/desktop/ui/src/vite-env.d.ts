/// <reference types="vite/client" />

interface Window {
  // Present only when running inside the Tauri runtime.
  __TAURI_INTERNALS__?: unknown;
}
