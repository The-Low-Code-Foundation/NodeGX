/**
 * HLT-011 — addressing a launcher row, and the collision the editor must not resolve silently.
 *
 * ## The fixture is the real one
 *
 * The two colliding rows below are the ones in `<userData>/recently_opened_project.json` on
 * 2026-09-21 (106 entries): `tut001-drive` and `Puppy test 3`, different directories, one
 * `id`. HLT-003 reproduced them for the React key; this file reproduces them for the two
 * properties that key fix deliberately left open — *which project a click opens*, and *whether
 * anything tells the person their two projects share an identity*.
 *
 * ## 🔴 The first `describe` is a CALIBRATION and it must keep failing the old way
 *
 * A spec that only asserts `findRowByDirectory` returns the right row would pass just as
 * happily against a fixture with no collision in it — it would grade the lookup while proving
 * nothing about the defect. So the old rule (`rows.find((r) => r.id === id)`) is written out
 * here and required to MISROUTE on this fixture. If it ever stops misrouting, the fixture has
 * drifted away from the measurement and every assertion below it is about nothing
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 *
 * ## What is NOT graded here, and where it is
 *
 * jsdom has no launcher and this runner cannot import `LocalProjectsModel` (it reaches
 * `electron-store` at construction). The consequence — a click on the second of two colliding
 * cards opening the second project — is graded by `scripts/devtools/drive-hlt011-identity.js`
 * against the running editor, control and fixed. These specs grade the rule that click now
 * uses, on the data that broke it.
 */

import {
  dedupeProjectRowsByDirectory,
  findDurableIdCollisions,
  findRowByDirectory,
  projectRowKey
} from '../../src/editor/src/utils/recentProjectRows';

const DIR = '/Users/rich/vscode_projects/NodeGX test projects';

/** Measured 2026-09-21. `backend_msjck0y2ukxwv` ("Puppy test 3 backend") carries this id. */
const SHARED_ID = '692d3658-f11a-10db-e6c8-6b000f774898';

const rows = [
  {
    id: SHARED_ID,
    name: 'tut001-drive',
    retainedProjectDirectory: `${DIR}/tut001-drive`,
    latestAccessed: 1755867052156
  },
  {
    id: SHARED_ID,
    name: 'Puppy test 3',
    retainedProjectDirectory: `${DIR}/Puppy test 3`,
    latestAccessed: 1754919419636
  },
  {
    id: 'f998c98e-3e07-fb1c-c578-6befe03dfaf0',
    name: 'cn012-drive',
    retainedProjectDirectory: `${DIR}/cn012-drive`,
    latestAccessed: 1755000000000
  }
];

/** The rule the launcher used until this task. Written out so it can be required to fail. */
const addressById = (id: string) => rows.find((r) => r.id === id);

describe('CALIBRATION — the fixture really does misroute under the old rule', () => {
  it('addressing Puppy test 3 by its id answers tut001-drive', () => {
    const wanted = rows[1];
    const got = addressById(wanted.id);

    expect(got).toBeDefined();
    expect(got.name).toBe('tut001-drive');
    expect(got.retainedProjectDirectory).not.toBe(wanted.retainedProjectDirectory);
  });

  it('and it is the sort order that decides which project a person gets', () => {
    const reversed = [...rows].reverse();
    expect(reversed.find((r) => r.id === SHARED_ID).name).toBe('Puppy test 3');
    expect(addressById(SHARED_ID).name).toBe('tut001-drive');
  });
});

