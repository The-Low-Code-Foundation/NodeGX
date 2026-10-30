// OWN-034 §5 — every question the harness asks, in one place. `node harness.mjs --questions` writes questions.md from
// this file and blocks.mjs, so the document and the run cannot drift apart. Each question is one system line and one
// user message, no history: the request, the card of answers so far, and the question with every option in the words
// (OWN-027's rule). Ollama's `format` is the schema, so an answer outside the options cannot parse.

export const SYSTEM = 'You answer one question about building an app. Reply with JSON only, matching the schema. Be brief.';

export const cardText = (req, card) => `Request: "${req}"\nDecided so far: ${JSON.stringify(card)}`;

// Tuning rules, stated before the run they apply to and recorded in its ledger. Only ever tuned on the habit brief.
export const TUNINGS = {
  T1: 'T1 (2026-10-30, after the first G4 and G2 runs, which both left "untick" out and failed B7): a mark a person can make, they can take back. The tick block always toggles, and "untick" leaves the actions menu. Every DeepSeek app built the undo unasked; in code it comes free with a toggle, and only the menu had made it a separate decision.'
};

export const ACTIONS = { add: 'add a new item by typing its name', delete: 'delete an item', 'tick for today': 'mark an item done for today', untick: 'undo today\'s mark', rename: 'change an item\'s name' };
export const NUMBERS = { streak: 'days in a row, ending today or yesterday', 'done this week': 'how many of the last 7 days were done', 'done today out of all': 'how many items are done today, out of all of them', 'best streak': 'the longest run of days ever' };
export const VIEWS = { 'the last days per item': 'each item shows its last few days, done or not', 'a summary at the top': 'one line at the top about today' };
const list = (o) => Object.entries(o).map(([k, v]) => `- ${k}: ${v}`).join('\n');

export const Q = {
  noun: (req, card) => ({
    user: `${cardText(req, card)}\nThe app keeps a list. What is ONE item in that list called? One word, singular, lower case.`,
    schema: { type: 'object', required: ['noun'], properties: { noun: { type: 'string', maxLength: 24 } } }
  }),
  perDay: (req, card) => ({
    user: `${cardText(req, card)}\nWhat does each item record per day? Answer one of:\n- done or not: a day is either done or not done\n- a number: how many or how much, per day`,
    schema: { type: 'object', required: ['perDay'], properties: { perDay: { type: 'string', enum: ['done or not', 'a number'] } } }
  }),
  // `menu`: the actions offered. Tuning T1 takes "untick" out, because the tick block then always undoes.
  actions: (req, card, menu = ACTIONS) => ({
    user: `${cardText(req, card)}\nWhich actions does the person need? Choose every one that the request needs:\n${list(menu)}`,
    schema: { type: 'object', required: ['actions'], properties: { actions: { type: 'array', minItems: 1, maxItems: Object.keys(menu).length, uniqueItems: true, items: { type: 'string', enum: Object.keys(menu) } } } }
  }),
  askBeforeDelete: (req, card) => ({
    user: `${cardText(req, card)}\nWhen the person deletes an item, should the app ask "are you sure?" first? Answer yes or no.`,
    schema: { type: 'object', required: ['askBeforeDelete'], properties: { askBeforeDelete: { type: 'string', enum: ['yes', 'no'] } } }
  }),
  views: (req, card) => ({
    user: `${cardText(req, card)}\nThe items are shown as a list, one row each. Which of these does the request also need? Choose none, one or both:\n${list(VIEWS)}`,
    schema: { type: 'object', required: ['views'], properties: { views: { type: 'array', minItems: 0, maxItems: 2, uniqueItems: true, items: { type: 'string', enum: Object.keys(VIEWS) } } } }
  }),
  dayCount: (req, card) => ({
    user: `${cardText(req, card)}\nHow many days back should each item show? Answer one of: 5, 7, 14.`,
    schema: { type: 'object', required: ['dayCount'], properties: { dayCount: { type: 'string', enum: ['5', '7', '14'] } } }
  }),
  numbers: (req, card) => ({
    user: `${cardText(req, card)}\nWhich numbers should the app show? Choose every one that the request needs (none is allowed):\n${list(NUMBERS)}`,
    schema: { type: 'object', required: ['numbers'], properties: { numbers: { type: 'array', minItems: 0, maxItems: 4, uniqueItems: true, items: { type: 'string', enum: Object.keys(NUMBERS) } } } }
  }),
  // OWN-032 rule D: the request names no look, so ask the three-way question.
  look: (req, card) => ({
    user: `${cardText(req, card)}\nWhich look should the app have? Answer one of:\n- clean: calm, neutral, plenty of white\n- bold: vivid colour, rounded, lively\n- warm: soft pastel colours, large rounded corners`,
    schema: { type: 'object', required: ['look'], properties: { look: { type: 'string', enum: ['clean', 'bold', 'warm'] } } }
  })
};

// The words, one call per section (OWN-029's grain). Each field says where it is shown.
const words = (fields) => ({ type: 'object', required: Object.keys(fields), properties: Object.fromEntries(Object.entries(fields).map(([k, [n]]) => [k, { type: 'string', maxLength: n }])) });
const fieldList = (fields) => Object.entries(fields).map(([k, [n, where]]) => `- ${k} (max ${n} characters): ${where}`).join('\n');
const W = (section, fields) => (req, card) => ({
  user: `${cardText(req, card)}\nWrite the words for the ${section}. Plain words, no markdown, no quotes, no example items.\n${fieldList(fields)}`,
  schema: words(fields)
});

export const WORDS = {
  header: { title: [32, 'the app\'s title at the top of the page'], subtitle: [80, 'one line under the title'] },
  add: { placeholder: [40, 'the hint inside the empty field where a new item\'s name is typed'], button: [16, 'the button that adds it'] },
  empty: { text: [90, 'the line shown while the list is empty'] },
  row: (w) => ({
    ...(w.tick ? { tick: [24, 'the button on an item that marks it done for today'], ticked: [24, 'the same button once it is done today'] } : {}),
    ...(w.del ? { delete: [12, 'the button that deletes an item'] } : {}),
    ...(w.del && w.ask ? { confirm: [60, 'the question asked before an item is deleted'] } : {}),
    ...(w.numbers.includes('streak') ? { streak: [20, 'shown after the streak number, as in "4 …"'] } : {}),
    ...(w.numbers.includes('best streak') ? { best: [20, 'shown after the best streak number, as in "9 …"'] } : {}),
    ...(w.numbers.includes('done this week') ? { week: [20, 'shown after how many of the last 7 days were done, as in "5 …"'] } : {})
  }),
  summary: { label: [30, 'shown after the count at the top, as in "3 of 5 …"'] }
};
export const wordsQ = (section, fields) => W(section, fields);
