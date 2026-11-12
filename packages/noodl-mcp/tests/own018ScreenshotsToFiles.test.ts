/**
 * P112 OWN-018 s2 — `--screenshots-to-files` (P112-OWN018-IMAGECACHE).
 *
 * Measured against api.mistral.ai with requests recorded from a Mistral Large 4 build: two requests that extend each
 * other exactly cached 0 tokens while the history held two screenshots, 93,676 of 96,100 with the images replaced by
 * text, and 0 again with them replaced by a 1×1 PNG — any image part turns Mistral's prompt cache off for the whole
 * request. `render_report` inlines its screenshots by default, so for a Mistral session one render made every later
 * step full price until a compaction dropped it.
 *
 * The flag is chosen by whoever starts the server (create-nodegx writes it for OpenCode and Mistral Vibe), never by
 * the model. Pinned here, through the same stub-CLI seam as fld011OutDir (`NODEGX_RENDER_CLI`):
 *  - with the flag and no `out_dir`, the CLI is sent `--out-dir <project>/.previews/render`, the response carries no
 *    image, and the manifest says what opening an image costs;
 *  - 🟢 control: without the flag the default is byte-for-byte today's (inline images arrive), so the absence above
 *    means something;
 *  - an explicit `out_dir` still wins, and `screenshot: "none"` still writes nothing.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';
import { copyFixture } from './helpers';

interface RawContentResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string; data?: string }>;
}

const PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** A stand-in for measure-from-disk.js: logs its argv; writes one file per page under --out-dir, or inlines one image. */
function writeStubCli(argvLog: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own018-shots-'));
  const file = path.join(dir, 'stub-cli.js');
  const report = {
    project: '(stub)',
    viewports: { phone: { requested: { width: 390, height: 844 } } },
    pages: [{ component: 'Pages/Home', urlPath: '/', isStart: true, measured: true, viewports: { phone: {} } }],
    findings: [],
    summary: 'Rendered clean.'
  };
  fs.writeFileSync(
    file,
    `
const fs = require('fs'); const path = require('path');
const argv = process.argv.slice(2);
fs.writeFileSync(${JSON.stringify(argvLog)}, JSON.stringify(argv));
const report = ${JSON.stringify(report)};
const i = argv.indexOf('--out-dir');
if (i !== -1) {
  fs.mkdirSync(argv[i + 1], { recursive: true });
  const f = path.join(argv[i + 1], 'pages-home-phone.png');
  fs.writeFileSync(f, Buffer.from(${JSON.stringify(PIXEL_PNG)}, 'base64'));
  report.pages[0].viewports.phone = { screenshot: f };
} else if (argv.includes('--inline-screenshots')) {
  report.screenshots = [{ name: 'phone', mimeType: 'image/png', base64: ${JSON.stringify(PIXEL_PNG)} }];
}
console.log(JSON.stringify(report));
`,
    'utf8'
  );
  return file;
}

describe('P112 OWN-018 — --screenshots-to-files', () => {
  const originalCli = process.env.NODEGX_RENDER_CLI;
  let argvLog: string;
  let close: (() => Promise<void>) | undefined;

  beforeEach(() => {
    argvLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'own018-argv-')), 'argv.json');
    process.env.NODEGX_RENDER_CLI = writeStubCli(argvLog);
  });
  afterEach(async () => {
    if (close) await close();
    close = undefined;
    if (originalCli === undefined) delete process.env.NODEGX_RENDER_CLI;
    else process.env.NODEGX_RENDER_CLI = originalCli;
  });

  async function render(screenshotsToFiles: boolean, args: Record<string, unknown> = {}) {
    const projectDir = copyFixture();
    const { server } = createServer({ projectDir, allowWrites: false, screenshotsToFiles });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'own018', version: '0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    close = async () => {
      await client.close();
      await server.close();
    };
    const res = (await client.callTool({ name: 'render_report', arguments: args })) as RawContentResult;
    const text = res.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
    return { res, text, projectDir, argv: JSON.parse(fs.readFileSync(argvLog, 'utf8')) as string[] };
  }

  it('🟢 control — without the flag, the default still inlines the images, exactly as before', async () => {
    const { res, argv, projectDir } = await render(false);
    // P112-OWN019 R39: three sizes by default; P125-PUPPY2-RENDER1MB (2d0fe7534): the image budget — the two deliberate extras.
    expect(argv).toEqual([projectDir, '--json', '--screenshot', 'full', '--inline-screenshots', '--image-budget', '600000', '--scale', '0.4', '--viewports', 'desktop,768x1024,phone']);
    expect(res.content.filter((c) => c.type === 'image')).toHaveLength(1);
  });

  it('🔴 with the flag and no out_dir: files under <project>/.previews/render, no image in the response', async () => {
    const { res, text, argv, projectDir } = await render(true);
    const outDir = path.join(projectDir, '.previews', 'render');
    expect(argv[argv.indexOf('--out-dir') + 1]).toBe(outDir);
    expect(argv).not.toContain('--inline-screenshots');
    expect(res.content.filter((c) => c.type === 'image')).toHaveLength(0);
    expect(text).not.toContain(PIXEL_PNG);
    expect(fs.existsSync(path.join(outDir, 'pages-home-phone.png'))).toBe(true);
    expect(text).toContain(`1 screenshot written to ${outDir}`);
    expect(text).toContain('every later request then goes uncached until the session is compacted');
  });

  it('🔴 an explicit out_dir still wins, and its manifest carries the same sentence', async () => {
    // P112-OWN020-OUTDIRANYWHERE: an explicit out_dir is a folder in the project.
    const { argv, text, projectDir } = await render(true, { out_dir: '.previews/mine' });
    expect(argv[argv.indexOf('--out-dir') + 1]).toBe(path.join(projectDir, '.previews', 'mine'));
    expect(text).toContain('uncached until the session is compacted');
  });

  it('🔴 screenshot "none" still writes nothing and sends no --out-dir', async () => {
    const { argv, res } = await render(true, { screenshot: 'none' });
    expect(argv).not.toContain('--out-dir');
    expect(res.content.filter((c) => c.type === 'image')).toHaveLength(0);
  });

  it('🔴 the manifest of a caller who chose out_dir on a server WITHOUT the flag is unchanged', async () => {
    const { text } = await render(false, { out_dir: '.previews/mine' });
    expect(text).toContain('READ the ones you need');
    expect(text).not.toContain('uncached');
  });
});
