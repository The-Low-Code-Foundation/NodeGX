/**
 * NSP-023 AC4 — the guard: no visual spec takes React-made state (page-model.helper.ts holds the model and the rules;
 * page-model-plants.test.ts plants each shape in a copy of a spec and expects this guard to go red).
 * Each visual spec is played on the interpreter, wrapped, over its scenarios and 200 generated sequences on two seeds.
 */
import * as fs from 'fs';
import * as path from 'path';

import { specs } from '../src';
import { formatWorldKinds, guardFindings, isVisual, PAGE_MODELS, WORLD_KINDS } from './page-model.helper';

const SEEDS = (process.env.NSP_SEEDS ?? '13,20731').split(',').map(Number);
const N = Number(process.env.NSP_N ?? 200);

const visual = Object.values(specs).filter(isVisual);

test('every visual spec has a page model, and every model names a visual spec (G1)', () => {
  expect(visual.map((s) => s.type).sort()).toEqual(Object.keys(PAGE_MODELS).sort());
});

test("the format's world kinds are the pinned list — a new kind is sorted (NSP-023 §3) before it lands (G8)", () => {
  expect(formatWorldKinds(fs.readFileSync(path.join(__dirname, '..', 'src', 'spec.ts'), 'utf8'))).toEqual([...WORLD_KINDS]);
});

test.each(visual.map((s) => [s.type, s] as const))('%s keeps React out of its state (G1–G8)', async (_type, spec) => {
  const out = await guardFindings(spec, PAGE_MODELS[spec.type], SEEDS, N);
  if (out.length) console.log(`${spec.type}\n  ${out.join('\n  ')}`);
  expect(out).toEqual([]);
}, 600_000);
