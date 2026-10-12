/**
 * P116 ONT-002 — the conversation is a runner.
 *
 * What this file decides without an engine: that a question is returned only with the mutant it
 * kills or the incident behind it (AC3); that on a world with no answers the questions somebody
 * paid for come first and a relation with nothing standing is not asked about (AC1); that on the
 * Acme-shaped fixture the archive note's and the enrolment note's questions are the first two
 * (AC2); that the budget holds and the rest are counted; that the record says what was asked
 * and what was volunteered; and that the two questions no relation carries are asked once each
 * and have a home. The tool over this is `noodl-mcp`'s `validate_world` (AC4 is measured there).
 */
import * as fs from 'fs';
import * as path from 'path';

import Ajv from 'ajv';

import {
  loginHop,
  nextQuestions,
  plural,
  projectWorld,
  QUESTION_BUDGET,
  validateWorld,
  NOUN_MUTANTS,
  WORLD_FILES,
  WORLD_KINDS,
  worldMutants,
  type NextQuestion,
  type WorldFiles
} from '../world';

const FIXTURES = path.join(__dirname, 'fixtures');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/world.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema);

function readWorld(fixture: string): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const ok = (files: WorldFiles, limit?: number) => {
  const r = nextQuestions(files, limit === undefined ? {} : { limit });
  if (!r.ok) throw new Error(r.problems.map((p) => p.message).join('\n'));
  return r;
};
const id = (q: NextQuestion): string =>
  'relation' in q.about ? `${q.about.relation}/${q.question}` : 'world' in q.about ? 'signsIn' : 'nouns' in q.about ? `noun/${q.question}` : 'freeWords';

/** The membership world with every answer taken out. */
function unanswered(): WorldFiles {
  const f = clone(readWorld('world-membership-unasked'));
  for (const r of f.relations.relations) delete r.answers;
  return f;
}

describe('the Acme-shaped fixture is the membership world plus what the notes were about', () => {
  it('is world-membership, with the course platform said and the person signing in, and nothing else changed', () => {
    const base = clone(readWorld('world-membership'));
    const fixture = readWorld('world-membership-unasked');
    const person = base.nouns.nouns.find((n) => n.id === 'person')!;
    person.signsIn = true;
    expect(fixture.nouns).toEqual(base.nouns);
    expect(fixture.vocabulary).toEqual(base.vocabulary);
    const extra = fixture.relations.relations.filter((r) => !base.relations.relations.some((b) => b.id === r.id));
    expect(extra.map((r) => [r.id, r.kind, r.from, r.to])).toEqual([['on-the-course-platform', 'exists-elsewhere', 'person', 'the course platform']]);
    expect(fixture.relations.relations.filter((r) => r.id !== 'on-the-course-platform')).toEqual(base.relations.relations);
    // The two note questions are unanswered on it, on purpose.
    const leaves = fixture.relations.relations.find((r) => r.id === 'leaves')!;
    expect('whatStays' in (leaves.answers || {})).toBe(false);
    expect('hereFirst' in (extra[0].answers || {})).toBe(false);
  });

  it('passes the validator and the JSON Schema, and projects', () => {
    const files = readWorld('world-membership-unasked');
    expect(validateWorld(files as unknown as Record<string, unknown>).problems).toEqual([]);
    for (const name of ['nouns', 'relations', 'vocabulary'] as const) {
      expect({ name, ok: ajv.validate(`${schema.$id}#/definitions/${name}File`, files[name]) }).toEqual({ name, ok: true });
    }
    expect(projectWorld(files).ok).toBe(true);
  });
});

