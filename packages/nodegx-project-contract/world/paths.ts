/**
 * P116 ONT-004 — a person's path sentence, compiled to the contract's path operation.
 *
 * "The members on my account's companies" is a chain of relations in the person's world:
 * person →(membership, as holder)→ account →(account-company)→ company ←(employment)← person.
 * The projection (ONT-003) decided where each relation lives — a Link on one end, a Links, a
 * record of its own with two Links — and this module reads that back: a step along a relation
 * becomes the one or two hops the storage shape needs, in the direction the sentence reads.
 *
 * Nothing here names an engine. The output is the neutral `path` operator's shape
 * (`@noodl/backend-contract` `PathFilter`, restated structurally below so this package imports
 * nothing), and the backend grades it on two engines (`nodegx-backend/tests/ont-004-world`).
 *
 * What a step cannot be, said by name rather than guessed at:
 * - a relation with no link in the schema (`one-of`, `ends`, `exists-elsewhere`, `points-at-one-of`);
 * - a `many-by-list` read the other way round — the kind's own rule: "nobody can ask the list the
 *   other way round";
 * - a record of its own with only one end (`happened-to` with no `to`), walked through to the end
 *   it does not have.
 */
import type { Relation, WorldFiles } from './files';
import { collectionName, loginHop, USERS_COLLECTION, type WorldCollection, type WorldColumn, type WorldSchema } from './project';
import { kindById } from './vocabulary';

/** The contract's `PathHop`, restated. Every `where` is in the storage wire's spelling. */
export type PathHop =
  | { follow: string; to?: string; where?: Record<string, unknown>; repeat?: true }
  | { from: string; by: string; where?: Record<string, unknown>; repeat?: true };

/** The contract's `PathFilter`, restated: what goes under `$path` in a query's `where`. */
export interface PathShape {
  from: { collection: string; where?: Record<string, unknown> };
  hops: PathHop[];
  maxDepth: number;
}

/** One step of a sentence: along a relation, forwards (from → to) unless `back`. */
export interface PathStep {
  relation: string;
  /**
   * Read the relation from its `to` end to its `from` end. Inferred from the noun the path is
   * on when the two ends differ; required for a relation whose two ends are the same noun.
   */
  back?: boolean;
  /** Narrow the rows this step lands on — for a record of its own, the record ("as holder"). */
  where?: Record<string, unknown>;
  /** Take the step again and again (a tree: "every topic under this one"), to the depth left. */
  all?: true;
}

/** A path in the person's words: a noun to start from, which of them, and the relations along. */
export interface PathSentence {
  /** The noun id the path starts from. */
  from: string;
  /** Which rows of it, in the storage wire's spelling. Absent: every one the caller may read. */
  where?: Record<string, unknown>;
  steps: PathStep[];
  /** The bound. Absent: exactly the hops the steps make; required when a step is `all`. */
  maxDepth?: number;
}

export interface CompiledPath {
  /** The collection the path ends on — the one to query with `{ $path }`. */
  collection: string;
  /** The noun it ends on. */
  noun: string;
  path: PathShape;
  /** The path read back, relation sentence by relation sentence. */
  says: string;
}

export type PathCompilation = { ok: true; compiled: CompiledPath } | { ok: false; problem: string };

/** The contract's ceiling, restated. */
export const MAX_PATH_DEPTH = 8;

const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

/** Where the projection put a relation: the columns it made, and the record of its own if any. */
function placed(
  schema: WorldSchema,
  r: Relation
): { own?: WorldCollection; columns: Array<{ on: WorldCollection; col: WorldColumn }> } {
  const own = schema.collections.find((c) => 'relation' in c.made && c.made.relation === r.id);
  const columns: Array<{ on: WorldCollection; col: WorldColumn }> = [];
  for (const c of schema.collections)
    for (const col of c.columns) if (col.relation === r.id) columns.push({ on: c, col });
  return { own, columns };
}

/**
 * Compile a sentence. Pure: the same world and sentence give the same hops.
 *
 * @param schema the world's projection (`projectWorld`)
 * @param files the world itself, for the relations' ends and sentences
 */
