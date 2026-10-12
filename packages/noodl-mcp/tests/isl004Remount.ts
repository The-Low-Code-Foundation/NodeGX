/**
 * P109 ISL-004 ruling 2 (s18) — does a Component Object keep its value when its component is unmounted and mounted again?
 *
 * Richard ruled "Component Object" as a component's own state and asked for this to be measured first. Page A, built
 * through the door, holds three ways a Tally (a Component Object `count`, a + button, the count shown) leaves the screen
 * and comes back:
 *   - hidden and shown: the Tally sits in a Group whose `mounted` a Switch drives (Hide / Show buttons);
 *   - a For Each row: two Tally rows from a Function's fresh array of the same two ids — Rewrite runs it again (same ids),
 *     Refresh asks the For Each to rebuild, Filter gives it only the second id (a row filtered out; Rewrite brings it back);
 *   - the page left and come back to through the Router (Page A's Keep When Leaving off: a fresh page).
 * The known-firing control is an app-wide Variable counter, which survives everything above.
 *
 *   npx ts-node -T -P ./scripts/tsconfig.json -e "require('./packages/noodl-mcp/tests/isl004Remount').buildRemount(process.argv[1])" <out>
 *
 * Driven by `scripts/devtools/drive-isl004-remount.js` on a `nodegx deploy` of the output.
 *
 * @module noodl-mcp/tests/isl004Remount
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

export async function buildRemount(output: string): Promise<{ diagnostics: string[] }> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl004-remount-'));
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: 'isl004 remount', version: '5', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path', bodyScroll: true }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: '2026-10-05T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl004-remount', version: '0.0.0' });
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

  // The same Tally as ISL-004's keep-page fixture: its own count in its Component Object.
  await call('create_component', {
    path: 'Parts/Tally',
    nodes: [
      { id: 't_root', type: 'Group', label: 'Tally', parameters: { flexDirection: 'row', sizeMode: 'contentHeight' } },
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
      { id: 'pa_page', type: 'Page', label: 'A', parameters: { title: 'Page A', urlPath: '' } },
      { id: 'pa_root', type: 'Group', label: 'Root', parent: 'pa_page', parameters: { flexDirection: 'column' } },

      // 1. Hidden and shown: the Group's `mounted` follows a Switch that starts on.
      { id: 'pa_hidewrap', type: 'Group', label: 'Hideable', parent: 'pa_root', parameters: { sizeMode: 'contentHeight', ...testid('hide-tally') } },
      { id: 'pa_hidetally', type: '/Parts/Tally', label: 'Tally', parent: 'pa_hidewrap' },
      { id: 'pa_switch', type: 'Switch', label: 'Shown', parameters: { onFromStart: true } },
      { id: 'pa_hide', type: 'Button', label: 'Hide', parent: 'pa_root', parameters: { label: 'hide', ...testid('hide') } },
      { id: 'pa_show', type: 'Button', label: 'Show', parent: 'pa_root', parameters: { label: 'show', ...testid('show') } },

      // 2. For Each rows: a fresh array of the same two ids each time the Function runs.
      { id: 'pa_rows', type: 'Group', label: 'Rows', parent: 'pa_root', parameters: { sizeMode: 'contentHeight', ...testid('rows') } },
      { id: 'pa_each', type: 'For Each', label: 'Each row', parent: 'pa_rows', parameters: { template: '/Parts/Tally' } },
      {
        id: 'pa_items',
        type: 'JavaScriptFunction',
        label: 'Two rows',
        parameters: { functionScript: "Outputs.items = [{ id: 'isl004-row-1' }, { id: 'isl004-row-2' }];" }
      },
      { id: 'pa_rewrite', type: 'Button', label: 'Rewrite', parent: 'pa_root', parameters: { label: 'rewrite', ...testid('rewrite') } },
      {
        id: 'pa_filtered',
        type: 'JavaScriptFunction',
        label: 'Second row only',
        parameters: { functionScript: "Outputs.items = [{ id: 'isl004-row-2' }];" }
      },
      { id: 'pa_filter', type: 'Button', label: 'Filter', parent: 'pa_root', parameters: { label: 'filter', ...testid('filter') } },
      { id: 'pa_refresh', type: 'Button', label: 'Refresh', parent: 'pa_root', parameters: { label: 'refresh', ...testid('refresh') } },

      // Known-firing control: app-wide state survives all of the above.
      { id: 'pa_app', type: 'Text', label: 'App taps', parent: 'pa_root', parameters: { text: '0', ...testid('app-count') } },
      { id: 'pa_appplus', type: 'Button', label: 'App plus', parent: 'pa_root', parameters: { label: 'app +', ...testid('app-plus') } },
      { id: 'pa_appadd', type: 'JavaScriptFunction', label: 'App add', parameters: { functionScript: 'Noodl.Variables.isl004RemountTaps = (Noodl.Variables.isl004RemountTaps || 0) + 1;' } },
      { id: 'pa_appvar', type: 'Variable2', label: 'Taps', parameters: { name: 'isl004RemountTaps' } },

      // 3. The page left and come back to (Keep When Leaving off).
      { id: 'pa_go', type: 'Button', label: 'To B', parent: 'pa_root', parameters: { label: 'to B', ...testid('to-b') } },
      { id: 'pa_nav', type: 'RouterNavigate', label: 'Go B', parameters: { target: '/Pages/B' } }
    ],
    connections: [
      wire('pa_switch', 'state', 'pa_hidewrap', 'mounted'),
      wire('pa_hide', 'onClick', 'pa_switch', 'off'),
      wire('pa_show', 'onClick', 'pa_switch', 'on'),
      wire('pa_page', 'didMount', 'pa_items', 'run'),
      wire('pa_rewrite', 'onClick', 'pa_items', 'run'),
      wire('pa_items', 'out-items', 'pa_each', 'items'),
      wire('pa_refresh', 'onClick', 'pa_each', 'refresh'),
      wire('pa_filter', 'onClick', 'pa_filtered', 'run'),
      wire('pa_filtered', 'out-items', 'pa_each', 'items'),
      wire('pa_appplus', 'onClick', 'pa_appadd', 'run'),
      wire('pa_appvar', 'value', 'pa_app', 'text'),
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
