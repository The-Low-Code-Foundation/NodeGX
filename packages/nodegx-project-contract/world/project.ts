/**
 * P116 ONT-003 — the projection: what a person said about their world, as a schema.
 *
 * `projectWorld(files)` is a pure function of `docs/world/`: the same three files give the same
 * schema, byte for byte, on every run and every machine (no clock, no randomness, no locale).
 * Its output is written in the backend contract's neutral terms — collections, the storage
 * types P104's eleven tiles become, declared indexes and checks — and names no engine; the
 * backend applies it through its schema API, never by SQL.
 *
 * Every rule a kind's projection produces lands in exactly one of two places:
 *
 * - **held**: the store keeps it (a required field, a unique rule, a choice's list, a pair kept
 *   once). Each becomes a claim: steps that must pass on every engine, and a `mutant` (the
 *   schema with that one rule taken out) on which the same steps must fail.
 * - **not held**: no engine behind the contract keeps it today (what happens to the records a
 *   link points from when its target goes; a field set once; a record never edited). It goes
 *   into the collection's description in words, so the person reads what is not yet kept, and
 *   where steps can say it, a claim that is MEASURED to fail — the label is a measurement, not
 *   an assumption.
 *
 * Nothing is dropped. The test counts every rule in and every rule out.
 */
import type { FieldKind, ProjectedField, ProjectedRule } from './kind';
import type { Relation, WorldFiles, WorldProperty } from './files';
import { kindById, WORLD_VOCABULARY } from './vocabulary';
import { validateWorld } from './validate';

/** The storage type each of P104's eleven tiles becomes (`nodegx-backend/src/admin/app/fieldKinds.ts`, pinned by test). */
export const STORAGE_TYPE: Readonly<Record<FieldKind, string>> = Object.freeze({
  text: 'String',
  number: 'Number',
  yesno: 'Boolean',
  date: 'Date',
  choice: 'String',
  link: 'Pointer',
  links: 'Relation',
  file: 'File',
  location: 'GeoPoint',
  list: 'Array',
  anything: 'Object'
});

/** The collection a `link` with no `points` names: whoever was signed in. */
export const USERS_COLLECTION = '_User';
/** The link to the users collection on the noun that `signsIn` (ONT-002): where a permission rule starts. */
export const LOGIN_FIELD = 'login';

/**
 * The hop a permission rule starts from, read off the schema: the collection of the noun that
 * signs in and its `login` link. Undefined when no noun signs in — the runner's question.
 */
export function loginHop(schema: WorldSchema): { collection: string; by: string } | undefined {
  for (const c of schema.collections) {
    const col = c.columns.find((x) => x.name === LOGIN_FIELD && x.kind === 'link' && x.targetClass === USERS_COLLECTION && !x.relation);
    if (col) return { collection: c.name, by: col.name };
  }
  return undefined;
}

/** The backend manager's name rule (`format.ts` `NAME_RULE`): a letter, then letters, digits or `_`. */
const STORAGE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export interface WorldColumn {
  name: string;
  /** The tile it is, of P104's eleven — Text and Choice are both a String, and the person picked one. */
  kind: FieldKind;
  type: string;
  targetClass?: string;
  required?: true;
  /**
   * P116 R10: a link to a noun — what happens to this record when the one it points at goes. Kept
   * by the backend at delete time (`@noodl/backend-contract` `targetGoes.ts`), so it is held.
   */
  whenTargetGoes?: 'goes-too' | 'stays-unlinked' | 'blocks';
  description?: string;
  /** The relation that made it, when one did (ONT-004: a path is compiled by reading these back). */
  relation?: string;
}
export interface WorldCheck {
  field: string;
  oneOf: string[];
}
export interface WorldIndex {
  fields: string[];
  unique: true;
  /** Only the rows where these fields are empty — a link still running. */
  where?: Record<string, { exists: false }>;
}
export interface WorldCollection {
  name: string;
  /** What it was made from: a noun, or a relation that is a record of its own. */
  made: { noun: string } | { relation: string };
  /** The person's sentence. */
  sentence: string;
  /** What the database does not keep yet, in words. Empty when it keeps everything said. */
  notHeld: string[];
  /** The sentence, then what is not held — what the backend shows under the collection's name. */
  description: string;
  columns: WorldColumn[];
  checks: WorldCheck[];
  indexes: WorldIndex[];
  /**
   * P116 ONT-014 — the rules on a record's OLD values, as `security.json` takes them under the
   * collection's `onlyWhile`, kept by the backend inside every write a person makes: *set once*
   * and *never edited* are frozen fields (`"*"` = the whole record), *never deleted* is
   * `delete: "never"`. Absent when the world says none.
   */
  onlyWhile?: WorldOnlyWhile;
}

