/**
 * Fair, stateless operator showcase rotation.
 *
 * - Same viewer + same week  → same operators (no flicker on refresh).
 * - Different viewers        → different operators (everyone gets a turn).
 * - Next week                → window shifts forward by one (last week's set
 *                              is never repeated immediately).
 *
 * No database writes: the viewer id lives in localStorage and the offset is
 * computed from a hash + the ISO week number.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function getWeekIndex(now: Date = new Date()): number {
  const isoDay = now.getUTCDay() || 7; // Sunday = 7, Monday = 1
  const mondayUtc =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
    (isoDay - 1) * DAY_MS;
  return Math.floor(mondayUtc / (7 * DAY_MS));
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Stable id for this browser, so a citizen sees the same set after refresh. */
export function getViewerKey(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = window.localStorage.getItem('fillupo_showcase_viewer');
    if (!id) {
      id = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem('fillupo_showcase_viewer', id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

/**
 * Return a rotating window of `slots` items.
 * Items keep their incoming order inside the window (city match / compliance
 * score priority is preserved), only the starting point rotates.
 */
export function rotateSlice<T>(
  items: T[],
  slots: number,
  viewerKey: string,
  scope: string,
  weekIndex: number = getWeekIndex()
): T[] {
  if (items.length === 0) return [];
  const size = Math.max(1, Math.min(slots, items.length));
  if (items.length <= size) return items.slice();

  const base = hashString(`${viewerKey}|${scope}`) % items.length;
  // Jump by a whole window each week so last week's operators are not shown
  // again immediately.
  const offset = (base + weekIndex * size) % items.length;
  return Array.from({ length: size }, (_, index) => items[(offset + index) % items.length]);
}
