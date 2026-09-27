/**
 * HLT-003 AC2 and AC4 — the duplicate key, fixed at the identity.
 *
 * The two collisions below are the ones actually present in
 * `<userData>/recently_opened_project.json` on 2026-09-21 (104 entries): one
 * `id` shared by two *different* projects, and one directory registered twice
 * under two different ids. They are reproduced verbatim because the task's AC2
 * and AC4 are about exactly this distinction:
 *
 * - AC2 — the fix must name what is unique per row, not suffix an index. Keying
 *   on the directory does that; keying on `${id}-${i}` would silence React and
 *   keep the bug.
 * - AC4 — a duplicate key "fixed" by dropping one of the two entries passes the
 *   count and loses a row. `tut001-drive` and `Puppy test 3` are different
 *   projects that happen to share an id, so **both must still render**. That is
 *   the first test here, and it is the one that would catch the lazy fix.
 */

import {
  dedupeProjectRowsByDirectory,
  projectRowKey
} from '../../src/editor/src/utils/recentProjectRows';

const DIR = '/Users/rich/vscode_projects/NodeGX test projects';

/** Two different projects, one shared id. The measured cause of the warning. */
const SHARED_ID = '692d3658-f11a-10db-e6c8-6b000f774898';
const collidingIds = [
  { id: SHARED_ID, name: 'tut001-drive', retainedProjectDirectory: `${DIR}/tut001-drive`, latestAccessed: 1755867052156 },
  { id: SHARED_ID, name: 'Puppy test 3', retainedProjectDirectory: `${DIR}/Puppy test 3`, latestAccessed: 1754919419636 }
];

/** One directory, two entries, two ids. Invisible to React, visible to a person. */
const collidingDirs = [
  { id: 'aaaa', name: 'TVW-004 s15 Drive', retainedProjectDirectory: `${DIR}/TVW-004 s15 Drive`, latestAccessed: 200 },
  { id: 'bbbb', name: 'TVW-004 s15 Drive', retainedProjectDirectory: `${DIR}/TVW-004 s15 Drive`, latestAccessed: 100 }
];

describe('two different projects that share a stored id', () => {
  it('both still appear — the row is not the id', () => {
    const rows = dedupeProjectRowsByDirectory(collidingIds);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(['tut001-drive', 'Puppy test 3']);
  });

  it('gets two distinct React keys, where the id gave one', () => {
    const rows = dedupeProjectRowsByDirectory(collidingIds);
    const keys = rows.map((r) => r.retainedProjectDirectory);

    expect(new Set(keys).size).toBe(2);
    // The defect, stated as the thing that was true before:
    expect(new Set(collidingIds.map((r) => r.id)).size).toBe(1);
  });
});

describe('one directory registered twice', () => {
  it('collapses to a single row', () => {
    const rows = dedupeProjectRowsByDirectory(collidingDirs);

    expect(rows).toHaveLength(1);
  });

  it('keeps the most recently opened entry, because the caller sorted', () => {
    const rows = dedupeProjectRowsByDirectory(collidingDirs);

    expect(rows[0].id).toBe('aaaa');
  });

  it('would have collided on the directory key had it not been deduplicated', () => {
    // 🔴 The reason this module and the key change are one fix, not two: this is
    // the warning the re-key would have introduced.
    const keys = collidingDirs.map((r) => r.retainedProjectDirectory);
    expect(new Set(keys).size).toBe(1);
  });
});

describe('the property the grid depends on', () => {
  it('leaves every directory key unique across both collisions together', () => {
    const rows = dedupeProjectRowsByDirectory([...collidingIds, ...collidingDirs]);
    const keys = rows.map((r) => r.retainedProjectDirectory);

    expect(keys).toHaveLength(new Set(keys).size);
    expect(rows).toHaveLength(3);
  });

  it('preserves the order it was given', () => {
    const rows = dedupeProjectRowsByDirectory([
      { retainedProjectDirectory: '/a' },
      { retainedProjectDirectory: '/b' },
      { retainedProjectDirectory: '/a' },
      { retainedProjectDirectory: '/c' }
    ]);

    expect(rows.map((r) => r.retainedProjectDirectory)).toEqual(['/a', '/b', '/c']);
  });

  it('treats a trailing separator as the same directory', () => {
    expect(projectRowKey('/a/b/')).toBe(projectRowKey('/a/b'));
    expect(dedupeProjectRowsByDirectory([{ retainedProjectDirectory: '/a/b' }, { retainedProjectDirectory: '/a/b/' }])).toHaveLength(1);
  });

  it('does not fold case, because two such directories can both exist', () => {
    expect(dedupeProjectRowsByDirectory([{ retainedProjectDirectory: '/a/B' }, { retainedProjectDirectory: '/a/b' }])).toHaveLength(2);
  });

  it('drops an entry with no directory, so the key is never empty', () => {
    const rows = dedupeProjectRowsByDirectory([
      { retainedProjectDirectory: '' },
      { retainedProjectDirectory: undefined as unknown as string },
      { retainedProjectDirectory: '/a' }
    ]);

    expect(rows.map((r) => r.retainedProjectDirectory)).toEqual(['/a']);
  });
});
