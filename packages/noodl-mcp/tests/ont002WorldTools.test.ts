/**
 * P116 ONT-002 — `validate_world` and `write_world` on the wire.
 *
 * With no world the tool hands over the brief and nothing else; on the Acme-shaped fixture it
 * returns the two notes' questions first (AC2, through the tool); a write needs the revision it
 * read, refuses a world the validator refuses, and comes back with the next questions. Both
 * tools live in the deferred `backend` group: absent from the resident list, present once the
 * group is asked for. AC4 (the resident surface) is `toolDisclosure.test.ts`, measured on both
 * arms in ONT-002 §6.
 */
import * as fs from 'fs';
import * as path from 'path';

import { RULES_FILE, VERBS_FILE, WORLD_FILES } from '@nodegx/project-contract/world';

import { call, connect, copyFixture, type TestSession } from './helpers';

const WORLD_FIXTURE = path.resolve(__dirname, '../../nodegx-project-contract/tests/fixtures/world-membership-unasked');
const VERBS_FIXTURE = path.resolve(__dirname, '../../nodegx-project-contract/tests/fixtures/world-verbs');
const RULES_FIXTURE = path.resolve(__dirname, '../../nodegx-project-contract/tests/fixtures/world-rules');

interface Question {
  about: Record<string, unknown>;
  question: string;
  ask: string;
  mutants: string[];
  incident: { from: string; prevents: string };
  home: string;
}
interface Report {
  world: 'none' | 'partial' | 'described';
  revision: string;
  brief?: string;
  missing?: string[];
  report?: { ok: true; ask: Question[]; waiting: number; enough: boolean; record: unknown[]; volunteered: number; schema: { collections: { name: string }[] } } | { ok: false; problems: { at: string; message: string }[] };
  note?: string;
}
interface Written extends Report {
  written: string[];
}
interface Failure {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

const readWorld = (dir = WORLD_FIXTURE) => {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
};
const readVerbs = () => JSON.parse(fs.readFileSync(path.join(VERBS_FIXTURE, VERBS_FILE), 'utf8'));
const readRules = () => JSON.parse(fs.readFileSync(path.join(RULES_FIXTURE, RULES_FILE), 'utf8'));

interface VerbsReport {
  file: string;
  outside: { verb: string; step: string; node: string }[];
  verbs: { id: string; name: string; words: string[]; functions: { ref: string; step: string; node: string; system?: string }[] }[];
}

describe('ONT-002 — validate_world and write_world', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture(), true);
    // Both tools are deferred with the backend group (R5): an agent reaches them the way it
    // reaches provision_backend, by asking for the group.
    await call(session, 'find_tools', { group: 'backend' });
  });
  afterAll(async () => {
    await session.close();
  });

  it('with no world, hands over the brief and where the files go', async () => {
    const { isError, data } = await call<Report>(session, 'validate_world');
    expect(isError).toBe(false);
    expect(data.world).toBe('none');
    expect(data.brief).toMatch(/^# Describing a person's world/);
    expect(data.brief).toContain('Ask a question only when `validate_world` names it.');
    expect(data.report).toBeUndefined();
    expect(data.note).toMatch(/^No docs\/world\/ yet/);
  });

  it('refuses a world the validator refuses, naming the problem and where', async () => {
    const world = readWorld();
    world.relations.relations[0].kind = 'owns';
    const { isError, data } = await call<Failure>(session, 'write_world', world);
    expect(isError).toBe(true);
    expect(data.error.code).toBe('invalid-argument');
    expect((data.error.details as { problems: { at: string }[] }).problems[0].at).toBe('relations[0].kind');
    expect(fs.existsSync(path.join(session.projectDir, WORLD_FILES.nouns))).toBe(false);
  });

  it('writes the Acme-shaped world and comes back with the two notes first', async () => {
    const { isError, data } = await call<Written>(session, 'write_world', readWorld());
    expect(isError).toBe(false);
    expect(data.written).toEqual([WORLD_FILES.nouns, WORLD_FILES.relations, WORLD_FILES.vocabulary]);
    expect(data.world).toBe('described');
    if (!data.report || !data.report.ok) throw new Error('no report');
    expect(data.report.ask.map((q) => `${q.about.relation}/${q.question}`).slice(0, 2)).toEqual(['on-the-course-platform/hereFirst', 'leaves/whatStays']);
    expect(data.report.ask.map((q) => q.incident.from).slice(0, 2)).toEqual(['note', 'note']);
    expect(data.report.ask.length).toBeLessThanOrEqual(5);
    expect(data.report.schema.collections.map((c) => c.name)).toContain('Person');
    expect(data.brief).toBeUndefined();
    // Byte for byte what the writer plans: the files are on disk under docs/world/.
    for (const f of Object.values(WORLD_FILES)) expect(fs.existsSync(path.join(session.projectDir, f))).toBe(true);
  });

  it('validate_world now grades the files, and says what was asked and answered', async () => {
    const { data } = await call<Report>(session, 'validate_world', { limit: 2 });
    expect(data.world).toBe('described');
    if (!data.report || !data.report.ok) throw new Error('no report');
    expect(data.report.ask.length).toBe(2);
    // ONT-011 step 2 (s19): `ends` asks which detail is written when a person leaves (`leaves/endNote`) — the fixture leaves it unanswered, so two wait, not one.
    expect(data.report.waiting).toBe(2);
    expect(data.report.enough).toBe(false);
    expect(data.report.record.length).toBeGreaterThan(20);
    expect(data.note).toMatch(/2 more wait behind them/);
    expect(data.brief).toBeUndefined();
    const withBrief = await call<Report>(session, 'validate_world', { brief: true });
    expect(withBrief.data.brief).toMatch(/^# Describing a person's world/);
  });

  it('a second write needs the revision it read, and refuses a stale one', async () => {
    const world = readWorld();
    const none = await call<Failure>(session, 'write_world', world);
    expect(none.isError).toBe(true);
    expect(none.data.error.code).toBe('conflict');
    const revision = (none.data.error.details as { revision: string }).revision;
    const stale = await call<Failure>(session, 'write_world', { ...world, ifRevision: 'not-it' });
    expect(stale.isError).toBe(true);
    expect(stale.data.error.code).toBe('conflict');
    // The answer to the archive note, written with the revision: the question goes.
    world.relations.relations.find((r: { id: string }) => r.id === 'leaves').answers.whatStays = 'The record and what they came to stay; their place on the account ends.';
    const ok = await call<Written>(session, 'write_world', { ...world, ifRevision: revision });
    expect(ok.isError).toBe(false);
    expect(ok.data.written).toEqual([WORLD_FILES.relations]);
    if (!ok.data.report || !ok.data.report.ok) throw new Error('no report');
    expect(ok.data.report.ask.map((q) => q.question)).not.toContain('whatStays');
    expect(ok.data.report.record.some((x) => (x as { question: string }).question === 'whatStays')).toBe(true);
  });

  it('a world with a file missing is partial, and says which', async () => {
    fs.rmSync(path.join(session.projectDir, WORLD_FILES.vocabulary));
    const { data } = await call<Report>(session, 'validate_world');
    expect(data.world).toBe('partial');
    expect(data.missing).toEqual([WORLD_FILES.vocabulary]);
    expect(data.brief).toBeUndefined();
  });
});

