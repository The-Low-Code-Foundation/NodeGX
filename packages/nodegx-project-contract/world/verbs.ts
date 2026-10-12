/**
 * P116 ONT-006 — workflows are sentences: the verbs file and its validator.
 *
 * The thing a person does every week over their world is a sentence with its failures named
 * ("when a membership is activated, create or update the person here, create or update them in
 * the mailing system, enrol them in the learning platform; if they have no account there yet,
 * skip the enrolment and record it"). `docs/world/verbs.json` keeps it as data: a verb, its
 * steps, each step's failure arm, each in the person's words. A verb binds to the world the
 * three files describe (its nouns, its relations, the other systems they name), to the engine's
 * step kinds, and to the specced nodes that do the work; this module checks every binding by
 * name and refuses with the name expected (AC3). What it cannot check — a node specced nowhere
 * because it runs only in the cloud (NSP-022) — it counts as `outside`, never hides.
 *
 * `verb-project.ts` projects a verb to a workflow definition and to claims. This module imports
 * nothing from the projection, so the validator can run before any schema exists.
 */
import { kindById } from './vocabulary';
import type { Noun, Relation, Verb, VerbArm, VerbDoes, VerbStep, VerbsFile, WorldFiles } from './files';
import { VERBS_FILE } from './files';
import type { WorldProblem } from './validate';
import type { VocabularyRef } from './vocabulary';

/** Where a node runs; a verb that `runs` somewhere binds only to nodes that run there. */
export type NodeRuns = 'app' | 'server';

export interface VerbNode {
  /** The node's name in the editor. */
  label: string;
  runs: readonly NodeRuns[];
  /** True when `@nodegx/node-spec` carries its spec (NSP-014); false for the cloud-only nodes NSP-022 still owes. */
  specced: boolean;
}

/**
 * The nodes a verb's step may bind to, by type id — NSP-014's 24 (specced, graded on the runtime)
 * and NSP-022's 17 (cloud only, not specced). Where each runs is the census's `availableIn`
 * (P107 CENSUS.md), pinned by test against the spec package's scenario files.
 */
