/**
 * P116 ONT-013 — the rule is a sentence, on the wire: SQLite and PostgreSQL, over real sockets.
 *
 * The `world-rules` fixture is the task's three sentences as `docs/world/rules.json`. Its claims
 * are graded on both engines with every other world's in `ont-003-claims` (AC1) and its mutants in
 * `ont-005-mutants`; this file grades what only the backend can show the person:
 *
 *   - **AC3, what the person sees**: the Schema card reads each collection's description off
 *     `GET /admin/schema`. A rule the store keeps is nowhere in it; one it only says is under
 *     "Not kept by the database yet", in that word; nothing is shown as a law;
 *   - **R-f, the refusal names the rule**: a person's write a held rule stops is a 409 whose error
 *     IS the person's sentence — the amount of an issued invoice, an assignment put back to draft —
 *     and the same write on a draft, or a move the rule allows, goes through;
 *   - the rules reach the backend the way a world's do: through `POST /admin/world/migrate`.
 *
 * PostgreSQL is skipped when no server answers, as BRG-005's suites are.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { WorldMigrateResponse } from '../src/server/admin-world';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

// Relative on purpose, as ONT-003's spec: this package declares no dependency on the project contract.
import { planMigration, RULES_FILE, schemaPushes, WORLD_FILES, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';

jest.setTimeout(180000);

const FIXTURE = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures/world-rules');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
const WITH_RULES: WorldFiles = { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary), rules: read(RULES_FILE) };
const THREE: WorldFiles = { nouns: WITH_RULES.nouns, relations: WITH_RULES.relations, vocabulary: WITH_RULES.vocabulary };

const AMOUNT = 'Once an invoice is issued, its amount never changes.';
const NEVER_BACK = 'An assignment goes from draft to issued to withdrawn. It never goes back.';
const COACH = 'Only a coach may issue an assignment.';
const TWENTY = 'A cohort holds at most twenty learners.';

/** Everyone signed in may write, nobody owns by creation: every refusal below is the rule's, not the row's. */
const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: false
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
let pgReachable = true;
try {
  psql(ADMIN_URL, 'SELECT 1');
} catch {
  pgReachable = false;
}
const STAMP = `${process.pid}_${Date.now().toString(36)}`;
let seq = 0;

interface Backend {
  req: <T = unknown>(method: string, p: string, body?: unknown, headers?: Record<string, string>) => Promise<{ status: number; json: T; text: string }>;
  stop: () => Promise<void>;
}

async function startBackend(engine: 'sqlite' | 'postgres'): Promise<Backend> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont013-'));
  fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  let db: string | null = null;
  if (engine === 'postgres') {
    db = `nodegx_ont013_${STAMP}_${++seq}`;
    psql(ADMIN_URL, `CREATE DATABASE ${db}`);
    process.env.NODEGX_STORAGE_URL = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);
  }
  const service = new BackendService({ dataDir, port: 0, backendId: 'ont013', backendName: 'ONT-013', authToken: 't0k' });
  let base: string;
  try {
    base = (await service.start()).listen.url;
  } finally {
    delete process.env.NODEGX_STORAGE_URL;
  }
  const admin = { authorization: 'Bearer t0k' };
  return {
    req: (method, p, body, headers = admin) => request(base, method, p, { body, headers }) as never,
    async stop() {
      await new Promise((r) => setTimeout(r, 250));
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
      if (db) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
        } catch {
          /* a leaked test database is not worth failing the run over */
        }
      }
    }
  };
}

interface Signup {
  objectId: string;
  sessionToken: string;
}
interface Listed {
  name: string;
  description?: string;
}

