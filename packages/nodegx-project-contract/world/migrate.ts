/**
 * P116 ONT-007 — the diff is the migration.
 *
 * Two days after launch the person changes one sentence ("some members are on two accounts").
 * With the world in files that is a diff; with the projection a function, the schema change is
 * derived; with claims, the migration is graded on data. This module is the pure half:
 *
 * - `diffWorld(before, after)` — what changed, sentence by sentence, in the person's words.
 *   Nouns and relations are matched by id. A changed word or sentence changes no schema; a
 *   changed id is a noun removed and another added — unless the new noun says which id it
 *   `was`: then it is the same noun renamed, and its records go with it (README §12: a rename
 *   is a diff, never a silent re-projection).
 * - `planMigration(before, after)` — the steps, in order: the backup, the schema route's own
 *   bodies (`POST /admin/schema`: createTable, addColumn, renameTable, renameColumn, setChecks,
 *   setIndexes, dropColumn, deleteTable — never SQL), and the data moves between them, each said in words. With it,
 *   the checks a dry run makes on the records before anything moves: a move the data cannot
 *   satisfy, and the values a drop would lose.
 *
 * Nothing here runs anything. `@noodl/backend-contract/conformance`'s `runMigration` reads the
 * plan as data and runs it through the schema surface and the data plane, the way `runClaim`
 * runs a claim. A change this module cannot migrate yet is refused in words, never guessed at.
 */
import type { Noun, Relation, VerbsFile, WorldFiles, WorldProperty } from './files';
import { plural } from './mutants';
import { checkFields, fieldName, projectWorld, type WorldCheck, type WorldCollection, type WorldColumn, type WorldIndex, type WorldOnlyWhile, type WorldSchema } from './project';
import { endField, functionRef } from './verb-project';
import { verbSubjects } from './verbs';

// ---------------------------------------------------------------------- the diff --

/** What a change is about: a noun, or a relation, by id. */
export type ChangeAbout = { noun: string } | { relation: string };

export type ChangeWhat =
  | 'noun-added'
  | 'noun-removed'
  /** The noun has a new id and says which it `was`: the same things, called something else. */
  | 'noun-renamed'
  /** The word or the sentence changed; the id, and so the schema, did not. */
  | 'noun-reworded'
  | 'noun-signs-in'
  /** P116 ONT-011 step 2: one of the noun's own answers (only one, called by, history, read aloud, secret, …) changed. */
  | 'noun-answered'
  | 'property-added'
  | 'property-removed'
  | 'property-changed'
  | 'relation-added'
  | 'relation-removed'
  | 'relation-reworded'
  /** The relation is another kind now: "a member is on one account" became "on several". */
  | 'relation-rekinded'
  /** It joins other things: `from` or `to` changed. */
  | 'relation-reattached'
  | 'relation-answered'
  /** An owned-by is reached through another chain: who may see its records changes, the schema does not (s14). */
  | 'relation-through';

export interface WorldChange {
  what: ChangeWhat;
  about: ChangeAbout;
  /** For a property: its name. For an answer: the question id. */
  detail?: string;
  /** The change in the person's words. */
  says: string;
}

const quoteWords = (s: string): string => `“${s}”`;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const byId = <T extends { id: string }>(xs: readonly T[]): Map<string, T> => new Map(xs.map((x) => [x.id, x]));
const shownAnswer = (v: string | boolean | undefined): string => (v === undefined ? 'unanswered' : v === true ? 'yes' : v === false ? 'no' : quoteWords(v));

function propertyChanges(about: ChangeAbout, owner: string, before: readonly WorldProperty[] = [], after: readonly WorldProperty[] = []): WorldChange[] {
  const out: WorldChange[] = [];
  const b = new Map(before.map((p) => [p.name, p]));
  const a = new Map(after.map((p) => [p.name, p]));
  for (const p of after)
    if (!b.has(p.name)) out.push({ what: 'property-added', about, detail: p.name, says: `${owner} now has ${article(p.name)} (${p.kind})` });
  for (const p of before) if (!a.has(p.name)) out.push({ what: 'property-removed', about, detail: p.name, says: `${owner} no longer has ${article(p.name)}` });
  for (const p of after) {
    const was = b.get(p.name);
    if (!was || same(was, p)) continue;
    const how = was.kind !== p.kind ? `is ${p.kind} now, not ${was.kind}` : !same(was.values, p.values) ? `is one of ${(p.values || []).join(', ')} now` : 'is said differently';
    out.push({ what: 'property-changed', about, detail: p.name, says: `${owner}'s ${p.name} ${how}` });
  }
  return out;
}

/**
 * What changed between two worlds, in the person's words: nouns, then relations, each in the
 * after world's order with what was removed last. Two worlds that say the same thing give `[]`.
 */
export function diffWorld(before: WorldFiles, after: WorldFiles): WorldChange[] {
  const out: WorldChange[] = [];
  const renames = nounRenames(before, after);
  const renamedFrom = new Map([...renames].map(([from, to]) => [to, from]));
  const bn = byId<Noun>(before.nouns.nouns);
  const an = byId<Noun>(after.nouns.nouns);
  for (const n of after.nouns.nouns) {
    const was = bn.get(renamedFrom.get(n.id) ?? n.id);
    const about = { noun: n.id };
    if (!was) {
      out.push({ what: 'noun-added', about, says: `there are ${plural(n.id)} now: ${quoteWords(n.sentence)}` });
      continue;
    }
    if (was.id !== n.id)
      out.push({ what: 'noun-renamed', about, detail: was.id, says: `${plural(was.id)} are ${plural(n.id)} now: every one is kept, under its new name` });
    if (was.name !== n.name || was.sentence !== n.sentence)
      out.push({ what: 'noun-reworded', about, says: was.name !== n.name ? `${article(was.name)} is called ${quoteWords(n.name)} now` : `${article(n.id)} is said differently: ${quoteWords(n.sentence)}` });
    if (Boolean(was.signsIn) !== Boolean(n.signsIn))
      out.push({ what: 'noun-signs-in', about, says: n.signsIn ? `${plural(n.id)} sign in now` : `${plural(n.id)} no longer sign in` });
    const wa = was.answers || {};
    const na = n.answers || {};
    for (const q of [...new Set([...Object.keys(wa), ...Object.keys(na)])].sort()) {
      if (wa[q] === na[q]) continue;
      out.push({ what: 'noun-answered', about, detail: q, says: `${plural(n.id)}: ${q} was ${shownAnswer(wa[q])}, is ${shownAnswer(na[q])} now` });
    }
    out.push(...propertyChanges(about, article(n.id), was.properties, n.properties));
  }
  for (const n of before.nouns.nouns) if (!an.has(n.id) && !renames.has(n.id)) out.push({ what: 'noun-removed', about: { noun: n.id }, says: `there are no ${plural(n.id)} any more` });

  // A relation is compared as it would read with the renamed nouns' new ids: a rename is not a re-attachment.
  const br = byId<Relation>(renameNouns(before, renames).relations.relations);
  const ar = byId<Relation>(after.relations.relations);
  for (const r of after.relations.relations) {
    const was = br.get(r.id);
    const about = { relation: r.id };
    if (!was) {
      out.push({ what: 'relation-added', about, says: `new: ${quoteWords(r.sentence)}` });
      continue;
    }
    if (was.sentence !== r.sentence) out.push({ what: 'relation-reworded', about, says: `${quoteWords(was.sentence)} is now ${quoteWords(r.sentence)}` });
    if (was.from !== r.from || !same(was.to, r.to) || was.property !== r.property)
      out.push({ what: 'relation-reattached', about, says: `'${r.id}' joins other things now: ${r.from} to ${JSON.stringify(r.to ?? r.property ?? null)}` });
    if (was.kind !== r.kind) {
      out.push({ what: 'relation-rekinded', about, says: `'${r.id}' was ${was.kind} and is ${r.kind} now: ${quoteWords(r.sentence)}` });
      continue; // the answers belong to the kind; a new kind's answers are new, not changed
    }
    const wa = was.answers || {};
    const na = r.answers || {};
    for (const q of [...new Set([...Object.keys(wa), ...Object.keys(na)])].sort()) {
      if (wa[q] === na[q]) continue;
      out.push({ what: 'relation-answered', about, detail: q, says: `'${r.id}': ${q} was ${shownAnswer(wa[q])}, is ${shownAnswer(na[q])} now` });
    }
    if (!same(was.through, r.through))
      out.push({
        what: 'relation-through',
        about,
        says: r.through
          ? `'${r.id}': whoever signs in reaches the ${r.to} through ${r.through.map((st) => st.relation).join(', then ') || 'nothing: they are it'} now`
          : `'${r.id}': nobody says through what any more`
      });
    out.push(...propertyChanges(about, `being on '${r.id}'`, was.properties, r.properties));
  }
  for (const r of before.relations.relations) if (!ar.has(r.id)) out.push({ what: 'relation-removed', about: { relation: r.id }, says: `no longer said: ${quoteWords(r.sentence)}` });
  return out;
}

