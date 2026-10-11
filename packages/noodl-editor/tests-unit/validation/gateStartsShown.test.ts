/**
 * P78-TPL011-MOUNTED (P109 ISL-045) — `gate-starts-shown`. The runtime reading it stands on is
 * `nodegx-backend/tests/isl045-mounted-drive.test.ts` (a Group gated by a Variable nobody sets is drawn). Ruled an info.
 *
 * The mutant ledger (each arm exists to redden one sabotage):
 *  - fire on an unwired mounted → the unwired arm reddens.
 *  - ignore `mounted: false` → the starts-hidden arm reddens.
 *  - fire on a component instance → the instance arm reddens.
 *  - make it a warning, or blocking → the severity arm reddens (it was ruled a quiet note).
 *  - leave it out of the door's run → the door arm reddens.
 */

import { authoredPreconditionDiagnostics, isBlockingForAuthoredOutput } from '../../src/editor/src/validation/authoredCandidate';
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode, type Diagnostic } from '../../src/editor/src/validation/diagnostics';
import type { FunctionWireLike } from '../../src/editor/src/validation/functionPorts';
import { checkGateStartsShown } from '../../src/editor/src/validation/gateStartsShown';
import type { ParameterizedNode } from '../../src/editor/src/validation/parameterValues';

const catalog = loadDefaultCatalog();
const COMPONENT = '/Pages/Tonight';

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): FunctionWireLike => ({ fromId, fromProperty, toId, toProperty });
const run = (nodes: ParameterizedNode[], wires: FunctionWireLike[]): Diagnostic[] => checkGateStartsShown(nodes, { component: COMPONENT, catalog, wires });

/** Nightbook's shape: the page's content gated by "is the book open", which arrives after the first frame. */
const GATE = { id: 'open', type: 'Variable2', label: 'Is the book open', parameters: { name: 'bookOpen' } };

describe('P78-TPL011-MOUNTED — gate-starts-shown', () => {
  it('names a Group whose mounted is wired and starts shown, at its mounted port', () => {
    const found = run([GATE, { id: 'page', type: 'Group', label: 'Tonight', parameters: {} }], [wire('open', 'value', 'page', 'mounted')]);
    expect(found.map((d) => [d.code, d.location?.nodeId, d.location?.port])).toEqual([[DiagnosticCode.GateStartsShown, 'page', 'mounted']]);
    expect(found[0].message).toMatch(/set its mounted to false/);
  });

  it('is a quiet note: an info, never blocking (as ruled)', () => {
    const [d] = run([GATE, { id: 'page', type: 'Group', parameters: {} }], [wire('open', 'value', 'page', 'mounted')]);
    expect([d.severity, isBlockingForAuthoredOutput(d)]).toEqual(['info', false]);
  });

  it('is silent when the node starts hidden (mounted: false), the repair it names', () => {
    expect(run([GATE, { id: 'page', type: 'Group', parameters: { mounted: false } }], [wire('open', 'value', 'page', 'mounted')])).toEqual([]);
  });

  it('is silent on an unwired mounted, and on a wire into another port', () => {
    expect(run([GATE, { id: 'page', type: 'Group', parameters: {} }], [wire('open', 'value', 'page', 'visible')])).toEqual([]);
  });

  it('is silent on a component instance (whether it draws is not in this graph)', () => {
    expect(run([GATE, { id: 'card', type: '/UI/Unlock card', parameters: {} }], [wire('open', 'value', 'card', 'mounted')])).toEqual([]);
  });

  it('reaches the door: the authored-output run carries it', () => {
    const nodes = [GATE, { id: 'page', type: 'Group', parameters: {} }] as ParameterizedNode[];
    const found = authoredPreconditionDiagnostics({
      component: COMPONENT,
      nodes,
      components: [COMPONENT],
      catalog,
      wires: [wire('open', 'value', 'page', 'mounted')],
      connections: new Set<string>()
    });
    expect(found.filter((d) => d.code === DiagnosticCode.GateStartsShown).map((d) => d.location?.nodeId)).toEqual(['page']);
  });
});
