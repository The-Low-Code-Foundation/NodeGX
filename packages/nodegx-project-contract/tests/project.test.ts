/**
 * P116 ONT-003 — the projection: `docs/world/` in, a schema and its claims out.
 *
 * Graded here without any engine: the same files give the same bytes (AC1, against a committed
 * golden file, which is what makes "two machines" checkable — CI is the other machine); every
 * rule a kind produces is either held by the schema or said in the collection's description,
 * never dropped; the projection refuses what it cannot name; and nothing in the package reaches
 * an adapter (AC4). The claims are graded on two engines in `nodegx-backend`'s
 * `tests/ont-003-claims.test.ts`.
 */
import * as fs from 'fs';
import * as path from 'path';

import { applyMutant, collectionName, fieldName, projectWorld, schemaText, WORLD_FILES, WORLD_KINDS, type WorldFiles, type WorldSchema } from '../world';

const FIXTURES = path.join(__dirname, 'fixtures');
const WORLDS = ['world', 'world-every-kind', 'world-membership', 'world-categories', 'world-categories-unanswered'] as const;

function readWorld(fixture: string): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function project(files: WorldFiles): WorldSchema {
  const out = projectWorld(files);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.schema;
}

/** The golden file beside each fixture: `projected.json`. `ONT003_WRITE_GOLDEN=1` rewrites it. */
const golden = (fixture: string): string => path.join(FIXTURES, fixture, 'projected.json');

describe('AC1 — the same files project to the same bytes', () => {
  it.each(WORLDS)('%s: twice, from two parses, and as the committed file', (fixture) => {
    const a = schemaText(project(readWorld(fixture)));
    const b = schemaText(project(clone(readWorld(fixture))));
    expect(b).toBe(a);
    if (process.env.ONT003_WRITE_GOLDEN === '1') fs.writeFileSync(golden(fixture), a);
    expect(a).toBe(fs.readFileSync(golden(fixture), 'utf8'));
  });

  it('the every-kind fixture uses all fourteen kinds', () => {
    const used = new Set(readWorld('world-every-kind').relations.relations.map((r) => r.kind));
    expect(WORLD_KINDS.map((k) => k.id).filter((k) => !used.has(k))).toEqual([]);
  });
});

describe('nothing said is dropped', () => {
  it.each(WORLDS)('%s: every rule is held by the schema or said in its collection', (fixture) => {
    const files = readWorld(fixture);
    const schema = project(files);
    const said = (c: string, words: string) => schema.collections.find((x) => x.name === c)!.description.includes(words);
    let rules = 0;
    for (const r of files.relations.relations) {
      const kind = WORLD_KINDS.find((k) => k.id === r.kind)!;
      const out = kind.projection({ id: r.id, from: r.from, to: r.to, property: r.property, answers: r.answers || {} });
      const home = (on: 'from' | 'to' | 'own') => collectionName(on === 'own' ? r.id : on === 'to' ? String(r.to) : r.from);
      for (const rule of out.rules) {
        rules += 1;
        const h = rule.holds;
        const c = schema.collections.find((x) => x.name === home(rule.on))!;
        if ('shape' in h) continue;
        if ('unique' in h) expect([rule.says, c.indexes.some((i) => i.fields.join() === h.unique.map(fieldName).join())]).toEqual([rule.says, true]);
        else if ('pairOnce' in h) expect([rule.says, schema.claims.some((x) => x.held && x.says === rule.says)]).toEqual([rule.says, true]);
        else expect([rule.says, said(c.name, rule.says), schema.notHeld.some((n) => n.says === rule.says)]).toEqual([rule.says, true, true]);
      }
      // R10: a link to a noun HOLDS its "when it goes" rule on the column, with a held claim; a text id
      // (no single collection) says it. Never both, never neither.
      for (const f of out.fields.filter((x) => x.whenTargetGoes)) {
        const c = home(f.on);
        const col = schema.collections.find((x) => x.name === c)!.columns.find((x) => x.name === fieldName(f.name))!;
        const id = `${r.id}/${col.name}-${f.whenTargetGoes}`;
        const held = col.whenTargetGoes === f.whenTargetGoes && schema.claims.some((x) => x.held && x.id === id);
        // Another rule may be said on the same field (set once): only the link's own counts.
        const said = schema.notHeld.some((n) => n.collection === c && n.field === col.name && (n.claim === id || (col.type !== 'Pointer' && /\bgo(es)?\b/.test(n.says))));
        expect([r.id, f.name, col.type, held, said]).toEqual([r.id, f.name, col.type, col.type === 'Pointer', col.type !== 'Pointer']);
      }
    }
    if (files.relations.relations.length) expect(rules).toBeGreaterThan(0);
    for (const n of schema.notHeld) expect([n.says, said(n.collection, n.says), n.why.length > 0]).toEqual([n.says, true, true]);
  });

  it.each(WORLDS)('%s: every required field, choice and unique rule has a held claim with a mutant', (fixture) => {
    const schema = project(readWorld(fixture));
    const mutants = schema.claims.filter((c) => c.held).map((c) => JSON.stringify(c.mutant));
    for (const c of schema.collections) {
      for (const col of c.columns.filter((x) => x.required)) expect(mutants).toContain(JSON.stringify({ dropRequired: { collection: c.name, field: col.name } }));
      for (const k of c.checks) expect(mutants).toContain(JSON.stringify({ dropCheck: { collection: c.name, field: k.field } }));
      for (const i of c.indexes) expect(mutants).toContain(JSON.stringify({ dropIndex: { collection: c.name, fields: i.fields } }));
    }
    // and every mutant takes exactly its one rule out
    for (const c of schema.claims.filter((x) => x.held)) expect(schemaText(applyMutant(schema, c.mutant!))).not.toBe(schemaText(schema));
  });

  it('a mutant that takes nothing out is refused, not run', () => {
    const schema = project(readWorld('world'));
    expect(() => applyMutant(schema, { dropCheck: { collection: 'Person', field: 'name' } })).toThrow(/takes nothing out/);
    expect(() => applyMutant(schema, { dropRequired: { collection: 'Nowhere', field: 'x' } })).toThrow(/names a collection/);
  });
});