/**
 * The nouns renamed between two worlds, old id → new id: a noun of the after world whose id the
 * world before does not have, and whose `was` it does (and no longer does after). A `was` that
 * names nothing before is history from an earlier rename and changes nothing.
 */
export function nounRenames(before: WorldFiles, after: WorldFiles): Map<string, string> {
  const had = new Set(before.nouns.nouns.map((n) => n.id));
  const has = new Set(after.nouns.nouns.map((n) => n.id));
  const out = new Map<string, string>();
  for (const n of after.nouns.nouns) if (n.was && !had.has(n.id) && had.has(n.was) && !has.has(n.was) && !out.has(n.was)) out.set(n.was, n.id);
  return out;
}

/** The world as it would read with these nouns' ids changed, and nothing else. */
function renameNouns(world: WorldFiles, renames: ReadonlyMap<string, string>): WorldFiles {
  if (!renames.size) return world;
  const to = (id: string): string => renames.get(id) ?? id;
  const out: WorldFiles = JSON.parse(JSON.stringify(world));
  for (const n of out.nouns.nouns) n.id = to(n.id);
  for (const r of out.relations.relations) {
    r.from = to(r.from);
    if (typeof r.to === 'string') r.to = to(r.to);
    else if (Array.isArray(r.to)) r.to = r.to.map(to);
  }
  return out;
}

// ---------------------------------------------------------------------- the plan --

/** One `POST /admin/schema` body, as the route takes it. */
export type SchemaBody =
  | { action: 'createTable'; table: string; description: string; columns: Array<Omit<WorldColumn, 'kind' | 'relation'>> }
  | { action: 'addColumn'; table: string; column: Omit<WorldColumn, 'kind' | 'relation'> }
  | { action: 'renameTable'; table: string; newName: string }
  | { action: 'renameColumn'; table: string; oldName: string; newName: string }
  /** s11: the words on a kept collection, and on its kept fields whose words changed (`null`: none now). */
  | { action: 'describeTable'; table: string; description: string; columns: Record<string, string | null> }
  /** R10: a changed answer to "when what it points at goes", per link (null takes the rule away). */
  | { action: 'setWhenTargetGoes'; table: string; columns: Record<string, NonNullable<WorldColumn['whenTargetGoes']> | null> }
  /**
   * ONT-015 §3.3: a series put on a field records already have (null takes it off). The store numbers
   * the ones holding none, in the order they were made, above the highest number held; the dry run
   * counts them.
   */
  | { action: 'setSeries'; table: string; columns: Record<string, NonNullable<WorldColumn['series']> | null> }
  | { action: 'setChecks'; table: string; checks: WorldCheck[] }
  | { action: 'setIndexes'; table: string; indexes: WorldIndex[] }
  | { action: 'dropColumn'; table: string; column: string }
  | { action: 'deleteTable'; table: string };

/**
 * A data move, said as data. Collections and fields are the schema's names; every link is a
 * Pointer, read and written as one.
 */
export type DataMove =
  /** For every `from` row whose `field` points somewhere, one `record` row: `fromField` → the row, `toField` → where it pointed. */
  | { linkToRecord: { from: string; field: string; record: string; fromField: string; toField: string } }
  /** For every `record` row, its `into` row (by `fromField`) gets `field` → the record's `toField`. One record per `into` row at most. */
  | { recordToLink: { record: string; fromField: string; toField: string; into: string; field: string } }
  /** Across a one-each link (`extends`): every `from` row's `field` is written onto the row its `link` points at, or (`back`) read from it. */
  | { fieldAcross: { from: string; link: string; field: string; to: string; back?: true } };

export type MigrationStep =
  | { backup: true; says: string }
  | { schema: SchemaBody; says: string }
  | { move: DataMove; says: string }
  /**
   * P116 ONT-014: a collection's rules on records' old values (set once, never edited, never
   * deleted) as the world says them now; `null` = none. The backend's route writes them into
   * `security.json` — the world's half of `onlyWhile` (`frozen`, `delete: "never"`). ONT-011 step 4:
   * and who reads one field (`fields`, a secret detail), with what the world said before (`wasFields`).
   */
  | {
      rules: {
        collection: string;
        onlyWhile: WorldOnlyWhile | null;
        was?: WorldOnlyWhile | null;
        fields?: WorldCollection['fields'] | null;
        wasFields?: WorldCollection['fields'] | null;
      };
      says: string;
    };

/** What a dry run reads off the records before anything moves. A failed `refuse` stops the migration; a `loses` is shown and must be accepted. */
export type MigrationCheck =
  /** Refused when any value of `by` occurs on more than one `record` row. */
  | { refuse: 'more-than-one'; record: string; by: string; says: string }
  /** Refused when any `collection` row has no `record` row pointing at it through `by` (the link it gets will be required). */
  | { refuse: 'none'; collection: string; record: string; by: string; says: string }
  /** Refused when the collection has any rows: a field they would all need, with nothing to fill it. */
  | { refuse: 'rows'; collection: string; says: string }
  /** Refused when any `collection` row holds a `field` value outside `values`: the list the rule would put on it (s9). */
  | { refuse: 'outside-list'; collection: string; field: string; values: string[]; says: string }
  /** Refused when two `collection` rows share the same `fields`: the unique rule would not build (s9). */
  | { refuse: 'duplicates'; collection: string; fields: string[]; says: string }
  /** Counts the values a drop would lose; the run asks for them to be accepted. */
  | { loses: 'values'; collection: string; field: string; says: string }
  | { loses: 'rows'; collection: string; says: string };