describe('ONT-006 — the world tools read the fourth file, verbs.json', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture(), true);
    await call(session, 'find_tools', { group: 'backend' });
  });
  afterAll(async () => {
    await session.close();
  });

  it('a world written without verbs has no verbs report', async () => {
    const { isError, data } = await call<Written & { verbs?: VerbsReport }>(session, 'write_world', readWorld(VERBS_FIXTURE));
    expect(isError).toBe(false);
    expect(data.written).toEqual([WORLD_FILES.nouns, WORLD_FILES.relations, WORLD_FILES.vocabulary]);
    expect(data.verbs).toBeUndefined();
  });

  it('writes the verbs with the world, and validate_world says what each verb owes', async () => {
    const read = await call<Report>(session, 'validate_world');
    const { isError, data } = await call<Written & { verbs?: VerbsReport }>(session, 'write_world', { ...readWorld(VERBS_FIXTURE), verbs: readVerbs(), ifRevision: read.data.revision });
    expect(isError).toBe(false);
    expect(data.written).toEqual([VERBS_FILE]);
    expect(data.revision).not.toBe(read.data.revision);
    const again = await call<Report & { verbs?: VerbsReport }>(session, 'validate_world');
    expect(again.data.revision).toBe(data.revision);
    const verbs = again.data.verbs!;
    expect(verbs.file).toBe(VERBS_FILE);
    expect(verbs.outside).toEqual([]);
    expect(verbs.verbs.map((v) => v.id)).toEqual(readVerbs().verbs.map((v: { id: string }) => v.id));
    const enrol = verbs.verbs.find((v) => v.id === 'enrol')!;
    expect(enrol.functions.map((f) => f.ref)).toEqual(['enrol-person-here', 'enrol-mailing', 'enrol-learning-account', 'enrol-enrol']);
    expect(enrol.functions.find((f) => f.step === 'learning-account')).toMatchObject({ system: 'the learning platform', node: 'net.noodl.HTTP' });
    expect(enrol.words[0]).toMatch(/^Enrol a member: “When a membership is activated/);
  });

  it('a step bound to a cloud-only node is counted as outside, never refused', async () => {
    const read = await call<Report>(session, 'validate_world');
    const verbs = readVerbs();
    const enrol = verbs.verbs.find((v: { id: string }) => v.id === 'enrol');
    const mailing = enrol.steps.find((st: { id: string }) => st.id === 'mailing');
    mailing.node = 'noodl.cloud.sendemail';
    const { isError, data } = await call<Written & { verbs?: VerbsReport }>(session, 'write_world', { ...readWorld(VERBS_FIXTURE), verbs, ifRevision: read.data.revision });
    expect(isError).toBe(false);
    expect(data.verbs!.outside).toEqual([{ verb: 'enrol', step: 'mailing', node: 'noodl.cloud.sendemail' }]);
  });

  it('a write that leaves the verbs out keeps them, and is refused when the world it writes breaks them', async () => {
    const read = await call<Report>(session, 'validate_world');
    const world = readWorld(VERBS_FIXTURE);
    world.relations.relations = world.relations.relations.filter((r: { id: string }) => r.id !== 'mailing');
    const refused = await call<Failure>(session, 'write_world', { ...world, ifRevision: read.data.revision });
    expect(refused.isError).toBe(true);
    expect(refused.data.error.code).toBe('invalid-argument');
    const problems = (refused.data.error.details as { problems: { file: string }[] }).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.file === VERBS_FILE)).toBe(true);
    // Nothing moved: the relation is still on disk.
    expect(fs.readFileSync(path.join(session.projectDir, WORLD_FILES.relations), 'utf8')).toContain('"mailing"');
  });

  it('an unreadable verbs file makes the world partial, and says which', async () => {
    fs.writeFileSync(path.join(session.projectDir, VERBS_FILE), '{ not json');
    const { data } = await call<Report & { unreadable?: string[] }>(session, 'validate_world');
    expect(data.world).toBe('partial');
    expect(data.unreadable).toHaveLength(1);
    expect(data.unreadable![0]).toMatch(new RegExp(`^${VERBS_FILE}: `));
  });
});

