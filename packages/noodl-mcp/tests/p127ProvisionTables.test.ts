/**
 * P127-BKO006-TABLESNOTINFILES — the tables an agent's backend has are kept in the project, and a backend made for the
 * project starts with them.
 *
 * BKO-006's book club: the stranger's agent declared Book and Digest, with their columns, through `provision_backend`.
 * They reached the backend and nothing else: `metadata.dbCollections`, where the editor keeps a project's schema, was
 * never written, so the app's tables lived on one machine (the grade: "the table Book is in the project's files —
 * declared: []"). Now the tool writes the backend's tables there, the value the editor caches on open, and seeds a new
 * backend from the tables the project already declares.
 *
 * Driven over MCP; `provision_backend` starts a real backend (`nodegx-backend/dist/cli.js`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { stopOwnedBackends } from '../src/backend/provision';
import { BackendClient, listBackends } from '../src/backend/client';
import { call, connect, reveal } from './helpers';

const BACKEND_CLI = path.join(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'demo-app');
const describeOrSkip = fs.existsSync(BACKEND_CLI) ? describe : describe.skip;
jest.setTimeout(120000);

const temps: string[] = [];
const tmp = (label: string) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `p127-tables-${label}-`));
  temps.push(dir);
  return dir;
};
const readProject = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf-8'));
const columnsOf = (tables: any[], name: string) =>
  Object.fromEntries((tables.find((t) => t.name === name)?.columns ?? []).map((c: any) => [c.name, c.type]));

/** An unbound copy of the fixture, its project file given `metadata` (none by default). */
function project(label: string, metadata?: Record<string, unknown>): string {
  const dir = tmp(label);
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const pj = readProject(dir);
  delete pj.metadata;
  if (metadata) pj.metadata = metadata;
  fs.writeFileSync(path.join(dir, 'nodegx.project.json'), JSON.stringify(pj, null, 2));
  return dir;
}

async function provision(dir: string, args: Record<string, unknown>) {
  process.env.NODEGX_BACKENDS_DIR = tmp('backends');
  const session = await connect(dir, true);
  try {
    await reveal(session, 'backend');
    return await call<any>(session, 'provision_backend', args);
  } finally {
    await session.close();
  }
}

describeOrSkip('P127-BKO006-TABLESNOTINFILES — provision_backend keeps the tables in the project', () => {
  const prev = process.env.NODEGX_BACKENDS_DIR;
  afterEach(async () => {
    await stopOwnedBackends();
  });
  afterAll(() => {
    process.env.NODEGX_BACKENDS_DIR = prev;
    for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('the tables the agent names, with their columns and types, are written into metadata.dbCollections', async () => {
    const dir = project('named');
    const res = await provision(dir, {
      name: 'Book club',
      collections: [{ name: 'Book', columns: [{ name: 'title', type: 'String' }, { name: 'rating', type: 'Number' }] }]
    });
    expect(res.isError).toBe(false);
    expect(res.data.project).toMatchObject({ file: 'nodegx.project.json → metadata.dbCollections', written: true });
    const tables = readProject(dir).metadata.dbCollections;
    expect(columnsOf(tables, 'Book')).toMatchObject({ title: 'String', rating: 'Number' });
    expect(readProject(dir).metadata.cloudservices.instanceId).toBe(res.data.backendId);
  });

  it('a backend made for a project that declares its tables starts with them', async () => {
    const dir = project('declared', { dbCollections: [{ name: 'Shelf', columns: [{ name: 'label', type: 'String' }, { name: 'objectId', type: 'String' }] }] });
    const res = await provision(dir, { name: 'Shelves' });
    expect(res.isError).toBe(false);
    const backend = listBackends().find((b) => b.id === res.data.backendId)!;
    const { json } = await new BackendClient(backend).request('GET', '/admin/schema');
    expect(columnsOf((json as any).tables, 'Shelf')).toMatchObject({ label: 'String' });
    expect(columnsOf(readProject(dir).metadata.dbCollections, 'Shelf')).toMatchObject({ label: 'String' });
  });
});
