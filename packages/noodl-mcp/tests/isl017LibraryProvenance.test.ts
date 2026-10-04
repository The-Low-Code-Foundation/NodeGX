/**
 * P109 ISL-017 AC4 — a library install records the entry and its version, never a path.
 *
 * `install_prefab` used to record `fromProject: entry.entryDir`, an absolute path into whichever checkout ran
 * it, so two machines wrote two different `kit-provenance.json` files for the same install and a template could
 * not ship one. It now names the entry (`the NodeGX library entry "tiny-kit" 1.0.0`) on the editor's existing
 * `imported` arm, whose own local record carries no path either (`moduleGate.ts`).
 *
 * The two-machine comparison is two copies of the same shelf at two different paths, each installed from by a
 * fresh server in reproducible mode.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildKitExtractor, copyFixture } from './helpers';
import { createServer } from '../src/server';

const SHELF_FIXTURE = path.join(__dirname, 'fixtures', 'library-shelf');
const EPOCH = '2026-09-27T00:00:00.000Z';

let extractorDir: string;
const made: string[] = [];

beforeAll(async () => {
  extractorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl017-extract-'));
  process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(extractorDir);
}, 120_000);

afterAll(() => {
  delete process.env.NODEGX_LIBRARY_DIR;
  delete process.env.NODEGX_KIT_EXTRACT;
  for (const dir of [extractorDir, ...made]) fs.rmSync(dir, { recursive: true, force: true });
});

/** Install `slug` from a shelf copied to a fresh path; return the provenance file's bytes and the shelf's path. */
async function installFromShelfAt(label: string, slug: string): Promise<{ bytes: string; shelf: string }> {
  const shelf = fs.mkdtempSync(path.join(os.tmpdir(), `isl017-shelf-${label}-`));
  made.push(shelf);
  fs.cpSync(SHELF_FIXTURE, shelf, { recursive: true });
  process.env.NODEGX_LIBRARY_DIR = shelf;

  const projectDir = copyFixture();
  made.push(projectDir);
  const { server } = createServer({ projectDir, allowWrites: true, reproducible: { namespace: 'isl017', epoch: EPOCH } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl017', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await client.callTool({ name: 'find_tools', arguments: { group: 'explore' } });
    const res = (await client.callTool({ name: 'install_prefab', arguments: { slug } })) as {
      isError?: boolean;
      content: Array<{ text: string }>;
    };
    if (res.isError) throw new Error(`install_prefab ${slug}: ${res.content[0]?.text}`);
    return { bytes: fs.readFileSync(path.join(projectDir, 'noodl_modules', 'kit-provenance.json'), 'utf8'), shelf };
  } finally {
    await client.close();
    await server.close();
  }
}

describe('P109 ISL-017 AC4 — library provenance names the entry, not the machine', () => {
  it('names the entry and its version on the imported arm, with no path in it', async () => {
    const { bytes, shelf } = await installFromShelfAt('a', 'tiny-kit');
    expect(JSON.parse(bytes)).toEqual([
      {
        module: 'tiny-kit',
        origin: 'imported',
        fromProject: 'the NodeGX library entry "tiny-kit" 1.0.0',
        importedAt: EPOCH,
        entry: 'tiny-kit',
        entryVersion: '1.0.0'
      }
    ]);
    expect({ holdsTheShelfPath: bytes.includes(shelf), holdsAnyAbsolutePath: /"\//.test(bytes) }).toEqual({
      holdsTheShelfPath: false,
      holdsAnyAbsolutePath: false
    });
  });

  it('🔴 two checkouts at two different paths write the same bytes', async () => {
    const a = await installFromShelfAt('a', 'tiny-kit');
    const b = await installFromShelfAt('b', 'tiny-kit');
    expect(a.shelf).not.toBe(b.shelf);
    expect(b.bytes).toBe(a.bytes);
  });
});