export const VERB_NODES: Readonly<Record<string, VerbNode>> = Object.freeze({
  // NSP-014 — browser and cloud
  AddDbModelRelation: { label: 'Add Record Relation', runs: ['app', 'server'], specced: true },
  'Cloud File': { label: 'Cloud File', runs: ['app', 'server'], specced: true },
  DbCollection2: { label: 'Query Records', runs: ['app', 'server'], specced: true },
  DbModel2: { label: 'Record', runs: ['app', 'server'], specced: true },
  DeleteDbModelProperties: { label: 'Delete Record', runs: ['app', 'server'], specced: true },
  FilterDBModels: { label: 'Filter Records', runs: ['app', 'server'], specced: true },
  'net.noodl.HTTP': { label: 'HTTP Request', runs: ['app', 'server'], specced: true },
  'net.noodl.SSE': { label: 'Server-Sent Events', runs: ['app', 'server'], specced: true },
  'net.noodl.user.SetUserProperties': { label: 'Set User Properties', runs: ['app', 'server'], specced: true },
  'net.noodl.user.User': { label: 'User', runs: ['app', 'server'], specced: true },
  'net.noodl.WebSocket': { label: 'WebSocket', runs: ['app', 'server'], specced: true },
  NewDbModelProperties: { label: 'Create Record', runs: ['app', 'server'], specced: true },
  RemoveDbModelRelation: { label: 'Remove Record Relation', runs: ['app', 'server'], specced: true },
  SetDbModelProperties: { label: 'Update Record', runs: ['app', 'server'], specced: true },
  'Sign File URL': { label: 'Sign File URL', runs: ['app', 'server'], specced: true },
  // NSP-014 — browser only
  CloudFunction2: { label: 'Cloud Function', runs: ['app'], specced: true },
  'net.noodl.user.LogIn': { label: 'Log In', runs: ['app'], specced: true },
  'net.noodl.user.LogOut': { label: 'Log Out', runs: ['app'], specced: true },
  'net.noodl.user.RequestMagicLink': { label: 'Request Magic Link', runs: ['app'], specced: true },
  'net.noodl.user.SignInWith': { label: 'Sign In With', runs: ['app'], specced: true },
  'net.noodl.user.SignUp': { label: 'Sign Up', runs: ['app'], specced: true },
  'Open File Picker': { label: 'Open File Picker', runs: ['app'], specced: true },
  SubscribeToChanges: { label: 'Subscribe To Changes', runs: ['app'], specced: true },
  'Upload File': { label: 'Upload File', runs: ['app'], specced: true },
  // NSP-022 — cloud only, specced nowhere yet
  'noodl.cloud.addusertorole': { label: 'Add User To Role', runs: ['server'], specced: false },
  'noodl.cloud.aggregate': { label: 'Aggregate Records', runs: ['server'], specced: false },
  'noodl.cloud.createuser': { label: 'Create User', runs: ['server'], specced: false },
  'noodl.cloud.deleteuser': { label: 'Delete User', runs: ['server'], specced: false },
  'noodl.cloud.getuserroles': { label: 'Get User Roles', runs: ['server'], specced: false },
  'noodl.cloud.hmac': { label: 'HMAC', runs: ['server'], specced: false },
  'noodl.cloud.jwtsign': { label: 'JWT Sign', runs: ['server'], specced: false },
  'noodl.cloud.jwtverify': { label: 'JWT Verify', runs: ['server'], specced: false },
  'noodl.cloud.listusersinrole': { label: 'List Users In Role', runs: ['server'], specced: false },
  'noodl.cloud.modelrequest': { label: 'Model Request', runs: ['server'], specced: false },
  'noodl.cloud.removeuserfromrole': { label: 'Remove User From Role', runs: ['server'], specced: false },
  'noodl.cloud.request': { label: 'Request', runs: ['server'], specced: false },
  'noodl.cloud.response': { label: 'Response', runs: ['server'], specced: false },
  'noodl.cloud.secret': { label: 'Secret', runs: ['server'], specced: false },
  'noodl.cloud.sendemail': { label: 'Send Email', runs: ['server'], specced: false },
  'noodl.cloud.updateuser': { label: 'Update User', runs: ['server'], specced: false },
  'noodl.cloud.verifysessiontoken': { label: 'Verify Session Token', runs: ['server'], specced: false }
});

/** The engine's fifteen step kinds (`nodegx-backend/src/workflow/types.ts` `StepKind`), pinned by test against that file. */
export const VERB_STEP_KINDS: readonly string[] = Object.freeze([
  'call-function',
  'branch',
  'switch',
  'for-each',
  'merge',
  'stop',
  'wait',
  'wait-until',
  'return',
  'transform',
  'validate',
  'filter',
  'sort',
  'deduplicate',
  'split'
]);

export const VERB_DOES: readonly VerbDoes[] = Object.freeze(['make', 'update', 'end', 'remove', 'keep', 'ask']);
export const VERB_ARM_THEN = Object.freeze(['record-and-go-on', 'stop'] as const);

/** The node a step binds to unless it says otherwise; `keep` does nothing and binds to none. */
export const DEFAULT_NODE: Readonly<Record<VerbDoes, string | undefined>> = Object.freeze({
  make: 'NewDbModelProperties',
  update: 'SetDbModelProperties',
  end: 'SetDbModelProperties',
  remove: 'DeleteDbModelProperties',
  keep: undefined,
  ask: 'net.noodl.HTTP'
});

/** The engine step kind a step projects to unless it says otherwise: real work is a function; a `keep` is a note the run keeps. */
export const DEFAULT_KIND: Readonly<Record<VerbDoes, string>> = Object.freeze({
  make: 'call-function',
  update: 'call-function',
  end: 'call-function',
  remove: 'call-function',
  keep: 'transform',
  ask: 'call-function'
});

export const stepNode = (s: Pick<VerbStep, 'does' | 'node'>): string | undefined => s.node ?? DEFAULT_NODE[s.does];
export const stepKind = (s: Pick<VerbStep, 'does' | 'kind'>): string => s.kind ?? DEFAULT_KIND[s.does];