describe('AC3 — every question names its mutant or its incident', () => {
  const worlds = ['world', 'world-every-kind', 'world-membership', 'world-membership-unasked', 'world-categories', 'world-categories-unanswered'];

  it('on every fixture, and on the world with no answers', () => {
    for (const w of [...worlds.map(readWorld), unanswered()]) {
      const r = ok(w, 1000);
      for (const q of r.ask) {
        expect([id(q), q.mutants.length > 0 || (q.incident.from === 'note' || q.incident.from === 'oral')]).toEqual([id(q), true]);
        expect(q.incident.prevents.length).toBeGreaterThan(10);
        expect(q.mistake.length).toBeGreaterThan(10);
        expect(q.home.length).toBeGreaterThan(5);
      }
    }
  });

  it('a mutant it names stands on that world: not killed without an engine', () => {
    const files = unanswered();
    const { mutants } = worldMutants(files);
    const byId = new Map(mutants.map((m) => [m.id, m]));
    for (const q of ok(files, 1000).ask)
      for (const m of q.mutants) {
        if (!byId.has(m)) {
          // A kind's seed named directly: `<kind>/<seed>`; or one of the noun's own (ONT-011 step 2): `noun/<seed>`.
          const [kind, seed] = m.split('/');
          const seeds = kind === 'noun' ? NOUN_MUTANTS : WORLD_KINDS.find((k) => k.id === kind)?.mutants;
          expect([m, seeds?.some((s) => s.id === seed)]).toEqual([m, true]);
          continue;
        }
        const mm = byId.get(m)!;
        expect([m, mm.cannot, mm.notApplicable, mm.refusal]).toEqual([m, undefined, undefined, undefined]);
      }
  });

  it('a question with no incident behind it is asked only while a mutant stands; otherwise it is for the record', () => {
    const r = ok(readWorld('world-every-kind'), 1000);
    for (const q of r.ask) if (q.incident.from === 'census' || q.incident.from === 'task') expect([id(q), q.mutants.length > 0]).toEqual([id(q), true]);
    expect(r.forTheRecord.map((f) => `${f.relation}/${f.question}`).sort()).toEqual([
      'attended/seeHistory',
      'leaves/whoEnds',
      'on-the-course-platform/endsThere',
      'on-the-course-platform/nameThere',
      'same-person/survivor',
      'topic-tree/inherits'
    ]);
    for (const f of r.forTheRecord) expect(f.why).toBe('no answer changes the schema or the kind');
  });

  it('a world the validator refuses gets problems, not questions', () => {
    const f = clone(readWorld('world'));
    f.relations.relations[0].kind = 'owns';
    const r = nextQuestions(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems[0].at).toBe('relations[0].kind');
  });
});

describe('AC1 — on a world with no answers', () => {
  const r = ok(unanswered(), 1000);
  const ids = r.ask.map(id);

  it('asks the questions somebody paid for first: the notes, then the rows, then what was read off a schema', () => {
    // Non-decreasing, except the kind-picker, which is last whatever its incident (it fires on every world).
    const tiers = r.ask.slice(0, -1).map((q) => ({ note: 0, oral: 1, census: 2, task: 2 })[q.incident.from]);
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    // The three notes' questions lead: the incident report (is-on `counts`), the enrolment note
    // (exists-elsewhere `hereFirst`), the archive note (ends `whatStays`).
    expect(ids.slice(0, 6)).toEqual([
      'membership/counts',
      'employment/counts',
      'on-the-course-platform/hereFirst',
      'leaves/whatStays',
      'leaves/comesBack',
      'leaves/backAs'
    ]);
    // Richard's rows next, the commonest kind first (belongs-to, 78 rows; is-on, 20; many-by-list, 8).
    expect(ids.slice(6, 10)).toEqual(['account-company/several', 'membership/sameTime', 'employment/sameTime', 'session-speakers/otherWay']);
    // Then the census questions, and the kind-picker last of all.
    expect(ids[ids.length - 1]).toBe('freeWords');
  });

  it('asks nothing about a relation none of whose questions has a mutant standing or an incident behind it', () => {
    // `part-of-tree` asks `inherits`, a census question no answer changes and no seed is killed by:
    // for the record, never asked. `together`'s `twice` changes nothing either, but the seed
    // `pair-twice` (a list where a Links belongs) is killed by it, so it IS asked.
    expect(ids).not.toContain('topic-tree/inherits');
    expect(r.forTheRecord.some((f) => f.relation === 'topic-tree' && f.question === 'inherits')).toBe(true);
    expect(ids).toContain('session-tags/twice');
    expect(r.ask.find((q) => id(q) === 'session-tags/twice')!.mutants).toEqual(['session-tags/twice-unanswered', 'session-tags/pair-twice']);
    for (const f of r.forTheRecord) expect(ids).not.toContain(`${f.relation}/${f.question}`);
    // And on a fully answered relation, nothing at all.
    const full = ok(readWorld('world-every-kind'), 1000);
    expect(full.ask.filter((q) => 'relation' in q.about && q.about.relation === 'membership')).toEqual([]);
  });

  it('every question on the no-answers world either changes the kind, the schema, or stands for a lived incident', () => {
    for (const q of r.ask)
      expect([id(q), q.changes === 'the record' ? q.incident.from : q.changes]).toEqual([
        id(q),
        q.changes === 'the record' ? q.incident.from : q.changes
      ]);
    expect(r.ask.filter((q) => q.changes === 'the kind').map(id)).toEqual(
      expect.arrayContaining(['account-company/several', 'session-speakers/otherWay', 'session-tags/needsDetails'])
    );
  });
});

