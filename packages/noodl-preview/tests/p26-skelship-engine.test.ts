/**
 * P26-SKELSHIP, the engine half — a deploy of a project nobody has built says so.
 *
 * lingo.nodegx.io served create_project's placeholder ("Lingo — nothing built yet. Review the plan in docs/ and start
 * when you are ready."), a sentence to the agent, and the person could not tell whether the deploy had worked.
 * This engine (Studio's Publish, `nodegx deploy`, ship-to-vm.sh, `deploy_to_vm`) answered `ok: true` with no word. Now
 * the outcome names the pages (`skeletonPages`), its sentence is in `warnings`, and the CLI says it on stderr. Ruled
 * 2026-10-26: never refused, and the placeholder speaks to a visitor ("Lingo — this app is being built."); a project
 * made with the earlier sentence is still read as the placeholder. Known-firing beside the absences: the same fixture as shipped (a page somebody wrote), and the placeholder
 * with one more node beside it, deploy with no such warning, so the sentence is about the placeholder.
 *
 * ⚠️ Grades `dist/nodegx-deploy.cjs`, a build artefact: rebuild it (`npm run build`) after editing the source.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// The engine's `src/skeleton.ts` re-exports these through the editor's `@noodl-utils` alias, which this jest does not map.
import {
  LEGACY_SKELETON_PLACEHOLDER_MARKERS,
  SKELETON_PLACEHOLDER_MARKER
} from '../../noodl-editor/src/editor/src/utils/compilation/build/deploy-skeleton';

const PKG_ROOT = path.resolve(__dirname, '..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const FIXTURE_PROJECT = path.join(PKG_ROOT, 'tests/fixtures/hello-world');
const SOURCES = [
  'src/deploy.ts',
  'src/deploy-cli.ts',
  'src/skeleton.ts',
  '../noodl-editor/src/editor/src/utils/compilation/build/deploy-skeleton.ts'
].map((f) => path.join(PKG_ROOT, f));
const HOME_NODES = 'components/__page__/Home/nodes.json';

let work: string;

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  const built = fs.statSync(ENGINE_BUNDLE).mtimeMs;
  const newer = SOURCES.filter((f) => fs.statSync(f).mtimeMs > built);
  if (newer.length) throw new Error(`${ENGINE_BUNDLE} is older than ${newer.join(', ')}. Rebuild it: npm --prefix packages/noodl-preview run build`);
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'p26-skelship-'));
});

afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

/** The fixture, its Home page's Text set to `text` (the placeholder when `skeleton`), and `extra` more nodes on it. */
function deployWith(name: string, home: { skeleton: boolean; extra?: boolean; marker?: string }) {
  const projectDir = path.join(work, name, 'project');
  fs.cpSync(FIXTURE_PROJECT, projectDir, { recursive: true });
  const file = path.join(projectDir, HOME_NODES);
  const nodes = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (home.skeleton) nodes.nodes.find((n: { type: string }) => n.type === 'Text').parameters.text = `Hello Preview${home.marker ?? SKELETON_PLACEHOLDER_MARKER}`;
  if (home.extra) {
    nodes.nodes.find((n: { type: string }) => n.type === 'Page').children.push('built');
    nodes.nodes.push({ id: 'built', type: 'Text', label: 'Built', parent: 'page', parameters: { text: 'Lessons' } });
  }
  fs.writeFileSync(file, JSON.stringify(nodes));
  const run = spawnSync(process.execPath, [ENGINE_BUNDLE, projectDir, path.join(work, name, 'out'), '--allow-development-engine'], {
    encoding: 'utf8'
  });
  const report = JSON.parse(run.stdout.trim().split('\n').pop() ?? '{}');
  return { report, stderr: run.stderr };
}

const SENTENCE = 'Nothing is built in this app yet';

describe('P26-SKELSHIP — the engine half', () => {
  test('the markers are the ones create_project writes and reads (the two packages do not import each other)', () => {
    const writer = fs.readFileSync(path.join(PKG_ROOT, '../noodl-mcp/src/tools/createProject.ts'), 'utf8');
    const declared = /export const SKELETON_PLACEHOLDER_MARKER =\s*'([^']*)'/.exec(writer);
    expect(declared?.[1]).toBe(SKELETON_PLACEHOLDER_MARKER);
    const legacy = /export const LEGACY_SKELETON_PLACEHOLDER_MARKERS[^=]*=\s*\[([^\]]*)\]/.exec(writer);
    const legacyMarkers = [...(legacy?.[1] ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1]);
    expect(legacyMarkers).toEqual([...LEGACY_SKELETON_PLACEHOLDER_MARKERS]);
  });

  test('🔴 an untouched skeleton: published, and the pages, the sentence and the stderr line all say so', () => {
    const { report, stderr } = deployWith('skeleton', { skeleton: true });
    expect(report.ok).toBe(true);
    expect(report.skeletonPages).toEqual(['Home']);
    const warning = (report.warnings as string[]).find((w) => w.startsWith(SENTENCE));
    expect(warning).toContain('Home is still the placeholder page a new project starts with');
    expect(stderr).toContain(`nodegx-deploy: ${warning}`);
  });

  test('a project made with the earlier sentence (to the agent) is read as the placeholder too', () => {
    for (const marker of LEGACY_SKELETON_PLACEHOLDER_MARKERS) {
      const { report } = deployWith(`legacy-${LEGACY_SKELETON_PLACEHOLDER_MARKERS.indexOf(marker)}`, { skeleton: true, marker });
      expect(report.skeletonPages).toEqual(['Home']);
    }
  });

  test('a page somebody wrote, and the placeholder with a node added: published with no such word (known-firing arms)', () => {
    for (const [name, home] of [['built', { skeleton: false }], ['touched', { skeleton: true, extra: true }]] as const) {
      const { report, stderr } = deployWith(name, home);
      expect({ name, ok: report.ok }).toEqual({ name, ok: true });
      expect({ name, pages: report.skeletonPages }).toEqual({ name, pages: undefined });
      expect((report.warnings as string[]).filter((w) => w.includes(SENTENCE))).toEqual([]);
      expect(stderr).not.toContain(SENTENCE);
    }
  });
});