export function worldPath(schema: WorldSchema, files: WorldFiles, sentence: PathSentence): PathCompilation {
  const fail = (problem: string): PathCompilation => ({ ok: false, problem });
  const nouns = new Map(files.nouns.nouns.map((n) => [n.id, n]));
  const relations = new Map(files.relations.relations.map((r) => [r.id, r]));
  const collectionOf = (noun: string): string | undefined => {
    const c = schema.collections.find((x) => 'noun' in x.made && x.made.noun === noun);
    return c?.name;
  };

  if (!nouns.has(sentence.from))
    return fail(`The path starts from "${sentence.from}", which is not a noun of this world.`);
  const start = collectionOf(sentence.from)!;
  if (!sentence.steps.length) return fail('A path needs at least one step.');

  let noun = sentence.from;
  const hops: PathHop[] = [];
  const said: string[] = [];
  let repeats = 0;

  for (let i = 0; i < sentence.steps.length; i++) {
    const step = sentence.steps[i];
    const at = `step ${i + 1}`;
    const r = relations.get(step.relation);
    if (!r) return fail(`${at}: "${step.relation}" is not a relation of this world.`);
    const kind = kindById(r.kind);
    if (!kind) return fail(`${at}: "${r.kind}" is not a kind this vocabulary knows.`);
    const toNoun = typeof r.to === 'string' ? r.to : undefined;
    const selfRelation = !toNoun || toNoun === r.from;
    const { own, columns } = placed(schema, r);
    const fromCollection = collectionOf(r.from)!;
    const target = toNoun ? collectionOf(toNoun) : undefined;
    // A link from a kind of thing to the same kind: the one case a direction cannot be inferred.
    const selfLink =
      toNoun === r.from || columns.some(({ on, col }) => col.kind === 'link' && col.targetClass === on.name);

    // Which way the step reads the relation.
    let back: boolean;
    if (selfRelation) {
      if (noun !== r.from) return fail(`${at}: "${r.id}" is about ${a(r.from)}, and the path is on ${a(noun)}.`);
      if (selfLink && step.back === undefined)
        return fail(
          `${at}: "${r.id}" joins ${r.from}s to ${r.from}s; say "back": false (along the link) or true (against it).`
        );
      back = step.back === true;
    } else if (noun === r.from) {
      if (step.back === true)
        return fail(`${at}: "${r.id}" read back starts from ${a(toNoun!)}, and the path is on ${a(noun)}.`);
      back = false;
    } else if (noun === toNoun) {
      if (step.back === false)
        return fail(`${at}: "${r.id}" read forwards starts from ${a(r.from)}, and the path is on ${a(noun)}.`);
      back = true;
    } else {
      return fail(`${at}: "${r.id}" joins ${a(r.from)} to ${a(toNoun!)}, and the path is on ${a(noun)}.`);
    }

    const repeat: { repeat?: true } = step.all ? { repeat: true } : {};
    if (step.all) repeats += 1;
    const narrowed = (hop: PathHop): PathHop => (step.where ? { ...hop, where: step.where } : hop);

    if (own) {
      // A record of its own: in through one link, out through the other.
      const fromCol = own.columns.find(
        (c) => c.kind === 'link' && c.targetClass === fromCollection && c.relation === r.id
      );
      const toCol = own.columns.find(
        (c) => c.kind === 'link' && c.targetClass === target && c.relation === r.id && c !== fromCol
      );
      if (!fromCol || !toCol) {
        return fail(
          `${at}: "${r.id}" is a record of its own with only one end, so a path cannot go through it to the other.`
        );
      }
      if (step.all)
        return fail(
          `${at}: a record of its own cannot be taken again and again; only a link to the same kind of thing can.`
        );
      const [inCol, outCol] = back ? [toCol, fromCol] : [fromCol, toCol];
      hops.push(narrowed({ from: own.name, by: inCol.name }), { follow: outCol.name });
    } else {
      const link = columns.find(({ col }) => col.kind === 'link' || col.kind === 'links' || col.kind === 'list');
      if (!link) return fail(`${at}: "${r.id}" (${r.kind}) makes no link in the schema, so a path cannot follow it.`);
      const { on, col } = link;
      const onFrom = on.name === fromCollection;
      // Forwards along a field on `from` is a follow; on `to` it is a read-back, and vice versa.
      const follows = onFrom ? !back : back;
      if (follows) {
        if (col.kind === 'list') {
          const to = onFrom ? target : fromCollection;
          if (!to) return fail(`${at}: "${r.id}" lists ids of something that is not a noun.`);
          if (step.all) return fail(`${at}: a list cannot be followed again and again.`);
          hops.push(narrowed({ follow: col.name, to }));
        } else hops.push(narrowed({ follow: col.name, ...repeat }));
      } else {
        if (col.kind === 'list') {
          return fail(
            `${at}: "${r.id}" is a list kept on ${a(
              r.from
            )}, and nobody can ask the list the other way round — make it a Links field, or a record of its own.`
          );
        }
        hops.push(narrowed({ from: on.name, by: col.name, ...repeat }));
      }
    }
    said.push(`${back ? 'back along' : 'along'} "${r.sentence}"`);
    noun = selfRelation ? noun : back ? r.from : toNoun!;
  }

  if (repeats > 1) return fail('Only one step of a path may be taken again and again.');
  const maxDepth = sentence.maxDepth ?? hops.length;
  if (repeats && sentence.maxDepth === undefined)
    return fail('A step taken again and again needs "maxDepth": how deep at most.');
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_PATH_DEPTH)
    return fail(`"maxDepth" must be a whole number from 1 to ${MAX_PATH_DEPTH}.`);
  if (hops.length > maxDepth)
    return fail(`The path takes ${hops.length} hops in the schema and "maxDepth" allows ${maxDepth}.`);

  const end = collectionOf(noun)!;
  const path: PathShape = { from: { collection: start }, hops, maxDepth };
  if (sentence.where) path.from.where = sentence.where;
  return {
    ok: true,
    compiled: {
      collection: end,
      noun,
      path,
      says: `the ${nouns.get(noun)!.name.toLowerCase()}s reached from ${a(
        nouns.get(sentence.from)!.name.toLowerCase()
      )}: ${said.join(', then ')}`
    }
  };
}