/** P116 ONT-014 — the part of a collection's `onlyWhile` a world says (`@noodl/backend-contract` `OnlyWhileRule`, restated). */
export interface WorldOnlyWhile {
  update?: { frozen: { fields: string[] | '*' } };
  delete?: 'never';
}

/** A value a claim step writes. `ref` is the id of a row an earlier step made; `date` an ISO date. */
export type ClaimValue = string | number | boolean | { ref: string } | { date: string };
export type ClaimData = Record<string, ClaimValue>;

/** One step of a claim, in the contract's data plane. Collections are named as in the schema. */
export type ClaimStep =
  /** create; must succeed. `as` names the row for later steps. */
  | { make: string; as: string; data: ClaimData }
  /** create; the store must refuse it */
  | { refuse: string; data: ClaimData }
  /**
   * save; must succeed, or with `refused` the store must refuse it. `byPerson` (ONT-014): made by a
   * person the collection's `onlyWhile` binds — every other step is the store's own key, which no
   * `onlyWhile` binds (the admin, a function: how an amend or an erasure is made).
   */
  | { change: string; row: string; data: ClaimData; refused?: true; byPerson?: true }
  /** delete; must succeed, or with `refused` the store must refuse it. `byPerson` as for `change`. */
  | { remove: string; row: string; refused?: true; byPerson?: true }
  /** add `with` to a `links` field (or append it, if the field is a list) */
  | { pair: string; row: string; field: string; with: string }
  /** the field holds exactly `count` entries */
  | { paired: string; row: string; field: string; count: number }
  /** the row is no longer there */
  | { gone: string; row: string }
  /** the row is there and the field is empty */
  | { empty: string; row: string; field: string }
  /** the row is still there (P116 ONT-006: a verb's `keep` and `end` rows) */
  | { there: string; row: string }
  /** the row is there and the field holds exactly `value` (ONT-006: what an `end` or an `update` wrote) */
  | { holds: string; row: string; field: string; value: ClaimValue };

/** What taking one held rule out of the schema means — the claim's mutant. */
export type ClaimMutant =
  | { dropRequired: { collection: string; field: string } }
  | { dropIndex: { collection: string; fields: string[] } }
  | { dropCheck: { collection: string; field: string } }
  | { linksAsList: { collection: string; field: string } }
  /** R10: the link says nothing about when its record goes. */
  | { dropWhenTargetGoes: { collection: string; field: string } }
  /** ONT-014: the collection's `onlyWhile` without one rule — a field no longer frozen, the record editable, or deletable. */
  | { dropOnlyWhile: { collection: string; setOnce: string } | { collection: string; neverEdited: true } | { collection: string; neverDeleted: true } };

export interface WorldClaim {
  /** `<relation or noun id>/<what>`, unique in the schema. */
  id: string;
  /** The claim in the person's words. */
  says: string;
  /** The relation, or the noun, whose words it comes from. */
  from: { relation: string } | { noun: string };
  /** True: every engine must pass it. False: no engine keeps it today, and the claim measures that. */
  held: boolean;
  /** For a held claim: the schema it must fail on. */
  mutant?: ClaimMutant;
  steps: ClaimStep[];
}

export interface NotHeldRule {
  collection: string;
  field?: string;
  says: string;
  /** Why the store does not keep it — which part of the product would. */
  why: string;
  /** The claim that measures it, when steps can say it. */
  claim?: string;
}

export interface WorldSchema {
  vocabulary: { id: string; version: number };
  collections: WorldCollection[];
  claims: WorldClaim[];
  notHeld: NotHeldRule[];
}

export type WorldProjection = { ok: true; schema: WorldSchema } | { ok: false; problems: string[] };

// --------------------------------------------------------------------- names --

const words = (s: string): string[] => s.split(/[^A-Za-z0-9]+/).filter(Boolean);
/** "a person", "an account". */
const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

/** `course-run` → `CourseRun`: a collection's name. */
export function collectionName(id: string): string {
  return words(id).map(cap).join('');
}
/** `first name` → `firstName`, `course-run` → `courseRun`: a field's name. A name already fit is kept as it is. */
export function fieldName(word: string): string {
  if (STORAGE_NAME.test(word)) return word;
  const w = words(word);
  return w.length ? w[0].charAt(0).toLowerCase() + w[0].slice(1) + w.slice(1).map(cap).join('') : '';
}

// ------------------------------------------------------------- what is held --

