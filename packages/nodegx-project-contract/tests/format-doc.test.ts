/**
 * P112 OWN-001 AC4 — `dev-docs/reference/PROJECT-FORMAT-V2.md` cannot drift from the format: each example
 * validates against its schema and equals the template file it names, and every schema's required fields
 * appear in the page's table.
 */
import * as fs from 'fs';
import * as path from 'path';

import { SCHEMA_IDS, SchemaValidator } from '../format';

const REPO = path.resolve(__dirname, '../../..');
const DOC = fs.readFileSync(path.join(REPO, 'dev-docs/reference/PROJECT-FORMAT-V2.md'), 'utf8');

const SCHEMA_FOR: Record<string, (typeof SCHEMA_IDS)[keyof typeof SCHEMA_IDS]> = {
  'component.json': SCHEMA_IDS.COMPONENT,
  'nodes.json': SCHEMA_IDS.NODES,
  'connections.json': SCHEMA_IDS.CONNECTIONS
};

const examples = [...DOC.matchAll(/<!-- example: (.+?) -->\n```json\n([\s\S]*?)\n```/g)].map((m) => ({
  source: m[1],
  json: m[2]
}));

test('the page carries the three files of one component', () => {
  expect(examples.map((e) => path.basename(e.source)).sort()).toEqual(['component.json', 'connections.json', 'nodes.json']);
});

test.each(examples.map((e) => [e.source, e] as const))('%s validates and equals the template file', (_source, e) => {
  const value = JSON.parse(e.json);
  const result = SchemaValidator.instance.validate(SCHEMA_FOR[path.basename(e.source)], value);
  expect(result.errors).toEqual([]);
  expect(value).toEqual(JSON.parse(fs.readFileSync(path.join(REPO, e.source), 'utf8')));
});

test("every schema's required fields are named in the page's table", () => {
  const missing: string[] = [];
  for (const name of ['project-v2', 'registry', 'component', 'nodes', 'connections', 'routes', 'styles']) {
    const schema = JSON.parse(fs.readFileSync(path.join(__dirname, `../schemas/${name}.schema.json`), 'utf8'));
    const row = DOC.split('\n').find((l) => l.includes(`\`${name}.schema.json\``));
    if (!row) {
      missing.push(`${name}: no row`);
      continue;
    }
    for (const field of schema.required ?? []) if (!row.includes(`\`${field}\``)) missing.push(`${name}.${field}`);
  }
  expect(missing).toEqual([]);
});
