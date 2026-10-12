/**
 * P116 ONT-002 s14 — "through what?": an owned-by that belongs to someone through a chain says
 * which chain (`relations[].through`), and the rule is compiled from the world alone.
 *
 * `fixtures/world-owned-through` is the membership world with the person signing in and a note
 * that is its account's: "seen and changed by whoever holds the account". Its chain is one step,
 * membership as holder. The validator walks a chain over the nouns (both it and the JSON schema
 * are asked), `ownerRule()` compiles it with the login into the path rule, the runner asks for a
 * chain only once someone signs in and records the one it was given, and a changed chain is a
 * change `diffWorld` names. The rule's rows on two engines: `nodegx-backend/tests/ont-002-through`.
 */
import * as fs from 'fs';
import * as path from 'path';

import Ajv from 'ajv';

import { diffWorld, nextQuestions, ownerRule, projectWorld, validateWorld, WORLD_FILES, type Relation, type WorldFiles } from '../world';

const FIXTURE = path.join(__dirname, 'fixtures', 'world-owned-through');
const schemaJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/world.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schemaJson);
const schemaAccepts = (relations: unknown): boolean => ajv.validate(`${schemaJson.$id}#/definitions/relationsFile`, relations) as boolean;

function readWorld(): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const note = (w: WorldFiles): Relation => w.relations.relations.find((r) => r.id === 'note-account')!;
const refusal = (w: WorldFiles): string => {
  const v = validateWorld(w as unknown as Record<string, unknown>);
  expect(v.ok).toBe(false);
  return v.problems.map((p) => p.message).join('\n');
};
const schemaOf = (w: WorldFiles) => {
  const p = projectWorld(w);
  if (!p.ok) throw new Error(p.problems.join('\n'));
  return p.schema;
};

describe('the format: a chain from whoever signs in to the owner', () => {
  it('the fixture is a world, to the validator and to the JSON schema', () => {
    const w = readWorld();
    expect(validateWorld(w as unknown as Record<string, unknown>)).toEqual({ ok: true, problems: [] });
    expect(schemaAccepts(w.relations)).toBe(true);
  });

  it.each<[string, (w: WorldFiles) => void, RegExp]>([
    ['on a kind that is not owned-by', (w) => (w.relations.relations.find((r) => r.id === 'membership')!.through = [{ relation: 'account-company' }]), /only an owned-by is asked/],
    ['without answers.path: true', (w) => (note(w).answers!.path = false), /answers\.path is not true/],
    ['when nobody signs in', (w) => delete w.nouns.nouns.find((n) => n.id === 'person')!.signsIn, /no noun says signsIn/],
    ['naming a relation the world does not have', (w) => (note(w).through = [{ relation: 'nope' }]), /"nope" is not a relation of this world/],
    ['naming itself', (w) => (note(w).through = [{ relation: 'membership' }, { relation: 'note-account' }]), /is this relation itself; it is not said/],
    ['along a relation that does not join two nouns', (w) => (note(w).through = [{ relation: 'leaves' }]), /"leaves" \(ends\) does not join two nouns/],
    ['along a relation the chain is not on', (w) => (note(w).through = [{ relation: 'account-company' }]), /joins the account to the company, and the chain is on the person/],
    ['read the wrong way', (w) => (note(w).through = [{ relation: 'membership', back: true }]), /joins the person to the account, and the chain is on the person/],
    ['ending short of the owner', (w) => (note(w).through = []), /ends on the person, and a note belongs to the account/],
    ['ending past the owner', (w) => (note(w).through = [{ relation: 'membership' }, { relation: 'account-company' }]), /ends on the company/],
    ['a self relation without a direction', (w) => (note(w).through = [{ relation: 'membership' }, { relation: 'membership', back: true }, { relation: 'topic-tree' }]), /joins topics to topics, and the chain is on the person/]
  ])('is refused %s', (_, change, says) => {
    const w = readWorld();
    change(w);
    expect(refusal(w)).toMatch(says);
  });

  it.each<[string, unknown]>([
    ['a key a step does not have', [{ relation: 'membership', as: 'holder' }]],
    ['a where that is not field to value', [{ relation: 'membership', where: { role: ['holder'] } }]],
    ['an empty where', [{ relation: 'membership', where: {} }]],
    ['a back that is not yes or no', [{ relation: 'membership', back: 'no' }]]
  ])('is refused by both the validator and the schema: %s', (_, through) => {
    const w = readWorld();
    (note(w) as unknown as Record<string, unknown>).through = through;
    expect(validateWorld(w as unknown as Record<string, unknown>).ok).toBe(false);
    expect(schemaAccepts(w.relations)).toBe(false);
  });
});

