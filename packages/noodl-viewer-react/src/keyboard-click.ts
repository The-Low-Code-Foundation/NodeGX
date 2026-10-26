/**
 * P121-TWO003-GROUPKEYBOARD — an element whose Click is wired can be reached and pressed from the keyboard.
 *
 * A product card is a Group with its Click wired to a navigate, and a photo tile is an Image with its Click wired. Before
 * this, neither could be reached with Tab, a screen reader did not announce either as something to press, and Enter or
 * Space on one did nothing: a whole card that opens something worked only with a pointer. The marketplace and community
 * templates laid a transparent Button over every card and every tile to get round it.
 *
 * Richard ruled it on 2026-10-26: *"For accessibility yes, absolutely, we must have interactive elements available to
 * screen readers that tab through the page."* So it is automatic, not a setting: as soon as a visual node's Click output
 * has a wire, its element is a button to the keyboard and to assistive technology.
 *
 * - **`tabindex="0"`**, so Tab stops on it, and **`role="button"`**, so a screen reader announces it as one and names
 *   it from its content (a card's text, an image's alt). Only added where the element does not already say: an
 *   element with its own tabindex or role keeps it, and one that is interactive by itself (a `<button>`, a link, a
 *   field, a `<video controls>`) is left alone. Taking the last wire off takes back only what this module added.
 * - **Enter clicks it at once and Space clicks it when the key comes up**, as a `<button>` does. The click is the
 *   element's own `click()`, so it runs through exactly the path a pointer's click does: Click Bubbling, the press
 *   guard, the focus tracker. A key that something else already handled is left to it (`defaultPrevented`), which is
 *   how a Draggable card keeps Space for picking it up: `drag-drop.ts` listens on the document in the capture phase
 *   and runs first. A key pressed inside the element (a field in a card) is the field's, not the card's.
 * - **The focus ring** is the controls' ring (`assets/style.css`, `[data-ndl-keyboard-click]:focus-visible`).
 *
 * Why at the element and not in render: a wire made in the editor while the preview runs does not re-render the node
 * (the same reason `pointerlisteners.ts` reads the wire at click time), so the answer is kept in step by the Click
 * output's own first-connection and last-connection hooks, and by `setDOMElement` whenever the node has a new element.
 *
 * @module noodl-viewer-react/keyboard-click
 */

/** The slice of a visual node this module touches. */
export interface KeyboardClickNode {
  getDOMElement(): HTMLElement | null;
  hasOutput(name: string): boolean;
  getOutput(name: string): { hasConnections(): boolean };
}

/** Marks an element this module made keyboard-pressable, for the focus ring. */
export const KEYBOARD_CLICK_ATTRIBUTE = 'data-ndl-keyboard-click';

interface Marked {
  el: HTMLElement;
  added: string[];
  onKeyDown: (e: KeyboardEvent) => void;
  onKeyUp: (e: KeyboardEvent) => void;
}

const marked = new WeakMap<KeyboardClickNode, Marked>();

/** The node's Click output has at least one wire. */
export function clickIsWired(node: KeyboardClickNode): boolean {
  if (!node.hasOutput('onClick')) return false;
  return node.getOutput('onClick').hasConnections();
}

/**
 * An element the browser already makes reachable and pressable. Adding a role or a tabindex to it would only get in the
 * way of what it already says.
 */
function isNativelyInteractive(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SUMMARY') return true;
  if ((tag === 'A' || tag === 'AREA') && el.hasAttribute('href')) return true;
  if ((tag === 'VIDEO' || tag === 'AUDIO') && el.hasAttribute('controls')) return true;
  return el.isContentEditable === true;
}

function isSpace(e: KeyboardEvent): boolean {
  return e.key === ' ' || e.key === 'Spacebar';
}

/** A key meant for this element: on it (not a field inside it), not handled already, no modifier, not mid-composition. */
function isOwnKey(el: HTMLElement, e: KeyboardEvent): boolean {
  return e.target === el && !e.defaultPrevented && !e.altKey && !e.ctrlKey && !e.metaKey && !e.isComposing;
}

function mark(el: HTMLElement): Marked {
  const added: string[] = [];
  if (!isNativelyInteractive(el)) {
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
      added.push('tabindex');
    }
    if (!el.hasAttribute('role')) {
      el.setAttribute('role', 'button');
      added.push('role');
    }
  }
  if (added.length) {
    el.setAttribute(KEYBOARD_CLICK_ATTRIBUTE, '');
    added.push(KEYBOARD_CLICK_ATTRIBUTE);
  }

  // A Space press is armed on the way down and clicks on the way up, as a `<button>` does; Enter clicks at once.
  let spaceArmed = false;
  const onKeyDown = (e: KeyboardEvent) => {
    if (!isOwnKey(el, e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) el.click();
    } else if (isSpace(e)) {
      // the page would scroll by a screen
      e.preventDefault();
      if (!e.repeat) spaceArmed = true;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!isSpace(e)) return;
    const armed = spaceArmed;
    spaceArmed = false;
    if (armed && e.target === el && !e.defaultPrevented) el.click();
  };
  // Only where this module made the element pressable: a native control presses itself, and one with its own tabindex or
  // role was made pressable by whoever gave it those.
  if (added.length) {
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);
  }
  return { el, added, onKeyDown, onKeyUp };
}

function unmark(m: Marked): void {
  for (const name of m.added) m.el.removeAttribute(name);
  m.el.removeEventListener('keydown', m.onKeyDown);
  m.el.removeEventListener('keyup', m.onKeyUp);
}

/**
 * Bring the node's element in step with its Click wire: pressable from the keyboard while Click has a wire, as it was
 * otherwise. Called when the node has a new element, and when its Click gains its first wire or loses its last.
 */
export function syncKeyboardClick(node: KeyboardClickNode): void {
  const el = typeof node.getDOMElement === 'function' ? node.getDOMElement() : null;
  const want = el && clickIsWired(node) ? el : null;
  const was = marked.get(node);
  if (was && was.el === want) return;
  if (was) {
    unmark(was);
    marked.delete(node);
  }
  if (want) marked.set(node, mark(want));
}

/**
 * The Click output's own hooks: its first wire makes the element pressable, its last wire taken off gives that back. A wire
 * made before the node has an element (every wire in a project as it loads) finds none here, and `setDOMElement` marks the
 * element when it comes.
 */
export const KEYBOARD_CLICK_HOOKS = {
  onFirstConnectionAdded(this: unknown) {
    syncKeyboardClick(this as KeyboardClickNode);
  },
  onLastConnectionRemoved(this: unknown) {
    syncKeyboardClick(this as KeyboardClickNode);
  }
};
