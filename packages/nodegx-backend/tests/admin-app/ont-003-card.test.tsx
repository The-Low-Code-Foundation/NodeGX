/**
 * P116 ONT-003 AC3 — the Schema page's card, shown a collection projected from a person's words.
 *
 * Mounted with what `GET /admin/schema` returns for it (`ont-003-write.test.ts` proves the route
 * returns exactly these columns, rules and description on both engines): the person's sentence
 * under the collection's name, and every field showing the tile its kind named — read off the
 * row the way a person sees it (the kind dropdown's value, or the badge's icon on a row a rule
 * locks), never off the cell's whole text, which holds every option's label.
 */
import { mount, q, qa, text, unmount } from './dom';

import { projectWorld, schemaPushes, type WorldFiles } from '../../../nodegx-project-contract/world';
import * as fs from 'fs';
import * as path from 'path';

import { describeCheck, type CheckDecl } from '@noodl/runtime/src/api/adapters/local-sql/schemaCommon';

import { KINDS, type RuleStatus } from '../../src/admin/app/fieldKinds';
import { TableCard, type TableDef } from '../../src/admin/app/views/schema';

const dir = path.join(__dirname, '../../../nodegx-project-contract/tests/fixtures/world-every-kind/docs/world');
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
const files: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
const out = projectWorld(files);
if (!out.ok) throw new Error(out.problems.join('\n'));
const schema = out.schema;

function asListed(name: string): TableDef {
  const push = schemaPushes(schema).find((p) => p.table === name)!;
  // The route's own words for a rule (`describeCheck`): since ONT-011 step 2 a projected check is a union (an
  // all-or-none rule has no `oneOf`), and a copy of the wording here broke on it (P116-S23-CARDCHECKS).
  const checks: RuleStatus[] = push.checks.map((rule, i) => ({ name: `chk_${i}`, rule, description: describeCheck(rule as CheckDecl), built: true, declared: true }));
  return { name, description: push.description, columns: push.columns, checks, indexes: [] };
}

/** The tile a row shows: the dropdown's value, or the kind whose icon the badge carries. */
function shownKind(row: Element): string {
  const cell = qa(row, 'td')[1];
  const select = cell.querySelector('select');
  if (select) return (select as HTMLSelectElement).value;
  const icon = text(q(cell, '.kind-icon'));
  return KINDS.filter((k) => k.icon === icon).map((k) => k.id).join('|');
}

describe('ONT-003 AC3 — the card shows a projected collection in the person’s words', () => {
  it('every tile has its own icon, so a badge names one kind', () => {
    expect(new Set(KINDS.map((k) => k.icon)).size).toBe(KINDS.length);
  });

  it.each(schema.collections.map((c) => c.name))('%s', (name) => {
    const c = schema.collections.find((x) => x.name === name)!;
    const root = mount(<TableCard t={asListed(name)} names={schema.collections.map((x) => x.name)} readonly={false} accountColumns={undefined} hit={false} reload={() => undefined} />);
    expect(text(q(root, '.collection-description'))).toBe(c.description);
    const rows = qa(root, 'tbody tr').slice(3); // objectId, createdAt, updatedAt come first
    expect(rows.map((r) => text(qa(r, 'td')[0]).startsWith(c.columns[rows.indexOf(r)].name))).toEqual(c.columns.map(() => true));
    expect(rows.map(shownKind)).toEqual(c.columns.map((col) => col.kind));
    unmount(root);
  });
});
