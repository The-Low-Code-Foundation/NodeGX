/**
 * P116 ONT-001 — the world's files, kinds, validator and write rule.
 *
 * The kinds are pinned to what ONT-000 measured (`kinds.hand.json`, `kinds.json`); the fixture
 * runs through BOTH the hand-written validator and `schemas/world.schema.json` (ajv), so the
 * schema a stranger's tool reads and the validator this package runs cannot disagree on it.
 */
import * as fs from 'fs';
import * as path from 'path';

import Ajv from 'ajv';

import {
  describe as describeKind,
  PROPERTY_KINDS,
  planWorldWrite,
  serializeWorldFile,
  validateWorld,
  WORLD_FILES,
  WORLD_KINDS,
  WORLD_VOCABULARY,
  worldRevision,
  type FieldKind,
  type WorldFiles,
  type WorldTexts
} from '../world';

const REPO = path.resolve(__dirname, '../../..');
const PHASE = path.join(REPO, 'dev-docs/tasks/phase-116-the-person-says-what-their-world-is');
const hand = JSON.parse(fs.readFileSync(path.join(PHASE, 'kinds.hand.json'), 'utf8'));
const census = JSON.parse(fs.readFileSync(path.join(PHASE, 'kinds.json'), 'utf8'));
const FIXTURE = path.join(__dirname, 'fixtures/world');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/world.schema.json'), 'utf8'));

const ELEVEN: FieldKind[] = ['text', 'number', 'yesno', 'date', 'choice', 'link', 'links', 'file', 'location', 'list', 'anything'];

function readFixture(): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema);
const schemaAccepts = (name: keyof WorldFiles, value: unknown): boolean =>
  ajv.validate(`${schema.$id}#/definitions/${name}File`, value) as boolean;

describe('the kinds are what ONT-000 measured', () => {
  it('are the census kinds, in its order', () => {
    expect(WORLD_KINDS.map((k) => k.id)).toEqual(Object.keys(hand.kinds));
    expect(WORLD_KINDS.map((k) => k.id)).toEqual(census.kinds.map((k: { id: string }) => k.id));
  });

  it("carry the census's sentence, distinction and projection words verbatim", () => {
    for (const k of WORLD_KINDS) {
      expect({ id: k.id, sentence: k.sentence, distinguishes: k.distinguishes, projectsTo: k.projectsTo }).toEqual({
        id: k.id,
        sentence: hand.kinds[k.id].sentence,
        distinguishes: hand.kinds[k.id].distinguishes,
        projectsTo: hand.kinds[k.id].projectsTo
      });
    }
  });

  it('carry its counts, and say so when a kind rests on one source or one row', () => {
    let total = 0;
    for (const c of census.kinds as { id: string; single: boolean; bySource: Record<string, number> }[]) {
      const k = WORLD_KINDS.find((x) => x.id === c.id)!;
      const rows = Object.values(c.bySource).reduce((a, b) => a + b, 0);
      total += rows;
      expect({ id: k.id, rows: k.evidence.rows, sources: [...k.evidence.sources].sort() }).toEqual({ id: c.id, rows, sources: Object.keys(c.bySource).sort() });
      const thin = Object.keys(c.bySource).length === 1 || c.single;
      expect({ id: k.id, thin: Boolean(k.evidence.thin) }).toEqual({ id: c.id, thin });
    }
    expect(total).toBe(311); // 303 relation rows (ONT-000) + settled's 8 borrow-backed rows (ONT-011 step 2)
    expect(WORLD_KINDS.filter((k) => k.evidence.sources.length === 1).length).toBe(6);
    expect(WORLD_KINDS.filter((k) => k.evidence.rows === 1).map((k) => k.id)).toEqual(['part-of-tree']);
  });

  it("seed one mutant per row of Richard's list, under the kind each row names", () => {
    const want: Record<string, number> = {};
    for (const row of hand.oral.rows) want[row.kind] = (want[row.kind] || 0) + 1;
    const have: Record<string, number> = {};
    for (const k of WORLD_KINDS) {
      const n = k.mutants.filter((m) => m.from === 'oral').length;
      if (n) have[k.id] = n;
    }
    expect(have).toEqual(want);
  });

  it('ask each note its question, under the kind the note is attributed to', () => {
    for (const note of hand.notes) {
      const k = WORLD_KINDS.find((x) => x.id === note.kind)!;
      expect({ note: note.note, asked: k.questions.some((q) => q.from === 'note') }).toEqual({ note: note.note, asked: true });
    }
  });

  it('give every question the incident it prevents, and every mutant a reason', () => {
    for (const k of WORLD_KINDS) {
      expect(k.questions.length).toBeGreaterThan(0);
      expect(k.mutants.length).toBeGreaterThan(0);
      for (const q of k.questions) expect([k.id, q.id, q.ask.trim().length > 0, q.prevents.trim().length > 0]).toEqual([k.id, q.id, true, true]);
      for (const m of k.mutants) expect([k.id, m.id, m.why.trim().length > 0]).toEqual([k.id, m.id, true]);
    }
  });

  it('name only kinds that exist when an answer changes the kind', () => {
    const ids = WORLD_KINDS.map((k) => k.id);
    for (const k of WORLD_KINDS) for (const q of k.questions) if (q.changesKind) expect(ids).toContain(q.changesKind.to);
  });

  it('project to the eleven field kinds, deterministically', () => {
    const files = readFixture();
    for (const r of files.relations.relations) {
      const k = WORLD_KINDS.find((x) => x.id === r.kind)!;
      const input = { id: r.id, from: r.from, to: r.to, property: r.property, answers: r.answers || {} };
      const a = k.projection(input);
      expect(k.projection(clone(input))).toEqual(a);
      for (const f of a.fields) expect(ELEVEN).toContain(f.kind);
    }
  });
});