describe('the names', () => {
  it('are the person’s words, made into names the backend manager accepts', () => {
    expect([collectionName('course-run'), collectionName('person'), fieldName('held on'), fieldName('email'), fieldName('first_name')]).toEqual([
      'CourseRun',
      'Person',
      'heldOn',
      'email',
      'first_name'
    ]);
  });
});

describe('a noun known in two other systems (bug P116-ONT-003-two-systems)', () => {
  it('has an id field per system, each named after its relation and each unique', () => {
    const w = readWorld('world');
    const there = w.relations.relations.find((r) => r.id === 'on-the-course-platform')!;
    w.relations.relations.push({ ...clone(there), id: 'mailing', to: 'the mailing system', sentence: 'A member is also on the mailing list.' });
    const schema = project(w);
    const person = schema.collections.find((c) => c.name === 'Person')!;
    expect(person.columns.filter((c) => c.relation === 'on-the-course-platform' || c.relation === 'mailing').map((c) => [c.name, c.relation])).toEqual([
      ['onTheCoursePlatformId', 'on-the-course-platform'],
      ['mailingId', 'mailing']
    ]);
    expect(schema.claims.map((c) => c.id).filter((id) => /Id-is-unique$/.test(id))).toEqual(['person/onTheCoursePlatformId-is-unique', 'person/mailingId-is-unique']);
  });

  it('the same system said in other words stores to the same field — the name is the relation’s, not the words’', () => {
    const w = readWorld('world');
    w.relations.relations.find((r) => r.id === 'on-the-course-platform')!.to = 'the learning platform';
    expect(project(w).collections.find((c) => c.name === 'Person')!.columns.map((c) => c.name)).toContain('onTheCoursePlatformId');
  });
});

