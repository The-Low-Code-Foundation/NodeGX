/**
 * P109 ISL-005 — the code editor and project script files.
 *
 * Two places the editor spoke about script files before this, both wrong:
 * - a Function body's `Scripts.greet.hello(…)` was linted `'Scripts' is not
 *   defined`, though `Scripts` is the body's fifth argument;
 * - a script file opened in the Script node's mode, which linted every `use(…)`
 *   and `exports.x` as undefined, and completed `define` and `Noodl` (both
 *   `undefined` in a file at run time).
 *
 * Each `it` asserts the absence it cares about beside a known-firing control in
 * the same document, so a linter that went silent altogether cannot pass it.
 */
import { javascript } from '@codemirror/lang-javascript';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

import {
  EMPTY_AUTHORING_CONTEXT,
  setCodeAuthoringContext,
  setOpenNodeContext
} from '@noodl-core-ui/components/code-editor/authoringContext';
import { createNoodlCompletionSource } from '@noodl-core-ui/components/code-editor/noodl-completions';
import { lintMessages } from '@noodl-core-ui/components/code-editor/utils/esLintDiagnostics';
import { modeLabel } from '@noodl-core-ui/components/code-editor/utils/modes';
import type { ValidationType } from '@noodl-core-ui/components/code-editor/utils/types';

const undefinedNames = (code: string, mode: ValidationType) =>
  lintMessages(code, mode)
    .filter((m) => m.ruleId === 'no-undef')
    .map((m) => /'([^']+)'/.exec(m.message)?.[1]);

function labelsAt(doc: string, mode: ValidationType, explicit = true): string[] {
  const state = EditorState.create({ doc, extensions: [javascript()] });
  const result = createNoodlCompletionSource(mode)(new CompletionContext(state, doc.length, explicit));
  return result ? result.options.map((o) => o.label) : [];
}

const GREET = { path: 'engine/greet.js', alias: 'greet', gives: ['hello', 'shout'] };
const WORDS = { path: 'engine/words.js', alias: 'words', gives: ['hi', 'bang'] };
const UNUSED = { path: 'other/unused.js', alias: 'unused', gives: ['never'] };

function openFunction(uses: string[] | undefined) {
  setCodeAuthoringContext({ ...EMPTY_AUTHORING_CONTEXT, scripts: [GREET, WORDS, UNUSED] });
  setOpenNodeContext({ nodeId: 'fn', typeName: 'JavaScriptFunction', declaredInputs: [], declaredOutputs: [], uses });
}

afterEach(() => {
  setOpenNodeContext(null);
  setCodeAuthoringContext(null);
});

describe('a Function body reaching its script files', () => {
  it('lints `Scripts` as defined; a typo on the next line is still reported', () => {
    const names = undefinedNames("Outputs.shown = Scripts.greet.hello('Olive');\nOutputs.n = totl;", 'function');
    expect(names).toEqual(['totl']);
  });

  it('offers `Scripts` among the top-level names', () => {
    expect(labelsAt('Scr', 'function')).toContain('Scripts');
  });

  it('`Scripts.` lists only the files in this Function\'s Uses, by the name the code reaches each by', () => {
    openFunction(['engine/greet.js', 'engine/words.js']);
    expect(labelsAt('Scripts.', 'function').sort()).toEqual(['greet', 'words']);
  });

  it('`Scripts.<name>.` lists what that file gives', () => {
    openFunction(['engine/greet.js']);
    expect(labelsAt('Scripts.greet.', 'function').sort()).toEqual(['hello', 'shout']);
    // A file in the project but not in Uses is not in `Scripts` at run time.
    expect(labelsAt('Scripts.unused.', 'function')).toEqual([]);
  });

  it('a Function with no Uses completes nothing under `Scripts.`', () => {
    openFunction(undefined);
    expect(labelsAt('Scripts.', 'function')).toEqual([]);
    // Control: the same open node still completes `Noodl.`.
    expect(labelsAt('Noodl.', 'function').length).toBeGreaterThan(0);
  });

  it('a Script node (`define`) is not offered `Scripts`', () => {
    expect(labelsAt('Scr', 'script')).not.toContain('Scripts');
    expect(undefinedNames('Scripts.greet;', 'script')).toEqual(['Scripts']);
  });
});

describe("a script file's own mode", () => {
  const FILE = "const words = use('engine/words');\nexports.hello = function (name) { return words.hi + name; };\nmodule.exports.x = 1;\nconsole.log('ok');";

  it('lints `use`, `exports`, `module` and `console` as defined', () => {
    expect(undefinedNames(FILE, 'scriptfile')).toEqual([]);
  });

  it('reports `Noodl`, `window` and `document`, which a file is given as undefined; and a typo', () => {
    const names = undefinedNames(FILE + '\nNoodl.Variables.x = window.innerWidth + document.title + totl;', 'scriptfile');
    expect(names).toEqual(['Noodl', 'window', 'document', 'totl']);
  });

  it("the Script node's mode, which the tab used before, reports `use` and `exports` (the defect, kept as a control)", () => {
    expect(undefinedNames(FILE, 'script')).toEqual(expect.arrayContaining(['use', 'exports', 'module']));
  });

  it('completes `use`, `exports`, `module`, never `define`, `Noodl` or `Inputs`', () => {
    const labels = labelsAt('', 'scriptfile');
    expect(labels).toEqual(expect.arrayContaining(['use', 'exports', 'module']));
    for (const absent of ['define', 'Noodl', 'Inputs', 'Outputs', 'Scripts']) expect(labels).not.toContain(absent);
    expect(labelsAt('Noodl.', 'scriptfile')).toEqual([]);
  });

  it('is called "Script file" over a node and "JavaScript" over a file', () => {
    expect(modeLabel('scriptfile', 'node')).toBe('Script file');
    expect(modeLabel('scriptfile', 'file')).toBe('JavaScript');
  });
});
