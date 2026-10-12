/**
 * P107 NSP-020 R19 part 2 — `nonexistentPort` with `ValidatorOptions.drawnPorts`: a wire to a port the node does not
 * have NOW is an error, on the types whose ports appear at run time, when the caller can draw them.
 *
 * Before R19 every wire to such a port that the catalog and the node's saved lists did not name was "could not be
 * statically verified … Skipped" — CMG Drive Looks' featured products wire For Each's `addToBasket`, which For Each
 * never registers (foreach.tsx :1081-1096: only `itemOutput-` and `itemOutputSignal-` names), and the press did nothing.
 * The validator stays free of the specs: the agent server supplies the callback (`noodl-mcp/src/specPorts.ts`), and
 * this file grades the rule's half with a callback of its own.
 */
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { NormNode, NormProject, buildComponentRefs } from '../../src/editor/src/validation/model';
import type { DrawnPortsLookup } from '../../src/editor/src/validation/rules';

/** this rule's errors alone: the graph is the smallest that carries the wire, and other rules may have words for it
 */
const wireErrors = (d: { code: DiagnosticCode; severity: string }) => d.code === DiagnosticCode.NonexistentPort && d.severity === 'error';

const node = (id: string, type: string, extra: Partial<NormNode> = {}): NormNode => ({ id, type, children: [], instancePorts: [], ...extra });

/** A For Each whose template has an `addToBasket` signal and a `title`: what its spec draws for it */
const DRAWN = { input: new Set(['items', 'template']), output: new Set(['itemOutputSignal-addToBasket', 'itemOutput-title', 'itemsRendered']) };

function project(fromProperty: string, list: NormNode = node('list', 'For Each')): NormProject {
  return {
    components: [{ name: '/Shop', nodes: [list, node('count', 'Counter')], connections: [{ fromId: 'list', fromProperty, toId: 'count', toProperty: 'increase' }] }],
    componentRefs: buildComponentRefs(['/Shop'])
  };
}

describe('NSP-020 R19 — a wire to a port the node does not draw is refused when the caller can draw it', () => {
  const validator = new SemanticValidator();
  const asked: string[] = [];
  const drawnPorts: DrawnPortsLookup = (component, nodeId, nodeType) => {
    asked.push(`${component} ${nodeId} ${nodeType}`);
    return nodeType === 'For Each' ? DRAWN : undefined;
  };
  beforeEach(() => (asked.length = 0));

  it('refuses For Each `addToBasket` and names `itemOutputSignal-addToBasket` — the near name is too far for edit distance', () => {
    const report = validator.validate(project('addToBasket'), { drawnPorts });
    const errors = report.diagnostics.filter(wireErrors);
    expect(errors.map((d) => [d.code, d.location.nodeId, d.location.plug, d.location.port])).toEqual([[DiagnosticCode.NonexistentPort, 'list', 'output', 'addToBasket']]);
    expect(errors[0].message).toBe('For Each has no output named "addToBasket" with its settings in this project.');
    expect(errors[0].suggestion).toBe('itemOutputSignal-addToBasket');
    // the ports the project gives it lead the list
    expect(errors[0].alternatives?.slice(0, 2)).toEqual(['itemOutput-title', 'itemOutputSignal-addToBasket']);
    expect(asked).toEqual(['/Shop list For Each']);
  });

  it('passes a wire to a port the node draws — the callback was asked, and said yes', () => {
    const report = validator.validate(project('itemOutputSignal-addToBasket'), { drawnPorts, emitDynamicPortInfo: true });
    expect(report.diagnostics.filter((d) => d.location.nodeId === 'list')).toEqual([]);
    expect(asked).toEqual(['/Shop list For Each']);
  });

  it('without a callback, or when it cannot draw the type, the port is reported unchecked, as before R19', () => {
    for (const options of [{}, { drawnPorts: (() => undefined) as DrawnPortsLookup }]) {
      const report = validator.validate(project('addToBasket'), { ...options, emitDynamicPortInfo: true });
      expect(report.diagnostics.filter(wireErrors)).toEqual([]);
      expect(report.diagnostics.map((d) => [d.code, d.location.port])).toContainEqual([DiagnosticCode.DynamicPortSkipped, 'addToBasket']);
    }
  });

  it('a port the catalog or the saved list names passes before the callback is asked', () => {
    expect(validator.validate(project('itemsRendered'), { drawnPorts }).diagnostics.filter(wireErrors)).toEqual([]);
    const saved = node('list', 'For Each', { instancePorts: ['addToBasket'] });
    expect(validator.validate(project('addToBasket', saved), { drawnPorts }).diagnostics.filter(wireErrors)).toEqual([]);
    expect(asked).toEqual([]);
  });
});
