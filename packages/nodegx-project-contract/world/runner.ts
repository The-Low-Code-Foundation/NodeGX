/**
 * P116 ONT-002 — the conversation is a runner.
 *
 * A question is asked only when a mistake would survive without its answer. `nextQuestions()`
 * reads a world, makes every mutant of it (ONT-005), keeps the ones that stand without an
 * engine, and returns the questions that kill them — in the person's nouns, each with the
 * mistake it stands for and the incident behind it. Nothing else is asked.
 *
 * Three questions no kind carries are asked here too, each with a home for its answer, so
 * it is asked once: which noun is who signs in (`nouns[].signsIn`, needed before a permission
 * rule can start — ONT-004), through what an owned-by's owner is reached from the login
 * (`relations[].through`, a chain — s14), and whether a noun's text fields are free words or one
 * of a fixed list (`properties[].freeWords`, the kind-picker ONT-005 AC3 showed the vocabulary
 * silent on).
 *
 * The budget (§3.3): questions are ranked by the incident behind them — one somebody wrote
 * down after it happened (a note), one Richard lived (his rows), or none yet (read off a
 * schema) — then by how often the kind occurs in the corpus, then in the kind's own order.
 * The top few are returned; the rest wait, counted. A question with no incident behind it is
 * asked only while a mutant stands, and after every question that has one.
 */
import { WORLD_FILES, type Noun, type Relation, type ThroughStep, type WorldFiles } from './files';
import type { Question } from './kind';
import { answerMatters, askWords, gradeStatically, worldMutants, type WorldMutant } from './mutants';
import { NOUN_FACTS, NUMBER_QUESTIONS, nounAskWords, nounQuestion, nounSeedFor } from './noun';
import { ownerRule } from './paths';
import { LOGIN_FIELD, loginHop, type WorldSchema } from './project';
import { validateWorld, type WorldProblem } from './validate';
import { kindById } from './vocabulary';

/** How many questions a report hands over at once. Five is few enough to answer in one sitting. */
export const QUESTION_BUDGET = 5;

/** Where a question came from, which is what ranks it. */
export type IncidentSource = 'note' | 'oral' | 'census' | 'task';

export interface Incident {
  /** `note`: written down after it happened. `oral`: one of Richard's rows. `census`: read off a schema; `task`: ONT-005's list. Nobody has lived the last two yet. */
  from: IncidentSource;
  /** What happened, or would, in the words of whoever lived it. */
  prevents: string;
}

export type QuestionAbout =
  | { relation: string; kind: string }
  /** The kind-picker: one question per world, about every text field nobody has said is free words or a list. */
  | { fields: Array<{ noun: string; property: string }> }
  /** Which noun is who signs in. */
  | { world: 'signsIn'; nouns: string[] }
  /** P116 ONT-011 step 2: one of the noun's own questions (`NOUN_QUESTIONS`), for these nouns at once. */
  | { nouns: string[]; question: string };

export interface NextQuestion {
  about: QuestionAbout;
  /** The answer's key: a question id of the kind (or of the noun), `through`, `freeWords`, or `signsIn`. */
  question: string;
  /** The question in the person's nouns. */
  ask: string;
  /** What an answer looks like. */
  answer: string;
  /** Where the answer is written, as a path into the files. */
  home: string;
  /** The mutants that stand until it is answered: ids from `worldMutants()`, or a kind's seed as `<kind>/<seed>`. Empty only for a question with a lived incident behind it. */
  mutants: string[];
  /** The mistake the first of them is, in words; for a question with no standing mutant, the incident's. */
  mistake: string;
  incident: Incident;
  /** What an answer changes: the kind, the schema, or only what is written down. */
  changes: 'the kind' | 'the schema' | 'the record';
}

export interface AnswerRecord {
  /** The relation answered — or, for one of a noun's own questions (ONT-011 step 2), the noun, with `kind: 'noun'`. */
  relation: string;
  kind: string;
  question: string;
  ask: string;
  said: string | boolean;
  /** `asked`: the runner would have asked it. `volunteered`: no answer to it changes the schema or the kind. */
  how: 'asked' | 'volunteered';
  /** Answered by a verb's failure arm, not in the relation's answers (s10): `said` is what the person sees when it is taken. */
  by?: { verb: string; step: string; arm: string };
}

export interface ForTheRecord {
  relation: string;
  kind: string;
  question: string;
  ask: string;
  why: string;
}

export type RunnerReport =
  | {
      ok: true;
      /** The next questions, ranked, at most the budget. */
      ask: NextQuestion[];
      /** How many more stand behind them. */
      waiting: number;
      /** Nothing stands: the world is described enough to build. */
      enough: boolean;
      /** What it asked and what the person said (README §2, *See it*). */
      record: AnswerRecord[];
      /** Unanswered questions no answer would change anything by: never asked, listed. */
      forTheRecord: ForTheRecord[];
      /** The honesty number for the ontology (ONT-002 §5): answers nothing asked for. */
      volunteered: number;
      schema: WorldSchema;
    }
  | { ok: false; problems: WorldProblem[] };

