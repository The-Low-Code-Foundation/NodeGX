/**
 * Data Attributes — the `data-*` names a visual node writes on its element, each with a value input of its own
 * (react-component-node.ts :799-815). Shared by the specs whose node derives those inputs (the Text Input, the Dropdown).
 * NSP-006 round 4 (s49) found them inside text-input.ts: a stranger building the Dropdown had to read another node's spec to
 * find them. s50 moved them here.
 */

import type { ValueInputDecl } from '../spec';

/** react-component-node.ts :810-815 `listedDataAttributeNames` */
const DATA_ATTRIBUTE_NAME = /^data-[a-z0-9][a-z0-9._-]*$/;
export function dataAttributeNames(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  const names = Array.isArray(value) ? value.map((v) => String(v)) : typeof value === 'string' ? value.split(',') : [];
  return names.filter((name) => DATA_ATTRIBUTE_NAME.test(name));
}
/** react-component-node.ts :799-806 — the derived port, as the catalog's rule spells it */
export function dataAttributeInput(name: string): ValueInputDecl {
  return { type: 'string', coerce: 'none', displayName: name, group: 'Data Attributes', description: `Written on this element as ${name}` };
}
