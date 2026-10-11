/**
 * P116 ONT-005 — the mistakes are mutants, graded on two engines.
 *
 * `worldMutants()` (`@nodegx/project-contract/world`) makes every classic mistake as a schema:
 * each kind's seeds (Richard's rows, the census, the notes, the task's list), one per answered
 * question whose removal changes the schema, one per property stored as text. What
 * `gradeStatically()` cannot decide — a mutant that keeps every claim's home but changes a rule
 * or a type — is run here: the right schema's held claims (ONT-003) against the mutant schema,
 * on SQLite and PostgreSQL, through the conformance runner. A claim that fails on the mutant
 * **kills** it: what the person said stops the mistake. One that passes every claim survives, and
 * the survivors are printed, counted and pinned — the vocabulary's honesty number (AC1): never
 * hidden, and a change in either direction is red until the pin is read and moved.
 *
 * The engine is never asked about a claim with no home on the mutant (a missing collection or
 * field): both engines auto-create one on first write, and a claim passing through a table the
 * mutant never declared would be a gate with a hole shaped like the defect.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { IStorageAdapter } from '@noodl/backend-contract';
import {
  runClaim,
  runConformance,
  saysTheRule,
  type ClaimSchema,
  type Claim,
  type ConformanceCase
} from '@noodl/backend-contract/conformance';

import {
  gradeStatically,
  worldMutants,
  type StaticVerdict,
  type WorldFiles,
  type WorldMutant,
  type WorldSchema
} from '../../nodegx-project-contract/world';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';
import { deletesThroughTheFacade } from './helpers/facade-deletes';

jest.setTimeout(600000);

const FIXTURES = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures');
const WORLDS = ['world', 'world-every-kind', 'world-membership', 'world-categories'] as const;

function readWorld(fixture: string): WorldFiles {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  return { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
}

type Engine = { name: string; make: () => Promise<IStorageAdapter>; teardown: () => Promise<void>; available: boolean };

function sqlite(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont005-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      // R10: the backend's own delete, which keeps every link's "when it goes" rule.
      return deletesThroughTheFacade(h.adapter);
    },
    async teardown() {
      for (const h of handles) await h.adapter.disconnect();
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    }
  };
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont005_${process.pid}_${Date.now().toString(36)}`;
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
function postgres(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  const u = new URL(ADMIN_URL);
  u.pathname = `/${DB_NAME}`;
  let created = false;
  return {
    name: 'postgres',
    available: pgReachable(),
    async make() {
      if (!created) {
        psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
        created = true;
      }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont005-pg-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir, storageUrl: u.toString() });
      handles.push(h);
      // R10: the backend's own delete, which keeps every link's "when it goes" rule.
      return deletesThroughTheFacade(h.adapter);
    },
    async teardown() {
      for (const h of handles) {
        try {
          await h.adapter.disconnect();
        } catch {
          /* best-effort teardown */
        }
      }
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
      if (created) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
        } catch {
          /* a client still attached; the next run uses a new name anyway */
        }
      }
    }
  };
}

// The compile-time half: the projection's schema IS the runner's, with no cast.
const asRunnerSchema = (s: WorldSchema): ClaimSchema => s;

/** A mutant's fate once the engine has spoken. */
interface Verdict {
  id: string;
  seeds: string[];
  verdict: 'killed' | 'survives' | 'not-applicable';
  /** Killed: what killed it. */
  by?: string;
  /** Killed by a claim: which, at which step, and whether that step says the rule. */
  claim?: string;
  step?: number;
  atTheRule?: boolean;
  /** Survives: the class, and what would kill it. */
  as?: 'unanswered' | 'unkept' | 'unclaimed';
  kills?: string;
}

const killer = (m: WorldMutant): string =>
  'question' in m.kills
    ? `${m.kills.question}: "${m.kills.ask}"`
    : 'kind' in m.kills
    ? `the kind (${m.kills.kind})`
    : `the tile (${m.kills.tile})`;

/**
 * Grades every mutant of a world on one engine: the static verdicts as they are, the rest by
 * running the named held claims against the mutant schema. One adapter, one run; a case per
 * (mutant, claim) that records where the claim stopped and never throws, so the runner is the
 * driver and the verdict is read from the records.
 */