/** Why the store does not keep a rule of this shape, in words. */
const WHY: Record<string, string> = {
  // R10: a link to a noun keeps it (held). What is left is an id that names no one collection.
  whenTargetGoes: 'the id is text beside a kind, not a link to one collection, so the backend cannot tell which records point at the one that goes',
  notUnderItself: 'the schema has no rule that follows a link from record to record',
  onlyThrough: 'who may see a record is its collection’s permissions (BMG-006), not the schema; a rule through a chain is ONT-004’s',
  logged: 'an exchange with another system is a workflow’s to keep, not the schema’s',
  retiredStays: 'what a list offers is the screen’s choice; the store keeps whatever value is written',
  pairTwice: 'a Links field keeps a pair once; a pair made twice needs a record of its own (an is-on)'
};

/**
 * Whether the backend keeps a link's "when it goes" rule on this column (R10): a link to one
 * noun's collection. A text id (`points-at-one-of`) names no collection; a link to the app's users
 * is never given one by a kind, and a claim could not make a user to delete.
 */
const keepsWhenTargetGoes = (col: WorldColumn): boolean => col.type === 'Pointer' && !!col.targetClass && col.targetClass !== USERS_COLLECTION;

/** `from` is what holds the link, already in words: "accounts", "'membership' records". */
function goesWords(field: ProjectedField, from: string): string {
  if (!field.points) {
    // `points-at-one-of`: the id names one of several kinds of thing.
    if (field.whenTargetGoes === 'goes-too') return `when what they point at goes, the ${from} pointing at it go too`;
    if (field.whenTargetGoes === 'stays-unlinked') return `when what they point at goes, the ${from} pointing at it stay, pointing at nothing`;
    return `nothing can go while any ${from} point at it`;
  }
  const to = field.points;
  if (field.whenTargetGoes === 'goes-too') return `when ${a(to)} goes, the ${from} linked to it go too`;
  if (field.whenTargetGoes === 'stays-unlinked') return `when ${a(to)} goes, the ${from} linked to it stay, without one`;
  return `${a(to)} cannot go while any ${from} are linked to it`;
}
/** What holds a link, in words: a noun's plural, or a relation's own records by its id. */
const holders = (made: WorldCollection['made']): string => ('noun' in made ? `${made.noun}s` : `'${made.relation}' records`);

// --------------------------------------------------------------- the function --

interface Draft {
  collection: WorldCollection;
  /** field name → the choice list it was given, for seeding rows */
  choices: Map<string, string[]>;
  /** field name → the relation that made it, when one did */
  madeBy: Map<string, string>;
}

/**
 * The schema `docs/world/` projects to, or the sentences that say why it cannot. A world the
 * validator refuses is refused with the validator's words; then two things only this step can
 * see: two relations making a field of one name on one record, and a name the store cannot hold.
 */
