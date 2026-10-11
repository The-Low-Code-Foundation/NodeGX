/**
 * P116 ONT-011 step 2 — the facts about a thing: what a noun is asked on its own.
 *
 * The kinds (`kinds.ts`) are relations, read off what joins two things. Frappe's DocType also
 * says a handful of things about ONE kind of record, and step 1's census found rows for four of
 * them in the same eight apps (`KINDS.md`, "What Frappe asks": *facts* 55 rows, *secret* 16).
 * Those are not kinds — a fact has no `from` and `to` — so they live here as the questions a
 * noun carries, declared the way a kind declares its questions: DATA, each with the incident it
 * prevents and the shape of its answer, so the runner (ONT-002) asks them by field. Their answers
 * go in `nouns[].answers` (`files.ts`), and `projectWorld()` reads them.
 *
 * Each question's projection and what grades it, in one line (the rest is in `project.ts`):
 *
 * - **onlyOne** → said, not held: "there is only one"; a claim measured to fail (the second record
 *   is taken). Across records, which no engine behind the contract keeps yet (ONT-013 step 4).
 * - **calledBy** → `calledBy` on the collection, a hint every view reads (ONT-008). The store has
 *   nothing to hold; the mistake (a list that shows ids) is the view's, graded by ONT-008's suite.
 * - **history** → a `<Noun>History` collection (the noun, `at`, `who`, `changed`), held; its
 *   writing on every save is a verb's or a trigger's, said as not kept.
 * - **readAloud** → a `number` field, unique and set once (held), and the series ONT-015 builds
 *   said in words with the three follow-ups (`looksLike`, `maySkip` — R-g, asked never assumed —
 *   and `restarts`); a claim measured to fail (a number used again after a delete).
 * - **secret** → said, not held, per detail the person marked `secret: true`; step 4 projects it to
 *   the per-field read rule R-a ruled for.
 */
import type { MutantSeed, Question } from './kind';

/** The questions a noun is asked, ranked: the first five once per world, the last three per noun whose number is read aloud. */
export const NOUN_QUESTIONS: readonly Question[] = Object.freeze([
  {
    id: 'onlyOne',
    ask: 'Is there only one {noun} — one record for the whole app, the way the settings or the association itself are?',
    prevents: 'a settings collection with three records, where the app read the first',
    answer: { type: 'yes-no' },
    from: 'census'
  },
  {
    id: 'calledBy',
    ask: 'In a list of {noun}s, what is one called — which of its details names it?',
    prevents: 'a list that shows ids',
    answer: { type: 'field' },
    from: 'census'
  },
  {
    id: 'history',
    ask: 'Do you need to know who changed what on a {noun}, and when?',
    prevents: 'a last-editor field where a history was wanted: the last person to touch the record, not what they changed',
    answer: { type: 'yes-no' },
    from: 'census'
  },
  {
    id: 'readAloud',
    ask: "Do people read a {noun}'s number aloud — on the phone, on a bill, at a stand?",
    prevents: 'a number counted in a workflow: used again after a delete, doubled under two creates at once',
    answer: { type: 'yes-no' },
    from: 'census'
  },
  {
    id: 'secret',
    ask: 'Is any detail on a {noun} not for everyone who can see the {noun}? If so, mark each one "secret": true.',
    prevents: 'salted verifiers of a code and a rescue answer sitting on a profile anyone could read',
    answer: { type: 'yes-no' },
    from: 'census'
  },
  // The three below are asked of a noun whose number is read aloud (ONT-015 §3.1's declaration, in the person's words).
  {
    id: 'looksLike',
    ask: "What does a {noun}'s number look like — INV-2026-0042, T-0042? Write the pattern with {YYYY}, {MM} and {####} for the counter.",
    prevents: 'invoice numbers in a format nobody said, changed after the first ones were sent',
    answer: { type: 'words' },
    from: 'oral'
  },
  {
    id: 'maySkip',
    ask: "If a save fails, may the number a {noun} would have had be skipped? (No: the number is taken inside the save, and two people creating at once wait for each other.)",
    prevents: 'a never-skip lock on every create where gaps did not matter — or a gap nobody could explain to an auditor where they did',
    answer: { type: 'yes-no' },
    from: 'oral'
  },
  {
    id: 'restarts',
    ask: "Does a {noun}'s number start again — each year, each month — or never?",
    prevents: 'a counter that never restarted where the law said it starts at 0001 each January',
    answer: { type: 'one-of', values: ['never', 'each year', 'each month'] },
    from: 'oral'
  }
]);

/** The five asked once per world; the rest follow `readAloud`. */
export const NOUN_FACTS: readonly string[] = Object.freeze(['onlyOne', 'calledBy', 'history', 'readAloud', 'secret']);
export const NUMBER_QUESTIONS: readonly string[] = Object.freeze(['looksLike', 'maySkip', 'restarts']);

/**
 * The mistakes a noun gets made as (ONT-005 §3 step 3's list for this borrow), each killed by one
 * of the questions above. `shape` is `unanswered`: the mistake and the schema without the answer
 * are the same thing, which is what `worldMutants()` makes of it.
 */
export const NOUN_MUTANTS: readonly MutantSeed[] = Object.freeze([
  {
    id: 'three-settings',
    mistake: 'a settings collection with three records, where the app reads the first',
    why: 'nothing said there is only one, so nothing stops a second; which one the app reads is luck',
    from: 'task',
    kills: 'onlyOne',
    shape: { unanswered: 'onlyOne' }
  },
  {
    id: 'list-shows-ids',
    mistake: 'a list of {noun}s that shows ids',
    why: 'nothing said what one is called, so every home-made view guesses',
    from: 'task',
    kills: 'calledBy',
    shape: { unanswered: 'calledBy' }
  },
  {
    id: 'last-editor-only',
    mistake: 'a last-editor field on a {noun} where a history was wanted',
    why: 'the last person to touch it is kept, and what they changed is gone',
    from: 'task',
    kills: 'history',
    shape: { unanswered: 'history' }
  },
  {
    id: 'number-reused',
    mistake: "a {noun}'s number counted in a workflow, and used again after a delete",
    why: 'two records have carried the same number; the one on the phone is not the one on file',
    from: 'task',
    kills: 'readAloud',
    shape: { unanswered: 'readAloud' }
  },
  {
    id: 'secret-readable',
    mistake: 'a secret on a {noun} whose readers should see the rest',
    why: 'the record is readable, so the secret on it is too',
    from: 'task',
    kills: 'secret',
    shape: { unanswered: 'secret' }
  }
]);

export const nounQuestion = (id: string): Question | undefined => NOUN_QUESTIONS.find((q) => q.id === id);
export const nounSeedFor = (question: string): MutantSeed | undefined => NOUN_MUTANTS.find((m) => m.kills === question);

/** "a person", "an account". */
const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

/** The question in the person's noun. */
export function nounAskWords(q: Question, noun: string): string {
  return q.ask
    .replace(/\ba \{noun\}s\b/g, `${noun}s`)
    .replace(/\{noun\}s\b/g, `${noun}s`)
    .replace(/\ba \{noun\}/g, a(noun))
    .replace(/\{noun\}/g, noun);
}
