/**
 * HLT-014 — the popup layer is a modal dialog, and this is the one place that makes it one.
 *
 * Show Popup's container was a plain `Group`. Nothing set `role="dialog"`, nothing handled
 * Escape, nothing moved focus in or gave it back, and Tab walked straight out into the page
 * underneath — measured on a driven HEAD build: 9 of 20 Tabs left the popup, and after a close
 * focus sat on `body`. So an app author who wanted a real dialog had to build one as a React kit
 * node, which is what the Digital Bricks Training template did.
 *
 * The contract, owned here and nowhere else in the viewer:
 *
 * 1. **Semantics.** The container is `role="dialog"`, `aria-modal="true"`, `tabIndex=-1`, named by
 *    Show Popup's `Accessible Name`, or else by the popup's first `h1`–`h3` (`aria-labelledby`).
 * 2. **Everything behind it is `inert`**: the app, and under `Show On Top` every popup but the top.
 *    `inert` is Tab containment and screen-reader hiding in one attribute, so there is no
 *    hand-written Tab trap here — that is the part dialog implementations most often get wrong.
 * 3. **Focus in, focus back.** On show, the element that had focus is the popup's opener and focus
 *    moves to the first focusable thing inside. On close by any path, focus returns to the opener
 *    if it is still in the document, else to the new top popup, else to the app — never to `body`.
 *
 * Escape is the runtime's decision (`NodeContext.cancelTopPopup`), because the stack is.
 *
 * **Why attributes and not a native `<dialog>`:** `showModal()` would give most of this free, but
 * it moves the popup into the top layer, which changes stacking, styling and the body-scroll lock
 * the viewer already owns. HLT-014 §3 records the cost.
 *
 * ⚠️ Nothing here runs on the server: every method is reached from a browser event or a React
 * commit, and the constructor touches no `document`.
 */

/** A popup group, as the runtime hands it over. Only the DOM element and `props` are used. */
export interface PopupGroupLike {
  getDOMElement?(): Element | null;
  props?: Record<string, unknown> & { dom?: Record<string, unknown> };
}

interface OpenPopup {
  group: PopupGroupLike;
  /** The element that had focus when this popup opened — where focus goes back to. */
  opener: HTMLElement | null;
  /** Explicit name from Show Popup. When absent the popup is named from its first heading. */
  accessibleName?: string;
  /** Focus has been moved into this popup (or the attempt has given up). */
  focused: boolean;
  /**
   * `false` for Show Popup's `Modal` off — an overlay that is not a dialog, such as a toast. It gets
   * none of the contract: no semantics, no focus move, and nothing goes inert because of it.
   */
  modal: boolean;
}

/** What Tab can reach, minus the things that are present but unreachable. */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * How many frames to wait for a popup's content. `NodeContext.showPopup` attaches the popup's
 * component to its container one `requestAnimationFrame` after the container is shown, and React
 * renders it after that — so on the frame the container first mounts it is EMPTY. Polling a
 * bounded number of frames is the honest shape; a popup with nothing focusable keeps focus on
 * its own container, which is still inside the dialog.
 */
const CONTENT_FRAMES = 30;

let labelIds = 0;

function isFocusable(el: Element): el is HTMLElement {
  return (el as HTMLElement).focus !== undefined && el.matches(FOCUSABLE) && (el as HTMLElement).getClientRects().length > 0;
}

function focusQuietly(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false;
  el.focus({ preventScroll: true });
  return el.ownerDocument.activeElement === el;
}

export class PopupDialogLayer {
  private open: OpenPopup[] = [];
  /** Where focus should go once the next commit has removed a closed popup. */
  private pendingRestore: HTMLElement | null = null;
  private restorePending = false;
  /** The DOM of popups closed since the last commit — an opener inside one is not an opener. */
  private closing: Element[] = [];
  private lastClosedOpener: HTMLElement | null = null;

  /**
   * @param getContainer the viewer's own element: its element children that hold no popup are
   *        "the app", and are what goes `inert`. Measured rather than assumed — under `bodyScroll`
   *        the app sits in a wrapper beside the popup layer, and without it the app's root and the
   *        popups are siblings — and a popup layer INSIDE an inert element would be inert too
   *        (HLT-014 §6).
   */
  constructor(private readonly getContainer: () => Element | null) {}

  /**
   * The attributes the container renders with, merged into the group's `dom` props so they are
   * on the element from its very first render — before any child exists to be announced.
   */
  static semanticProps(accessibleName?: string): Record<string, unknown> {
    return {
      role: 'dialog',
      'aria-modal': 'true',
      tabIndex: -1,
      ...(accessibleName ? { 'aria-label': accessibleName } : {})
    };
  }

  /** The runtime showed `group`. Call before the state change that renders it. */
  shown(group: PopupGroupLike, options: { accessibleName?: string; modal?: boolean } = {}): void {
    const modal = options.modal !== false;
    if (!modal) {
      // Not a dialog: it takes no focus, so it leaves any pending restore alone as well.
      this.open.push({ group, opener: null, accessibleName: undefined, focused: true, modal });
      return;
    }
    if (group.props) {
      group.props.dom = { ...(group.props.dom || {}), ...PopupDialogLayer.semanticProps(options.accessibleName) };
    }
    this.open.push({
      group,
      opener: this.currentOpener(),
      accessibleName: options.accessibleName,
      focused: false,
      modal
    });
    // A popup that opens is where focus goes; a restore queued by a replace would take it back out.
    this.restorePending = false;
  }