export function projectWorld(files: WorldFiles): WorldProjection {
  const verdict = validateWorld(files as unknown as Record<string, unknown>);
  if (!verdict.ok) return { ok: false, problems: verdict.problems.map((p) => p.message) };

  const problems: string[] = [];
  const nouns = files.nouns.nouns;
  const relations = files.relations.relations;
  const drafts = new Map<string, Draft>();
  const nameOf = new Map<string, string>(); // noun or own-record relation id → collection name
  const notHeld: NotHeldRule[] = [];

  const label = (made: WorldCollection['made']): string => ('noun' in made ? `the noun "${made.noun}"` : `the relation "${made.relation}"`);
  const open = (key: string, name: string, made: WorldCollection['made'], sentence: string): Draft | undefined => {
    if (!STORAGE_NAME.test(name)) {
      problems.push(`${label(made)} cannot be a collection: its name must start with a letter, then letters, digits or _ ("${name}").`);
      return undefined;
    }
    for (const d of drafts.values())
      if (d.collection.name.toLowerCase() === name.toLowerCase()) {
        problems.push(`${label(d.collection.made)} and ${label(made)} would both be the collection ${name}.`);
        return undefined;
      }
    const draft: Draft = {
      collection: { name, made, sentence, notHeld: [], description: '', columns: [], checks: [], indexes: [] },
      choices: new Map(),
      madeBy: new Map()
    };
    drafts.set(key, draft);
    nameOf.set(key, name);
    return draft;
  };

  const addColumn = (d: Draft, by: string, col: WorldColumn, values?: readonly string[]): void => {
    if (!col.name || !STORAGE_NAME.test(col.name)) {
      problems.push(`${by}: "${col.name}" cannot be a field's name on ${d.collection.name}: it must start with a letter, then letters, digits or _.`);
      return;
    }
    if (d.collection.columns.some((c) => c.name.toLowerCase() === col.name.toLowerCase())) {
      problems.push(`${by} makes a field called "${col.name}" on ${d.collection.name}, which already has one: two things would share one field.`);
      return;
    }
    d.collection.columns.push(col);
    if (values) {
      d.collection.checks.push({ field: col.name, oneOf: values.slice() });
      d.choices.set(col.name, values.slice());
    }
  };

  const propertyColumn = (d: Draft, by: string, p: WorldProperty): void => {
    const col: WorldColumn = { name: fieldName(p.name), kind: p.kind, type: STORAGE_TYPE[p.kind] };
    if (p.sentence) col.description = p.sentence;
    addColumn(d, by, col, p.kind === 'choice' ? p.values || [] : undefined);
  };

  // 1. A collection per noun, its properties as fields, in file order. The noun that signs in
  //    gets a link to the app's users (`login`): the hop a permission rule starts from.
  for (const n of nouns) {
    const d = open(n.id, collectionName(n.id), { noun: n.id }, n.sentence);
    if (!d) continue;
    for (const p of n.properties || []) propertyColumn(d, `the noun "${n.id}"`, p);
    if (n.signsIn) addColumn(d, `the noun "${n.id}"`, { name: LOGIN_FIELD, kind: 'link', type: STORAGE_TYPE.link, targetClass: USERS_COLLECTION, description: `${a(n.id)} is who signs in` });
  }

  // 2. A collection per relation that is a record of its own, with the details on the link.
  const projected = relations.map((r) => {
    const kind = kindById(r.kind)!;
    return { r, out: kind.projection({ id: r.id, from: r.from, to: r.to, property: r.property, answers: r.answers || {} }) };
  });
  for (const { r, out } of projected) if (out.ownRecord) open(r.id, collectionName(r.id), { relation: r.id }, r.sentence);

  // 3. Every relation's fields, then its rules.
  const ruled: Array<{ r: Relation; d: Draft; rule: ProjectedRule }> = [];
  const linked: Array<{ r: Relation; d: Draft; field: ProjectedField; col: string }> = [];
  for (const { r, out } of projected) {
    const by = `the relation "${r.id}"`;
    const own = drafts.get(r.id);
    const from = drafts.get(r.from);
    const to = typeof r.to === 'string' ? drafts.get(r.to) : undefined;
    for (const f of out.fields) {
      const d = f.on === 'own' ? own : f.on === 'to' ? to : from;
      if (!d) {
        problems.push(`${by} puts a field on its ${f.on === 'to' ? 'target' : f.on} record, and it has none.`);
        continue;
      }
      if (f.kind === 'choice' && !f.values && r.kind === 'one-of') {
        // `one-of` names a property the noun already has: the field and its list are there; the
        // relation adds the person's sentence to it.
        const col = d.collection.columns.find((c) => c.name === fieldName(f.name));
        if (col && !col.description) col.description = r.sentence;
        if (col) {
          d.madeBy.set(col.name, r.id);
          col.relation = r.id;
        }
        continue;
      }
      const col: WorldColumn = { name: fieldName(f.name), kind: f.kind, type: STORAGE_TYPE[f.kind] };
      if (f.kind === 'link' || f.kind === 'links') {
        const target = f.points === undefined ? USERS_COLLECTION : nameOf.get(f.points);
        if (!target) {
          problems.push(`${by} links to "${f.points}", which is not a noun.`);
          continue;
        }
        col.targetClass = target;
      }
      if (f.required) col.required = true;
      if (f.whenTargetGoes && keepsWhenTargetGoes(col)) col.whenTargetGoes = f.whenTargetGoes;
      col.description = r.sentence;
      col.relation = r.id;
      d.madeBy.set(col.name, r.id);
      addColumn(d, by, col, f.kind === 'choice' ? f.values || [] : undefined);
      if (f.unique) d.collection.indexes.push({ fields: [col.name], unique: true });
      if (f.whenTargetGoes) linked.push({ r, d, field: f, col: col.name });
    }
    for (const rule of out.rules) {
      const d = rule.on === 'own' ? own : from;
      if (d) ruled.push({ r, d, rule });
    }
    // The details on a link that is a record of its own.
    if (own)
      for (const p of r.properties || []) {
        propertyColumn(own, by, p);
        own.madeBy.set(fieldName(p.name), r.id);
      }
  }

  if (problems.length) return { ok: false, problems };

  // 4. Rules: a unique rule is an index; the rest are said, not held.
  for (const { d, rule } of ruled) {
    const h = rule.holds;
    if ('unique' in h) {
      const fields = h.unique.map(fieldName);
      d.collection.indexes.push(h.whileEmpty ? { fields, unique: true, where: { [fieldName(h.whileEmpty)]: { exists: false } } } : { fields, unique: true });
    } else if ('pairOnce' in h || 'shape' in h) {
      // pairOnce: held by the Links field itself, and claimed below. shape: a fact, not a rule.
    } else if ('setOnce' in h || 'neverEdited' in h || 'neverDeleted' in h) {
      // ONT-014: kept by the backend inside the write (`onlyWhile`), and claimed below.
      const ow = (d.collection.onlyWhile ??= {});
      if ('neverDeleted' in h) ow.delete = 'never';
      else if ('neverEdited' in h) ow.update = { frozen: { fields: '*' } };
      else if (ow.update?.frozen.fields !== '*') {
        const fields = ow.update?.frozen.fields ?? [];
        const field = fieldName(h.setOnce);
        ow.update = { frozen: { fields: fields.includes(field) ? fields : [...fields, field] } };
      }
    } else {
      const key = Object.keys(h)[0];
      const field = 'notUnderItself' in h ? fieldName(h.notUnderItself) : undefined;
      notHeld.push({ collection: d.collection.name, ...(field ? { field } : {}), says: rule.says, why: WHY[key] });
    }
  }
  for (const { d, field, col } of linked) {
    if (d.collection.columns.find((c) => c.name === col)?.whenTargetGoes) continue;
    notHeld.push({ collection: d.collection.name, field: col, says: goesWords(field, holders(d.collection.made)), why: WHY.whenTargetGoes });
  }

  const collections = [...drafts.values()].map((d) => d.collection);
  for (const c of collections) {
    c.notHeld = notHeld.filter((n) => n.collection === c.name).map((n) => n.says);
    c.description = c.notHeld.length ? `${c.sentence} Not kept by the database yet: ${c.notHeld.join('; ')}.` : c.sentence;
  }

  const schema: WorldSchema = { vocabulary: { id: WORLD_VOCABULARY.id, version: WORLD_VOCABULARY.version }, collections, claims: [], notHeld };
  try {
    schema.claims = claimsFor(schema, ruled, linked, [...drafts.values()]);
  } catch (e) {
    return { ok: false, problems: [e instanceof Error ? e.message : String(e)] };
  }
  return { ok: true, schema };
}

