/**
 * P116 ONT-013 — the rule is a sentence: the fifth file and its validator.
 *
 * `docs/world/rules.json` keeps a rule the person said that no kind's question produced ("once an
 * invoice is issued, its amount never changes"): the sentence, what the store is asked to keep
 * (`holds`, one of `RuleHold`'s shapes), the mistake it prevents (`mutant`) and where it came
 * from. The kinds are the templates and the projection is the compiler; this file is the freedom
 * to invent (R-d), and the frame that keeps an invented rule from being a lie (§2.3):
 *
 * - a `holds` fits one of the shapes listed here, or the rule is refused with the shapes in
 *   words — never written as free text, never as code or SQL (AC2's mutant);
 * - every detail it names is one the noun has, by the person's name for it;
 * - a rule without its mistake is refused: a rule nobody can grade is a sentence, not a rule;
 * - "Claude" is not a source.
 *
 * What the validator admits, the projection then keeps on both engines or writes into the
 * collection's description as *not kept* (R-e). This module imports nothing from the projection,
 * so it can run before any schema exists, as the verbs' validator does.
 */
import type { RuleHold } from './kind';
import { RULE_FROM, RULES_FILE, type WorldFiles, type WorldProperty, type WorldRule } from './files';
import type { WorldProblem } from './validate';
import { verbSubjects } from './verbs';
import { kindById } from './vocabulary';

export interface RuleShape {
  /** The member that names the shape. */
  key: string;
  /** Every member it may have. */
  members: readonly string[];
  /** The shape in words, with its JSON, for the refusal and the brief. */
  words: string;
}

/**
 * The shapes a rule in `rules.json` may hold, in words: what a person can say about a noun's own
 * records and details. The rest of `RuleHold` has a home elsewhere ({@link RULE_HOMES}).
 */
export const RULE_SHAPES: readonly RuleShape[] = Object.freeze([
  { key: 'unique', members: ['unique', 'whileEmpty'], words: 'no two records share these details: { "unique": [details], "whileEmpty"?: detail }' },
  { key: 'setOnce', members: ['setOnce'], words: 'a detail written when the record is made and never changed: { "setOnce": detail }' },
  { key: 'neverEdited', members: ['neverEdited'], words: 'a record never changed once made: { "neverEdited": true }' },
  { key: 'neverDeleted', members: ['neverDeleted', 'unless'], words: 'a record never deleted, unless it still matches: { "neverDeleted": true, "unless"?: { detail: value } }' },
  { key: 'frozen', members: ['frozen', 'unless', 'except'], words: 'details that never change ("*" for all but except), unless the record still matches: { "frozen": [details] | "*", "unless"?: { detail: value }, "except"?: [details] }' },
  { key: 'moves', members: ['moves', 'from'], words: 'a choice that moves only as said, per old value: { "moves": detail, "from": { value: { "to": [values] } } }' },
  { key: 'onlyOne', members: ['onlyOne'], words: 'at most one record of it: { "onlyOne": true }' },
  { key: 'atMost', members: ['atMost', 'of', 'per'], words: 'at most so many records of another noun on one of these: { "atMost": number | { "field": detail }, "of": noun, "per"?: relation }' },
  { key: 'onlyBy', members: ['onlyBy', 'changes', 'to'], words: 'only a role may change a detail: { "onlyBy": role, "changes": detail, "to"?: value }' }
]);

/** The shapes of `RuleHold` a rule file does not take, and where each is said instead. */
export const RULE_HOMES: Readonly<Record<string, string>> = Object.freeze({
  secret: 'a noun\'s own answer: "answers": { "secret": true } on the noun, and "secret": true on the detail',
  history: 'a noun\'s own answer: "answers": { "history": true }',
  series: 'a noun\'s own answers: "readAloud": true, with "looksLike", "maySkip" and "restarts"',
  onlyWhen: 'the detail\'s own "onlyWhen": { "field": …, "is"?: …, "required"?: true }',
  pairOnce: 'the relation\'s kind',
  pairTwice: 'the relation\'s kind',
  notUnderItself: 'the relation\'s kind',
  onlyThrough: 'the relation\'s kind',
  logged: 'the relation\'s kind',
  retiredStays: 'the relation\'s kind',
  shape: 'the relation\'s kind'
});

