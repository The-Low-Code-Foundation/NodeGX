/**
 * P116 ONT-005 — the mistakes are mutants.
 *
 * A classic mistake ("category as free text", "one account on the person, no history") is the
 * schema a kind would have produced if one answer had been missing or wrong. `worldMutants()`
 * makes every such schema for a world: one per kind seed (`kinds.ts` `mutants`, each with the
 * question that kills it and an executable shape), one per answered question whose removal
 * changes the schema, one per property stored as text. The right schema's held claims
 * (ONT-003) are then run against each mutant by `nodegx-backend`'s ONT-005 spec, on the two
 * engines behind the contract: a mutant on which a claim fails is **killed** — what the person
 * said stops it.
 *
 * What survives is the honesty number, never hidden, in three classes:
 *
 * - **unanswered** — the question was never answered, so the mistake and the schema are the
 *   same thing. The runner (ONT-002) asks that question; `questionsToAsk()` lists them.
 * - **unkept** — the person said it, the projection wrote it into the collection's description,
 *   and no engine behind the contract keeps it (a link's target deleted, a record never edited).
 * - **unclaimed** — the mutant differs in a field or rule no claim exercises (a plain optional
 *   field; a shape rule only the diff can read).
 *
 * This module decides what it can without an engine (`gradeStatically`): a change of kind is
 * killed by the validator before any projection; a claim whose collection or field the mutant
 * does not have has **no home** — killed, and never run, because the engines auto-create a
 * collection or a column on first write, which would let a claim pass through a table the
 * mutant never declared (a gate with a hole shaped like the defect).
 */

import type { Relation, WorldFiles } from './files';
import type { FieldKind, Kind, MutantShape, Question } from './kind';
import {
  applyMutant,
  collectionName,
  fieldName,
  projectWorld,
  STORAGE_TYPE,
  type ClaimStep,
  type WorldClaim,
  type WorldSchema
} from './project';
import { validateWorld } from './validate';
import { kindById } from './vocabulary';

export type MutantOf = { relation: string; kind: string } | { noun: string; property: string };

/** What kills it: a question of the kind, in the person's nouns, or the tile a property was given. */
export type Killer = { question: string; ask: string } | { kind: string } | { tile: FieldKind };

export interface WorldMutant {
  /** `<relation>/<seed>`, `<relation>/<question>-unanswered`, `<noun>/<field>-as-text`. */
  id: string;
  of: MutantOf;
  /** The mistake, in words. */
  mistake: string;
  kills: Killer;
  shape: MutantShape;
  /** The seeds that name this mistake; a per-question mutant may be named by none. */
  seeds: string[];
  /** How it was made: the world re-said, the schema re-typed, or not made at all (a change of kind). */
  made: 'world' | 'schema' | 'question';
  /** The schema the mistake makes. Absent when `made` is `question`, or when `cannot` says why. */
  schema?: WorldSchema;
  /** Why the mistake cannot be made on this world (the format refuses it, or the fixture never said what it would take out). */
  cannot?: string;
  /** The mistake is the other answer to a question this world answered: not a mistake here. */
  notApplicable?: string;
  /** For a change of kind: the validator's refusal of the answer, which is what kills it. */
  refusal?: string;
}

export interface InertQuestion {
  relation: string;
  kind: string;
  question: string;
  /** Answered or not, no answer changes the schema: the runner's, for the record. */
  why: string;
}

export interface WorldMutants {
  right: WorldSchema;
  mutants: WorldMutant[];
  inert: InertQuestion[];
}

export type StaticVerdict =
  | { verdict: 'killed'; by: 'the question'; why: string }
  | { verdict: 'killed'; by: 'no home'; claim: string; why: string }
  | { verdict: 'survives'; as: 'unanswered' | 'unkept' | 'unclaimed'; why: string }
  | { verdict: 'cannot'; why: string }
  /** The mistake is the other answer to a question this world gave: nothing to kill here. */
  | { verdict: 'not-applicable'; why: string }
  /** The engine decides: these held claims have a home on the mutant. If every one passes, it survives `as`. */
  | { verdict: 'run'; claims: string[]; as: 'unkept' | 'unclaimed' };

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const one = (to: string | string[] | undefined): string => (Array.isArray(to) ? to[0] : to) || '';
const collectionsText = (s: WorldSchema): string => JSON.stringify(s.collections);

