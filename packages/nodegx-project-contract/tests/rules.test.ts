/**
 * P116 ONT-013 — the rule is a sentence: the fifth file, `docs/world/rules.json`.
 *
 * Graded here without an engine, on the `world-rules` fixture (the task's three sentences):
 *
 *   - **AC2, the validator**: a `holds` that fits no shape is refused with the shapes in words —
 *     `{ sql: … }` is the mutant, and it is not written; a detail the noun lacks, a rule with no
 *     mutant, a `from` that is not one of the three, two shapes at once, a shape with a home of
 *     its own, a `by` on a move, each refused by name;
 *   - **AC1, the projection**: a rule whose shape the store keeps is a held claim under the rule's
 *     own id (graded on both engines in `nodegx-backend`'s `tests/ont-013-rules.test.ts`); one it
 *     does not is in `notHeld` and in the description, prefixed *Not kept*;
 *   - **AC3, the read-back**: what the person sees is the collection's description — a held
 *     rule's sentence is NOT under *Not kept*, an unkept one IS, and a description that carries
 *     an unkept sentence without the prefix (step 3's mutant) is read as a law by this spec's own
 *     reader, so the reader would catch it;
 *   - **R-f**: a held rule's sentence rides the backend's rule (`onlyWhile … says`), so the 409
 *     carries it (measured over HTTP in the backend spec);
 *   - the mutants: each rule never said, graded statically as `unkept` when the store only says it;
 *   - the write rule, the JSON schema, the migration's words and the brief.
 */
import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

import {
  gradeStatically,
  migrationWords,
  planMigration,
  planWorldWrite,
  projectWorld,
  RULE_SHAPES,
  RULES_FILE,
  serializeWorldFile,
  validateWorld,
  VERBS_FILE,
  WORLD_FILES,
  worldBrief,
  worldMutants,
  worldRevision,
  type WorldFiles,
  type WorldSchema,
  type WorldTexts
} from '../world';

const FIXTURE = path.join(__dirname, 'fixtures/world-rules');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
const readWorld = (): WorldFiles => ({ nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary), rules: read(RULES_FILE) });
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/world.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema);
const schemaAccepts = (value: unknown): boolean => ajv.validate(`${schema.$id}#/definitions/rulesFile`, value) as boolean;

function project(files: WorldFiles): WorldSchema {
  const out = projectWorld(files);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.schema;
}
/** The fixture with one rule's `holds` (or the rule itself) edited. */
function withRule(id: string, edit: (rule: Record<string, unknown>) => void): WorldFiles {
  const w = clone(readWorld());
  const rule = w.rules!.rules.find((r) => r.id === id)! as unknown as Record<string, unknown>;
  edit(rule);
  return w;
}
const problemsOf = (w: WorldFiles): string[] => validateWorld(w as unknown as Record<string, unknown>).problems.map((p) => `${p.file} ${p.at}: ${p.message}`);

const AMOUNT = 'Once an invoice is issued, its amount never changes.';
const NEVER_BACK = 'An assignment goes from draft to issued to withdrawn. It never goes back.';
const COACH = 'Only a coach may issue an assignment.';
const TWENTY = 'A cohort holds at most twenty learners.';

/**
 * AC3's reader: what a person sees on the Schema card is the description. It opens with the
 * sentence; what follows "Not kept by the database yet:" is not a law. A rule's sentence is read
 * as `kept` when it is nowhere in the description (the store keeps it, and says nothing), `said`
 * when it is after the prefix, and `law` when it is in the description before the prefix or with
 * no prefix at all — the lie step 3 exists to prevent.
 */
function readBack(description: string, says: string): 'kept' | 'said' | 'law' {
  const sentence = says.replace(/\.$/, '');
  const at = description.indexOf('Not kept by the database yet:');
  const before = at < 0 ? description : description.slice(0, at);
  const after = at < 0 ? '' : description.slice(at);
  if (before.includes(sentence)) return 'law';
  return after.includes(sentence) ? 'said' : 'kept';
}