export interface RulesVerdict {
  ok: boolean;
  problems: WorldProblem[];
}

const ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const scalar = (v: unknown): v is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof v);
const show = (v: unknown): string => (v === undefined ? 'nothing' : JSON.stringify(v));
const list = (xs: readonly string[]): string => xs.map((x) => JSON.stringify(x)).join(', ');

/** The details of a noun, or of a relation that is a record of its own, by the person's names; a read-aloud noun's `number` among them. */
function detailsOf(world: Pick<WorldFiles, 'nouns' | 'relations'>, on: string): Map<string, WorldProperty> | undefined {
  const noun = world.nouns.nouns.find((n) => n.id === on);
  const rel = noun ? undefined : world.relations.relations.find((r) => r.id === on);
  if (!noun && !rel) return undefined;
  const out = new Map<string, WorldProperty>();
  for (const p of (noun ?? rel)!.properties || []) out.set(p.name, p);
  if (noun?.answers?.readAloud === true && !out.has('number')) out.set('number', { name: 'number', kind: 'text' });
  return out;
}

/** The shape of `holds`: the one shape whose naming member it has, when it has exactly one. */
export function ruleShapeOf(holds: unknown): RuleShape | undefined {
  if (!isObj(holds)) return undefined;
  const named = RULE_SHAPES.filter((s) => s.key in holds);
  return named.length === 1 ? named[0] : undefined;
}

/**
 * Validates `rules.json` over a world the three files already describe. Every refusal says what
 * was expected, in words, and where; a `holds` that fits no shape lists the shapes.
 */