async function grade(
  engine: Engine,
  fixture: string
): Promise<{ verdicts: Verdict[]; right: WorldSchema; mutants: WorldMutant[] }> {
  const { right, mutants } = worldMutants(readWorld(fixture));
  const statics = new Map<string, StaticVerdict>(mutants.map((m) => [m.id, gradeStatically(right, m)]));
  const byId = new Map(right.claims.map((c) => [c.id, c]));
  const stopped = new Map<string, { claim: string; at: number; message?: string }[]>();
  const cases: ConformanceCase[] = [];
  for (const m of mutants) {
    const v = statics.get(m.id)!;
    if (v.verdict !== 'run') continue;
    for (const id of v.claims) {
      const claim = byId.get(id)! as Claim;
      cases.push({
        id: `mutants/${m.id}/${id}`,
        area: 'claims',
        pins: `${m.mistake} — against "${claim.says}"`,
        async run(ctx) {
          const run = await runClaim(ctx, asRunnerSchema(m.schema!), claim);
          if (run.at >= 0) {
            const list = stopped.get(m.id) || [];
            list.push({ claim: id, at: run.at, message: run.message });
            stopped.set(m.id, list);
          }
        }
      });
    }
  }
  const report = await runConformance(engine.make, { adapter: `${engine.name} — ${fixture} mutants` }, { cases });
  if (report.failed)
    throw new Error(`the driver itself failed on ${engine.name}: ${JSON.stringify(report.failures.slice(0, 3))}`);

  const verdicts: Verdict[] = mutants.map((m) => {
    const v = statics.get(m.id)!;
    if (v.verdict === 'killed')
      return { id: m.id, seeds: m.seeds, verdict: 'killed', by: v.by, ...('claim' in v ? { claim: v.claim } : {}) };
    if (v.verdict === 'survives') return { id: m.id, seeds: m.seeds, verdict: 'survives', as: v.as, kills: killer(m) };
    if (v.verdict === 'not-applicable') return { id: m.id, seeds: m.seeds, verdict: 'not-applicable' };
    if (v.verdict === 'cannot') throw new Error(`${m.id} cannot be made: ${v.why}`);
    const hits = stopped.get(m.id) || [];
    if (!hits.length) return { id: m.id, seeds: m.seeds, verdict: 'survives', as: v.as, kills: killer(m) };
    // Attribute the kill to the mutant's own relation's claim when one hit, else the first.
    const own =
      hits.find(
        (h) =>
          'relation' in m.of && JSON.stringify(byId.get(h.claim)!.from) === JSON.stringify({ relation: m.of.relation })
      ) || hits[0];
    const claim = byId.get(own.claim)!;
    return {
      id: m.id,
      seeds: m.seeds,
      verdict: 'killed',
      by: 'a claim',
      claim: own.claim,
      step: own.at,
      atTheRule: saysTheRule(claim.steps[own.at])
    };
  });
  return { verdicts, right, mutants };
}

/** The honesty number, as one line per world and engine, and the survivors by class. */
function honesty(engine: string, fixture: string, verdicts: Verdict[]): string {
  const killed = verdicts.filter((v) => v.verdict === 'killed');
  const byClaim = killed.filter((v) => v.by === 'a claim');
  const survivors = verdicts.filter((v) => v.verdict === 'survives');
  const na = verdicts.filter((v) => v.verdict === 'not-applicable');
  const count = (as: string) => survivors.filter((v) => v.as === as).length;
  const lines = [
    `[ONT-005] ${fixture} on ${engine}: ${verdicts.length} mutants — ${killed.length} killed (${
      byClaim.length
    } by a claim, ${byClaim.filter((v) => v.atTheRule).length} at the rule's step; ${
      killed.filter((v) => v.by === 'no home').length
    } no home; ${killed.filter((v) => v.by === 'the question').length} by the question), ${
      survivors.length
    } survive (${count('unanswered')} unanswered, ${count('unkept')} unkept by the engine, ${count(
      'unclaimed'
    )} unclaimed), ${na.length} not applicable`
  ];
  for (const v of killed)
    lines.push(
      `    killed (${v.by}${
        v.claim
          ? ` ← ${v.claim}${v.step !== undefined ? ` at step ${v.step}${v.atTheRule ? ', the rule' : ', a row'}` : ''}`
          : ''
      }): ${v.id}${v.seeds.length ? ` [${v.seeds.join(', ')}]` : ''}`
    );
  for (const v of survivors)
    lines.push(
      `    survives (${v.as}): ${v.id}${v.seeds.length ? ` [${v.seeds.join(', ')}]` : ''} — killed by ${v.kills}`
    );
  return lines.join('\n');
}