/** A `path` atom for `security.json`: the rows a signed-in caller reaches from their own login. */
export interface PathRuleAtom {
  path: { hops: PathHop[]; maxDepth: number };
}

/**
 * A permission rule from a sentence (ONT-004 AC3): "an account holder sees the members on their
 * account". The rule starts at the caller's `_User` row, which the world does not name — the
 * login is reached through a link to it that the projection made (`doneBy` on a `happened-to`
 * with `who: true`, or any Link the schema shows pointing at the users collection). `login`
 * names that hop: the collection holding the link and the link, then how it reaches the start
 * noun of the sentence. The sentence's own steps follow.
 */
export function worldRule(
  schema: WorldSchema,
  files: WorldFiles,
  login: { collection: string; by: string; then?: PathHop[] },
  sentence: PathSentence
): { ok: true; rule: PathRuleAtom; collection: string; says: string } | { ok: false; problem: string } {
  const holder = schema.collections.find((c) => c.name === login.collection);
  const link = holder?.columns.find((c) => c.name === login.by);
  if (!holder || !link)
    return { ok: false, problem: `The login link "${login.collection}.${login.by}" is not in the schema.` };
  if (link.kind !== 'link' || link.targetClass !== USERS_COLLECTION) {
    return {
      ok: false,
      problem: `"${login.collection}.${login.by}" does not point at the signed-in users (${USERS_COLLECTION}).`
    };
  }
  const compiled = worldPath(schema, files, sentence);
  if (!compiled.ok) return compiled;
  const hops: PathHop[] = [
    { from: login.collection, by: login.by },
    ...(login.then || []),
    ...compiled.compiled.path.hops
  ];
  const maxDepth = Math.max(compiled.compiled.path.maxDepth, hops.length);
  if (maxDepth > MAX_PATH_DEPTH)
    return {
      ok: false,
      problem: `The rule takes ${hops.length} hops from the login, over the ceiling of ${MAX_PATH_DEPTH}.`
    };
  return {
    ok: true,
    rule: { path: { hops, maxDepth } },
    collection: compiled.compiled.collection,
    says: `whoever is signed in sees ${compiled.compiled.says}`
  };
}

/**
 * The permission rule an `owned-by` says, from the world alone (ONT-002 "through what?"): the
 * login the noun that `signsIn` projected, its `through` chain to the owner, then back along this
 * relation's link to the records owned. `worldRule()` took the login and the chain from its caller;
 * this reads both from the files, so a rule a person answered is the rule that is written, and a
 * chain that does not compile is refused here in words. Not written into `security.json` by
 * anything yet (who may see what is BMG-006's; ONT-008's page is the first writer).
 */
export function ownerRule(
  schema: WorldSchema,
  files: WorldFiles,
  relation: string
): { ok: true; rule: PathRuleAtom; collection: string; says: string } | { ok: false; problem: string } {
  const r = files.relations.relations.find((x) => x.id === relation);
  if (!r) return { ok: false, problem: `"${relation}" is not a relation of this world.` };
  if (r.kind !== 'owned-by') return { ok: false, problem: `"${relation}" is ${a(r.kind)}; only an owned-by says who may see what.` };
  if (r.answers?.path !== true)
    return { ok: false, problem: `"${relation}" does not say it belongs to someone through a chain (answers.path); its rule is its owner link alone.` };
  if (!r.through) return { ok: false, problem: `"${relation}" belongs to someone through a chain, and nobody has said through what.` };
  const signs = files.nouns.nouns.find((n) => n.signsIn);
  const login = loginHop(schema);
  if (!signs || !login) return { ok: false, problem: 'Nobody signs in: a rule starts from whoever is signed in, and no noun says signsIn.' };
  const rule = worldRule(schema, files, login, {
    from: signs.id,
    steps: [...r.through.map((s) => ({ ...s })), { relation: r.id, back: true }]
  });
  if (!rule.ok) return { ok: false, problem: `"${relation}", through what it belongs: ${rule.problem}` };
  return rule;
}

/** The collection a noun became, for callers that only have the id. */
export function nounCollection(noun: string): string {
  return collectionName(noun);
}