export function validateRules(rules: unknown, world: Pick<WorldFiles, 'nouns' | 'relations'>): RulesVerdict {
  const problems: WorldProblem[] = [];
  const say = (at: string, expected: string, found: unknown, message: string) =>
    problems.push({ file: RULES_FILE, at, expected, ...(found === undefined ? {} : { found: show(found) }), message });
  const strayKeys = (at: string, obj: Record<string, unknown>, allowed: readonly string[]) => {
    for (const key of Object.keys(obj))
      if (!allowed.includes(key)) say(`${at}.${key}`, `only ${allowed.join(', ')}`, key, `${RULES_FILE}: ${at} has "${key}", which this format does not have (it has ${allowed.join(', ')}).`);
  };

  if (!isObj(rules) || !Array.isArray(rules.rules)) {
    say('rules', 'an object with a list of rules', isObj(rules) ? rules.rules : rules, `${RULES_FILE} is missing or has no list of rules.`);
    return { ok: false, problems };
  }
  strayKeys('rules', rules, ['$schema', 'rules']);
  const subjects = verbSubjects(world);
  const ids = new Set<string>();
  const shapes = RULE_SHAPES.map((s) => s.key);

  rules.rules.forEach((r: unknown, i: number) => {
    const at = `rules[${i}]`;
    if (!isObj(r)) return say(at, 'a rule: id, on, says, holds, mutant, from', r, `${at} is not a rule.`);
    strayKeys(at, r, ['id', 'on', 'says', 'holds', 'mutant', 'from']);
    const label = `${at} ("${String(r.id ?? '?')}")`;
    if (typeof r.id !== 'string' || !ID.test(r.id)) say(`${at}.id`, 'an id: a letter, then letters, digits, - or _', r.id, `${at} has no usable id.`);
    else if (ids.has(r.id)) say(`${at}.id`, 'an id used once', r.id, `${at}: the id "${r.id}" is used twice.`);
    else ids.add(r.id);
    if (!nonEmpty(r.says)) say(`${at}.says`, "the person's sentence", r.says, `${label} has no sentence: a rule is saved with what the person said, and that sentence is what they read back.`);
    if (!nonEmpty(r.mutant)) say(`${at}.mutant`, 'the mistake it prevents, in words', r.mutant, `${label} names no mistake: a rule is graded against the mistake it prevents, and one with none cannot be.`);
    if (!RULE_FROM.includes(r.from as never)) say(`${at}.from`, `one of ${list(RULE_FROM)}`, r.from, `${label} came from ${show(r.from)}; a rule comes from ${list(RULE_FROM)} — the person, a note, or the census. An agent is not a source.`);

    // `on`: a noun, or a relation that is a record of its own.
    const subject = typeof r.on === 'string' ? subjects.get(r.on) : undefined;
    if (!subject) {
      say(`${at}.on`, `a noun, or a relation that is a record of its own (${list([...subjects.keys()])})`, r.on, `${label} is about ${show(r.on)}, which is not a noun or a relation with records of its own; it is one of ${list([...subjects.keys()])}.`);
      return;
    }
    const on = subject.id;
    const details = detailsOf(world, on)!;
    const detailNames = [...details.keys()];
    const detail = (member: string, value: unknown, kinds?: readonly string[]): WorldProperty | undefined => {
      if (!nonEmpty(value)) {
        say(`${at}.holds.${member}`, `a detail of "${on}"`, value, `${label}: "${member}" names a detail of "${on}", by its name; it is ${show(value)}.`);
        return undefined;
      }
      const p = details.get(value);
      if (!p) {
        say(`${at}.holds.${member}`, `a detail of "${on}" (${list(detailNames)})`, value, `${label}: "${member}" names "${value}", which is not a detail of "${on}" (its details are ${detailNames.length ? list(detailNames) : 'none'}). A link is a relation, and a rule about one is the relation's kind's.`);
        return undefined;
      }
      if (kinds && !kinds.includes(p.kind)) {
        say(`${at}.holds.${member}`, `a ${kinds.join(' or ')} detail`, p.kind, `${label}: "${member}" names "${value}", a ${p.kind}; this shape takes a ${kinds.join(' or ')}.`);
        return undefined;
      }
      return p;
    };
    const detailList = (member: string, value: unknown): void => {
      if (!Array.isArray(value) || !value.length) {
        say(`${at}.holds.${member}`, 'a list of details', value, `${label}: "${member}" is a list of the details, by name.`);
        return;
      }
      const seen = new Set<string>();
      for (const v of value) {
        if (detail(member, v) && seen.has(v as string)) say(`${at}.holds.${member}`, 'each detail once', v, `${label}: "${member}" names "${String(v)}" twice.`);
        seen.add(v as string);
      }
    };
    /** `unless`: the old record still matches — each key a choice or yes/no detail with one of its values, so the claim can make a row the rule binds and one it frees. */
    const condition = (member: string, value: unknown): void => {
      if (!isObj(value) || !Object.keys(value).length) {
        say(`${at}.holds.${member}`, 'an object of detail to value, as { "status": "draft" }', value, `${label}: "${member}" says when the record still matches: a choice or yes/no detail and the value it holds then, as { "status": "draft" }.`);
        return;
      }
      for (const [field, v] of Object.entries(value)) {
        if (field.startsWith('$')) {
          say(`${at}.holds.${member}.${field}`, 'a detail, not an operator', field, `${label}: "${member}" is a detail and its value, in the person's words; "${field}" is not one.`);
          continue;
        }
        const p = detail(member, field, ['choice', 'yesno']);
        if (!p) continue;
        if (p.kind === 'yesno' && typeof v !== 'boolean') say(`${at}.holds.${member}.${field}`, 'true or false', v, `${label}: "${field}" is a yes/no, so "${member}" holds true or false for it.`);
        else if (p.kind === 'choice' && !(Array.isArray(p.values) && p.values.includes(v as string)))
          say(`${at}.holds.${member}.${field}`, `one of ${list(p.values ?? [])}`, v, `${label}: "${member}" has "${field}" as ${show(v)}, which is not one of its values (${list(p.values ?? [])}).`);
      }
    };

    // `holds`: one shape, its members only, each checked against the noun's details.
    const h = r.holds;
    if (!isObj(h) || !Object.keys(h).length) {
      say(`${at}.holds`, `one of the shapes: ${shapes.join(', ')}`, h, `${label} holds ${show(h)}; a rule holds one shape, by its naming member: ${shapes.join(', ')}.`);
      return;
    }
    const shape = ruleShapeOf(h);
    if (!shape) {
      const homed = Object.keys(h).filter((k) => k in RULE_HOMES);
      const named = RULE_SHAPES.filter((s) => s.key in h).map((s) => s.key);
      const expected = `one shape: ${shapes.join(', ')}`;
      if (named.length > 1) return say(`${at}.holds`, expected, Object.keys(h), `${label} holds ${named.length} shapes at once (${named.join(', ')}); a rule holds one, and a second rule holds the other.`);
      if (homed.length)
        return say(`${at}.holds`, expected, Object.keys(h), `${label} holds "${homed[0]}", which has a home of its own: ${RULE_HOMES[homed[0]]}. A rule here holds one of: ${RULE_SHAPES.map((s) => s.words).join('; ')}.`);
      return say(
        `${at}.holds`,
        expected,
        Object.keys(h),
        `${label} holds ${show(h)}, which fits no shape the store keeps or can say it does not keep. Nothing in a rule is code, a query or free text: ask the person a narrower question, and write the answer in one of: ${RULE_SHAPES.map((s) => s.words).join('; ')}.`
      );
    }
    strayKeys(`${at}.holds`, h, shape.members);
    const hold = h as unknown as RuleHold;
    if ('unique' in hold) {
      detailList('unique', hold.unique);
      if (hold.whileEmpty !== undefined) detail('whileEmpty', hold.whileEmpty);
    } else if ('setOnce' in hold) detail('setOnce', hold.setOnce);
    else if ('neverEdited' in hold) {
      if (hold.neverEdited !== true) say(`${at}.holds.neverEdited`, 'true', hold.neverEdited, `${label}: neverEdited is true, or the shape is another.`);
    } else if ('neverDeleted' in hold) {
      if (hold.neverDeleted !== true) say(`${at}.holds.neverDeleted`, 'true', hold.neverDeleted, `${label}: neverDeleted is true, or the shape is another.`);
      if (hold.unless !== undefined) condition('unless', hold.unless);
    } else if ('frozen' in hold) {
      if (hold.frozen !== '*') detailList('frozen', hold.frozen);
      if (hold.unless !== undefined) condition('unless', hold.unless);
      if (hold.except !== undefined) {
        detailList('except', hold.except);
        if (Array.isArray(hold.frozen) && Array.isArray(hold.except))
          for (const f of hold.except) if ((hold.frozen as readonly string[]).includes(f)) say(`${at}.holds.except`, 'a detail not frozen', f, `${label}: "${f}" is both frozen and excepted.`);
      }
    } else if ('moves' in hold) {
      const p = detail('moves', hold.moves, ['choice']);
      const values = (p?.values ?? []) as string[];
      if (!isObj(hold.from) || !Object.keys(hold.from).length) say(`${at}.holds.from`, 'an object of old value to { "to": [values] }', hold.from, `${label}: "from" says, per old value, where "${String(hold.moves)}" may move: { "draft": { "to": ["issued"] } }.`);
      else if (p)
        for (const [old, m] of Object.entries(hold.from)) {
          const mat = `${at}.holds.from.${old}`;
          if (!values.includes(old)) say(mat, `one of ${list(values)}`, old, `${label}: "from" names "${old}", which is not one of "${p.name}"'s values (${list(values)}).`);
          if (!isObj(m) || !Array.isArray(m.to)) {
            say(mat, '{ "to": [values] }', m, `${label}: from "${old}", "to" is the list of values it may move to ([] for none).`);
            continue;
          }
          for (const k of Object.keys(m))
            if (k !== 'to') say(`${mat}.${k}`, 'only to', k, `${label}: from "${old}" has "${k}"; a move here says only where it goes. Who may make it is a rule of its own: { "onlyBy": role, "changes": "${p.name}", "to": value }.`);
          for (const v of m.to as unknown[]) if (!values.includes(v as string)) say(`${mat}.to`, `one of ${list(values)}`, v, `${label}: from "${old}" to ${show(v)}, which is not one of "${p.name}"'s values (${list(values)}).`);
          if ((m.to as unknown[]).includes(old)) say(`${mat}.to`, 'other values', old, `${label}: from "${old}" to "${old}" is not a move; staying is never one.`);
        }
    } else if ('onlyOne' in hold) {
      if (hold.onlyOne !== true) say(`${at}.holds.onlyOne`, 'true', hold.onlyOne, `${label}: onlyOne is true, or the shape is another.`);
    } else if ('atMost' in hold) {
      const n = hold.atMost;
      if (typeof n === 'number') {
        if (!Number.isInteger(n) || n < 1) say(`${at}.holds.atMost`, 'a whole number of one or more', n, `${label}: atMost is how many at most, a whole number of one or more; it is ${show(n)}.`);
      } else if (isObj(n)) {
        for (const k of Object.keys(n)) if (k !== 'field') say(`${at}.holds.atMost.${k}`, 'only field', k, `${label}: a limit kept on the record is { "field": detail }.`);
        detail('atMost.field', (n as { field?: unknown }).field, ['number']);
      } else say(`${at}.holds.atMost`, 'a number, or { "field": detail }', n, `${label}: atMost is a number, or { "field": detail } for a limit kept on the record itself.`);
      const of = typeof hold.of === 'string' ? subjects.get(hold.of) : undefined;
      if (!of) say(`${at}.holds.of`, `a noun, or a relation that is a record of its own, other than "${on}"`, hold.of, `${label}: "of" names what is counted, ${show(hold.of)}, which is not a noun or a relation with records of its own.`);
      else if (of.id === on) say(`${at}.holds.of`, `a noun other than "${on}"`, hold.of, `${label}: "of" counts ${on}s on a ${on}; a count of the records themselves, with no parent, is ${JSON.stringify({ onlyOne: true })} or no rule the store has.`);
      else {
        // The relation whose link joins the counted records to one of these: `per`, or the only one.
        const joins = world.relations.relations.filter((x) => {
          const k = kindById(x.kind);
          return !!k && (k.target === 'noun' || k.target === 'noun-or-none') && x.from === of.id && x.to === on;
        });
        if (hold.per !== undefined) {
          if (!joins.some((x) => x.id === hold.per))
            say(`${at}.holds.per`, `a relation from "${of.id}" to "${on}"${joins.length ? ` (${list(joins.map((x) => x.id))})` : ''}`, hold.per, `${label}: "per" is the relation each counted ${of.id} points at its ${on} by; ${show(hold.per)} is not one from "${of.id}" to "${on}".`);
        } else if (joins.length !== 1)
          say(`${at}.holds.per`, `the relation from "${of.id}" to "${on}" the count follows`, undefined, joins.length ? `${label}: ${joins.length} relations join a ${of.id} to a ${on} (${list(joins.map((x) => x.id))}); say which with "per".` : `${label}: no relation joins a ${of.id} to a ${on}, so nothing says which ${on} a ${of.id} is counted on; say the relation first.`);
      }
    } else if ('onlyBy' in hold) {
      if (!nonEmpty(hold.onlyBy)) say(`${at}.holds.onlyBy`, 'who may, in the person\'s word (a role)', hold.onlyBy, `${label}: onlyBy is who may make the change, in the person's word: "coach".`);
      const p = detail('changes', hold.changes);
      if (hold.to !== undefined && p) {
        if (!scalar(hold.to)) say(`${at}.holds.to`, 'a word, a number or true/false', hold.to, `${label}: "to" is the value "${p.name}" is changed to.`);
        else if (p.kind === 'choice' && !(Array.isArray(p.values) && p.values.includes(hold.to as string))) say(`${at}.holds.to`, `one of ${list(p.values ?? [])}`, hold.to, `${label}: "to" is ${show(hold.to)}, which is not one of "${p.name}"'s values (${list(p.values ?? [])}).`);
        else if (p.kind === 'yesno' && typeof hold.to !== 'boolean') say(`${at}.holds.to`, 'true or false', hold.to, `${label}: "${p.name}" is a yes/no, so "to" is true or false.`);
      }
    }
  });

  return { ok: problems.length === 0, problems };
}

/** The rules of a world, typed, for a caller that has validated it. */
export const worldRules = (files: WorldFiles): WorldRule[] => files.rules?.rules ?? [];