describe('AC2 — on the Acme-shaped fixture, the two notes are the first list', () => {
  it('asks the enrolment note and the archive note first, and nothing about what the fixture answered', () => {
    const r = ok(readWorld('world-membership-unasked'));
    expect(r.ask.map(id).slice(0, 2)).toEqual(['on-the-course-platform/hereFirst', 'leaves/whatStays']);
    expect(r.ask.map((q) => q.incident.from).slice(0, 2)).toEqual(['note', 'note']);
    expect(r.ask[0].mutants).toEqual(['on-the-course-platform/silent-skip']);
    expect(r.ask[1].mutants).toEqual(['leaves/end-by-delete']);
    expect(r.ask[0].ask).toBe(
      'Can a person be added here before it exists in the course platform — and if it can, what is silently skipped, and how would anyone notice?'
    );
    expect(r.enough).toBe(false);
  });

  it('once both are answered, neither is asked again and the record shows what was said', () => {
    const f = clone(readWorld('world-membership-unasked'));
    f.relations.relations.find((r) => r.id === 'leaves')!.answers!.whatStays = 'The record and what they came to stay; their place on the account ends.';
    f.relations.relations.find((r) => r.id === 'on-the-course-platform')!.answers!.hereFirst = 'Yes. Until the platform knows them they cannot start a course, and we list who is waiting.';
    const r = ok(f);
    expect(r.ask.map(id)).not.toEqual(expect.arrayContaining(['on-the-course-platform/hereFirst', 'leaves/whatStays']));
    expect(r.record.filter((x) => x.question === 'whatStays' || x.question === 'hereFirst').map((x) => [x.relation, x.question, x.how])).toEqual([
      ['leaves', 'whatStays', 'asked'],
      ['on-the-course-platform', 'hereFirst', 'asked']
    ]);
  });
});

