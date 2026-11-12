/**
 * Bug P127-BKO006-RUNONCHANGEGUESS — a Function took `runOnChange-title` (its box is
 * `runOnChange-in-title`) with only the dynamic-port "not checked" note, and kept running on every
 * keystroke. Two of three stranger agents wrote it and then replaced the Function with a Condition.
 *
 * Driven through the whole `SemanticValidator` (the door's and `validate_project`'s path) with only
 * the rule under test switched on, against the shipped catalog.
 *
 * @module noodl-editor/tests-unit/p127/run-on-change-guess
 */
import { isBlockingForAuthoredOutput } from '@noodl-models/../validation/authoredCandidate';
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import { SemanticValidator } from '@noodl-models/../validation/SemanticValidator';
import type { NormNode, NormProject } from '@noodl-models/../validation/model';

const catalog = loadDefaultCatalog();
const CODE = DiagnosticCode.FunctionRunOnChangeUnknown;

function node(id: string, type: string, label: string, parameters: Record<string, unknown>): NormNode {
  return { id, type, label, children: [], instancePorts: [], parameters } as unknown as NormNode;
}

function run(nodes: NormNode[], only: DiagnosticCode[] = [CODE]) {
  const project = { components: [{ name: '/Pages/Club', nodes, connections: [] }] } as NormProject;
  return new SemanticValidator(catalog).validate(project, { only: new Set(only) }).diagnostics;
}

// The book club's Add form, as the transcript wrote it.
const SCRIPT =
  'const t = (Inputs.title || "").trim();\n' +
  'Outputs.ok = t.length > 0 && !!Inputs.author;\n' +
  'Outputs.row = { title: t, author: Inputs.author, rating: Inputs.rating, status: Inputs.status };\n';

describe('P127-BKO006-RUNONCHANGEGUESS — a guessed run-on-change name on a Function', () => {
  it('names each guessed key, says the right one, and blocks a write the agent just made', () => {
    const found = run([
      node('f', 'JavaScriptFunction', 'Check new book', {
        functionScript: SCRIPT,
        'runOnChange-title': false,
        'runOnChange-author': false,
        'runOnChange-rating': false,
        'runOnChange-status': false
      })
    ]);
    expect(found.map((d) => d.location.port)).toEqual([
      'runOnChange-title',
      'runOnChange-author',
      'runOnChange-rating',
      'runOnChange-status'
    ]);
    expect(found[0]).toMatchObject({
      code: CODE,
      severity: 'warning',
      location: { nodeId: 'f', nodeLabel: 'Check new book' },
      suggestion: 'runOnChange-in-title: false'
    });
    expect(found[0].message).toBe(
      '"Check new book" has no setting "runOnChange-title", so nothing reads it and a new "title" still runs it. ' +
        'A Function\'s Run On Value Change box for an input is "runOnChange-in-<input>": write "runOnChange-in-title".'
    );
    expect(found.every(isBlockingForAuthoredOutput)).toBe(true);
  });

  it('a name the script does not read points at the nearest input, and a script with no inputs says so', () => {
    const [near] = run([node('f', 'JavaScriptFunction', 'Check', { functionScript: SCRIPT, 'runOnChange-titel': false })]);
    expect(near.message).toMatch(/its script reads no "titel" \(the nearest input is "title": "runOnChange-in-title"\)\.$/);
    expect(near.suggestion).toBe('runOnChange-in-title: false');

    const [none] = run([node('g', 'JavaScriptFunction', 'Tick', { functionScript: 'Outputs.now = Date.now();', 'runOnChange-run': false })]);
    expect(none.message).toMatch(/and its script reads no inputs\.$/);
    expect(none.suggestion).toBeUndefined();
  });

  it('control: the right names, a box for an input the script does not read yet, and other nodes say nothing', () => {
    const nodes = [
      node('a', 'JavaScriptFunction', 'right', {
        functionScript: SCRIPT,
        'runOnChange-in-title': false,
        'runOnChange-in-author': true,
        'runOnChange-in-later': false
      }),
      // A Query Records' own boxes are `runOnChange-<input>`: not a Function, not this rule.
      node('q', 'DbCollection2', 'books', { 'runOnChange-collectionName': false })
    ];
    expect(run(nodes)).toEqual([]);
  });
});