describe('the fixture world', () => {
  it('passes the validator', () => {
    expect(validateWorld(readFixture()).problems).toEqual([]);
  });

  it('passes the JSON Schema, file by file', () => {
    const files = readFixture();
    for (const name of ['nouns', 'relations', 'vocabulary'] as const) {
      expect({ name, ok: schemaAccepts(name, files[name]), errors: ajv.errors }).toEqual({ name, ok: true, errors: null });
    }
  });

  it('uses most of the kinds it is a fixture for', () => {
    const used = new Set(readFixture().relations.relations.map((r) => r.kind));
    expect(used.size).toBeGreaterThanOrEqual(8);
  });
});

describe('AC1 — the refusals name what was expected', () => {
  const refuse = (mutate: (w: WorldFiles) => void) => {
    const w = readFixture();
    mutate(w);
    const v = validateWorld(w);
    expect(v.ok).toBe(false);
    return v.problems;
  };

  it('refuses a relation whose kind is not in the pinned vocabulary', () => {
    const [p] = refuse((w) => (w.relations.relations[1].kind = 'has-many'));
    expect(p.file).toBe('docs/world/relations.json');
    expect(p.at).toBe('relations[1].kind');
    expect(p.found).toBe('"has-many"');
    for (const k of WORLD_KINDS) expect(p.expected).toContain(k.id);
    expect(p.message).toContain('not in nodegx-world-kinds v1');
  });

  it('refuses an answer the kind does not ask for', () => {
    const [p] = refuse((w) => (w.relations.relations[1].answers!.startsEnds = true));
    expect(p.at).toBe('relations[1].answers.startsEnds');
    expect(p.expected).toBe('one of several, required, whenTargetGoes, moves');
    expect(p.message).toContain('which a belongs-to does not ask');
  });

  it('refuses a noun with no sentence', () => {
    const [p] = refuse((w) => (w.nouns.nouns[2].sentence = '  '));
    expect(p.file).toBe('docs/world/nouns.json');
    expect(p.at).toBe('nouns[2].sentence');
    expect(p.expected).toBe('the sentence the person said about it');
    expect(p.message).toContain('"Company"');
  });

  it.each([
    ['an answer of the wrong shape', (w: WorldFiles) => (w.relations.relations[1].answers!.whenTargetGoes = 'cascade'), 'relations[1].answers.whenTargetGoes', 'one of "goes-too", "stays-unlinked", "blocks"'],
    ['an answer that means it is another kind', (w: WorldFiles) => (w.relations.relations[1].answers!.several = true), 'relations[1].kind', 'is-on'],
    ['a link written as a property', (w: WorldFiles) => w.nouns.nouns[0].properties!.push({ name: 'account', kind: 'link' }), 'nouns[0].properties[2].kind', `one of ${PROPERTY_KINDS.join(', ')}`],
    ['details on a kind that carries none', (w: WorldFiles) => (w.relations.relations[1].properties = [{ name: 'since', kind: 'date' }]), 'relations[1].properties', 'no details: this kind carries none'],
    ['a one-of over free text', (w: WorldFiles) => (w.nouns.nouns[1].properties![0] = { name: 'plan', kind: 'text' }), 'relations[2].property', 'a choice property'],
    ['a relation to a noun that is not there', (w: WorldFiles) => (w.relations.relations[1].to = 'firm'), 'relations[1].to', 'a noun in docs/world/nouns.json'],
    ['a points-at-one-of with one target', (w: WorldFiles) => (w.relations.relations[6].to = 'person'), 'relations[6].to', 'a list of two or more nouns'],
    ['a choice with no list', (w: WorldFiles) => delete w.nouns.nouns[1].properties![0].values, 'nouns[1].properties[0].values', 'the list a choice is one of'],
    ['a relation with no sentence', (w: WorldFiles) => delete (w.relations.relations[0] as { sentence?: string }).sentence, 'relations[0].sentence', 'the sentence the person said'],
    ['a vocabulary this reader does not know', (w: WorldFiles) => (w.vocabulary.version = 2), 'vocabulary', 'nodegx-world-kinds v1'],
    ['a key the format does not have', (w: WorldFiles) => ((w.nouns.nouns[0] as unknown as Record<string, unknown>).table = 'people'), 'nouns[0].table', 'only id, name, sentence, properties, signsIn, was']
  ])('refuses %s', (_name, mutate, at, expected) => {
    const problems = refuse(mutate as (w: WorldFiles) => void);
    expect(problems.map((p) => [p.at, p.expected])).toContainEqual([at, expected]);
  });

  it('agrees with the JSON Schema on every structural refusal', () => {
    const structural: [keyof WorldFiles, (w: WorldFiles) => void][] = [
      ['nouns', (w) => (w.nouns.nouns[2].sentence = '  ')],
      ['nouns', (w) => w.nouns.nouns[0].properties!.push({ name: 'account', kind: 'link' })],
      ['nouns', (w) => delete w.nouns.nouns[1].properties![0].values],
      ['nouns', (w) => ((w.nouns.nouns[0] as unknown as Record<string, unknown>).table = 'people')],
      ['relations', (w) => delete (w.relations.relations[0] as { sentence?: string }).sentence]
    ];
    for (const [file, mutate] of structural) {
      const w = readFixture();
      mutate(w);
      expect(validateWorld(w).ok).toBe(false);
      expect(schemaAccepts(file, w[file])).toBe(false);
    }
  });
});

