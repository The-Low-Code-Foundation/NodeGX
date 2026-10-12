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
  readReducers: (dir?: string) => Record<string, Record<string, Array<{ says: string; outcome?: string; emit: string[]; computed?: boolean; file: string }>>>;
  rulesInWords: (reducers: Record<string, unknown[]>, nameOf: (plug: string, port: string, strict?: boolean) => string | undefined) => Record<string, string[]>;
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

  it("s74: `said('words', patch)` — a computed patch's words, read as `computed`; its line is the words alone, no sibling named silent", () => {
    const r = read({ x: spec(`  go: (s) => (s.on ? { says: 'on', emit: ['a'] } : said('computed: whatever the draft sends', run(s)))`) });
    expect(r.X.go).toEqual([
      expect.objectContaining({ says: 'on', emit: ['a'] }),
      expect.objectContaining({ says: 'computed: whatever the draft sends', emit: [], computed: true })
    ]);
    const lines = rules.rulesInWords(r.X, (_plug: string, port: string) => port.toUpperCase());
    expect(lines.go).toEqual(['on → A', 'computed: whatever the draft sends']);
  });

  it('a reducer with no said branch reads as []', () => {
    expect(read({ x: spec(`  go: (s) => ({ set: { n: 1 } })`) }).X.go).toEqual([]);
  });

  // s77 (§6 item 2): Add / Remove Record Relation are built by `relationNode(o)` — `defineNode({ type: o.type }).on({ … })` inside a
  // function, called twice with a literal `type`. The reader follows the factory's calls in the same file: its reducers are
  // each call's, with the same lines (the words are shared by design, so they are written to fit both).
  it("a factory-built pair: `defineNode({ type: o.type })` inside a function is every literal-typed call's spec, the same lines", () => {
    const r = read({
      pair: [
        `function pair(o: { type: string; word: string }) {`,
        `  return defineNode({ type: o.type, idioms: [{ says: 'an idiom', example: 'x()' }] }).on({`,
        `    go: (s) => (s.on ? { says: 'on: the relation is added or removed', emit: ['a'], outcome: 'done' } : { says: 'off', outcome: 'failure' }),`,
        `    quiet: (s) => ({ set: { n: 1 } })`,
        `  });`,
        `}`,
        `export const A = pair({ type: 'A', word: 'add' });`,
        `export const B = pair({ type: 'B', word: 'remove' });`,
        `export const C = pair({ type: someName, word: 'computed' });` // not literal: names no spec
      ].join('\n')
    });
    expect(Object.keys(r).sort()).toEqual(['A', 'B']);
    for (const type of ['A', 'B']) {
      expect(r[type].go).toEqual([
        expect.objectContaining({ says: 'on: the relation is added or removed', emit: ['a'], outcome: 'done', file: expect.stringMatching(/pair\.ts$/) }),
        expect.objectContaining({ says: 'off', emit: [], outcome: 'failure' })
      ]);
      expect(r[type].quiet).toEqual([]);
    }
  });

  it("a factory's `type` destructured from its parameter is followed too; one from anywhere else is not (the spec stays unread)", () => {
    const r = read({
      d: `function d({ type }: { type: string }) { return defineNode({ type }).on({ go: () => ({ says: 'd', send: [] }) }); }\nexport const D = d({ type: 'D' });`,
      e: `const NAME = 'E';\nfunction e(o: { type: string }) { return defineNode({ type: NAME }).on({ go: () => ({ says: 'e', send: [] }) }); }\nexport const E = e({ type: 'E' });`
    });
    expect(Object.keys(r)).toEqual(['D']);
    expect(r.D.go.map((b) => b.says)).toEqual(['d']);
  });

  it('the real tree: Add and Remove Record Relation read through `relationNode`, every reducer said, the same lines', () => {
    const all = rules.readReducers();
    const add = all.AddDbModelRelation;
    const remove = all.RemoveDbModelRelation;
    expect(Object.keys(add)).toEqual(['idSource', 'repeaterComponent', 'modelId', 'targetId', 'store']);
    expect(remove).toEqual(add);
    for (const branches of Object.values(add)) expect(branches.length).toBeGreaterThan(0);
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

  it("a `said` whose words are not a literal throws", () => {
    expect(() => read({ x: spec(`  go: (s) => said('a' + s, run(s))`) })).toThrow(/x\.ts:\d+: X\.go — a `said` must be given its words as a string literal/);
  });

  it('the same branches split into literal cases read clean (the control for the plants above)', () => {
    const r = read({ x: spec(`  go: (s) => (s ? { says: 'one', emit: ['a', 'c'] } : { says: 'two', emit: ['b', 'c'] })`) });
    expect(r.X.go.map((b) => b.emit)).toEqual([
      ['a', 'c'],
      ['b', 'c']
    ]);
  });
});
