/**
 * P116 ONT-006 — workflows are sentences, before any engine.
 *
 * What this file decides without an engine: that `verbs.json` binds to the world the three files
 * describe, to the engine's step kinds and to the specced nodes, each by name, and is refused with
 * the name expected when it does not (AC3); that a cloud-only node is counted as outside, never
 * refused and never hidden; what a verb projects to — the workflow's steps, edges and arms, the
 * functions the agent owes it; a claim per row that touches records; and the words a person reads.
 * The engine runs it in `nodegx-backend/tests/ont-006-verbs.test.ts`, on records, on both engines.
 */
import * as fs from 'fs';
import * as path from 'path';

import Ajv from 'ajv';

import {
  DEFAULT_NODE,
  nextQuestions,
  planWorldWrite,
  projectVerb,
  VERB_NODES,
  VERB_STEP_KINDS,
  VERBS_FILE,
  validateVerbs,
  validateWorld,
  verbClaims,
  verbWords,
  WORLD_FILES,
  worldRevision,
  type Verb,
  type WorldFiles
} from '../world';

const FIXTURES = path.join(__dirname, 'fixtures');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/world.schema.json'), 'utf8'));

function readWorld(fixture: string): WorldFiles {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  return { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary'), verbs: read('verbs') };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const WORLD = readWorld('world-verbs');
const ENROL = WORLD.verbs!.verbs[0];
const ARCHIVE = WORLD.verbs!.verbs[1];

/** The verdict's refusals at one place, as what was expected. */
function expectedAt(verbs: unknown, at: string): string[] {
  return validateVerbs(verbs, WORLD)
    .problems.filter((p) => p.at === at)
    .map((p) => p.expected);
}
const withStep = (verb: Verb, i: number, patch: Record<string, unknown>): { verbs: Verb[] } => {
  const v = clone(verb);
  Object.assign(v.steps[i], patch);
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete (v.steps[i] as unknown as Record<string, unknown>)[k];
  return { verbs: [v] };
};

describe('the fixture: the enrolment note and the archive note, as verbs', () => {
  it('passes the validator, with nothing outside', () => {
    expect(validateWorld(WORLD)).toEqual({ ok: true, problems: [] });
    expect(validateVerbs(WORLD.verbs, WORLD)).toEqual({ ok: true, problems: [], outside: [] });
  });

  it('passes the JSON Schema, and the schema refuses what the validator refuses', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.addSchema(schema);
    const accepts = (value: unknown) => ajv.validate(`${schema.$id}#/definitions/verbsFile`, value) as boolean;
    expect(accepts(WORLD.verbs)).toBe(true);
    const wrongThen = clone(WORLD.verbs!);
    (wrongThen.verbs[0].steps[2].fails![0] as { then: string }).then = 'retry';
    expect(accepts(wrongThen)).toBe(false);
    expect(expectedAt(wrongThen, 'verbs[0].steps[2].fails[0].then')).toEqual(['one of record-and-go-on, stop']);
    const twoArms = clone(WORLD.verbs!);
    twoArms.verbs[0].steps[2].fails!.push({ id: 'down', when: 'the platform is down', then: 'stop', sees: 'Try later.' });
    expect(accepts(twoArms)).toBe(false);
    expect(expectedAt(twoArms, 'verbs[0].steps[2].fails')).toEqual(['one arm — a second kind of failure is a second step']);
  });

  it('the file is the fourth of the world, optional: a world without it validates as before', () => {
    const { verbs: _verbs, ...three } = WORLD;
    void _verbs;
    expect(validateWorld(three).ok).toBe(true);
    expect(VERBS_FILE).toBe('docs/world/verbs.json');
    expect(Object.values(WORLD_FILES)).not.toContain(VERBS_FILE);
  });
});

describe('AC3 — a verb that names what does not exist is refused with the name expected', () => {
  it('a node no spec knows: the specced nodes are named', () => {
    const [expected] = expectedAt(withStep(ENROL, 0, { node: 'Create Person' }), 'verbs[0].steps[0].node');
    expect(expected).toMatch(/^one of the specced nodes: /);
    expect(expected).toContain('NewDbModelProperties');
    expect(expected).not.toContain('noodl.cloud.request');
  });

  it('a step kind the engine does not have: the fifteen are named', () => {
    const [expected] = expectedAt(withStep(ENROL, 0, { kind: 'retry' }), 'verbs[0].steps[0].kind');
    expect(expected).toBe(`one of the engine's step kinds: ${VERB_STEP_KINDS.join(', ')}`);
  });

  it('a kind that does no work for a step that does: a function is expected', () => {
    expect(expectedAt(withStep(ENROL, 0, { kind: 'branch' }), 'verbs[0].steps[0].kind')).toEqual(['call-function or for-each — work is done by a function the step calls']);
    expect(expectedAt(withStep(ARCHIVE, 0, { kind: 'call-function' }), 'verbs[0].steps[0].kind')).toEqual(['transform — a keep is a note the run keeps, not work']);
  });

  it('a server verb bound to a node that runs only in the app: refused as a mix the projection cannot honour', () => {
    const [expected] = expectedAt(withStep(ENROL, 1, { node: 'CloudFunction2' }), 'verbs[0].steps[1].node');
    expect(expected).toMatch(/^a node that runs on the server: /);
    expect(expected).toContain('net.noodl.HTTP');
    expect(expected).not.toContain('CloudFunction2');
    const app = clone(ENROL);
    app.runs = 'app';
    app.steps[1].node = 'noodl.cloud.sendemail';
    expect(expectedAt({ verbs: [app] }, 'verbs[0].steps[1].node')[0]).toMatch(/^a node that runs in the app: /);
  });

  it('a cloud-only node is not refused: it is counted as outside, by verb and step', () => {
    const verdict = validateVerbs(withStep(ENROL, 1, { node: 'noodl.cloud.sendemail' }), WORLD);
    expect(verdict).toEqual({ ok: true, problems: [], outside: [{ verb: 'enrol', step: 'mailing', node: 'noodl.cloud.sendemail' }] });
  });

  it('a noun, a relation, a system or a question the world does not have', () => {
    expect(expectedAt(withStep(ENROL, 0, { on: 'member' }), 'verbs[0].steps[0].on')).toEqual(['one of person, account, membership']);
    expect(expectedAt(withStep(ENROL, 1, { system: 'the CRM' }), 'verbs[0].steps[1].system')).toEqual(['one of the learning platform, the mailing system']);
    const v = clone(ENROL);
    v.steps[2].fails![0].answers = { relation: 'learning', question: 'hereFirstt' };
    expect(expectedAt({ verbs: [v] }, 'verbs[0].steps[2].fails[0].answers.question')).toEqual(['one of hereFirst, thereFirst, wins, nameThere, endsThere']);
    v.about = { relations: ['mailing-list'] };
    expect(expectedAt({ verbs: [v] }, 'verbs[0].about.relations[0]')).toEqual(['one of membership, learning, mailing, leaves']);
  });

  it('an end with nothing to mark it, and a remove of a thing the world says ends', () => {
    // An account has no relation saying it can end, and no date: nothing marks the end.
    expect(expectedAt(withStep(ARCHIVE, 1, { on: 'account' }), 'verbs[0].steps[1].by')).toEqual(['the date that marks the end — "account" has no relation saying it can end']);
    // A person ends (the 'leaves' relation): removing one is the end-by-delete mistake.
    expect(expectedAt(withStep(ARCHIVE, 3, { does: 'remove' }), 'verbs[0].steps[3].does')).toEqual(["end — \"person\" ends; it is never removed (the 'leaves' relation)"]);
    // Said by a date it has, the end is marked by it.
    const dated = clone(WORLD);
    dated.nouns.nouns[1].properties!.push({ name: 'closed on', kind: 'date' });
    const v = clone(ARCHIVE);
    v.steps[1] = { id: 'account-closes', says: 'the account closes', does: 'end', on: 'account', by: 'closed on' };
    expect(validateVerbs({ verbs: [v] }, dated).problems).toEqual([]);
  });

  it('an update that names no properties, a keep that names a node, an arm that skips a step not right after its own', () => {
    expect(expectedAt(withStep(ENROL, 0, { does: 'update' }), 'verbs[0].steps[0].fields')).toEqual(['the properties it writes: name, email']);
    expect(expectedAt(withStep(ARCHIVE, 0, { node: 'DbModel2' }), 'verbs[0].steps[0].node')).toEqual(['nothing: a keep does nothing, and binds to no node']);
    const v = clone(ENROL);
    v.steps[1].fails = [{ id: 'list-gone', when: 'the list is gone', then: 'record-and-go-on', skips: ['enrol'], sees: 'Not on the list.' }];
    expect(expectedAt({ verbs: [v] }, 'verbs[0].steps[1].fails[0].skips')).toEqual(['the steps right after this one, in order: learning-account']);
  });
});

describe('the projection — a verb as a workflow definition, through the admin route’s shape', () => {
  const enrol = projectVerb(ENROL, WORLD);
  const archive = projectVerb(ARCHIVE, WORLD);

  it('the enrolment verb: a function per step, the arm as the error edge, the skipped step left out of the arm’s way', () => {
    if (!enrol.ok) throw new Error(enrol.problems.join('\n'));
    expect(enrol.workflow).toMatchObject({ version: 1, id: 'enrol', name: 'Enrol a member', entry: 'person-here', concurrency: 1 });
    expect(enrol.workflow.steps.map((s) => [s.id, s.kind, s.ref, s.next, s.onError])).toEqual([
      ['person-here', 'call-function', 'enrol-person-here', ['mailing'], undefined],
      ['mailing', 'call-function', 'enrol-mailing', ['learning-account'], undefined],
      ['learning-account', 'call-function', 'enrol-learning-account', ['enrol'], ['no-account-there']],
      ['no-account-there', 'transform', undefined, undefined, undefined],
      ['enrol', 'call-function', 'enrol-enrol', undefined, undefined]
    ]);
    expect(enrol.workflow.steps[3].params).toEqual({
      output: {
        arm: 'no-account-there',
        step: 'learning-account',
        when: 'they have no account there yet',
        sees: 'Enrolled everywhere but the learning platform: they have no account there yet. Recorded; the next run tries again.',
        error: { $path: 'previous.error.message' }
      }
    });
    expect(enrol.functions.map((f) => [f.ref, f.does, f.node, f.system ?? f.collection])).toEqual([
      ['enrol-person-here', 'make', 'NewDbModelProperties', 'Person'],
      ['enrol-mailing', 'ask', 'net.noodl.HTTP', 'the mailing system'],
      ['enrol-learning-account', 'ask', 'net.noodl.HTTP', 'the learning platform'],
      ['enrol-enrol', 'ask', 'net.noodl.HTTP', 'the learning platform']
    ]);
    expect(enrol.outside).toEqual([]);
  });

  it('the archive verb: a keep is a transform that notes what stays; an end says the field it sets; an arm that goes on continues at the next step', () => {
    if (!archive.ok) throw new Error(archive.problems.join('\n'));
    expect(archive.workflow.steps.map((s) => [s.id, s.kind, s.next, s.onError])).toEqual([
      ['record-stays', 'transform', ['memberships-end'], undefined],
      ['memberships-end', 'call-function', ['access-ends'], undefined],
      ['access-ends', 'call-function', ['person-ends'], ['no-access-there']],
      ['no-access-there', 'transform', ['person-ends'], undefined],
      ['person-ends', 'call-function', undefined, undefined]
    ]);
    expect(archive.workflow.steps[0].params).toEqual({ output: { kept: 'person', says: 'their record and its history stay' } });
    expect(archive.functions.map((f) => [f.ref, f.does, f.collection, f.by])).toEqual([
      ['archive-memberships-end', 'end', 'Membership', 'until'],
      ['archive-access-ends', 'ask', 'Person', undefined],
      ['archive-person-ends', 'end', 'Person', 'endedAt']
    ]);
  });

  it('an arm that stops is a stop step with the arm’s words', () => {
    const v = clone(ENROL);
    v.steps[1].fails = [{ id: 'no-list', when: 'the mailing system refuses them', then: 'stop', sees: 'Not enrolled: the mailing system refused them.' }];
    const p = projectVerb(v, WORLD);
    if (!p.ok) throw new Error(p.problems.join('\n'));
    expect(p.workflow.steps[2]).toEqual({ id: 'no-list', name: 'the mailing system refuses them', kind: 'stop', params: { message: 'the mailing system refuses them: Not enrolled: the mailing system refused them.', isError: true } });
  });

  it('a verb that does not bind is refused with the validator’s words, not projected', () => {
    const p = projectVerb(withStep(ENROL, 0, { node: 'Create Person' }).verbs[0], WORLD);
    expect(p.ok).toBe(false);
    expect(!p.ok && p.problems[0]).toMatch(/binds to "Create Person", which no spec knows/);
  });

  it('every step binds to a node by default, by what it does', () => {
    expect(DEFAULT_NODE).toEqual({ make: 'NewDbModelProperties', update: 'SetDbModelProperties', end: 'SetDbModelProperties', remove: 'DeleteDbModelProperties', keep: undefined, ask: 'net.noodl.HTTP' });
  });
});

describe('the claims — a claim per row that touches records (AC2’s shape)', () => {
  it('the archive verb: the record stays (not kept by the store, measured), the membership ends by its until, the person by their endedAt', () => {
    const c = verbClaims(ARCHIVE, WORLD);
    if (!c.ok) throw new Error(c.problems.join('\n'));
    expect(c.claims.map((x) => [x.id, x.held, x.steps.map((s) => Object.keys(s)[0])])).toEqual([
      ['archive/record-stays', false, ['make', 'remove']],
      ['archive/memberships-end', true, ['make', 'make', 'make', 'change', 'holds', 'there']],
      ['archive/person-ends', true, ['make', 'change', 'holds', 'there']]
    ]);
    expect(c.claims[1].steps.slice(3)).toEqual([
      { change: 'Membership', row: 'it', data: { until: { date: '2026-03-01T00:00:00.000Z' } } },
      { holds: 'Membership', row: 'it', field: 'until', value: { date: '2026-03-01T00:00:00.000Z' } },
      { there: 'Membership', row: 'it' }
    ]);
    expect(c.claims[0].steps[1]).toEqual({ remove: 'Person', row: 'it', refused: true });
  });

  it('the enrolment verb: the person made here; the asks have no record claim', () => {
    const c = verbClaims(ENROL, WORLD);
    if (!c.ok) throw new Error(c.problems.join('\n'));
    expect(c.claims.map((x) => x.id)).toEqual(['enrol/person-here']);
    expect(c.claims[0].steps).toEqual([{ make: 'Person', as: 'it', data: {} }]);
  });

  it('an update writes a fresh value to each property it names and reads it back', () => {
    const v = clone(ENROL);
    v.steps[0] = { id: 'person-here', says: 'update the person here', does: 'update', on: 'person', fields: ['name', 'email'] };
    const c = verbClaims(v, WORLD);
    if (!c.ok) throw new Error(c.problems.join('\n'));
    expect(c.claims[0].steps).toEqual([
      { make: 'Person', as: 'it', data: {} },
      { change: 'Person', row: 'it', data: { name: 'name-changed', email: 'email-changed' } },
      { holds: 'Person', row: 'it', field: 'name', value: 'name-changed' },
      { holds: 'Person', row: 'it', field: 'email', value: 'email-changed' }
    ]);
  });
});

describe('the words', () => {
  it('say the sentence, where it runs, each step with what does it, and each arm with what the person sees', () => {
    const words = verbWords(ENROL, WORLD);
    expect(words[0]).toMatch(/^Enrol a member: “When a membership is activated/);
    expect(words).toContain('When a membership is activated.');
    expect(words).toContain('Runs on the server.');
    expect(words).toContain('1. Create or update the person here — makes a person (Create Record).');
    expect(words).toContain('3. Find their account in the learning platform — asks the learning platform (HTTP Request).');
    expect(words).toContain('   If they have no account there yet: it is recorded and the verb goes on, without enrol. You see: “Enrolled everywhere but the learning platform: they have no account there yet. Recorded; the next run tries again.”.');
    expect(words).toContain('   If it cannot be done: the verb stops there and says which step, and why.');
    expect(verbWords(ARCHIVE, WORLD)).toContain('2. Their memberships end — ends a membership: its until is set (Update Record).');
    expect(verbWords(withStep(ENROL, 1, { node: 'noodl.cloud.sendemail' }).verbs[0], WORLD).at(-1)).toBe('Outside: 1 step binds to a node specced nowhere yet (mailing: Send Email).');
  });
});

describe('the bindings are pinned to what they bind to', () => {
  it('every specced node has a scenario file in the spec package, and every scenario of a backend node is a verb node', () => {
    const scenarios = path.join(__dirname, '../../nodegx-node-spec/scenarios');
    const files = new Set(fs.readdirSync(scenarios).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
    const missing = Object.keys(VERB_NODES).filter((k) => VERB_NODES[k].specced && !files.has(k));
    expect(missing).toEqual([]);
    const unspecced = Object.keys(VERB_NODES).filter((k) => !VERB_NODES[k].specced && files.has(k));
    expect(unspecced).toEqual([]);
  });

  it('the step kinds are the engine’s, in its order', () => {
    const types = fs.readFileSync(path.join(__dirname, '../../nodegx-backend/src/workflow/types.ts'), 'utf8');
    const union = /export type StepKind =([\s\S]*?);/.exec(types)![1];
    const kinds = [...union.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect(VERB_STEP_KINDS).toEqual(kinds);
  });
});

describe('the write rule knows the fourth file', () => {
  const texts = (w: WorldFiles) => ({
    nouns: JSON.stringify(w.nouns, null, 2) + '\n',
    relations: JSON.stringify(w.relations, null, 2) + '\n',
    vocabulary: JSON.stringify(w.vocabulary, null, 2) + '\n',
    verbs: w.verbs ? JSON.stringify(w.verbs, null, 2) + '\n' : null
  });

  it('writes the verbs file when the candidate has one, and the revision moves with it', () => {
    const { verbs: _v, ...three } = WORLD;
    void _v;
    const plan = planWorldWrite({ disk: texts(three), candidate: WORLD, ifRevision: worldRevision(texts(three)) });
    expect(plan.ok && plan.writes.map((w) => w.path)).toEqual([VERBS_FILE]);
    expect(plan.ok && plan.revision).toBe(worldRevision(texts(WORLD)));
    expect(worldRevision(texts(WORLD))).not.toBe(worldRevision(texts(three)));
  });

  it('a world of three files keeps the revision it had before the fourth existed', () => {
    const { verbs: _v, ...three } = WORLD;
    void _v;
    const t = texts(three);
    const { verbs: _t, ...withoutKey } = t;
    void _t;
    expect(worldRevision(t)).toBe(worldRevision(withoutKey));
  });

  it('refuses an invalid verbs file with the validator’s words', () => {
    const bad = clone(WORLD);
    bad.verbs!.verbs[0].steps[0].node = 'Create Person';
    const plan = planWorldWrite({ disk: texts(WORLD), candidate: bad, ifRevision: worldRevision(texts(WORLD)) });
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.refusal === 'invalid' && plan.message).toMatch(/no spec knows/);
  });

  it('a write that leaves the verbs out keeps them, and grades them against the world it writes', () => {
    const { verbs: _v, ...three } = WORLD;
    void _v;
    const disk = texts(WORLD);
    // The control: the same world, the verbs left out — nothing written, the verbs kept in the revision.
    const same = planWorldWrite({ disk, candidate: three, ifRevision: worldRevision(disk) });
    expect(same).toMatchObject({ ok: true, writes: [], revision: worldRevision(disk) });
    // The mailing relation taken out under the enrolment verb that asks it.
    const gone = clone(three);
    gone.relations.relations = gone.relations.relations.filter((r) => r.id !== 'mailing');
    const plan = planWorldWrite({ disk, candidate: gone, ifRevision: worldRevision(disk) });
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.refusal === 'invalid' && plan.problems.every((p) => p.file === VERBS_FILE)).toBe(true);
    expect(!plan.ok && plan.message).toMatch(/mailing/);
  });

  it('a verbs file on disk that is not JSON stops a write that leaves the verbs out', () => {
    const { verbs: _v, ...three } = WORLD;
    void _v;
    const disk = { ...texts(WORLD), verbs: '{ not json' };
    const plan = planWorldWrite({ disk, candidate: three, ifRevision: worldRevision(disk) });
    expect(plan).toMatchObject({ ok: false, refusal: 'invalid', problems: [{ file: VERBS_FILE, expected: 'JSON' }] });
    // Passing the verbs with the write is the way on.
    expect(planWorldWrite({ disk, candidate: WORLD, ifRevision: worldRevision(disk) }).ok).toBe(true);
  });
});

describe('s10 — the runner takes a failure arm’s answer (ONT-006 §6.5)', () => {
  /** The world with the learning platform's `hereFirst` taken out of the relation's answers. */
  const unsaid = (): WorldFiles => {
    const w = clone(WORLD);
    delete w.relations.relations.find((r) => r.id === 'learning')!.answers!.hereFirst;
    return w;
  };
  const asked = (w: WorldFiles) => {
    const r = nextQuestions(w, { limit: 50 });
    if (!r.ok) throw new Error(r.problems.map((p) => p.message).join('\n'));
    return r;
  };

  it('the control: with no verbs, the question the enrolment note paid for is asked', () => {
    const { verbs: _v, ...three } = unsaid();
    void _v;
    expect(asked(three).ask.map((q) => `${(q.about as { relation?: string }).relation}/${q.question}`)).toContain('learning/hereFirst');
  });

  it('with the enrolment verb, its arm answers it: not asked, on the record in what the person sees, with where it lives', () => {
    const r = asked(unsaid());
    expect(r.ask.map((q) => `${(q.about as { relation?: string }).relation}/${q.question}`)).not.toContain('learning/hereFirst');
    const arm = WORLD.verbs!.verbs[0].steps.find((st) => st.id === 'learning-account')!.fails![0];
    expect(r.record.find((x) => x.relation === 'learning' && x.question === 'hereFirst')).toMatchObject({
      said: arm.sees,
      how: 'asked',
      by: { verb: 'enrol', step: 'learning-account', arm: 'no-account-there' }
    });
  });

  it('the relation’s own answer, when there is one, is the record — the arm does not replace it', () => {
    const rec = asked(WORLD).record.find((x) => x.relation === 'learning' && x.question === 'hereFirst')!;
    expect(rec.said).toBe(WORLD.relations.relations.find((r) => r.id === 'learning')!.answers!.hereFirst);
    expect(rec.by).toBeUndefined();
  });

  it('an arm cannot answer a question that is answered yes or no: refused, with where to write it', () => {
    const v = clone(WORLD.verbs!);
    v.verbs[0].steps.find((st) => st.id === 'learning-account')!.fails![0].answers = { relation: 'learning', question: 'thereFirst' };
    const verdict = validateVerbs(v, WORLD);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.map((p) => p.message).join('\n')).toMatch(/answers "thereFirst", which is answered yes or no, not in an arm's words; write it in relations\[learning\]\.answers\./);
    expect(verdict.problems[0].expected).toBe('a question answered in words: one of hereFirst, nameThere, endsThere');
  });
});

