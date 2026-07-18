// Regenerate the desktop icon set AND the Windows (NSIS) installer artwork from
// the single brand source, `src-tauri/icons/app-icon.svg` (the red logo).
//
// Run in CI before bundling (see build.yml / release.yml). Produces:
//   - the full platform icon set (.ico / .icns / PNGs) via `tauri icon`
//   - installerHeader.bmp (150×57) and installerSidebar.bmp (164×314), the
//     branded header + welcome/finish images NSIS uses, so the Windows setup
//     carries the Orbit logo on a dark panel instead of the default 2003 grey.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(here, "..");
const iconsDir = path.resolve(here, "../../src-tauri/icons");
const svg = path.join(iconsDir, "app-icon.svg");

// Near-black panel behind the logo, matching the app surface.
const PANEL = { r: 10, g: 8, b: 12 };

// 1) The platform icon set, straight from the SVG. Go through the shell (npx)
//    so the local Tauri CLI resolves the same way on every OS — Node can't
//    spawn the Windows `.cmd` shim directly.
execSync(`npx tauri icon "${svg}" --output "${iconsDir}"`, {
  stdio: "inherit",
  cwd: uiDir,
});

// 2) NSIS installer artwork.
await renderBmp(150, 57, "center", path.join(iconsDir, "installerHeader.bmp"));
await renderBmp(164, 314, "top", path.join(iconsDir, "installerSidebar.bmp"));

console.log("Icons + Windows installer artwork regenerated from app-icon.svg.");

/** Render the logo onto a dark panel and write a 24-bit BMP (NSIS-compatible). */
async function renderBmp(width, height, position, outPath) {
  const { data } = await sharp(svg, { density: 512 })
    .resize(width, height, { fit: "contain", position, background: PANEL })
    .flatten({ background: PANEL })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  fs.writeFileSync(outPath, encodeBmp(data, width, height));
}

/** Encode top-down RGB pixels as a bottom-up 24-bit BI_RGB BMP. */
function encodeBmp(rgb, width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4; // 4-byte aligned rows
  const pixels = rowSize * height;
  const buf = Buffer.alloc(54 + pixels);

  buf.write("BM", 0);
  buf.writeUInt32LE(54 + pixels, 2);
  buf.writeUInt32LE(54, 10); // pixel data offset
  buf.writeUInt32LE(40, 14); // BITMAPINFOHEADER size
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive → bottom-up
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bits per pixel
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixels, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI
  buf.writeInt32LE(2835, 42);

  let off = 54;
  for (let y = height - 1; y >= 0; y--) {
    let row = off;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      buf[row++] = rgb[i + 2]; // B
      buf[row++] = rgb[i + 1]; // G
      buf[row++] = rgb[i]; // R
    }
    off += rowSize;
  }
  return buf;
}
