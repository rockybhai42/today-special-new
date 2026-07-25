/**
 * Resolves the item that should play after `currentId`, by id rather than
 * array index, so a playlist update that lands mid-loop (reorder, insert,
 * delete) can't desync playback from a stale index.
 */
export function getNextItem(items, currentId) {
  if (!items || items.length === 0) return null;
  if (!currentId) return items[0];

  const currentPos = items.findIndex((item) => item.id === currentId);
  if (currentPos === -1) return items[0];

  return items[(currentPos + 1) % items.length];
}