/**
 * AC1's pin: the survivors of each world, by class. A mutant killed here that this list says
 * survives, or the other way round, is red — read the honesty number before moving a line.
 * Identical on both engines (the test says so).
 *
 * R10 (2026-10-09): a link's "when it goes" rule is kept by the backend at delete time, so in every
 * world two fell — the link with that question unanswered, and the link stored as text (the held
 * `…-blocks` claim now fails on it). every-kind 18 → 16 of 38. A text id beside a kind
 * (`note-about`, points-at-one-of) names no one collection and still survives, as it must.
 *
 * ONT-014 (2026-10-11): *set once*, *never edited* and *never deleted* are kept by the backend inside
 * the write (`onlyWhile`), so their mistakes fall at the claim that says them: a link that moves
 * (`moves-unanswered`), a log anyone may edit (`editable-history`), ending or merging by deleting
 * (`merge-by-delete`; `end-by-delete` in world and membership — every-kind's survives, unclaimed).
 * every-kind 16 → 13 of 38; world 14 → 11; membership 8 → 4.
 *
 * ONT-011 step 2 (s18): every-kind gained a `quote` noun and `quote-sent` (settled): 7 mutants more, 45 in all;
 * settled's six (four seeds, two unanswered questions that change the schema) are all killed at its three held
 * claims or for want of a home; the one survivor added is the quote's number stored as text, the noun's own
 * property mutant, unclaimed like the slot's. 13 of 38 → 14 of 45.
 *
 * ONT-011 step 2, the other three borrows (s19): the noun's own questions and the `ends` kind's note questions.
 * every-kind gained a `settings` noun and six answers: 51 mutants; `account/history-unanswered` falls for want of a
 * home (the history collection's required link), `leaves/endNote-`, `endNoteNeeded-unanswered` and the seed
 * `note-always-optional` fall at the held all-or-none claim — which also takes `leaves/end-by-delete` (unsaid, so
 * `endedAt` is gone and the claim has no home). Two survive by design, unkept, each naming the step that keeps it:
 * `settings/onlyOne-unanswered` (across records, ONT-013 step 4) and `person/secret-unanswered` (the per-field read
 * rule, step 4). 14 of 45 → 15 of 51. `world` and `membership` never answer `leaves/endNote`: +1 unanswered each.
 *
 * ONT-011 step 4 (s20): a secret detail is a per-field read rule, held (`fields.<f>.read: "nobody"`) and claimed as
 * a person signed in (`unseen`); `person/secret-unanswered` falls at that claim. 15 of 51 → 14 of 51.
 *
 * ONT-015 (s22): the read-aloud number is the store's series, held (`numbered`, mutant `dropSeries`). The pin does
 * not move: `session/number-reused` (read aloud unanswered) was already killed for want of a home, and the series'
 * own mutant is a claim mutant (`ont-003-claims`), not one of these 51. Still 14 of 51.
 */
const SURVIVORS: Record<(typeof WORLDS)[number], string[]> = {
  world: [
    'membership/sameTime-unanswered (unanswered)',
    'membership/startsEnds-unanswered (unclaimed)',
    'plan-size/retires-unanswered (unanswered)',
    'on-the-course-platform/silent-skip (unkept)',
    'leaves/endNote-unanswered (unanswered)',
    'attended/undo-unanswered (unanswered)',
    'attended/who-unanswered (unclaimed)',
    'note-about/whenTargetGoes-unanswered (unanswered)',
    'note-author/path-unanswered (unanswered)',
    'note-author/visible-to-all (unkept)',
    'account/renews-as-text (unclaimed)',
    'session/on-as-text (unclaimed)'
  ],
  'world-every-kind': [
    'plan-size/retires-unanswered (unkept)',
    'topic-tree/ownAncestor-unanswered (unkept)',
    'on-the-course-platform/silent-skip (unkept)',
    'attended/who-unanswered (unclaimed)',
    'note-author/visible-to-all (unkept)',
    'person-profile/filter-field-split-off (unclaimed)',
    'person-profile/sort-key-copied (unclaimed)',
    'invite-for/the-text-itself (unclaimed)',
    'note-about/whenTargetGoes-unanswered (unkept)',
    'settings/onlyOne-unanswered (unkept)',
    'session/heldOn-as-text (unclaimed)',
    'slot/starts-as-text (unclaimed)',
    'slot/open-as-text (unclaimed)',
    'quote/amount-as-text (unclaimed)'
  ],
  'world-membership': [
    'membership/startsEnds-unanswered (unclaimed)',
    'employment/startsEnds-unanswered (unclaimed)',
    'topic-tree/ownAncestor-unanswered (unkept)',
    'signed-up/who-unanswered (unclaimed)',
    'leaves/endNote-unanswered (unanswered)'
  ],
  'world-categories': [
    'subcategory-category/retires-unanswered (unkept)',
    'product/price-as-text (unclaimed)'
  ]
};