describe('what the projection refuses', () => {
  it('a world the validator refuses, in its words', () => {
    const files = readWorld('world');
    files.relations.relations[0].kind = 'is-related-to';
    const out = projectWorld(files);
    expect(out.ok).toBe(false);
    expect(!out.ok && out.problems.join(' ')).toMatch(/is-related-to/);
  });

  it('two relations making one field', () => {
    const files = readWorld('world');
    files.relations.relations.push({ id: 'note-subject', from: 'note', to: 'person', kind: 'by-name', sentence: 'A note names a person by email.' });
    files.relations.relations.push({ id: 'note-editor', from: 'note', to: 'person', kind: 'by-name', sentence: 'A note names who last edited it.' });
    const out = projectWorld(files);
    expect(!out.ok && out.problems).toEqual([
      'the relation "note-editor" makes a field called "person" on Note, which already has one: two things would share one field.'
    ]);
  });

  it('a relation and a noun that would be one collection', () => {
    const files = readWorld('world');
    files.nouns.nouns.push({ id: 'membership', name: 'Membership', sentence: 'A membership is a plan someone buys.' });
    const out = projectWorld(files);
    expect(!out.ok && out.problems).toEqual(['the noun "membership" and the relation "membership" would both be the collection Membership.']);
  });

  it('a name the store cannot hold', () => {
    const files = readWorld('world');
    files.nouns.nouns[0].properties!.push({ name: '2nd email', kind: 'text' });
    const out = projectWorld(files);
    expect(!out.ok && out.problems.join(' ')).toMatch(/"2ndEmail" cannot be a field's name on Person/);
  });

  it('two collections that each need the other first', () => {
    const files = readWorld('world');
    files.relations.relations.push({
      id: 'company-account',
      from: 'company',
      to: 'account',
      kind: 'belongs-to',
      sentence: 'Every company has its one account.',
      answers: { required: true }
    });
    const out = projectWorld(files);
    expect(!out.ok && out.problems.join(' ')).toMatch(/cannot be made: following its required links leads back/);
  });
});

describe('AC4 — nothing in the package reaches an adapter', () => {
  const walk = (p: string): string[] => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((e) => walk(path.join(p, e))) : [p]);
  const root = path.join(__dirname, '..');
  const sources = walk(root).filter((f) => /\.ts$/.test(f) && !f.includes('node_modules') && !f.includes(`${path.sep}tests${path.sep}`));

  // P112 OWN-001 moved the v2 format into this package (world.ts said it would). Its imports from outside are named
  // here, not waived: the JSON Schema validator the format moved with, and Node's file system in the Node-only
  // `format-node` entry. An adapter, a runtime or any other package still fails this gate.
  const NAMED: Record<string, string[]> = {
    'format/validator.ts': ['ajv'],
    'format-node.ts': ['fs', 'path'],
    // P112 OWN-006 — the suite's command over a folder on disk; the suite itself (`editor-suite.ts`) is in memory.
    // P112 OWN-003 — the command grades an editor's graph runner with the spec package's scenarios and runner (a
    // sibling package, by source path). The in-memory suite takes the grader as an option and imports nothing of it.
    'editor-suite-node.ts': ['fs', 'path', '../nodegx-node-spec/src']
  };

  /** A relative import that leaves the package root is an outside import too (P112 OWN-003: the first one, named above). */
  const leavesPackage = (from: string, spec: string) => spec.startsWith('../') && !path.resolve(path.dirname(from), spec).startsWith(root + path.sep);

  it('every import stays inside the package', () => {
    const outside = sources.flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(/(?:^|\n)\s*(?:import|export)[^'";]*from\s+'([^']+)'/g)]
        .map((m) => m[1])
        .filter((spec) => !spec.startsWith('./') && !(spec.startsWith('../') && !leavesPackage(f, spec)))
        .filter((spec) => !(NAMED[path.relative(root, f).split(path.sep).join('/')] ?? []).includes(spec))
        .map((spec) => `${path.relative(root, f)}: ${spec}`)
    );
    expect(sources.length).toBeGreaterThan(10);
    expect(outside).toEqual([]);
  });

  it('and the check would see one', () => {
    expect([..."import { createAdapter } from '@noodl/runtime';".matchAll(/(?:^|\n)\s*(?:import|export)[^'";]*from\s+'([^']+)'/g)].map((m) => m[1])).toEqual(['@noodl/runtime']);
  });

  it('nor names an engine, in the second fixture or its projection', () => {
    const ENGINES = /sqlite|postgres|mongo|mysql|neo4j|cypher|gremlin|sparql|arangodb|dgraph|janusgraph|\brdf\b|\bowl\b|\bgql\b/i;
    const files = walk(path.join(FIXTURES, 'world-every-kind')).concat(golden('world'));
    expect(files.filter((f) => ENGINES.test(fs.readFileSync(f, 'utf8')))).toEqual([]);
  });
});