describe('addressing a row by its directory', () => {
  it('opens the project the person pointed at, collision and all', () => {
    for (const row of rows) {
      expect(findRowByDirectory(rows, row.retainedProjectDirectory)).toBe(row);
    }
  });

  it('is not fooled by a trailing separator — the same directory written twice', () => {
    expect(findRowByDirectory(rows, `${DIR}/Puppy test 3/`).name).toBe('Puppy test 3');
    expect(findRowByDirectory(rows, `${DIR}/Puppy test 3//`).name).toBe('Puppy test 3');
  });

  it('answers nothing for a directory that is not a row, and for no directory at all', () => {
    expect(findRowByDirectory(rows, `${DIR}/never opened`)).toBeUndefined();
    expect(findRowByDirectory(rows, '')).toBeUndefined();
    expect(findRowByDirectory(rows, undefined as unknown as string)).toBeUndefined();
  });

  it('⚠️ leans on one row per directory — the guarantee HLT-003 added, asserted here', () => {
    const doubled = [
      { id: 'aaaa', name: 'Twice', retainedProjectDirectory: `${DIR}/Twice`, latestAccessed: 200 },
      { id: 'bbbb', name: 'Twice', retainedProjectDirectory: `${DIR}/Twice`, latestAccessed: 100 }
    ];

    // Raw, this lookup is ambiguous: it answers the first of two rows for one folder.
    expect(findRowByDirectory(doubled, `${DIR}/Twice`).id).toBe('aaaa');
    // De-duplicated — which is what `fetch()` hands it — there is only one answer to give.
    expect(dedupeProjectRowsByDirectory(doubled)).toHaveLength(1);
  });
});

describe('the collision, reported and never repaired', () => {
  it('names the two projects that share one identity', () => {
    const collisions = findDurableIdCollisions(rows);

    expect(collisions).toHaveLength(1);
    expect(collisions[0].id).toBe(SHARED_ID);
    expect(collisions[0].names.sort()).toEqual(['Puppy test 3', 'tut001-drive']);
    expect(collisions[0].directories.sort()).toEqual(
      [`${DIR}/Puppy test 3`, `${DIR}/tut001-drive`].sort()
    );
  });

  it('leaves the rows exactly as they were — no id is re-minted, no row is dropped', () => {
    const before = JSON.parse(JSON.stringify(rows));
    findDurableIdCollisions(rows);

    expect(rows).toEqual(before);
    expect(rows.filter((r) => r.id === SHARED_ID)).toHaveLength(2);
  });

  it('says nothing about a machine where every id is its own', () => {
    const healthy = rows.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
    expect(findDurableIdCollisions(healthy)).toEqual([]);
  });

  it('does not call two projects with no id a collision', () => {
    const legacy = [
      { name: 'A', retainedProjectDirectory: `${DIR}/A`, latestAccessed: 2 },
      { name: 'B', retainedProjectDirectory: `${DIR}/B`, latestAccessed: 1 },
      { id: '   ', name: 'C', retainedProjectDirectory: `${DIR}/C`, latestAccessed: 0 }
    ];

    expect(findDurableIdCollisions(legacy)).toEqual([]);
  });

  it('reports three projects on one id as ONE collision naming all three', () => {
    const triple = [...rows.slice(0, 2), { ...rows[2], id: SHARED_ID }];
    const collisions = findDurableIdCollisions(triple);

    expect(collisions).toHaveLength(1);
    expect(collisions[0].directories).toHaveLength(3);
  });
});

/**
 * 🔴 The anchor. `findRowByDirectory` and the launcher's grid key are the same claim —
 * "a row is a directory" — and both are only safe because `projectRowKey` decides what
 * "the same directory" means. If that normaliser moves or changes its mind, this spec is
 * reasoning about a rule the product no longer applies.
 */
describe('this spec is blind if the row key stops being the directory', () => {
  it('projectRowKey still answers the directory itself, minus a trailing separator', () => {
    if (projectRowKey(`${DIR}/x/`) !== `${DIR}/x` || projectRowKey(`${DIR}/x`) !== `${DIR}/x`) {
      throw new Error('projectRowKey no longer normalises a directory — this spec is blind; fix it');
    }
    expect(projectRowKey(`${DIR}/x`)).toBe(`${DIR}/x`);
  });
});