export interface ReachRow {
  /** The collection, as stored. */
  collection: string;
  /** What it is, in the person's words: the noun, or the relation's own records. */
  words: string;
  /** Fields added, dropped, renamed (by the name they had) or whose rules change. Empty when the whole collection is new or goes. */
  fields: string[];
  how: 'made' | 'changed' | 'renamed' | 'removed';
  /** For a renamed collection: the name it had, which every component and rule written before still uses. */
  was?: string;
  /** Fields renamed, by the name they had → the name they have now (s9: what a rule or a wire that names the old one must say instead). */
  renamed?: Record<string, string>;
}

export interface MigrationPlan {
  changes: WorldChange[];
  /** Where the schema changes, collection by collection — the start of the reach (§3.2). */
  reach: ReachRow[];
  steps: MigrationStep[];
  checks: MigrationCheck[];
  /**
   * Claims of the after schema the migrated records will not keep: a rule the schema route
   * cannot put on a field once rows exist. Measured, not assumed — the grade runs them and
   * each must fail at the step that says its rule.
   */
  notKept: Array<{ claim: string; why: string }>;
  /** Changes this module cannot migrate yet, in words. A plan with any is refused whole. */
  refused: string[];
  before: WorldSchema;
  after: WorldSchema;
}

export type MigrationPlanResult = { ok: true; plan: MigrationPlan } | { ok: false; problems: string[] };

const wordsOf = (c: WorldCollection): string => ('noun' in c.made ? plural(c.made.noun) : `'${c.made.relation}' records`);
const oneOf = (c: WorldCollection): string => ('noun' in c.made ? c.made.noun : `'${c.made.relation}' record`);
const pushable = ({ kind, relation, ...col }: WorldColumn): Omit<WorldColumn, 'kind' | 'relation'> => (void kind, void relation, { ...col });
/** "an account", "a user", "an update": a `u` sounds like "you" when a consonant and a vowel follow it. */
const article = (word: string): string => (/^[aeio]/i.test(word) || (/^u/i.test(word) && !/^u[^aeiou][aeiou]/i.test(word)) ? 'an ' : 'a ') + word;
/** The column without its required rule: added over rows a move fills one by one. */
const optional = (col: WorldColumn): Omit<WorldColumn, 'kind' | 'relation'> => {
  const out = pushable(col);
  delete out.required;
  return out;
};
/** R10: what a link's rule does now, said in a migration step: "when the Account a person's account points at goes, the person goes too". */
function goesNow(holder: string, col: WorldColumn): string {
  const when = `when the ${col.targetClass} ${article(holder)}'s ${col.name} points at goes`;
  if (col.whenTargetGoes === 'goes-too') return `${when}, the ${holder} goes too`;
  if (col.whenTargetGoes === 'stays-unlinked') return `${when}, the ${holder} stays, without one`;
  if (col.whenTargetGoes === 'blocks') return `the ${col.targetClass} cannot go while ${article(holder)}'s ${col.name} points at it`;
  return `${when}, nothing is said about the ${holder} any more`;
}
const columnShape = (c: WorldColumn): string => JSON.stringify([c.type, c.targetClass ?? null, Boolean(c.required)]);
/** A field as the person picked it: "a required link to Account", "a list". */
const columnWords = (c: WorldColumn): string => `${c.required ? `a required ${c.kind}` : article(c.kind)}${c.targetClass ? ` to ${c.targetClass}` : ''}`;
const sortedText = (xs: readonly unknown[]): string => JSON.stringify(xs.map((x) => JSON.stringify(x)).sort());

/** The Pointer a relation made on a noun's collection, in a schema. */
function linkOf(schema: WorldSchema, relation: string): { collection: WorldCollection; column: WorldColumn } | undefined {
  for (const c of schema.collections) {
    if (!('noun' in c.made)) continue;
    const column = c.columns.find((x) => x.relation === relation && x.type === 'Pointer');
    if (column) return { collection: c, column };
  }
  return undefined;
}
/** The record of its own a relation became, in a schema, with its two links. */
function recordOf(schema: WorldSchema, relation: string): WorldCollection | undefined {
  return schema.collections.find((c) => 'relation' in c.made && c.made.relation === relation);
}

/**
 * The migration from one world to the next, or the sentences that say why there is none.
 *
 * A move is derived for the one change of kind the corpus has lived (the bombshell): a link on
 * a record becoming a record of its own (`belongs-to` → `is-on`), and back. Any other change of
 * kind, or a field whose type, target or required-ness changes in place, is refused in words —
 * the plan is a list of things this module can grade, not a hope.
 */
export function planMigration(before: WorldFiles, after: WorldFiles): MigrationPlanResult {
  const pb = projectWorld(before);
  if (pb.ok === false) return { ok: false, problems: pb.problems.map((p) => `the world before: ${p}`) };
  const pa = projectWorld(after);
  if (pa.ok === false) return { ok: false, problems: pa.problems.map((p) => `the world after: ${p}`) };
  const renames = nounRenames(before, after);
  const renamed = renameNouns(before, renames);
  const pr = renames.size ? projectWorld(renamed) : pb;
  if (pr.ok === false) return { ok: false, problems: pr.problems.map((p) => `the world before, renamed: ${p}`) };

  // The renames first, on the old schema: the rest of the plan reads the world before as if it
  // had always used the new ids.
  const r = renameSteps(pb.schema, pr.schema, renames);
  const rest = planBetween(renamed, after, pr.schema, pa.schema);
  const [backup, ...steps] = rest.steps;
  return {
    ok: true,
    plan: {
      ...rest,
      changes: diffWorld(before, after),
      reach: mergeReach([...r.reach, ...rest.reach]),
      steps: [backup, ...r.steps, ...steps],
      refused: [...r.refused, ...rest.refused],
      before: pb.schema
    }
  };
}

/**
 * The steps that carry the records of renamed nouns to their new names: the tables (and with
 * them every link that points at them), then the fields named after a noun. Whatever is built
 * under an old name — a check, a unique rule — is taken off before and put back after, because
 * the adapter refuses to rename under it (`TABLE_IN_USE`) and a field rename would leave the
 * declaration naming a field that is gone.
 */
