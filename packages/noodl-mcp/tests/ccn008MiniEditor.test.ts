/**
 * P125 CCN-008 — a mini editor in the message: the server half (AC1, AC2, the write path of AC3, the 3D stage of AC5).
 *
 * The panel itself is graded in a browser (`dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs`);
 * here: the controls built from the part's own settings list, the refusals that name what the part does have, the
 * stored record and `reopen`, the proxy's paths (the person's change written to the project and seen by
 * `what_changed_since` as a change the agent has not read), the decision and its message, the stage tree, and the
 * hold letting the agent ask.
 *
 * Studio is a stand-in (`editor/serve.mjs` reporting a port), found through NODEGX_STUDIO, so the tool starts it the
 * way it starts the real one.
 *
 * @module noodl-mcp/tests/ccn008MiniEditor
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { clearProjectOverlay } from '../src/kitOverlay';
import { createServer } from '../src/server';
import { studioFor } from '../src/studio/studioProcess';
import { startStudioProxy, type StudioProxy } from '../src/studio/studioProxy';
import { buildKitExtractor, call, copyFixture, reveal, type TestSession } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { panelSourceText } = require('../scripts/embed-mini-editor.cjs') as { panelSourceText: () => string };

const REPO = path.join(__dirname, '..', '..', '..');
const KIT = path.join(REPO, 'library', 'modules', 'three-kit', 'project', 'noodl_modules', 'three-kit');
const FIXTURE_3D = path.join(REPO, 'dev-docs', 'parked', 'three-in-nodes', 'fixture');

const FAKE_STUDIO = `import http from 'node:http';
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html>studio'); });
server.listen(0, '127.0.0.1', () => { console.log('nodegx-studio: http://127.0.0.1:' + server.address().port + '/  (fake)'); });
`;

type Shown = {
  ok: boolean;
  miniEditorId: string;
  panelId: string;
  issuedAt: number;
  url: string | null;
  stage: string;
  settings: Array<{ label: string; node: string; port: string; control: string; value: unknown }>;
  variants?: string[];
  note: string;
};
type Refusal = { error: { code: string; message: string; details?: Record<string, unknown> } };

interface Session extends TestSession {
  proxy: StudioProxy;
}

async function connectWithProxy(projectDir: string, clientName = 'test-client'): Promise<Session> {
  const proxy = await startStudioProxy();
  const { server, binding } = createServer({ projectDir, allowWrites: true, studioProxy: proxy });
  const store = binding.require();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: clientName, version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    store,
    projectDir,
    proxy,
    close: async () => {
      await client.close();
      await server.close();
      proxy.close();
      // the stand-in Studio the tool started for this project (a real server stops its Studios when it exits)
      const pid = studioFor(projectDir)?.pid;
      if (pid) {
        try {
          process.kill(pid);
        } catch {
          /* gone */
        }
      }
    }
  };
}