/** A step bound to a node specced nowhere: counted in the verdict, never refused and never hidden. */
export interface OutsideStep {
  verb: string;
  step: string;
  node: string;
}

export interface VerbsVerdict {
  ok: boolean;
  problems: WorldProblem[];
  outside: OutsideStep[];
}

const ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const show = (v: unknown): string => (v === undefined ? 'nothing' : JSON.stringify(v));
const list = (xs: readonly string[]): string => xs.join(', ');

/** What a noun or an own-record relation offers a step: its collection's date fields, and the field that marks its end, if the kind says one. */
export interface VerbSubject {
  kind: 'noun' | 'relation';
  id: string;
  /** property name → kind */
  properties: Map<string, string>;
  /** The field the kind projects as the end: `endedAt` for a noun that `ends`, `until` for an `is-on` with dates. */
  endField?: string;
  /** For a noun: whether an `ends` relation starts from it (then it is never removed). */
  ends?: string;
}

/** The subjects a step may be `on`: every noun, and every relation that is a record of its own. */
export function verbSubjects(world: Pick<WorldFiles, 'nouns' | 'relations'>): Map<string, VerbSubject> {
  const out = new Map<string, VerbSubject>();
  const endsOf = new Map<string, string>();
  for (const r of world.relations.relations) if (r.kind === 'ends') endsOf.set(r.from, r.id);
  for (const n of world.nouns.nouns) {
    const properties = new Map((n.properties || []).map((p) => [p.name, p.kind as string]));
    const ends = endsOf.get(n.id);
    out.set(n.id, { kind: 'noun', id: n.id, properties, ...(ends ? { ends, endField: 'endedAt' } : {}) });
  }
  for (const r of world.relations.relations) {
    const kind = kindById(r.kind);
    if (!kind) continue;
    let own = false;
    try {
      own = Boolean(kind.projection({ id: r.id, from: r.from, to: r.to, property: r.property, answers: r.answers || {} }).ownRecord);
    } catch {
      own = false;
    }
    if (!own) continue;
    const properties = new Map((r.properties || []).map((p) => [p.name, p.kind as string]));
    const dated = r.kind === 'is-on' && r.answers?.startsEnds === true;
    out.set(r.id, { kind: 'relation', id: r.id, properties, ...(dated ? { endField: 'until' } : {}) });
  }
  return out;
}

/**
 * Validates `verbs.json` against the world the three files describe. Every refusal names what was
 * expected, in words, and where. A verb bound to a node specced nowhere is not a refusal: it is
 * counted in `outside`.
 */
