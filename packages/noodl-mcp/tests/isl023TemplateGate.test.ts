/**
 * P109 ISL-023 — the template generators' gate (`scripts/template-gate.js`) names the file and the line of a type
 * error, a stray backtick and a `${…}` in a produced comment, before a generator writes anything.
 *
 * Each arm is the real defect in SOURCE, written to a scratch file: never a string that happens to hold a backtick
 * (the specs' produced-string checks are exactly that, and an unescaped backtick never reaches the string they read).
 * The controls beside them are the legal shapes a regex over the file would trip on.
 *
 * @module noodl-mcp/tests/isl023TemplateGate.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type Entry = { name: string; entry: string | null; command?: string };
type Gate = {
  gate: (entries: Entry[]) => { red: string[]; summary: string };
  generatorsFromPackageJson: () => Entry[];
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gate, generatorsFromPackageJson } = require('../../../scripts/template-gate.js') as Gate;

const REPO = path.join(__dirname, '..', '..', '..');
const TICK = '`';
const DOLLAR = '$';

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl023-'));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Write a scratch generator module and gate it alone. */
function gateOf(name: string, lines: string[]): { red: string[]; summary: string } {
  const file = path.join(dir, name);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return gate([{ name, entry: file }]);
}

/** The red lines that name this scratch file at this line. */
function at(red: string[], name: string, line: number): string[] {
  return red.filter((r) => r.includes(`${name}:${line}:`));
}

describe('ISL-023 — the generator gate', () => {
  it('a type error is named by file and line (the generators run under ts-node -T, which never reports one)', () => {
    const { red } = gateOf('typeArm.ts', ['export const PINS: ReadonlyArray<{ sprite: string }> = [', "  { sprite: 'house' },", '  { sprite: 7 }', '];']);
    expect(at(red, 'typeArm.ts', 3).join('\n')).toMatch(/TS2322 Type 'number' is not assignable to type 'string'/);
  });

  it('(a) a backtick in a comment inside a script literal: the gate names the backtick that closed the literal', () => {
    const { red } = gateOf('tickArm.ts', [
      'export const SCRIPT = ' + TICK,
      'var n = 1;',
      `// the ${TICK}Job robot${TICK} row`,
      'Outputs.n = n;',
      TICK + ';'
    ]);
    expect(at(red, 'tickArm.ts', 3).join('\n')).toMatch(/the template literal opened at \S*tickArm\.ts:1:\d+ closes here/);
  });

  it('(b) a ${name} in a comment of the produced script, with the name in scope: named, though it compiles', () => {
    const { red } = gateOf('dollarArm.ts', [
      'const CAN_MAX = 3;',
      'export const SCRIPT = ' + TICK,
      'var can = 0;',
      `// a can holds ${DOLLAR}{CAN_MAX}`,
      '/* and a block comment: ' + DOLLAR + '{CAN_MAX} */',
      TICK + ';'
    ]);
    expect(at(red, 'dollarArm.ts', 4).join('\n')).toMatch(/\$\{CAN_MAX\} sits inside a \/\/ comment/);
    expect(at(red, 'dollarArm.ts', 5).join('\n')).toMatch(/\$\{CAN_MAX\} sits inside a \/\* comment \*\//);
    expect(red).toHaveLength(2);
  });

  it('(c) a backtick inside a stylesheet literal', () => {
    const { red } = gateOf('cssArm.ts', ['export const CSS = ' + TICK + '/* the look */', `html { background: var(--paper); } /* the ${TICK}paper${TICK} token */`, 'body { margin: 0; }', TICK + ';']);
    expect(at(red, 'cssArm.ts', 2).join('\n')).toMatch(/the template literal opened at \S*cssArm\.ts:1:\d+ closes here/);
  });

  it('control: the legal shapes stay green — a substitution in code, in a string, after a URL, escaped, or marked', () => {
    const { red, summary } = gateOf('legal.ts', [
      'const N = 3;',
      "const HOST = 'example.org';",
      'export const SCRIPT = ' + TICK,
      `var n = ${DOLLAR}{N};`,
      `var s = '${DOLLAR}{N}' + "${DOLLAR}{N}";`,
      `var u = 'https://${DOLLAR}{HOST}/x'; fetch(https://${DOLLAR}{HOST});`,
      `// an escaped one is text: \\${DOLLAR}{N}, and so is \\${TICK}`,
      `/* ${DOLLAR}{/* template-gate: comment ok */ N} */`,
      '// a comment ends at the line: ',
      `var m = ${DOLLAR}{N};`,
      TICK + ';',
      "export const LABEL = '${not a template}';"
    ]);
    expect(red).toEqual([]);
    expect(summary).toMatch(/1 files, 1 template literals, 7 substitutions/);
  });

  it('an entry that does not exist, and an import that does not resolve, are red — not a skip', () => {
    expect(gate([{ name: 'template:gone', entry: path.join(dir, 'gone.ts') }]).red).toEqual([expect.stringMatching(/template:gone: its entry .*gone\.ts does not exist/)]);
    const { red } = gateOf('importArm.ts', ["import { X } from './nowhere';", 'export const Y = X;']);
    expect(at(red, 'importArm.ts', 1).join('\n')).toMatch(/TS2307/);
  });

  it('reach: every template:* generator on disk reads green — so a stray backtick in any of their modules is red in jest too', () => {
    const generators = generatorsFromPackageJson();
    expect(generators.map((g) => g.name)).toEqual(expect.arrayContaining(['template:garden', 'template:rocket', 'template:landing']));
    expect(generators.filter((g) => !g.entry)).toEqual([]);
    const garden = generators.find((g) => g.name === 'template:garden') as Entry;
    expect(path.relative(REPO, garden.entry as string)).toBe(path.join('scripts', 'generate-garden-template.ts'));
    // A `template:*` that names a missing entry is `npm run template:gate`'s red (the arm above); this spec reads the
    // modules of the ones that exist. (2026-10-03: a peer's uncommitted rename deletes `generate-planner-template.ts`.)
    const present = generators.filter((g) => fs.existsSync(g.entry as string));
    expect(present.length).toBeGreaterThanOrEqual(8);
    const { red, summary } = gate(present);
    expect(red).toEqual([]);
    const [files, literals] = (summary.match(/(\d+) files, (\d+) template literals/) ?? []).slice(1).map(Number);
    expect(files).toBeGreaterThanOrEqual(60);
    expect(literals).toBeGreaterThanOrEqual(1000);
  });
});
