/**
 * TVW-001 AC3 — the Router's `pages` parameter, edited without touching the object it came from.
 *
 * 🔴 `Pages` used to keep the node's live parameter object as its value and `push`/`splice` into
 * it, then hand that same object to `setParameter` as both the new value and the undo `oldValue`
 * (`PagesType.tsx`). Undo then restored an object that already held the change: adding a page to a
 * Router, removing one, or setting the start page could not be undone. Driven 2026-09-17 on
 * `Landing page test V2`: add `Legal` → routes `[Home, Legal]`; undo → still `[Home, Legal]`.
 *
 * Every function here returns a new value and never mutates its argument, so the object undo holds
 * is the one before the edit. Plain data, no editor imports — graded in `tests-unit/tvw-001`.
 */

export interface RouterPagesValue {
  routes?: string[];
  startPage?: string;
  [key: string]: unknown;
}

function copy(value: RouterPagesValue | undefined): RouterPagesValue {
  return { ...(value ?? {}), routes: [...(value?.routes ?? [])] };
}

export function withRouteAdded(value: RouterPagesValue | undefined, component: string): RouterPagesValue {
  const next = copy(value);
  next.routes.push(component);
  return next;
}

/** `null` when the component is not listed — nothing changed, so nothing to write or undo. */
export function withRouteRemoved(value: RouterPagesValue | undefined, component: string): RouterPagesValue | null {
  const idx = value?.routes?.indexOf(component) ?? -1;
  if (idx === -1) return null;
  const next = copy(value);
  next.routes.splice(idx, 1);
  if (next.startPage === component) next.startPage = undefined;
  return next;
}

export function withStartPage(value: RouterPagesValue | undefined, component: string): RouterPagesValue {
  return { ...copy(value), startPage: component };
}
