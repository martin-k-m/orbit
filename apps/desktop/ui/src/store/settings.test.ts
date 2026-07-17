import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore, EDITOR_DEFAULTS } from "./settings";

const s = () => useSettingsStore.getState();

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...EDITOR_DEFAULTS });
  });

  it("starts at the editor defaults", () => {
    expect(s().fontSize).toBe(13);
    expect(s().tabSize).toBe(2);
    expect(s().wordWrap).toBe(true);
  });

  it("clamps font size into a sane range and rounds", () => {
    s().setFontSize(200);
    expect(s().fontSize).toBe(28);
    s().setFontSize(1);
    expect(s().fontSize).toBe(9);
    s().setFontSize(15.6);
    expect(s().fontSize).toBe(16);
  });

  it("clamps tab size to 1–8", () => {
    s().setTabSize(99);
    expect(s().tabSize).toBe(8);
    s().setTabSize(0);
    expect(s().tabSize).toBe(1);
    s().setTabSize(4);
    expect(s().tabSize).toBe(4);
  });

  it("toggles word wrap", () => {
    s().setWordWrap(false);
    expect(s().wordWrap).toBe(false);
    s().setWordWrap(true);
    expect(s().wordWrap).toBe(true);
  });

  it("ignores non-finite font sizes", () => {
    s().setFontSize(NaN);
    expect(s().fontSize).toBe(9); // falls back to the lower bound
  });
});
