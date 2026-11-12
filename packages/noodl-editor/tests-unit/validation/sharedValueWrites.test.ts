/**
 * P112 OWN-026 FIX-03 C — `sharedValueWrites.ts`: a shared value written back whole, and two
 * controls starting one save through different first nodes. Both infos, both said in the write's
 * answer (`authoredPreconditionDiagnostics`).
 *
 * The first row is the measured shape (a stranger's build, its words changed): a Record's
 * `prop-score` into a Function, the Function's `out-score` into an Update Record's `prop-score`,
 * and a Button's Click and a Text Input's On Enter both into the Function's Run.
 */

import {
  authoredPreconditionDiagnostics,
  isBlockingForAuthoredOutput
} from '../../src/editor/src/validation/authoredCandidate';
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { FunctionWireLike } from '../../src/editor/src/validation/functionPorts';
import { checkSharedValueWrites } from '../../src/editor/src/validation/sharedValueWrites';

type Node = { id: string; type: string; label?: string; parameters?: Record<string, unknown> };

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): FunctionWireLike => ({
  fromId,
  fromProperty,
  toId,
  toProperty
});

function measuredShape(updateParams: Record<string, unknown> = {}): { nodes: Node[]; wires: FunctionWireLike[] } {
  return {
    nodes: [
      { id: 'record', type: 'DbModel2', label: 'The player', parameters: { collectionName: 'Player' } },
      { id: 'score', type: 'JavaScriptFunction', label: 'Score the answer' },
      { id: 'save', type: 'SetDbModelProperties', label: 'Save the score', parameters: { collectionName: 'Player', ...updateParams } },
      { id: 'check', type: 'net.noodl.controls.button', label: 'Check' },
      { id: 'field', type: 'net.noodl.controls.textinput', label: 'Answer' }
    ],
    wires: [
      wire('record', 'prop-score', 'score', 'in-score'),
      wire('score', 'out-score', 'save', 'prop-score'),
      wire('score', 'out-done', 'save', 'store'),
      wire('check', 'onClick', 'score', 'run'),
      wire('field', 'onEnter', 'score', 'run')
    ]
  };
}

const codes = (nodes: Node[], wires: FunctionWireLike[]) =>
  checkSharedValueWrites(nodes, { component: '/Pages/Play', wires }).map((d) => d.code);

describe('FIX-03 C: shared-value-written-back-whole', () => {
  it('fires on a field worked out from the same field the page read, as an info naming Add To', () => {
    const { nodes, wires } = measuredShape();
    const found = checkSharedValueWrites(nodes, { component: '/Pages/Play', wires });
    expect(found.map((d) => d.code)).toEqual([DiagnosticCode.SharedValueWrittenBackWhole]);
    expect(found[0].severity).toBe('info');
    expect(found[0].message).toContain('"score"');
    expect(found[0].message).toContain('Add To');
    expect(found[0].suggestion).toBe('"addTo": "score"');
    expect(found[0].location).toMatchObject({ nodeId: 'save', port: 'prop-score' });
  });

  it('is silent once the field is in Add To or Only If Unchanged, or under Local only', () => {
    expect(codes(...Object.values(measuredShape({ addTo: 'score' })) as [Node[], FunctionWireLike[]])).toEqual([]);
    expect(codes(...Object.values(measuredShape({ onlyIfUnchanged: 'score' })) as [Node[], FunctionWireLike[]])).toEqual([]);
    expect(codes(...Object.values(measuredShape({ storeType: 'local' })) as [Node[], FunctionWireLike[]])).toEqual([]);
  });

  it('is silent for a Record of another class, another field, or a straight copy', () => {
    const other = measuredShape();
    other.nodes[0].parameters = { collectionName: 'Team' };
    expect(codes(other.nodes, other.wires)).toEqual([]);

    const field = measuredShape();
    field.wires[0] = wire('record', 'prop-name', 'score', 'in-name');
    expect(codes(field.nodes, field.wires)).toEqual([]);

    const copy = measuredShape();
    copy.wires = [wire('record', 'prop-score', 'save', 'prop-score')];
    expect(codes(copy.nodes, copy.wires)).toEqual([]);
  });
});

describe('FIX-03 C: two-controls-start-one-save', () => {
  it('is silent when both controls press the same node: they share the runtime guard', () => {
    const { nodes, wires } = measuredShape({ addTo: 'score' });
    expect(codes(nodes, wires)).toEqual([]);
  });

  it('fires when the two controls reach the save through different first nodes', () => {
    const { nodes, wires } = measuredShape({ addTo: 'score' });
    nodes.push({ id: 'score2', type: 'JavaScriptFunction', label: 'Score from Enter' });
    const rewired = wires.filter((w) => !(w.fromId === 'field'));
    rewired.push(wire('field', 'onEnter', 'score2', 'run'), wire('score2', 'out-done', 'save', 'store'));
    const found = checkSharedValueWrites(nodes, { component: '/Pages/Play', wires: rewired });
    expect(found.map((d) => d.code)).toEqual([DiagnosticCode.TwoControlsStartOneSave]);
    expect(found[0].severity).toBe('info');
    expect(found[0].message).toContain('"Check" and "Answer"');
  });

  it('is silent for a control that opted out with Repeat While Saving', () => {
    const { nodes, wires } = measuredShape({ addTo: 'score' });
    nodes.push({ id: 'score2', type: 'JavaScriptFunction' });
    nodes.find((n) => n.id === 'field')!.parameters = { repeatWhileSaving: true };
    const rewired = wires.filter((w) => !(w.fromId === 'field'));
    rewired.push(wire('field', 'onEnter', 'score2', 'run'), wire('score2', 'out-done', 'save', 'store'));
    expect(codes(nodes, rewired)).toEqual([]);
  });
});

describe('FIX-03 C: said in the write', () => {
  it('reaches authoredPreconditionDiagnostics and never blocks', () => {
    const { nodes, wires } = measuredShape();
    const found = authoredPreconditionDiagnostics({
      component: '/Pages/Play',
      nodes: nodes as never,
      components: ['/Pages/Play'],
      wires,
      catalog: loadDefaultCatalog()
    }).filter((d) => d.code === DiagnosticCode.SharedValueWrittenBackWhole);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('info');
    expect(isBlockingForAuthoredOutput(found[0])).toBe(false);
  });
});
