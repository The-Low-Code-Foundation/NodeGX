// OWN-032 s3 — the look question, shared by probe-look.mjs and the arm's `--style auto`: which look does a person's
// request ask for? Asked with the two looks in both orders (5a: the first option draws odds on its own), the answer
// is the mean P(stylish). Between 0.3 and 0.7 the request does not say: the product should ask the person.
import { SYSTEM, chat, dist } from './door.mjs';

export const LOOKS = {
  minimal: 'clean and minimal: a plain light page, lots of space, quiet type',
  stylish: 'bold and stylish: a dark or colourful ground, a big heavy headline, a small line above it'
};
export const lookQuestion = (request, order) => `A person asked for a web page:\n"${request}"\n\nWhich look are they asking for?\n${order.map((k) => `- ${k}: ${LOOKS[k]}`).join('\n')}`;

export async function lookOf(model, request) {
  const per = {}, prompts = {};
  for (const order of [['minimal', 'stylish'], ['stylish', 'minimal']]) {
    prompts[order[0]] = lookQuestion(request, order);
    const j = await chat(model, [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompts[order[0]] }], { format: { type: 'object', properties: { pick: { type: 'string', enum: order } }, required: ['pick'] }, logprobs: true });
    per[order[0]] = { pick: JSON.parse(j.message.content).pick, pStylish: dist(j, order)?.find((x) => x.label === 'stylish')?.p ?? null };
  }
  const pStylish = +(((per.minimal.pStylish ?? 0) + (per.stylish.pStylish ?? 0)) / 2).toFixed(3);
  return { pStylish, style: pStylish >= 0.5 ? 'stylish' : 'minimal', undecided: pStylish > 0.3 && pStylish < 0.7, minimalFirst: per.minimal, stylishFirst: per.stylish, prompts };
}

// s6, three looks (the arm's `look3`): probe-look3.mjs's wording, word for word (9d: 24 of 24 requests that name a look),
// asked in all 6 orders; the answer is the look with the highest mean P, and `top` is that mean
export const LOOKS3 = { ...LOOKS, warm: 'warm and friendly: a soft light colour ground, rounded shapes, a welcoming headline' };
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
export const ORDERS3 = perms(Object.keys(LOOKS3));
export const lookQuestion3 = (request, order) => `A person asked for a web page:\n"${request}"\n\nWhich look are they asking for?\n${order.map((k) => `- ${k}: ${LOOKS3[k]}`).join('\n')}`;
export async function lookOf3(model, request) {
  const keys = Object.keys(LOOKS3), mean = Object.fromEntries(keys.map((k) => [k, 0])), picks = [];
  for (const order of ORDERS3) {
    const j = await chat(model, [{ role: 'system', content: SYSTEM }, { role: 'user', content: lookQuestion3(request, order) }], { format: { type: 'object', properties: { pick: { type: 'string', enum: order } }, required: ['pick'] }, logprobs: true });
    const d = dist(j, order) || [];
    for (const k of keys) mean[k] += (d.find((x) => x.label === k)?.p ?? 0) / ORDERS3.length;
    picks.push(JSON.parse(j.message.content).pick);
  }
  for (const k of keys) mean[k] = +mean[k].toFixed(3);
  const style = keys.reduce((a, b) => (mean[b] > mean[a] ? b : a));
  return { looks: 3, style, top: mean[style], mean, agree: picks.filter((p) => p === style).length, picks };
}

// s8, rule D (13c fitted, 13d held out 32 of 32; Richard: a request that names no look is asked "clean, bold or warm?"):
// first "do their words say how it should look?" (probe-look4.mjs Q_NAMED, word for word); where P(yes) ≥ 0.5 and the
// three-look question's top look is ≥ 0.9, that look; else the two-look rule (P(stylish) ≤ 0.1 minimal, ≥ 0.9 stylish),
// else `ask`
export const namedQuestion = (request, order) => `A person asked for a web page:\n"${request}"\n\nDo their words say anything about how the page should look or feel: its colours, its mood or its style?\n${order.map((k) => `- ${k}`).join('\n')}`;
export async function lookOfD(model, request) {
  let pNamed = 0;
  for (const order of [['yes', 'no'], ['no', 'yes']]) {
    const j = await chat(model, [{ role: 'system', content: SYSTEM }, { role: 'user', content: namedQuestion(request, order) }], { format: { type: 'object', properties: { answer: { type: 'string', enum: order } }, required: ['answer'] }, logprobs: true });
    pNamed += (dist(j, order)?.find((x) => x.label === 'yes')?.p ?? 0) / 2;
  }
  pNamed = +pNamed.toFixed(3);
  const three = await lookOf3(model, request), two = await lookOf(model, request);
  const named = pNamed >= 0.5 && three.top >= 0.9 ? three.style : null;
  const style = named || (two.pStylish <= 0.1 ? 'minimal' : two.pStylish >= 0.9 ? 'stylish' : 'ask');
  return { rule: 'D', style, pNamed, three: { style: three.style, top: three.top, mean: three.mean }, pStylish: two.pStylish };
}