/** "company" → "companies", "slot" → "slots", "person" → "people": the person reads these. */
export function plural(word: string): string {
  if (word === 'person') return 'people';
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}
const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

/** The question in the person's nouns, with the article and the plural their nouns take. */
export function askWords(q: Question, r: Relation): string {
  const to = one(r.to);
  return q.ask
    .replace(/\ba \{from\}s\b/g, plural(r.from))
    .replace(/\ba \{to\}s\b/g, plural(to))
    .replace(/\{from\}s\b/g, plural(r.from))
    .replace(/\{to\}s\b/g, plural(to))
    .replace(/\ba \{from\}/g, article(r.from))
    .replace(/\ba \{to\}/g, article(to))
    .replace(/\{from\}/g, r.from)
    .replace(/\{to\}/g, to)
    .replace(/\{field\}/g, r.property || '');
}

/** Every answer a question could be given, to see whether any of them changes the schema. */
function alternatives(q: Question): Array<string | boolean> {
  if (q.answer.type === 'yes-no') return [true, false];
  if (q.answer.type === 'one-of') return [...q.answer.values];
  return ['(an answer in words)'];
}

function project(files: WorldFiles): { schema?: WorldSchema; problems?: string[] } {
  const out = projectWorld(files);
  return out.ok === true ? { schema: out.schema } : { problems: out.problems };
}

function withAnswers(
  files: WorldFiles,
  id: string,
  edit: (answers: Record<string, string | boolean>) => void
): WorldFiles {
  const f = clone(files);
  const r = f.relations.relations.find((x) => x.id === id)!;
  r.answers = { ...(r.answers || {}) };
  edit(r.answers);
  if (!Object.keys(r.answers).length) delete r.answers;
  return f;
}

/** The world with the relation re-said, or not said. */
function resay(files: WorldFiles, r: Relation, shape: MutantShape): { files?: WorldFiles; cannot?: string } {
  const f = clone(files);
  const at = f.relations.relations.findIndex((x) => x.id === r.id);
  if ('unsaid' in shape) {
    f.relations.relations.splice(at, 1);
    return { files: f };
  }
  if ('asKind' in shape) {
    const target = kindById(shape.asKind);
    if (!target) return { cannot: `no kind "${shape.asKind}"` };
    const made: Relation = { id: r.id, from: r.from, kind: shape.asKind, sentence: r.sentence };
    if (r.to !== undefined) made.to = r.to;
    if (shape.answers) made.answers = { ...shape.answers };
    f.relations.relations[at] = made;
    return { files: f };
  }
  if ('foldedIn' in shape) {
    const from = f.nouns.nouns.find((n) => n.id === r.from);
    const to = f.nouns.nouns.find((n) => n.id === one(r.to));
    if (!from || !to) return { cannot: 'the relation does not join two nouns' };
    const names = new Set((to.properties || []).map((p) => fieldName(p.name)));
    for (const p of from.properties || []) {
      if (names.has(fieldName(p.name))) return { cannot: `"${to.id}" already has a field called "${p.name}"` };
      to.properties = [...(to.properties || []), p];
    }
    f.nouns.nouns = f.nouns.nouns.filter((n) => n.id !== from.id);
    f.relations.relations = f.relations.relations.filter(
      (x) => x.from !== from.id && (Array.isArray(x.to) ? !x.to.includes(from.id) : x.to !== from.id)
    );
    return { files: f };
  }
  return { cannot: 'not a world-level shape' };
}

