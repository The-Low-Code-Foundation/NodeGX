/**
 * P94 STY-003 — the decision behind "clear AF".
 *
 * Grades `models/Looks/fieldState.ts`: which of the design's states a field is in (AC2/AC3), and the
 * Look menu's three sections in §4's order (AC6).
 *
 * 🔴 **The sharp case is the one where the two values agree.** The whole defect this surface exists
 * to remove is that a person cannot tell a borrowed value from an owned one, and the two are most
 * confusable when they read the same. So the first test below is the pair that would pass any
 * implementation written as "highlight it if it differs".
 */
import {
  buildLookMenu,
  overrideCount,
  readField,
  styledFieldNames,
  treatmentOf
} from '../../src/editor/src/models/Looks/fieldState';

const PRIMARY = {
  name: 'Primary Button',
  parameters: { backgroundColor: 'var(--primary)', borderRadius: 'var(--radius-md)', fontSize: '18px' }
};

describe('STY-003 AC2/AC3 — where a field’s value came from', () => {
  it('🔴 an override that holds the SAME value as the Look is still an override', () => {
    const node = { parameters: { fontSize: '18px' } };
    const reading = readField(node, PRIMARY, 'fontSize');
    expect(reading.source).toBe('overridden');
    expect(reading.matchesLook).toBe(true);
    // Reported, never used to hide it: edit the Look and this field will not follow.
    expect(treatmentOf(reading.source)).toBe('overridden');
  });

  it('the control: the identical field with nothing of its own is linked, not overridden', () => {
    const reading = readField({ parameters: {} }, PRIMARY, 'fontSize');
    expect(reading.source).toBe('linked');
    expect(reading.lookName).toBe('Primary Button');
    expect(reading.lookValue).toBe('18px');
    expect(reading.ownValue).toBeUndefined();
  });

  it('an override says what the Look wanted, which is what a revert needs (rule 3)', () => {
    const reading = readField({ parameters: { borderRadius: '24px' } }, PRIMARY, 'borderRadius');
    expect(reading).toEqual({
      source: 'overridden',
      lookName: 'Primary Button',
      lookValue: 'var(--radius-md)',
      ownValue: '24px',
      matchesLook: false
    });
  });

  it('a field the Look says nothing about is the node’s own, and names no Look', () => {
    const reading = readField({ parameters: { letterSpacing: '0.1em' } }, PRIMARY, 'letterSpacing');
    expect(reading.source).toBe('own');
    expect(reading.lookName).toBeUndefined();
  });

  it('a field nobody sets is `default`, which is a different fact from `own`', () => {
    expect(readField({ parameters: {} }, PRIMARY, 'letterSpacing').source).toBe('default');
    // …and both are drawn plainly, which is why the design calls it three states.
    expect(treatmentOf('own')).toBe('plain');
    expect(treatmentOf('default')).toBe('plain');
  });

  it('a node wearing no Look has no linked field anywhere — the absence IS the signal (§3.2)', () => {
    const node = { parameters: { backgroundColor: 'var(--destructive)', fontSize: '16px' } };
    for (const name of ['backgroundColor', 'fontSize']) {
      expect(readField(node, undefined, name).source).toBe('own');
    }
    expect(readField(node, undefined, 'borderRadius').source).toBe('default');
    expect(overrideCount(node, undefined)).toBe(0);
  });

  it('an explicit `undefined` is not ownership — that is how a revert leaves a field', () => {
    // Deleting a parameter and setting it to `undefined` must read the same, or a reverted field
    // would keep drawing as an override for the rest of the session.
    expect(readField({ parameters: { fontSize: undefined } }, PRIMARY, 'fontSize').source).toBe('linked');
  });

  it('a structural value (a colour object) compares by shape, not by reference', () => {
    const look = { name: 'L', parameters: { backgroundColor: { r: 1, g: 0, b: 0 } } };
    const same = readField({ parameters: { backgroundColor: { r: 1, g: 0, b: 0 } } }, look, 'backgroundColor');
    const different = readField({ parameters: { backgroundColor: { r: 0, g: 1, b: 0 } } }, look, 'backgroundColor');
    expect(same.matchesLook).toBe(true);
    expect(different.matchesLook).toBe(false);
    // both are still overrides
    expect([same.source, different.source]).toEqual(['overridden', 'overridden']);
  });

  it('the styled section lists the union, so an overridden field is not dropped from it', () => {
    const node = { parameters: { borderRadius: '24px', letterSpacing: '0.1em' } };
    expect(styledFieldNames(node, PRIMARY)).toEqual([
      'backgroundColor',
      'borderRadius',
      'fontSize',
      'letterSpacing'
    ]);
  });

  it('counts the overrides the header can mention', () => {
    expect(overrideCount({ parameters: { borderRadius: '24px', fontSize: '11px' } }, PRIMARY)).toBe(2);
    expect(overrideCount({ parameters: { letterSpacing: '0.1em' } }, PRIMARY)).toBe(0);
  });
});

