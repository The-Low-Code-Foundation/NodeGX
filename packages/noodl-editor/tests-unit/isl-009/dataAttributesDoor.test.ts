/**
 * P109 ISL-009 — "A data-* list" (Richard, 2026-10-02), as the validator and the door see it.
 *
 * Every visual node declares one `namedports/derived` rule: each name in its `dataAttributes` list is a string input
 * of that name. These are graded against the SHIPPED catalog, so the rule is the runtime's own (`react-component-node`
 * `DATA_ATTRIBUTES_RULE`, carried through `catalog:generate`), not a copy.
 *
 * What would go red:
 * - the catalog marking the visual types `runtime-discovered` (the premise rows): every unknown port and parameter on
 *   all of them would then be skipped, which is what GAM-019 closed;
 * - `derivedPortNames` missing from `nonexistentPort` or `parameterValues`: a wire or value for a LISTED name refused;
 * - accepting anything: a wire or value for an UNLISTED name let through;
 * - the rule's pattern widened (`'.*'`): the `onclick` row stops being refused. Measured as a mutant (§8 s6).
 */
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import { SemanticValidator } from '@noodl-models/../validation/SemanticValidator';
import type { NormConnection, NormNode, NormProject } from '@noodl-models/../validation/model';
import { derivedPortsForNode } from '@noodl-models/nodelibrary/dynamicPortRules';

const catalog = loadDefaultCatalog();

function node(id: string, type: string, parameters?: Record<string, unknown>): NormNode {
  return { id, type, label: id, children: [], instancePorts: [], ...(parameters ? { parameters } : {}) } as unknown as NormNode;
}

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) =>
  ({ fromId, fromProperty, toId, toProperty }) as NormConnection;

function diagnostics(nodes: NormNode[], connections: NormConnection[] = []) {
  return new SemanticValidator(catalog).validate(
    { components: [{ name: '/Garden', nodes, connections }] } as NormProject,
    {
      only: new Set([DiagnosticCode.NonexistentPort, DiagnosticCode.UnknownParameter, DiagnosticCode.InvalidParameterValue])
    }
  ).diagnostics;
}

const on = (found: ReturnType<typeof diagnostics>, nodeId: string, port: string) =>
  found.filter((d) => d.location.nodeId === nodeId && d.location.port === port).map((d) => d.code);

const SOURCE = node('src', 'String');
/** A fully static type with no list: the known-firing control beside every absence below. */
const FLAG = node('flag', 'Boolean');

const VISUAL_TYPES = catalog
  .authorableTypeNames()
  .filter((t) => catalog.getNode(t)?.inputs.some((p) => p.name === 'dataAttributes'));

describe('ISL-009 — the premises, read from the shipped catalog', () => {
  it('the list is on the visual types and not on Drag (no element of its own)', () => {
    expect(VISUAL_TYPES.length).toBeGreaterThanOrEqual(15);
    expect(VISUAL_TYPES).toEqual(expect.arrayContaining(['Group', 'Text', 'Page Stack', 'net.noodl.controls.button']));
    expect(catalog.getNode('Drag')?.inputs.some((p) => p.name === 'dataAttributes')).toBe(false);
  });

  it('declaring it made no visual type runtime-dynamic: Group, Text, Button and Checkbox are still fully checked', () => {
    for (const t of ['Group', 'Text', 'net.noodl.controls.button', 'net.noodl.controls.checkbox', 'net.noodl.visual.columns']) {
      expect(catalog.hasRuntimeDynamicPorts(t)).toBe(false);
    }
  });

  it('the editor and the validator read one rule: the shipped rule mints `data-testid` and refuses `onclick`', () => {
    const groups = catalog.getNode('Text')?.dynamicPorts?.declaredPortGroups;
    expect(derivedPortsForNode(groups, { dataAttributes: 'data-testid,onclick' }).map((p) => p.name)).toEqual(['data-testid']);
  });
});

describe('ISL-009 — a wire into a data-* port', () => {
  it('reaches a name the node lists, and is refused for one it does not (Boolean beside it still refused)', () => {
    const listed = node('card', 'Text', { dataAttributes: 'data-testid' });
    const unlisted = node('other', 'Text', { dataAttributes: 'data-state' });
    const found = diagnostics(
      [SOURCE, FLAG, listed, unlisted],
      [
        wire('src', 'value', 'card', 'data-testid'),
        wire('src', 'value', 'other', 'data-testid'),
        wire('src', 'value', 'flag', 'data-testid')
      ]
    );
    expect(on(found, 'card', 'data-testid')).toEqual([]);
    expect(on(found, 'other', 'data-testid')).toEqual([DiagnosticCode.NonexistentPort]);
    expect(on(found, 'flag', 'data-testid')).toEqual([DiagnosticCode.NonexistentPort]);
  });

  it('works the same on a node whose runtime also publishes ports (Page Stack keeps its own family)', () => {
    const stack = node('stack', 'Page Stack', { dataAttributes: 'data-testid' });
    const found = diagnostics([SOURCE, stack], [wire('src', 'value', 'stack', 'data-testid')]);
    expect(on(found, 'stack', 'data-testid')).toEqual([]);
    // Page Stack is runtime-discovered, so the wire above would pass by the skip alone. This row is what grades it.
    expect(catalog.derivedPortNames('Page Stack', 'input', { dataAttributes: 'data-testid' })).toEqual(['data-testid']);
  });
});

describe('ISL-009 — a value for a data-* port, and a name the list refuses', () => {
  it('a value for a listed name is read; one for an unlisted name is reported as never read', () => {
    const card = node('card', 'Group', { dataAttributes: 'data-testid', 'data-testid': 'plot-card', 'data-stray': 'x' });
    const found = diagnostics([card]);
    expect(on(found, 'card', 'data-testid')).toEqual([]);
    expect(on(found, 'card', 'data-stray')).toEqual([DiagnosticCode.UnknownParameter]);
  });

  it('`onclick` in the list is refused at write time, as an error that names the rule; `data-ok` beside it is fine', () => {
    const card = node('card', 'Group', { dataAttributes: 'onclick,data-ok', onclick: 'alert(1)', 'data-ok': 'yes' });
    const found = diagnostics([card]);
    const refusal = found.find((d) => d.location.nodeId === 'card' && d.location.port === 'dataAttributes');
    expect(refusal?.code).toBe(DiagnosticCode.InvalidParameterValue);
    expect(refusal?.severity).toBe('error');
    expect(refusal?.message).toContain('"onclick"');
    expect(refusal?.message).toContain('a data attribute name: "data-"');
    // The value for the refused name names no port either.
    expect(on(found, 'card', 'onclick')).toEqual([DiagnosticCode.UnknownParameter]);
    expect(on(found, 'card', 'data-ok')).toEqual([]);
    expect(found.filter((d) => d.location.port === 'dataAttributes')).toHaveLength(1);
  });
});
