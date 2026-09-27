import { createRoot, type Root } from 'react-dom/client';

/**
 * HLT-001 — the one place a React root is torn down.
 *
 * 🔴 **Why this exists, so nobody "simplifies" it back to `root.unmount()`.**
 * React 19 writes this to the console, as an *error*, when `unmount()` is
 * called while React is inside a render or commit:
 *
 * > Attempted to synchronously unmount a root while React was already
 * > rendering. React cannot finish unmounting the root until the current
 * > render has completed, which may lead to a race condition.
 *
 * It fired **132 times in a 42-minute editor session** (2026-09-20, phase 99
 * §3) — the single largest source of noise in the renderer log — in three
 * bursts of 44, i.e. one user action tearing down 44 roots at once. Every
 * editor teardown path runs from inside a React effect, an event handler React
 * is still inside, or a popup's `onClose`, so "call unmount at teardown" is
 * always "call unmount during a render" here.
 *
 * Deferring to a macrotask is the standard escape, and it was already written
 * — once, at `views/popuplayer.ts`, with no comment saying why, which is
 * exactly why the other sixty-odd sites never got it. This module is that
 * decision written down once. See
 * `dev-docs/tasks/phase-99-the-ones-nobody-owned/HLT-001-THE-SYNCHRONOUS-UNMOUNT.md`.
 *
 * ⚠️ **`queueMicrotask` and not `setTimeout(…, 0)`, and this was measured both
 * ways.** Either escapes the render — a microtask runs on an empty stack, so
 * React is never mid-render when it fires, and both read **0** on the drive. But
 * the macrotask version also produced **8 `removeChild` NotFoundError**s per run,
 * because a whole task's worth of the editor gets to empty the container before
 * the timer fires and React then commits its deletions against nodes that have
 * gone. The microtask closes that window: same 0, and 0 of those.
 *
 * ⚠️ **The deferral is not free: by the time it runs, the world has moved.**
 * Two consequences, both handled:
 *  - the same root may be handed here twice (a dispose path that runs on both
 *    close and destroy). The second call is dropped, so React never sees the
 *    double-unmount it warns about;
 *  - the container may already be detached from the document. That is fine —
 *    React unmounts a detached container without complaint, and a spec proves
 *    it (`tests/utils/hlt-001-deferred-unmount.spec.ts`).
 *
 * 🔴 **Reusing the container is the hazard deferral creates, and `createReactRoot`
 * is the half that answers it.** A caller that unmounts a root and then calls
 * `createRoot()` on the *same element* before the deferral runs gets two roots on
 * one container: React says *"You are calling ReactDOMClient.createRoot() on a
 * container that has already been passed to createRoot()"*, and the pending
 * unmount then empties what the new root just drew.
 *
 * This is not hypothetical — it was measured on the drive, twice per run, and the
 * stack named `CommentLayer._renderReact` recreating both of its roots on the same
 * two divs. So any site whose container is a long-lived field must create through
 * `createReactRoot`, which flushes a pending unmount on that container first.
 * Sites that build a fresh `div` per showing cannot collide and need nothing.
 *
 * ⚠️ This defers a real unmount — it does not suppress the warning. There is no
 * try/catch and no console filter here on purpose: the teardown still happens,
 * and a spec asserts the container's DOM is empty afterwards. A fix that only
 * silenced the message would read as green and leave the leak
 * (see `verify-the-consequence-not-just-the-mechanism`).
 */

/**
 * Roots handed here with an unmount still in flight — both the double-call guard
 * and the flag `createReactRoot` clears when it takes one back.
 */
const pendingUnmounts = new WeakSet<Root>();

/** The container each `createReactRoot` root was mounted into. */
const containerOfRoot = new WeakMap<Root, Element>();

/** Containers with an unmount still pending, so a new root can reclaim it. */
const pendingByContainer = new WeakMap<Element, Root>();

/**
 * Create a React root that knows its container, so a later teardown can be
 * reconciled with whoever claims that container next.
 *
 * Use this wherever the container is a long-lived field (`this.el`, `this.div`,
 * a panel's mount point) — that is the only shape that can collide. A container
 * created fresh inside the same function can use `createRoot` directly.
 *
 * 🔴 **When an unmount is still pending on the container, the pending root is
 * RECLAIMED and returned rather than replaced.** The caller wants a React root on
 * this element and there already is one; handing back a second would be the
 * defect. Two cheaper-looking answers were built first and both were measured
 * wrong on the drive:
 *
 *  - *create anyway* — React writes "You are calling ReactDOMClient.createRoot()
 *    on a container that has already been passed to createRoot()", twice per run,
 *    and the pending unmount then empties what the new root drew;
 *  - *flush the pending unmount synchronously first* — that unmount is itself
 *    sometimes inside a React render, so it reintroduced the very error this
 *    module exists to remove: **2 events** on the next drive, down from 132 but
 *    not the zero the bar asks for.
 *
 * Reclaiming keeps the root's tree mounted and lets the caller's next `render()`
 * reconcile it, which is what every collision site here already documents itself
 * as wanting ("Create roots only once, reuse for subsequent renders").
 */
export function createReactRoot(container: HTMLElement): Root {
  const pending = pendingByContainer.get(container);
  if (pending) {
    pendingByContainer.delete(container);
    // Clear the in-flight flag: the root is live again, and a LATER teardown of
    // it must not be silently dropped as a repeat call.
    pendingUnmounts.delete(pending);
    return pending;
  }

  const root = createRoot(container);
  containerOfRoot.set(root, container);
  return root;
}

/**
 * Unmount a React root safely from inside a render, an effect or an event
 * handler. Tolerates `null`/`undefined` and repeat calls.
 *
 * The unmount is asynchronous: callers that need to observe the emptied
 * container must wait a microtask (a `setTimeout(…, 0)` covers it too).
 */
export function unmountReactRoot(root: Root | null | undefined): void {
  if (!root || pendingUnmounts.has(root)) return;

  pendingUnmounts.add(root);

  const container = containerOfRoot.get(root);
  if (container) pendingByContainer.set(container, root);

  queueMicrotask(() => {
    // `createReactRoot` may have taken this root back to serve a fresh claim on
    // the same container. Unmounting it now would tear down a live tree.
    if (!pendingUnmounts.has(root)) return;
    if (container) pendingByContainer.delete(container);
    root.unmount();
  });
}