describe('AC2 — nothing names an engine or a graph framework', () => {
  const ENGINES = /sqlite|postgres|mongo|mysql|neo4j|cypher|gremlin|sparql|arangodb|dgraph|janusgraph|\brdf\b|\bowl\b|\bgql\b/i;
  const walk = (p: string): string[] =>
    fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((e) => walk(path.join(p, e))) : [p];

  it('in the module, the schema or the fixture', () => {
    const root = path.join(__dirname, '..');
    const files = [path.join(root, 'world.ts'), ...walk(path.join(root, 'world')), path.join(root, 'schemas/world.schema.json'), ...walk(FIXTURE)];
    const hits = files.filter((f) => ENGINES.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
    expect(files.length).toBeGreaterThan(8);
    expect(hits).toEqual([]);
  });

  it('and the check would see one', () => {
    expect(ENGINES.test('a junction table in Postgres')).toBe(true);
  });
});

describe('describe()', () => {
  it('gives every kind a tile and its long text', () => {
    for (const k of WORLD_KINDS) {
      const d = describeKind(k.id);
      expect([d.id, d.label.length > 0, d.line.length > 0, d.icon.length > 0]).toEqual([k.id, true, true, true]);
      expect(d.sentence).toBe(k.sentence);
      expect(d.questions.map((q) => q.id)).toEqual(k.questions.map((q) => q.id));
      expect(d.evidence).toMatch(/^\d+ fields? in \d+ apps?/);
    }
    expect(describeKind('part-of-tree').evidence).toBe('1 field in 1 app — one row: a single field in one prototype');
  });

  it('refuses a kind it does not know, naming the vocabulary', () => {
    expect(() => describeKind('has-many')).toThrow(`No kind "has-many" in ${WORLD_VOCABULARY.id} v1.`);
  });
});

describe('the write rule — refuse when the files changed since read', () => {
  const NONE: WorldTexts = { nouns: null, relations: null, vocabulary: null };
  const written = (plan: ReturnType<typeof planWorldWrite>): WorldTexts => {
    if (!plan.ok) throw new Error(plan.message);
    const out = { ...NONE };
    for (const w of plan.writes) out[(Object.keys(WORLD_FILES) as (keyof typeof WORLD_FILES)[]).find((n) => WORLD_FILES[n] === w.path)!] = w.content;
    return out;
  };

  it('writes a new world, and its revision is the revision of what it wrote', () => {
    const plan = planWorldWrite({ disk: NONE, candidate: readFixture() });
    expect(plan.ok && plan.writes.map((w) => w.path)).toEqual([WORLD_FILES.nouns, WORLD_FILES.relations, WORLD_FILES.vocabulary]);
    expect(plan.ok && plan.revision).toBe(worldRevision(written(plan)));
  });

  it('refuses to replace a world it was not told it read', () => {
    const disk = written(planWorldWrite({ disk: NONE, candidate: readFixture() }));
    const plan = planWorldWrite({ disk, candidate: readFixture() });
    expect(plan).toMatchObject({ ok: false, refusal: 'conflict' });
  });

  it('refuses when the files changed since the revision it read', () => {
    const disk = written(planWorldWrite({ disk: NONE, candidate: readFixture() }));
    const read = worldRevision(disk);
    const changed = { ...disk, nouns: disk.nouns!.replace('Company', 'Firm') };
    const plan = planWorldWrite({ disk: changed, candidate: readFixture(), ifRevision: read });
    expect(plan).toMatchObject({ ok: false, refusal: 'conflict', expected: read, actual: worldRevision(changed) });
  });

  it('writes only the file that changed, and nothing when nothing did', () => {
    const disk = written(planWorldWrite({ disk: NONE, candidate: readFixture() }));
    const same = planWorldWrite({ disk, candidate: readFixture(), ifRevision: worldRevision(disk) });
    expect(same.ok && same.writes).toEqual([]);
    const edited = readFixture();
    edited.nouns.nouns[2].sentence = 'A company is where people work.';
    const one = planWorldWrite({ disk, candidate: edited, ifRevision: worldRevision(disk) });
    expect(one.ok && one.writes.map((w) => w.path)).toEqual([WORLD_FILES.nouns]);
  });

  it('refuses an invalid world with the validator\'s words', () => {
    const bad = readFixture();
    bad.relations.relations[0].kind = 'member-of';
    const plan = planWorldWrite({ disk: NONE, candidate: bad });
    expect(plan).toMatchObject({ ok: false, refusal: 'invalid' });
    expect(!plan.ok && plan.message).toContain('"member-of"');
  });

  it('writes the fixture byte for byte as it is on disk', () => {
    for (const [name, rel] of Object.entries(WORLD_FILES)) {
      expect(serializeWorldFile(readFixture()[name as keyof WorldFiles])).toBe(fs.readFileSync(path.join(FIXTURE, rel), 'utf8'));
    }
  });
});
