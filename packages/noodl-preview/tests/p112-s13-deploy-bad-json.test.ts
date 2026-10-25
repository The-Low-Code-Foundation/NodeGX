/**
 * P112-S13-DEPLOYBADJSON — a deploy of a project with a file that is not JSON says `project` and names the file.
 *
 * Measured (OWN-016): `nodegx-deploy ./broken ./site2` with `components/Pages/Home/nodes.json` reading
 * `{ "nodes": [ broken` answered `{"ok":false,"stage":"write","message":"Unexpected token 'b', … is not valid JSON"}`.
 * Nothing was written, which was right. But `write` means "it failed part-way through writing" (a caller mapping
 * stages to exit codes reports a disk problem), and the message named none of the project's files.
 *
 * ⚠️ Grades `dist/nodegx-deploy.cjs`, a build artefact: rebuild it (`npm run build`) after editing the source.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG_ROOT = path.resolve(__dirname, '..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const FIXTURE_PROJECT = path.join(PKG_ROOT, 'tests/fixtures/hello-world');
const SOURCES = ['src/deploy.ts', 'src/deploy-cli.ts', 'src/readProject.ts'].map((f) => path.join(PKG_ROOT, f));

let work: string;

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  const built = fs.statSync(ENGINE_BUNDLE).mtimeMs;
  const newer = SOURCES.filter((f) => fs.statSync(f).mtimeMs > built);
  if (newer.length) throw new Error(`${ENGINE_BUNDLE} is older than ${newer.join(', ')}. Rebuild it: npm --prefix packages/noodl-preview run build`);
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'p112-deploybadjson-'));
});

afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

/** The fixture with one of its nodes.json broken; returns the deploy's answer and the broken file's project path. */
function deployBroken(name: string, text: string) {
  const projectDir = path.join(work, name, 'project');
  fs.cpSync(FIXTURE_PROJECT, projectDir, { recursive: true });
  const nodesFiles: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'nodes.json') nodesFiles.push(p);
    }
  };
  walk(path.join(projectDir, 'components'));
  const broken = nodesFiles.sort()[0];
  fs.writeFileSync(broken, text);
  const outDir = path.join(work, name, 'out');
  const run = spawnSync(process.execPath, [ENGINE_BUNDLE, projectDir, outDir, '--allow-development-engine'], { encoding: 'utf8' });
  return { status: run.status, answer: JSON.parse(run.stdout.trim()), broken: path.relative(projectDir, broken), outDir };
}

describe('P112-S13-DEPLOYBADJSON — a file that is not JSON is the project’s problem, by name', () => {
  it('stage is project, the message names the file, and nothing is written', () => {
    const { status, answer, broken, outDir } = deployBroken('broken', '{ "nodes": [ broken');
    // The engine exits 0 whenever it said something; the JSON is the contract (deploy-cli.ts header).
    expect(status).toBe(0);
    expect(answer.ok).toBe(false);
    expect(answer.stage).toBe('project');
    expect(answer.message).toContain(broken.split(path.sep).join('/'));
    expect(answer.message).toMatch(/is not valid JSON/);
    expect(fs.existsSync(path.join(outDir, 'index.html'))).toBe(false);
  });

  it('an empty file says so the same way', () => {
    const { answer, broken } = deployBroken('empty', '');
    expect(answer.stage).toBe('project');
    expect(answer.message).toContain(broken.split(path.sep).join('/'));
  });
});
