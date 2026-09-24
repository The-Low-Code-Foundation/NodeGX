/**
 * P103 CMG-006 — the editor's own write of a project-level file reads back as "unchanged".
 *
 * Found by the Look editor's drive: a field changed in a Look could be undone at 1.5 s and not at
 * 3 s. The autosave wrote `nodegx.styles.json`; the watcher read it back; `hashProjectLevel` of
 * the object we had built (with `stateParameters: undefined` on a Look) did not equal the hash of
 * the file (where `JSON.stringify` had dropped that key), so the decision was `reload`, the Look
 * objects were replaced from disk, and the undo closure wrote to the old one.
 *
 * Both readings here are pure: the hash, and the decision made from it.
 */
import { decideProjectLevelReload, hashProjectLevel } from '../../src/editor/src/services/ProjectStructure/projectLevel';

/** What a watcher reads back after `writeFileAtomic(JSON.stringify(content))`. */
const asOnDisk = (content: unknown) => JSON.parse(JSON.stringify(content));

describe('CMG-006 — hashProjectLevel hashes what the disk will hold', () => {
  const builtStyles = {
    $schema: 'x',
    variants: [{ name: 'Card', typename: 'Group', parameters: { opacity: 0.42 }, stateParameters: undefined, conflicts: undefined }],
    modified: '2026-09-24T14:00:00.000Z'
  };

  it('🔴 an undefined-valued key in the built object hashes the same as its absence on disk', () => {
    expect(hashProjectLevel(builtStyles)).toBe(hashProjectLevel(asOnDisk(builtStyles)));
  });

  it('still ignores `modified`, and still tells two different files apart', () => {
    expect(hashProjectLevel({ ...builtStyles, modified: 'other' })).toBe(hashProjectLevel(builtStyles));
    const changed = { ...builtStyles, variants: [{ ...builtStyles.variants[0], parameters: { opacity: 1 } }] };
    expect(hashProjectLevel(changed)).not.toBe(hashProjectLevel(builtStyles));
  });

  it('the control: without the round trip these two WOULD differ (the defect this pins)', () => {
    // `stableStringify` renders an undefined value as the word `undefined`; the disk has no key.
    const withKey = JSON.stringify({ a: undefined, b: 1 }, (_k, v) => (v === undefined ? 'undefined' : v));
    expect(withKey).toContain('undefined');
    expect(JSON.stringify(asOnDisk({ a: undefined, b: 1 }))).toBe('{"b":1}');
  });

  it('🔴 the decision after our own write is skip-unchanged, so the Look objects stay', () => {
    const baseline = hashProjectLevel(builtStyles); // recorded by saveProjectLevelFiles at the write
    const decision = decideProjectLevelReload({
      diskBaselineHash: baseline,
      diskHash: hashProjectLevel(asOnDisk(builtStyles)), // the watcher's read of the same write
      dirty: false
    });
    expect(decision).toEqual({ action: 'skip-unchanged' });
  });

  it('a real external change still reloads', () => {
    const decision = decideProjectLevelReload({
      diskBaselineHash: hashProjectLevel(builtStyles),
      diskHash: hashProjectLevel({ ...asOnDisk(builtStyles), variants: [] }),
      dirty: false
    });
    expect(decision).toEqual({ action: 'reload' });
  });
});
