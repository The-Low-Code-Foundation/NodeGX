/**
 * P116 ONT-005 — the mistakes are mutants, before any engine.
 *
 * What this file can decide without a store: that every seed of every kind is executable
 * (made, or killed by the question with the validator's words); that a mutant differs from the
 * right schema or survives for a named reason; that a change of kind is killed before any
 * projection; that a claim with no home on the mutant is a kill the engine must never be asked
 * to measure; and AC2's static half: removing any one answer that matters makes exactly that
 * question the one the runner asks. The engine half is `nodegx-backend/tests/ont-005-mutants.test.ts`.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  gradeStatically,
  questionsToAsk,
  WORLD_FILES,
  WORLD_KINDS,
  worldMutants,
  type WorldFiles,
  type WorldMutant
} from '../world';

const FIXTURES = path.join(__dirname, 'fixtures');
const WORLDS = ['world', 'world-every-kind', 'world-membership', 'world-categories'] as const;

function readWorld(fixture: string): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, f), 'utf8'));
  return {
    nouns: read(WORLD_FILES.nouns),
    relations: read(WORLD_FILES.relations),
    vocabulary: read(WORLD_FILES.vocabulary)
  };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('the seeds are executable', () => {
  it('every seed of every kind names the question that kills it, and a shape', () => {
    for (const k of WORLD_KINDS)
      for (const m of k.mutants) {
        expect([k.id, m.id, m.kills === 'the kind' || k.questions.some((q) => q.id === m.kills)]).toEqual([
          k.id,
          m.id,
          true
        ]);
        expect([k.id, m.id, Object.keys(m.shape).filter((x) => x !== 'answers').length]).toEqual([k.id, m.id, 1]);
      }
  });

  it('on the every-kind world, every seed is made or killed by the question — none "cannot"', () => {
    const { mutants } = worldMutants(readWorld('world-every-kind'));
    const seeded = new Set(mutants.flatMap((m) => m.seeds.map((s) => `${'relation' in m.of ? m.of.kind : ''}/${s}`)));
    for (const k of WORLD_KINDS)
      for (const s of k.mutants) expect([k.id, s.id, seeded.has(`${k.id}/${s.id}`)]).toEqual([k.id, s.id, true]);
    expect(mutants.filter((m) => m.cannot).map((m) => `${m.id}: ${m.cannot}`)).toEqual([]);
    // Two seeds are the other answer to a question this world gave: a membership lets two people share an
    // account, and a booking has no start or end. Said so, not hidden as "cannot".
    expect(mutants.filter((m) => m.notApplicable).map((m) => `${m.id}: ${m.notApplicable}`)).toEqual([
      'membership/no-slot-rule: this world answered "sameTime" true, and the mistake is the other answer',
      'booking/no-end: this world answered "startsEnds" false, and the mistake is the other answer'
    ]);
  });

  it.each(WORLDS)('%s: the same world makes the same mutants twice', (fixture) => {
    const a = worldMutants(readWorld(fixture));
    const b = worldMutants(clone(readWorld(fixture)));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it.each(WORLDS)(
    '%s: every mutant is a change of kind, differs from the right schema, or survives for a named reason',
    (fixture) => {
      const { right, mutants } = worldMutants(readWorld(fixture));
      for (const m of mutants) {
        const v = gradeStatically(right, m);
        if (m.made === 'question')
          expect([m.id, v.verdict, 'by' in v ? v.by : '']).toEqual([m.id, 'killed', 'the question']);
        else if (m.notApplicable) expect([m.id, v.verdict]).toEqual([m.id, 'not-applicable']);
        else if (JSON.stringify(m.schema!.collections) === JSON.stringify(right.collections))
          expect([m.id, v.verdict]).toEqual([m.id, 'survives']);
        else expect([m.id, v.verdict === 'killed' || v.verdict === 'run']).toEqual([m.id, true]);
      }
    }
  );
});

describe('what is decided before any engine', () => {
  const { right, mutants } = worldMutants(readWorld('world-every-kind'));
  /** By id, or by `<relation>/<seed>` when the seed names a per-question mutant. */
  const by = (id: string): WorldMutant => {
    const [relation, seed] = id.split('/');
    const m =
      mutants.find((x) => x.id === id) ||
      mutants.find((x) => 'relation' in x.of && x.of.relation === relation && x.seeds.includes(seed));
    if (!m) throw new Error(`no mutant ${id}; have ${mutants.map((x) => x.id).join(', ')}`);
    return m;
  };

  it('a change of kind is killed by the validator, in its words', () => {
    const v = gradeStatically(right, by('account-company/one-that-was-several'));
    expect(v).toEqual({
      verdict: 'killed',
      by: 'the question',
      why: expect.stringContaining('then it is a is-on, not a belongs-to')
    });
    const tags = gradeStatically(right, by('plan-size/open-list-as-choice'));
    expect(tags).toEqual({
      verdict: 'killed',
      by: 'the question',
      why: expect.stringContaining('then it is a belongs-to, not a one-of')
    });
  });

  it('a claim with no home on the mutant is a kill the engine is never asked to measure', () => {
    // A Links field where the membership record belongs: "one account at a time" has nowhere to live.
    expect(gradeStatically(right, by('membership/links-column'))).toEqual({
      verdict: 'killed',
      by: 'no home',
      claim: expect.stringMatching(/^membership\//),
      why: expect.stringContaining('no collection Membership')
    });
    expect(gradeStatically(right, by('membership/link-column'))).toMatchObject({ verdict: 'killed', by: 'no home' });
    // No start and no end: the one-at-a-time rule's closed-row control writes `until`, which is gone.
    expect(gradeStatically(right, by('membership/no-end'))).toEqual({
      verdict: 'killed',
      by: 'no home',
      claim: expect.stringMatching(/^membership\//),
      why: expect.stringContaining('no field Membership.until')
    });
    // The profile folded into the person: "a profile is one person's" has nowhere to live.
    expect(gradeStatically(right, by('person-profile/piled-in'))).toMatchObject({
      verdict: 'killed',
      by: 'no home',
      why: expect.stringContaining('no collection Profile')
    });
    // The id with no kind beside it: the kind field is gone — attributed to what was said about THIS relation, not a neighbour's required field.
    expect(gradeStatically(right, by('note-about/id-without-kind'))).toMatchObject({
      verdict: 'killed',
      by: 'no home',
      claim: 'note/pointsAtKind-is-required',
      why: expect.stringContaining('no field Note.pointsAtKind')
    });
    // Richard's appointment slots: two people on one slot. "Can two be on it at the same time?" unanswered takes the one-booking-per-slot rule out — the engine kills it (ont-005-mutants.test.ts).
    expect(gradeStatically(right, by('booking/no-slot-rule'))).toMatchObject({ verdict: 'run' });
    // The other system's id stored nowhere.
    expect(gradeStatically(right, by('on-the-course-platform/id-nowhere'))).toMatchObject({
      verdict: 'killed',
      by: 'no home',
      why: expect.stringContaining('no field Person.onTheCoursePlatformId')
    });
  });

  it('a rule no engine keeps survives as unkept; a shape rule as unclaimed; both say so', () => {
    expect(gradeStatically(right, by('note-author/visible-to-all'))).toMatchObject({
      verdict: 'survives',
      as: 'unkept',
      why: expect.stringContaining('"onlyThrough"')
    });
    // ONT-014 (s17): never deleted and never edited are HELD (`onlyWhile`), so taking the rule out changes
    // what is held and the engine runs the claim; both fall there (ONT-005 §6.3). Red since s17, read s18.
    expect(gradeStatically(right, by('same-person/merge-by-delete'))).toMatchObject({
      verdict: 'run',
      as: 'unclaimed'
    });
    expect(gradeStatically(right, by('attended/editable-history'))).toMatchObject({
      verdict: 'run',
      as: 'unclaimed'
    });
    expect(gradeStatically(right, by('on-the-course-platform/silent-skip'))).toMatchObject({
      verdict: 'survives',
      as: 'unkept'
    });
    expect(gradeStatically(right, by('person-profile/sort-key-copied'))).toMatchObject({
      verdict: 'survives',
      as: 'unclaimed',
      why: expect.stringContaining('shape rule')
    });
    expect(gradeStatically(right, by('person-profile/filter-field-split-off'))).toMatchObject({
      verdict: 'survives',
      as: 'unclaimed'
    });
  });

  it('the engine is handed only held claims, and told what the mutant survives as', () => {
    const v = gradeStatically(right, by('plan-size/free-text'));
    expect(v).toMatchObject({ verdict: 'run', as: 'unclaimed' });
    if (v.verdict === 'run') expect(v.claims).toContain('account/plan-is-one-of-its-list');
    // A link kept as text: everything but the type is kept, so no claim is homeless — the engine decides.
    expect(gradeStatically(right, by('account-company/id-as-text'))).toMatchObject({ verdict: 'run' });
    expect(gradeStatically(right, by('invite-for/the-text-itself'))).toMatchObject({ verdict: 'run' });
  });
});

