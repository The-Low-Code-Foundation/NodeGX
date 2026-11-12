/**
 * Bugs P121-TWO003-SCRIPTCOMPILE and P121-TWO005-NEVERRUNS — two Functions the door wrote without
 * a word: one whose script does not compile, one that nothing re-runs.
 *
 * Driven through the whole `SemanticValidator` (the door's and `validate_project`'s path) with only
 * the rule under test switched on, against the shipped catalog, so the premise — `run` is a signal
 * input on `JavaScriptFunction` — is the product's, not the test's.
 *
 * @module noodl-editor/tests-unit/p121/function-script-and-reruns
 */
import { isBlockingForAuthoredOutput } from '@noodl-models/../validation/authoredCandidate';
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import { SemanticValidator } from '@noodl-models/../validation/SemanticValidator';
import { functionScriptCompileError } from '@noodl-models/../validation/rules/functionScriptNotCompiled';
import type { NormConnection, NormNode, NormProject } from '@noodl-models/../validation/model';

const catalog = loadDefaultCatalog();

function node(id: string, type: string, label?: string, parameters?: Record<string, unknown>): NormNode {
  return { id, type, label, children: [], instancePorts: [], ...(parameters ? { parameters } : {}) } as unknown as NormNode;
}

function run(code: DiagnosticCode, nodes: NormNode[], connections: NormConnection[] = []) {
  const project = { components: [{ name: '/#__cloud__/saveSeller', nodes, connections }] } as NormProject;
  return new SemanticValidator(catalog).validate(project, { only: new Set([code]) }).diagnostics;
}

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): NormConnection => ({
  fromId,
  fromProperty,
  toId,
  toProperty
});

describe('P121-TWO003-SCRIPTCOMPILE — a Function whose script does not compile', () => {
  // The measured shape: `/^https?:\/\//` written inside a template literal arrives as `/^https?:///`,
  // so the rest of the line is a comment and the next `if` is a syntax error.
  const BROKEN = "const url = Inputs.url;\nif (/^https?:///.test(url)) Outputs.ok = true;\nif (url) {}\n";
  const FIXED = "const url = Inputs.url;\nif (/^https?:\\/\\//.test(url)) Outputs.ok = true;\nif (url) {}\n";

  it('is refused by the runtime’s own compile, with the line', () => {
    expect(functionScriptCompileError(FIXED)).toBeUndefined();
    const error = functionScriptCompileError(BROKEN);
    expect(error?.message).toMatch(/Unexpected token|Unexpected end|Invalid regular expression/);
    expect(error?.line).toBe(3);
  });

  it('is reported on the node, by name, and blocks a write the agent just made', () => {
    const found = run(DiagnosticCode.FunctionScriptNotCompiled, [node('f', 'JavaScriptFunction', 'saveSeller', { functionScript: BROKEN })]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      code: DiagnosticCode.FunctionScriptNotCompiled,
      location: { nodeId: 'f', port: 'functionScript' }
    });
    expect(found[0].message).toMatch(/"saveSeller"'s script does not compile \(line 3\)/);
    expect(isBlockingForAuthoredOutput(found[0])).toBe(true);
  });

  it('control: the same script fixed, an empty script, and a script that uses `await` and Scripts say nothing', () => {
    const nodes = [
      node('a', 'JavaScriptFunction', 'fixed', { functionScript: FIXED }),
      node('b', 'JavaScriptFunction', 'empty', { functionScript: '' }),
      node('c', 'JavaScriptFunction', 'none'),
      node('d', 'JavaScriptFunction', 'async', { functionScript: 'const r = await Scripts.world.load(Inputs.id);\nScript.log(r);\nOutputs.done();' })
    ];
    expect(run(DiagnosticCode.FunctionScriptNotCompiled, nodes)).toEqual([]);
  });
});

describe('P121-TWO005-NEVERRUNS — a Function nothing re-runs', () => {
  it('the premise, from the shipped catalog: Run is a signal input on a Function', () => {
    expect(catalog.getPort('JavaScriptFunction', 'input', 'run')?.isSignal).toBe(true);
  });

  // The Edit profile photo script: three wired inputs, all unticked, no Run.
  const PHOTO = node('photo', 'JavaScriptFunction', 'photo', {
    functionScript: 'Outputs.src = Inputs.upload || Inputs.current;',
    'runOnChange-in-current': false,
    'runOnChange-in-upload': false,
    'runOnChange-in-remove': false
  });
  const SRC = node('src', 'Variable2', 'source');
  const WIRES = [wire('src', 'value', 'photo', 'in-current'), wire('src', 'value', 'photo', 'in-upload'), wire('src', 'value', 'photo', 'in-remove')];

  it('is warned, naming the inputs and the box to tick', () => {
    const found = run(DiagnosticCode.FunctionNeverReruns, [PHOTO, SRC], WIRES);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('warning');
    expect(found[0].message).toMatch(/Nothing re-runs "photo" when its inputs change/);
    expect(found[0].message).toMatch(/"current", "upload", "remove"/);
    expect(found[0].message).toMatch(/runs once when it loads, and a new value on any of them never runs it again/);
    expect(found[0].suggestion).toBe('runOnChange-in-current: true');
  });

  it('control: Run wired, one input ticked (explicitly or by default), or no wired input — nothing to say', () => {
    const button = node('btn', 'net.noodl.controls.button', 'Save');
    expect(run(DiagnosticCode.FunctionNeverReruns, [PHOTO, SRC, button], [...WIRES, wire('btn', 'click', 'photo', 'run')])).toEqual([]);

    const oneTicked = node('photo', 'JavaScriptFunction', 'photo', { ...PHOTO.parameters, 'runOnChange-in-upload': true });
    expect(run(DiagnosticCode.FunctionNeverReruns, [oneTicked, SRC], WIRES)).toEqual([]);

    // Absent is ticked: the runtime reads it so (`run-on-value-change.ts`).
    const { ['runOnChange-in-remove']: _dropped, ...rest } = PHOTO.parameters as Record<string, unknown>;
    expect(run(DiagnosticCode.FunctionNeverReruns, [node('photo', 'JavaScriptFunction', 'photo', rest), SRC], WIRES)).toEqual([]);

    // Unticked but unwired: set once at load, which the load run covers.
    expect(run(DiagnosticCode.FunctionNeverReruns, [PHOTO], [])).toEqual([]);
  });
});
