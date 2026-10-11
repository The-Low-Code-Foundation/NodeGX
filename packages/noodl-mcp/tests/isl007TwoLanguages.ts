/**
 * P109 ISL-007 AC2 / AC3 / AC5 — a new project that speaks two languages with no script, built through the door.
 *
 * Ruled "Adopt the add-on" (2026-10-02): the `i18next Translation` module, its gaps fixed. This is the smallest app the
 * person sentence needs: English and French bundles in `App`, and on one page three words, a name a person types, an
 * EN and an FR button. The switch is nodes only (Button → Set Variable → i18next's Change Language), as is everything
 * else: there is no Function node in the project.
 *
 *  - `title`  — a plain word.                                 AC2
 *  - `greet`  — "Hello {{name}}", the name typed in a Text Input. AC2 (the name in both languages), AC5 ("Tom & <Jerry>")
 *  - `isle`   — "the island & <sea>" / "l'île & <mer>".        AC5 (a word with `&`, `<` and an apostrophe)
 *  - `bare`   — `greet` with no name wired in.                 AC3 (never braces)
 *
 *   npx ts-node -T -P ./scripts/tsconfig.json -e "require('./packages/noodl-mcp/tests/isl007TwoLanguages').buildTwoLanguages(process.argv[1])" <out>
 *
 * Driven by `scripts/devtools/drive-isl007-two-languages.js` on a `nodegx deploy` of the output.
 *
 * @module noodl-mcp/tests/isl007TwoLanguages
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { resolveKitExtractEntry } from '../src/kitOverlay';
import { createServer } from '../src/server';

import { copyTree } from './templatePins';

const I18N = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'i18next-translation', 'project', 'noodl_modules');

export const EN = { title: 'My garden', greet: 'Hello {{name}}', isle: 'the island & <sea>' };
export const FR = { title: 'Mon jardin', greet: 'Bonjour {{name}}', isle: "l'île & <mer>" };

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });
const testid = (name: string) => ({ dataAttributes: 'data-testid', 'data-testid': name });

export async function buildTwoLanguages(output: string): Promise<{ diagnostics: string[] }> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  if (!resolveKitExtractEntry().entry) throw new Error('the kit reader is not built — npm run build --workspace @nodegx/mcp');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl007-two-languages-'));
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: 'isl007 two languages', version: '5', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: '2026-10-03T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );
  fs.cpSync(I18N, path.join(dir, 'noodl_modules'), { recursive: true });

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl007-two-languages', version: '0.0.0' });
  await Promise.all([server.connect(st), client.connect(ct)]);
  const diagnostics: string[] = [];
  const call = async (name: string, args: Record<string, unknown>) => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: Array<{ text: string }> };
    if (res.isError) throw new Error(`${name} refused:\n${res.content?.[0]?.text}`);
    const payload = JSON.parse(res.content?.[0]?.text ?? '{}');
    for (const d of payload.validation?.diagnostics ?? []) diagnostics.push(`${d.severity} ${d.code}: ${d.message}`);
    return payload;
  };

  // No Language on the i18next node: the browser (or the person's last choice) picks it.
  await call('create_component', {
    path: 'App',
    nodes: [
      { id: 'a_root', type: 'Group', label: 'App', parameters: { flexDirection: 'column' } },
      { id: 'a_router', type: 'Router', label: 'Router', parent: 'a_root', parameters: { name: 'Main' } },
      { id: 'a_i18n', type: 'i18next', label: 'Languages', parameters: {} },
      { id: 'a_en', type: 'Language Bundle', label: 'English', parameters: { Language: 'en', Namespace: 'common', Bundle: JSON.stringify(EN) } },
      { id: 'a_fr', type: 'Language Bundle', label: 'French', parameters: { Language: 'fr', Namespace: 'common', Bundle: JSON.stringify(FR) } }
    ],
    connections: []
  });

  const tr = (id: string, key: string, vars: string[]) => ({
    id,
    type: 'Translation',
    label: key,
    parameters: { Key: key, Namespace: 'common', ...(vars.length ? { Variables: vars.join(',') } : {}) },
    ports: vars.map((name) => ({ name, plug: 'input', type: '*' }))
  });
  const button = (id: string, label: string) => ({ id, type: 'net.noodl.controls.button', label, parent: 'h_bar', parameters: { label, ...testid(id) } });
  const setLang = (id: string, value: string) => ({ id, type: 'Set Variable', label: value, parameters: { name: 'lang', setWith: 'string', value } });
  await call('create_component', {
    path: 'Pages/Home',
    nodes: [
      { id: 'h_page', type: 'Page', label: 'Home', parameters: { title: 'Two languages', urlPath: '' } },
      { id: 'h_root', type: 'Group', label: 'Root', parent: 'h_page', parameters: { flexDirection: 'column' } },
      { id: 'h_bar', type: 'Group', label: 'Languages', parent: 'h_root', parameters: { flexDirection: 'row', sizeMode: 'contentHeight' } },
      button('en', 'EN'),
      button('fr', 'FR'),
      { id: 'h_name', type: 'net.noodl.controls.textinput', label: 'Name', parent: 'h_root', parameters: { ...testid('name') } },
      { id: 'h_title', type: 'Text', label: 'Title', parent: 'h_root', parameters: { text: '?', ...testid('title') } },
      { id: 'h_greet', type: 'Text', label: 'Greeting', parent: 'h_root', parameters: { text: '?', ...testid('greet') } },
      { id: 'h_isle', type: 'Text', label: 'Island', parent: 'h_root', parameters: { text: '?', ...testid('isle') } },
      { id: 'h_bare', type: 'Text', label: 'Greeting with no name', parent: 'h_root', parameters: { text: '?', ...testid('bare') } },
      tr('h_trTitle', 'title', []),
      tr('h_trGreet', 'greet', ['name']),
      tr('h_trIsle', 'isle', []),
      tr('h_trBare', 'greet', []),
      setLang('h_setEn', 'en'),
      setLang('h_setFr', 'fr'),
      { id: 'h_i18n', type: 'i18next', label: 'Switch', parameters: {} },
      { id: 'h_lang', type: 'Variable2', label: 'Language', parameters: { name: 'lang' } }
    ],
    connections: [
      wire('h_name', 'onTextChanged', 'h_trGreet', 'name'), // the Text Input's Value: its port id is `onTextChanged`
      wire('h_trTitle', 'Translation', 'h_title', 'text'),
      wire('h_trGreet', 'Translation', 'h_greet', 'text'),
      wire('h_trIsle', 'Translation', 'h_isle', 'text'),
      wire('h_trBare', 'Translation', 'h_bare', 'text'),
      wire('en', 'onClick', 'h_setEn', 'do'),
      wire('fr', 'onClick', 'h_setFr', 'do'),
      wire('h_lang', 'value', 'h_i18n', 'Language'),
      wire('h_setEn', 'done', 'h_i18n', 'ChangeLanguage'),
      wire('h_setFr', 'done', 'h_i18n', 'ChangeLanguage')
    ]
  });
  await client.close();
  await server.close();
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(dir, output);
  return { diagnostics };
}
