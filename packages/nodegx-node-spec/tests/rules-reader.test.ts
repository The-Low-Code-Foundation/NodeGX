/**
 * NSP-018 AC2 — the rules reader (`scripts/node-spec/rules.js`), graded on fixture spec files beside a control on the real tree.
 *
 * The reader turns each said branch into `<case> → <what the wire carries>`. Its failure mode is a line that names FEWER
 * pulses than the branch sends: s73 found a ternary pulse (`emit: [on ? 'a' : 'b', 'switched']`) read as `['switched']`.
 * So every way the wire half can hide (a computed pulse, a computed outcome, a spread) must throw, and every way the
 * branches can live outside the reducer's own text (a helper called in it, a sibling file's helper, a reducer given by
 * name) must be followed.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rules = require('../../../scripts/node-spec/rules.js') as {
  readReducers: (dir?: string) => Record<string, Record<string, Array<{ says: string; outcome?: string; emit: string[]; file: string }>>>;
};

let dir: string;

/** One fixture directory per call: `files` written as `<name>.ts`, read with the reader. */
function read(files: Record<string, string>) {
  const d = fs.mkdtempSync(path.join(dir, 'f-'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(d, `${name}.ts`), text);
  return rules.readReducers(d);
}

const spec = (reducers: string, preamble = '') =>
  `${preamble}\nexport const X = defineNode({ type: 'X', idioms: [{ says: 'an idiom', example: 'x()' }] }).on({\n${reducers}\n});\n`;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-reader-'));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('the real tree (the control)', () => {
  it('Switch: each Flip case names the pulse it sends, and the other as silent', () => {
    const flip = rules.readReducers().Switch.flip;
    expect(flip.map((b) => b.emit)).toEqual([
      ['switchedToOff', 'switched'],
      ['switchedToOn', 'switched']
    ]);
  });

  it("the Variables' words come from the shared helper, for each of the four", () => {
    const all = rules.readReducers();
    for (const type of ['Boolean', 'Number', 'String', 'Color']) {
      expect(all[type].value.map((b) => b.file)).toEqual(Array(4).fill('packages/nodegx-node-spec/src/nodes/variable-base.ts'));
      expect(all[type].value[3].emit).toEqual(['changed']);
      expect(all[type].saveValue).toHaveLength(1); // `saveValue: onSet` — a reducer given by name
      expect(all[type].saveValue[0].outcome).toBe('deferred'); // `'deferred' as const`
    }
  });
});

describe('fixtures — what the reader follows', () => {
  it('literal branches, in source order; an idiom is not a branch', () => {
    const r = read({ x: spec(`  go: (s) => (s.on ? { says: 'on', emit: ['a', 'b'], outcome: 'done' } : { says: 'off', outcome: 'unchanged' })`) });
    expect(r.X.go).toEqual([
      expect.objectContaining({ says: 'on', emit: ['a', 'b'], outcome: 'done' }),
      expect.objectContaining({ says: 'off', emit: [], outcome: 'unchanged' })
    ]);
  });

  it('a helper in the same file, called in the reducer', () => {
    const r = read({ x: spec(`  go: (s) => helper(s)`, `function helper(s) { return s ? { says: 'yes', emit: ['a'] } : { says: 'no' }; }`) });
    expect(r.X.go.map((b) => b.says)).toEqual(['yes', 'no']);
  });

  it("a helper imported from a sibling file, and a reducer given by name — each read once", () => {
    const r = read({
      base: `export function onGo(s) { return { says: 'from base', emit: ['a'] }; }\nexport const named = () => ({ says: 'named', outcome: 'done' as const });`,
      x: spec(`  go: (s) => onGo(s),\n  stop: named,\n  again: (s) => onGo(onGo(s))`, `import { onGo, named } from './base';`)
    });
    expect(r.X.go).toEqual([expect.objectContaining({ says: 'from base', emit: ['a'], file: expect.stringMatching(/base\.ts$/) })]);
    expect(r.X.stop).toEqual([expect.objectContaining({ says: 'named', outcome: 'done' })]);
    expect(r.X.again).toHaveLength(1);
  });

  it('a reducer with no said branch reads as []', () => {
    expect(read({ x: spec(`  go: (s) => ({ set: { n: 1 } })`) }).X.go).toEqual([]);
  });
});

describe('fixtures — what the reader refuses (a line that would name fewer pulses than the branch sends)', () => {
  it.each([
    ['a ternary pulse', `{ says: 'flip', emit: [s ? 'a' : 'b', 'c'] }`, 'emit'],
    ['a computed pulse list', `{ says: 'flip', emit: s.list }`, 'emit'],
    ['a computed outcome', `{ says: 'go', outcome: s ? 'done' : 'unchanged' }`, 'outcome'],
    ['a spread', `{ says: 'go', ...more(s) }`, '...spread'],
    ['a computed says', `{ says: 'a' + s }`, 'string literal']
  ])('%s throws, naming the file and the reducer', (_label, branch, what) => {
    expect(() => read({ x: spec(`  go: (s) => (${branch})`) })).toThrow(new RegExp(`x\\.ts:\\d+: X\\.go — .*${what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  it('the same branches split into literal cases read clean (the control for the plants above)', () => {
    const r = read({ x: spec(`  go: (s) => (s ? { says: 'one', emit: ['a', 'c'] } : { says: 'two', emit: ['b', 'c'] })`) });
    expect(r.X.go.map((b) => b.emit)).toEqual([
      ['a', 'c'],
      ['b', 'c']
    ]);
  });
});