const results = new Map<string, Verdict[]>();

for (const engine of [sqlite(), postgres()]) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-005 — the mistakes, on ${engine.name}`, () => {
    afterAll(() => engine.teardown());

    describe.each(WORLDS)('%s', (fixture) => {
      let verdicts: Verdict[];
      beforeAll(async () => {
        verdicts = (await grade(engine, fixture)).verdicts;
        results.set(`${engine.name}/${fixture}`, verdicts);
        // eslint-disable-next-line no-console
        console.log(honesty(engine.name, fixture, verdicts));
      });

      it('AC1: every mutant is killed, or named in the survivors with what would kill it', () => {
        const survivors = verdicts.filter((v) => v.verdict === 'survives').map((v) => `${v.id} (${v.as})`);
        expect(survivors).toEqual(SURVIVORS[fixture]);
        for (const v of verdicts.filter((x) => x.verdict === 'survives'))
          expect([v.id, v.kills!.length > 0]).toEqual([v.id, true]);
      });

      it('a kill by a claim lands on a step the right schema passes — never while making its rows', () => {
        for (const v of verdicts.filter((x) => x.verdict === 'killed' && x.by === 'a claim')) {
          expect([v.id, typeof v.step]).toEqual([v.id, 'number']);
        }
      });
    });
  });
}

describe('ONT-005 — the two engines agree', () => {
  it('every mutant has the same verdict on SQLite and PostgreSQL, when both ran', () => {
    const pg = [...results.keys()].filter((k) => k.startsWith('postgres/'));
    if (!pg.length) return;
    for (const key of pg) {
      const fixture = key.slice('postgres/'.length);
      const a = results.get(`local-sql (node:sqlite)/${fixture}`)!;
      const b = results.get(key)!;
      expect(b.map((v) => [v.id, v.verdict, v.as, v.claim])).toEqual(a.map((v) => [v.id, v.verdict, v.as, v.claim]));
    }
  });
});

describe("ONT-005 — AC3, Richard's category and subcategory, on SQLite", () => {
  const engine = sqlite();
  afterAll(() => engine.teardown());

  it('answered, the free-text mutant dies at the step that says the list; unanswered, nothing stops it', async () => {
    const { verdicts } = await grade(engine, 'world-categories');
    const free = verdicts.find((v) => v.id === 'subcategory-category/free-text')!;
    expect(free).toMatchObject({
      verdict: 'killed',
      by: 'a claim',
      claim: 'subcategory/category-is-one-of-its-list',
      atTheRule: true
    });
    const { right, mutants } = worldMutants(readWorld('world-categories-unanswered'));
    expect(right.claims.filter((c) => JSON.stringify(c.steps).includes('category'))).toEqual([]);
    expect(mutants.map((m) => m.id)).toEqual(['product/price-as-text']);
  });

  it('AC2, the engine half: with "must every product have a subcategory?" unanswered, exactly that mutant survives, as unanswered', async () => {
    const files = readWorld('world-categories');
    const r = files.relations.relations.find((x) => x.id === 'product-subcategory')!;
    delete r.answers!.required;
    const { right, mutants } = worldMutants(files);
    const unanswered = mutants
      .filter((m) => gradeStatically(right, m).verdict === 'survives' && 'unanswered' in m.shape)
      .map((m) => m.id);
    expect(unanswered).toEqual(['product-subcategory/required-unanswered']);
  });
});
