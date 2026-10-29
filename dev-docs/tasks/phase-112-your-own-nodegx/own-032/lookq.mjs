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
