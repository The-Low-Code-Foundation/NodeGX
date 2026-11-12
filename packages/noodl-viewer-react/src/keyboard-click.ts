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
 * - **What it holds wins** (P121-TWO003-NESTEDBUTTON, ruled 2026-10-27, "inner controls win"): an element that has a
 *   button, a field, a link or anything else Tab stops on inside it is NOT made a button. Measured in Chrome, a card
 *   holding an "Add to basket" Button read as one button named "Lemon cake £4.00 — … Add to basket", and the backdrop
 *   behind a settings sheet (Click = close) took a focus ring around the whole sheet, read as one button carrying every
 *   word of it, and closed the sheet on Enter. Tab reaches the inner controls instead. Kept in step while the element
 *   is marked: a control that appears inside later (a repeater filling, a sheet's content mounting) takes the button
 *   back off, and the last one leaving gives it again. The validator says so to the maker
 *   (`click-area-holds-a-control`): a Click that does something no inner control does needs its own Button.
 *
 * Why at the element and not in render: a wire made in the editor while the preview runs does not re-render the node
 * (the same reason `pointerlisteners.ts` reads the wire at click time), so the answer is kept in step by the Click
 * output's own first-connection and last-connection hooks, and by `setDOMElement` whenever the node has a new element.
 *
 * @module noodl-viewer-react/keyboard-click
 */

/** An output as the runtime keeps it: its wires, each to a node's input. */
interface OutputLike {
  hasConnections(): boolean;
  connections?: Array<{ node?: unknown; inputPortName?: string }>;
}

/** The slice of a visual node this module touches. */
export interface KeyboardClickNode {
  getDOMElement(): HTMLElement | null;
  hasOutput(name: string): boolean;
  getOutput(name: string): OutputLike;
}

/** The slice of a component instance a Component Outputs node hands its value to. */
interface ComponentOwnerLike {
  hasOutput?(name: string): boolean;
  getOutput?(name: string): OutputLike;
  _internal?: { creatorCallbacks?: unknown };
}

/** Marks an element this module made keyboard-pressable, for the focus ring. */
export const KEYBOARD_CLICK_ATTRIBUTE = 'data-ndl-keyboard-click';

interface Marked {
  el: HTMLElement;
  added: string[];
  onKeyDown: (e: KeyboardEvent) => void;
  onKeyUp: (e: KeyboardEvent) => void;
  /** Watches what the element holds, so a control arriving inside takes the button back off. */
  observer: MutationObserver | null;
}

/**
 * Something inside an element that is already reachable and pressable: a control, a link, a field, anything with its
 * own Tab stop (another Click-wired element marked by this module included). `tabindex="-1"` is not a Tab stop.
 */
const PRESSABLE_INSIDE =
  'button, input:not([type="hidden"]), select, textarea, summary, a[href], area[href], video[controls], audio[controls], ' +
  '[contenteditable=""], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function holdsPressable(el: HTMLElement): boolean {
  return el.querySelector(PRESSABLE_INSIDE) !== null;
}

const marked = new WeakMap<KeyboardClickNode, Marked>();

/** The node's Click output has at least one wire. */
export function clickIsWired(node: KeyboardClickNode): boolean {
  if (!node.hasOutput('onClick')) return false;
  return reachesSomething(node.getOutput('onClick'), 0);
}

/**
 * Whether a press on this output does anything: some wire reaches a node that acts. A wire into a component's own
 * Component Outputs counts only when the place the component is used takes that output further
 * (P121-TWO003-NESTEDBUTTON: rocket-school's Header holds "The face", whose picture's Click goes to a `Tapped` output
 * the Header never uses. The picture was a Tab stop that did nothing, and with "inner controls win" it hid the Header,
 * the one that opens the menu.) An instance a repeater or Run Tasks made hands its outputs on without wires
 * (`creatorCallbacks`), so its outputs count. Anything this cannot read counts, as before.
 */
function reachesSomething(output: OutputLike, depth: number): boolean {
  if (!output.hasConnections()) return false;
  if (!Array.isArray(output.connections)) return true;
  return output.connections.some((c) => !goesNowhere(c, depth));
}

function goesNowhere(connection: { node?: unknown; inputPortName?: string }, depth: number): boolean {
  const target = connection.node as { name?: string; nodeScope?: { componentOwner?: ComponentOwnerLike } } | undefined;
  if (!target || target.name !== 'Component Outputs' || typeof connection.inputPortName !== 'string') return false;
  const owner = target.nodeScope?.componentOwner;
  if (!owner || depth > 16 || owner._internal?.creatorCallbacks) return false;
  if (typeof owner.hasOutput !== 'function' || typeof owner.getOutput !== 'function') return false;
  if (!owner.hasOutput(connection.inputPortName)) return true;
  return !reachesSomething(owner.getOutput(connection.inputPortName), depth + 1);
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
  const m: Marked = { el, added: [], onKeyDown, onKeyUp, observer: null };
  if (isNativelyInteractive(el)) return m;
  refresh(m);
  if (typeof MutationObserver !== 'undefined') {
    m.observer = new MutationObserver(() => refresh(m));
    m.observer.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'contenteditable', 'href', 'controls', 'type']
    });
  }
  return m;
}

/** Make the element a button, or give that back, by what it holds now. Changes nothing when it already agrees. */
function refresh(m: Marked): void {
  const { el } = m;
  const want = !holdsPressable(el);
  if (want && !m.added.length) {
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
      m.added.push('tabindex');
    }
    if (!el.hasAttribute('role')) {
      el.setAttribute('role', 'button');
      m.added.push('role');
    }
    // Only where this module made the element pressable: one with its own tabindex or role was made pressable by
    // whoever gave it those.
    if (m.added.length) {
      el.setAttribute(KEYBOARD_CLICK_ATTRIBUTE, '');
      m.added.push(KEYBOARD_CLICK_ATTRIBUTE);
      el.addEventListener('keydown', m.onKeyDown);
      el.addEventListener('keyup', m.onKeyUp);
    }
  } else if (!want && m.added.length) {
    giveBack(m);
  }
}

function giveBack(m: Marked): void {
  for (const name of m.added) m.el.removeAttribute(name);
  m.added = [];
  m.el.removeEventListener('keydown', m.onKeyDown);
  m.el.removeEventListener('keyup', m.onKeyUp);
}

function unmark(m: Marked): void {
  m.observer?.disconnect();
  giveBack(m);
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
