import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore, activeTab, basename } from "./editor";
import type { FileContents } from "@/lib/types";

function file(text: string): FileContents {
  return {
    text,
    language: "typescript",
    encoding: "utf-8",
    lineEnding: "lf",
    binary: false,
    truncated: false,
    size: text.length,
  };
}

function reset() {
  useEditorStore.setState({ tabs: [], activePath: null });
}

const s = () => useEditorStore.getState();

describe("basename", () => {
  it("takes the last segment across separators", () => {
    expect(basename("/home/a/b/main.rs")).toBe("main.rs");
    expect(basename("C:\\Users\\a\\App.tsx")).toBe("App.tsx");
    expect(basename("lonely.txt")).toBe("lonely.txt");
  });
});

describe("editor store", () => {
  beforeEach(reset);

  it("opens a file as a focused tab", () => {
    s().openTab("/p/a.ts", file("hello"));
    expect(s().tabs).toHaveLength(1);
    expect(s().activePath).toBe("/p/a.ts");
    const tab = activeTab(s())!;
    expect(tab.name).toBe("a.ts");
    expect(tab.draft).toBe("hello");
    expect(tab.dirty).toBe(false);
  });

  it("focuses an already-open file instead of duplicating it", () => {
    s().openTab("/p/a.ts", file("hello"));
    s().openTab("/p/b.ts", file("world"));
    // Edit a, then reopen it from the tree.
    s().updateDraft("/p/a.ts", "hello!");
    s().openTab("/p/a.ts", file("hello"));
    expect(s().tabs).toHaveLength(2);
    expect(s().activePath).toBe("/p/a.ts");
    // Reopening must not clobber the unsaved edit.
    expect(activeTab(s())!.draft).toBe("hello!");
    expect(activeTab(s())!.dirty).toBe(true);
  });

  it("tracks dirtiness against the saved text", () => {
    s().openTab("/p/a.ts", file("hello"));
    s().updateDraft("/p/a.ts", "hello world");
    expect(activeTab(s())!.dirty).toBe(true);
    // Typing back to the original clears the flag.
    s().updateDraft("/p/a.ts", "hello");
    expect(activeTab(s())!.dirty).toBe(false);
  });

  it("clears dirtiness on save and rebaselines the text", () => {
    s().openTab("/p/a.ts", file("hello"));
    s().updateDraft("/p/a.ts", "changed");
    s().markSaved("/p/a.ts");
    const tab = activeTab(s())!;
    expect(tab.dirty).toBe(false);
    expect(tab.contents.text).toBe("changed");
    // Re-typing the just-saved value is not dirty; reverting to the old one is.
    s().updateDraft("/p/a.ts", "changed");
    expect(activeTab(s())!.dirty).toBe(false);
    s().updateDraft("/p/a.ts", "hello");
    expect(activeTab(s())!.dirty).toBe(true);
  });

  it("focuses the right neighbour when the active tab closes", () => {
    s().openTab("/p/a.ts", file("a"));
    s().openTab("/p/b.ts", file("b"));
    s().openTab("/p/c.ts", file("c"));
    s().setActive("/p/b.ts");
    s().closeTab("/p/b.ts");
    expect(s().tabs.map((t) => t.path)).toEqual(["/p/a.ts", "/p/c.ts"]);
    expect(s().activePath).toBe("/p/c.ts");
  });

  it("falls back to the left neighbour when closing the last tab", () => {
    s().openTab("/p/a.ts", file("a"));
    s().openTab("/p/b.ts", file("b"));
    s().setActive("/p/b.ts");
    s().closeTab("/p/b.ts");
    expect(s().activePath).toBe("/p/a.ts");
  });

  it("leaves the active tab untouched when closing an inactive one", () => {
    s().openTab("/p/a.ts", file("a"));
    s().openTab("/p/b.ts", file("b"));
    s().setActive("/p/a.ts");
    s().closeTab("/p/b.ts");
    expect(s().activePath).toBe("/p/a.ts");
    expect(s().tabs).toHaveLength(1);
  });

  it("goes empty after the final tab closes", () => {
    s().openTab("/p/a.ts", file("a"));
    s().closeTab("/p/a.ts");
    expect(s().tabs).toHaveLength(0);
    expect(s().activePath).toBeNull();
    expect(activeTab(s())).toBeNull();
  });

  it("ignores setActive / closeTab for unknown paths", () => {
    s().openTab("/p/a.ts", file("a"));
    s().setActive("/nope");
    expect(s().activePath).toBe("/p/a.ts");
    s().closeTab("/nope");
    expect(s().tabs).toHaveLength(1);
  });

  it("carries a reveal line and re-reveals on reopen with a fresh nonce", () => {
    s().openTab("/p/a.ts", file("a"), 12);
    expect(activeTab(s())!.reveal?.line).toBe(12);
    const firstNonce = activeTab(s())!.reveal!.nonce;

    // Opening without a line leaves the existing reveal untouched.
    s().openTab("/p/b.ts", file("b"));
    expect(activeTab(s())!.reveal).toBeUndefined();

    // Reopening the same file at a new line bumps the nonce so the editor jumps.
    s().openTab("/p/a.ts", file("a"), 3);
    const tab = s().tabs.find((t) => t.path === "/p/a.ts")!;
    expect(tab.reveal?.line).toBe(3);
    expect(tab.reveal!.nonce).toBeGreaterThan(firstNonce);
  });

  it("closeAll clears everything", () => {
    s().openTab("/p/a.ts", file("a"));
    s().openTab("/p/b.ts", file("b"));
    s().closeAll();
    expect(s().tabs).toHaveLength(0);
    expect(s().activePath).toBeNull();
  });
});