for (const engine of ['sqlite', 'postgres'] as const) {
  const suite = engine === 'sqlite' || pgReachable ? describe : describe.skip;

  suite(`ONT-013 — the rule is a sentence, on ${engine}`, () => {
    let b: Backend;
    let ann: Signup;
    const as = () => ({ 'x-parse-session-token': ann.sessionToken });
    const acl = () => ({ [ann.objectId]: { read: true, write: true }, '*': { read: true } });
    const make = async (collection: string, data: Record<string, unknown>): Promise<string> => {
      const r = await b.req<{ objectId: string }>('POST', `/classes/${collection}`, { ...data, ACL: acl() });
      expect([201, r.status, r.text]).toEqual([201, 201, r.text]);
      return r.json.objectId;
    };
    const put = (collection: string, id: string, body: Record<string, unknown>) => b.req<{ error?: string; reason?: string }>('PUT', `/classes/${collection}/${id}`, body, as());
    const held = async (collection: string, id: string): Promise<Record<string, unknown>> => (await b.req<Record<string, unknown>>('GET', `/classes/${collection}/${id}`)).json;

    beforeAll(async () => {
      b = await startBackend(engine);
      const r = await b.req<Signup>('POST', '/users', { username: 'ann', password: 'pw-ann' }, {});
      expect(r.status).toBe(201);
      ann = r.json;
      // The world's schema, as the projection's write pushes it; then its rules, as a world's migration carries them.
      const projected = planMigration(THREE, WITH_RULES);
      expect(projected.ok).toBe(true);
      if (!projected.ok) return;
      const schema: WorldSchema = projected.plan.after;
      for (const push of schemaPushes(schema)) {
        const res = await b.req('POST', '/admin/schema', push);
        expect([push.table, res.status]).toEqual([push.table, 200]);
      }
      const ran = await b.req<WorldMigrateResponse & { error?: string }>('POST', '/admin/world/migrate', { plan: projected.plan, run: true, backupTakenElsewhere: 'snapshot' });
      expect([ran.status, ran.json.error]).toEqual([200, undefined]);
    });
    afterAll(() => b.stop());

    it('AC3: the Schema card shows a kept rule nowhere, and an unkept one under “Not kept”, never as a law', async () => {
      const listed = (await b.req<{ tables: Listed[] }>('GET', '/admin/schema')).json.tables;
      const description = (name: string) => listed.find((t) => t.name === name)!.description!;
      const after = (d: string) => d.slice(Math.max(0, d.indexOf('Not kept by the database yet:')));
      const before = (d: string) => (d.includes('Not kept by the database yet:') ? d.slice(0, d.indexOf('Not kept by the database yet:')) : d);
      const sentence = (s: string) => s.replace(/\.$/, '');
      // Kept: the store holds it; the card says nothing of it.
      expect(description('Invoice')).not.toContain(sentence(AMOUNT));
      expect(description('Assignment')).not.toContain(sentence(NEVER_BACK));
      // Said: under the prefix, and nowhere before it.
      expect(after(description('Assignment'))).toContain(sentence(COACH));
      expect(before(description('Assignment'))).not.toContain(sentence(COACH));
      expect(after(description('Cohort'))).toContain(sentence(TWENTY));
      expect(before(description('Cohort'))).not.toContain(sentence(TWENTY));
      expect(description('Cohort')).toBe(`A cohort is a group of learners who start together. Not kept by the database yet: ${sentence(TWENTY)}.`);
    });

    it('R-f: the amount of an issued invoice is a 409 that IS the sentence; a draft’s amount changes', async () => {
      const issued = await make('Invoice', { amount: 100, status: 'issued' });
      const r = await put('Invoice', issued, { amount: 120 });
      expect([r.status, r.json.error, r.json.reason]).toEqual([409, AMOUNT, 'not-while']);
      expect((await held('Invoice', issued)).amount).toBe(100);
      const draft = await make('Invoice', { amount: 100, status: 'draft' });
      expect((await put('Invoice', draft, { amount: 120 })).status).toBe(200);
      expect((await held('Invoice', draft)).amount).toBe(120);
      // The number the store handed out is set once, under the same rule.
      const number = (await held('Invoice', issued)).number as string;
      expect(number).toMatch(/^INV-\d{4}-\d{4}$/);
      expect((await put('Invoice', issued, { number: 'INV-2026-9999' })).status).toBeGreaterThanOrEqual(400);
    });

    it('R-f: an assignment put back to draft is a 409 that IS the sentence; the move the rule allows goes through', async () => {
      const issued = await make('Assignment', { brief: 'Read chapter 3', status: 'issued' });
      const back = await put('Assignment', issued, { status: 'draft' });
      expect([back.status, back.json.error]).toEqual([409, NEVER_BACK]);
      expect((await held('Assignment', issued)).status).toBe('issued');
      expect((await put('Assignment', issued, { status: 'withdrawn' })).status).toBe(200);
      expect((await held('Assignment', issued)).status).toBe('withdrawn');
      const again = await put('Assignment', issued, { status: 'issued' });
      expect([again.status, again.json.error]).toEqual([409, NEVER_BACK]);
    });

    it('what is only said is not kept: a learner issues their own assignment, and a twenty-first learner joins — measured, not assumed', async () => {
      const draft = await make('Assignment', { brief: 'Read chapter 4', status: 'draft' });
      expect((await put('Assignment', draft, { status: 'issued' })).status).toBe(200);
      const cohort = await make('Cohort', { name: 'Autumn' });
      for (let i = 0; i < 21; i++) {
        const r = await b.req('POST', '/classes/Learner', { name: `learner-${i}`, cohort: { __type: 'Pointer', className: 'Cohort', objectId: cohort }, ACL: acl() });
        expect([i, r.status]).toEqual([i, 201]);
      }
    });
  });
}
