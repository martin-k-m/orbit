import { describe, it, expect } from "vitest";
import { nextActiveAfterClose } from "./tabs";

describe("nextActiveAfterClose", () => {
  it("keeps focus when a background tab closes", () => {
    expect(nextActiveAfterClose(["a", "b", "c"], "c", "a")).toBe("a");
  });

  it("moves to the right neighbour when the active tab closes", () => {
    expect(nextActiveAfterClose(["a", "b", "c"], "b", "b")).toBe("c");
  });

  it("falls back to the left neighbour when closing the last tab", () => {
    expect(nextActiveAfterClose(["a", "b", "c"], "c", "c")).toBe("b");
  });

  it("returns null when the only tab closes", () => {
    expect(nextActiveAfterClose(["a"], "a", "a")).toBeNull();
  });

  it("is a no-op for unknown ids", () => {
    expect(nextActiveAfterClose(["a", "b"], "zzz", "a")).toBe("a");
  });
});
