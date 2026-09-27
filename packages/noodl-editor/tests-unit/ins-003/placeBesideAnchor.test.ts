/**
 * INS-003 — a `showPopup` popup flips away from the window edge instead of being clamped over its
 * own anchor.
 *
 * Measured on the drive (2026-09-23), before the fix: the Page Router's *Add new page* button in the
 * inspector at x 1095–1329 of a 1368px window, the popup asking for `right` — and landing at
 * x 1136–1366, on top of the button, arrow class `left`. `showPopout` has flipped for a long time;
 * `showPopup` only clamped.
 */

import { placeBesideAnchor } from '../../src/editor/src/views/PopupLayer/placeBesideAnchor';

/** The drive's own geometry: window, anchor and the popup's measured size. */
const drive = {
  anchor: { left: 1095, top: 419, width: 234, height: 33 },
  width: 230,
  height: 400,
  arrowSize: 10,
  viewport: { width: 1368, height: 784 },
  margin: 2
};

const overlaps = (x: number, w: number, a: { left: number; width: number }) => x < a.left + a.width && x + w > a.left;

describe('INS-003 — showPopup placement', () => {
  it('the Add new page popup, asked for on the right at the window edge, opens on the LEFT of its button', () => {
    const placed = placeBesideAnchor({ ...drive, position: 'right' });

    expect(placed.position).toBe('left');
    expect(placed.x + drive.width).toBeLessThanOrEqual(drive.anchor.left);
    expect(overlaps(placed.x, drive.width, drive.anchor)).toBe(false);
  });

  it('a popup with room on the side it asked for stays there — the control', () => {
    // The same button, as it sat in the LEFT panel before P101: plenty of window to its right.
    const placed = placeBesideAnchor({ ...drive, position: 'right', anchor: { ...drive.anchor, left: 60 } });

    expect(placed.position).toBe('right');
    expect(placed.x).toBe(60 + 234 + 10);
  });

  it('does not flip when the other side is worse — it clamps, as before', () => {
    // Near the LEFT edge, a 1100px popup asked for on the right overflows by 78px; flipped left it
    // would overflow by ~1012px. Flipping only when the other side is genuinely better is the rule
    // `_positionPopout` already uses — so this one stays right and is clamped.
    const placed = placeBesideAnchor({
      ...drive,
      position: 'right',
      width: 1100,
      anchor: { ...drive.anchor, left: 100 }
    });

    expect(placed.position).toBe('right');
    expect(placed.x).toBe(drive.viewport.width - drive.margin - 1100);
  });

  it('flips vertically too — a bottom popup at the foot of the window opens upward', () => {
    const placed = placeBesideAnchor({
      ...drive,
      position: 'bottom',
      anchor: { left: 400, top: 740, width: 100, height: 30 }
    });

    expect(placed.position).toBe('top');
    expect(placed.y + drive.height).toBeLessThanOrEqual(740);
  });
});
