/**
 * P123-STU-COPYADOPTS — a copied project folder must not start on the original's backend.
 *
 * Found on a Studio drive (STU-092, 2026-10-30): a copy of Greenhouse, its `metadata.cloudservices` deleted, asked for
 * "Start a backend" and was ADOPTED onto Greenhouse's running backend, because the copied nodegx.project.json carries
 * the same durable id and `findReusableBackend` matches on id + name. Every write the copy made would have landed in the
 * original app's database.
 *
 * The rule (decided 2026-11-01 for Richard): a folder that is not the folder a backend was made for never takes that
 * backend while that other folder still exists and still carries the id. The copy is made its own app — a fresh id in
 * its project file, a new backend, and a sentence saying so. A MOVED project (the recorded folder is gone) keeps its
 * backend. A backend made before the folder was recorded is adopted as before (nothing tells which folder is original).
 *
 * The end-to-end half drives `provisionBackend` the way NodeGX Studio's `lib/backend.mjs provisionFor` does, against a
 * real `nodegx-backend` in a temp backends root — never a real project or a real backend.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ensureProjectId, readProjectId } from '../src/backend/projectIdentity';
import {
  judgeProjectFolder,
  provisionBackend,
  readBackendConfig,
  stopOwnedBackends
} from '../src/backend/provision';
import { writeRuntimeRecord } from '../src/backend/runtimeRecord';

const BACKEND_CLI = path.join(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const describeOrSkip = fs.existsSync(BACKEND_CLI) ? describe : describe.skip;

const ID = '11111111-2222-4333-8444-555555555555';

function makeProject(parent: string, folder: string, project: Record<string, unknown>): string {
  const dir = path.join(parent, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'nodegx.project.json'), JSON.stringify(project, null, 2));
  return dir;
}

function copyFolder(from: string, to: string): string {
  fs.cpSync(from, to, { recursive: true });
  return to;
}

function projectOf(dir: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf-8'));
}

describe('P123-STU-COPYADOPTS — which folder a backend was made for (no process)', () => {
  let work: string;
  let root: string;
  beforeEach(() => {
    work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'p123-copy-')));
    root = path.join(work, 'backends');
    fs.mkdirSync(root);
  });

  it('the recorded folder itself: same-folder', () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: ID });
    const v = judgeProjectFolder({ id: 'b1', projectDirs: { [ID]: orig } }, ID, orig, root);
    expect(v.verdict).toBe('same-folder');
  });

  it('another folder carrying the same id while the recorded one still exists: copy', () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: ID });
    const copy = copyFolder(orig, path.join(work, 'Greenhouse copy'));
    const v = judgeProjectFolder({ id: 'b1', projectDirs: { [ID]: orig } }, ID, copy, root);
    expect(v).toEqual({ verdict: 'copy', recordedDir: orig, source: 'config' });
  });

  it('the recorded folder is gone (the project was moved): moved, so adopting stays right', () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: ID });
    const moved = path.join(work, 'Moved Greenhouse');
    fs.renameSync(orig, moved);
    expect(judgeProjectFolder({ id: 'b1', projectDirs: { [ID]: orig } }, ID, moved, root).verdict).toBe('moved');
  });

  it('the recorded folder now carries another id: moved, not copy', () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: 'someone-else' });
    const other = makeProject(work, 'Elsewhere', { name: 'Greenhouse', id: ID });
    expect(judgeProjectFolder({ id: 'b1', projectDirs: { [ID]: orig } }, ID, other, root).verdict).toBe('moved');
  });

  it('a backend made before folders were recorded, and not running: unrecorded (adopted as before)', () => {
    const copy = makeProject(work, 'Greenhouse copy', { name: 'Greenhouse', id: ID });
    expect(judgeProjectFolder({ id: 'b1' }, ID, copy, root).verdict).toBe('unrecorded');
  });

  it("an unrecorded backend that is running names the folder that started it: a copy of that folder is a copy", () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: ID });
    const copy = copyFolder(orig, path.join(work, 'Greenhouse copy'));
    fs.mkdirSync(path.join(root, 'b1'));
    writeRuntimeRecord(
      {
        version: 1,
        backendId: 'b1',
        backendName: 'Greenhouse backend',
        pid: 999999,
        port: 9999,
        endpoint: 'http://127.0.0.1:9999',
        entry: 'cli.js',
        startedAt: new Date().toISOString(),
        owner: { kind: 'noodl-mcp', pid: 999998, startedAt: new Date().toISOString(), projectDir: orig }
      },
      root
    );
    expect(judgeProjectFolder({ id: 'b1' }, ID, copy, root)).toEqual({ verdict: 'copy', recordedDir: orig, source: 'runtime' });
    // …but a folder already BOUND to that backend is claiming it; the runtime record is too weak a witness to cut it
    // off (a copy that kept its binding may be the one that started the process).
    const bound = makeProject(work, 'Bound', { name: 'Greenhouse', id: ID, metadata: { cloudservices: { instanceId: 'b1' } } });
    expect(judgeProjectFolder({ id: 'b1' }, ID, bound, root).verdict).toBe('unrecorded');
  });
});

describeOrSkip('P123-STU-COPYADOPTS — Start a backend from a copied folder (a real backend)', () => {
  jest.setTimeout(90000);

  let work: string;
  let root: string;
  const previousRoot = process.env.NODEGX_BACKENDS_DIR;

  beforeEach(() => {
    work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'p123-copy-e2e-')));
    root = path.join(work, 'backends');
    fs.mkdirSync(root);
    process.env.NODEGX_BACKENDS_DIR = root; // allocatePort's listBackends() reads this: never the real backends
  });

  afterEach(async () => {
    await stopOwnedBackends(root);
    if (previousRoot === undefined) delete process.env.NODEGX_BACKENDS_DIR;
    else process.env.NODEGX_BACKENDS_DIR = previousRoot;
  });

  /** What Studio's provisionFor sends: ensureProjectId, then provision with the folder. */
  async function startABackend(dir: string) {
    const identity = ensureProjectId(dir);
    return provisionBackend({
      name: 'Greenhouse backend',
      collections: [{ name: 'Plant', columns: [{ name: 'name', type: 'String' }] }],
      projectId: identity.id,
      projectDir: dir,
      root,
      identity: { reason: identity.reason, minted: identity.outcome === 'minted' }
    });
  }

  it("a copy with its binding removed gets its OWN backend and id; the original's running backend is not adopted", async () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: ID });
    const first = await startABackend(orig);
    expect(first.reused).toBe(false);
    expect(readBackendConfig(first.backendId, root)?.projectDirs).toEqual({ [ID]: orig });

    // The person duplicates the folder; the binding is removed (Studio would show it unbound).
    const copy = copyFolder(orig, path.join(work, 'Greenhouse copy'));
    const p = projectOf(copy);
    delete p.metadata;
    fs.writeFileSync(path.join(copy, 'nodegx.project.json'), JSON.stringify(p, null, 2));

    const second = await startABackend(copy);
    // The defect: { adopted: true, backendId: first.backendId }.
    expect(second.backendId).not.toBe(first.backendId);
    expect(second.adopted).toBe(false);
    expect(second.reused).toBe(false);
    expect(second.reuseVerdict).toBe('copy-of-another-folder');
    expect(second.copyOf?.projectDir).toBe(orig);
    expect(second.copyOf?.backendId).toBe(first.backendId);
    expect(second.copyOf?.note).toContain(`This folder is a copy of ${orig}`);
    expect(second.warnings.join('\n')).toContain("it cannot change that app's data");

    // The copy is its own app now; the original is untouched.
    const copyId = readProjectId(copy);
    expect(copyId).toBeTruthy();
    expect(copyId).not.toBe(ID);
    expect(second.projectId).toBe(copyId);
    expect(readProjectId(orig)).toBe(ID);
    expect(readBackendConfig(second.backendId, root)?.projectIds).toEqual([copyId]);
    expect(readBackendConfig(second.backendId, root)?.projectDirs).toEqual({ [copyId as string]: copy });
    expect(readBackendConfig(first.backendId, root)?.projectIds).toEqual([ID]);

    // Asking again from either folder takes that folder's own backend.
    const again = await startABackend(copy);
    expect(again.backendId).toBe(second.backendId);
    expect(again.copyOf).toBeUndefined();
    const origAgain = await startABackend(orig);
    expect(origAgain.backendId).toBe(first.backendId);
    expect(origAgain.adopted).toBe(true);
    expect(origAgain.copyOf).toBeUndefined();
  });

  it('a MOVED project keeps its backend, and the record moves with it', async () => {
    const orig = makeProject(work, 'Greenhouse', { name: 'Greenhouse', id: ID });
    const first = await startABackend(orig);
    const moved = path.join(work, 'Projects', 'Greenhouse');
    fs.mkdirSync(path.dirname(moved));
    fs.renameSync(orig, moved);

    const second = await startABackend(moved);
    expect(second.backendId).toBe(first.backendId);
    expect(second.reused).toBe(true);
    expect(second.copyOf).toBeUndefined();
    expect(readProjectId(moved)).toBe(ID);
    expect(readBackendConfig(first.backendId, root)?.projectDirs).toEqual({ [ID]: moved });
  });
});
