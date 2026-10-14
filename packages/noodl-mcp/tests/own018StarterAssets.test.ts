/**
 * P112-OWN018-NOSTARTERASSETS + P112-S9-FRESHFONT — a project `create_project` makes starts with the editor's starter
 * set (Inter, Lucide icons, the starter imagery), and its first `validate_project` no longer warns about a typeface
 * nothing ships.
 *
 * Control: before the fix, a made project has no `noodl_modules/` (the first case), `get_style_vocabulary` lists no
 * icon set, and `validate_project` answers `font-face-not-shipped` on `/App`.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { STARTER_ASSETS } from '../src/editor-deps';
import { createServer } from '../src/server';
import { installStarterAssets, resolveStarterAssetRoot } from '../src/starterAssetFiles';

const EDITOR = path.resolve(__dirname, '..', '..', 'noodl-editor');

async function callJson<T>(client: Client, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: Array<{ text: string }> };
  if (res.isError) throw new Error(`${name}: ${res.content?.[0]?.text}`);
  return JSON.parse(res.content[0].text) as T;
}

describe('P112-OWN018-NOSTARTERASSETS — the starter set, from the MCP server', () => {
  let tmp: string;
  const savedEnv = process.env.NODEGX_STARTER_ASSETS_DIR;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'own018-starter-'));
    delete process.env.NODEGX_STARTER_ASSETS_DIR;
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (savedEnv === undefined) delete process.env.NODEGX_STARTER_ASSETS_DIR;
    else process.env.NODEGX_STARTER_ASSETS_DIR = savedEnv;
  });

  it('create_project writes the starter set; the vocabulary lists it and the first check has no font warning', async () => {
    const { server } = createServer({ allowWrites: true });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'own018-starter', version: '0.0.0' });
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
    try {
      const directory = path.join(tmp, 'reading-list');
      const made = await callJson<{ starterAssets: { installed: number; failed?: string } }>(client, 'create_project', {
        directory,
        name: 'Reading List',
        request: 'A reading list: the books I want to read.',
        pages: [{ name: 'Home', purpose: 'The list of books.' }],
        agreed: true
      });
      expect(made.starterAssets).toEqual({ installed: STARTER_ASSETS.length });
      for (const asset of STARTER_ASSETS) expect(fs.existsSync(path.join(directory, asset.to))).toBe(true);

      const vocabulary = JSON.stringify(await callJson(client, 'get_style_vocabulary'));
      expect(vocabulary).toContain('lucide');
      expect(vocabulary).toContain('starter-imagery');

      const report = await callJson<{ diagnostics: Array<{ code: string }> }>(client, 'validate_project');
      expect(report.diagnostics.map((d) => d.code)).not.toContain('font-face-not-shipped');

      // The control beside the absence: without the shipped Inter, the same check names the typeface.
      fs.rmSync(path.join(directory, 'noodl_modules', 'inter'), { recursive: true });
      const without = await callJson<{ diagnostics: Array<{ code: string }> }>(client, 'validate_project');
      expect(without.diagnostics.map((d) => d.code)).toContain('font-face-not-shipped');
    } finally {
      await client.close();
      await server.close();
    }
  }, 60_000);

  it('the npm layout (prepack copy) holds every listed asset, byte for byte with the editor’s', () => {
    const shipped = path.join(tmp, 'starter-assets');
    execFileSync(process.execPath, [path.join(__dirname, '..', 'build-starter-assets-copy.mjs'), shipped]);
    process.env.NODEGX_STARTER_ASSETS_DIR = shipped;
    const project = path.join(tmp, 'p');
    const outcome = installStarterAssets(project);
    expect(outcome.failed).toBeUndefined();
    expect(outcome.written).toHaveLength(STARTER_ASSETS.length);
    for (const asset of STARTER_ASSETS) {
      expect(fs.readFileSync(path.join(project, asset.to)).equals(fs.readFileSync(path.join(EDITOR, asset.from)))).toBe(true);
    }
  });

  it('leaves a file the project already has, and reports a server with no set instead of throwing', () => {
    const project = path.join(tmp, 'p');
    const own = path.join(project, 'noodl_modules', 'inter', 'styles.css');
    fs.mkdirSync(path.dirname(own), { recursive: true });
    fs.writeFileSync(own, '/* mine */');
    const outcome = installStarterAssets(project);
    expect(outcome.skipped).toEqual(['noodl_modules/inter/styles.css']);
    expect(fs.readFileSync(own, 'utf8')).toBe('/* mine */');

    const nowhere = resolveStarterAssetRoot(os.tmpdir());
    expect(nowhere.ok).toBe(false);
    const none = installStarterAssets(path.join(tmp, 'q'), os.tmpdir());
    expect(none.written).toEqual([]);
    expect(none.failed).toMatch(/not found/);
  });
});
