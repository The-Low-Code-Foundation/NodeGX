/**
 * P112-S11-OPENWRITES — opening a project must not rewrite `nodegx.project.json` when nothing changed.
 *
 * The save is skipped when `hashProjectLevel(buildProjectV2File(project))` equals the baseline taken at load. The
 * baseline is built from the importer's project, which has no `metadata`; the save from `ProjectModel.toJSON()`,
 * whose `metadata` holds three keys set to `undefined` (`dbCollections`, `systemCollections`, `dbVersionMajor`,
 * read in the running editor on 2026-10-12). `buildProjectV2File` counted them as content and wrote
 * `"metadata": {}`, so the two never agreed and every open wrote the file. Driven after the fix (OWN-013 §7):
 * a second open of a converted project and of a kit project wrote nothing; a real metadata change still did.
 */
import { buildProjectV2File, LegacyProject } from '../../src/editor/src/io/ProjectExporter';
import { hashProjectLevel } from '../../src/editor/src/services/ProjectStructure/projectLevel';

const base = {
  name: 'Desk',
  id: '35ad6c29-f947-40ef-a131-09e4d6a55cfb',
  version: '5',
  rootNodeId: '45f5a32c-faa3-4b15-b3fb-f29727dd14aa',
  components: []
} as unknown as LegacyProject;

describe('OPENWRITES — a metadata key holding undefined is not content', () => {
  it('writes no metadata for keys that hold undefined', () => {
    const file = buildProjectV2File(
      { ...base, metadata: { dbCollections: undefined, systemCollections: undefined, dbVersionMajor: undefined } },
      ''
    );
    expect('metadata' in file).toBe(false);
  });

  it("hashes the model's project the same as the importer's, so the save after an open writes nothing", () => {
    const fromImporter = buildProjectV2File(base, '');
    const fromModel = buildProjectV2File(
      { ...base, metadata: { dbCollections: undefined, systemCollections: undefined, dbVersionMajor: undefined } },
      ''
    );
    expect(hashProjectLevel(fromModel)).toBe(hashProjectLevel(fromImporter));
  });

  it('still writes a key that holds a value', () => {
    const file = buildProjectV2File({ ...base, metadata: { dbCollections: undefined, own013probe: 1 } }, '');
    expect(file.metadata).toEqual({ own013probe: 1 });
  });
});
