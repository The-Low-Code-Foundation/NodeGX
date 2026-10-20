import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR } from '../src/ir/types';

/**
 * P100-UPG001-SNAP — `nodegx export` stopped outright on four real projects with "Cannot access
 * 'snapActionList' before initialization".
 *
 * The shape is *Landing page test V2*'s `ServiceCard`: a `States` node whose `At <state>` feeds a
 * Component Outputs value and whose `Reached <state>` feeds a Component Outputs signal. The
 * value-output pass reads the States output, which registers the node, and registering compiles
 * and snapshots its listener chains. The snapshot rule's helpers (`snapActionList` and the rest)
 * and `chainSnapshotFor` / `chainSnapshots` were `const`s declared hundreds of lines below that
 * pass, so the first such read threw (a temporal-dead-zone error) before anything was written.
 *
 * Built on `glow-desk`, the corpus's States project, so the corpus and its golden do not move.
 *
 * 🔴 **The control is the same project without the Component Outputs reads**, which exported before
 * the fix as well. Without it, the first row could pass on a fixture that never reached the pass.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'glow-desk');
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(FIXTURE, catalog);

const connect = (component: ComponentIR, from: string, fromProperty: string, to: string, toProperty: string, kind: ConnectionIR['kind']) => {
  component.connections.push({ key: `${from}:${fromProperty}->${to}:${toProperty}`, fromId: from, fromProperty, toId: to, toProperty, kind });
};

/** The Glow page with `ServiceCard`'s two reads: `At bright` as a value, `Reached bright` as a signal. */
const withOutputs = (): ExportIR => {
  const ir: ExportIR = JSON.parse(JSON.stringify(baseIr));
  const glow = ir.components.find((c) => c.path === 'Pages/Glow')!;
  glow.nodes.push({
    id: 'outs',
    type: 'Component Outputs',
    catalogRef: 'Component Outputs',
    parameters: [],
    declaredPorts: [
      { name: 'isBright', plug: 'input', kind: 'value' },
      { name: 'brightened', plug: 'input', kind: 'signal' }
    ],
    portKnowledge: 'complete'
  } as unknown as ComponentIR['nodes'][number]);
  connect(glow, 'panel', 'at-bright', 'outs', 'isBright', 'value');
  connect(glow, 'panel', 'reached-bright', 'outs', 'brightened', 'signal');
  return ir;
};

describe('P100-UPG001-SNAP — a States output read by Component Outputs', () => {
  test('the export finishes instead of throwing before anything is written', () => {
    expect(() => emitApp(withOutputs(), catalog)).not.toThrow();
  });

  /** Finishing is not the claim; the app it writes has to be one the exported project's own tsc accepts. */
  test('the emitted app typechecks', () => {
    expect(typecheckEmittedApp(emitApp(withOutputs(), catalog))).toEqual([]);
  });

  /** The States node still translates: the read registered it, and no note says it was declined. */
  test('the States node is translated, not declined, when the first read is the value-output pass', () => {
    const app = emitApp(withOutputs(), catalog);
    expect(app.notes.filter((n) => /States/.test(n) && /panel|not translated|deferred/.test(n))).toEqual([]);
    const glow = app.files[Object.keys(app.files).find((k) => k.endsWith('Glow.tsx'))!];
    expect(glow).toContain('useStates(');
    // Both reads land: the signal fires from the bright listener, and the value is a change prop.
    expect(glow).toContain("bright: () => { reached.set('bright reached'); onBrightened?.(); }");
    expect(glow).toContain('export function GlowPage({ onBrightened, onIsBrightChanged }: GlowPageProps)');
  });

  /** The control: without the Component Outputs reads the same project exported before the fix too. */
  test('the control, the same project with no Component Outputs read, exports', () => {
    expect(() => emitApp(JSON.parse(JSON.stringify(baseIr)), catalog)).not.toThrow();
  });
});