function renameSteps(old: WorldSchema, renamed: WorldSchema, renames: ReadonlyMap<string, string>): { steps: MigrationStep[]; reach: ReachRow[]; refused: string[] } {
  const steps: MigrationStep[] = [];
  const reach: ReachRow[] = [];
  const refused: string[] = [];
  if (!renames.size) return { steps, reach, refused };
  const counterpart = (c: WorldCollection): WorldCollection | undefined =>
    renamed.collections.find((x) => ('noun' in c.made && 'noun' in x.made ? x.made.noun === (renames.get(c.made.noun) ?? c.made.noun) : 'relation' in c.made && 'relation' in x.made && x.made.relation === c.made.relation));
  const off: MigrationStep[] = [];
  const tables: MigrationStep[] = [];
  const columns: MigrationStep[] = [];
  const on: MigrationStep[] = [];
  for (const c of old.collections) {
    const n = counterpart(c);
    if (!n) {
      refused.push(`${wordsOf(c)} have no place in the world renamed: the rename changes more than names.`);
      continue;
    }
    const sameShape = c.columns.length === n.columns.length && c.columns.every((col, i) => col.kind === n.columns[i].kind && col.relation === n.columns[i].relation);
    if (!sameShape) {
      refused.push(`${wordsOf(c)}'s fields do not line up with ${wordsOf(n)}'s: the rename changes more than names.`);
      continue;
    }
    const fields = c.columns.map((col, i) => [col.name, n.columns[i].name] as const).filter(([a, b]) => a !== b);
    if (c.name === n.name && !fields.length) continue;
    // A rule comes off only when the rename reaches it: the table it is built under, or a field it reads.
    const moved = new Set(fields.map(([from]) => from));
    const tableMoves = c.name !== n.name;
    const checksMove = c.checks.length > 0 && (tableMoves || c.checks.some((k) => checkFields(k).some((f) => moved.has(f))));
    const indexesMove = c.indexes.length > 0 && (tableMoves || c.indexes.some((i) => [...i.fields, ...Object.keys(i.where || {})].some((f) => moved.has(f))));
    if (checksMove) off.push({ schema: { action: 'setChecks', table: c.name, checks: [] }, says: `take the lists ${wordsOf(c)} keep off while they are renamed` });
    if (indexesMove) off.push({ schema: { action: 'setIndexes', table: c.name, indexes: [] }, says: `take the unique rules ${wordsOf(c)} keep off while they are renamed` });
    if (tableMoves)
      tables.push({ schema: { action: 'renameTable', table: c.name, newName: n.name }, says: `call the ${c.name} records ${n.name} now, every one kept, and every link to them with them` });
    for (const [from, to] of fields) columns.push({ schema: { action: 'renameColumn', table: n.name, oldName: from, newName: to }, says: `call ${article(oneOf(n))}'s ${from} its ${to} now` });
    if (checksMove) on.push({ schema: { action: 'setChecks', table: n.name, checks: n.checks }, says: `put the lists ${wordsOf(n)} keep back` });
    if (indexesMove) on.push({ schema: { action: 'setIndexes', table: n.name, indexes: n.indexes }, says: `put the unique rules ${wordsOf(n)} keep back` });
    reach.push({
      collection: n.name,
      words: wordsOf(n),
      fields: fields.map(([from]) => from),
      how: c.name !== n.name ? 'renamed' : 'changed',
      ...(c.name !== n.name ? { was: c.name } : {}),
      ...(fields.length ? { renamed: Object.fromEntries(fields) } : {})
    });
  }
  return { steps: [...off, ...tables, ...columns, ...on], reach, refused };
}

/** One row per collection: fields together, a rename kept. */
function mergeReach(rows: ReachRow[]): ReachRow[] {
  const out = new Map<string, ReachRow>();
  for (const r of rows) {
    const had = out.get(r.collection);
    if (!had) out.set(r.collection, { ...r, fields: [...r.fields] });
    else
      out.set(r.collection, {
        ...had,
        fields: [...new Set([...had.fields, ...r.fields])],
        how: had.how === 'renamed' || r.how === 'renamed' ? 'renamed' : had.how,
        ...(had.was || r.was ? { was: had.was || r.was } : {}),
        ...(had.renamed || r.renamed ? { renamed: { ...had.renamed, ...r.renamed } } : {})
      });
  }
  return [...out.values()];
}

