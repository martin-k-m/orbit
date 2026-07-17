/**
 * Which tab to focus after `closedId` is removed from `ids`.
 *
 * Closing a background tab keeps the current focus; closing the active tab moves
 * to its right neighbour, falling back to the left, then null when the last tab
 * closes. Shared by the terminal tab strip (and anything else with the same
 * VS-Code-style behaviour).
 */
export function nextActiveAfterClose(
  ids: string[],
  closedId: string,
  activeId: string,
): string | null {
  if (closedId !== activeId) return activeId;
  const index = ids.indexOf(closedId);
  if (index === -1) return activeId;
  const remaining = ids.filter((id) => id !== closedId);
  if (remaining.length === 0) return null;
  // After removal the right neighbour sits at `index`; else fall back left.
  return remaining[index] ?? remaining[index - 1] ?? null;
}