describe('ONT-013 AC2 — the validator refuses, in words', () => {
  it('the fixture validates, through the hand validator and the JSON schema', () => {
    expect(problemsOf(readWorld())).toEqual([]);
    expect(schemaAccepts(read(RULES_FILE))).toBe(true);
  });

  it('a holds of code or SQL fits no shape: refused, the shapes listed, and not written (the mutant)', () => {
    const w = withRule('invoice-amount-settled', (r) => (r.holds = { sql: 'UPDATE invoices SET amount = amount' }));
    const problems = problemsOf(w);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^docs\/world\/rules\.json rules\[0\]\.holds: /);
    expect(problems[0]).toContain('fits no shape');
    expect(problems[0]).toContain('ask the person a narrower question');
    for (const s of RULE_SHAPES) expect(problems[0]).toContain(s.words);
    expect(schemaAccepts(w.rules)).toBe(false);
    const plan = planWorldWrite({ disk: { nouns: null, relations: null, vocabulary: null }, candidate: w });
    expect(plan.ok).toBe(false);
    expect(plan.ok === false && plan.refusal).toBe('invalid');
    expect(plan.ok === false && plan.refusal === 'invalid' && plan.problems.every((p) => p.file === RULES_FILE)).toBe(true);
  });

  it.each([
    ['a detail the noun lacks', 'invoice-amount-settled', (r: Record<string, unknown>) => (r.holds = { frozen: ['total'], unless: { status: 'draft' } }), /"total", which is not a detail of "invoice" \(its details are "amount", "status", "number"\)/],
    ['no mutant', 'invoice-amount-settled', (r: Record<string, unknown>) => delete r.mutant, /names no mistake/],
    ['an agent as the source', 'invoice-amount-settled', (r: Record<string, unknown>) => (r.from = 'claude'), /An agent is not a source/],
    ['two shapes at once', 'invoice-amount-settled', (r: Record<string, unknown>) => (r.holds = { frozen: ['amount'], setOnce: 'amount' }), /holds 2 shapes at once \(setOnce, frozen\)/],
    ['a shape with a home of its own', 'invoice-amount-settled', (r: Record<string, unknown>) => (r.holds = { secret: 'amount' }), /"secret", which has a home of its own: a noun's own answer/],
    ['who may make a move, on the move', 'assignment-never-back', (r: Record<string, unknown>) => ((r.holds as { from: Record<string, unknown> }).from.draft = { to: ['issued'], by: 'coach' }), /from "draft" has "by".*\{ "onlyBy": role, "changes": "status", "to": value \}/],
    ['a move to a value off the list', 'assignment-never-back', (r: Record<string, unknown>) => ((r.holds as { from: Record<string, unknown> }).from.draft = { to: ['sent'] }), /to "sent", which is not one of "status"'s values/],
    ['an unless on a free-text detail', 'invoice-amount-settled', (r: Record<string, unknown>) => (r.holds = { frozen: ['amount'], unless: { amount: 0 } }), /"unless" names "amount", a number; this shape takes a choice or yesno/],
    ['an unless with an operator', 'invoice-amount-settled', (r: Record<string, unknown>) => (r.holds = { frozen: ['amount'], unless: { $or: [{ status: 'draft' }] } }), /"\$or" is not one/],
    ['a count of something no relation joins', 'cohort-at-most-twenty', (r: Record<string, unknown>) => (r.holds = { atMost: 20, of: 'invoice' }), /no relation joins a invoice to a cohort/],
    ['a count per the wrong relation', 'cohort-at-most-twenty', (r: Record<string, unknown>) => (r.holds = { atMost: 20, of: 'learner', per: 'nothing' }), /"nothing" is not one from "learner" to "cohort"/],
    ['a limit of nothing', 'cohort-at-most-twenty', (r: Record<string, unknown>) => (r.holds = { atMost: 0, of: 'learner', per: 'learner-cohort' }), /a whole number of one or more/],
    ['only-by to a value off the list', 'assignment-issued-by-coach', (r: Record<string, unknown>) => (r.holds = { onlyBy: 'coach', changes: 'status', to: 'sent' }), /"to" is "sent", which is not one of "status"'s values/],
    ['a rule about nothing', 'cohort-at-most-twenty', (r: Record<string, unknown>) => (r.on = 'learner-cohort'), /is about "learner-cohort", which is not a noun or a relation with records of its own/],
    ['a key the format does not have', 'cohort-at-most-twenty', (r: Record<string, unknown>) => (r.engine = 'any'), /has "engine", which this format does not have/]
  ])('%s', (_what, id, edit, words) => {
    const problems = problemsOf(withRule(id, edit));
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.startsWith(RULES_FILE))).toBe(true);
    expect(problems.join('\n')).toMatch(words);
  });

  it('the rules are read only over a world the three files describe', () => {
    const w = readWorld();
    w.nouns.nouns = w.nouns.nouns.filter((n) => n.id !== 'cohort');
    const problems = validateWorld(w as unknown as Record<string, unknown>).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.file === RULES_FILE)).toBe(false);
  });
});

