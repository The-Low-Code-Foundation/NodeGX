/**
 * P109 ISL-017 ruling 2 — "copy on install": a template can ship the record of a kit without the kit, and the
 * publish step puts the kit back from the library (`scripts/library/resolve-template-kits.js`).
 *
 * The round trip is the claim: drop Olive's Island's four library-identical kit folders from a resolved copy, resolve,
 * and the copy is what it was, byte for byte. Since s15 the committed template carries the record only (the generator
 * drops the folders), so every copy here is resolved first, as every reader of the template now does. The red arms are the ways a publish could ship the wrong kit: a
 * folder that drifted from its entry, a record whose version the library no longer holds, and a folder never
 * resolved.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveTemplateKits, resolveTemplateCopy } = require('../../../scripts/library/resolve-template-kits.js');

const REPO = path.join(__dirname, '..', '..', '..');
const GARDEN = path.join(REPO, 'templates', 'bot-garden');
const LIBRARY = path.join(REPO, 'library');
const KITS = ['garden-kit', 'game-kit', 'garden-3d-kit', 'bot-garden-fonts'];

const made: string[] = [];
afterAll(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

function gardenCopy(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl017-resolve-'));
  made.push(dir);
  fs.cpSync(GARDEN, dir, { recursive: true });
  // ISL-017 ruling 2: the template carries its kits' record, not the kits.
  resolveTemplateCopy(dir);
  return dir;
}

/** Every file under `dir` with its bytes, for a whole-tree comparison. */
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (rel: string) => {
    for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = rel ? path.join(rel, d.name) : d.name;
      if (d.isDirectory()) walk(r);
      else out[r] = fs.readFileSync(path.join(dir, r)).toString('base64');
    }
  };
  walk('');
  return out;
}

describe('P109 ISL-017 ruling 2 — a template ships the record, the publish resolves the kit', () => {
  it('the garden records every kit by entry and version and carries none of them; a copy resolves each to the library’s', () => {
    const records = JSON.parse(fs.readFileSync(path.join(GARDEN, 'noodl_modules', 'kit-provenance.json'), 'utf8'));
    expect(records.map((r: { module: string; entry?: string; entryVersion?: string }) => [r.module, r.entry, typeof r.entryVersion])).toEqual(
      KITS.map((k) => [k, k, 'string'])
    );
    const report = resolveTemplateKits(GARDEN, { library: LIBRARY });
    expect({ identical: report.identical, missing: report.missing, differs: report.differs, unresolvable: report.unresolvable }).toEqual({
      identical: [],
      missing: KITS,
      differs: [],
      unresolvable: []
    });
    const copy = resolveTemplateKits(gardenCopy(), { library: LIBRARY });
    expect({ identical: copy.identical, missing: copy.missing }).toEqual({ identical: KITS, missing: [] });
  });

  it('round trip: the four folders dropped are reported missing, and resolving them gives back the template byte for byte', () => {
    const dir = gardenCopy();
    const before = tree(dir);
    for (const k of KITS) fs.rmSync(path.join(dir, 'noodl_modules', k), { recursive: true });
    const dropped = Object.keys(tree(dir)).length;

    const check = resolveTemplateKits(dir, { library: LIBRARY });
    expect(check.missing).toEqual(KITS);
    // Without --write nothing was copied: the check is a reading.
    expect(Object.keys(tree(dir)).length).toBe(dropped);

    const written = resolveTemplateKits(dir, { library: LIBRARY, write: true });
    expect(written.resolved).toEqual(KITS);
    expect(tree(dir)).toEqual(before);
  });

  it('🔴 a folder that drifted from its entry is named, file by file, and is not called identical', () => {
    const dir = gardenCopy();
    const file = path.join(dir, 'noodl_modules', 'game-kit', 'index.js');
    fs.appendFileSync(file, '\n// drift\n');
    const report = resolveTemplateKits(dir, { library: LIBRARY });
    expect(report.identical).not.toContain('game-kit');
    expect(report.differs).toEqual([{ module: 'game-kit', files: ['index.js'], count: 1 }]);
  });

  it('🔴 a record whose version the library no longer holds is unresolvable, naming both versions; one without an entry is left alone', () => {
    const dir = gardenCopy();
    const file = path.join(dir, 'noodl_modules', 'kit-provenance.json');
    const records = JSON.parse(fs.readFileSync(file, 'utf8'));
    records[0].entryVersion = '0.9.0';
    delete records[1].entry;
    fs.writeFileSync(file, JSON.stringify(records, null, 2));
    fs.rmSync(path.join(dir, 'noodl_modules', 'garden-kit'), { recursive: true });

    const report = resolveTemplateKits(dir, { library: LIBRARY, write: true });
    expect(report.unresolvable).toEqual([{ module: 'garden-kit', entry: 'garden-kit', reason: expect.stringMatching(/record says 0\.9\.0, the library holds 1\.0\.0/) }]);
    expect(report.notReferenced).toEqual(['game-kit']);
    // An unresolvable kit is not copied in from a version nobody asked for.
    expect(fs.existsSync(path.join(dir, 'noodl_modules', 'garden-kit'))).toBe(false);
  });
});
