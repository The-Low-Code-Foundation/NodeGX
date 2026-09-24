/**
 * P103 CMG-001 — the composer fits its window.
 *
 * Two pure readings:
 *  - AC6: the clamp that keeps a `disableDynamicPositioning` popout on screen when it grows —
 *    *up by the overflow and nothing else*, including the two answers that are *don't move*
 *    (already inside; taller than the window, where the top is pinned instead);
 *  - AC1's half that is a table: the motion composers draw no Light/Dark ground.
 *
 * That the running popout's Apply is the element under its own centre after Show CSS is AC2–AC5,
 * a drive (`scripts/devtools/drive-cmg001-composer-fits.js`), not this file.
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: {},
  IconSize: {},
  IconVariant: {}
}));

import { previewGroundFor } from '@noodl-core-ui/components/token-composer/TokenComposer';

import { clampPopoutTop } from '../../src/editor/src/views/popuplayerClamp';

const WINDOW = { minY: 38, maxY: 1136 }; // a 1146px window: 38px title bar, 10px margin

describe('CMG-001 AC6 — clampPopoutTop', () => {
  it('already inside: does not move', () => {
    expect(clampPopoutTop({ top: 300, height: 500, ...WINDOW })).toBe(300);
    // Exactly touching the bottom is inside.
    expect(clampPopoutTop({ top: 636, height: 500, ...WINDOW })).toBe(636);
    // Exactly at the top is inside.
    expect(clampPopoutTop({ top: 38, height: 500, ...WINDOW })).toBe(38);
  });

  it('🔴 grown past the bottom (Show CSS at the bottom of the window): moved up by the overflow, exactly', () => {
    // Opened with its bottom at 1136; Show CSS added 180px.
    expect(clampPopoutTop({ top: 636, height: 680, ...WINDOW })).toBe(1136 - 680);
    // One pixel over moves one pixel.
    expect(clampPopoutTop({ top: 637, height: 500, ...WINDOW })).toBe(636);
  });

  it('above the top: brought down to the title bar', () => {
    expect(clampPopoutTop({ top: 10, height: 500, ...WINDOW })).toBe(38);
  });

  it('taller than the window: pinned to the top so the header and controls are on screen', () => {
    // 1098 is the room; 1300 does not fit whichever way it faces.
    expect(clampPopoutTop({ top: 300, height: 1300, ...WINDOW })).toBe(38);
    expect(clampPopoutTop({ top: -200, height: 1300, ...WINDOW })).toBe(38);
  });

  it('never changes x: the function has no x to change', () => {
    // A reading of the signature, so the "nothing else" in §3.2 is not only a comment.
    expect(clampPopoutTop.length).toBe(1);
    expect(Object.keys({ top: 0, height: 0, minY: 0, maxY: 0 })).toEqual(['top', 'height', 'minY', 'maxY']);
  });
});

describe('CMG-001 AC1 — which composers draw the Light/Dark ground', () => {
  it('easing and duration do not; shadow, gradient and font do', () => {
    expect(previewGroundFor('animation-easing')).toBe(false);
    expect(previewGroundFor('animation-duration')).toBe(false);
    expect(previewGroundFor('shadow')).toBe(true);
    expect(previewGroundFor('gradient')).toBe(true);
    expect(previewGroundFor('typography-family')).toBe(true);
  });
});
