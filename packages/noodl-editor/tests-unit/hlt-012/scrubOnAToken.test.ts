/**
 * P99 HLT-012 §6 — a field holding a design token is not draggable.
 *
 * 🔴 **The landmine measured TRUE, and its failure is silent and destructive.** §6 asks what
 * `scrubPolicy` / `scrubCommit` do with a non-numeric value before offering one. They do this:
 * `numericPart('var(--space-3)')` is `undefined`, so `scrubStartValue` falls through to the port's
 * declared default and a gesture starts from *that*. One pixel of accidental drag on a padding
 * field replaces `var(--space-3)` with `1` — and the only thing that changes on screen is a number
 * the author was not looking at, in a field they had just picked a token for.
 *
 * ⚠️ **This is pre-existing** — the token could always be typed (REL-014) and the drag could
 * always overwrite it. What HLT-012 changes is the frequency: before it, a token in one of these
 * fields meant somebody knew the name and typed it; after it, it is one press away. So the guard
 * ships with the offer.
 *
 * The first `describe` is the calibration: it requires the **unguarded** behaviour to still be
 * there, because a guard asserted without it is a guard that passes on a field that was never
 * draggable in the first place ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 *
 * ⚠️ `NumberUnitInput` is mocked for **resolution, not behaviour** — the REL-014 precedent, and for
 * its reason: it reaches `PropertyPanelSelectInput`, which imports an `.svg` this runner has no
 * loader for. Nothing below renders anything; `isTokenReference` is a pure function that happens to
 * live in the same file as the row.
 */

jest.mock('../../src/editor/src/views/panels/propertyeditor/components/NumberUnitInput', () => ({
  NumberUnitInput: function NumberUnitInput() {
    return null;
  }
}));

// Mocked for resolution too: it imports `@noodl-contexts/NodeGraphContext`, an alias this runner
// does not map. Nothing below reaches any of these — the row classes are not instantiated here.
jest.mock('../../src/editor/src/views/panels/propertyeditor/utils', () => ({
  getEditType: (p: { type?: { editAsType?: unknown } }) => (p.type?.editAsType ? p.type.editAsType : p.type),
  getConnectionSourceLabel: () => undefined,
  getConnectionSourceNavigate: () => undefined
}));

import {
  scrubSpecForPortType,
  scrubStartValue
} from '../../src/editor/src/views/panels/propertyeditor/DataTypes/scrubPolicy';
import { isTokenReference } from '../../src/editor/src/views/panels/propertyeditor/DataTypes/NumberWithUnits';

/** A Padding port exactly as `node-shared-port-definitions.ts` declares one. */
const PADDING_TYPE = { name: 'number', units: ['px'], defaultUnit: 'px', marginPaddingComp: 'padding-top' };
/** A Font Size port — `numberWithUnits`, one unit, no comp. */
const FONT_SIZE_TYPE = { name: 'number', units: ['px'], defaultUnit: 'px' };

describe('HLT-012 calibration — the gesture these fields have, and what it does to a token', () => {
  it('a Font Size field IS draggable when it holds a number — otherwise this file grades nothing', () => {
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', {})).toEqual({ step: 1 });
  });

  it('🔴 a token has no magnitude in it, so a drag would start from the port default', () => {
    // The defect, stated as arithmetic. `16` is the declared default of a Font Size port; the
    // stored value is a token; the gesture starts at 16 and writes a number over the reference.
    expect(isTokenReference('var(--text-xl)')).toBe(true);
    expect(scrubStartValue('var(--text-xl)', 16)).toBe(16);
    // And with no declared default it is worse: the field snaps to zero.
    expect(scrubStartValue('var(--space-3)', undefined)).toBe(0);
  });
});

describe('HLT-012 — the guard', () => {
  it('🔴 refuses the gesture while the parameter is a token', () => {
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', { isToken: true })).toBeNull();
    expect(scrubSpecForPortType(PADDING_TYPE, 'px', { isToken: true })).toBeNull();
  });

  it('is a sibling of the two flags that already mean "not a magnitude right now"', () => {
    // Same answer, same reason: a connection drives the port, an expression produces the value,
    // a token references one. All three make the number on screen something a drag must not move.
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', { isConnected: true })).toBeNull();
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', { isExpressionMode: true })).toBeNull();
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', { isToken: true })).toBeNull();
  });

  it('gives the gesture straight back when the token is cleared', () => {
    // The flag is read per render from the stored parameter, so clearing the token restores the
    // drag without anything else happening. A guard that latched would be a second defect.
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', { isToken: false })).toEqual({ step: 1 });
    expect(scrubSpecForPortType(FONT_SIZE_TYPE, 'px', {})).toEqual({ step: 1 });
  });

  it('⚠️ `isTokenReference` is what decides it, and it is the same narrow matcher the field parses with', () => {
    // Deliberately narrow (REL-014): a half-typed `var(--space-4` is not a token, so a field
    // mid-edit stays draggable rather than freezing under the author's cursor.
    expect(isTokenReference('var(--space-4)')).toBe(true);
    expect(isTokenReference('var(--space-4, 16px)')).toBe(true);
    expect(isTokenReference('var(--space-4')).toBe(false);
    expect(isTokenReference('16px')).toBe(false);
    expect(isTokenReference(undefined)).toBe(false);
    expect(isTokenReference({ value: 16, unit: 'px' })).toBe(false);
  });
});