// ------------------------------------------------------------------- claims --

/**
 * Makes the rows a claim needs, deterministically: every required field gets a value that fits
 * its column (a choice its first value, a link a row made first), and every value is distinct
 * so no unique rule refuses a row the claim did not mean it to.
 */
class Seeder {
  private n = 0;
  private making = new Set<string>();
  steps: ClaimStep[] = [];
  constructor(private readonly byName: Map<string, Draft>) {}

  next(): number {
    return ++this.n;
  }

  valueFor(d: Draft, col: WorldColumn): ClaimValue | undefined {
    const k = this.next();
    const choices = d.choices.get(col.name);
    if (choices && choices.length) return choices[0];
    if (col.type === 'String') return `${col.name}-${k}`;
    if (col.type === 'Number') return k;
    if (col.type === 'Boolean') return true;
    if (col.type === 'Date') return { date: `2026-01-${String(1 + (k % 28)).padStart(2, '0')}T00:00:00.000Z` };
    if (col.type === 'Pointer' && col.targetClass && col.targetClass !== USERS_COLLECTION) return { ref: this.row(col.targetClass) };
    return undefined;
  }

  /** A value for `col` that is not `than` — what a claim writes to show a value changing. Undefined when the field has only one. */
  other(d: Draft, col: WorldColumn, than: ClaimValue | undefined): ClaimValue | undefined {
    const choices = d.choices.get(col.name);
    if (choices && choices.length) return choices.find((c) => c !== than);
    if (col.type === 'Boolean') return than === true ? false : true;
    return this.valueFor(d, col);
  }

  /** Makes a valid row of `collection` (and what it links to), and returns its name. */
  row(collection: string, override: ClaimData = {}): string {
    if (this.making.has(collection))
      throw new Error(`A ${collection} cannot be made: following its required links leads back to ${collection}, so each needs the other to exist first.`);
    this.making.add(collection);
    const data = this.data(collection, override);
    this.making.delete(collection);
    const as = `${collection.charAt(0).toLowerCase()}${collection.slice(1)}${this.next()}`;
    this.steps.push({ make: collection, as, data });
    return as;
  }

  /** The data a valid row would carry, without making it. */
  data(collection: string, override: ClaimData = {}): ClaimData {
    const d = this.byName.get(collection)!;
    const data: ClaimData = {};
    for (const col of d.collection.columns) {
      if (col.name in override || !col.required) continue;
      const v = this.valueFor(d, col);
      if (v !== undefined) data[col.name] = v;
    }
    return Object.assign(data, override);
  }
}