describe('AC2, the static half — removing one answer makes exactly its question the one to ask', () => {
  it.each(WORLDS)('%s', (fixture) => {
    const files = readWorld(fixture);
    const before = questionsToAsk(files).map((q) => `${q.relation}/${q.question}`);
    const { mutants } = worldMutants(files);
    let checked = 0;
    for (const r of files.relations.relations)
      for (const q of Object.keys(r.answers || {})) {
        const m = mutants.find((x) => x.id === `${r.id}/${q}-unanswered`);
        if (!m) continue; // the answer changes nothing in the schema: inert, the runner's for the record
        const reduced = clone(files);
        const rr = reduced.relations.relations.find((x) => x.id === r.id)!;
        delete rr.answers![q];
        const after = questionsToAsk(reduced).map((x) => `${x.relation}/${x.question}`);
        expect([r.id, q, after.filter((x) => !before.includes(x))]).toEqual([r.id, q, [`${r.id}/${q}`]]);
        expect([r.id, q, before.filter((x) => !after.includes(x))]).toEqual([r.id, q, []]);
        checked += 1;
      }
    expect(checked).toBeGreaterThan(0);
  });

  it('the every-kind world, fully answered, leaves nothing to ask; the membership world names what it never said', () => {
    expect(questionsToAsk(readWorld('world-every-kind'))).toEqual([]);
    const asked = questionsToAsk(readWorld('world-membership'));
    for (const q of asked)
      expect([q.relation, q.question, q.ask.length > 0, q.because.length > 0]).toEqual([
        q.relation,
        q.question,
        true,
        true
      ]);
  });
});

describe("AC3 — Richard's category and subcategory", () => {
  it('answered: the free-text mutant is handed to the engine with the claim that kills it', () => {
    const { right, mutants } = worldMutants(readWorld('world-categories'));
    const free = mutants.find((m) => m.id === 'subcategory-category/free-text')!;
    expect(free.mistake).toBe('a text field where a list belongs');
    const v = gradeStatically(right, free);
    expect(v).toMatchObject({ verdict: 'run' });
    if (v.verdict === 'run') expect(v.claims).toContain('subcategory/category-is-one-of-its-list');
    expect(right.claims.find((c) => c.id === 'subcategory/category-is-one-of-its-list')!.says).toBe(
      "a subcategory's category is one of books, music, film, and nothing else"
    );
  });

  it('unanswered: "naturally it should just be a text field" — nothing said names category, so nothing stops it', () => {
    const files = readWorld('world-categories-unanswered');
    const { right, mutants } = worldMutants(files);
    expect(right.claims.filter((c) => JSON.stringify(c.steps).includes('category'))).toEqual([]);
    expect(mutants.map((m) => m.id)).toEqual(['product/price-as-text']);
    expect(questionsToAsk(files)).toEqual([]);
  });
});
