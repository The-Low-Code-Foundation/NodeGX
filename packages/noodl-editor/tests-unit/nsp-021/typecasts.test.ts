/**
 * P107 NSP-021 §3.2 (s88) — "may these two ports connect" has one table and one rule.
 *
 * The table is `@nodegx/project-contract/typecasts`. The runtime publishes it (`nodelibraryexport.ts` imports it), the
 * catalog is generated from the runtime (`catalog:check` holds the two equal), and three editor doors read the rule:
 * the canvas's popup (`NodeLibrary.canCastPortTypes` + `ConnectionBar`'s signal rule), the Ports tab
 * (`connectablePortTypes`) and the validator the Problems panel and the agent server share (`CatalogIndex
 * .isTypeCompatible`). Until s88 the validator let a signal through on either end; R22 made it the canvas's rule.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-021/typecasts
 */
import { canConnectPortTypes, TYPECASTS } from '@nodegx/project-contract/typecasts';

import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { connectablePortTypes, portTypeUniverse } from '../../src/editor/src/views/panels/propertyeditor/portTypes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const catalogJson = require('../../../noodl-types/src/node-catalog.json');

describe('NSP-021: one typecast table, one rule', () => {
  test('the catalog carries the project-contract table, row for row', () => {
    expect(catalogJson.typecasts).toEqual(TYPECASTS);
  });

  test('the validator and the Ports tab answer every pair as the shared rule does', () => {
    const index = loadDefaultCatalog();
    const universe = [...portTypeUniverse(TYPECASTS), '*'];
    let pairs = 0;
    for (const from of universe) {
      const tab = connectablePortTypes(TYPECASTS, from, 'output');
      for (const to of universe) {
        const rule = canConnectPortTypes(TYPECASTS, from, to);
        expect([from, to, index.isTypeCompatible(from, to)]).toEqual([from, to, rule]);
        // `undefined` is the tab's "Any" (a `*` output); the tab names types, never `*` itself
        if (to !== '*') expect([from, to, tab === undefined || tab.includes(to)]).toEqual([from, to, rule]);
        pairs++;
      }
    }
    expect(pairs).toBeGreaterThan(300);
  });

  test('R22: a signal is not a free pass on either end', () => {
    expect(canConnectPortTypes(TYPECASTS, 'boolean', 'signal')).toBe(true);
    expect(canConnectPortTypes(TYPECASTS, 'string', 'signal')).toBe(false);
    expect(canConnectPortTypes(TYPECASTS, 'signal', 'number')).toBe(false);
    expect(canConnectPortTypes(TYPECASTS, 'signal', '*')).toBe(true);
  });

  test('R21: a list may feed a Dropdown’s Items (P107-S88-OPTIONSCAST)', () => {
    const items = catalogJson.nodes.find((n: { typeName: string }) => n.typeName === 'net.noodl.controls.options').inputs.find((p: { name: string }) => p.name === 'items');
    expect(items.type.name ?? items.type).toBe('optionslist');
    expect(loadDefaultCatalog().isTypeCompatible('array', 'optionslist')).toBe(true);
  });
});