/** The right schema re-typed at one point, or why it cannot be. */
function retype(
  right: WorldSchema,
  r: Relation,
  kind: Kind,
  shape: MutantShape
): { schema?: WorldSchema; cannot?: string; unchanged?: 'unkept' | 'unclaimed' } {
  const s = clone(right);
  if ('asText' in shape) {
    let n = 0;
    for (const c of s.collections)
      for (const col of c.columns)
        if (col.relation === r.id && col.type === 'Pointer') {
          col.type = 'String';
          col.kind = 'text';
          delete col.targetClass;
          n += 1;
        }
    return n ? { schema: s } : { cannot: 'the relation makes no link to re-type' };
  }
  if ('property' in shape) {
    const c = s.collections.find((x) => x.name === collectionName(r.from));
    const name = fieldName(r.property || '');
    const col = c?.columns.find((x) => x.name === name);
    if (!c || !col) return { cannot: `no field "${r.property}" on ${collectionName(r.from)}` };
    if (col.kind === shape.property) return { cannot: `"${r.property}" is already ${shape.property}` };
    col.kind = shape.property;
    col.type = STORAGE_TYPE[shape.property];
    c.checks = c.checks.filter((k) => k.field !== name);
    return { schema: s };
  }
  if ('without' in shape && 'field' in shape.without) {
    const name = fieldName(shape.without.field);
    let n = 0;
    for (const c of s.collections) {
      const before = c.columns.length;
      c.columns = c.columns.filter((col) => !(col.relation === r.id && col.name === name));
      if (c.columns.length !== before) {
        n += 1;
        c.checks = c.checks.filter((k) => k.field !== name);
        c.indexes = c.indexes.filter((i) => !i.fields.includes(name));
      }
    }
    return n ? { schema: s } : { cannot: `the relation makes no field called "${shape.without.field}"` };
  }
  if ('without' in shape && 'rule' in shape.without) {
    const key = shape.without.rule;
    const out = kind.projection({ id: r.id, from: r.from, to: r.to, property: r.property, answers: r.answers || {} });
    const rule = out.rules.find((x) => key in x.holds);
    if (!rule) return { cannot: `the relation makes no "${key}" rule here` };
    const home = s.collections.find(
      (c) => c.name === (rule.on === 'own' ? collectionName(r.id) : collectionName(r.from))
    );
    if (!home) return { cannot: 'the rule has no home' };
    if ('unique' in rule.holds) {
      const fields = rule.holds.unique.map(fieldName).join();
      const before = home.indexes.length;
      home.indexes = home.indexes.filter((i) => i.fields.join() !== fields);
      return before === home.indexes.length ? { cannot: 'the unique rule made no index' } : { schema: s };
    }
    if ('pairOnce' in rule.holds) {
      const col = home.columns.find((x) => x.name === fieldName((rule.holds as { pairOnce: string }).pairOnce));
      if (!col || col.type !== 'Relation') return { cannot: 'the pair rule made no Links field' };
      col.kind = 'list';
      col.type = 'Array';
      delete col.targetClass;
      return { schema: s };
    }
    // ONT-014: kept by the backend inside the write — the mutant is the collection's `onlyWhile` without it.
    if ('setOnce' in rule.holds || 'neverEdited' in rule.holds || 'neverDeleted' in rule.holds || 'frozen' in rule.holds || 'moves' in rule.holds) {
      const h = rule.holds;
      const drop =
        'setOnce' in h
          ? { collection: home.name, setOnce: fieldName(h.setOnce) }
          : 'neverEdited' in h
            ? { collection: home.name, neverEdited: true as const }
            : 'frozen' in h
              ? { collection: home.name, frozen: true as const }
              : 'moves' in h
                ? { collection: home.name, moves: fieldName(h.moves) }
                : { collection: home.name, neverDeleted: true as const };
      try {
        return { schema: applyMutant(s, { dropOnlyWhile: drop }) };
      } catch {
        // Nothing to take out: a field set once on a record never edited is kept by the record's rule.
        return { schema: s, unchanged: 'unclaimed' };
      }
    }
    // A rule no engine keeps, or a shape: taking it out changes nothing a claim can see.
    return { schema: s, unchanged: 'shape' in rule.holds ? 'unclaimed' : 'unkept' };
  }
  return { cannot: 'not a schema-level shape' };
}

/**
 * Whether any answer to `q`, on `relation` with the question unanswered, changes the kind or the
 * schema: what makes an unanswered question a mutant. The runner (ONT-002) asks it of an
 * answered question too, to tell an answer it would have asked for from one volunteered.
 */