describe('the budget', () => {
  it('returns the top few and counts the rest; the full list is the same list', () => {
    const files = unanswered();
    const few = ok(files);
    const all = ok(files, 1000);
    expect(QUESTION_BUDGET).toBe(5);
    expect(few.ask.length).toBe(QUESTION_BUDGET);
    expect(few.waiting).toBe(all.ask.length - QUESTION_BUDGET);
    expect(all.waiting).toBe(0);
    expect(all.ask.slice(0, QUESTION_BUDGET).map(id)).toEqual(few.ask.map(id));
  });

  it('is deterministic', () => {
    const a = ok(unanswered(), 1000);
    const b = ok(unanswered(), 1000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('says when the world is described enough to build', () => {
    const f = clone(readWorld('world-categories'));
    for (const n of f.nouns.nouns) for (const p of n.properties || []) if (p.kind === 'text') p.freeWords = true;
    const r = ok(f);
    expect(r.ask).toEqual([]);
    expect(r.waiting).toBe(0);
    expect(r.enough).toBe(true);
  });
});

describe('the record', () => {
  it('counts an answer nothing asked for: no incident behind it, nothing changed by it, no seed killed by it', () => {
    const r = ok(readWorld('world-membership-unasked'));
    const volunteered = r.record.filter((x) => x.how === 'volunteered').map((x) => `${x.relation}/${x.question}`);
    expect(r.volunteered).toBe(volunteered.length);
    // The fixture was written by hand before the runner existed: these answers answer questions
    // that change nothing and stand for nothing (measured, not chosen).
    expect(volunteered).toEqual([
      'membership/whenEnds',
      'employment/whenEnds',
      'session-speakers/grows',
      'topic-tree/depth',
      'topic-tree/moves',
      'on-the-course-platform/wins'
    ]);
    // And an answer the runner would have asked for, whatever was answered: `several` (on the
    // belongs-to it changes the kind; on the two is-ons the schema) and `needsDetails` (the kind).
    expect(r.record.filter((x) => x.question === 'several' || x.question === 'needsDetails').map((x) => `${x.relation}:${x.how}`)).toEqual([
      'account-company:asked',
      'membership:asked',
      'employment:asked',
      'session-tags:asked'
    ]);
    for (const x of r.record) expect(x.ask).not.toMatch(/\{(from|to|field)\}/);
  });
});

describe('the two questions no relation carries', () => {
  it('who signs in: asked once a rule about who may see what exists and no noun signs in; it has a home', () => {
    const f = clone(readWorld('world'));
    const r = ok(f, 1000);
    const q = r.ask.find((x) => 'world' in x.about)!;
    expect(q).toBeDefined();
    expect(q.question).toBe('signsIn');
    expect(q.home).toBe('nouns[<the noun>].signsIn');
    expect(q.mutants).toEqual(['note-author/visible-to-all']);
    expect(q.ask).toMatch(/^Which of these is the person who signs in — person, account, company, session or note\? "Only whoever wrote a note/);
    // Answered: the noun's collection gets the link a rule starts from, and the question goes.
    f.nouns.nouns.find((n) => n.id === 'person')!.signsIn = true;
    const after = ok(f, 1000);
    expect(after.ask.some((x) => 'world' in x.about)).toBe(false);
    expect(loginHop(after.schema)).toEqual({ collection: 'Person', by: 'login' });
    const col = after.schema.collections.find((c) => c.name === 'Person')!.columns.find((c) => c.name === 'login')!;
    expect([col.kind, col.targetClass, col.required, col.relation]).toEqual(['link', '_User', undefined, undefined]);
    // A world with no such rule is never asked.
    const g = clone(readWorld('world-categories'));
    expect(ok(g, 1000).ask.some((x) => 'world' in x.about)).toBe(false);
    expect(loginHop(ok(g).schema)).toBeUndefined();
  });

  it('the kind-picker: one question for every text field nobody has placed, last, with a home per field', () => {
    const r = ok(readWorld('world-categories-unanswered'), 1000);
    expect(r.ask.map(id)).toEqual(['freeWords']);
    const q = r.ask[0];
    expect(q.about).toEqual({
      fields: [
        { noun: 'product', property: 'name' },
        { noun: 'product', property: 'category' },
        { noun: 'product', property: 'subcategory' }
      ]
    });
    expect(q.ask).toBe("These are text fields: a product's name, a product's category or a product's subcategory. Which of them are one of a fixed list? The rest are free words.");
    expect(q.mutants).toEqual(['one-of/category-as-text']);
    expect(q.incident.from).toBe('oral');
    // Answered one way: the field is free words. The other: a choice with a one-of relation (world-categories).
    const f = clone(readWorld('world-categories-unanswered'));
    for (const p of f.nouns.nouns[0].properties!) if (p.kind === 'text') p.freeWords = true;
    expect(ok(f, 1000).ask).toEqual([]);
    const answered = ok(readWorld('world-categories'), 1000);
    expect(answered.ask.map(id)).toEqual(['freeWords']);
    expect((answered.ask[0].about as { fields: unknown[] }).fields).toEqual([
      { noun: 'product', property: 'name' },
      { noun: 'subcategory', property: 'name' }
    ]);
    // On a world with relation questions, it is last.
    const all = ok(unanswered(), 1000);
    expect(id(all.ask[all.ask.length - 1])).toBe('freeWords');
  });

  it('the format refuses a second noun signing in, and free words on anything but a text', () => {
    const f = clone(readWorld('world'));
    f.nouns.nouns[0].signsIn = true;
    f.nouns.nouns[1].signsIn = true;
    const two = validateWorld(f as unknown as Record<string, unknown>).problems;
    expect(two.map((p) => p.at)).toEqual(['nouns[1].signsIn']);
    expect(two[0].message).toMatch(/one noun is who signs in/);
    const g = clone(readWorld('world-categories'));
    const price = g.nouns.nouns[0].properties!.find((p) => p.kind !== 'text')!;
    (price as { freeWords?: true }).freeWords = true;
    const one = validateWorld(g as unknown as Record<string, unknown>).problems;
    expect(one.map((p) => p.at)).toEqual([`nouns[0].properties[${g.nouns.nouns[0].properties!.indexOf(price)}].freeWords`]);
    expect(ajv.validate(`${schema.$id}#/definitions/nounsFile`, g.nouns)).toBe(false);
    expect(ajv.validate(`${schema.$id}#/definitions/nounsFile`, f.nouns)).toBe(true); // the schema cannot count nouns; the validator does
  });
});

describe('the words', () => {
  it('take the article and the plural the noun takes', () => {
    expect(['company', 'slot', 'person', 'box', 'day'].map(plural)).toEqual(['companies', 'slots', 'people', 'boxes', 'days']);
    const r = ok(unanswered(), 1000);
    const asks = r.ask.map((q) => q.ask);
    expect(asks).toContain('Can an account move to another company later?');
    expect(asks).toContain('Can two people be on the same account at the same time?');
    expect(asks.join('\n')).not.toMatch(/\ba [aeiou]|companys|persons|\{(from|to|field)\}/);
  });
});
