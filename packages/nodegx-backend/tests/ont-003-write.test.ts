/**
 * P116 ONT-003 §3.4 / AC3 — the projection written through the backend's own schema route.
 *
 * `schemaPushes()` turns what a person said into `POST /admin/schema` bodies; a real
 * BackendService takes them on SQLite and on PostgreSQL, and `GET /admin/schema` reads back
 * what the backend manager's Schema page lists: every projected collection, its sentence as the
 * collection's description, every field as the tile its kind named (read through the manager's
 * own `kindOf`, so Text and Choice are told apart the way the page tells them), its link
 * target, required where the person said so, its rules and its indexes.
 *
 * The card itself is mounted with this shape in `admin-app/ont-003-card.test.tsx`.
 * PostgreSQL is skipped only when none is reachable, like its BRG-005 siblings.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { projectWorld, schemaPushes, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';
import { kindOf, type RuleStatus } from '../src/admin/app/fieldKinds';
import { validCollectionName, validName, type Column } from '../src/admin/app/format';
import { BackendService } from '../src/service';
import { adminHeaders, get, post } from './helpers/http';

jest.setTimeout(120000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
let pgReachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  pgReachable = true;
} catch {
  pgReachable = false;
}

const FIXTURES = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures');
function project(fixture: string): WorldSchema {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  const files: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
  const out = projectWorld(files);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.schema;
}

interface Body {
  error?: string;
  description?: string;
}
interface Listed {
  name: string;
  description?: string;
  columns: Column[];
  checks?: RuleStatus[];
  indexes?: Array<{ fields: string[]; unique: boolean; where?: unknown; declared: boolean }>;
}

describe('ONT-003 — the names the manager would refuse', () => {
  // The projection keeps the person's words as names. Some are words SQLite keeps for itself
  // (PLAN, ON): the engines quote every name, so the write succeeds, but the manager refuses
  // them for a field made by hand. Recorded here rather than renamed behind the person's back.
  it.each([
    ['world', ['Account.plan', 'Session.on']],
    ['world-every-kind', ['Account.plan']]
  ])('%s', (fixture, expected) => {
    const schema = project(fixture);
    const refused: string[] = [];
    for (const c of schema.collections) {
      if (validCollectionName(c.name, [])) refused.push(c.name);
      for (const col of c.columns) if (validName(col.name, [], 'The field')) refused.push(`${c.name}.${col.name}`);
    }
    expect(refused).toEqual(expected);
  });
});

function engineSuite(engine: 'sqlite' | 'postgres', storageUrl: () => string | null) {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let previousEnv: string | undefined;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `ont003-write-${engine}-`));
    previousEnv = process.env.NODEGX_STORAGE_URL;
    const url = storageUrl();
    if (url) process.env.NODEGX_STORAGE_URL = url;
    else delete process.env.NODEGX_STORAGE_URL;
    service = new BackendService({ dataDir, port: 0, backendId: `ont003_${engine}`, backendName: 'ONT-003' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    try {
      await service.stop();
    } catch {
      /* already stopped */
    }
    if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
    else process.env.NODEGX_STORAGE_URL = previousEnv;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC3: every projected collection is listed with the person’s sentence and the tiles the kinds named', async () => {
    const schema = project('world-every-kind');
    for (const push of schemaPushes(schema)) {
      const res = await post<Body>(base, '/admin/schema', push, adminHeaders(dataDir));
      expect([push.table, res.status, res.json.error]).toEqual([push.table, 200, undefined]);
    }
    const listed = (await get<{ tables: Listed[] }>(base, '/admin/schema', adminHeaders(dataDir))).json.tables;

    for (const c of schema.collections) {
      const t = listed.find((x) => x.name === c.name);
      expect([c.name, Boolean(t)]).toEqual([c.name, true]);
      expect(t!.description).toBe(c.description);
      // The description opens with the sentence, and says what is not kept when something is not.
      expect(t!.description!.startsWith(c.sentence)).toBe(true);
      expect(t!.description!.includes('Not kept by the database yet')).toBe(c.notHeld.length > 0);

      for (const col of c.columns) {
        const got = t!.columns.find((x) => x.name === col.name);
        expect([c.name, col.name, Boolean(got)]).toEqual([c.name, col.name, true]);
        expect([c.name, col.name, kindOf(got!, t!.checks).id, got!.type, got!.targetClass, Boolean(got!.required)]).toEqual([
          c.name,
          col.name,
          col.kind,
          col.type,
          col.targetClass,
          Boolean(col.required)
        ]);
      }
      const rules = (t!.checks || []).filter((k) => k.declared).map((k) => k.rule);
      expect(rules).toEqual(c.checks);
      const indexes = (t!.indexes || []).filter((i) => i.declared).map((i) => ({ fields: i.fields, unique: i.unique, ...(i.where ? { where: i.where } : {}) }));
      expect(indexes).toEqual(c.indexes);
    }
  });

  it('the one table route says the description too, and a collection made without one has none', async () => {
    const one = (await get<Body>(base, '/admin/schema/Membership', adminHeaders(dataDir))).json;
    expect(one.description).toMatch(/^A person is on one account at a time/);
    const plain = await post<Body>(base, '/admin/schema', { action: 'createTable', table: 'Plain', columns: [], description: '   ' }, adminHeaders(dataDir));
    expect(plain.status).toBe(200);
    expect('description' in (await get<Body>(base, '/admin/schema/Plain', adminHeaders(dataDir))).json).toBe(false);
  });
}

describe('ONT-003 write — SQLite', () => {
  engineSuite('sqlite', () => null);
});

(pgReachable ? describe : describe.skip)('ONT-003 write — PostgreSQL', () => {
  const DB = `nodegx_ont003w_${process.pid}_${Date.now().toString(36)}`;
  const url = new URL(ADMIN_URL);
  url.pathname = `/${DB}`;
  beforeAll(() => psql(ADMIN_URL, `CREATE DATABASE "${DB}"`));
  afterAll(() => {
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
    } catch {
      /* the next run uses a new name anyway */
    }
  });
  engineSuite('postgres', () => url.toString());
});