export function answerMatters(files: WorldFiles, relation: string, q: Question): 'the kind' | 'the schema' | false {
  const bare = withAnswers(files, relation, (a) => delete a[q.id]);
  const base = project(bare);
  if (!base.schema) return false;
  const rightText = collectionsText(base.schema);
  for (const v of alternatives(q)) {
    const out = project(withAnswers(bare, relation, (a) => (a[q.id] = v)));
    if (!out.schema) return 'the kind';
    if (collectionsText(out.schema) !== rightText) return 'the schema';
  }
  return false;
}

/**
 * Every mutant of a world, with the right schema beside them. A world the validator refuses
 * throws: there is nothing to be a mutant of.
 */
export function worldMutants(files: WorldFiles): WorldMutants {
  const base = project(files);
  if (!base.schema) throw new Error(`the world does not project:\n${(base.problems || []).join('\n')}`);
  const right = base.schema;
  const rightText = collectionsText(right);
  const mutants: WorldMutant[] = [];
  const inert: InertQuestion[] = [];
  const nouns = files.nouns.nouns;

  for (const r of files.relations.relations) {
    const kind = kindById(r.kind)!;
    const of: MutantOf = { relation: r.id, kind: kind.id };
    const answers = r.answers || {};
    const byQuestion = new Map<string, WorldMutant>();

    // 1. One per question: left unanswered. Answered: the schema without it, if that differs.
    //    Unanswered: a survivor by construction when any answer would change the schema or the kind.
    for (const q of kind.questions) {
      const id = `${r.id}/${q.id}-unanswered`;
      const kills: Killer = { question: q.id, ask: askWords(q, r) };
      if (q.id in answers) {
        const out = project(withAnswers(files, r.id, (a) => delete a[q.id]));
        if (!out.schema) {
          inert.push({
            relation: r.id,
            kind: kind.id,
            question: q.id,
            why: `without it the world does not project: ${out.problems!.join('; ')}`
          });
          continue;
        }
        if (collectionsText(out.schema) === rightText) {
          inert.push({
            relation: r.id,
            kind: kind.id,
            question: q.id,
            why: 'its answer changes nothing in the schema'
          });
          continue;
        }
        const m: WorldMutant = {
          id,
          of,
          mistake: `"${kills.ask}" left unanswered`,
          kills,
          shape: { unanswered: q.id },
          seeds: [],
          made: 'world',
          schema: out.schema
        };
        mutants.push(m);
        byQuestion.set(q.id, m);
      } else {
        let matters: string | undefined;
        for (const v of alternatives(q)) {
          const out = project(withAnswers(files, r.id, (a) => (a[q.id] = v)));
          if (!out.schema) {
            matters = `answering ${JSON.stringify(v)} changes the kind`;
            break;
          }
          if (collectionsText(out.schema) !== rightText) {
            matters = `answering ${JSON.stringify(v)} changes the schema`;
            break;
          }
        }
        if (!matters) {
          inert.push({
            relation: r.id,
            kind: kind.id,
            question: q.id,
            why: 'no answer changes the schema or the kind'
          });
          continue;
        }
        const m: WorldMutant = {
          id,
          of,
          mistake: `"${kills.ask}" never answered — ${matters}`,
          kills,
          shape: { unanswered: q.id },
          seeds: [],
          made: 'world',
          schema: right
        };
        mutants.push(m);
        byQuestion.set(q.id, m);
      }
    }

    // 2. The kind's seeds, by shape.
    for (const seed of kind.mutants) {
      const id = `${r.id}/${seed.id}`;
      const kills: Killer =
        seed.kills === 'the kind'
          ? { kind: kind.id }
          : { question: seed.kills, ask: askWords(kind.questions.find((q) => q.id === seed.kills)!, r) };
      const mistake = seed.mistake
        .replace(/\{from\}/g, r.from)
        .replace(/\{to\}/g, one(r.to))
        .replace(/\{field\}/g, r.property || '');
      const shape = seed.shape;
      if ('unanswered' in shape) {
        const m = byQuestion.get(shape.unanswered);
        if (m) m.seeds.push(seed.id);
        else if (shape.unanswered in answers)
          mutants.push({
            id,
            of,
            mistake,
            kills,
            shape,
            seeds: [seed.id],
            made: 'world',
            notApplicable: `this world answered "${shape.unanswered}" ${JSON.stringify(
              answers[shape.unanswered]
            )}, and the mistake is the other answer`
          });
        else
          mutants.push({
            id,
            of,
            mistake,
            kills,
            shape,
            seeds: [seed.id],
            made: 'world',
            cannot: `"${shape.unanswered}" changes nothing on this world, answered or not`
          });
        continue;
      }
      if ('changesKind' in shape) {
        const q = kind.questions.find((x) => x.id === seed.kills)!;
        const when = q.changesKind!.when;
        const verdict = validateWorld(
          withAnswers(files, r.id, (a) => (a[q.id] = when)) as unknown as Record<string, unknown>
        );
        const refusal = verdict.problems.find((p) => p.at.endsWith('.kind'))?.message;
        mutants.push({
          id,
          of,
          mistake,
          kills,
          shape,
          seeds: [seed.id],
          made: 'question',
          ...(refusal ? { refusal } : { cannot: 'the validator did not refuse the answer that changes the kind' })
        });
        continue;
      }
      if ('unsaid' in shape || 'asKind' in shape || 'foldedIn' in shape) {
        const said = resay(files, r, shape);
        if (!said.files) {
          mutants.push({ id, of, mistake, kills, shape, seeds: [seed.id], made: 'world', cannot: said.cannot });
          continue;
        }
        const out = project(said.files);
        mutants.push({
          id,
          of,
          mistake,
          kills,
          shape,
          seeds: [seed.id],
          made: 'world',
          ...(out.schema ? { schema: out.schema } : { cannot: `the format refuses it: ${out.problems!.join('; ')}` })
        });
        continue;
      }
      const typed = retype(right, r, kind, shape);
      mutants.push({
        id,
        of,
        mistake,
        kills,
        shape,
        seeds: [seed.id],
        made: 'schema',
        ...(typed.schema ? { schema: typed.schema } : { cannot: typed.cannot })
      });
    }
  }

  // 3. A property stored as text: a number, a date, a yes/no, a choice (free text where a list belongs).
  for (const n of nouns) {
    for (const p of n.properties || []) {
      if (!['choice', 'number', 'date', 'yesno'].includes(p.kind)) continue;
      const s = clone(right);
      const c = s.collections.find((x) => x.name === collectionName(n.id))!;
      const name = fieldName(p.name);
      const col = c.columns.find((x) => x.name === name)!;
      col.kind = 'text';
      col.type = 'String';
      c.checks = c.checks.filter((k) => k.field !== name);
      mutants.push({
        id: `${n.id}/${name}-as-text`,
        of: { noun: n.id, property: p.name },
        mistake:
          p.kind === 'choice'
            ? `${a(n.id)}'s ${p.name} as free text, where a list belongs`
            : `${a(n.id)}'s ${p.name}, a ${p.kind}, stored as text`,
        kills: { tile: p.kind },
        shape: { property: 'text' },
        seeds: [],
        made: 'schema',
        schema: s
      });
    }
  }

  return { right, mutants, inert };
}

