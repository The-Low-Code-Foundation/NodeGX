/**
 * BMG-002 AC1 + AC2 — the filter row's `where`.
 *
 * AC1: every operator the page offers produces a `where` the backend accepts
 * AND that returns the right rows. "Right" is decided by `expected()` below —
 * a second, independent reading of each row written from what the operator
 * SAYS to a person, not from the `where` — and compared with the count
 * `GET /api/Task?count=1` answers on a real service over real sockets.
 *
 * AC2: `fromWhere(toWhere(rows))` is identity for every operator, and a
 * hand-written filter with `$and`/`$or` nesting becomes rows.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { Cond, FilterField, Group, OPS, describe as say, fromWhere, toWhere, windowRange } from '../src/admin/app/filters';

import { request } from './helpers/http';

jest.setTimeout(30000);

const FIELDS: FilterField[] = [
  { name: 'objectId', kind: 'text' },
  { name: 'title', kind: 'text' },
  { name: 'n', kind: 'number' },
  { name: 'done', kind: 'boolean' },
  { name: 'due', kind: 'date' },
  { name: 'owner', kind: 'link', targetClass: 'Person' },
  { name: 'tags', kind: 'list' },
  { name: 'at', kind: 'location' },
  { name: 'createdAt', kind: 'date' }
];

const NOW = new Date();
const day = (offset: number, hour = 12) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offset, hour);
const ymd = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

type Row = Record<string, any>;

/** The seeded Task rows, before the backend adds ids. `owner` is filled with a Person index. */
const SEED: Row[] = [
  { title: 'open', n: 1, done: true, due: day(0), owner: 0, tags: ['red', 'blue'], at: LONDON },
  { title: 'open door', n: 5, done: false, due: day(-1), owner: 1, tags: ['redwood'], at: PARIS },
  { title: 'closed', n: 10, done: true, due: day(-3), owner: 0, tags: [] },
  { title: '', n: 0, due: day(-10), tags: ['blue'] },
  { title: 'a.b(c)', n: -2, done: false, due: day(-40) },
  { n: 7, due: day(1) },
  { title: 'Opening', done: true, tags: ['red'] },
  { title: 'closed', n: 5 }
];

function asDate(v: unknown): Date | null {
  if (!v) return null;
  const s = typeof v === 'object' && (v as Row).iso ? (v as Row).iso : v;
  const d = new Date(String(s));
  return isNaN(d.getTime()) ? null : d;
}

const missing = (v: unknown) => v === null || v === undefined;

