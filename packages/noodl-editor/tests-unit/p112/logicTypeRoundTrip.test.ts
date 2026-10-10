/**
 * P112-S7-LOGICTYPE — a component's declared `type` survives the editor's save.
 *
 * `buildComponentV2Files` wrote `type: inferComponentType(name)`, a guess from the path (`Pages/` → page, else
 * visual), so the first editor save of a component authored as `logic` wrote `visual` into its `component.json`
 * while the registry kept `logic`. Found by the editor suite's Electron adapter (P112 OWN-006 AC3) on its small
 * fixture's `Logic/Counter`.
 *
 * The carry is LEG-006's shape — importer, model, exporter, duplicate — and is made only when the declared type is
 * not what the name would say, so no other component gains a key and a save that changed nothing writes nothing (F46).
 * The model leg runs in the Electron suite (`tests/editor-suite/electronAdapter.test.ts`, the small fixture).
 */
import { buildComponentV2Files } from '../../src/editor/src/io/ProjectExporter';
import { reconstructLegacyComponent } from '../../src/editor/src/io/ProjectImporter';
import type { ComponentV2File, ConnectionsV2File, NodesV2File } from '../../src/editor/src/schemas';

const NOW = '2026-10-10T00:00:00.000Z';

function roundTrip(path: string, type: ComponentV2File['type']) {
  const componentFile = { id: 'c1', name: path.split('/').pop(), path: `/${path}`, type } as ComponentV2File;
  const nodes = { componentId: 'c1', version: 1, nodes: [{ id: 'n1', type: 'Number' }] } as unknown as NodesV2File;
  const connections = { componentId: 'c1', version: 1, connections: [] } as unknown as ConnectionsV2File;
  const legacy = reconstructLegacyComponent(path, componentFile, nodes, connections);
  return { legacy, written: buildComponentV2Files(legacy, NOW).component };
}

describe('P112-S7-LOGICTYPE — the declared component type survives a save', () => {
  it('a logic component is saved as logic, not as the visual its name would guess', () => {
    expect(roundTrip('Logic/Counter', 'logic').written.type).toBe('logic');
  });

  it('a page outside Pages/ and a visual inside it keep what they declared', () => {
    expect(roundTrip('Screens/Start', 'page').written.type).toBe('page');
    expect(roundTrip('Pages/Card', 'visual').written.type).toBe('visual');
  });

  it('F46: a component whose name already says its type carries no extra key', () => {
    const page = roundTrip('Pages/Home', 'page');
    const visual = roundTrip('Widgets/Card', 'visual');
    expect('componentType' in page.legacy).toBe(false);
    expect('componentType' in visual.legacy).toBe(false);
    expect(page.written.type).toBe('page');
    expect(visual.written.type).toBe('visual');
  });
});