const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

/** What a claim's steps need to exist, and the first thing the schema lacks. */
function missingHome(schema: WorldSchema, claim: WorldClaim): string | undefined {
  const byName = new Map(schema.collections.map((c) => [c.name, c]));
  const need = (coll: string, fields: string[]): string | undefined => {
    const c = byName.get(coll);
    if (!c) return `no collection ${coll}`;
    for (const f of fields) if (!c.columns.some((x) => x.name === f)) return `no field ${coll}.${f}`;
    return undefined;
  };
  for (const step of claim.steps as ClaimStep[]) {
    let miss: string | undefined;
    if ('make' in step) miss = need(step.make, Object.keys(step.data));
    else if ('refuse' in step) miss = need(step.refuse, Object.keys(step.data));
    else if ('change' in step) miss = need(step.change, Object.keys(step.data));
    else if ('remove' in step) miss = need(step.remove, []);
    else if ('pair' in step) miss = need(step.pair, [step.field]);
    else if ('paired' in step) miss = need(step.paired, [step.field]);
    else if ('gone' in step) miss = need(step.gone, []);
    else if ('there' in step) miss = need(step.there, []);
    else if ('holds' in step) miss = need(step.holds, [step.field]);
    else miss = need(step.empty, [step.field]);
    if (miss) return miss;
  }
  return undefined;
}

