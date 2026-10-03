/**
 * P109 ISL-003 AC5 — three cards, each a Repeater over its own Static Data lines numbered `l0…l2`, built through the door.
 *
 * Olive's Island's shape (five lesson cards, every card's lines numbered from `l0`), at its smallest. Ruled "Each list
 * keeps its rows" (2026-10-03): each card shows its own lines. Over a runtime from before the fix, all three cards show
 * the last table's lines.
 *
 *   npx ts-node -T -P ./scripts/tsconfig.json -e "require('./packages/noodl-mcp/tests/isl003ThreeCards').buildThreeCards(process.argv[1])" <out>
 *
 * Driven by `scripts/devtools/drive-isl003-three-cards.js` on a `nodegx deploy` of the output.
 *
 * @module noodl-mcp/tests/isl003ThreeCards
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

import { copyTree } from './templatePins';

export const CARDS = [1, 2, 3];
export const lineText = (card: number, line: number) => `card ${card} line ${line}`;

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });
const testid = (name: string) => ({ dataAttributes: 'data-testid', 'data-testid': name });

export async function buildThreeCards(output: string): Promise<{ diagnostics: string[] }> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl003-three-cards-'));
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: 'isl003 three cards', version: '5', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: '2026-10-03T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl003-three-cards', version: '0.0.0' });
  await Promise.all([server.connect(st), client.connect(ct)]);
  const diagnostics: string[] = [];
  const call = async (name: string, args: Record<string, unknown>) => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: Array<{ text: string }> };
    if (res.isError) throw new Error(`${name} refused:\n${res.content?.[0]?.text}`);
    const payload = JSON.parse(res.content?.[0]?.text ?? '{}');
    for (const d of payload.validation?.diagnostics ?? []) diagnostics.push(`${d.severity} ${d.code}: ${d.message}`);
    return payload;
  };

  await call('create_component', {
    path: 'App',
    nodes: [
      { id: 'a_root', type: 'Group', label: 'App', parameters: { flexDirection: 'column' } },
      { id: 'a_router', type: 'Router', label: 'Router', parent: 'a_root', parameters: { name: 'Main' } }
    ],
    connections: []
  });

  // One line of a card: its text arrives on the `text` input.
  await call('create_component', {
    path: 'Cards/Line',
    nodes: [
      { id: 'l_text', type: 'Text', label: 'Line', parameters: { text: '?' } },
      { id: 'l_in', type: 'Component Inputs', label: 'Inputs', ports: [{ name: 'text', type: 'string', plug: 'output' }] }
    ],
    connections: [wire('l_in', 'text', 'l_text', 'text')]
  });

  const nodes: Array<Record<string, unknown>> = [
    { id: 'h_page', type: 'Page', label: 'Home', parameters: { title: 'Three cards', urlPath: '' } },
    { id: 'h_root', type: 'Group', label: 'Root', parent: 'h_page', parameters: { flexDirection: 'column' } }
  ];
  const connections: Array<Record<string, string>> = [];
  for (const n of CARDS) {
    // Every table numbers its lines from l0, as a person (and the island) writes them.
    const rows = [0, 1, 2].map((i) => ({ id: `l${i}`, text: lineText(n, i) }));
    nodes.push(
      { id: `h_card${n}`, type: 'Group', label: `Card ${n}`, parent: 'h_root', parameters: { flexDirection: 'column', sizeMode: 'contentHeight', ...testid(`card-${n}`) } },
      { id: `h_list${n}`, type: 'For Each', label: `Lines ${n}`, parent: `h_card${n}`, parameters: { templateType: 'explicit', template: '/Cards/Line' } },
      { id: `h_data${n}`, type: 'Static Data', label: `Lines of card ${n}`, parameters: { type: 'json', json: JSON.stringify(rows) } }
    );
    connections.push(wire(`h_data${n}`, 'items', `h_list${n}`, 'items'));
  }
  await call('create_component', { path: 'Pages/Home', nodes, connections });

  await client.close();
  await server.close();
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(dir, output);
  return { diagnostics };
}