  /** The runtime closed `group`, by any path. Call before the state change that removes it. */
  closed(group: PopupGroupLike): void {
    const index = this.open.findIndex((p) => p.group === group);
    if (index === -1) return;
    const [entry] = this.open.splice(index, 1);
    if (!entry.modal) return;
    const el = group.getDOMElement?.();
    if (el) this.closing.push(el);
    this.lastClosedOpener = entry.opener;
    this.pendingRestore = entry.opener;
    this.restorePending = true;
  }

  /** After every React commit that changed the popups. */
  afterRender(): void {
    this.applyInert();
    this.closing = [];

    if (this.restorePending) {
      this.restorePending = false;
      const top = this.topModal();
      const topEl = top?.group.getDOMElement?.() as HTMLElement | null | undefined;
      const target = this.pendingRestore;
      this.pendingRestore = null;
      // Never `body` by accident: the opener, else the popup now on top, else the app itself.
      if (!(target && target.isConnected && !target.closest('[inert]') && focusQuietly(target))) {
        if (!focusQuietly(topEl)) this.focusApp();
      }
    }

    for (const entry of this.open) {
      if (!entry.focused) this.settle(entry);
    }
    // Only a popup shown before this commit landed can inherit it; later, it would be stale.
    this.lastClosedOpener = null;
  }

  /** Remove every trace — the viewer is going away. */
  dispose(): void {
    this.open = [];
    this.applyInert();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private currentOpener(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const active = document.activeElement as HTMLElement | null;
    const usable =
      active &&
      active !== document.body &&
      active.isConnected &&
      !this.closing.some((el) => el.contains(active)) &&
      !this.isInsideClosedPopup(active);
    if (usable) return active;
    // A replace: the button that opened this popup lives in the popup it is replacing, so it is
    // about to leave the document. That popup was opened from somewhere real, and closing this
    // one should land there — HLT-014 AC5, the path most likely to be forgotten.
    return this.lastClosedOpener && this.lastClosedOpener.isConnected ? this.lastClosedOpener : null;
  }

  private isInsideClosedPopup(el: Element): boolean {
    const popup = el.closest('[role="dialog"][aria-modal="true"]');
    return !!popup && !this.open.some((p) => p.group.getDOMElement?.() === popup);
  }

  private topModal(): OpenPopup | undefined {
    for (let i = this.open.length - 1; i >= 0; i--) if (this.open[i].modal) return this.open[i];
    return undefined;
  }

  /**
   * Behind the top MODAL popup, everything is inert: the app, every dialog beneath it, and any
   * non-modal popup opened before it. A non-modal popup opened AFTER it (a toast over a dialog) stays
   * live — it is on top — and a non-modal popup on its own makes nothing inert at all.
   */
  private applyInert(): void {
    const container = this.getContainer();
    const top = this.topModal();
    const topIndex = top ? this.open.indexOf(top) : -1;
    const elements = this.open.map((p) => p.group.getDOMElement?.() ?? null);
    const popups = elements.filter((el): el is Element => !!el);
    if (container) {
      for (const child of Array.from(container.children)) {
        const holdsPopup = popups.some((p) => child === p || child.contains(p));
        // Under bodyScroll the popups share one wrapper; that wrapper must never go inert.
        const inert = !!top && !holdsPopup;
        if (inert) child.setAttribute('inert', '');
        else child.removeAttribute('inert');
      }
    }
    elements.forEach((el, i) => {
      if (!el) return;
      if (top && i < topIndex) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  /**
   * Move focus into `entry` and name it from its heading once its content has arrived. Bounded:
   * gives up after {@link CONTENT_FRAMES}, leaving focus on the container.
   */
  private settle(entry: OpenPopup, frame = 0): void {
    entry.focused = true;
    const el = entry.group.getDOMElement?.() as HTMLElement | null | undefined;
    if (!el) {
      if (frame < CONTENT_FRAMES) requestAnimationFrame(() => this.open.includes(entry) && this.settle(entry, frame + 1));
      return;
    }
    const doc = el.ownerDocument;
    // Focus in immediately — the container is inside the dialog, so Tab is contained from the
    // first frame even while the content is still arriving.
    if (!el.contains(doc.activeElement)) focusQuietly(el);

    const heading = el.querySelector('h1, h2, h3');
    if (!entry.accessibleName && heading && !el.hasAttribute('aria-labelledby')) {
      if (!heading.id) heading.id = `noodl-popup-title-${++labelIds}`;
      el.setAttribute('aria-labelledby', heading.id);
    }

    const first = Array.from(el.querySelectorAll(FOCUSABLE)).find(isFocusable);
    if (first) {
      // Only if the person has not already moved it somewhere inside.
      if (doc.activeElement === el) focusQuietly(first);
      return;
    }
    if (frame < CONTENT_FRAMES) {
      requestAnimationFrame(() => this.open.includes(entry) && this.settle(entry, frame + 1));
    }
  }

  private focusApp(): boolean {
    const container = this.getContainer() as HTMLElement | null;
    if (!container) return false;
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    return focusQuietly(container);
  }
}