interface RulesReport {
  file: string;
  rules: { id: string; on: string; says: string; kept: boolean; why?: string }[];
}

describe('ONT-013 — the world tools read the fifth file, rules.json', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture(), true);
    await call(session, 'find_tools', { group: 'backend' });
  });
  afterAll(async () => {
    await session.close();
  });

  it('a world written without rules has no rules report', async () => {
    const { isError, data } = await call<Written & { rules?: RulesReport }>(session, 'write_world', readWorld(RULES_FIXTURE));
    expect(isError).toBe(false);
    expect(data.written).toEqual([WORLD_FILES.nouns, WORLD_FILES.relations, WORLD_FILES.vocabulary]);
    expect(data.rules).toBeUndefined();
  });

  it('writes the rules with the world, and validate_world reads each back as kept or not kept, with why (step 3)', async () => {
    const read = await call<Report>(session, 'validate_world');
    const { isError, data } = await call<Written & { rules?: RulesReport }>(session, 'write_world', { ...readWorld(RULES_FIXTURE), rules: readRules(), ifRevision: read.data.revision });
    expect(isError).toBe(false);
    expect(data.written).toEqual([RULES_FILE]);
    expect(data.revision).not.toBe(read.data.revision);
    const again = await call<Report & { rules?: RulesReport }>(session, 'validate_world');
    expect(again.data.revision).toBe(data.revision);
    const rules = again.data.rules!;
    expect(rules.file).toBe(RULES_FILE);
    expect(rules.rules.map((r) => [r.id, r.kept, r.says])).toEqual(readRules().rules.map((r: { id: string; says: string }) => [r.id, r.id === 'invoice-amount-settled' || r.id === 'assignment-never-back', r.says]));
    expect(rules.rules.find((r) => r.id === 'cohort-at-most-twenty')!.why).toMatch(/ONT-016/);
    expect(rules.rules.find((r) => r.id === 'invoice-amount-settled')!.why).toBeUndefined();
    // The read-back in the schema the tool returns: the unkept sentence under "Not kept", the kept one nowhere.
    const schema = (again.data.report as unknown as { schema: { collections: { name: string; description: string }[] } }).schema;
    expect(schema.collections.find((c) => c.name === 'Cohort')!.description).toMatch(/Not kept by the database yet: A cohort holds at most twenty learners\.$/);
    expect(schema.collections.find((c) => c.name === 'Invoice')!.description).not.toContain('amount never changes');
  });

  it('a rule of code or SQL is refused, not written (AC2’s mutant)', async () => {
    const read = await call<Report>(session, 'validate_world');
    const rules = readRules();
    rules.rules[0].holds = { sql: 'UPDATE invoices SET amount = amount' };
    const refused = await call<Failure>(session, 'write_world', { ...readWorld(RULES_FIXTURE), rules, ifRevision: read.data.revision });
    expect(refused.isError).toBe(true);
    expect(refused.data.error.code).toBe('invalid-argument');
    const problems = (refused.data.error.details as { problems: { file: string; message: string }[] }).problems;
    expect(problems.map((p) => p.file)).toEqual([RULES_FILE]);
    expect(problems[0].message).toMatch(/fits no shape/);
    expect(fs.readFileSync(path.join(session.projectDir, RULES_FILE), 'utf8')).not.toContain('sql');
  });

  it('a write that leaves the rules out keeps them, and is refused when the world it writes breaks them', async () => {
    const read = await call<Report>(session, 'validate_world');
    const world = readWorld(RULES_FIXTURE);
    const invoice = world.nouns.nouns.find((n: { id: string }) => n.id === 'invoice');
    invoice.properties = invoice.properties.filter((p: { name: string }) => p.name !== 'amount');
    invoice.answers.calledBy = 'status';
    const refused = await call<Failure>(session, 'write_world', { ...world, ifRevision: read.data.revision });
    expect(refused.isError).toBe(true);
    const problems = (refused.data.error.details as { problems: { file: string }[] }).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.file === RULES_FILE)).toBe(true);
    expect(fs.readFileSync(path.join(session.projectDir, WORLD_FILES.nouns), 'utf8')).toContain('"amount"');
  });

  it('an unreadable rules file makes the world partial, and says which', async () => {
    fs.writeFileSync(path.join(session.projectDir, RULES_FILE), '{ not json');
    const { data } = await call<Report & { unreadable?: string[] }>(session, 'validate_world');
    expect(data.world).toBe('partial');
    expect(data.unreadable).toEqual([expect.stringMatching(new RegExp(`^${RULES_FILE}: `))]);
  });
});

describe('ONT-002 — the two tools are deferred with the backend group', () => {
  it('are absent from the resident list and arrive with find_tools({group:"backend"})', async () => {
    const session = await connect(copyFixture(), true);
    try {
      const before = (await session.client.listTools()).tools.map((t) => t.name);
      expect(before).not.toContain('validate_world');
      expect(before).not.toContain('write_world');
      await call(session, 'find_tools', { group: 'backend' });
      const after = (await session.client.listTools()).tools.map((t) => t.name);
      expect(after).toContain('validate_world');
      expect(after).toContain('write_world');
    } finally {
      await session.close();
    }
  });
});