function km(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.latitude - a.latitude);
  const dLng = r(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** What the row SAYS to a person. Written without looking at `toWhere`. */
function expected(row: Row, c: Cond): boolean {
  const v = row[c.field];
  const f = FIELDS.find((x) => x.name === c.field)!;
  switch (f.kind) {
    case 'text': {
      const s = missing(v) ? null : String(v);
      if (c.op === 'is') return s === c.value;
      if (c.op === 'isNot') return s !== c.value;
      if (c.op === 'contains') return s !== null && s.toLowerCase().includes(String(c.value).toLowerCase());
      if (c.op === 'startsWith') return s !== null && s.startsWith(String(c.value));
      if (c.op === 'empty') return s === null || s === '';
      if (c.op === 'notEmpty') return s !== null && s !== '';
      if (c.op === 'oneOf') return s !== null && (c.values || []).includes(s);
      break;
    }
    case 'number': {
      const x = missing(v) ? null : Number(v);
      const a = Number(c.value);
      if (c.op === 'empty') return x === null;
      if (c.op === 'ne') return x !== a;
      if (x === null) return false;
      if (c.op === 'eq') return x === a;
      if (c.op === 'lt') return x < a;
      if (c.op === 'lte') return x <= a;
      if (c.op === 'gt') return x > a;
      if (c.op === 'gte') return x >= a;
      if (c.op === 'between') return x >= a && x <= Number(c.value2);
      break;
    }
    case 'boolean':
      return c.op === 'yes' ? v === true : v !== true;
    case 'date': {
      const d = asDate(v);
      if (c.op === 'empty') return d === null;
      if (!d) return false;
      if (c.op === 'on') return ymd(d) === c.value;
      if (c.op === 'before') return ymd(d) < String(c.value);
      if (c.op === 'after') return ymd(d) > String(c.value);
      if (c.op === 'between') return ymd(d) >= String(c.value) && ymd(d) <= String(c.value2);
      if (c.op === 'within') {
        const [a, b] = windowRange(String(c.value), NOW);
        return d >= a && d < b;
      }
      break;
    }
    case 'link': {
      const id = missing(v) ? null : typeof v === 'object' ? v.objectId : v;
      return c.op === 'empty' ? id === null : id === c.value;
    }
    case 'list':
      if (c.op === 'empty') return missing(v) || (Array.isArray(v) && v.length === 0);
      return Array.isArray(v) && v.includes(c.value);
    case 'location':
      return !missing(v) && km({ latitude: Number(c.lat), longitude: Number(c.lng) }, v) <= Number(c.value);
  }
  throw new Error('no expectation for ' + c.field + ' ' + c.op);
}

/** One condition per operator, with a value that splits the seed. `person` fills a link. */
function everyOperator(person: string): Cond[] {
  const c = (field: string, op: string, extra: Partial<Cond> = {}): Cond => ({ kind: 'cond', field, op, ...extra });
  return [
    c('title', 'is', { value: 'closed' }),
    c('title', 'isNot', { value: 'closed' }),
    c('title', 'contains', { value: 'OPEN' }),
    c('title', 'startsWith', { value: 'open' }),
    c('title', 'startsWith', { value: 'a.b(' }),
    c('title', 'empty'),
    c('title', 'notEmpty'),
    c('title', 'oneOf', { values: ['open', 'closed'] }),
    c('n', 'eq', { value: '5' }),
    c('n', 'ne', { value: '5' }),
    c('n', 'lt', { value: '5' }),
    c('n', 'lte', { value: '5' }),
    c('n', 'gt', { value: '5' }),
    c('n', 'gte', { value: '5' }),
    c('n', 'between', { value: '0', value2: '7' }),
    c('n', 'empty'),
    c('done', 'yes'),
    c('done', 'no'),
    c('due', 'on', { value: ymd(day(-1)) }),
    c('due', 'before', { value: ymd(day(-3)) }),
    c('due', 'after', { value: ymd(day(-3)) }),
    c('due', 'between', { value: ymd(day(-10)), value2: ymd(day(-1)) }),
    c('due', 'within', { value: 'today' }),
    c('due', 'within', { value: 'week' }),
    c('due', 'within', { value: 'month' }),
    c('due', 'within', { value: 'past7' }),
    c('due', 'within', { value: 'past30' }),
    c('due', 'empty'),
    c('owner', 'is', { value: person }),
    c('owner', 'empty'),
    c('tags', 'contains', { value: 'red' }),
    c('tags', 'empty'),
    c('at', 'near', { lat: String(LONDON.latitude), lng: String(LONDON.longitude), value: '10' }),
    c('at', 'near', { lat: String(LONDON.latitude), lng: String(LONDON.longitude), value: '400' })
  ];
}

const one = (c: Cond): Group => ({ kind: 'group', conj: 'and', items: [c] });

describe('BMG-002 AC2 — rows and `where` round-trip', () => {
  it('covers every operator the page offers', () => {
    const offered = new Set<string>();
    (Object.keys(OPS) as Array<keyof typeof OPS>).forEach((k) => OPS[k].forEach((o) => offered.add(k + ':' + o.id)));
    const tested = new Set(everyOperator('x').map((c) => FIELDS.find((f) => f.name === c.field)!.kind + ':' + c.op));
    expect([...offered].filter((o) => !tested.has(o))).toEqual([]);
  });

  it.each(everyOperator('p1').map((c) => [c.field + ' ' + c.op + ' ' + (c.value || (c.values || []).join('|')), c]))('%s', (_, c) => {
    const where = toWhere(one(c as Cond), FIELDS, NOW);
    expect(fromWhere(JSON.parse(JSON.stringify(where)), FIELDS, NOW)).toEqual(one(c as Cond));
  });

  it('keeps groups, and nested groups, and the and/or of each', () => {
    const g: Group = {
      kind: 'group',
      conj: 'and',
      items: [
        { kind: 'cond', field: 'title', op: 'is', value: 'open' },
        {
          kind: 'group',
          conj: 'or',
          items: [
            { kind: 'cond', field: 'n', op: 'gt', value: '3' },
            { kind: 'cond', field: 'done', op: 'no' },
            { kind: 'group', conj: 'and', items: [{ kind: 'cond', field: 'tags', op: 'empty' }, { kind: 'cond', field: 'due', op: 'within', value: 'week' }] }
          ]
        }
      ]
    };
    expect(fromWhere(toWhere(g, FIELDS, NOW), FIELDS, NOW)).toEqual(g);
  });

  it('turns a hand-written $and/$or filter into rows', () => {
    const hand = { $or: [{ title: 'open', n: { $gte: 2, $lte: 9 } }, { $and: [{ done: true }, { owner: { __type: 'Pointer', className: 'Person', objectId: 'p9' } }] }] };
    expect(fromWhere(hand, FIELDS, NOW)).toEqual({
      kind: 'group',
      conj: 'or',
      items: [
        { kind: 'group', conj: 'and', items: [{ kind: 'cond', field: 'title', op: 'is', value: 'open' }, { kind: 'cond', field: 'n', op: 'between', value: '2', value2: '9' }] },
        { kind: 'group', conj: 'and', items: [{ kind: 'cond', field: 'done', op: 'yes' }, { kind: 'cond', field: 'owner', op: 'is', value: 'p9' }] }
      ]
    });
  });

  it('answers null — never a narrower filter — for what a row cannot say', () => {
    expect(fromWhere({ nope: 1 }, FIELDS, NOW)).toBeNull();
    expect(fromWhere({ title: { $regex: 'a.*b' } }, FIELDS, NOW)).toBeNull();
    expect(fromWhere({ $relatedTo: { object: { __type: 'Pointer', className: 'X', objectId: 'y' }, key: 'k' } }, FIELDS, NOW)).toBeNull();
    expect(fromWhere({ due: { $gt: { __type: 'Date', iso: '2026-01-01T10:30:00.000Z' } } }, FIELDS, NOW)).toBeNull();
    expect(fromWhere({ $or: [{ title: 'a' }, { nope: 1 }] }, FIELDS, NOW)).toBeNull();
  });

  it('says the filter back as a sentence', () => {
    const g: Group = {
      kind: 'group',
      conj: 'and',
      items: [
        { kind: 'cond', field: 'title', op: 'is', value: 'open' },
        { kind: 'cond', field: 'n', op: 'between', value: '1', value2: '4' },
        { kind: 'cond', field: 'due', op: 'within', value: 'past7' }
      ]
    };
    expect(say(g, FIELDS)).toBe('title is open and n is between 1 and 4 and due is within the past 7 days');
  });
});

describe('BMG-002 AC1 — each operator returns the right rows from a real backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let admin: Record<string, string>;
  let people: string[] = [];
  let rows: Row[] = [];
  const req = <T = unknown>(method: string, p: string, body?: unknown) => request<T>(base, method, p, { body, headers: admin });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg002-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_bmg002', backendName: 'BMG-002' });
    base = (await service.start()).listen.url;
    admin = { authorization: 'Bearer ' + JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken };
    expect((await req('POST', '/admin/schema', { action: 'createTable', table: 'Person', columns: [{ name: 'name', type: 'String' }] })).status).toBeLessThan(300);
    const made = await req('POST', '/admin/schema', {
      action: 'createTable',
      table: 'Task',
      columns: [
        { name: 'title', type: 'String' },
        { name: 'n', type: 'Number' },
        { name: 'done', type: 'Boolean' },
        { name: 'due', type: 'Date' },
        { name: 'owner', type: 'Pointer', targetClass: 'Person' },
        { name: 'tags', type: 'Array' },
        { name: 'at', type: 'GeoPoint' }
      ]
    });
    expect(made.status).toBeLessThan(300);
    for (const name of ['Ann', 'Bob']) {
      const p = await req<{ objectId: string }>('POST', '/api/Person', { name });
      people.push(p.json.objectId);
    }
    for (const seed of SEED) {
      const body: Row = { ...seed };
      if (seed.due) body.due = { __type: 'Date', iso: seed.due.toISOString() };
      if (seed.owner !== undefined) body.owner = { __type: 'Pointer', className: 'Person', objectId: people[seed.owner] };
      if (seed.at) body.at = { __type: 'GeoPoint', ...seed.at };
      const r = await req<{ objectId: string }>('POST', '/api/Task', body);
      expect(r.status).toBe(201);
    }
    const all = await req<{ results: Row[] }>('GET', '/api/Task?limit=100');
    rows = all.json.results;
    expect(rows).toHaveLength(SEED.length);
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('reads the seed back the way the expectation reads it', () => {
    // Guards the grader: a field the backend hands back in another shape than
    // `expected` assumes would make every count below agree for the wrong reason.
    const open = rows.find((r) => r.title === 'open')!;
    expect(asDate(open.due)!.getTime()).toBe(day(0).getTime());
    expect(open.tags).toEqual(['red', 'blue']);
    expect(open.owner.objectId || open.owner).toBe(people[0]);
    expect(open.at.latitude).toBeCloseTo(LONDON.latitude);
  });

  it('every operator: the server count equals the expected count, and no operator is vacuous', async () => {
    const report: string[] = [];
    const wrong: string[] = [];
    for (const c of everyOperator('')) {
      if (c.field === 'owner' && c.op === 'is') c.value = people[0];
      const want = rows.filter((r) => expected(r, c)).length;
      const where = toWhere(one(c), FIELDS, NOW);
      const res = await req<{ results: Row[]; count: number; error?: string }>('GET', '/api/Task?count=1&limit=100&where=' + encodeURIComponent(JSON.stringify(where)));
      const got = res.status === 200 ? res.json.count : 'HTTP ' + res.status + ' ' + (res.json && res.json.error);
      const line = c.field + ' ' + c.op + ' ' + (c.value || (c.values || []).join('|')) + ': want ' + want + ', got ' + got;
      report.push(line);
      if (got !== want) wrong.push(line);
    }
    // A table of all-zero or all-eight counts grades nothing; the seed was
    // built so most operators split it.
    const counts = report.map((l) => Number(/want (\d+)/.exec(l)![1]));
    expect(counts.filter((n) => n > 0 && n < SEED.length).length).toBeGreaterThan(counts.length * 0.75);
    expect(wrong).toEqual([]);
  });
});
