/**
 * P107-S93-DIDYOUMEAN — a Problems panel row asks "did you mean" only about a name its sentence does not already give.
 *
 * Found driving R25 (s93): every `deprecated-node` row read "… Use HTTP Request (net.noodl.HTTP) instead. — did you mean
 * “net.noodl.HTTP”?", a typo question about a REST2 the person placed on purpose. The row is graded on the diagnostic the
 * panel's own service produces (`ProjectValidationService.revalidateNow` over a legacy project holding a REST2), and the
 * typo hint the agent and the person both rely on (GAM-019, DEF-002) is kept beside it.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-021/problems-panel-did-you-mean
 */
const live: { json: unknown } = { json: undefined };

jest.mock('@noodl-models/projectmodel', () => ({ ProjectModel: { instance: { toJSON: () => live.json } } }));

// eslint-disable-next-line import/first
import { ProjectValidationService } from '../../src/editor/src/views/panels/ProblemsPanel/ProjectValidationService';
// eslint-disable-next-line import/first
import { diagnosticText } from '../../src/editor/src/views/panels/ProblemsPanel/diagnosticText';
// eslint-disable-next-line import/first
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';

describe('P107-S93-DIDYOUMEAN — the panel row for a retired node', () => {
  beforeAll(() => {
    live.json = {
      metadata: {},
      components: [
        {
          name: '/App',
          graph: {
            roots: [{ id: 'logout', type: 'REST2', label: 'Logout email', parameters: {} }],
            connections: []
          }
        }
      ]
    };
    ProjectValidationService.instance.revalidateNow();
  });

  it("names HTTP Request once, and asks no typo question", () => {
    const d = ProjectValidationService.instance.report!.diagnostics.find((x) => x.code === DiagnosticCode.DeprecatedNode)!;
    expect(d.suggestion).toBe('net.noodl.HTTP');
    expect(diagnosticText(d)).toBe(
      '"Logout email" (REST2) is a retired node type the editor no longer offers. Use HTTP Request (net.noodl.HTTP) instead.'
    );
  });

  it('keeps "did you mean" for a name the sentence does not give (the typo hint)', () => {
    expect(diagnosticText({ message: 'Variable has no input "valeu".', suggestion: 'value' })).toBe(
      'Variable has no input "valeu".  — did you mean “value”?'
    );
  });
});
