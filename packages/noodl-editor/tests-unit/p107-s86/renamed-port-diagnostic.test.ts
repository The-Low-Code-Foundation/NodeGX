/**
 * P107-S86-STOREDWIRE — a wire to an output ERG-001 renamed is still refused at an agent's write, and now names the
 * port it became. Before, Set Object Properties' `stored` read "has no output named" with the nearest name by edit
 * distance, which is not `done`.
 */
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { NormNode, NormProject, buildComponentRefs } from '../../src/editor/src/validation/model';
import type { DrawnPortsLookup } from '../../src/editor/src/validation/rules';

const wireErrors = (d: { code: DiagnosticCode; severity: string }) => d.code === DiagnosticCode.NonexistentPort && d.severity === 'error';
const node = (id: string, type: string): NormNode => ({ id, type, children: [], instancePorts: [] });

function project(type: string, fromProperty: string): NormProject {
  return {
    components: [
      {
        name: '/Save',
        nodes: [node('src', type), node('count', 'Counter')],
        connections: [{ fromId: 'src', fromProperty, toId: 'count', toProperty: 'increase' }]
      }
    ],
    componentRefs: buildComponentRefs(['/Save'])
  };
}

describe('P107-S86-STOREDWIRE — the wire check names the port an old output became', () => {
  const validator = new SemanticValidator();
  /** Set Object Properties' ports appear from its settings: what its spec draws for `properties: name` */
  const drawnPorts: DrawnPortsLookup = (_c, _id, type) =>
    type === 'SetModelProperties'
      ? { input: new Set(['modelId', 'store', 'prop-name']), output: new Set(['done', 'failure', 'completed', 'error']) }
      : undefined;

  it("Set Object Properties' `stored` (a type whose ports are drawn): refused, `done` suggested and said", () => {
    const errors = validator.validate(project('SetModelProperties', 'stored'), { drawnPorts }).diagnostics.filter(wireErrors);
    expect(errors.map((d) => d.message)).toEqual([
      'SetModelProperties has no output named "stored" with its settings in this project. It was renamed "done" in August 2026: wire "done".'
    ]);
    expect(errors[0].suggestion).toBe('done');
  });

  it("Unique Id's `generated` (a static type): refused, `done` suggested and said", () => {
    const errors = validator.validate(project('Unique Id', 'generated'), {}).diagnostics.filter(wireErrors);
    expect(errors.map((d) => d.message)).toEqual(['Unique Id has no output named "generated". It was renamed "done" in August 2026: wire "done".']);
    expect(errors[0].suggestion).toBe('done');
  });

  it('a name that was never renamed reads as before (control)', () => {
    const errors = validator.validate(project('Unique Id', 'made'), {}).diagnostics.filter(wireErrors);
    expect(errors.map((d) => d.message)).toEqual(['Unique Id has no output named "made".']);
  });
});
