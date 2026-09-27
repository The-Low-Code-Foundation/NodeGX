/**
 * HLT-001 — the deferred React root teardown.
 *
 * The defect this grades: `root.unmount()` called while React is inside a render writes
 *
 *   "Attempted to synchronously unmount a root while React was already rendering…"
 *
 * to the console as an **error**, 132 times in a 42-minute editor session. The fix is
 * `unmountReactRoot`, and there are two ways to fake passing it, so both are asserted against:
 *
 *  - 🔴 **silence the warning and leave the root mounted.** §"the control" asserts the container's
 *    DOM is actually empty afterwards, not merely that React stopped complaining
 *    ([[verify-the-consequence-not-just-the-mechanism]]). A `try/catch`, a console filter, or a
 *    helper that simply dropped the call would pass the first spec and fail these;
 *  - 🔴 **never unmount at all.** §"the consequence" mounts a real root, tears it down from inside
 *    another root's render phase — the exact shape the editor produces — and asserts both that
 *    React said nothing AND that the tree went away.
 *
 * The mutant that removes the `setTimeout` is red on "does not unmount synchronously" and on
 * "says nothing when torn down from inside a render".
 */

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';

import { createReactRoot, unmountReactRoot } from '../../src/shared/utils/unmountReactRoot';

/** The macrotask the helper defers onto. One turn is enough; it uses `setTimeout(…, 0)`. */
function afterDeferral(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** A container attached to the document, torn down by the caller. */
function container(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function mounted(el: HTMLElement, text = 'hello'): Root {
  const root = createRoot(el);
  flushSync(() => root.render(React.createElement('span', null, text)));
  return root;
}

describe('HLT-001 unmountReactRoot', () => {
  const containers: HTMLElement[] = [];

  function track(el: HTMLElement) {
    containers.push(el);
    return el;
  }

  afterEach(() => {
    while (containers.length) {
      const el = containers.pop();
      if (el && el.parentElement) el.parentElement.removeChild(el);
    }
  });

  it('does not unmount synchronously', () => {
    const el = track(container());
    const root = mounted(el);
    expect(el.textContent).toBe('hello');

    unmountReactRoot(root);

    // 🔴 The whole point. A synchronous unmount here is the defect, so the tree MUST still be
    // there on the line after the call. This is the assertion the mutant fails.
    expect(el.textContent).toBe('hello');
  });

  it('the control — the unmount really happens', async () => {
    const el = track(container());
    const root = mounted(el);

    unmountReactRoot(root);
    await afterDeferral();

    expect(el.textContent).toBe('');
    expect(el.childNodes.length).toBe(0);
  });

  it('says nothing when a root is torn down from inside another root‘s render', async () => {
    const victimEl = track(container());
    const victim = mounted(victimEl, 'victim');

    const rendererEl = track(container());
    const renderer = createRoot(rendererEl);

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };

    try {
      // Calling from a component body puts the call inside React's render phase — which is where
      // every editor teardown path actually runs: an effect cleanup, a popup `onClose`, or a
      // dispose triggered by an event React is still inside.
      const TearsDownTheOtherRoot = () => {
        unmountReactRoot(victim);
        return React.createElement('span', null, 'renderer');
      };
      flushSync(() => renderer.render(React.createElement(TearsDownTheOtherRoot)));
      await afterDeferral();
    } finally {
      console.error = originalError;
    }

    expect(errors.filter((line) => line.includes('synchronously unmount')).length).toBe(0);
    // …and it still went away. Silence alone is not the deliverable.
    expect(victimEl.textContent).toBe('');

    unmountReactRoot(renderer);
    await afterDeferral();
  });

  it('tolerates being handed the same root twice', async () => {
    const el = track(container());
    const root = mounted(el);

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };

    try {
      unmountReactRoot(root);
      unmountReactRoot(root);
      await afterDeferral();
    } finally {
      console.error = originalError;
    }

    expect(el.textContent).toBe('');
    expect(errors.length).toBe(0);
  });

  it('tolerates a container that was detached before the deferral ran', async () => {
    const el = container();
    const root = mounted(el);

    unmountReactRoot(root);
    // The world moves on between the call and the timer: the project closed, the panel was
    // rebuilt, the popup layer emptied itself. This is HLT-002's defect shape and must not
    // become HLT-001's.
    el.parentElement.removeChild(el);

    await afterDeferral();

    expect(el.childNodes.length).toBe(0);
  });

  /**
   * 🔴 The hazard the deferral CREATES, and the half that answers it.
   *
   * Measured on the drive before this existed: two events per run of React's
   * "You are calling ReactDOMClient.createRoot() on a container that has already
   * been passed to createRoot()", with the stack naming `CommentLayer._renderReact`
   * recreating both of its roots on the same two divs it had just torn down.
   * Deferring opens that window; `createReactRoot` closes it by flushing the
   * pending unmount before the container is claimed again.
   *
   * ⚠️ The control is the SECOND assertion: it is not enough that React stayed
   * quiet — the new root's content has to survive, because the failure mode is a
   * pending unmount emptying the container the new root just filled.
   */
  it('a container re-claimed before the deferral runs keeps the NEW root', async () => {
    const el = track(container());

    const first = createReactRoot(el);
    flushSync(() => first.render(React.createElement('span', null, 'first')));
    expect(el.textContent).toBe('first');

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };

    let second: ReturnType<typeof createReactRoot>;
    try {
      unmountReactRoot(first);
      // Same tick, same element — the shape the drive caught in the comment layer.
      second = createReactRoot(el);
      flushSync(() => second.render(React.createElement('span', null, 'second')));
      await afterDeferral();
    } finally {
      console.error = originalError;
    }

    expect(errors.filter((line) => line.includes('already been passed to createRoot')).length).toBe(0);
    // The control: the pending unmount must not have emptied what the new root drew.
    expect(el.textContent).toBe('second');

    unmountReactRoot(second);
    await afterDeferral();
  });

  it('ignores null and undefined', () => {
    expect(() => unmountReactRoot(null)).not.toThrow();
    expect(() => unmountReactRoot(undefined)).not.toThrow();
  });
});
