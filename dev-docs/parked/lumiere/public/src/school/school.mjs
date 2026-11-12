// The questions at work (round 9): one place that knows every subject, topic and skill, and asks a question for what
// the child chose. Richard, 10-29: "let the kids choose what they want to practise, and make the menu level based like
// CE2 / 6eme … and within that the sub topics", and "copy the question architecture from the Rocket School".
//
// The skills come from three places, all in one shape ({ id, year, subject, topic, generator, params, name, strategy }):
//   rocket.mjs   Rocket School's maths, French, English and history, and Star Class's science and counting (generated
//                by tools/export-questions.mjs; Rocket School's own engine makes each question)
//   france.mjs   geography for a child in France (Star Class's is Africa's)
//   stem.mjs     round 8's lab questions, as the science topic "In the lab" (the only science for CP and CE1)
// A year asks what that year and the two before it teach (Rocket School's rule, cut at two years), its own year most. Never the seeded
// dice: Math.random, as for every question (page.mjs).
import { YEARS, SKILLS as ROCKET_SKILLS, TOPICS as ROCKET_TOPICS, generate } from './rocket.mjs';
import { FRANCE_SKILLS, FRANCE_TOPICS } from './france.mjs';
import { KINDS, taskOfKind } from './stem.mjs';

export { YEARS };
export const DEFAULT_YEAR = 'CE2';
// The subjects, each with its station at work (world.mjs `station`), in the order the office shows them.
export const SUBJECTS = ['maths', 'science', 'geography', 'french', 'english', 'history'];

const LAB = KINDS.filter((k) => k.science).map((k) => ({ id: `lab-${k.id}`, year: k.known, subject: 'science', topic: 'lab', lab: k.id, name: k.id, strategy: '' }));
// Star Class's geography stays out for now: it is about Africa (its rivers and capitals), written for Nigerian
// classrooms. Its science stays in (what plants need is the same everywhere).
export const SKILLS = [...ROCKET_SKILLS.filter((s) => s.subject !== 'geography'), ...FRANCE_SKILLS, ...LAB];
export const TOPICS = [...ROCKET_TOPICS, ...FRANCE_TOPICS, { id: 'lab', subject: 'science', name: 'In the lab' }].filter((t) => SKILLS.some((s) => s.topic === t.id));
const yi = (y) => YEARS.indexOf(y);
// What a year asks: its own work and the two years before (a 6e player is not asked to count goats).
const REACH = 2;
const inReach = (s, y) => yi(s.year) <= y && yi(s.year) >= y - REACH;

// The topics of a subject a year can choose from: the ones with something in reach (that year or the two before). A subject with
// nothing that young (history in CP) offers its youngest topics, marked with their year.
export function topicsFor(subject, year) {
  const y = yi(year);
  const rows = TOPICS.filter((t) => t.subject === subject).map((t) => {
    const skills = SKILLS.filter((s) => s.topic === t.id);
    const first = skills.reduce((m, s) => Math.min(m, yi(s.year)), 99);
    return { id: t.id, name: t.name, count: skills.filter((s) => inReach(s, y)).length, from: YEARS[first] };
  });
  const open = rows.filter((r) => r.count > 0);
  if (open.length) return open;
  const youngest = Math.min(...rows.map((r) => yi(r.from)));
  return rows.filter((r) => yi(r.from) === youngest).map((r) => ({ ...r, above: true }));
}

// What the child has met (Rocket School's model: per skill, the list items they got right), so a list asks the ones
// not yet learned more often, and the same skill isn't asked twice running when there is another.
const model = { skills: {}, lastSkill: '' };

