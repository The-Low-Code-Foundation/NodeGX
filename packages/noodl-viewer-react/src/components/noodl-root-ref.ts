/**
 * Root-element reporting for built-in components.
 *
 * findDOMNode is gone in React 19, so the runtime can no longer discover a
 * component's root DOM element from the outside. Instead every built-in
 * component attaches this ref on its root host element, which feeds
 * `noodlNode.setDOMElement()` — the source for `getDOMElement()`, the
 * direct-DOM style fast path and the bounding-box observer.
 *
 * The callback is cached per node so its identity is stable across renders;
 * React then only invokes it on real mount/unmount instead of on every commit.
 */

type NoodlNodeLike = { setDOMElement(element: Element | null): void };

const refCache = new WeakMap<NoodlNodeLike, (el: Element | null) => void>();

export function noodlRootRef(noodlNode: NoodlNodeLike | undefined): ((el: Element | null) => void) | undefined {
  if (!noodlNode || typeof noodlNode.setDOMElement !== 'function') return undefined;

  let ref = refCache.get(noodlNode);
  if (!ref) {
    ref = (el: Element | null) => noodlNode.setDOMElement(el);
    refCache.set(noodlNode, ref);
  }
  return ref;
}

/**
 * P109 ISL-009 — the `data-*` attributes a node's Data Attributes list put on `props.dom`, for the
 * element `noodlRootRef` reports. Only the `data-*` keys: a control that also uses `props.dom` for
 * its inner input (the deprecated Text Input) keeps those on the input. Spread on the same element
 * as the root ref, so a test that finds `[data-testid]` finds what Scroll Into View scrolls.
 */
export function dataAttributeProps(dom: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!dom) return undefined;
  let out: Record<string, string> | undefined;
  for (const key of Object.keys(dom)) {
    if (!key.startsWith('data-')) continue;
    (out || (out = {}))[key] = String(dom[key]);
  }
  return out;
}
