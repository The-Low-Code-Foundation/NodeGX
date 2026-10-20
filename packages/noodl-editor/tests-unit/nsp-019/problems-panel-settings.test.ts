/**
 * P107 R40 (s105) — the Problems panel shows a node's settings-only warning: graded on the report the panel's own service
 * produces (`ProjectValidationService.revalidateNow` over a legacy project), which is what hands the validator the reading.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-019/problems-panel-settings
 */
const live: { json: unknown } = { json: undefined };

jest.mock('@noodl-models/projectmodel', () => ({ ProjectModel: { instance: { toJSON: () => live.json } } }));

// eslint-disable-next-line import/first
import { ProjectValidationService } from '../../src/editor/src/views/panels/ProblemsPanel/ProjectValidationService';
// eslint-disable-next-line import/first
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';

describe('R40 — the Problems panel reads a node’s saved settings', () => {
  const rows = () => ProjectValidationService.instance.report!.diagnostics.filter((x) => x.code === DiagnosticCode.SettingsDiagnostic);

  it('a Counter whose Min Value is above its Max Value is a row, in the runtime’s words', () => {
    live.json = {
      metadata: {},
      components: [{ name: '/App', graph: { roots: [{ id: 'c', type: 'Counter', label: 'Stock', parameters: { limitsMin: 10, limitsMax: 2 } }], connections: [] } }]
    };
    ProjectValidationService.instance.revalidateNow();
    expect(rows().map((d) => [d.severity, d.location.nodeId, d.message])).toEqual([
      ['warning', 'c', '"Stock" (Counter): Min Value 10 is above Max Value 2. With Limits Enabled on, the count gets stuck.']
    ]);
  });

  it('settings that agree are no row (control)', () => {
    live.json = {
      metadata: {},
      components: [{ name: '/App', graph: { roots: [{ id: 'c', type: 'Counter', label: 'Stock', parameters: { limitsMin: 2, limitsMax: 10 } }], connections: [] } }]
    };
    ProjectValidationService.instance.revalidateNow();
    expect(rows()).toEqual([]);
  });
});
