/**
 * TWO-005 — the community app's template is what its generator writes, byte for byte; the policy names exactly the
 * functions it carries; every script it ships compiles (the door writes them uncompiled); and the scripts that decide
 * where a person goes, and who the admins' queue shows, do what the slice says against fixtures.
 */
import * as fs from 'fs';
import * as path from 'path';

import { compiles, Row, run } from './two003Run';
import { buildGram, FUNCTION_RULES, GRAM_CLOUD, POLICY_FILE, prepareGram, TEMPLATE_DIR, TEMPLATE_ID } from './two005Template';
import { BAR_WHO, GRAM_ROUTE, QUEUE_LOAD } from './two005Pages';

jest.setTimeout(120000);

function files(root: string, rel = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) out.push(...files(root, r));
    else out.push(r);
  }
  return out.sort();
}

describe('TWO-005 the community app template', () => {
  let fresh: string;

  beforeAll(async () => {
    const built = await buildGram();
    fresh = path.join(path.dirname(built.projectDir), `two005-fresh-${process.pid}`, TEMPLATE_ID);
    fs.rmSync(path.dirname(fresh), { recursive: true, force: true });
    fs.mkdirSync(fresh, { recursive: true });
    prepareGram(built, fresh);
  });

  it('components/ and nodegx.project.json are the generator’s output, byte for byte', () => {
    const generated = (root: string) => [...files(root, 'components'), 'nodegx.project.json'];
    expect(generated(TEMPLATE_DIR)).toEqual(generated(fresh));
    for (const f of generated(fresh)) {
      expect([f, fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf8')]).toEqual([f, fs.readFileSync(path.join(fresh, f), 'utf8')]);
    }
  });

  it('the project opens on App: its rootNodeId is App’s visual root (P121-S19-NOHOME)', () => {
    const project = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'nodegx.project.json'), 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'components', 'App', 'nodes.json'), 'utf8'));
    expect(app.visualRoots).toContain(project.rootNodeId);
  });

  it('the policy has a call rule for every function the template carries, and for no other', () => {
    const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    expect(policy.functions).toEqual(FUNCTION_RULES);
    expect(Object.keys(policy.functions).sort()).toEqual(GRAM_CLOUD.map((c) => c.name).sort());
  });

  it('every script the template ships compiles, its pages’ and its functions’', () => {
    const scripts: Array<[string, string]> = [];
    for (const f of files(TEMPLATE_DIR, 'components').filter((x) => x.endsWith('nodes.json'))) {
      const doc = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf8'));
      for (const n of doc.nodes) if (typeof n.parameters?.functionScript === 'string') scripts.push([`${f} ${n.id}`, n.parameters.functionScript]);
    }
    expect(scripts.length).toBeGreaterThan(25);
    expect(scripts.filter(([, code]) => !compiles(code)).map(([where]) => where)).toEqual([]);
  });
});

describe('TWO-005 slice 1 — where a person goes, and who the queue shows', () => {
  const as = (me: Row | null, current: Row | 'nobody' = { id: 'u1' }) =>
    run(GRAM_ROUTE, {}, { current: current === 'nobody' ? undefined : current, cloud: (name) => { if (name !== 'whoAmI') throw new Error(name); return { me }; } });

  it('nobody signed in stays, and nothing is asked of the backend', async () => {
    const r = await as(null, 'nobody');
    expect([r.fired, r.called, r.out.problem]).toEqual([['stranger'], [], '']);
  });
  it('a waiting member to Waiting, a member to the feed, an admin to the queue', async () => {
    expect((await as({ status: 'waiting', role: 'member' })).fired).toEqual(['waiting']);
    expect((await as({ status: 'approved', role: 'member' })).fired).toEqual(['member']);
    expect((await as({ status: 'approved', role: 'admin' })).fired).toEqual(['admin']);
    // An admin's role doesn't jump the queue: someone waiting is waiting, whatever the row says.
    expect((await as({ status: 'waiting', role: 'admin' })).fired).toEqual(['waiting']);
  });
  it('a sign-in with no member is told so', async () => {
    const r = await run(GRAM_ROUTE, {}, { current: { id: 'u9' }, cloud: () => { throw { error: 'This sign-in isn’t a member of the community.' }; } });
    expect([r.fired, r.out.problem]).toEqual([['stranger'], 'This sign-in isn’t a member of the community.']);
  });
  it('Sign out is offered only to someone signed in', async () => {
    expect((await run(BAR_WHO, { band: '' }, {})).out).toEqual({ signedIn: false, hasBand: false });
    expect((await run(BAR_WHO, { band: 'Admin' }, { current: { id: 'u1' } })).out).toEqual({ signedIn: true, hasBand: true });
  });

  const MEMBERS: Row[] = [
    { objectId: 'm1', name: 'Ama Owusu', status: 'approved', role: 'admin', createdAt: '2026-10-15T08:00:00.000Z' },
    { objectId: 'm2', name: 'Nana Tetteh', status: 'waiting', role: 'member', createdAt: '2026-10-15T10:00:00.000Z' },
    { objectId: 'm3', name: 'Yaw Asante', status: 'waiting', role: 'member', createdAt: '2026-10-15T09:00:00.000Z' },
    { objectId: 'm4', name: 'Kofi Darko', status: 'waiting', role: 'member', createdAt: '2026-10-15T07:00:00.000Z', endedAt: { iso: '2026-10-15T11:00:00.000Z' }, blockedReason: 'Not let in.' }
  ];
  const queue = (me: Row | null) => run(QUEUE_LOAD, {}, { current: me ? { id: 'u' } : undefined, tables: { Member: MEMBERS }, cloud: () => ({ me }) });

  it('the queue: the people waiting, the longest waiting first, none who was turned away', async () => {
    const r = await queue({ status: 'approved', role: 'admin' });
    expect(r.out.ok).toBe(true);
    expect(r.out.rows.map((x: Row) => x.name)).toEqual(['Yaw Asante', 'Nana Tetteh']);
    expect(r.out.rows[0].sub).toMatch(/^Confirmed 13 or older · asked /);
    expect(r.out.rows[0].initials).toBe('YA');
    expect(r.out.heading).toBe('New members (2)');
    expect(r.out.empty).toBe(false);
  });
  it('the queue is the admins’: a member is told so, and so is nobody', async () => {
    const member = await queue({ status: 'approved', role: 'member' });
    expect([member.out.refused, member.out.problem, member.out.rows]).toEqual([true, 'This page is the admins’. Sign in as an admin to see it.', undefined]);
    const nobody = await queue(null);
    expect([nobody.out.refused, nobody.out.problem]).toEqual([true, 'Sign in to see this page.']);
  });
});