// A question: { skill, prompt, choices (at most four, shuffled), answer (its index), explain }.
export function ask({ subject, topic = null, year = DEFAULT_YEAR }, random = Math.random) {
  const y = yi(year);
  const all = SKILLS.filter((s) => s.subject === subject && (!topic || s.topic === topic));
  let pool = all.filter((s) => inReach(s, y));
  if (!pool.length) {
    const youngest = Math.min(...all.map((s) => yi(s.year)));
    pool = all.filter((s) => yi(s.year) === youngest);
  }
  if (pool.length > 1) pool = pool.filter((s) => s.id !== model.lastSkill);
  // This year's work counts most (×3), last year's ×2, older ×1; a harder skill (diff) a little less often.
  const weight = (s) => [3, 2, 1][Math.min(2, Math.max(0, y - yi(s.year)))] * (1.2 - (s.diff ?? 0.5) * 0.4);
  let r = random() * pool.reduce((sum, s) => sum + weight(s), 0);
  const skill = pool.find((s) => (r -= weight(s)) <= 0) ?? pool[0];
  model.lastSkill = skill.id;
  if (skill.lab) {
    const task = taskOfKind(skill.lab, random);
    return { skill, prompt: task.text, choices: task.choices, answer: task.answer, explain: task.explain };
  }
  const q = generate(skill, model);
  // Rocket School's options: the answer first, then its distractors. Four at most, shuffled.
  const choices = [...new Set((q.options ?? []).map(String))].slice(0, 4);
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { skill, ...inWords(skill, q), choices, answer: choices.indexOf(String(q.answer)), itemKey: q.itemKey };
}

// Star Class's counting is written for children who cannot read yet: its questions are pictures and signs ("👆 ≠" for
// "tap the odd one out"). Richard, 11-01: "these should be stated in words not with emojis, an 8 year old can read
// fine". The piles stay pictures; the question and its explanation are said in words.
const KIND_OF = [
  ['fruit', 'a fruit', ['🥭', '🍌', '🍊', '🍍', '🍉']],
  ['animals', 'an animal', ['🐐', '🐔', '🐟', '🐄', '🦆']],
  ['things you ride in', 'something you ride in', ['🚲', '🚌', '🚗', '🛵']],
  ['things for school', 'something for school', ['✏️', '📚', '📏', '🎒']]
];
const kindOf = (thing) => KIND_OF.find(([, , things]) => things.includes(thing));
const count = (pile) => [...pile.replace(/\s/g, '')].filter((c) => /\p{Extended_Pictographic}/u.test(c)).length;
function inWords(skill, q) {
  const said = { prompt: q.prompt, explain: q.worked || skill.strategy };
  switch (skill.generator) {
    case 'countObjects':
      return { prompt: `How many are there?\n${q.prompt.replace(/\s*=\s*\?\s*$/, '')}`, explain: `There are ${q.answer}.` };
    case 'matchNumeral':
      return { prompt: `Which group has ${q.prompt}?`, explain: `That group has ${q.prompt}.` };
    case 'missingNumber':
      return { prompt: `Which number is missing?\n${q.prompt}`, explain: said.explain };
    case 'morePile': {
      const [a, b] = q.options.map(count);
      return { prompt: 'Which group has more?', explain: `${Math.max(a, b)} is more than ${Math.min(a, b)}.` };
    }
    case 'oddOne': {
      const others = q.options.filter((o) => o !== q.answer);
      if (skill.params?.byCount) return { prompt: 'Which group has a different number of things?', explain: `The others have ${count(others[0])} each. That group has ${count(q.answer)}.` };
      const odd = kindOf(q.answer), same = kindOf(others[0]);
      return { prompt: 'Which one does not belong with the others?', explain: odd && same ? `${others.join(' ')} are ${same[0]}. ${q.answer} is ${odd[1]}.` : `${q.answer} is not like the others.` };
    }
  }
  return said;
}

// After an answer: a list item got right is "learned", and asked less.
export function record(question, right) {
  if (!question.itemKey) return;
  const st = (model.skills[question.skill.id] ??= { items: {} });
  st.items[question.itemKey] = { ok: right };
  st.lastItem = question.itemKey;
}
