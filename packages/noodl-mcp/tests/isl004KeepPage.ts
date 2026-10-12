/**
 * P109 ISL-004 AC1/AC2 — a page someone leaves and comes back to, built through the door.
 *
 * Page A holds two copies of `Parts/Tally` (each a Component Object `count`, a + button and the count shown), an
 * app-wide Variable counter (the known-firing control: app state survives a round trip today), and a Repeat started
 * when the page loads, its Count shown. Page B has a button back to A. Ruled 2026-10-05 "Yes, if ticked": with
 * `keep` the build ticks Page A's "Keep When Leaving".
 *
 *   npx ts-node -T -P ./scripts/tsconfig.json -e "require('./packages/noodl-mcp/tests/isl004KeepPage').buildKeepPage(process.argv[1], false)" <out>
 *
 * Driven by `scripts/devtools/drive-isl004-keep-page.js` on a `nodegx deploy` of the output.
 *
 * @module noodl-mcp/tests/isl004KeepPage
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

import { copyTree } from './templatePins';

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });
const testid = (name: string) => ({ dataAttributes: 'data-testid', 'data-testid': name });

export async function buildKeepPage(output: string, keep: boolean): Promise<{ diagnostics: string[] }> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl004-keep-page-'));
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: 'isl004 keep page', version: '5', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path', bodyScroll: true }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: '2026-10-05T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl004-keep-page', version: '0.0.0' });
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

  // A tally: its own count in its Component Object, a + that adds one, the count on screen.
  await call('create_component', {
    path: 'Parts/Tally',
    nodes: [
      { id: 't_root', type: 'Group', label: 'Tally', parameters: { flexDirection: 'row' } },
      { id: 't_count', type: 'Text', label: 'Count', parent: 't_root', parameters: { text: '0', ...testid('count') } },
      { id: 't_plus', type: 'Button', label: 'Plus', parent: 't_root', parameters: { label: '+', ...testid('plus') } },
      { id: 't_obj', type: 'net.noodl.ComponentObject', label: 'Mine', parameters: { properties: 'count' } },
      {
        id: 't_add',
        type: 'JavaScriptFunction',
        label: 'Add one',
        parameters: { functionScript: "const o = Component.Object;\no.set('count', (o.get('count') || 0) + 1);" }
      }
    ],
    connections: [wire('t_plus', 'onClick', 't_add', 'run'), wire('t_obj', 'value-count', 't_count', 'text')]
  });

  // B first, without its way back: a Navigate must name a page that exists.
  await call('create_component', {
    path: 'Pages/B',
    nodes: [
      { id: 'pb_page', type: 'Page', label: 'B', parameters: { title: 'Page B', urlPath: 'b' } },
      { id: 'pb_root', type: 'Group', label: 'Root', parent: 'pb_page', parameters: { flexDirection: 'column' } },
      { id: 'pb_text', type: 'Text', label: 'Here', parent: 'pb_root', parameters: { text: 'Page B', ...testid('page-b') } },
      { id: 'pb_back', type: 'Button', label: 'Back', parent: 'pb_root', parameters: { label: 'back to A', ...testid('to-a') } }
    ],
    connections: []
  });

  await call('create_component', {
    path: 'Pages/A',
    nodes: [
      { id: 'pa_page', type: 'Page', label: 'A', parameters: { title: 'Page A', urlPath: '', ...(keep ? { keepWhenLeaving: true } : {}) } },
      { id: 'pa_root', type: 'Group', label: 'Root', parent: 'pa_page', parameters: { flexDirection: 'column' } },
      { id: 'pa_t1', type: 'Group', label: 'Tally 1', parent: 'pa_root', parameters: { sizeMode: 'contentHeight', ...testid('tally-1') } },
      { id: 'pa_tally1', type: '/Parts/Tally', label: 'Tally', parent: 'pa_t1' },
      { id: 'pa_t2', type: 'Group', label: 'Tally 2', parent: 'pa_root', parameters: { sizeMode: 'contentHeight', ...testid('tally-2') } },
      { id: 'pa_tally2', type: '/Parts/Tally', label: 'Tally', parent: 'pa_t2' },
      // Known-firing control: app-wide state survives a round trip today.
      { id: 'pa_app', type: 'Text', label: 'App taps', parent: 'pa_root', parameters: { text: '0', ...testid('app-count') } },
      { id: 'pa_appplus', type: 'Button', label: 'App plus', parent: 'pa_root', parameters: { label: 'app +', ...testid('app-plus') } },
      { id: 'pa_appadd', type: 'JavaScriptFunction', label: 'App add', parameters: { functionScript: 'Noodl.Variables.isl004Taps = (Noodl.Variables.isl004Taps || 0) + 1;' } },
      { id: 'pa_appvar', type: 'Variable2', label: 'Taps', parameters: { name: 'isl004Taps' } },
      // A clock on the page: started on load, its Count on screen.
      { id: 'pa_clock', type: 'Repeat', label: 'Clock', parameters: { interval: 200 } },
      { id: 'pa_ticks', type: 'Text', label: 'Ticks', parent: 'pa_root', parameters: { text: '0', ...testid('ticks') } },
      { id: 'pa_go', type: 'Button', label: 'To B', parent: 'pa_root', parameters: { label: 'to B', ...testid('to-b') } },
      { id: 'pa_nav', type: 'RouterNavigate', label: 'Go B', parameters: { target: '/Pages/B' } }
    ],
    connections: [
      wire('pa_appplus', 'onClick', 'pa_appadd', 'run'),
      wire('pa_appvar', 'value', 'pa_app', 'text'),
      wire('pa_page', 'didMount', 'pa_clock', 'start'),
      wire('pa_clock', 'count', 'pa_ticks', 'text'),
      wire('pa_go', 'onClick', 'pa_nav', 'navigate')
    ]
  });

  await call('update_component', {
    path: 'Pages/B',
    operations: [
      { op: 'add_node', node: { id: 'pb_nav', type: 'RouterNavigate', label: 'Go A', parameters: { target: '/Pages/A' } } },
      { op: 'add_connection', connection: wire('pb_back', 'onClick', 'pb_nav', 'navigate') }
    ]
  });

  // The door registers pages in the order they are written, so B (written first) would open the app. A must.
  await call('update_component', {
    path: 'App',
    operations: [{ op: 'update_node', id: 'a_router', parameters: { pages: { startPage: '/Pages/A', routes: ['/Pages/A', '/Pages/B'] } } }]
  });

  await client.close();
  await server.close();
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(dir, output);
  return { diagnostics };
}