describe('ownerRule — the permission rule from the world alone', () => {
  it('the login, the chain, then back along the owner link', () => {
    const w = readWorld();
    const r = ownerRule(schemaOf(w), w, 'note-account');
    if (!r.ok) throw new Error(r.problem);
    expect(r.collection).toBe('Note');
    expect(r.rule).toEqual({
      path: {
        hops: [
          { from: 'Person', by: 'login' },
          { from: 'Membership', by: 'person', where: { role: 'holder' } },
          { follow: 'account' },
          { from: 'Note', by: 'owner' }
        ],
        maxDepth: 4
      }
    });
    expect(r.says).toMatch(/^whoever is signed in sees the notes reached from a person/);
  });

  it.each<[string, (w: WorldFiles) => void, RegExp]>([
    ['no chain said', (w) => delete note(w).through, /nobody has said through what/],
    ['a chain not asked for', (w) => ((note(w).answers!.path = false), delete note(w).through), /does not say it belongs to someone through a chain/],
    ['a relation that is not owned-by', () => undefined, /only an owned-by says who may see what/]
  ])('refuses %s', (name, change, says) => {
    const w = readWorld();
    change(w);
    const r = ownerRule(schemaOf(w), w, name === 'a relation that is not owned-by' ? 'membership' : 'note-account');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(says);
  });

  it('refuses a chain the nouns allow and the schema cannot follow — a list read the other way round', () => {
    const w = readWorld();
    // A note that is its session's, reached from the person through the session's speaker list: the
    // nouns join (person ← session-speakers ← session), and nobody can ask a list the other way round.
    note(w).to = 'session';
    note(w).through = [{ relation: 'session-speakers' }];
    expect(validateWorld(w as unknown as Record<string, unknown>).ok).toBe(true);
    const r = ownerRule(schemaOf(w), w, 'note-account');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/nobody can ask the list the other way round/);
    // The runner refuses it too, at the chain, rather than asking anything over it.
    const report = nextQuestions(w);
    expect(report.ok).toBe(false);
    if (!report.ok) expect(report.problems[0]).toMatchObject({ file: WORLD_FILES.relations, at: expect.stringMatching(/^relations\[\d+\]\.through$/) });
  });
});

describe('the runner asks "through what?" once someone signs in', () => {
  const asked = (w: WorldFiles): string[] => {
    const r = nextQuestions(w, { limit: 50 });
    if (!r.ok) throw new Error(r.problems.map((p) => p.message).join('\n'));
    return r.ask.map((q) => ('relation' in q.about ? `${q.about.relation}/${q.question}` : q.question));
  };

  it('a chain said is not asked again, and is on the record in words', () => {
    const w = readWorld();
    expect(asked(w)).not.toContain('note-account/through');
    const r = nextQuestions(w);
    if (!r.ok) throw new Error('refused');
    expect(r.record.find((x) => x.question === 'through')).toMatchObject({ relation: 'note-account', said: 'membership where role is holder', how: 'asked' });
  });

  it('unsaid, it is asked, with its home, its mistake and the incident behind the path question', () => {
    const w = readWorld();
    delete note(w).through;
    const r = nextQuestions(w, { limit: 50 });
    if (!r.ok) throw new Error('refused');
    const q = r.ask.find((x) => x.question === 'through')!;
    expect(q).toMatchObject({ about: { relation: 'note-account', kind: 'owned-by' }, home: 'relations[note-account].through', changes: 'the schema', incident: { from: 'census' } });
    expect(q.ask).toMatch(/Name the relations from the person to the account, in order/);
    expect(q.mutants.length).toBeGreaterThan(0);
  });

  it('before anyone signs in, the question asked is who signs in, not through what', () => {
    const w = readWorld();
    delete note(w).through;
    delete w.nouns.nouns.find((n) => n.id === 'person')!.signsIn;
    const ids = asked(w);
    expect(ids).toContain('signsIn');
    expect(ids).not.toContain('note-account/through');
  });

  it('a chain not asked for (path: no) is never asked about', () => {
    const w = readWorld();
    delete note(w).through;
    note(w).answers!.path = false;
    expect(asked(w)).not.toContain('note-account/through');
  });
});

describe('diffWorld names a changed chain', () => {
  it('who may see changes; nothing else does', () => {
    const before = readWorld();
    const after = clone(before);
    note(after).through = [{ relation: 'membership' }];
    expect(diffWorld(before, after)).toEqual([
      { what: 'relation-through', about: { relation: 'note-account' }, says: "'note-account': whoever signs in reaches the account through membership now" }
    ]);
    delete note(after).through;
    expect(diffWorld(before, after).map((c) => c.says)).toEqual(["'note-account': nobody says through what any more"]);
  });
});