export function validateVerbs(verbs: unknown, world: Pick<WorldFiles, 'nouns' | 'relations'>, vocabulary?: VocabularyRef): VerbsVerdict {
  const problems: WorldProblem[] = [];
  const outside: OutsideStep[] = [];
  const say = (at: string, expected: string, found: unknown, message: string) =>
    problems.push({ file: VERBS_FILE, at, expected, ...(found === undefined ? {} : { found: show(found) }), message });
  const strayKeys = (at: string, obj: Record<string, unknown>, allowed: string[]) => {
    for (const key of Object.keys(obj)) if (!allowed.includes(key)) say(`${at}.${key}`, `only ${list(allowed)}`, key, `${VERBS_FILE}: ${at} has "${key}", which this format does not have (it has ${list(allowed)}).`);
  };

  if (!isObj(verbs) || !Array.isArray(verbs.verbs)) {
    say('verbs', 'an object with a list of verbs', isObj(verbs) ? verbs.verbs : verbs, `${VERBS_FILE} is missing or has no list of verbs.`);
    return { ok: false, problems, outside };
  }
  strayKeys('verbs', verbs, ['$schema', 'verbs']);

  const nouns = new Map<string, Noun>(world.nouns.nouns.map((n) => [n.id, n]));
  const relations = new Map<string, Relation>(world.relations.relations.map((r) => [r.id, r]));
  const subjects = verbSubjects(world);
  const systems = world.relations.relations.filter((r) => (vocabulary?.kinds ?? [kindById(r.kind)]).some((k) => k && k.id === r.kind && k.target === 'system') && typeof r.to === 'string');
  const systemWords = [...new Set(systems.map((r) => r.to as string))];
  const specced = Object.keys(VERB_NODES).filter((k) => VERB_NODES[k].specced);
  const verbIds = new Set<string>();

  verbs.verbs.forEach((v: unknown, vi: number) => {
    const at = `verbs[${vi}]`;
    if (!isObj(v)) return say(at, 'a verb', v, `${at} is not a verb.`);
    strayKeys(at, v, ['id', 'name', 'sentence', 'when', 'runs', 'about', 'steps']);
    const vid = typeof v.id === 'string' ? v.id : `#${vi}`;
    if (typeof v.id !== 'string' || !ID.test(v.id)) say(`${at}.id`, 'an id: a letter, then letters, digits, - or _', v.id, `${at} has no usable id.`);
    else if (verbIds.has(v.id)) say(`${at}.id`, 'an id used once', v.id, `${at}: the id "${v.id}" is used twice.`);
    else verbIds.add(v.id);
    if (!nonEmpty(v.name)) say(`${at}.name`, "the person's name for it", v.name, `${at} ("${vid}") has no name.`);
    if (!nonEmpty(v.sentence)) say(`${at}.sentence`, 'the sentence the person said, failures included', v.sentence, `${at} ("${vid}") has no sentence: a verb is saved with what the person said it does.`);
    if (v.when !== undefined && !nonEmpty(v.when)) say(`${at}.when`, 'what sets it off, in words, or nothing', v.when, `${at} ("${vid}") has an empty when.`);
    const runs = v.runs === 'server' || v.runs === 'app' ? v.runs : undefined;
    if (!runs) say(`${at}.runs`, 'server or app', v.runs, `${at} ("${vid}") must say where it runs: "server" (the backend's engine) or "app".`);
    if (v.about !== undefined) {
      if (!isObj(v.about)) say(`${at}.about`, 'the nouns and relations it touches, by id', v.about, `${at} ("${vid}"): about must be an object.`);
      else {
        strayKeys(`${at}.about`, v.about, ['nouns', 'relations']);
        for (const [key, have] of [
          ['nouns', nouns],
          ['relations', relations]
        ] as const) {
          const ids = v.about[key];
          if (ids === undefined) continue;
          if (!Array.isArray(ids)) say(`${at}.about.${key}`, `a list of ${key} ids`, ids, `${at} ("${vid}"): about.${key} must be a list.`);
          else ids.forEach((id, i) => {
            if (typeof id !== 'string' || !have.has(id)) say(`${at}.about.${key}[${i}]`, `one of ${list([...have.keys()])}`, id, `${at} ("${vid}") says it touches ${show(id)}, which is not a ${key === 'nouns' ? 'noun' : 'relation'} of this world.`);
          });
        }
      }
    }

    if (!Array.isArray(v.steps) || v.steps.length === 0) {
      say(`${at}.steps`, 'a list of at least one step', v.steps, `${at} ("${vid}") has no steps: a verb is what happens, step by step.`);
      return;
    }
    const steps = v.steps as unknown[];
    const stepIds: string[] = steps.map((s, i) => (isObj(s) && typeof s.id === 'string' ? s.id : `#${i}`));
    const used = new Set<string>();
    steps.forEach((s: unknown, si: number) => {
      const sat = `${at}.steps[${si}]`;
      if (!isObj(s)) return say(sat, 'a step', s, `${sat} is not a step.`);
      strayKeys(sat, s, ['id', 'says', 'does', 'on', 'fields', 'by', 'system', 'node', 'kind', 'fails']);
      const sid = stepIds[si];
      if (typeof s.id !== 'string' || !ID.test(s.id)) say(`${sat}.id`, 'an id: a letter, then letters, digits, - or _', s.id, `${sat} has no usable id.`);
      else if (used.has(s.id)) say(`${sat}.id`, 'an id used once in the verb', s.id, `${sat}: the id "${s.id}" is used twice in "${vid}".`);
      else used.add(s.id);
      if (!nonEmpty(s.says)) say(`${sat}.says`, "the step in the person's words", s.says, `${sat} ("${vid}/${sid}") has no says.`);
      const does = VERB_DOES.includes(s.does as VerbDoes) ? (s.does as VerbDoes) : undefined;
      if (!does) {
        say(`${sat}.does`, `one of ${list(VERB_DOES)}`, s.does, `${sat} ("${vid}/${sid}") does ${show(s.does)}; a step does one of ${list(VERB_DOES)}.`);
        return;
      }

      // What it is on.
      const subject = typeof s.on === 'string' ? subjects.get(s.on) : undefined;
      if (does !== 'ask' && !subject) {
        say(`${sat}.on`, `one of ${list([...subjects.keys()])}`, s.on, `${sat} ("${vid}/${sid}") ${does === 'keep' ? 'keeps' : `${does}s`} ${show(s.on)}, which is not a noun or a relation that is a record of its own.`);
      } else if (does === 'ask' && s.on !== undefined && !subject) {
        say(`${sat}.on`, `one of ${list([...subjects.keys()])}, or nothing`, s.on, `${sat} ("${vid}/${sid}") asks about ${show(s.on)}, which is not a noun or a relation that is a record of its own.`);
      }
      if (does === 'ask') {
        if (!nonEmpty(s.system)) say(`${sat}.system`, systemWords.length ? `one of the systems the world names: ${list(systemWords)}` : 'the other system, named by an exists-elsewhere relation', s.system, `${sat} ("${vid}/${sid}") asks another system and does not say which.`);
        else if (!systemWords.includes(s.system)) say(`${sat}.system`, systemWords.length ? `one of ${list(systemWords)}` : 'a system an exists-elsewhere relation names', s.system, `${sat} ("${vid}/${sid}") asks "${s.system}", which no relation of this world names as another system.`);
      } else if (s.system !== undefined) say(`${sat}.system`, 'nothing: only an ask names another system', s.system, `${sat} ("${vid}/${sid}") ${does}s here, and names a system.`);

      if (does === 'update') {
        if (!Array.isArray(s.fields) || s.fields.length === 0) say(`${sat}.fields`, subject ? `the properties it writes: ${list([...subject.properties.keys()])}` : 'the properties it writes', s.fields, `${sat} ("${vid}/${sid}") updates ${show(s.on)} and does not say which properties: an update that writes nothing cannot be graded.`);
        else if (subject) s.fields.forEach((f, i) => {
          if (typeof f !== 'string' || !subject.properties.has(f)) say(`${sat}.fields[${i}]`, `one of ${list([...subject.properties.keys()])}`, f, `${sat} ("${vid}/${sid}") writes ${show(f)}, which "${subject.id}" does not have.`);
        });
      } else if (s.fields !== undefined) say(`${sat}.fields`, 'nothing: only an update names the properties it writes', s.fields, `${sat} ("${vid}/${sid}") ${does}s, and names fields.`);

      if (does === 'end' && subject) {
        if (s.by !== undefined) {
          if (typeof s.by !== 'string' || subject.properties.get(s.by) !== 'date') say(`${sat}.by`, `a date of "${subject.id}": ${list([...subject.properties].filter(([, k]) => k === 'date').map(([n]) => n)) || 'none — add one, or say the relation starts and ends'}`, s.by, `${sat} ("${vid}/${sid}") ends by ${show(s.by)}, which is not a date "${subject.id}" has.`);
        } else if (!subject.endField) {
          say(`${sat}.by`, `the date that marks the end — "${subject.id}" ${subject.kind === 'noun' ? 'has no relation saying it can end' : 'does not say it starts and ends'}`, undefined, `${sat} ("${vid}/${sid}") ends ${show(s.on)}, and nothing says what marks the end: say \`by\` (a date it has), or say in ${subject.kind === 'noun' ? 'a relation that it can end' : "the relation's answers that it starts and ends"}.`);
        }
      } else if (s.by !== undefined) say(`${sat}.by`, 'nothing: only an end says what marks it', s.by, `${sat} ("${vid}/${sid}") ${does}s, and says by.`);

      if (does === 'remove' && subject?.ends) {
        say(`${sat}.does`, `end — "${subject.id}" ends; it is never removed (the '${subject.ends}' relation)`, 'remove', `${sat} ("${vid}/${sid}") removes ${show(s.on)}, and the world says ${subject.id === 'person' ? 'a person' : `a ${subject.id}`} ends without being deleted (the '${subject.ends}' relation): ending a thing by deleting it is the mistake that relation exists to prevent.`);
      }

      // The node, and where it runs.
      const node = stepNode({ does, node: typeof s.node === 'string' ? s.node : undefined });
      if (does === 'keep') {
        if (s.node !== undefined) say(`${sat}.node`, 'nothing: a keep does nothing, and binds to no node', s.node, `${sat} ("${vid}/${sid}") keeps ${show(s.on)} and names a node.`);
      } else if (node !== undefined) {
        const known = VERB_NODES[node];
        if (!known) say(`${sat}.node`, `one of the specced nodes: ${list(specced)}`, s.node, `${sat} ("${vid}/${sid}") binds to ${show(s.node)}, which no spec knows; the nodes a step can bind to are ${list(specced)} (and the cloud-only nodes, counted as outside).`);
        else {
          if (!known.specced) outside.push({ verb: vid, step: sid, node });
          if (runs && !known.runs.includes(runs)) {
            say(`${sat}.node`, `a node that runs ${runs === 'server' ? 'on the server' : 'in the app'}: ${list(Object.keys(VERB_NODES).filter((k) => VERB_NODES[k].runs.includes(runs)))}`, node, `${sat} ("${vid}/${sid}") binds to ${known.label} (${node}), which runs only ${known.runs.includes('app') ? 'in the app' : 'on the server'}, and the verb runs ${runs === 'server' ? 'on the server' : 'in the app'}: a mix the projection cannot honour.`);
          }
        }
      }
      const kind = stepKind({ does, kind: typeof s.kind === 'string' ? s.kind : undefined });
      if (!VERB_STEP_KINDS.includes(kind)) say(`${sat}.kind`, `one of the engine's step kinds: ${list(VERB_STEP_KINDS)}`, s.kind, `${sat} ("${vid}/${sid}") projects to ${show(s.kind)}, which is not a step kind the engine has; the kinds are ${list(VERB_STEP_KINDS)}.`);
      else if (does === 'keep' && kind !== 'transform') say(`${sat}.kind`, 'transform — a keep is a note the run keeps, not work', s.kind, `${sat} ("${vid}/${sid}") keeps ${show(s.on)} as a ${kind} step; a keep does nothing and is kept as a transform.`);
      else if (does !== 'keep' && kind !== 'call-function' && kind !== 'for-each') say(`${sat}.kind`, 'call-function or for-each — work is done by a function the step calls', s.kind, `${sat} ("${vid}/${sid}") ${does}s through a ${kind} step; a step that does work calls a function (call-function, or for-each over a list).`);

      // The failure arm.
      if (s.fails !== undefined) {
        if (does === 'keep') say(`${sat}.fails`, 'nothing: a keep cannot fail', s.fails, `${sat} ("${vid}/${sid}") keeps ${show(s.on)} and names a failure arm.`);
        else if (!Array.isArray(s.fails)) say(`${sat}.fails`, 'a list of one failure arm', s.fails, `${sat} ("${vid}/${sid}"): fails must be a list.`);
        else if (s.fails.length > 1) say(`${sat}.fails`, 'one arm — a second kind of failure is a second step', s.fails.length, `${sat} ("${vid}/${sid}") has ${s.fails.length} failure arms; the engine routes every failure of a step down one error edge, so a step has one arm, and a second kind of failure is a second step.`);
        else s.fails.forEach((a: unknown, ai: number) => {
          const aat = `${sat}.fails[${ai}]`;
          if (!isObj(a)) return say(aat, 'a failure arm: when, then, sees', a, `${aat} is not a failure arm.`);
          strayKeys(aat, a, ['id', 'when', 'then', 'sees', 'skips', 'answers']);
          const arm = a as unknown as VerbArm;
          if (typeof a.id !== 'string' || !ID.test(a.id)) say(`${aat}.id`, 'an id: a letter, then letters, digits, - or _', a.id, `${aat} has no usable id.`);
          else if (used.has(a.id) || stepIds.includes(a.id)) say(`${aat}.id`, 'an id no step or arm of the verb has', a.id, `${aat}: the id "${a.id}" is a step's or another arm's in "${vid}"; an arm becomes a step of the workflow and needs its own.`);
          else used.add(a.id);
          if (!nonEmpty(a.when)) say(`${aat}.when`, "when the arm is taken, in the person's words", a.when, `${aat} ("${vid}/${sid}") has no when.`);
          if (!nonEmpty(a.sees)) say(`${aat}.sees`, 'what the person sees when it is taken', a.sees, `${aat} ("${vid}/${sid}") has no sees: an arm taken silently is the enrolment note's incident.`);
          if (!(VERB_ARM_THEN as readonly string[]).includes(a.then as string)) say(`${aat}.then`, `one of ${list(VERB_ARM_THEN)}`, a.then, `${aat} ("${vid}/${sid}") then ${show(a.then)}; an arm records it and goes on, or stops.`);
          if (a.skips !== undefined) {
            if (a.then !== 'record-and-go-on') say(`${aat}.skips`, 'nothing: only an arm that goes on skips steps', a.skips, `${aat} ("${vid}/${sid}") stops, and skips steps.`);
            else if (!Array.isArray(a.skips) || !a.skips.length) say(`${aat}.skips`, 'the ids of the steps right after this one', a.skips, `${aat} ("${vid}/${sid}"): skips must be a list of step ids.`);
            else {
              const want = stepIds.slice(si + 1, si + 1 + a.skips.length);
              if (JSON.stringify(a.skips) !== JSON.stringify(want)) say(`${aat}.skips`, want.length ? `the steps right after this one, in order: ${list(want)}` : 'nothing: no step follows this one', a.skips, `${aat} ("${vid}/${sid}") skips ${show(a.skips)}; an arm that goes on skips the steps right after its own, in order, and then the verb continues.`);
            }
          }
          if (arm.answers !== undefined) {
            const ans = a.answers;
            if (!isObj(ans) || typeof ans.relation !== 'string' || typeof ans.question !== 'string') say(`${aat}.answers`, 'a relation id and the id of a question its kind asks', a.answers, `${aat} ("${vid}/${sid}"): answers names the question of a relation's kind this arm answers.`);
            else {
              const r = relations.get(ans.relation);
              const k = r && kindById(r.kind);
              if (!r) say(`${aat}.answers.relation`, `one of ${list([...relations.keys()])}`, ans.relation, `${aat} ("${vid}/${sid}") answers for ${show(ans.relation)}, which is not a relation of this world.`);
              else if (k && !k.questions.some((q) => q.id === ans.question)) say(`${aat}.answers.question`, `one of ${list(k.questions.map((q) => q.id))}`, ans.question, `${aat} ("${vid}/${sid}") answers "${ans.question}", which a ${k.id} does not ask; it asks ${list(k.questions.map((q) => q.id))}.`);
              // An arm's answer is its words (what is skipped, what the person sees): it cannot be a yes or one of a list (s10).
              else if (k) {
                const words = k.questions.filter((q) => q.answer.type === 'words').map((q) => q.id);
                if (!words.includes(ans.question as string)) say(`${aat}.answers.question`, `a question answered in words: one of ${list(words)}`, ans.question, `${aat} ("${vid}/${sid}") answers "${ans.question}", which is answered ${k.questions.find((q) => q.id === ans.question)!.answer.type === 'yes-no' ? 'yes or no' : 'with one of a list'}, not in an arm's words; write it in relations[${ans.relation}].answers.`);
              }
            }
          }
        });
      }
    });
  });

  return { ok: problems.length === 0, problems, outside };
}

/** The verbs of a world, typed, once validated; `[]` when the file is not there. */
export function verbsOf(world: WorldFiles): Verb[] {
  return (world.verbs as VerbsFile | undefined)?.verbs ?? [];
}
