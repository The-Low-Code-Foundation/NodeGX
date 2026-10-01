/**
 * Screen Resolution — read from `packages/noodl-viewer-react/src/nodes/std-library/screenresolution.ts`
 * on 2026-10-01 (NSP-013 s13).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: with NO window (a server render — world.ts VIEWPORT, a play with
 * no viewport) the node does nothing at all (:21): Width and Height are never set, so nothing is sent
 * on them, and Aspect Ratio reads `undefined / undefined` — NaN, which IS a value (:68). With a window
 * it subscribes to `resize` and reads `innerWidth` / `innerHeight` at once (:30-38, :73-77), and again
 * at every resize; each read flags all three outputs (:76). Aspect Ratio is Width / Height, so a
 * window of height 0 is Infinity and of 0 × 0 is NaN (:67-69). No inputs.
 */

import { defineNode } from '../spec';

type State = {
  width: number | undefined;
  height: number | undefined;
}

export const ScreenResolution = defineNode({
  type: 'Screen Resolution',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/screenresolution.ts',
  needs: ['viewport'],
  worldPool: { advances: [1, 99, 100, 101, 1000, 30000] },

  state: { width: undefined, height: undefined } as State,
  // :40-42
  inspect: (s) => s.width + ' x ' + s.height,

  // :19-39 initialize — no window: nothing (:21); a window: subscribe (:30-36), then read (:38)
  init: (world) => {
    const v = world.viewport();
    if (!v) return {};
    world.listen('resize');
    return { width: v.width, height: v.height };
  },

  inputs: {},

  outputs: {
    // :44-52
    width: { type: 'number', from: (s) => s.width, displayName: 'Width', group: 'Values', description: 'Width of the browser viewport, in pixels' },
    // :53-61
    height: { type: 'number', from: (s) => s.height, displayName: 'Height', group: 'Values', description: 'Height of the browser viewport, in pixels' },
    // :62-70 — `width / height`, read even when neither was ever set
    aspectRatio: {
      type: 'number',
      from: (s) => (s.width as number) / (s.height as number),
      displayName: 'Aspect Ratio',
      group: 'Values',
      description: 'Width divided by Height, so anything wider than it is tall is greater than one'
    }
  }
}).on(
  {},
  {
    world: {
      // :30-32 → :73-77 `_viewportSizeChanged`: read the window, flag every output
      resize: (_s, _i, w) => {
        const v = w.viewport()!;
        return { set: { width: v.width, height: v.height }, send: ['width', 'height', 'aspectRatio'] };
      }
    }
  }
);
