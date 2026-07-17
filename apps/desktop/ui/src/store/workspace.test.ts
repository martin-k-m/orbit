import { describe, it, expect, beforeEach } from "vitest";
import {
  useWorkspaceStore,
  DOCK_MIN,
  DOCK_MAX,
  DOCK_DEFAULT,
} from "./workspace";

const s = () => useWorkspaceStore.getState();

describe("workspace store", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      bottomTool: null,
      dockHeight: DOCK_DEFAULT,
      treeCollapsed: false,
    });
  });

  it("starts collapsed with the default dock height", () => {
    expect(s().bottomTool).toBeNull();
    expect(s().dockHeight).toBe(DOCK_DEFAULT);
    expect(s().treeCollapsed).toBe(false);
  });

  it("docks and collapses a tool by toggling the same id", () => {
    s().toggleBottomTool("terminal");
    expect(s().bottomTool).toBe("terminal");
    s().toggleBottomTool("terminal");
    expect(s().bottomTool).toBeNull();
  });

  it("switches tools when a different id is toggled", () => {
    s().toggleBottomTool("problems");
    expect(s().bottomTool).toBe("problems");
    s().toggleBottomTool("git");
    expect(s().bottomTool).toBe("git");
  });

  it("sets the bottom tool directly, including clearing it", () => {
    s().setBottomTool("search");
    expect(s().bottomTool).toBe("search");
    s().setBottomTool(null);
    expect(s().bottomTool).toBeNull();
  });

  it("clamps the dock height to its range and rounds", () => {
    s().setDockHeight(9999);
    expect(s().dockHeight).toBe(DOCK_MAX);
    s().setDockHeight(10);
    expect(s().dockHeight).toBe(DOCK_MIN);
    s().setDockHeight(305.6);
    expect(s().dockHeight).toBe(306);
  });

  it("falls back to the default for a non-finite dock height", () => {
    s().setDockHeight(NaN);
    expect(s().dockHeight).toBe(DOCK_DEFAULT);
  });

  it("toggles the file tree", () => {
    s().toggleTree();
    expect(s().treeCollapsed).toBe(true);
    s().toggleTree();
    expect(s().treeCollapsed).toBe(false);
  });
});