describe('ONT-013 AC1 — a rule projects as a kind’s rule does', () => {
  const schema = project(readWorld());
  const col = (name: string) => schema.collections.find((c) => c.name === name)!;

  it('a shape the store keeps is a held claim under the rule’s id, from the rule, with a mutant', () => {
    const held = schema.claims.filter((c) => 'rule' in c.from);
    expect(held.map((c) => [c.id, c.held, c.says, c.mutant])).toEqual([
      ['invoice-amount-settled/frozen-once-issued', true, AMOUNT, { dropOnlyWhile: { collection: 'Invoice', frozen: true } }],
      ['assignment-never-back/status-never-goes-back', true, NEVER_BACK, { dropOnlyWhile: { collection: 'Assignment', moves: 'status' } }]
    ]);
    // The freeze claim binds the row (issued) and frees one (draft), from the condition itself.
    const freeze = held[0].steps;
    expect(freeze.some((s) => 'make' in s && s.data.status === 'issued')).toBe(true);
    expect(freeze.some((s) => 'make' in s && s.data.status === 'draft')).toBe(true);
    expect(freeze.filter((s) => 'change' in s).map((s) => 'change' in s && Boolean(s.refused))).toEqual([true, false]);
  });

  it('R-f: the person’s sentence rides the backend’s rule, so a refusal carries it', () => {
    expect(col('Invoice').onlyWhile).toEqual({ update: { frozen: { fields: ['number', 'amount'], unless: { status: 'draft' }, says: AMOUNT } } });
    expect(col('Assignment').onlyWhile).toEqual({
      update: { moves: { status: { draft: { to: ['issued'], says: NEVER_BACK }, issued: { to: ['withdrawn'], says: NEVER_BACK }, withdrawn: { to: [], says: NEVER_BACK } } } }
    });
    // A kind's rule carries none: the backend's own words stand for it (nothing in the fixture but the two rules says one).
    for (const c of schema.collections) if (c.name !== 'Invoice' && c.name !== 'Assignment') expect(c.onlyWhile).toBeUndefined();
  });

  it('a shape the store does not keep is said, naming its home, and makes no claim', () => {
    expect(schema.notHeld.map((n) => [n.collection, n.says, n.field])).toEqual([
      ['Assignment', COACH, 'status'],
      ['Cohort', TWENTY, undefined]
    ]);
    expect(schema.notHeld[0].why).toMatch(/a world names no role/);
    expect(schema.notHeld[1].why).toMatch(/ONT-016/);
    expect(schema.claims.filter((c) => !c.held)).toEqual([]);
  });

  it('a set-once field under the rule’s condition is claimed on a row the freeze binds', () => {
    const setOnce = schema.claims.find((c) => c.id === 'invoice/number-is-set-once')!;
    const made = setOnce.steps.find((s) => 'make' in s)!;
    expect('make' in made && made.data.status).toBe('issued');
  });
});

describe('ONT-013 AC3 — the read-back is what the person sees', () => {
  const schema = project(readWorld());
  const description = (name: string) => schema.collections.find((c) => c.name === name)!.description;

  it('a held rule’s sentence is nowhere in the description; an unkept one is under “Not kept”, in that word', () => {
    expect(readBack(description('Invoice'), AMOUNT)).toBe('kept');
    expect(readBack(description('Assignment'), NEVER_BACK)).toBe('kept');
    expect(readBack(description('Assignment'), COACH)).toBe('said');
    expect(readBack(description('Cohort'), TWENTY)).toBe('said');
    expect(description('Assignment')).toBe('An assignment is a piece of work a coach gives a learner. Not kept by the database yet: Only a coach may issue an assignment.');
    expect(description('Cohort')).toBe('A cohort is a group of learners who start together. Not kept by the database yet: A cohort holds at most twenty learners.');
  });

  it('the mutant of step 3 — the sentence written without the prefix — would read as a law, and the reader says so', () => {
    const cohort = schema.collections.find((c) => c.name === 'Cohort')!;
    const mutant = `${cohort.sentence} ${TWENTY}`;
    expect(readBack(mutant, TWENTY)).toBe('law');
    expect(readBack(`${cohort.sentence} ${TWENTY} Not kept by the database yet: something else.`, TWENTY)).toBe('law');
  });

  it('the three sentences of the task are each held or said — none is dropped', () => {
    const all = schema.collections.map((c) => c.description).join('\n');
    const saidOrHeld = (says: string, home: string) => readBack(description(home), says);
    expect([saidOrHeld(AMOUNT, 'Invoice'), saidOrHeld(NEVER_BACK, 'Assignment'), saidOrHeld(COACH, 'Assignment'), saidOrHeld(TWENTY, 'Cohort')]).toEqual(['kept', 'kept', 'said', 'said']);
    expect(all).not.toContain('..');
  });
});

