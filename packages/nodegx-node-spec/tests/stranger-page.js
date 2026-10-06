/**
 * NSP-023 step 8 (AC5) — the PAGE a stranger's visual node is drawn on, and the PERSON who acts on it.
 *
 * A round whose nodes a person acts on (spec.ts THE PERSON, `needs: ['person']`) hands its target one page:
 *
 *   strangerTarget(page)   page = { window, document, act(root, act, value) }
 *
 * The target draws its node's elements into `page.document` itself — plain DOM, no framework — and keeps the node's
 * outermost element (`root`) in the document while the node is on the page. Everything a person does arrives the way it
 * arrives in a browser: as DOM events on the elements the target drew, raised by `page.act`. A target's `act(h, act,
 * value)` records the act, brings the page up to date (spec.ts: an act happens on a PAINTED page), and then calls
 * `page.act(root, act, value)` — and the node's answer comes from the listeners the target put on its elements.
 *
 * `page.act` is the browser's part, copied from the runtime target's person face
 * (packages/noodl-runtime/test/helpers/node-spec-target.ts PERSON, `personActs`, `elementSeen`, `underPointer`, s48):
 *
 *   - THE ELEMENT A PERSON SEES: `root` itself when it is a form control (`button, input, select, textarea`), else the
 *     first one inside it, else `root`. A root that is not in the document is nothing to act on: the act does nothing.
 *   - THE HIT TEST: a pointer act lands on the element under the pointer. An element with `pointer-events: none` or
 *     `visibility: hidden` / `collapse` (computed, so inherited) is never that element; the act lands on its nearest
 *     ancestor that can be, else the body. The keyboard acts (`focus`, `blur`, `choose`) go to the element itself.
 *   - POINTER EVENTS first: `pointerdown` / `pointerup` (a `MouseEvent` carrying `pointerType`, `pointerId`, `isPrimary`
 *     — jsdom has no `PointerEvent`), then the compatibility events: `mousedown`, `mouseup`, `click` for a mouse,
 *     `touchstart` / `touchend` for a finger.
 *   - A DISABLED form control is dispatched no `mousedown`, `mouseup` or `click` (HTML; Chromium withholds the mouse's
 *     compatibility events the same way). Its pointer events, `mouseover` / `mouseout` and the touch events still arrive.
 *   - A mouse button down that no listener cancelled (`preventDefault`) ends in the browser's default action: the keyboard
 *     onto the pressed element (`focus()`, the focusing steps).
 *   - The acts: `hover` — `mouseover`; `leave` — `mouseout` (both with `relatedTarget` the body); `press` — the pointer
 *     down and the mouse down; `release` — the pointer up and the mouse up; `click` — a press, then the pointer up, the
 *     mouse up and `click`; `touch` — `pointerdown` and `touchstart`; `lift` — `pointerup` and `touchend`; `focus` —
 *     `element.focus()`; `blur` — `element.blur()`; `choose` (a `<select>` only) — a keyboard pick: nothing on a disabled
 *     element or for a value no enabled option has; else the keyboard goes onto the element first (`focus()`, unless it
 *     holds it), and if that fails nothing more; picking the option already selected raises nothing; otherwise the
 *     selection is written as a keystroke writes it and `input`, then `change`, are raised on the element.
 *   - THE FOCUSING STEPS are jsdom's (a disabled control is not a focusable area, and `blur()` on one does nothing), with
 *     the browser's one rule jsdom lacks: an element whose computed `visibility` is not `visible` is not focusable either
 *     (Chromium `Element::IsFocusableStyle`). jsdom has no focus FIXUP: an element that becomes hidden or disabled while
 *     it holds the keyboard keeps it. Removing it from the document takes the keyboard away silently (no `blur` event).
 *     `scrollIntoView` is a no-op (jsdom has none).
 *
 * One page per process (a jsdom window is slow to make), so a target must take its elements out of the document at
 * `dispose`: what it leaves there stays for the next play.
 */
'use strict';

const CONTROL = 'button, input, select, textarea';
const KEYBOARD = new Set(['focus', 'blur', 'choose']);

let made;

function makePage() {
  if (made) return made;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom');
  const w = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true }).window;
  w.Element.prototype.scrollIntoView = () => undefined;
  const focus = w.HTMLElement.prototype.focus;
  w.HTMLElement.prototype.focus = function (...args) {
    if (this.isConnected && w.getComputedStyle(this).visibility !== 'visible') return;
    return focus.apply(this, args);
  };
  const document = w.document;

  const elementSeen = (root) => (root.matches(CONTROL) ? root : root.querySelector(CONTROL) || root);
  const underPointer = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = w.getComputedStyle(e);
      if (cs.pointerEvents !== 'none' && cs.visibility !== 'hidden' && cs.visibility !== 'collapse') return e;
    }
    return document.body;
  };

  function act(root, name, value) {
    if (!root || !root.isConnected) return;
    const el = elementSeen(root);
    const hit = KEYBOARD.has(name) ? el : underPointer(el);
    const mouse = (type, init = {}) => hit.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0, ...init }));
    const touch = (type) => hit.dispatchEvent(new w.TouchEvent(type, { bubbles: true, cancelable: true, composed: true }));
    const pointer = (type, pointerType) => {
      const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0, buttons: type === 'pointerdown' ? 1 : 0 });
      Object.defineProperty(e, 'pointerType', { value: pointerType });
      Object.defineProperty(e, 'pointerId', { value: pointerType === 'mouse' ? 1 : 2 });
      Object.defineProperty(e, 'isPrimary', { value: true });
      return hit.dispatchEvent(e);
    };
    const disabled = !!hit.disabled;
    const press = () => {
      pointer('pointerdown', 'mouse');
      if (disabled) return;
      if (mouse('mousedown')) hit.focus();
    };
    switch (name) {
      case 'hover':
        mouse('mouseover', { relatedTarget: document.body });
        return;
      case 'leave':
        mouse('mouseout', { relatedTarget: document.body });
        return;
      case 'press':
        press();
        return;
      case 'release':
        pointer('pointerup', 'mouse');
        if (!disabled) mouse('mouseup');
        return;
      case 'click':
        press();
        pointer('pointerup', 'mouse');
        if (disabled) return;
        mouse('mouseup');
        mouse('click');
        return;
      case 'touch':
        pointer('pointerdown', 'touch');
        touch('touchstart');
        return;
      case 'lift':
        pointer('pointerup', 'touch');
        touch('touchend');
        return;
      case 'focus':
        el.focus();
        return;
      case 'blur':
        el.blur();
        return;
      case 'choose': {
        if (disabled || el.tagName !== 'SELECT') return;
        const picked = String(value);
        const option = Array.from(el.options).find((o) => o.value === picked && !o.disabled);
        if (!option) return;
        if (document.activeElement !== el) el.focus();
        if (document.activeElement !== el) return;
        if (el.value === picked) return;
        Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, 'value').set.call(el, picked);
        el.dispatchEvent(new w.Event('input', { bubbles: true, composed: true }));
        el.dispatchEvent(new w.Event('change', { bubbles: true, composed: true }));
        return;
      }
      default:
        throw new Error(`stranger-page: no person for the act "${name}"`);
    }
  }

  made = { window: w, document, act };
  return made;
}

module.exports = { makePage };