const get = async <T>(s: Session, p: string): Promise<{ status: number; body: T }> => {
  const r = await fetch(`${s.proxy.origin}${p}`);
  return { status: r.status, body: (await r.json()) as T };
};
const post = async <T>(s: Session, p: string, body: unknown): Promise<{ status: number; body: T }> => {
  const r = await fetch(`${s.proxy.origin}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as T };
};

const studio = { dir: '', saved: { studio: process.env.NODEGX_STUDIO, noOpen: process.env.NODEGX_STUDIO_NO_OPEN } };
beforeAll(() => {
  studio.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-studio-'));
  fs.mkdirSync(path.join(studio.dir, 'editor', 'hosted'), { recursive: true });
  fs.writeFileSync(path.join(studio.dir, 'editor', 'serve.mjs'), FAKE_STUDIO);
  fs.writeFileSync(path.join(studio.dir, 'editor', 'hosted', 'mcp-app.js'), 'export class App {}');
  process.env.NODEGX_STUDIO = studio.dir;
  process.env.NODEGX_STUDIO_NO_OPEN = '1';
});
afterAll(() => {
  if (studio.saved.studio === undefined) delete process.env.NODEGX_STUDIO;
  else process.env.NODEGX_STUDIO = studio.saved.studio;
  if (studio.saved.noOpen === undefined) delete process.env.NODEGX_STUDIO_NO_OPEN;
  else process.env.NODEGX_STUDIO_NO_OPEN = studio.saved.noOpen;
  fs.rmSync(studio.dir, { recursive: true, force: true });
});

describe('CCN-008 — the panel the server ships is the panel in the source', () => {
  it('panelSource.ts is generated from panel/mini-editor.js and .css (run scripts/embed-mini-editor.cjs)', () => {
    const onDisk = fs.readFileSync(path.join(__dirname, '..', 'src', 'miniEditor', 'panelSource.ts'), 'utf8');
    expect(onDisk).toBe(panelSourceText());
  });
});

describe('CCN-008 — a mini editor on a 2D part (demo-app)', () => {
  let s: Session;
  beforeAll(async () => {
    s = await connectWithProxy(copyFixture());
    await reveal(s, 'project');
  });
  afterAll(async () => {
    await s.close();
  });

  const showButton = (extra: Record<string, unknown> = {}) =>
    call<Shown | Refusal>(s, 'show_mini_editor', {
      title: 'The Go button',
      ask: 'Is this the button you want?',
      show: { component: '/Pages/Home', node: 'Go Button' },
      settings: [
        { port: 'label', label: 'Words' },
        { node: 'layout', port: 'backgroundColor', label: 'Background' },
        { node: 'title', port: 'fontSize', label: 'Title size', min: 12, max: 64 }
      ],
      ...extra
    });

  it('🔴 builds each control from the part\'s own settings list, with its current value', async () => {
    const r = await showButton();
    expect(r.isError).toBe(false);
    const d = r.data as Shown;
    expect(d.miniEditorId).toMatch(/^me-/);
    expect(d.stage).toBe('Go Button (net.noodl.controls.button)');
    expect(d.settings.map((c) => [c.label, c.node, c.port, c.control])).toEqual([
      ['Words', 'btn', 'label', 'text'],
      ['Background', 'layout', 'backgroundColor', 'color'],
      ['Title size', 'title', 'fontSize', 'units']
    ]);
    expect(d.settings[0].value).toBe('Go');
    expect(d.panelId).toBeTruthy();
    expect(d.url).toBe(`${s.proxy.origin}/__nodegx/mini/view.html?id=${d.miniEditorId}`);
    expect(d.note).toMatch(/END YOUR TURN/);
  });

  it('🔴 a setting the part does not have is refused, naming the settings it does have', async () => {
    const r = await call<Refusal>(s, 'show_mini_editor', {
      title: 'x',
      ask: 'y',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [{ port: 'wingSpan' }]
    });
    expect(r.isError).toBe(true);
    expect(r.data.error.code).toBe('invalid-argument');
    expect(r.data.error.message).toMatch(/has no setting "wingSpan"/);
    expect(r.data.error.message).toMatch(/label/);
    expect(r.data.error.details?.settings).toEqual(expect.arrayContaining(['label']));
  });

  it('a node that is not there is refused with the component\'s nodes; a signal is not a setting', async () => {
    const missing = await call<Refusal>(s, 'show_mini_editor', { title: 'x', ask: 'y', show: { component: '/Pages/Home', node: 'Hero' }, settings: [{ port: 'text' }] });
    expect(missing.data.error.message).toMatch(/No node "Hero".*btn "Go Button"/);
    const signal = await call<Refusal>(s, 'show_mini_editor', { title: 'x', ask: 'y', show: { component: '/Pages/Home', node: 'btn' }, settings: [{ port: 'onClick' }] });
    expect(signal.isError).toBe(true);
  });

  it('a placed component with no node named is staged as its first copy, its controls from Component Inputs or the catalog', async () => {
    const r = await call<Shown>(s, 'show_mini_editor', {
      title: 'The card',
      ask: 'Card ok?',
      show: { component: '/Card' },
      settings: [{ component: '/Card', node: 'card_root', port: 'paddingLeft', min: 0, max: 48 }]
    });
    expect(r.isError).toBe(false);
    expect(r.data.stage).toBe('Info Card (/Card)');
    expect(r.data.settings[0]).toMatchObject({ node: 'card_root', port: 'paddingLeft', value: 16 });
  });

  it('🔴 (drive 1) a setting\'s node is found in the component named, though the stage is its copy on a page', async () => {
    const r = await call<Shown | Refusal>(s, 'show_mini_editor', {
      title: 'The card',
      ask: 'Card words ok?',
      show: { component: '/Card' },
      settings: [{ node: 'Card Label', port: 'text' }]
    });
    expect(r.isError).toBe(false);
    const d = r.data as Shown;
    expect(d.settings[0]).toMatchObject({ node: 'card_text', port: 'text', value: 'I am a card' });
    const view = await get<{ record: { stage: { component: string; node: string; target?: string } } }>(s, `/__nodegx/mini/e/${d.miniEditorId}`);
    // a placed copy draws no element of its own (drive 2): it is targeted by its component's root
    expect(view.body.record.stage).toMatchObject({ component: 'Pages/Home', node: 'page', target: 'card_root' });
    const inner = await call<Shown>(s, 'show_mini_editor', { title: 'The words', ask: '?', show: { component: '/Card', node: 'card_text' }, settings: [{ port: 'text' }] });
    const v2 = await get<{ record: { stage: { component: string; target?: string } } }>(s, `/__nodegx/mini/e/${inner.data.miniEditorId}`);
    expect(v2.body.record.stage).toMatchObject({ component: 'Pages/Home', target: 'card_text' });
  });

  it('🔴 R2: every call is stored; get_mini_editor lists them newest first and reads one', async () => {
    const r = (await showButton({ title: 'Stored one' })).data as Shown;
    const file = path.join(s.projectDir, '.nodegx', 'mini-editors', `${r.miniEditorId}.json`);
    expect(fs.existsSync(file)).toBe(true);
    const list = await call<{ miniEditors: Array<{ id: string; title: string; status: string; answered: boolean }> }>(s, 'get_mini_editor', {});
    expect(list.data.miniEditors[0]).toMatchObject({ id: r.miniEditorId, title: 'Stored one', status: 'open', answered: false });
    const one = await call<{ status: string; note: string }>(s, 'get_mini_editor', { id: r.miniEditorId });
    expect(one.data.status).toBe('open');
    expect(one.data.note).toMatch(new RegExp(`reopen: "${r.miniEditorId}"`));
  });

  it('🔴 AC3 (server): the person\'s change is written to the project, and what_changed_since reports it to the agent', async () => {
    await reveal(s, 'explore');
    const read = await call<{ revision: string }>(s, 'get_component', { path: '/Pages/Home' });
    expect(read.isError).toBe(false);
    const shown = (await showButton({ title: 'Write path' })).data as Shown;
    const view = await get<{ record: { controls: Array<{ key: string; port: string }> } }>(s, `/__nodegx/mini/e/${shown.miniEditorId}`);
    expect(view.status).toBe(200);
    const words = view.body.record.controls.find((c) => c.port === 'label')!;
    const set = await post<{ ok: boolean }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/set`, { key: words.key, value: 'Book a cut' });
    expect(set.status).toBe(200);
    const nodes = JSON.parse(fs.readFileSync(path.join(s.projectDir, 'components', 'Pages', 'Home', 'nodes.json'), 'utf8')) as {
      nodes: Array<{ id: string; parameters?: Record<string, unknown> }>;
    };
    expect(nodes.nodes.find((n) => n.id === 'btn')?.parameters?.label).toBe('Book a cut');
    const changed = await call<{ changed: Array<{ component: string; nodesEdited: Array<{ id: string; settings: string[] }> }> }>(s, 'what_changed_since', {});
    const home = changed.data.changed.find((c) => c.component === 'Pages/Home');
    expect(home?.nodesEdited.find((n) => n.id === 'btn')?.settings).toEqual(['parameters.label: "Go" → "Book a cut"']);
    // the control: the component.json the agent stamps is untouched, so Studio's watcher does not call it the agent's
    const comp = JSON.parse(fs.readFileSync(path.join(s.projectDir, 'components', 'Pages', 'Home', 'component.json'), 'utf8')) as { modifiedBy?: string };
    expect(comp.modifiedBy).not.toBe('noodl-mcp');
  });

  it('🔴 a value outside the control is refused, and nothing is written', async () => {
    const shown = (await showButton({ title: 'Refused write' })).data as Shown;
    const view = await get<{ record: { controls: Array<{ key: string; port: string }> } }>(s, `/__nodegx/mini/e/${shown.miniEditorId}`);
    const size = view.body.record.controls.find((c) => c.port === 'fontSize')!;
    const before = fs.readFileSync(path.join(s.projectDir, 'components', 'Pages', 'Home', 'nodes.json'), 'utf8');
    const r = await post<{ error: string }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/set`, { key: size.key, value: 200 });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/above 64/);
    const other = await post<{ error: string }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/set`, { key: 'Pages/Home:nav.target', value: '/x' });
    expect(other.status).toBe(400);
    expect(fs.readFileSync(path.join(s.projectDir, 'components', 'Pages', 'Home', 'nodes.json'), 'utf8')).toBe(before);
  });

  it('🔴 the decision is stored and worded as the person\'s message; reopen draws it again with it', async () => {
    const shown = (await showButton({ title: 'Decided' })).data as Shown;
    const view = await get<{ record: { controls: Array<{ key: string; port: string }> } }>(s, `/__nodegx/mini/e/${shown.miniEditorId}`);
    const size = view.body.record.controls.find((c) => c.port === 'fontSize')!;
    await post(s, `/__nodegx/mini/e/${shown.miniEditorId}/set`, { key: size.key, value: { value: 40, unit: 'px' } });
    const d = await post<{ ok: boolean; status: string; message: string }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/decide`, {
      outcome: 'approved',
      note: 'Love it.'
    });
    expect(d.body.status).toBe('approved');
    // P125-CCN008-NOSHOWBACK: the person's message asks to see the result, as Richard had to ask by hand.
    expect(d.body.message).toMatch(
      new RegExp(`^Approved: "Decided" \\(mini editor ${shown.miniEditorId}\\)\\. I changed: Title size .* → 40px\\. Love it\\. Apply it where it belongs, then show me the result in the app\\.$`)
    );
    const again = await call<Shown & { status: string; reopened: boolean }>(s, 'show_mini_editor', { reopen: shown.miniEditorId });
    expect(again.isError).toBe(false);
    expect(again.data).toMatchObject({ miniEditorId: shown.miniEditorId, status: 'approved', reopened: true });
    expect(again.data.settings.find((c) => c.port === 'fontSize')?.value).toEqual({ value: 40, unit: 'px' });
    expect(again.data.panelId).not.toBe(shown.panelId);
    const unknown = await call<Refusal>(s, 'show_mini_editor', { reopen: 'me-nope-000000' });
    expect(unknown.data.error.message).toMatch(/Stored: me-/);
  });

  it('variants are keyed to the editor\'s settings; a variant writes all its values and is remembered', async () => {
    const bad = await showButton({ title: 'Bad variants', variants: [{ name: 'Loud', values: { 'btn.wingSpan': 3 } }] });
    expect((bad.data as Refusal).error.message).toMatch(/not one of this editor's settings/);
    const shown = (
      await showButton({
        title: 'Variants',
        variants: [
          { name: 'Calm', values: { label: 'Book', 'title.fontSize': 24 } },
          { name: 'Loud', values: { label: 'BOOK NOW', 'title.fontSize': 48 } }
        ]
      })
    ).data as Shown;
    expect(shown.variants).toEqual(['Calm', 'Loud']);
    const v = await post<{ ok: boolean; values: Record<string, unknown> }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/variant`, { name: 'Loud' });
    expect(v.status).toBe(200);
    const nodes = JSON.parse(fs.readFileSync(path.join(s.projectDir, 'components', 'Pages', 'Home', 'nodes.json'), 'utf8')) as {
      nodes: Array<{ id: string; parameters?: Record<string, unknown> }>;
    };
    expect(nodes.nodes.find((n) => n.id === 'btn')?.parameters?.label).toBe('BOOK NOW');
    expect(nodes.nodes.find((n) => n.id === 'title')?.parameters?.fontSize).toBe(48);
    const d = await post<{ message: string }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/decide`, { outcome: 'approved' });
    expect(d.body.message).toMatch(/I picked "Loud"/);
  });

  it('the stage tree moves the root to the part and leaves the project on disk alone', async () => {
    const shown = (await showButton({ title: 'Stage' })).data as Shown;
    const tree = await get<{ files: Record<string, string>; rootAlias?: unknown }>(s, `/__nodegx/mini/e/${shown.miniEditorId}/files`);
    expect(tree.status).toBe(200);
    // The runtime renders the root node's whole component, so the stage is the page and the button its target.
    expect(JSON.parse(tree.body.files['nodegx.project.json']).rootNodeId).toBe('page');
    expect(tree.body.rootAlias).toBeUndefined();
    const view = await get<{ record: { stage: { component: string; node: string; target?: string } } }>(s, `/__nodegx/mini/e/${shown.miniEditorId}`);
    expect(view.body.record.stage).toMatchObject({ component: 'Pages/Home', node: 'page', target: 'btn' });
    expect(Object.keys(tree.body.files).some((f) => f.startsWith('.nodegx'))).toBe(false);
    const onDisk = JSON.parse(fs.readFileSync(path.join(s.projectDir, 'nodegx.project.json'), 'utf8'));
    expect(onDisk.rootNodeId).toBeUndefined();
  });

  it('the panel\'s page and code are served by the proxy itself, with no Studio needed', async () => {
    const page = await fetch(`${s.proxy.origin}/__nodegx/mini/view.html?id=me-x-000000`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain(`${s.proxy.origin}/__nodegx/mini/app.js`);
    expect(html).toContain('"id":"me-x-000000"');
    const js = await fetch(`${s.proxy.origin}/__nodegx/mini/app.js`);
    expect(js.headers.get('content-type')).toMatch(/javascript/);
    expect(await js.text()).toContain('function liveSet');
    const sdk = await fetch(`${s.proxy.origin}/__nodegx/mini/mcp-app.js`);
    expect(await sdk.text()).toBe('export class App {}');
  });

  it('🔴 the resource is the page at the proxy\'s origin, valid before any call, with the proxy in its CSP', async () => {
    const res = (await s.client.readResource({ uri: 'ui://nodegx/mini-editor.html' })) as {
      contents: Array<{ text: string; mimeType: string; _meta?: { ui?: { csp?: { connectDomains?: string[] } } } }>;
    };
    expect(res.contents[0].mimeType).toBe('text/html;profile=mcp-app');
    expect(res.contents[0].text).toContain(`${s.proxy.origin}/__nodegx/mini/app.js`);
    expect(res.contents[0]._meta?.ui?.csp?.connectDomains).toEqual([s.proxy.origin]);
  });

  it('🔴 a HOLD stops the agent\'s writes but not its question: show_mini_editor and get_mini_editor are exempt', async () => {
    fs.writeFileSync(path.join(s.projectDir, '.nodegx-hold.json'), JSON.stringify({ by: 'NodeGX Studio', at: new Date().toISOString() }));
    try {
      const held = await call<Refusal>(s, 'get_component', { path: '/Pages/Home' });
      expect(held.data.error.code).toBe('held');
      const shown = await showButton({ title: 'While held' });
      expect(shown.isError).toBe(false);
      const read = await call<{ miniEditors: unknown[] }>(s, 'get_mini_editor', {});
      expect(read.isError).toBe(false);
    } finally {
      fs.rmSync(path.join(s.projectDir, '.nodegx-hold.json'));
    }
  });
});

describe('CCN-008 — a mini editor on a 3D model (three-kit)', () => {
  let tempDir: string;
  let s: Session;
  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccn008-3d-'));
    process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(tempDir);
    const project = path.join(tempDir, 'game');
    fs.cpSync(FIXTURE_3D, project, { recursive: true });
    fs.cpSync(KIT, path.join(project, 'noodl_modules', 'three-kit'), { recursive: true });
    s = await connectWithProxy(project);
    await reveal(s, 'project');
  }, 120_000);
  afterAll(async () => {
    await s.close();
    clearProjectOverlay();
    delete process.env.NODEGX_KIT_EXTRACT;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('🔴 R4: a model inside a Scene is staged in its Scene, focused on its own parts, its controls from the kit\'s ports', async () => {
    const r = await call<Shown | Refusal>(s, 'show_mini_editor', {
      title: 'The robot',
      ask: 'Is this your robot?',
      show: { component: '/Pages/Home', node: 'Robot' },
      settings: [
        { node: 'robotBody', port: 'colour', label: 'Body colour', choices: ['#ffa502', '#3742fa', '#2ed573'] },
        { node: 'robotHead', port: 'colour', label: 'Head colour' },
        { port: 'scale', label: 'Size', min: 0.5, max: 3, step: 0.1 },
        { port: 'rotationY', label: 'Turn', min: 0, max: 360 }
      ],
      variants: [
        { name: 'Classic', values: { 'robotBody.colour': '#ffa502', scale: 1 } },
        { name: 'Big blue', values: { 'robotBody.colour': '#3742fa', scale: 2 } }
      ]
    });
    expect(r.isError).toBe(false);
    const d = r.data as Shown;
    expect(d.stage).toBe('Robot (three-kit.Group)');
    expect(d.settings.map((c) => c.control)).toEqual(['color', 'color', 'number', 'number']);
    const view = await get<{ record: { stage: { kind: string; component: string; node: string; scene: string; focus: string[] }; controls: Array<{ control: string; swatches?: unknown[]; custom?: boolean }> } }>(
      s,
      `/__nodegx/mini/e/${d.miniEditorId}`
    );
    expect(view.body.record.stage).toMatchObject({ kind: '3d', component: 'Pages/Home', node: 'page', scene: 'scene' });
    expect(view.body.record.stage.focus.sort()).toEqual(['robot', 'robotBody', 'robotEye', 'robotHead']);
    expect(view.body.record.controls[0]).toMatchObject({ custom: false });
    expect(view.body.record.controls[0].swatches).toHaveLength(3);
    const tree = await get<{ files: Record<string, string> }>(s, `/__nodegx/mini/e/${d.miniEditorId}/files`);
    expect(JSON.parse(tree.body.files['nodegx.project.json']).rootNodeId).toBe('page');
    expect(Object.keys(tree.body.files)).toEqual(expect.arrayContaining(['noodl_modules/three-kit/index.js', 'noodl_modules/three-kit/three.min.js']));
  });

  it('a colour outside the choices the agent gave is refused', async () => {
    const d = (
      await call<Shown>(s, 'show_mini_editor', {
        title: 'Body',
        ask: '?',
        show: { component: '/Pages/Home', node: 'robotBody' },
        settings: [{ port: 'colour', choices: ['#ffa502', '#3742fa'] }]
      })
    ).data;
    const view = await get<{ record: { controls: Array<{ key: string }> } }>(s, `/__nodegx/mini/e/${d.miniEditorId}`);
    const r = await post<{ error: string }>(s, `/__nodegx/mini/e/${d.miniEditorId}/set`, { key: view.body.record.controls[0].key, value: '#000000' });
    expect(r.status).toBe(400);
    const ok = await post<{ ok: boolean }>(s, `/__nodegx/mini/e/${d.miniEditorId}/set`, { key: view.body.record.controls[0].key, value: '#3742fa' });
    expect(ok.status).toBe(200);
  });
});

/**
 * Richard's Muddy Paws run in Claude Desktop (2026-10-25), replayed on the demo app made to look like it: a Button on
 * the project's tokens, a Button style whose hover is red from an earlier edit, and a second Button elsewhere.
 */
describe('CCN-008 AC6 findings — the button options run', () => {
  let s: Session;
  const homeNodes = () => path.join(s.projectDir, 'components', 'Pages', 'Home', 'nodes.json');
  type N = { id: string; type: string; label?: string; parent?: string; children?: string[]; parameters?: Record<string, unknown>; stateParameters?: Record<string, Record<string, unknown>> };
  const readHome = () => JSON.parse(fs.readFileSync(homeNodes(), 'utf8')) as { nodes: N[] };
  const readStyles = () =>
    JSON.parse(fs.readFileSync(path.join(s.projectDir, 'nodegx.styles.json'), 'utf8')) as {
      variants: Array<{ typename: string; name?: string; parameters?: Record<string, unknown>; stateParameters?: Record<string, Record<string, unknown>> }>;
    };

  beforeAll(async () => {
    const dir = copyFixture();
    const projectFile = path.join(dir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(projectFile, 'utf8')) as Record<string, unknown>;
    const token = (name: string, value: string) => ({ name, value, category: 'color-semantic', isCustom: true });
    project.metadata = {
      designTokens: {
        version: 1,
        customTokens: [
          token('--primary', '#1d4ed8'),
          token('--primary-hover', '#1e40af'),
          token('--primary-foreground', '#ffffff'),
          token('--background', '#ffffff'),
          token('--foreground', '#0f172a')
        ]
      }
    };
    fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));
    fs.writeFileSync(
      path.join(dir, 'nodegx.styles.json'),
      JSON.stringify({
        $schema: 'https://opennoodl.dev/schemas/styles-v2.json',
        variants: [{ typename: 'net.noodl.controls.button', parameters: { borderRadius: '8px' }, stateParameters: { hover: { backgroundColor: '#ff0000' } } }]
      })
    );
    const file = path.join(dir, 'components', 'Pages', 'Home', 'nodes.json');
    const home = JSON.parse(fs.readFileSync(file, 'utf8')) as { nodes: N[] };
    const btn = home.nodes.find((n) => n.id === 'btn')!;
    btn.parameters = { ...btn.parameters, color: 'var(--primary-foreground)' };
    home.nodes.push({ id: 'btn2', type: 'net.noodl.controls.button', label: 'Other Button', parent: btn.parent, parameters: { label: 'Other', backgroundColor: '#00ff00' } });
    home.nodes.find((n) => n.id === btn.parent)!.children!.push('btn2');
    fs.writeFileSync(file, JSON.stringify(home, null, 2));
    s = await connectWithProxy(dir);
    await reveal(s, 'project');
  });
  afterAll(async () => {
    await s.close();
  });

  type Ctl = { key: string; port: string; state?: string; value: unknown; swatches?: Array<{ value: string; css: string }>; states?: Record<string, unknown> };
  const controlsOf = async (id: string) => (await get<{ record: { controls: Ctl[]; stage: { states?: string[] } } }>(s, `/__nodegx/mini/e/${id}`)).body.record;

  it('🔴 P125-CCN008-WHITESWATCH: every colour the agent offers is painted with what it resolves to; two that paint the same are a warning', async () => {
    const r = await call<Shown & { warnings?: string[] }>(s, 'show_mini_editor', {
      title: 'Text colour',
      ask: 'Which text colour?',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [{ port: 'color', label: 'Text colour', choices: ['var(--primary-foreground)', 'var(--background)', 'var(--foreground)'] }]
    });
    expect(r.isError).toBe(false);
    const rec = await controlsOf(r.data.miniEditorId);
    // the control: in the run, `background` (the second token painting white) was painted "var(--background)": nothing
    expect(rec.controls[0].swatches!.map((w) => w.css)).toEqual(['#ffffff', '#ffffff', '#0f172a']);
    expect(r.data.warnings?.join(' ')).toMatch(/Text colour: primary-foreground and background all paint #ffffff/);
  });

  it('a guard beside WHITESWATCH: a choice that is no token in the project at all is refused, naming the colour tokens it has', async () => {
    const before = fs.existsSync(path.join(s.projectDir, '.nodegx', 'mini-editors')) ? fs.readdirSync(path.join(s.projectDir, '.nodegx', 'mini-editors')).length : 0;
    const r = await call<Refusal>(s, 'show_mini_editor', {
      title: 'x',
      ask: 'y',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [{ port: 'color', choices: ['var(--primary-foreground)', 'var(--brand-ink)'] }]
    });
    expect(r.isError).toBe(true);
    expect(r.data.error.message).toMatch(/var\(--brand-ink\) is not a token in this project/);
    expect(r.data.error.message).toMatch(/primary-foreground/);
    const after = fs.existsSync(path.join(s.projectDir, '.nodegx', 'mini-editors')) ? fs.readdirSync(path.join(s.projectDir, '.nodegx', 'mini-editors')).length : 0;
    expect(after).toBe(before);
  });

  it('🔴 P125-CCN008-NOSTATES: a button is staged with its looks, a hover that hides the choice is said, and a hover setting writes the hover', async () => {
    const plain = await call<Shown & { warnings?: string[]; states?: string[] }>(s, 'show_mini_editor', {
      title: 'Fill',
      ask: 'Which fill?',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [{ port: 'backgroundColor', label: 'Fill colour', choices: ['var(--primary)', 'var(--foreground)'] }]
    });
    expect(plain.data.states).toEqual(['normal', 'hover', 'pressed', 'disabled']);
    const rec = await controlsOf(plain.data.miniEditorId);
    expect(rec.stage.states).toEqual(['hover', 'pressed', 'disabled']);
    expect(rec.controls[0].states).toEqual({ hover: '#ff0000' }); // the style's red hover, which the node does not override
    expect(plain.data.warnings?.join(' ')).toMatch(/Fill colour: when hover, .* shows #ff0000 instead/);

    const both = await call<Shown & { warnings?: string[] }>(s, 'show_mini_editor', {
      title: 'Fill and hover',
      ask: 'Which fill, and which on hover?',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [
        { port: 'backgroundColor', label: 'Fill colour', choices: ['var(--primary)', 'var(--foreground)'] },
        { port: 'backgroundColor', state: 'hover', label: 'Fill on hover', choices: ['var(--primary-hover)', 'var(--foreground)'] }
      ]
    });
    expect(both.isError).toBe(false);
    expect((both.data.warnings ?? []).join(' ')).not.toMatch(/when hover/);
    const hover = (await controlsOf(both.data.miniEditorId)).controls.find((c) => c.state === 'hover')!;
    expect(hover.key).toBe('Pages/Home:btn.backgroundColor@hover');
    expect(hover.value).toBe('#ff0000');
    const set = await post<{ value: unknown }>(s, `/__nodegx/mini/e/${both.data.miniEditorId}/set`, { key: hover.key, value: 'var(--primary-hover)' });
    expect(set.status).toBe(200);
    expect(readHome().nodes.find((n) => n.id === 'btn')!.stateParameters).toEqual({ hover: { backgroundColor: 'var(--primary-hover)' } });
    // "as normal": the node's own hover goes, and an empty stateParameters with it
    await post(s, `/__nodegx/mini/e/${both.data.miniEditorId}/set`, { key: hover.key, value: null });
    expect(readHome().nodes.find((n) => n.id === 'btn')!.stateParameters).toBeUndefined();
    // a state on a node that has none is refused
    const group = await call<Refusal>(s, 'show_mini_editor', { title: 'x', ask: 'y', show: { component: '/Pages/Home', node: 'layout' }, settings: [{ port: 'backgroundColor', state: 'hover' }] });
    expect(group.data.error.message).toMatch(/not drawn in visual states/);
  });

  it('🔴 P125-CCN008-NOSTYLE: scope "style" writes the project\'s Button style, drops the part\'s own value, and the decision names who keeps their own', async () => {
    const nodeOnly = await call<Shown & { warnings?: string[] }>(s, 'show_mini_editor', {
      title: 'Just this one',
      ask: '?',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [{ port: 'borderRadius' }]
    });
    expect(nodeOnly.data.warnings?.join(' ')).toMatch(/change this one Button only; the project has 2\. .*scope: "style"/);

    // the part sets its own fill, which would beat the style: the style's write takes it off
    const home = readHome();
    home.nodes.find((n) => n.id === 'btn')!.parameters!.backgroundColor = 'var(--primary)';
    fs.writeFileSync(homeNodes(), JSON.stringify(home, null, 2));

    const r = await call<Shown & { warnings?: string[] }>(s, 'show_mini_editor', {
      title: 'The button style',
      ask: 'Which button style?',
      show: { component: '/Pages/Home', node: 'btn' },
      settings: [
        { port: 'backgroundColor', label: 'Fill colour', scope: 'style', choices: ['var(--primary)', 'var(--foreground)'] },
        { port: 'backgroundColor', label: 'Fill on hover', scope: 'style', state: 'hover', choices: ['var(--primary-hover)', 'var(--foreground)'] }
      ]
    });
    expect(r.isError).toBe(false);
    expect((r.data.warnings ?? []).join(' ')).not.toMatch(/this one Button only/);
    const rec = await controlsOf(r.data.miniEditorId);
    const fill = rec.controls.find((c) => !c.state)!;
    const hover = rec.controls.find((c) => c.state === 'hover')!;
    expect(fill.value).toBe('var(--primary)'); // what the part shows now: its own value
    await post(s, `/__nodegx/mini/e/${r.data.miniEditorId}/set`, { key: fill.key, value: 'var(--foreground)' });
    await post(s, `/__nodegx/mini/e/${r.data.miniEditorId}/set`, { key: hover.key, value: 'var(--primary-hover)' });
    const style = readStyles().variants.find((v) => v.typename === 'net.noodl.controls.button' && !v.name)!;
    expect(style.parameters).toEqual({ borderRadius: '8px', backgroundColor: 'var(--foreground)' });
    expect(style.stateParameters).toEqual({ hover: { backgroundColor: 'var(--primary-hover)' } });
    const after = readHome().nodes;
    expect(after.find((n) => n.id === 'btn')!.parameters).not.toHaveProperty('backgroundColor');
    expect(after.find((n) => n.id === 'btn2')!.parameters!.backgroundColor).toBe('#00ff00'); // the other keeps its own
    // the panel reads back what the part shows: the style's value now
    expect((await controlsOf(r.data.miniEditorId)).controls.find((c) => !c.state)!.value).toBe('var(--foreground)');

    const d = await post<{ message: string }>(s, `/__nodegx/mini/e/${r.data.miniEditorId}/decide`, { outcome: 'approved' });
    expect(d.body.message).toMatch(/That is the project's style now\. These keep their own setting instead: Other Button in Home \(Fill colour\)\./);
    expect(d.body.message).toMatch(/show me the result in the app\.$/);
  });
});
