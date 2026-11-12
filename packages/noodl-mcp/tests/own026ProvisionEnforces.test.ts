/**
 * P112 OWN-026 FIX-01 A — a backend `provision_backend` makes keeps its users apart from the first record.
 *
 * A stranger's agent built a multi-user app on a backend provisioned dev-open: its rules written, not
 * enforced, so another user's token, or none, read and changed every user's rows (P112-OWN023-DEVOPENREAD).
 * Driven against the built `dist/cli.js`, because "the spawner passes the flag" is true of the source and
 * false of a stale bundle (see sb015ProvisionAppliesPolicy.test.ts); the reading is the consequence on the wire.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { provisionBackend, stopOwnedBackends } from '../src/backend/provision';

const BACKEND_CLI = path.join(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const describeOrSkip = fs.existsSync(BACKEND_CLI) ? describe : describe.skip;

jest.setTimeout(120000);

const temps: string[] = [];
function tmp(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `own026-mcp-${label}-`));
  temps.push(dir);
  return dir;
}
function makeProject(label: string): string {
  const dir = tmp(label);
  fs.writeFileSync(path.join(dir, 'nodegx.project.json'), JSON.stringify({ name: label, components: [] }, null, 2));
  return dir;
}

async function wire(endpoint: string, method: string, p: string, body?: unknown, session?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'own026' };
  if (session) headers['x-parse-session-token'] = session;
  const res = await fetch(endpoint + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* not JSON */
  }
  return { status: res.status, json };
}

describeOrSkip('OWN-026 FIX-01 — provision_backend enforces the rules', () => {
  afterEach(async () => {
    await stopOwnedBackends();
  });
  afterAll(() => {
    for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a new backend enforces its default rules on this machine, and says so', async () => {
    const root = tmp('new-root');
    const result = await provisionBackend({ name: 'OWN-026 new', projectDir: makeProject('new'), projectId: 'own026-new', collections: [], root });
    expect(result.enforced).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(root, result.backendId, 'security.json'), 'utf-8')).devOpen).toBe(false);

    const e = result.endpoint;
    const a = (await wire(e, 'POST', '/users', { username: 'ada', password: 'pw-ada-123' })).json.sessionToken;
    const b = (await wire(e, 'POST', '/users', { username: 'bea', password: 'pw-bea-123' })).json.sessionToken;
    const row = await wire(e, 'POST', '/classes/Note', { text: 'ada only' }, a);
    expect(row.status).toBe(201);
    expect((await wire(e, 'GET', '/classes/Note')).status).toBe(403);
    expect((await wire(e, 'GET', '/classes/Note', undefined, b)).json.results).toEqual([]);
    expect((await wire(e, 'PUT', `/classes/Note/${row.json.objectId}`, { text: 'bea was here' }, b)).status).toBe(404);
    expect((await wire(e, 'PUT', `/classes/Note/${row.json.objectId}`, { text: 'ada edited' }, a)).status).toBe(200);
    expect((await wire(e, 'GET', '/classes/Note', undefined, a)).json.results.map((r: any) => r.text)).toEqual(['ada edited']);
  });

  it('a reused backend made dev-open keeps its rules, and the result says enforced: false', async () => {
    const root = tmp('reuse-root');
    const projectDir = makeProject('reuse');
    const first = await provisionBackend({ name: 'OWN-026 reuse', projectDir, projectId: 'own026-reuse', collections: [], root });
    await stopOwnedBackends();
    // A backend made before this fix: dev-open on disk. Provisioning never rewrites an existing security.json.
    const file = path.join(root, first.backendId, 'security.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf-8')), devOpen: true }));
    const second = await provisionBackend({ name: 'OWN-026 reuse', projectDir, projectId: 'own026-reuse', collections: [], root });
    expect(second.backendId).toBe(first.backendId);
    expect(second.enforced).toBe(false);
  });
});