function claimsFor(
  schema: WorldSchema,
  ruled: Array<{ r: Relation; d: Draft; rule: ProjectedRule }>,
  linked: Array<{ r: Relation; d: Draft; field: ProjectedField; col: string }>,
  drafts: Draft[]
): WorldClaim[] {
  const byName = new Map(drafts.map((d) => [d.collection.name, d]));
  const claims: WorldClaim[] = [];
  const idOf = (d: Draft): string => ('noun' in d.collection.made ? d.collection.made.noun : d.collection.made.relation);
  const relationOf = (c: WorldColumn, d: Draft): WorldClaim['from'] => {
    const r = d.madeBy.get(c.name);
    return r ? { relation: r } : d.collection.made;
  };

  for (const d of drafts) {
    const c = d.collection.name;
    // A required field: a row without it is refused; the same row with it is made (the control).
    for (const col of d.collection.columns.filter((x) => x.required)) {
      const s = new Seeder(byName);
      const full = s.data(c);
      s.steps.push({ make: c, as: 'whole', data: full });
      const without = { ...s.data(c) };
      delete without[col.name];
      s.steps.push({ refuse: c, data: without });
      claims.push({
        id: `${idOf(d)}/${col.name}-is-required`,
        says: `${a(idOf(d))} cannot exist without its ${col.name}`,
        from: relationOf(col, d),
        held: true,
        mutant: { dropRequired: { collection: c, field: col.name } },
        steps: s.steps
      });
    }
    // A choice: its first value is taken; a value off the list is refused.
    for (const check of d.collection.checks) {
      const s = new Seeder(byName);
      s.row(c, { [check.field]: check.oneOf[0] });
      s.steps.push({ refuse: c, data: s.data(c, { [check.field]: `not ${check.oneOf.join(' or ')}` }) });
      const col = d.collection.columns.find((x) => x.name === check.field)!;
      claims.push({
        id: `${idOf(d)}/${check.field}-is-one-of-its-list`,
        says: `${a(idOf(d))}'s ${check.field} is one of ${check.oneOf.join(', ')}, and nothing else`,
        from: relationOf(col, d),
        held: true,
        mutant: { dropCheck: { collection: c, field: check.field } },
        steps: s.steps
      });
    }
    // A unique rule: one value once; another value is taken (the control); with `where`, a closed
    // row with the same value is taken too, so the claim also fails if the rule forgets `where`.
    for (const ix of d.collection.indexes) {
      const s = new Seeder(byName);
      const shared: ClaimData = {};
      for (const f of ix.fields) {
        const col = d.collection.columns.find((x) => x.name === f)!;
        shared[f] = s.valueFor(d, col)!;
      }
      s.row(c, shared);
      const other: ClaimData = {};
      for (const f of ix.fields) other[f] = s.valueFor(d, d.collection.columns.find((x) => x.name === f)!)!;
      s.row(c, other);
      s.steps.push({ refuse: c, data: s.data(c, shared) });
      if (ix.where) {
        const closed: ClaimData = { ...shared };
        for (const f of Object.keys(ix.where)) closed[f] = { date: '2026-02-01T00:00:00.000Z' };
        s.row(c, closed);
      }
      const rule = ruled.find((x) => x.d === d && 'unique' in x.rule.holds && x.rule.holds.unique.map(fieldName).join() === ix.fields.join());
      const col = d.collection.columns.find((x) => x.name === ix.fields[0])!;
      claims.push({
        id: `${idOf(d)}/${ix.fields.join('-')}-is-unique`,
        says: rule ? rule.rule.says : `no two ${idOf(d)}s have the same ${ix.fields.join(' and ')}`,
        from: rule ? { relation: rule.r.id } : relationOf(col, d),
        held: true,
        mutant: { dropIndex: { collection: c, fields: ix.fields.slice() } },
        steps: s.steps
      });
    }
  }

  // Pairs on a Links field: made twice, kept once (held); or said to be twice (measured not held).
  for (const { r, d, rule } of ruled) {
    const h = rule.holds;
    if (!('pairOnce' in h) && !('pairTwice' in h)) continue;
    const field = fieldName('pairOnce' in h ? h.pairOnce : h.pairTwice);
    const col = d.collection.columns.find((x) => x.name === field)!;
    const s = new Seeder(byName);
    const a = s.row(d.collection.name);
    const b = s.row(col.targetClass!);
    s.steps.push({ pair: d.collection.name, row: a, field, with: b }, { pair: d.collection.name, row: a, field, with: b });
    s.steps.push({ paired: d.collection.name, row: a, field, count: 'pairOnce' in h ? 1 : 2 });
    const id = `${r.id}/${'pairOnce' in h ? 'paired-once' : 'paired-twice'}`;
    if ('pairOnce' in h) {
      claims.push({ id, says: rule.says, from: { relation: r.id }, held: true, mutant: { linksAsList: { collection: d.collection.name, field } }, steps: s.steps });
    } else {
      claims.push({ id, says: rule.says, from: { relation: r.id }, held: false, steps: s.steps });
      const n = schema.notHeld.find((x) => x.collection === d.collection.name && x.says === rule.says);
      if (n) n.claim = id;
    }
  }

  // Not held, measured: steps that say the rule, which no engine passes today.
  for (const { r, d, rule } of ruled) {
    const h = rule.holds;
    const c = d.collection.name;
    const s = new Seeder(byName);
    let what = '';
    // ONT-014: held — the backend keeps these inside the write (`onlyWhile`), on every engine.
    const frozen = d.collection.onlyWhile?.update?.frozen.fields;
    if ('setOnce' in h) {
      const field = fieldName(h.setOnce);
      if (frozen === '*') continue; // the whole record is never edited: that claim says it
      const col = d.collection.columns.find((x) => x.name === field)!;
      const first = s.valueFor(d, col);
      const then = s.other(d, col, first);
      if (first === undefined || then === undefined) continue;
      const row = s.row(c, { [field]: first });
      s.steps.push({ change: c, row, data: { [field]: then }, refused: true, byPerson: true });
      claims.push({ id: `${r.id}/${field}-is-set-once`, says: rule.says, from: { relation: r.id }, held: true, mutant: { dropOnlyWhile: { collection: c, setOnce: field } }, steps: s.steps });
      continue;
    } else if ('neverEdited' in h) {
      const col = d.collection.columns.find((x) => x.type === 'String' || x.type === 'Date' || x.type === 'Boolean' || x.type === 'Number');
      if (!col) continue;
      const first = col.required ? undefined : s.valueFor(d, col);
      const row = s.row(c, first === undefined ? {} : { [col.name]: first });
      const made = s.steps.find((x) => 'make' in x && x.as === row) as { data: ClaimData } | undefined;
      const then = s.other(d, col, made?.data[col.name]);
      if (then === undefined) continue;
      s.steps.push({ change: c, row, data: { [col.name]: then }, refused: true, byPerson: true });
      claims.push({ id: `${r.id}/is-never-edited`, says: rule.says, from: { relation: r.id }, held: true, mutant: { dropOnlyWhile: { collection: c, neverEdited: true } }, steps: s.steps });
      continue;
    } else if ('neverDeleted' in h) {
      const row = s.row(c);
      s.steps.push({ remove: c, row, refused: true, byPerson: true });
      claims.push({ id: `${r.id}/is-never-deleted`, says: rule.says, from: { relation: r.id }, held: true, mutant: { dropOnlyWhile: { collection: c, neverDeleted: true } }, steps: s.steps });
      continue;
    } else if ('notUnderItself' in h) {
      const field = fieldName(h.notUnderItself);
      const row = s.row(c);
      s.steps.push({ change: c, row, data: { [field]: { ref: row } }, refused: true });
      what = `${field}-never-leads-back`;
    } else continue;
    const id = `${r.id}/${what}`;
    claims.push({ id, says: rule.says, from: { relation: r.id }, held: false, steps: s.steps });
    const n = schema.notHeld.find((x) => x.collection === c && x.says === rule.says);
    if (n) n.claim = id;
  }
  for (const { r, d, field, col } of linked) {
    const c = d.collection.name;
    const column = d.collection.columns.find((x) => x.name === col)!;
    if (column.type !== 'Pointer' || !column.targetClass || column.targetClass === USERS_COLLECTION) continue;
    const s = new Seeder(byName);
    const target = s.row(column.targetClass);
    const row = s.row(c, { [col]: { ref: target } });
    if (field.whenTargetGoes === 'blocks') s.steps.push({ remove: column.targetClass, row: target, refused: true });
    else {
      s.steps.push({ remove: column.targetClass, row: target });
      s.steps.push(field.whenTargetGoes === 'goes-too' ? { gone: c, row } : { empty: c, row, field: col });
    }
    const id = `${r.id}/${col}-${field.whenTargetGoes}`;
    const held = column.whenTargetGoes !== undefined;
    claims.push({
      id,
      says: goesWords(field, holders(d.collection.made)),
      from: { relation: r.id },
      held,
      ...(held ? { mutant: { dropWhenTargetGoes: { collection: c, field: col } } } : {}),
      steps: s.steps
    });
    const n = schema.notHeld.find((x) => x.collection === c && x.field === col && x.why === WHY.whenTargetGoes);
    if (n) n.claim = id;
  }

  const seen = new Set<string>();
  for (const cl of claims) {
    if (seen.has(cl.id)) throw new Error(`two claims are called ${cl.id}`);
    seen.add(cl.id);
  }
  return claims;
}

