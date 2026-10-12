/**
 * P112-S11-IDREPLACE — opening a project folder keeps the id in its file (ruled 2026-10-11).
 *
 * Measured in the dev editor: a project `@nodegx/mcp@0.1.0`'s `create_project` made had `"id": "95de5bf2-…"`; the
 * launcher's Open project… gave it `e5030348-…` and saved that within a second. That id is the one a backend's
 * ownership is keyed on (DSG-007/F30).
 *
 * `LocalProjectsModel` cannot load under this runner (electron-store), so these grade the rule `_addProject` now uses
 * on the open path, `idForOpenedFolder`, with the old rule written out beside it as the calibration: on the same input
 * the old rule must still change the id, or the fixture grades nothing.
 */

import { findDurableIdCollisions, idForOpenedFolder } from '../../src/editor/src/utils/recentProjectRows';

const MADE_ID = '95de5bf2-d00c-48ea-9d7e-142c074c1ba7';
const DIR = '/Users/someone/my-apps/reading-list';

/** What `_addProject` did before: a fresh id for every folder, opened or made. */
const oldRule = (_fileId: string | undefined) => 'minted';

describe('P112-S11-IDREPLACE — calibration: the old rule replaces the id', () => {
  test('the old rule gives the made project an id that is not its own', () => {
    expect(oldRule(MADE_ID)).not.toBe(MADE_ID);
  });
});

describe('P112-S11-IDREPLACE — opening keeps the id in the file', () => {
  test('a folder whose file carries an id keeps it', () => {
    expect(idForOpenedFolder(MADE_ID, DIR, [])).toBe(MADE_ID);
  });

  test('a folder already in the list under its own id keeps it (the row is the same folder)', () => {
    const rows = [{ retainedProjectDirectory: `${DIR}/`, id: MADE_ID }];
    expect(idForOpenedFolder(MADE_ID, DIR, rows)).toBe(MADE_ID);
  });

  test('a folder whose file has no id, or a blank one, mints as before', () => {
    expect(idForOpenedFolder(undefined, DIR, [])).toBeUndefined();
    expect(idForOpenedFolder('  ', DIR, [])).toBeUndefined();
  });

  test('⭐ a COPY — another folder already carries this id — mints, so opening never makes a collision', () => {
    const rows = [{ retainedProjectDirectory: '/Users/someone/my-apps/reading-list-original', id: MADE_ID }];
    expect(idForOpenedFolder(MADE_ID, DIR, rows)).toBeUndefined();

    // The property that exception defends, read by the module that reports it: with the rule's answer, no collision;
    // had the copy adopted the id, one.
    const kept = [...rows, { retainedProjectDirectory: DIR, id: idForOpenedFolder(MADE_ID, DIR, rows) ?? 'fresh' }];
    expect(findDurableIdCollisions(kept)).toEqual([]);
    const adopted = [...rows, { retainedProjectDirectory: DIR, id: MADE_ID }];
    expect(findDurableIdCollisions(adopted)).toHaveLength(1);
  });
});