/** The plan between two worlds that use the same ids: everything but a rename. */
function planBetween(before: WorldFiles, after: WorldFiles, sb: WorldSchema, sa: WorldSchema): MigrationPlan {
  const changes = diffWorld(before, after);

  const refused: string[] = [];
  const checks: MigrationCheck[] = [];
  const notKept: MigrationPlan['notKept'] = [];
  const moves: Array<{ move: DataMove; says: string }> = [];
  /** `collection.field` a move reads, so dropping it after loses nothing. */
  const carried = new Set<string>();
  /** `collection.field` a move fills, so it is added without `required` and the rule is not kept. */
  const filled = new Set<string>();
  /** Collections a move empties into another, so deleting them after loses no rows. */
  const emptied = new Set<string>();
  /** Relations already refused: what their fields do is the same refusal, not another. */
  const refusedRelations = new Set<string>();

  // 1. The changes of kind, as data moves.
  const rb = byId<Relation>(before.relations.relations);
  for (const r of after.relations.relations) {
    const was = rb.get(r.id);
    if (!was || was.kind === r.kind) continue;
    const link = linkOf(sb, r.id);
    const record = recordOf(sa, r.id);
    const backLink = linkOf(sa, r.id);
    const backRecord = recordOf(sb, r.id);
    if (link && record && !backLink) {
      // A link on the record becomes a record of its own: every link that points somewhere makes one.
      const fromField = record.columns.find((c) => c.relation === r.id && c.targetClass === link.collection.name);
      const toField = record.columns.find((c) => c.relation === r.id && c.targetClass === link.column.targetClass && c !== fromField);
      const needs = record.columns.filter((c) => c.required && c !== fromField && c !== toField);
      if (!fromField || !toField) {
        refused.push(`'${r.id}' became ${r.kind}, and its records do not link both ${link.collection.name} and ${link.column.targetClass}: there is nowhere to move the link to.`);
        continue;
      }
      if (needs.length) {
        refused.push(`a '${r.id}' record must have a ${needs.map((c) => c.name).join(' and ')}, and nothing says what the existing links' ${needs.length === 1 ? 'is' : 'are'}.`);
        continue;
      }
      const from = link.collection;
      moves.push({
        move: { linkToRecord: { from: from.name, field: link.column.name, record: record.name, fromField: fromField.name, toField: toField.name } },
        says: `every ${oneOf(from)}'s ${link.column.name} becomes their first '${r.id}' record` +
          (record.columns.some((c) => !c.required && c !== fromField && c !== toField)
            ? `; its ${record.columns.filter((c) => !c.required && c !== fromField && c !== toField).map((c) => c.name).join(', ')} left empty, because nobody said what they were`
            : '')
      });
      carried.add(`${from.name}.${link.column.name}`);
    } else if (backRecord && backLink && !link) {
      // A record of its own becomes a link on the record: one record per row at most.
      const into = backLink.collection;
      const fromField = backRecord.columns.find((c) => c.relation === r.id && c.targetClass === into.name);
      const toField = backRecord.columns.find((c) => c.relation === r.id && c.targetClass === backLink.column.targetClass && c !== fromField);
      if (!fromField || !toField) {
        refused.push(`'${r.id}' became ${r.kind}, and its records do not link both ${into.name} and ${backLink.column.targetClass}: there is nothing to read the link from.`);
        continue;
      }
      checks.push({
        refuse: 'more-than-one',
        record: backRecord.name,
        by: fromField.name,
        says: `${article(oneOf(into))} on more than one ${backLink.column.name} cannot keep just one without losing the others`
      });
      if (backLink.column.required)
        checks.push({ refuse: 'none', collection: into.name, record: backRecord.name, by: fromField.name, says: `every ${oneOf(into)} must have ${article(backLink.column.name)}, and some are on none` });
      moves.push({
        move: { recordToLink: { record: backRecord.name, fromField: fromField.name, toField: toField.name, into: into.name, field: backLink.column.name } },
        says: `every ${oneOf(into)}'s one '${r.id}' record becomes their ${backLink.column.name}`
      });
      filled.add(`${into.name}.${backLink.column.name}`);
      emptied.add(backRecord.name);
      for (const c of backRecord.columns)
        if (c !== fromField && c !== toField) checks.push({ loses: 'values', collection: backRecord.name, field: c.name, says: `the ${c.name} of each '${r.id}' record` });
    } else {
      refused.push(`'${r.id}' changing from ${was.kind} to ${r.kind} is not migrated yet: only a link becoming a record of its own, and back, is.`);
      refusedRelations.add(r.id);
    }
  }

  // 1b. A field moved across an `extends` link, either way: the value goes with it, record by
  //     record, instead of being lost from one side and empty on the other (`filter-field-split-off`:
  //     "too late to move once users have profiles"). A field put on the other side while this
  //     side keeps it is a copy nothing keeps the same (`sort-key-copied`), and is refused.
  const nb = byId<Noun>(before.nouns.nouns);
  const na = byId<Noun>(after.nouns.nouns);
  for (const r of after.relations.relations) {
    const was = rb.get(r.id);
    if (!was || was.kind !== 'extends' || r.kind !== 'extends' || typeof r.to !== 'string' || was.from !== r.from || was.to !== r.to) continue;
    const link = linkOf(sa, r.id);
    if (!link) continue;
    const ends: Array<{ side: string; other: string; back: boolean }> = [
      { side: r.from, other: r.to, back: false },
      { side: r.to, other: r.from, back: true }
    ];
    for (const { side, other, back } of ends) {
      const had = new Map((nb.get(side)?.properties || []).map((p) => [p.name, p]));
      const has = new Set((na.get(side)?.properties || []).map((p) => p.name));
      const otherHad = new Set((nb.get(other)?.properties || []).map((p) => p.name));
      for (const p of na.get(other)?.properties || []) {
        const from = had.get(p.name);
        if (!from || otherHad.has(p.name)) continue;
        const name = fieldName(p.name);
        const sideColl = sa.collections.find((c) => 'noun' in c.made && c.made.noun === side)!;
        if (has.has(p.name)) {
          refused.push(
            `${article(other)} would hold a copy of its ${side}'s ${p.name}, and nothing keeps the two the same: move it (take it off the ${side} in the same change), or keep it on the ${side} and sort ${plural(other)} through the link.`
          );
          continue;
        }
        if (from.kind !== p.kind) continue; // a change of tile as well as of place: the schema step refuses it below
        moves.push({
          move: back
            ? { fieldAcross: { from: link.collection.name, link: link.column.name, field: name, to: link.column.targetClass!, back: true } }
            : { fieldAcross: { from: link.collection.name, link: link.column.name, field: name, to: link.column.targetClass! } },
          says: back ? `every ${r.from} takes its ${r.to}'s ${p.name}` : `every ${r.to} takes its ${r.from}'s ${p.name}`
        });
        carried.add(`${sideColl.name}.${name}`);
      }
    }
  }

  // 2. The schema, collection by collection.
  const reach: ReachRow[] = [];
  const created: MigrationStep[] = [];
  const added: MigrationStep[] = [];
  /** ONT-015: series put on (or taken off) a kept collection's fields — after the fields are there. */
  const numbered: MigrationStep[] = [];
  const rules: MigrationStep[] = [];
  const described: MigrationStep[] = [];
  const dropped: MigrationStep[] = [];
  const deleted: MigrationStep[] = [];
  const ba = new Map(sb.collections.map((c) => [c.name, c]));
  const aa = new Map(sa.collections.map((c) => [c.name, c]));

  for (const c of sa.collections) {
    const was = ba.get(c.name);
    if (!was) {
      created.push({ schema: { action: 'createTable', table: c.name, description: c.description, columns: c.columns.map(pushable) }, says: `make a place for ${wordsOf(c)}` });
      if (c.checks.length) rules.push({ schema: { action: 'setChecks', table: c.name, checks: c.checks }, says: `${wordsOf(c)} keep: ${c.checks.map((k) => ('allOrNone' in k ? `${k.allOrNone.join(' and ')} are both set or both empty` : `${k.field} is one of its list`)).join('; ')}` });
      if (c.indexes.length) rules.push({ schema: { action: 'setIndexes', table: c.name, indexes: c.indexes }, says: `${wordsOf(c)} keep: no two share ${c.indexes.map((i) => i.fields.join(' and ')).join('; ')}` });
      reach.push({ collection: c.name, words: wordsOf(c), fields: [], how: 'made' });
      continue;
    }
    const fields = new Set<string>();
    for (const col of c.columns) {
      const old = was.columns.find((x) => x.name === col.name);
      if (!old) {
        const key = `${c.name}.${col.name}`;
        if (filled.has(key) && col.required) {
          added.push({ schema: { action: 'addColumn', table: c.name, column: optional(col) }, says: `give every ${oneOf(c)} ${article(col.name)}, filled by the move below` });
          const claim = sa.claims.find((x) => x.mutant && 'dropRequired' in x.mutant && x.mutant.dropRequired.collection === c.name && x.mutant.dropRequired.field === col.name);
          if (claim) notKept.push({ claim: claim.id, why: `the schema route cannot make a field required once records exist, except by filling every one with the same value; the ${col.name} is filled record by record instead, and new ${wordsOf(c)} are not made to have one` });
        } else if (col.series) {
          // ONT-015 (AC3): the field first, then the series — which numbers the records already there.
          const { series: _series, ...plain } = pushable(col);
          void _series;
          added.push({ schema: { action: 'addColumn', table: c.name, column: plain }, says: `give every ${oneOf(c)} ${article(col.name)}` });
        } else {
          added.push({ schema: { action: 'addColumn', table: c.name, column: pushable(col) }, says: `give every ${oneOf(c)} ${article(col.name)}` });
          if (col.required && !filled.has(key)) checks.push({ refuse: 'rows', collection: c.name, says: `every ${oneOf(c)} must have ${article(col.name)}, and the ones already there have none` });
        }
        fields.add(col.name);
      } else if (columnShape(old) !== columnShape(col)) {
        if (!refusedRelations.has(col.relation || '') && !refusedRelations.has(old.relation || ''))
          refused.push(`${article(oneOf(c))}'s ${col.name} changing from ${columnWords(old)} to ${columnWords(col)} in place is not migrated yet.`);
        fields.add(col.name);
      }
    }
    for (const old of was.columns) {
      if (c.columns.some((x) => x.name === old.name)) continue;
      dropped.push({ schema: { action: 'dropColumn', table: c.name, column: old.name }, says: `take the ${old.name} off ${wordsOf(c)}` });
      if (!carried.has(`${c.name}.${old.name}`)) checks.push({ loses: 'values', collection: c.name, field: old.name, says: `the ${old.name} of each ${oneOf(c)}` });
      fields.add(old.name);
    }
    // ONT-015 §3.3: a number the store hands out, put on a field (new or kept) or taken off one.
    const series: Record<string, NonNullable<WorldColumn['series']> | null> = {};
    for (const col of c.columns) {
      const old = was.columns.find((x) => x.name === col.name);
      if (JSON.stringify(old?.series ?? null) !== JSON.stringify(col.series ?? null)) series[col.name] = col.series ?? null;
    }
    if (Object.keys(series).length) {
      const put = Object.keys(series).filter((f) => series[f]);
      const off = Object.keys(series).filter((f) => !series[f]);
      numbered.push({
        schema: { action: 'setSeries', table: c.name, columns: series },
        says: [
          ...put.map((f) => `hand out each new ${oneOf(c)}'s ${f} as ${series[f]!.format}, and number every ${oneOf(c)} that has none, in the order they were made, after the highest one already held`),
          ...off.map((f) => `stop handing out ${wordsOf(c)}' ${f}; the ones given stay`)
        ].join('; ')
      });
      for (const f of Object.keys(series)) fields.add(f);
    }
    if (sortedText(was.checks) !== sortedText(c.checks)) {
      rules.push({ schema: { action: 'setChecks', table: c.name, checks: c.checks }, says: `${wordsOf(c)} keep the lists said now` });
      for (const k of [...was.checks, ...c.checks]) for (const f of checkFields(k)) fields.add(f);
      // A list put on a field the records already hold (s9): the route refuses it when any row is outside the
      // list, after the backup and every step before it. The dry run reads those rows first.
      const had = new Set(was.checks.filter((k) => 'oneOf' in k).map((k) => JSON.stringify([checkFields(k)[0], [...(k as { oneOf: string[] }).oneOf].sort()])));
      for (const k of c.checks) {
        if (!('oneOf' in k)) continue; // ONT-011 step 2: an all-or-none check on rows that break it is a refusal the route makes, not read ahead here yet
        if (had.has(JSON.stringify([k.field, [...k.oneOf].sort()])) || !was.columns.some((x) => x.name === k.field)) continue;
        checks.push({ refuse: 'outside-list', collection: c.name, field: k.field, values: [...k.oneOf], says: `${article(oneOf(c))} whose ${k.field} is not one of ${k.oneOf.join(', ')} cannot keep it` });
      }
    }
    if (sortedText(was.indexes) !== sortedText(c.indexes)) {
      rules.push({ schema: { action: 'setIndexes', table: c.name, indexes: c.indexes }, says: `${wordsOf(c)} keep the unique rules said now` });
      for (const i of [...was.indexes, ...c.indexes]) for (const f of i.fields) fields.add(f);
      // A unique rule put over records that share a value (s9): the same refusal, read first.
      const had = new Set(was.indexes.filter((i) => i.unique).map((i) => JSON.stringify([i.fields, i.where ?? null])));
      for (const i of c.indexes) {
        if (!i.unique || had.has(JSON.stringify([i.fields, i.where ?? null])) || !i.fields.every((f) => was.columns.some((x) => x.name === f))) continue;
        checks.push({ refuse: 'duplicates', collection: c.name, fields: [...i.fields], says: `two ${wordsOf(c)} that share ${i.fields.join(' and ')} cannot both keep it` });
      }
    }
    // R10: a changed answer to "when what it points at goes" on a link that is otherwise the same. The
    // backend keeps it at delete time, so it is a step of its own — without one the old rule would
    // go on deleting (or blocking) as the person no longer says. Nothing a record holds moves: no
    // check, no reach row.
    const goes: Record<string, NonNullable<WorldColumn['whenTargetGoes']> | null> = {};
    for (const col of c.columns) {
      const old = was.columns.find((x) => x.name === col.name);
      if (old && columnShape(old) === columnShape(col) && (old.whenTargetGoes ?? null) !== (col.whenTargetGoes ?? null)) goes[col.name] = col.whenTargetGoes ?? null;
    }
    if (Object.keys(goes).length)
      rules.push({
        schema: { action: 'setWhenTargetGoes', table: c.name, columns: goes },
        says: c.columns
          .filter((col) => col.name in goes)
          .map((col) => goesNow(oneOf(c), col))
          .join('; ')
      });
    // s11 (§6.9 #5): a changed answer that changes only what the store does not keep changes only the words
    // — the collection's, or a kept field's. Said again by a step of its own, or the Schema card keeps the old
    // sentence. No reach row: nothing a component, a rule or a verb reads has moved.
    const columns: Record<string, string | null> = {};
    for (const col of c.columns) {
      const old = was.columns.find((x) => x.name === col.name);
      if (old && (old.description ?? null) !== (col.description ?? null)) columns[col.name] = col.description ?? null;
    }
    if ((was.description ?? '') !== (c.description ?? '') || Object.keys(columns).length)
      described.push({ schema: { action: 'describeTable', table: c.name, description: c.description, columns }, says: `say what ${wordsOf(c)} are in the words said now` });
    if (fields.size) reach.push({ collection: c.name, words: wordsOf(c), fields: [...fields], how: 'changed' });
  }
  for (const c of sb.collections) {
    if (aa.has(c.name)) continue;
    // Its rules first: the route refuses to drop what an index or a check still reads.
    deleted.push({ schema: { action: 'deleteTable', table: c.name }, says: `${wordsOf(c)} are no longer kept` });
    if (!emptied.has(c.name)) checks.push({ loses: 'rows', collection: c.name, says: `every ${oneOf(c)}` });
    reach.push({ collection: c.name, words: wordsOf(c), fields: [], how: 'removed' });
  }

  // ONT-014: what the backend keeps inside a person's write. Last: no data move is a person's write.
  const kept: MigrationStep[] = [];
  for (const c of sa.collections) {
    const old = sb.collections.find((x) => x.name === c.name);
    const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (same(old?.onlyWhile, c.onlyWhile) && same(old?.fields, c.fields)) continue;
    // `was` (s18): what the world said before, so the route can tell its own earlier writing from a rule a
    // person wrote by hand on the same collection, and keep the hand one or say it would be lost. The
    // fields (ONT-011 step 4) ride the same step, with their own `wasFields`.
    // A world with no secret on either side says nothing about the fields: the step is the one s18 wrote.
    const fields = c.fields || old?.fields ? { fields: c.fields ?? null, wasFields: old?.fields ?? null } : {};
    kept.push({ rules: { collection: c.name, onlyWhile: c.onlyWhile ?? null, was: old?.onlyWhile ?? null, ...fields }, says: keptWords(c, old) });
  }

  // A dropped field an index or a check on a surviving collection reads goes after the rule changes.
  const steps: MigrationStep[] = [
    { backup: true, says: 'take a backup of everything first, so any of this can be undone' },
    ...created,
    ...added,
    ...numbered,
    ...moves,
    ...rules,
    ...described,
    ...dropped,
    ...deleted,
    ...kept
  ];
  return { changes, reach, steps, checks, notKept, refused, before: sb, after: sa };
}