/** The schema with one held rule taken out: what the claim that names it must fail on. */
export function applyMutant(schema: WorldSchema, mutant: ClaimMutant): WorldSchema {
  const copy: WorldSchema = JSON.parse(JSON.stringify(schema));
  const where = JSON.stringify(mutant);
  const coll = (name: string): WorldCollection => {
    const c = copy.collections.find((x) => x.name === name);
    if (!c) throw new Error(`The mutant ${where} names a collection the schema does not have.`);
    return c;
  };
  const column = (c: WorldCollection, field: string): WorldColumn => {
    const col = c.columns.find((x) => x.name === field);
    if (!col) throw new Error(`The mutant ${where} names a field ${c.name} does not have.`);
    return col;
  };
  // A mutant that takes out nothing would leave the claim passing for a reason the claim never names.
  const takesOut = (before: number, after: number): void => {
    if (before === after) throw new Error(`The mutant ${where} takes nothing out of the schema.`);
  };
  if ('dropRequired' in mutant) {
    const col = column(coll(mutant.dropRequired.collection), mutant.dropRequired.field);
    takesOut(col.required ? 1 : 0, 0);
    delete col.required;
  } else if ('dropIndex' in mutant) {
    const c = coll(mutant.dropIndex.collection);
    const before = c.indexes.length;
    c.indexes = c.indexes.filter((i) => i.fields.join() !== mutant.dropIndex.fields.join());
    takesOut(before, c.indexes.length);
  } else if ('dropCheck' in mutant) {
    const c = coll(mutant.dropCheck.collection);
    const before = c.checks.length;
    c.checks = c.checks.filter((k) => k.field !== mutant.dropCheck.field);
    takesOut(before, c.checks.length);
  } else if ('dropWhenTargetGoes' in mutant) {
    const col = column(coll(mutant.dropWhenTargetGoes.collection), mutant.dropWhenTargetGoes.field);
    takesOut(col.whenTargetGoes ? 1 : 0, 0);
    delete col.whenTargetGoes;
  } else if ('dropOnlyWhile' in mutant) {
    const m = mutant.dropOnlyWhile;
    const c = coll(m.collection);
    const ow = c.onlyWhile ?? {};
    if ('neverDeleted' in m) {
      takesOut(ow.delete ? 1 : 0, 0);
      delete ow.delete;
    } else if ('neverEdited' in m) {
      takesOut(ow.update?.frozen.fields === '*' ? 1 : 0, 0);
      delete ow.update;
    } else {
      const fields = ow.update?.frozen.fields;
      const left = Array.isArray(fields) ? fields.filter((f) => f !== m.setOnce) : [];
      takesOut(Array.isArray(fields) ? fields.length : 0, left.length);
      if (left.length) ow.update = { frozen: { fields: left } };
      else delete ow.update;
    }
    if (ow.update || ow.delete) c.onlyWhile = ow;
    else delete c.onlyWhile;
  } else {
    const col = column(coll(mutant.linksAsList.collection), mutant.linksAsList.field);
    takesOut(col.type === 'Relation' ? 1 : 0, 0);
    col.kind = 'list';
    col.type = 'Array';
    delete col.targetClass;
  }
  return copy;
}