describe('ONT-013 — the mutants: each rule never said', () => {
  const files = readWorld();
  const { right, mutants } = worldMutants(files);
  const ofRules = mutants.filter((m) => 'rule' in m.of);

  it('one per rule, with the rule’s own mistake, killed by the rule’s sentence', () => {
    expect(ofRules.map((m) => [m.id, m.mistake, m.kills])).toEqual(
      files.rules!.rules.map((r) => [`${r.id}/never-said`, r.mutant, { rule: r.id, says: r.says }])
    );
  });

  it('a rule the store keeps is run (its claim fails on the schema without it); one it only says survives as unkept', () => {
    const verdicts = Object.fromEntries(ofRules.map((m) => [m.id, gradeStatically(right, m)]));
    expect(verdicts['invoice-amount-settled/never-said'].verdict).toBe('run');
    expect(verdicts['assignment-never-back/never-said'].verdict).toBe('run');
    expect(verdicts['assignment-issued-by-coach/never-said']).toMatchObject({ verdict: 'survives', as: 'unkept' });
    expect(verdicts['cohort-at-most-twenty/never-said']).toMatchObject({ verdict: 'survives', as: 'unkept' });
    // The held rule's own claim is the first the engine would run on its mutant.
    const run = verdicts['invoice-amount-settled/never-said'];
    expect(run.verdict === 'run' && run.claims[0]).toBe('invoice-amount-settled/frozen-once-issued');
  });
});

describe('ONT-013 — the write rule, the diff and the brief', () => {
  const three = (): WorldFiles => {
    const w = readWorld();
    delete w.rules;
    return w;
  };
  const disk = (): WorldTexts => ({
    nouns: serializeWorldFile(read(WORLD_FILES.nouns)),
    relations: serializeWorldFile(read(WORLD_FILES.relations)),
    vocabulary: serializeWorldFile(read(WORLD_FILES.vocabulary)),
    verbs: null,
    rules: serializeWorldFile(read(RULES_FILE))
  });

  it('the rules join the revision when they are there', () => {
    const withRules = worldRevision(disk());
    expect(worldRevision({ ...disk(), rules: null })).not.toBe(withRules);
    expect(worldRevision({ ...disk(), rules: undefined })).not.toBe(withRules);
    // A rules file and a verbs file of the same text are not the same world.
    expect(worldRevision({ ...disk(), rules: null, verbs: disk().rules })).not.toBe(withRules);
  });

  it('a write that leaves the rules out keeps them, and is refused when the world it writes breaks them', () => {
    const d = disk();
    const kept = planWorldWrite({ disk: d, candidate: three(), ifRevision: worldRevision(d) });
    expect(kept.ok).toBe(true);
    expect(kept.ok && kept.writes).toEqual([]);
    expect(kept.ok && kept.revision).toBe(worldRevision(d));
    const broken = three();
    const invoice = broken.nouns.nouns.find((n) => n.id === 'invoice')!;
    invoice.properties = [{ name: 'status', kind: 'choice', values: ['draft', 'issued', 'paid'] }];
    invoice.answers!.calledBy = 'status'; // the three files still validate on their own: only the kept rule names the amount
    const refused = planWorldWrite({ disk: d, candidate: broken, ifRevision: worldRevision(d) });
    expect(refused.ok).toBe(false);
    expect(refused.ok === false && refused.refusal === 'invalid' && refused.problems.map((p) => p.file)).toEqual([RULES_FILE]);
    expect(refused.ok === false && refused.message).toMatch(/"amount", which is not a detail of "invoice"/);
  });

  it('a rule added is a migration step that keeps it, in the person’s words; a rule only said is a description', () => {
    const plan = planMigration(three(), readWorld());
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const words = migrationWords(plan.plan);
    expect(words.find((w) => w.includes('Keep, for invoices'))).toContain(AMOUNT.replace(/\.$/, ''));
    expect(words.find((w) => w.includes('Keep, for assignments'))).toContain(NEVER_BACK.replace(/\.$/, ''));
    expect(words.filter((w) => /^\d+\. Say what (assignments|cohorts) are/.test(w))).toHaveLength(2);
    const kept = plan.plan.steps.filter((s) => 'rules' in s);
    expect(kept.map((s) => 'rules' in s && s.rules.collection)).toEqual(['Invoice', 'Assignment']);
    expect(kept.map((s) => 'rules' in s && s.rules.onlyWhile?.update?.frozen?.says)).toEqual([AMOUNT, undefined]);
  });

  it('the brief says where a rule goes, that a sentence fitting no shape is not written, and that an unkept rule is shown as not kept', () => {
    const text = worldBrief();
    expect(text).toContain(`\`${RULES_FILE}\``);
    expect(text).toContain('This fifth file is optional.');
    expect(text).toContain('A sentence that fits no shape is not written. Ask the person a narrower question; never write a rule as free text, code or a query.');
    expect(text).toContain('shown as *not kept*, in those words');
    expect(text).toContain('Verbs you leave out are kept, and so are rules');
    expect(text).toContain(`\`${VERBS_FILE}\``);
  });
});
