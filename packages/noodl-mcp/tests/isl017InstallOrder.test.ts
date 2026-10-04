/**
 * P109 ISL-017 AC3 — the three garden kits installed in two orders give the same catalog and the same files.
 *
 * GAM-018's rule (a kit registers the same whatever is installed beside it), read through the door: two fresh
 * projects, `install_prefab` for garden-kit, game-kit and garden-3d-kit from the repository's own library, in opposite
 * orders, each server in reproducible mode. Then the kits' node types as the catalog lists them, and every installed
 * file byte for byte.
 *
 * ⚠️ One file differs by design: `kit-provenance.json` keeps one record per install, in install order. It is read as
 * a set here and that difference is asserted, so a change to its ordering is seen rather than hidden.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildKitExtractor, copyFixture } from './helpers';
import { createServer } from '../src/server';

const KITS = ['garden-kit', 'game-kit', 'garden-3d-kit'];
const EPOCH = '2026-09-27T00:00:00.000Z';
const PROVENANCE = 'kit-provenance.json';

let extractorDir: string;
const made: string[] = [];

beforeAll(async () => {
  extractorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl017-order-extract-'));
  process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(extractorDir);
}, 120_000);

afterAll(() => {
  delete process.env.NODEGX_KIT_EXTRACT;
  for (const dir of [extractorDir, ...made]) fs.rmSync(dir, { recursive: true, force: true });
});

/** Every file under `dir` with its bytes. */
function tree(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (rel: string) => {
    for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = rel ? path.join(rel, d.name) : d.name;
      if (d.isDirectory()) walk(r);
      else out.set(r, fs.readFileSync(path.join(dir, r)));
    }
  };
  walk('');
  return out;
}

async function installInOrder(order: string[]): Promise<{ modules: Map<string, Buffer>; catalog: unknown[] }> {
  const projectDir = copyFixture();
  made.push(projectDir);
  const { server } = createServer({ projectDir, allowWrites: true, reproducible: { namespace: 'isl017', epoch: EPOCH } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl017-order', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await client.callTool({ name: 'find_tools', arguments: { group: 'explore' } });
    for (const slug of order) {
      const res = (await client.callTool({ name: 'install_prefab', arguments: { slug, type: 'module' } })) as {
        isError?: boolean;
        content: Array<{ text: string }>;
      };
      if (res.isError) throw new Error(`install_prefab ${slug}: ${res.content[0]?.text}`);
    }
    const listed = (await client.callTool({ name: 'list_node_types', arguments: { include_hidden: true } })) as {
      content: Array<{ text: string }>;
    };
    const rows = (JSON.parse(listed.content[0].text) as { nodeTypes: Array<{ typeName: string }> }).nodeTypes;
    const catalog = rows
      .filter((r) => KITS.some((k) => r.typeName.startsWith(`${k}.`)))
      .sort((x, y) => x.typeName.localeCompare(y.typeName));
    return { modules: tree(path.join(projectDir, 'noodl_modules')), catalog };
  } finally {
    await client.close();
    await server.close();
  }
}

describe('P109 ISL-017 AC3 — two install orders, one result', () => {
  it('the kits’ catalog and every installed file are the same; only the provenance record’s order follows the installs', async () => {
    const a = await installInOrder(KITS);
    const b = await installInOrder([...KITS].reverse());

    // Known-firing: the catalog is not empty, and every kit contributed to it.
    const names = (a.catalog as Array<{ typeName: string }>).map((r) => r.typeName);
    expect(KITS.filter((k) => !names.some((n) => n.startsWith(`${k}.`)))).toEqual([]);
    expect(b.catalog).toEqual(a.catalog);

    expect([...b.modules.keys()].sort()).toEqual([...a.modules.keys()].sort());
    const differ = [...a.modules.keys()].filter((f) => !a.modules.get(f)!.equals(b.modules.get(f)!));
    expect(differ).toEqual([PROVENANCE]);

    const records = (m: Map<string, Buffer>) => JSON.parse(m.get(PROVENANCE)!.toString('utf8')) as Array<{ module: string }>;
    expect(records(a.modules).map((r) => r.module)).toEqual(KITS);
    expect(records(b.modules).map((r) => r.module)).toEqual([...KITS].reverse());
    const bySet = (m: Map<string, Buffer>) => [...records(m)].sort((x, y) => x.module.localeCompare(y.module));
    expect(bySet(b.modules)).toEqual(bySet(a.modules));
  }, 240_000);
});
