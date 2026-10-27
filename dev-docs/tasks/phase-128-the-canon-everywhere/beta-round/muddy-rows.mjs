// P128 Beta round, Track B item 3: P125-MUDDY-OPTSETSUNKNOWN and P125-MUDDY-SURFACESUNSAID re-measured on ONE build.
//   node muddy-rows.mjs <…/noodl-mcp.cjs> <a COPY of templates/todo-list> <a fake Studio dir: editor/serve.mjs>
// The build: packages/noodl-mcp/dist (HEAD) or an unpacked @nodegx/mcp tarball's package/dist. The fake Studio is the
// one p128OptionSet.test.ts writes (an editor/serve.mjs that prints its port). Shapes are Muddy Paws' (that spec's).
// Prints one JSON object: the bound briefing, get_project_info's surfaces fields, the three surface tools, the
// option-set example, the two-literals hint, the Wording note with Studio open and without (the control).
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../package.json'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const [cjs, project, studioDir] = process.argv.slice(2);
const HEADER = { path: 'Components/Header', nodes: [
  { id: 'bar', type: 'Group', children: ['b0', 'b1'] },
  { id: 'b0', type: 'net.noodl.controls.button', parent: 'bar', parameters: { label: 'English' } },
  { id: 'b1', type: 'net.noodl.controls.button', parent: 'bar', parameters: { label: 'Français' } },
  { id: 'set0', type: 'Set Variable', label: 'Set language to en', parameters: { name: 'language', setWith: 'string', value: 'en' } },
  { id: 'set1', type: 'Set Variable', label: 'Set language to fr', parameters: { name: 'language', setWith: 'string', value: 'fr' } }],
  connections: [{ fromId: 'b0', fromProperty: 'onClick', toId: 'set0', toProperty: 'do' }, { fromId: 'b1', fromProperty: 'onClick', toId: 'set1', toProperty: 'do' }] };
const WORDING = { path: 'Components/Wording', nodes: [
  { id: 'langvar', type: 'Variable2', label: 'Current language', parameters: { name: 'language' } },
  { id: 'wordStates', type: 'States', label: 'Wordings by language', parameters: { states: 'en,fr', values: 'home_headline', 'type-home_headline': 'string', 'value-en-home_headline': 'Hello', 'value-fr-home_headline': 'Bonjour' } },
  { id: 'out', type: 'Component Outputs', ports: [{ name: 'home_headline', plug: 'input', type: 'string' }] }],
  connections: [{ fromId: 'langvar', fromProperty: 'value', toId: 'wordStates', toProperty: 'currentState' }, { fromId: 'wordStates', fromProperty: 'home_headline', toId: 'out', toProperty: 'home_headline' }] };
async function bind(withStudio) {
  const env = { ...process.env, NODEGX_STUDIO_NO_OPEN: '1' };
  if (withStudio) env.NODEGX_STUDIO = studioDir; else env.NODEGX_STUDIO = path.join(studioDir, 'absent');
  const transport = new StdioClientTransport({ command: process.execPath, args: [cjs, project, '--allow-writes'], env, stderr: 'ignore' });
  const client = new Client({ name: 'track-b-item3', version: '0' });
  await client.connect(transport);
  const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); const t = r.content?.[0]?.text ?? ''; let d; try { d = JSON.parse(t); } catch { d = t; } return { isError: r.isError === true, data: d }; };
  return { client, call };
}
const out = {};
let { client, call } = await bind(true);
out.instructionsNameSurfaces = /surfaces/.test(client.getInstructions() ?? '');
const info = await call('get_project_info');
out.surfacesDoctrine = typeof info.data.surfacesDoctrine === 'string' ? info.data.surfacesDoctrine.length : null;
out.surfacesDoctrineNamesOptionSets = /Option sets\//.test(info.data.surfacesDoctrine ?? '');
out.mustKnowSurfacesLine = (info.data.readFirst?.mustKnow ?? []).findIndex((l) => l.endsWith('[surfaces]'));
out.optionSetMentions = (JSON.stringify(info.data).match(/option set/gi) ?? []).length;
await call('find_tools', { group: 'explore' }); await call('find_tools', { group: 'project' });
const tools = (await client.listTools()).tools;
const desc = (n) => tools.find((t) => t.name === n)?.description ?? '';
out.surfaceToolsNameDownload = Object.fromEntries(['open_studio', 'show_mini_editor', 'open_in_editor'].map((n) => [n, { listed: tools.some((t) => t.name === n), download: desc(n).includes('nodegx.io/start'), namesOthers: ['open_studio', 'show_mini_editor', 'open_in_editor'].filter((o) => o !== n && desc(n).includes(o)).length }]));
const ex = await call('get_example', { id: 'option-set' });
out.example = ex.isError ? { error: JSON.stringify(ex.data).slice(0, 200) } : { components: (ex.data.components ?? []).map((c) => c.name) };
const header = await call('create_component', HEADER);
out.twoLiterals = header.isError ? { error: JSON.stringify(header.data).slice(0, 200) } : (header.data.validation?.diagnostics ?? []).filter((d) => d.code === 'fixed-list-as-literals').map((d) => ({ severity: d.severity, suggestion: d.suggestion }));
const st = await call('open_studio');
out.studioOpened = !st.isError;
const w = await call('create_component', WORDING);
out.wordingWithStudio = { isError: w.isError, notDrawnInStudio: (w.data.notDrawnInStudio ?? []).map((n) => `${n.node}:${n.type}`), studioNote: typeof w.data.studioNote === 'string' ? w.data.studioNote.slice(0, 90) + '…' : null };
await client.close();
({ client, call } = await bind(false));
await call('delete_component', { path: 'Components/Wording', force: true });
const w2 = await call('create_component', WORDING);
out.wordingNoStudio = { isError: w2.isError, hasNote: 'notDrawnInStudio' in (w2.data ?? {}) };
await client.close();
console.log(JSON.stringify(out, null, 1));
process.exit(0);
