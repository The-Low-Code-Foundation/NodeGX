// P128 S2 ACs: `node ac.mjs <copy of Muddy Paws Shelter>` — the BUILT server (packages/noodl-mcp/dist, what Claude
// Desktop runs) bound to a COPY of the project over stdio, with the real NodeGX Studio started by open_studio
// (NODEGX_STUDIO_NO_OPEN=1, so no window). Prints one JSON line of readings:
//  (1) the two-literals case: validate_component on /Components/Header, the agent's `fr`/`en` steps;
//  (2) the Wording write: the agent's own create of /Components/Wording replayed (read, force-delete, create), with
//      Studio open — does the result name the States node, carry the note, and succeed? And the same create again with
//      Studio closed (a fresh server), the control;
//  (3) the option-set example: get_example('option-set') written into the copy, the page put on the router, then
//      render_report on it (Chrome: run with the sandbox off).
import path from 'node:path';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const require = createRequire(path.join(REPO, 'package.json'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const [project] = process.argv.slice(2);
if (!project) throw new Error('usage: ac.mjs <project dir>');

async function bind() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(REPO, 'packages/noodl-mcp/dist/noodl-mcp.cjs'), project, '--allow-writes'],
    env: { ...process.env, NODEGX_STUDIO_NO_OPEN: '1' },
    stderr: 'ignore'
  });
  const client = new Client({ name: 'p128-s2-ac', version: '0' });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const text = res.content?.[0]?.text ?? '';
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { isError: res.isError === true, data, content: res.content };
  };
  return { client, call };
}

const out = {};
let { client, call } = await bind();

// (1)
const header = await call('validate_component', { path: 'Components/Header' });
const lit = (header.data.diagnostics ?? []).filter((d) => d.code === 'fixed-list-as-literals');
out.twoLiterals = lit.map((d) => ({ severity: d.severity, message: d.message, suggestion: d.suggestion }));
out.headerErrors = header.data.summary?.errors;

// (2) the Wording create, replayed, with Studio open
const wording = await call('get_component', { path: 'Components/Wording' });
const files = { nodes: wording.data.nodes, connections: wording.data.connections };
await call('find_tools', { group: 'project' });
const studio = await call('open_studio');
out.studioOpened = !studio.isError;
const replay = async () => {
  await call('delete_component', { path: 'Components/Wording', force: true });
  return call('create_component', { path: 'Components/Wording', nodes: files.nodes, connections: files.connections, description: wording.data.description });
};
const watched = await replay();
out.wordingWatched = {
  isError: watched.isError,
  error: watched.isError ? JSON.stringify(watched.data).slice(0, 400) : undefined,
  notDrawnInStudio: watched.data.notDrawnInStudio,
  studioNote: watched.data.studioNote
};
await client.close();

// control: a fresh server has no Studio
({ client, call } = await bind());
const unwatched = await replay();
out.wordingUnwatched = { isError: unwatched.isError, hasNote: 'notDrawnInStudio' in (unwatched.data ?? {}) };

// (3) the example, written in and rendered
await call('find_tools', { group: 'explore' });
const ex = await call('get_example', { id: 'option-set' });
out.exampleWrites = [];
for (const c of ex.data.components) {
  const res = await call('create_component', { path: c.name.slice(1), nodes: c.nodes, connections: c.connections });
  out.exampleWrites.push({ path: c.name, isError: res.isError, registeredPages: res.data.registeredPages, error: res.isError ? JSON.stringify(res.data).slice(0, 300) : undefined });
}
const render = await call('render_report', { viewports: 'desktop', screenshot: 'viewport' });
const texts = (render.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
out.renderIsError = render.isError;
out.renderVerdict = texts.split('\n')[0].slice(0, 300);
const at = texts.indexOf('/Pages/Language');
out.renderLanguagePage = at < 0 ? null : texts.slice(Math.max(0, at - 200), at + 900);
out.renderImages = (render.content ?? []).filter((c) => c.type === 'image').length;
// the dropdown lists the set's rows, and a pick stores the row's Value in `language` (the step types nothing)
const PICK = "(() => { const s = document.querySelector('select'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, 'fr'); s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()";
const drive = await call('drive_page', {
  page: 'language',
  steps: [
    { read: { expression: "[...document.querySelectorAll('select option')].map((o) => o.textContent).filter(Boolean).join('|')" }, expect: 'English|Français' },
    { read: { variable: 'language' } },
    { read: { expression: PICK }, expect: 'fr' },
    { read: { variable: 'language' }, expect: 'fr' }
  ]
});
out.drive = (drive.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').slice(0, 1800);
await client.close();
console.log(JSON.stringify(out, null, 1));