const RANK: Record<IncidentSource, number> = { note: 0, oral: 1, census: 2, task: 2 };
/** Behind every relation question: the kind-picker fires for every text field of every world, so it waits. */
const PICKER_RANK = 3;
/** A question somebody paid for is asked whether or not a mutant stands; the rest wait for one (§3.3). */
const lived = (from: IncidentSource): boolean => from === 'note' || from === 'oral';
const answerWords = (q: Question): string =>
  q.answer.type === 'yes-no'
    ? 'yes or no'
    : q.answer.type === 'one-of'
      ? `one of ${q.answer.values.join(', ')}`
      : q.answer.type === 'fields'
        ? 'the names of its details, comma-separated, or "nothing"'
        : q.answer.type === 'field'
          ? 'the name of one of its details'
          : 'words';
const list = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** A mutant that stands without an engine: it survives, or the engine would have to decide. */
function stands(right: WorldSchema, m: WorldMutant): boolean {
  const v = gradeStatically(right, m);
  return v.verdict === 'survives' || v.verdict === 'run';
}

interface Ranked {
  q: NextQuestion;
  key: [number, number, number, number];
}

/**
 * The next questions for a world. Deterministic: the same files give the same list in the
 * same order. A world the validator refuses gets its problems, not questions.
 */
export function nextQuestions(files: WorldFiles, options: { limit?: number } = {}): RunnerReport {
  const verdict = validateWorld(files as unknown as Record<string, unknown>);
  if (!verdict.ok) return { ok: false, problems: verdict.problems };
  const limit = options.limit ?? QUESTION_BUDGET;
  const { right, mutants, inert } = worldMutants(files);
  const relations = files.relations.relations;
  const nouns = files.nouns.nouns;
  const ranked: Ranked[] = [];
  const record: AnswerRecord[] = [];
  const forTheRecord: ForTheRecord[] = [];
  const inertOf = (r: Relation, qid: string) => inert.find((i) => i.relation === r.id && i.question === qid);
  // A failure arm that `answers` a question answers it in its words: what is skipped and what the person sees (ONT-006 §6.5).
  const byArm = new Map<string, { said: string; by: NonNullable<AnswerRecord['by']> }>();
  for (const v of files.verbs?.verbs || [])
    for (const st of v.steps)
      for (const arm of st.fails || []) {
        const key = arm.answers && `${arm.answers.relation}/${arm.answers.question}`;
        if (key && !byArm.has(key)) byArm.set(key, { said: arm.sees, by: { verb: v.id, step: st.id, arm: arm.id } });
      }

  relations.forEach((r, ri) => {
    const kind = kindById(r.kind)!;
    const answers = r.answers || {};
    kind.questions.forEach((q, qi) => {
      const ask = askWords(q, r);
      const arm = q.id in answers ? undefined : byArm.get(`${r.id}/${q.id}`);
      if (q.id in answers || arm) {
        // Volunteered: answered, and the runner would not have asked — no incident behind it, no
        // seed of the kind killed by it, and no answer to it would change the kind or the schema.
        const wouldAsk = lived(q.from) || kind.mutants.some((m) => m.kills === q.id) || answerMatters(files, r.id, q) !== false;
        const how = wouldAsk ? 'asked' : 'volunteered';
        record.push(arm ? { relation: r.id, kind: kind.id, question: q.id, ask, said: arm.said, how, by: arm.by } : { relation: r.id, kind: kind.id, question: q.id, ask, said: answers[q.id], how });
        return;
      }
      // The mutants this question kills, standing: its own (unanswered), and the kind's seeds it kills.
      const own = mutants.filter((m) => 'relation' in m.of && m.of.relation === r.id && 'question' in m.kills && m.kills.question === q.id && stands(right, m));
      if (!own.length && !lived(q.from)) {
        const i = inertOf(r, q.id);
        forTheRecord.push({ relation: r.id, kind: kind.id, question: q.id, ask, why: i ? i.why : 'every mistake it would stop is already stopped' });
        return;
      }
      const unanswered = own.find((m) => 'unanswered' in m.shape);
      const changes: NextQuestion['changes'] = unanswered
        ? /changes the kind/.test(unanswered.mistake)
          ? 'the kind'
          : 'the schema'
        : 'the record';
      ranked.push({
        q: {
          about: { relation: r.id, kind: kind.id },
          question: q.id,
          ask,
          answer: answerWords(q),
          home: `relations[${r.id}].answers.${q.id}`,
          mutants: own.map((m) => m.id),
          mistake: own.length ? own[0].mistake : q.prevents,
          incident: { from: q.from, prevents: q.prevents },
          changes
        },
        key: [RANK[q.from], -kind.evidence.rows, qi, ri]
      });
    });
  });

  // Who signs in: asked once a rule needs a start (an owned-by) and no noun says so.
  const owned = relations.filter((r) => r.kind === 'owned-by');
  if (owned.length && !loginHop(right)) {
    const ownedBy = kindById('owned-by')!;
    const path = ownedBy.questions.find((q) => q.id === 'path')!;
    const standing = mutants.filter((m) => 'relation' in m.of && owned.some((r) => r.id === (m.of as { relation: string }).relation) && m.seeds.includes('visible-to-all') && stands(right, m));
    const ids = nouns.map((n) => n.id);
    ranked.push({
      q: {
        about: { world: 'signsIn', nouns: ids },
        question: 'signsIn',
        ask: `Which of these is the person who signs in — ${list(ids)}? ${owned.map((r) => `"${r.sentence}"`).join(' ')} ${owned.length === 1 ? 'is a rule' : 'are rules'} about who may see what, and a rule starts from whoever is signed in.`,
        answer: 'a noun',
        home: `nouns[<the noun>].signsIn`,
        mutants: standing.length ? standing.map((m) => m.id) : [`owned-by/visible-to-all`],
        mistake: `a rule about who may see ${a(owned[0].from)} that cannot start from the login, so nothing enforces it`,
        incident: { from: path.from, prevents: path.prevents },
        changes: 'the schema'
      },
      key: [RANK[path.from], -ownedBy.evidence.rows, ownedBy.questions.indexOf(path), relations.length]
    });
  }

  // Through what (s14): an owned-by that belongs to someone through a chain, once a noun signs in —
  // the chain starts there, so before that the signsIn question is the one asked. A chain that is
  // said and does not compile is refused, like any answer the world cannot hold.
  const signs = nouns.find((n) => n.signsIn);
  for (const [ri, r] of relations.entries()) {
    if (r.kind !== 'owned-by' || r.answers?.path !== true || !signs || !loginHop(right)) continue;
    const ownedBy = kindById('owned-by')!;
    const path = ownedBy.questions.find((q) => q.id === 'path')!;
    const ask = `"${r.sentence}" — through what is the ${r.to} ${a(r.from)} belongs to reached from the ${signs.id} who signs in? Name the relations from the ${signs.id} to the ${r.to}, in order.`;
    if (r.through) {
      const compiled = ownerRule(right, files, r.id);
      if (compiled.ok === false) return { ok: false, problems: [{ file: WORLD_FILES.relations, at: `relations[${ri}].through`, expected: 'a chain the schema can follow', message: compiled.problem }] };
      record.push({ relation: r.id, kind: ownedBy.id, question: 'through', ask, said: chainWords(r.through), how: 'asked' });
      continue;
    }
    const standing = mutants.filter((m) => 'relation' in m.of && m.of.relation === r.id && m.seeds.includes('visible-to-all') && stands(right, m));
    ranked.push({
      q: {
        about: { relation: r.id, kind: ownedBy.id },
        question: 'through',
        ask,
        answer: `a list of steps, each { "relation": <id> }, with "where" to say which records it lands on (as holder: { "role": "holder" }), from the ${signs.id} to the ${r.to}`,
        home: `relations[${r.id}].through`,
        mutants: standing.length ? standing.map((m) => m.id) : [`owned-by/visible-to-all`],
        mistake: `a rule about who may see ${a(r.from)} that says "through a chain" and names none, so nothing enforces it`,
        incident: { from: path.from, prevents: path.prevents },
        changes: 'the schema'
      },
      key: [RANK[path.from], -ownedBy.evidence.rows, ownedBy.questions.indexOf(path), ri]
    });
  }

  // The noun's own questions (ONT-011 step 2): the five facts, one question per fact for the whole
  // world naming the nouns that have not answered — after every relation question, like the
  // picker, or they would outrank what the person said about how things join; then, per noun
  // whose number is read aloud, the three about the number. An answered one is in the record.
  NOUN_FACTS.forEach((qid, qi) => {
    const q = nounQuestion(qid)!;
    const seed = nounSeedFor(qid)!;
    const open: Noun[] = [];
    for (const n of nouns) {
      if (qid in (n.answers || {})) {
        record.push({ relation: n.id, kind: 'noun', question: qid, ask: nounAskWords(q, n.id), said: n.answers![qid], how: 'asked' });
        continue;
      }
      if (qid === 'calledBy' && !(n.properties || []).length) continue; // nothing to call it by
      open.push(n);
    }
    if (!open.length) return;
    const standing = mutants.filter((m) => 'question' in m.of && m.of.question === qid && open.some((n) => n.id === (m.of as { noun: string }).noun) && stands(right, m));
    const named = open.map((n) => n.id);
    ranked.push({
      q: {
        about: { nouns: named, question: qid },
        question: qid,
        ask: `${nounAskWords(q, open[0].id)}${open.length > 1 ? ` The same for ${list(named.slice(1).map(a))}.` : ''}`,
        answer: answerWords(q),
        home: `nouns[<the noun>].answers.${qid}`,
        mutants: standing.length ? standing.map((m) => m.id) : [`noun/${seed.id}`],
        mistake: seed.mistake.replace(/\{noun\}/g, open[0].id),
        incident: { from: q.from, prevents: q.prevents },
        changes: qid === 'calledBy' ? 'the record' : 'the schema'
      },
      key: [PICKER_RANK, 0, qi, relations.length + 1]
    });
  });
  nouns.forEach((n, ni) => {
    if (n.answers?.readAloud !== true) return;
    NUMBER_QUESTIONS.forEach((qid, qi) => {
      const q = nounQuestion(qid)!;
      const ask = nounAskWords(q, n.id);
      if (qid in n.answers!) {
        record.push({ relation: n.id, kind: 'noun', question: qid, ask, said: n.answers![qid], how: 'asked' });
        return;
      }
      ranked.push({
        q: {
          about: { nouns: [n.id], question: qid },
          question: qid,
          ask,
          answer: answerWords(q),
          home: `nouns[${n.id}].answers.${qid}`,
          mutants: [`noun/${nounSeedFor('readAloud')!.id}`],
          mistake: q.prevents,
          incident: { from: q.from, prevents: q.prevents },
          changes: 'the record'
        },
        key: [RANK[q.from], 0, NOUN_FACTS.length + qi, ni]
      });
    });
  });

  // The kind-picker: every text field nobody has said is free words, nor made a one-of. One
  // question for the whole world, after every relation question, or it is asked once per noun
  // and outranks the questions about what the person said (measured on the every-kind world:
  // eight of ten).
  const oneOf = kindById('one-of')!;
  const picker = oneOf.mutants.find((m) => m.id === 'category-as-text')!;
  const needsDetails = oneOf.questions[0];
  const fields = nouns.flatMap((n) =>
    (n.properties || [])
      .filter((p) => p.kind === 'text' && !p.freeWords && !relations.some((r) => r.kind === 'one-of' && r.from === n.id && r.property === p.name))
      .map((p) => ({ noun: n.id, property: p.name }))
  );
  if (fields.length) {
    const named = fields.map((f) => `${a(f.noun)}'s ${f.property}`);
    ranked.push({
      q: {
        about: { fields },
        question: 'freeWords',
        ask:
          fields.length === 1
            ? `There is one text field, ${named[0]}. Is it one of a fixed list? If not, it is free words.`
            : `These are text fields: ${list(named)}. Which of them are one of a fixed list? The rest are free words.`,
        answer: 'For each field on a fixed list: make it a choice with its values, and add a one-of relation for who adds to the list. For a field of free words: freeWords: true.',
        home: `nouns[<the noun>].properties[<the field>].freeWords, or a one-of relation`,
        mutants: [`${oneOf.id}/${picker.id}`],
        mistake: picker.mistake.replace(/\{from\}/g, fields[0].noun).replace(/\{field\}/g, fields[0].property),
        incident: { from: picker.from, prevents: needsDetails.prevents },
        changes: 'the schema'
      },
      key: [PICKER_RANK, 0, NOUN_FACTS.length + NUMBER_QUESTIONS.length, relations.length + 1]
    });
  }

  ranked.sort((x, y) => x.key[0] - y.key[0] || x.key[1] - y.key[1] || x.key[2] - y.key[2] || x.key[3] - y.key[3]);
  const ask = ranked.slice(0, limit).map((x) => x.q);
  return {
    ok: true,
    ask,
    waiting: Math.max(0, ranked.length - ask.length),
    enough: ranked.length === 0,
    record,
    forTheRecord,
    volunteered: record.filter((x) => x.how === 'volunteered').length,
    schema: right
  };
}

/** The noun that signs in, by id, or undefined. */
export function whoSignsIn(files: WorldFiles): Noun | undefined {
  return files.nouns.nouns.find((n) => n.signsIn);
}

export { LOGIN_FIELD };

const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A chain in words, for the record: "membership where role is holder, then …". */
function chainWords(steps: readonly ThroughStep[]): string {
  if (!steps.length) return 'directly: the owner is whoever signs in';
  return steps
    .map((st) => `${st.relation}${st.back ? ' (read back)' : ''}${st.where ? ` where ${Object.entries(st.where).map(([k, v]) => `${k} is ${String(v)}`).join(' and ')}` : ''}`)
    .join(', then ');
}