/** ONT-014 — a `rules` step in words: what nobody but the backend's own key may do to these records now. */
function keptWords(c: WorldCollection, was?: WorldCollection): string {
  const ow = c.onlyWhile;
  const secret = Object.keys(c.fields ?? {});
  const isAre = (fields: string[]): string => `${fields.join(', ')} ${fields.length > 1 ? 'are' : 'is'}`;
  // ONT-011 step 4: a detail no longer secret is said going, or the step reads as if nothing about it changed.
  const opened = Object.keys(was?.fields ?? {}).filter((f) => !secret.includes(f));
  const openedWords = opened.length ? `${isAre(opened)} read by whoever reads one again` : '';
  if (!ow && !secret.length) return `${wordsOf(c)} keep no rule on what they were${openedWords ? `; ${openedWords}` : ''}`;
  const parts: string[] = [];
  const frozen = ow?.update?.frozen?.fields;
  const unless = ow?.update?.frozen?.unless ? ' once it is agreed' : '';
  const except = ow?.update?.except?.length ? ` but ${ow.update.except.join(', ')}` : '';
  if (frozen === '*') parts.push(unless ? `nothing on one changes${unless}${except}` : 'nobody edits one once it is made');
  else if (frozen) parts.push(`${frozen.join(', ')} ${frozen.length > 1 ? 'are' : 'is'} set once`);
  for (const [field, byOld] of Object.entries(ow?.update?.moves ?? {})) parts.push(`${field} moves ${Object.entries(byOld).map(([old, m]) => `from ${old} to ${m.to.length ? m.to.join(' or ') : 'nowhere'}`).join(', ')}`);
  if (ow?.delete === 'never') parts.push('nobody deletes one');
  else if (ow?.delete) parts.push('an agreed one is never deleted');
  if (secret.length) parts.push(`${isAre(secret)} read by nobody but the backend's own key`);
  if (openedWords) parts.push(openedWords);
  return `keep, for ${wordsOf(c)}: ${parts.join('; ')}`;
}

