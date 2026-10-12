/**
 * P109-S40-ROWWRAPINSTANCE — `row-cannot-wrap` through the door, when the row is another component's root.
 *
 * ISL-022 AC6's first round (§8 s4): asked for a top bar with a cluster of five tabs that wraps, Claude Code built
 * `Tab Bar` (its ROOT is the cluster) and placed it in `Top Bar`'s row. Had it set `flexWrap` on that root, the shape
 * would be the garden's `brTabs` exactly, split across two components, and the rule read one component, so nothing in the
 * door could have named it. This spec writes those two components in the order the doctrine asks (leaves first) and
 * reads what each write says: the leaf alone has nothing to report (its root has no parent), and the write that places
 * it in a row names the placement. The control is the same placement in a column, which wraps and is silent.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { CreateComponentResponse } from '../src/tools/responses';
import { call, connect, type TestSession } from './helpers';

const DEMO = path.resolve(__dirname, 'fixtures', 'demo-app');

let session: TestSession;
let tempRoot: string;

beforeAll(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'isl022-across-'));
  const dir = path.join(tempRoot, 'demo-app');
  fs.cpSync(DEMO, dir, { recursive: true });
  session = await connect(dir);
}, 120_000);

afterAll(async () => {
  await session?.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

const TABS = ['Today', 'Garden', 'Robots', 'Shop', 'Help'];

async function write(componentPath: string, nodes: unknown[]): Promise<string[]> {
  const r = await call<CreateComponentResponse>(session, 'create_component', { path: componentPath, nodes });
  // eslint-disable-next-line no-console
  if (r.isError) console.log(`door refused ${componentPath}:`, JSON.stringify(r).slice(0, 2000));
  expect(r.isError).toBe(false);
  return (r.data.validation.diagnostics ?? [])
    .filter((d) => d.code === 'row-cannot-wrap')
    .map((d) => `${d.location?.nodeId}:${d.location?.nodeType}`);
}

function topBar(flexDirection: 'row' | 'column'): unknown[] {
  return [
    {
      id: 'tpBar',
      type: 'Group',
      label: 'Top bar',
      parameters: { flexDirection, flexWrap: 'wrap', sizeMode: 'contentHeight', width: { value: 100, unit: '%' } }
    },
    { id: 'tpName', type: 'Text', parent: 'tpBar', parameters: { text: 'Olive', sizeMode: 'contentSize' } },
    { id: 'tpTabs', type: '/Tab Bar', parent: 'tpBar', parameters: {} }
  ];
}

describe('ISL-022 — the door names a wrapping row that is another component’s root, on the write that places it', () => {
  test('the leaf says nothing; placed in a row it is named; placed in a column it is not', async () => {
    const leaf = await write('Tab Bar', [
      {
        id: 'tbRoot',
        type: 'Group',
        label: 'Tabs',
        parameters: { flexDirection: 'row', flexWrap: 'wrap', sizeMode: 'contentSize', columnGap: 'var(--space-1)' }
      },
      ...TABS.map((label, i) => ({
        id: `tb${i}`,
        type: 'net.noodl.controls.button',
        parent: 'tbRoot',
        parameters: { label }
      }))
    ]);
    expect(leaf).toEqual([]);

    expect(await write('Top Bar', topBar('row'))).toEqual(['tpTabs:/Tab Bar']);
    expect(await write('Side Bar', topBar('column'))).toEqual([]);
  });
});