describe('STY-003 AC6 — the Look menu', () => {
  const projectLooks = [
    { name: 'Primary Button', typename: 'net.noodl.controls.button' },
    { name: 'Ghost Button', typename: 'net.noodl.controls.button' },
    { name: 'Heading 1', typename: 'Text' }
  ];
  const shippedLooks = [
    { name: 'Primary', shippedFrom: 'primary' },
    { name: 'Ghost Button', shippedFrom: 'ghost' },
    { name: 'Outline', shippedFrom: 'outline' }
  ];

  it('offers this project’s Looks for this node type, with wearer counts, current one marked', () => {
    const menu = buildLookMenu({
      projectLooks,
      shippedLooks,
      typename: 'net.noodl.controls.button',
      currentLookName: 'Primary Button',
      wearerCounts: { 'Primary Button': 26, 'Ghost Button': 4 },
      typeLabel: 'button'
    });
    expect(menu.inThisProject).toEqual([
      { name: 'Ghost Button', wearers: 4 },
      { name: 'Primary Button', wearers: 26, current: true }
    ]);
    expect(menu.none).toBe(false);
  });

  it('🔴 does not offer a library Look the project already holds by that name (rule 4)', () => {
    const menu = buildLookMenu({
      projectLooks,
      shippedLooks,
      typename: 'net.noodl.controls.button',
      typeLabel: 'button'
    });
    // `Ghost Button` is in the project already — after the first use they are the same thing, and
    // offering both rows would be the two-systems problem coming back.
    expect(menu.fromLibrary.map((l) => l.name)).toEqual(['Primary', 'Outline']);
    expect(menu.fromLibrary[0].shippedFrom).toBe('primary');
  });

  it('a Look for another node type is not offered — identity is name AND type', () => {
    const menu = buildLookMenu({ projectLooks, shippedLooks: [], typename: 'Text', typeLabel: 'text' });
    expect(menu.inThisProject.map((l) => l.name)).toEqual(['Heading 1']);
  });

  it('names the save row after the thing in front of the person', () => {
    expect(
      buildLookMenu({ projectLooks: [], shippedLooks: [], typename: 'x', typeLabel: 'button' }).saveAsNewLabel
    ).toBe("Save this button's styles as a new Look…");
    expect(buildLookMenu({ projectLooks: [], shippedLooks: [], typename: 'x' }).saveAsNewLabel).toBe(
      "Save this node's styles as a new Look…"
    );
  });

  it('a node wearing nothing reports `none`, and a project with no Looks still offers the library', () => {
    const menu = buildLookMenu({
      projectLooks: [],
      shippedLooks,
      typename: 'net.noodl.controls.button',
      typeLabel: 'button'
    });
    expect(menu.none).toBe(true);
    expect(menu.inThisProject).toEqual([]);
    expect(menu.fromLibrary).toHaveLength(3);
  });

  it('a Look nothing wears reports 0 rather than nothing', () => {
    const menu = buildLookMenu({
      projectLooks: [{ name: 'Unworn', typename: 'Text' }],
      shippedLooks: [],
      typename: 'Text'
    });
    expect(menu.inThisProject).toEqual([{ name: 'Unworn', wearers: 0 }]);
  });
});