/** One `POST /admin/schema` body: a collection, its fields, rules and indexes, and what it is in words. */
export interface SchemaPush {
  action: 'createTable';
  table: string;
  description: string;
  columns: Array<Omit<WorldColumn, 'kind'>>;
  checks: WorldCheck[];
  indexes: WorldIndex[];
}

/**
 * The write (ONT-003 §3.4): the schema as the backend's own schema route takes it, one body per
 * collection, in the schema's order. Never SQL — the backend owns the engine, and the manager then
 * shows what was made. `kind` stays behind: the route stores a storage type, and the manager reads
 * the tile back from it and the collection's rules (`fieldKinds.ts` `kindOf`).
 */
export function schemaPushes(schema: WorldSchema): SchemaPush[] {
  return schema.collections.map((c) => ({
    action: 'createTable',
    table: c.name,
    description: c.description,
    columns: c.columns.map(({ kind, relation, ...col }) => (void kind, void relation, col)),
    checks: c.checks.map((k) => ({ field: k.field, oneOf: k.oneOf.slice() })),
    indexes: c.indexes.map((i) => ({ ...i, fields: i.fields.slice() }))
  }));
}

/** The schema as text: two-space JSON and a final newline, so two runs compare byte for byte. */
export function schemaText(schema: WorldSchema): string {
  return JSON.stringify(schema, null, 2) + '\n';
}