/** The plan as a person reads it: what changed, what it reaches, then each step. */
export function migrationWords(plan: MigrationPlan): string[] {
  const out = plan.changes.map((c) => `Changed: ${c.says}.`);
  for (const r of plan.reach) out.push(`Reaches ${r.words} (${r.collection}${r.was ? `, was ${r.was}` : ''}): ${r.how}${r.fields.length ? ` — ${r.fields.join(', ')}` : ''}.`);
  for (const r of plan.refused) out.push(`Cannot: ${r}`);
  plan.steps.forEach((s, i) => out.push(`${i + 1}. ${s.says.charAt(0).toUpperCase()}${s.says.slice(1)}.`));
  for (const c of plan.checks) out.push(`${'refuse' in c ? 'Stops if' : 'Would lose'}: ${c.says}.`);
  for (const n of plan.notKept) out.push(`Not kept after: ${n.claim} — ${n.why}.`);
  return out;
}

// ------------------------------------------------------------ the components --

/** One component of the project as its v2 files hold it: `component.json`'s path, `nodes.json`, `connections.json`. */
export interface ComponentGraph {
  /** `component.json` `path` (or its name): how the person finds it in the editor. */
  path: string;
  nodes: ReadonlyArray<{ id: string; type: string; label?: string; parameters?: Record<string, unknown> }>;
  /** Both ends: a Record node's `prop-<field>` ports are OUTPUTS as well as inputs (s9 — a form filled from a record reads them). */
  connections?: ReadonlyArray<{ fromId?: string; fromProperty?: string; toId: string; toProperty: string }>;
}

export interface ComponentReachRow {
  component: string;
  /** The record node, by its label when it has one. */
  node: string;
  collection: string;
  /** Changed fields the node reads or writes: a `prop-<field>` port wired (in or out), or a filter rule on it. Empty when it only names the collection. */
  fields: string[];
}

/**
 * The components a plan reaches (§3.2): every node whose `collectionName` names a collection the
 * plan makes, changes or removes — the one parameter that names a table (the Record family's
 * class, the Query and Collection nodes) — with the changed fields it reads or writes. Pure: the
 * caller reads the files (`ProjectStructureService` in the editor, `fs` in a test).
 */
export function componentReach(plan: Pick<MigrationPlan, 'reach'>, components: readonly ComponentGraph[]): ComponentReachRow[] {
  // A renamed collection is reached by its old name: that is what every node written before names.
  const reached = new Map(plan.reach.flatMap((r) => [[r.collection.toLowerCase(), r] as const, ...(r.was ? [[r.was.toLowerCase(), r] as const] : [])]));
  const out: ComponentReachRow[] = [];
  for (const c of components) {
    for (const n of c.nodes) {
      const named = n.parameters?.collectionName;
      if (typeof named !== 'string') continue;
      const r = reached.get(named.trim().toLowerCase());
      if (!r) continue;
      const touched = new Set<string>();
      for (const w of c.connections || []) {
        if (w.toId === n.id && w.toProperty.startsWith('prop-')) touched.add(w.toProperty.slice(5));
        // The read side (s9): `DbModel2`'s `prop-<field>` are outputs — what a page shows or a form starts from.
        if (w.fromId === n.id && typeof w.fromProperty === 'string' && w.fromProperty.startsWith('prop-')) touched.add(w.fromProperty.slice(5));
      }
      const filter = n.parameters?.visualFilter as { rules?: Array<{ property?: string }> } | undefined;
      for (const rule of filter?.rules || []) if (rule?.property) touched.add(rule.property);
      out.push({ component: c.path, node: n.label || n.id, collection: r.collection, fields: r.fields.filter((f) => touched.has(f)) });
    }
  }
  return out;
}

// ------------------------------------------------------------ the permissions --

/** As much of the backend's `security.json` as a reach reads: the rules kept per collection. */
export interface SecurityRules {
  collections?: Record<string, { permissions?: Record<string, unknown>; creatorOwns?: boolean }>;
}

export interface PermissionReachRow {
  /** Where the rule lives in `security.json`. */
  at: string;
  /** The reached collection, by the name it will have. */
  collection: string;
  /** Its own rules, kept under its name; or a rule whose path goes through it. */
  reads: 'its rules' | 'a path through it';
  /** Changed fields the path follows or matches by. */
  fields: string[];
  /** Rules kept under a renamed collection's old name: they protect nothing until they move. */
  mustMove?: { from: string; to: string };
  /** A path rule whose hops name a collection or a field the plan renames (s9): the old name → the new one, hop by hop, until it is re-said. */
  mustRewrite?: Record<string, string>;
}

type Hop = { follow?: string; to?: string; from?: string; by?: string };

