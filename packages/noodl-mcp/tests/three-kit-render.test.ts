/**
 * Three in nodes s3 (dev-docs/parked/THREE-IN-NODES.md, R1 "nodes first: the picker and the MCP") — what an agent sees.
 *
 * - **PARKED-THREE-S3-NOWEBGL.** `render_report` and `drive_page` launched Chrome with `--disable-gpu` and nothing else,
 *   so `getContext('webgl')` was null and every three.js scene drew its "No WebGL here" fallback: an agent building a
 *   3D page got a blank screenshot. Read with the harness's DEFAULT flags, so the fix in `render-report.js` is what is
 *   graded, not a flag this spec adds.
 * - **PARKED-THREE-S2-MESHOUTSIDE, the kit's half.** A Mesh with no Scene above it logs one console error naming
 *   itself, and `render_report` hands it to the agent as a `console-error` finding (it collects errors only, never
 *   warnings). The control is the first block: the same page with the ball inside the Scene logs nothing.
 *
 * Both projects are the parked fixture with the built kit copied in (what `npx @nodegx/three-kit add` does).
 *
 * @module noodl-mcp/tests/three-kit-render.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withRenderedPage, renderReport } = require(path.resolve(__dirname, '..', '..', '..', 'scripts', 'devtools', 'render-report.js'));

jest.setTimeout(300000);

const REPO = path.join(__dirname, '..', '..', '..');
const KIT = path.join(REPO, 'library', 'modules', 'three-kit', 'project', 'noodl_modules', 'three-kit');
const FIXTURE = path.join(REPO, 'dev-docs', 'parked', 'three-in-nodes', 'fixture');

let tempDir: string;
let inside: string;
let outside: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'three-kit-render-'));
  inside = path.join(tempDir, 'inside');
  outside = path.join(tempDir, 'outside');
  for (const dir of [inside, outside]) {
    fs.cpSync(FIXTURE, dir, { recursive: true });
    fs.cpSync(KIT, path.join(dir, 'noodl_modules', 'three-kit'), { recursive: true });
  }
  // The bug file's repro: the ball moved from the Scene to the page's Layout Group.
  const file = path.join(outside, 'components', 'Pages', 'Home', 'nodes.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byId = Object.fromEntries(doc.nodes.map((n: { id: string }) => [n.id, n]));
  byId.scene.children = byId.scene.children.filter((c: string) => c !== 'ball');
  byId.layout.children.push('ball');
  byId.ball.parent = 'layout';
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
});

afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

const PROBE = `(() => {
  const gl = !!document.createElement('canvas').getContext('webgl');
  const root = document.querySelector('[data-three-scene]');
  return JSON.stringify({ gl, fallback: document.body.innerText.includes('No WebGL here'), meshes: root && root.getAttribute('data-meshes') });
})()`;

describe('a three-kit page in the agent\'s render harness', () => {
  it('🔴 has WebGL with the default flags: no fallback, the fixture\'s 12 meshes drawn', async () => {
    const seen = await withRenderedPage({ projectDir: inside }, async (page: { evaluate: (e: string) => Promise<string> }) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      return JSON.parse(await page.evaluate(PROBE));
    });
    expect(seen).toEqual({ gl: true, fallback: false, meshes: '12' });
  });

  it('🔴 render_report names a Mesh outside a Scene as one console-error finding', async () => {
    const { report } = await renderReport({ projectDir: outside });
    const errors = (report.findings as Array<{ code: string; evidence?: unknown }>).filter((f) => f.code === 'console-error');
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors[0].evidence)).toMatch(/three-kit: Mesh \\"ball\\" is not inside a Scene/);
  });

  it('control: the same page with the ball inside the Scene has no console-error finding', async () => {
    const { report } = await renderReport({ projectDir: inside });
    expect((report.findings as Array<{ code: string }>).filter((f) => f.code === 'console-error')).toEqual([]);
  });
});
