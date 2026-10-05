/**
 * P109 ISL-005 AC4 — a broken script file is named once, by file and line, with the Functions it breaks.
 *
 * The runtime half (one raise across every user) is `noodl-runtime/test/isl-005-script-files.test.ts`.
 * This is the editor half: the one warning the editor receives names the file only for a syntax error
 * (`new Function` gives no position) and names no other user. `scriptFileWarning` completes it.
 * Each message below is made by the runtime's own `ScriptFiles`, so the format read is the real one.
 */
import { ScriptFileError, ScriptFiles } from '@noodl/runtime/src/scriptfiles';

import { scriptFileWarning, syntaxErrorLine } from '../../src/editor/src/models/ScriptFiles/scriptFileWarning';

const GREET = "var words = use('engine/words');\nexports.hello = function (n) { return words.hi + ', ' + n; };\n";
const BROKEN_WORDS = "// line 1\nexports.hi = 'Hello';\nexports.bye = ;\n";

function project(scripts: Record<string, string>) {
  const fns = (uses: Record<string, string>) =>
    Object.entries(uses).map(([label, u]) => ({ id: `id-${label}`, label, parameters: { uses: u } }));
  const components = [
    { name: '/Pages/Home', nodes: fns({ 'greet Olive': 'engine/greet.js' }) },
    { name: '/Pages/About', nodes: fns({ 'greet Robot': 'engine/greet.js,engine/words.js', 'plain': '' }) },
    { name: '/Logic/Other', nodes: fns({ 'other': 'engine/other.js' }) }
  ];
  return {
    getScript: (p: string) => scripts[p],
    getComponents: () => components.map((c) => ({ name: c.name, getNodesWithTypeRecursive: () => c.nodes }))
  };
}

/** The message the runtime raises for `path`, exactly as `simplejavascript.ts` passes it on. */
function runtimeMessage(scripts: Record<string, string>, path: string): string {
  const files = new ScriptFiles();
  files.setSources(scripts);
  try {
    files.load(path);
  } catch (e) {
    return (e as ScriptFileError).describe();
  }
  throw new Error('expected a failure');
}

describe('ISL-005 AC4 — the editor names a broken file once, by file and line, with its users', () => {
  const scripts = { 'engine/greet.js': GREET, 'engine/words.js': BROKEN_WORDS, 'engine/other.js': 'exports.o = 1;' };

  test('known-firing: the runtime names the file of a syntax error but no line', () => {
    expect(runtimeMessage(scripts, 'engine/greet.js')).toMatch(/^scripts\/engine\/words\.js: /);
  });

  test('a syntax error gains its line, and every Function that reaches the file is named (through use() too)', () => {
    const warning = scriptFileWarning({ showGlobally: true, message: runtimeMessage(scripts, 'engine/greet.js') }, project(scripts));
    expect(warning.scriptFile).toEqual({
      path: 'engine/words.js',
      line: 3,
      users: ['/Pages/Home / greet Olive', '/Pages/About / greet Robot']
    });
    expect(warning.message).toMatch(/^scripts\/engine\/words\.js:3: .* — breaks 2 Functions: \/Pages\/Home \/ greet Olive, \/Pages\/About \/ greet Robot$/);
    expect(warning.showGlobally).toBe(true);
  });

  test('a throw keeps the line the runtime found, and a Function that does not reach the file is not named', () => {
    const throwing = { ...scripts, 'engine/words.js': "exports.hi = 'x';\nthrow new Error('no words');\n" };
    const message = runtimeMessage(throwing, 'engine/greet.js');
    const warning = scriptFileWarning({ message }, project(throwing));
    expect(warning.scriptFile?.users).not.toContain('/Logic/Other / other');
    // The runtime found this line itself (the stack, measured in Node: `scripts/engine/words.js:2: no words`).
    expect(message).toBe('scripts/engine/words.js:2: no words');
    expect(warning.message).toBe('scripts/engine/words.js:2: no words — breaks 2 Functions: /Pages/Home / greet Olive, /Pages/About / greet Robot');
  });

  test('a missing file is named with the one Function that lists it', () => {
    const warning = scriptFileWarning({ message: runtimeMessage({}, 'engine/other.js') }, project({}));
    expect(warning.message).toBe('scripts/engine/other.js: There is no script file scripts/engine/other.js — breaks 1 Function: /Logic/Other / other');
  });

  test('control: a warning that names no script file is returned as it came', () => {
    const warning = { message: 'The script threw: x is not defined' };
    expect(scriptFileWarning(warning, project(scripts))).toBe(warning);
  });

  test('syntaxErrorLine reads a file as a function body: a top-level return is not an error', () => {
    expect(syntaxErrorLine('return 1;')).toBeUndefined();
    expect(syntaxErrorLine('a\nb\nc = ;')).toBe(3);
  });
});