/** Whether two schemas differ in anything a store holds (a column, a check, an index), or only in words. */
function differsInWhatIsHeld(x: WorldSchema, y: WorldSchema): boolean {
  const held = (s: WorldSchema) =>
    JSON.stringify(
      s.collections.map((c) => ({
        name: c.name,
        columns: c.columns.map(({ name, kind, type, targetClass, required }) => ({
          name,
          kind,
          type,
          targetClass,
          required
        })),
        checks: c.checks,
        indexes: c.indexes,
        onlyWhile: c.onlyWhile
      }))
    );
  return held(x) !== held(y);
}

/**
 * What can be decided without an engine. `run` hands the engine the held claims that have a
 * home on the mutant, and says what the mutant survives as if every one of them passes.
 */
export function gradeStatically(right: WorldSchema, m: WorldMutant): StaticVerdict {
  if (m.made === 'question')
    return m.refusal
      ? { verdict: 'killed', by: 'the question', why: m.refusal }
      : { verdict: 'cannot', why: m.cannot || 'unexplained' };
  if (m.notApplicable) return { verdict: 'not-applicable', why: m.notApplicable };
  if (!m.schema) return { verdict: 'cannot', why: m.cannot || 'unexplained' };
  if (collectionsText(m.schema) === collectionsText(right)) {
    if ('unanswered' in m.shape) return { verdict: 'survives', as: 'unanswered', why: m.mistake };
    if ('without' in m.shape && 'rule' in m.shape.without)
      return m.shape.without.rule === 'shape'
        ? {
            verdict: 'survives',
            as: 'unclaimed',
            why: 'a shape rule: nothing in the data plane says it; the diff (ONT-007) reads it'
          }
        : {
            verdict: 'survives',
            as: 'unkept',
            why: `the "${m.shape.without.rule}" rule is said in the description, and no engine behind the contract keeps it`
          };
    return { verdict: 'survives', as: 'unclaimed', why: 'the mistake makes the same schema' };
  }
  // The mutant's own relation's claims first, so a kill is attributed to what was said about it.
  const own = (c: WorldClaim): number =>
    'relation' in m.of && 'relation' in c.from && c.from.relation === m.of.relation ? 0 : 1;
  const held = right.claims.filter((c) => c.held).sort((x, y) => own(x) - own(y));
  for (const c of held) {
    const miss = missingHome(m.schema, c);
    if (miss) return { verdict: 'killed', by: 'no home', claim: c.id, why: `"${c.says}" has nowhere to live: ${miss}` };
  }
  return {
    verdict: 'run',
    claims: held.map((c) => c.id),
    as: differsInWhatIsHeld(right, m.schema) ? 'unclaimed' : 'unkept'
  };
}

export interface QuestionToAsk {
  relation: string;
  kind: string;
  question: string;
  ask: string;
  /** Why it matters: an answer would change the kind, or the schema. */
  because: string;
}

/**
 * The questions a world has not answered whose answer would change the kind or the schema —
 * the surviving mutants of the `unanswered` class, in the kinds' own order. ONT-002's runner
 * asks these; a question that changes nothing is in `inert`, for the record.
 */
export function questionsToAsk(files: WorldFiles): QuestionToAsk[] {
  const { right, mutants } = worldMutants(files);
  const out: QuestionToAsk[] = [];
  for (const m of mutants) {
    if (!('unanswered' in m.shape) || !('relation' in m.of) || !('question' in m.kills)) continue;
    const v = gradeStatically(right, m);
    if (v.verdict === 'survives' && v.as === 'unanswered')
      out.push({
        relation: m.of.relation,
        kind: m.of.kind,
        question: m.kills.question,
        ask: m.kills.ask,
        because: m.mistake.replace(/^.*— /, '')
      });
  }
  return out;
}

/** The right schema's held claims, as the engine must see them: the ones a verdict names. */
export function claimsNamed(right: WorldSchema, ids: readonly string[]): WorldClaim[] {
  const by = new Map(right.claims.map((c) => [c.id, c]));
  return ids.map((id) => by.get(id)!).filter(Boolean);
}
