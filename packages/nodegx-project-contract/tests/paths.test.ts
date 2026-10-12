/**
 * P116 ONT-004 — a sentence through the world, compiled to the path operation.
 *
 * Graded without an engine: the compiler reads the projection back (which column each relation
 * made, which relations became records of their own) and emits the hops the storage shape
 * needs. The rows those hops reach are graded on two engines in `nodegx-backend`'s
 * `tests/ont-004-world.test.ts`.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  projectWorld,
  WORLD_FILES,
  worldPath,
  worldRule,
  type PathSentence,
  type WorldFiles,
  type WorldSchema
} from '../world';

const FIXTURE = path.join(__dirname, 'fixtures', 'world-membership');

function readWorld(): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
  return {
    nouns: read(WORLD_FILES.nouns),
    relations: read(WORLD_FILES.relations),
    vocabulary: read(WORLD_FILES.vocabulary)
  };
}

const files = readWorld();
const out = projectWorld(files);
if (!out.ok) throw new Error(out.problems.join('\n'));
const schema: WorldSchema = out.schema;

function compile(sentence: PathSentence) {
  const c = worldPath(schema, files, sentence);
  if (!c.ok) throw new Error(c.problem);
  return c.compiled;
}
function refused(sentence: PathSentence): string {
  const c = worldPath(schema, files, sentence);
  if (c.ok) throw new Error(`compiled, and should not have: ${JSON.stringify(c.compiled.path)}`);
  return c.problem;
}

describe('the four census paths, compiled from the relations', () => {
  it('1 — accounts whose company is named X: a belongs-to read back is one hop', () => {
    const c = compile({ from: 'company', where: { name: 'Acme' }, steps: [{ relation: 'account-company' }] });
    expect(c.collection).toBe('Account');
    expect(c.path).toEqual({
      from: { collection: 'Company', where: { name: 'Acme' } },
      hops: [{ from: 'Account', by: 'company' }],
      maxDepth: 1
    });
  });

  it('2 — accounts with a member named Y: an is-on crossed is two hops, in and out', () => {
    const c = compile({ from: 'person', where: { name: 'eve' }, steps: [{ relation: 'membership' }] });
    expect(c.path.hops).toEqual([{ from: 'Membership', by: 'person' }, { follow: 'account' }]);
    expect(c.collection).toBe('Account');
  });

  it('3 — the people an account holder may see: four hops, the step narrowed "as holder"', () => {
    const c = compile({
      from: 'person',
      where: { name: 'ann' },
      steps: [
        { relation: 'membership', where: { role: 'holder' } },
        { relation: 'membership', back: true }
      ]
    });
    expect(c.path.hops).toEqual([
      { from: 'Membership', by: 'person', where: { role: 'holder' } },
      { follow: 'account' },
      { from: 'Membership', by: 'account' },
      { follow: 'person' }
    ]);
    expect(c.path.maxDepth).toBe(4);
    expect(c.noun).toBe('person');
  });

  it("4 — the members on my account's companies: five hops, three relations", () => {
    const c = compile({
      from: 'person',
      where: { name: 'ann' },
      steps: [
        { relation: 'membership', where: { role: 'holder' } },
        { relation: 'account-company' },
        { relation: 'employment', back: true }
      ]
    });
    expect(c.path.hops).toEqual([
      { from: 'Membership', by: 'person', where: { role: 'holder' } },
      { follow: 'account' },
      { follow: 'company' },
      { from: 'Employment', by: 'company' },
      { follow: 'person' }
    ]);
    expect(c.path.maxDepth).toBe(5);
    expect(c.says).toMatch(/^the persons reached from a person: along "A person is on an account/);
  });
});

describe('every link shape the kinds make', () => {
  it('a Links field (together) is one hop either way', () => {
    expect(compile({ from: 'tag', steps: [{ relation: 'session-tags' }] }).path.hops).toEqual([
      { from: 'Session', by: 'tag' }
    ]);
    expect(compile({ from: 'session', steps: [{ relation: 'session-tags' }] }).path.hops).toEqual([{ follow: 'tag' }]);
  });

  it('a list (many-by-list) is followed forwards with its target named, and refused backwards in the kind’s words', () => {
    expect(compile({ from: 'session', steps: [{ relation: 'session-speakers' }] }).path.hops).toEqual([
      { follow: 'person', to: 'Person' }
    ]);
    expect(refused({ from: 'person', steps: [{ relation: 'session-speakers' }] })).toMatch(
      /nobody can ask the list the other way round/
    );
  });

  it('a tree (part-of-tree) is taken again and again, up or down, with a bound', () => {
    const under = compile({
      from: 'topic',
      where: { title: 'root' },
      steps: [{ relation: 'topic-tree', back: true, all: true }],
      maxDepth: 3
    });
    expect(under.path.hops).toEqual([{ from: 'Topic', by: 'parent', repeat: true }]);
    const above = compile({ from: 'topic', steps: [{ relation: 'topic-tree', back: false, all: true }], maxDepth: 8 });
    expect(above.path.hops).toEqual([{ follow: 'parent', repeat: true }]);
    expect(refused({ from: 'topic', steps: [{ relation: 'topic-tree', all: true }] })).toMatch(/say "back"/);
    expect(refused({ from: 'topic', steps: [{ relation: 'topic-tree', back: true, all: true }] })).toMatch(
      /needs "maxDepth"/
    );
  });

  it('a happened-to with both ends is crossed like an is-on; with one end it is refused', () => {
    expect(compile({ from: 'session', steps: [{ relation: 'attended' }] }).path.hops).toEqual([
      { from: 'Attended', by: 'session' },
      { follow: 'person' }
    ]);
    expect(refused({ from: 'person', steps: [{ relation: 'signed-up' }] })).toMatch(/only one end/);
  });

  it('a relation with no link, a wrong noun, a wrong direction: each refused by name', () => {
    expect(refused({ from: 'person', steps: [{ relation: 'leaves' }] })).toMatch(/makes no link/);
    expect(refused({ from: 'tag', steps: [{ relation: 'membership' }] })).toMatch(/the path is on a tag/);
    expect(refused({ from: 'person', steps: [{ relation: 'membership', back: true }] })).toMatch(
      /read back starts from an account/
    );
    expect(refused({ from: 'person', steps: [{ relation: 'nope' }] })).toMatch(/not a relation/);
    expect(refused({ from: 'ghost', steps: [{ relation: 'membership' }] })).toMatch(/not a noun/);
    expect(refused({ from: 'person', steps: [{ relation: 'membership' }], maxDepth: 1 })).toMatch(/takes 2 hops/);
  });
});

describe('a permission rule from a sentence (AC3)', () => {
  it('starts at the login the projection made, then the sentence', () => {
    const r = worldRule(
      schema,
      files,
      { collection: 'SignedUp', by: 'doneBy', then: [{ follow: 'person' }] },
      {
        from: 'person',
        steps: [
          { relation: 'membership', where: { role: 'holder' } },
          { relation: 'membership', back: true }
        ]
      }
    );
    if (!r.ok) throw new Error(r.problem);
    expect(r.collection).toBe('Person');
    expect(r.rule).toEqual({
      path: {
        hops: [
          { from: 'SignedUp', by: 'doneBy' },
          { follow: 'person' },
          { from: 'Membership', by: 'person', where: { role: 'holder' } },
          { follow: 'account' },
          { from: 'Membership', by: 'account' },
          { follow: 'person' }
        ],
        maxDepth: 6
      }
    });
    expect(r.says).toMatch(/^whoever is signed in sees the persons reached from a person/);
  });

  it('refuses a login link that does not point at the users', () => {
    const r = worldRule(
      schema,
      files,
      { collection: 'Membership', by: 'person' },
      { from: 'person', steps: [{ relation: 'membership' }] }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/does not point at the signed-in users/);
  });
});

describe('the projection marks each column with the relation that made it', () => {
  it('so a path can be read back, and the write leaves the mark behind', () => {
    const membership = schema.collections.find((c) => c.name === 'Membership')!;
    expect(membership.columns.find((c) => c.name === 'person')?.relation).toBe('membership');
    const account = schema.collections.find((c) => c.name === 'Account')!;
    expect(account.columns.find((c) => c.name === 'company')?.relation).toBe('account-company');
    expect(account.columns.find((c) => c.name === 'name')?.relation).toBeUndefined();
  });
});
