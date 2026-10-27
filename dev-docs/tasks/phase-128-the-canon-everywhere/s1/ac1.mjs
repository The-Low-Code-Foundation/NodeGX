// P128 S1 AC1: `node ac1.mjs <copy of Muddy Paws Shelter>` — the BUILT server (packages/noodl-mcp/dist, what Claude
// Desktop runs) bound to the project over stdio: does get_project_info carry surfacesDoctrine and the MUST_KNOW line,
// and does get_project_info({ section: "surfaces" }) return it whole, in parts? Prints one JSON line of readings.
import path from 'node:path';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const require = createRequire(path.join(REPO, 'package.json'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const [project] = process.argv.slice(2);
if (!project) throw new Error('usage: ac1.mjs <project dir>');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(REPO, 'packages/noodl-mcp/dist/noodl-mcp.cjs'), project, '--allow-writes'],
  stderr: 'ignore'
});
const client = new Client({ name: 'p128-s1-ac1', version: '0' });
await client.connect(transport);
const text = async (args) => (await client.callTool({ name: 'get_project_info', arguments: args })).content[0].text;

const info = JSON.parse(await text({}));
const parts = [];
for (let next = 'surfaces'; next; ) {
  const answer = JSON.parse(await text({ section: next }));
  parts.push(answer.text);
  next = answer.next;
}
const line = info.readFirst.mustKnow.find((l) => l.endsWith('[surfaces]'));
console.log(JSON.stringify({
  project: info.name,
  instructionsPointAtSurfaces: client.getInstructions().includes('"surfaces" section'),
  surfacesDoctrineChars: info.surfacesDoctrine?.length ?? null,
  mustKnowLine: line ?? null,
  readFirstSections: Object.keys(info.readFirst.sections),
  sectionParts: parts.length,
  partsJoinToField: parts.join('') === info.surfacesDoctrine,
  quotesOffer: info.surfacesDoctrine.includes('I could make you an editor to tweak that now'),
  namesOptionSets: info.surfacesDoctrine.includes('`Option sets/<Name>`')
}));
await client.close();