/**
 * The permission rules a plan reaches (§3.2): every collection's rules kept under the name of a
 * collection the plan changes — under its OLD name, for a renamed one, which is where the
 * backend will no longer look — and every `path` rule (ONT-004) whose hops go through one: a
 * hop that lands on it, or that follows or matches by a field of it the plan changes. Pure: the
 * caller reads `security.json`.
 */
export function permissionReach(plan: Pick<MigrationPlan, 'reach' | 'before'>, security: SecurityRules): PermissionReachRow[] {
  const reached = new Map(plan.reach.flatMap((r) => [[r.collection, r] as const, ...(r.was ? [[r.was, r] as const] : [])]));
  const targetOf = (collection: string, field: string): string | undefined =>
    plan.before.collections.find((c) => c.name === collection)?.columns.find((c) => c.name === field)?.targetClass;
  const out: PermissionReachRow[] = [];
  for (const [name, entry] of Object.entries(security.collections || {})) {
    const own = reached.get(name);
    if (own) out.push({ at: `collections.${name}`, collection: own.collection, reads: 'its rules', fields: [], ...(own.was === name ? { mustMove: { from: name, to: own.collection } } : {}) });
    for (const [op, rule] of Object.entries(entry.permissions || {})) {
      for (const atom of Array.isArray(rule) ? rule : [rule]) {
        const hops = (atom as { path?: { hops?: Hop[] } } | null)?.path?.hops;
        if (!Array.isArray(hops)) continue;
        const through = new Map<string, Set<string>>();
        const rewrite: Record<string, string> = {};
        const note = (collection: string | undefined, field?: string) => {
          const r = collection ? reached.get(collection) : undefined;
          if (!r) return;
          const fields = through.get(r.collection) || new Set<string>();
          if (field && r.fields.includes(field)) fields.add(field);
          through.set(r.collection, fields);
          if (r.was && collection === r.was) rewrite[r.was] = r.collection;
          if (field && r.renamed?.[field]) rewrite[field] = r.renamed[field];
        };
        let at: string | undefined = '_User';
        for (const hop of hops) {
          if (hop.follow) {
            note(at, hop.follow);
            at = hop.to ?? (at ? targetOf(at, hop.follow) : undefined);
          } else if (hop.from) {
            note(hop.from, hop.by);
            at = hop.from;
          }
          note(at);
        }
        for (const [collection, fields] of through)
          out.push({ at: `collections.${name}.permissions.${op}`, collection, reads: 'a path through it', fields: [...fields], ...(Object.keys(rewrite).length ? { mustRewrite: rewrite } : {}) });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------- the workflows --

/** A backend workflow definition (`*.workflow.json`), as much of it as a reach reads. */
export interface WorkflowGraph {
  id: string;
  name?: string;
  steps: ReadonlyArray<{ id: string; name?: string; kind: string; ref?: string }>;
}

export interface WorkflowReachRow {
  workflow: string;
  step: string;
  /** The cloud function the step calls, which names a reached collection. */
  calls: string;
  collection: string;
  fields: string[];
}

/** The cloud function a component is, by its path (`/#__cloud__/enrol` → `enrol`), or undefined. */
const cloudFunctionOf = (componentPath: string): string | undefined => /__cloud__\/(.+)$/.exec(componentPath)?.[1];

/**
 * The workflows a plan reaches (§3.2): a workflow step reads or writes records only by calling a
 * cloud function (`call-function`, `for-each`: `ref` is the function's name), and a cloud
 * function is a component — so a workflow is reached when a step of it calls a component
 * `componentReach` found. It ties a step to a collection only through the function's graph; a
 * verb says it in the step (`verbReach`).
 */
export function workflowReach(components: readonly ComponentReachRow[], workflows: readonly WorkflowGraph[]): WorkflowReachRow[] {
  const byFunction = new Map<string, ComponentReachRow[]>();
  for (const row of components) {
    const fn = cloudFunctionOf(row.component);
    if (fn) byFunction.set(fn, [...(byFunction.get(fn) || []), row]);
  }
  const out: WorkflowReachRow[] = [];
  for (const w of workflows)
    for (const s of w.steps) {
      if (!s.ref) continue;
      for (const row of byFunction.get(s.ref) || []) out.push({ workflow: w.name || w.id, step: s.name || s.id, calls: s.ref, collection: row.collection, fields: row.fields });
    }
  return out;
}

// ----------------------------------------------------------------- the verbs --

export interface VerbReachRow {
  /** The verb, in the person's words, and its id. */
  verb: string;
  verbId: string;
  /** The step, as the person said it, and its id. */
  step: string;
  stepId: string;
  /** The function the step calls (`<verb>-<step>`, the component `/#__cloud__/<ref>`); a `keep` calls none. */
  calls?: string;
  /** The reached collection, by the name it will have. */
  collection: string;
  /** Changed fields the step writes: all of them for a `make`, the ones an `update` names, an `end`'s field. */
  fields: string[];
  how: ReachRow['how'];
  /**
   * The step's `on` once the plan has run, when it must be re-said: a renamed noun's new id, or
   * `null` when nothing in the world after is what the step was on (a noun gone, a relation no
   * longer a record of its own). The verbs file is refused against the world after until it is.
   */
  rebind?: { from: string; to: string | null };
}

/**
 * The verbs a plan reaches (§3.2, s10): a step `on` a noun or an own-record relation whose
 * collection the plan makes, changes, renames or removes — read off the step's own binding, not
 * through the function's graph as a workflow is. `before` is the world the verbs were written
 * over; `after`, the one the plan migrates to. Pure.
 */
export function verbReach(plan: Pick<MigrationPlan, 'reach' | 'before'>, verbs: VerbsFile, before: WorldFiles, after: WorldFiles): VerbReachRow[] {
  const reached = new Map(plan.reach.flatMap((r) => [[r.collection, r] as const, ...(r.was ? [[r.was, r] as const] : [])]));
  const collectionOf = new Map<string, string>();
  for (const c of plan.before.collections) collectionOf.set('noun' in c.made ? c.made.noun : c.made.relation, c.name);
  const renames = nounRenames(before, after);
  const bindsAfter = verbSubjects(after);
  const out: VerbReachRow[] = [];
  for (const v of verbs.verbs)
    for (const s of v.steps) {
      if (!s.on) continue;
      const name = collectionOf.get(s.on);
      const r = name ? reached.get(name) : undefined;
      if (!r) continue;
      let writes: string[] = [];
      if (s.does === 'make') writes = r.fields;
      else if (s.does === 'update') writes = (s.fields || []).map(fieldName);
      else if (s.does === 'end') writes = [endField(s, before)].filter((f): f is string => !!f);
      const to = renames.get(s.on) ?? (bindsAfter.has(s.on) ? s.on : null);
      out.push({
        verb: v.name,
        verbId: v.id,
        step: s.says,
        stepId: s.id,
        ...(s.does === 'keep' ? {} : { calls: functionRef(v, s) }),
        collection: r.collection,
        fields: r.fields.filter((f) => writes.includes(f)),
        how: r.how,
        ...(to === s.on ? {} : { rebind: { from: s.on, to } })
      });
    }
  return out;
}
