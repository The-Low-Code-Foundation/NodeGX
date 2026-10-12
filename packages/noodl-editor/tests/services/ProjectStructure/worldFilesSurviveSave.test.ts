/**
 * P116 ONT-001 AC3 — the editor opens a project with `docs/world/` and changes nothing in it on save.
 *
 * What the person said about their world lives in the project's files (R1), beside the
 * components the editor owns. The editor does not read it; it must not write it either —
 * not on a no-op save, not on a save that edits, renames and removes components. The files
 * are the fixture `@nodegx/project-contract` validates, as its writer would put them on disk.
 *
 * P112 OWN-006 (the editor suite) is not built; this is its fixture, to move there when it is.
 */
import { serializeWorldFile, WORLD_FILES } from '@nodegx/project-contract/world';

import { ProjectStructureService } from '../../../src/editor/src/services/ProjectStructure';
import { MemFs } from './memfs';
import { makeNode, makeProject, seedV2Project } from './fixtures';

/* eslint-disable @typescript-eslint/no-var-requires */
const WORLD = {
  [WORLD_FILES.nouns]: serializeWorldFile(require('../../../../nodegx-project-contract/tests/fixtures/world/docs/world/nouns.json')),
  [WORLD_FILES.relations]: serializeWorldFile(require('../../../../nodegx-project-contract/tests/fixtures/world/docs/world/relations.json')),
  [WORLD_FILES.vocabulary]: serializeWorldFile(require('../../../../nodegx-project-contract/tests/fixtures/world/docs/world/vocabulary.json'))
};
/* eslint-enable @typescript-eslint/no-var-requires */

const DIR = '/proj';

function setup() {
  const fs = new MemFs();
  seedV2Project(fs, DIR, makeProject());
  for (const [rel, text] of Object.entries(WORLD)) fs.files.set(fs.join(DIR, rel), text);
  return { fs, service: new ProjectStructureService(fs) };
}

function worldOnDisk(fs: MemFs): Record<string, string | undefined> {
  return Object.fromEntries(Object.keys(WORLD).map((rel) => [rel, fs.files.get(fs.join(DIR, rel))]));
}

describe('P116 ONT-001 AC3 — docs/world/ survives the editor', () => {
  it('is on disk beside the components before anything runs (the control)', () => {
    const { fs } = setup();
    expect(fs.pathsUnder(`${DIR}/docs/world`).length).toBe(3);
    expect(fs.pathsUnder(`${DIR}/components`).length).toBeGreaterThan(0);
  });

  it('opens without a warning and without reading the world as a component', async () => {
    const { service } = setup();
    const { project, warnings } = await service.loadProject(DIR);
    expect(warnings).toEqual([]);
    expect(project.components.map((c) => c.name).sort()).toEqual(['/%rootcomponent', '/Header', '/Pages/Home']);
  });

  it('is untouched by a no-op save', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    const res = await service.saveProject(DIR, project);
    expect(res.result).toBe('success');
    expect(worldOnDisk(fs)).toEqual(WORLD);
  });

  it('is untouched by a save that edits, renames and removes components', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    project.name = 'Renamed';
    project.components.find((c) => c.name === '/Pages/Home')!.graph.roots.push(makeNode('added', 'Text'));
    project.components = project.components.filter((c) => c.name !== '/Header');

    const before = new Map(fs.files);
    const res = await service.saveProject(DIR, project);

    expect(res.result).toBe('success');
    // The save did write (the control): the edited component changed and the removed one went.
    expect(fs.files.get(`${DIR}/components/Pages/Home/nodes.json`)).not.toBe(before.get(`${DIR}/components/Pages/Home/nodes.json`));
    expect(fs.pathsUnder(`${DIR}/components/Header`)).toEqual([]);
    expect(worldOnDisk(fs)).toEqual(WORLD);
    expect(fs.pathsUnder(`${DIR}/docs`)).toEqual(Object.keys(WORLD).map((rel) => `${DIR}/${rel}`).sort());
  });
});
