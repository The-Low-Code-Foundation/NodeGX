/**
 * P123-GH-NOCREATEDAT — a record's built-in "when it was made" and "last changed" are on every Record's read side.
 *
 * Every record the built-in backend (and Parse) answers carries `createdAt` and `updatedAt` as bare ISO strings beside its
 * declared fields. Parse's `GET /schemas` listed both as `Date` fields, so a Parse-era project's cached `dbCollections`
 * did too: the Record node drew `prop-createdAt` / `prop-updatedAt` (typed `date`) and the Model glue turned the string
 * into a Date (`_deserializeJSON`'s `type === 'Date' && typeof data === 'string'` branch exists for exactly these). A
 * NodeGX project's `dbCollections` is `{ name, columns }` and its columns are the DECLARED fields only, so on every NodeGX
 * project the two dates had no port and arrived as a string — Studio's ⚡ had nothing to offer and a history list could
 * not say when each row was made (STU-091 Greenhouse added its own `at` field to show it).
 *
 * The fix is in the one place each half is decided: the Record node's property outputs (`record-ports.ts`
 * `recordBuiltInDatePorts`, mirrored by the spec's `record.ts` draw, which the validator and get_component read and
 * `nsp-020-ports-parity` grades against this announcement), and the Model glue (`cloudstore.js` `_fromJSON`).
 */
const declared: { current: unknown[] } = { current: [] };
jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: (key: string) => (key === 'dbCollections' ? declared.current : undefined) }
}));

import type { RuntimeDiscoveredPort } from '@noodl/types';

import CloudStore = require('../../src/api/cloudstore');
import { matchesQuery } from '../../src/api/queryutils';
import DbModel2 = require('../../src/nodes/std-library/data/dbmodelnode2');
import CreateRecord = require('../../src/nodes/std-library/data/newdbmodelpropertiesnode');
import UpdateRecord = require('../../src/nodes/std-library/data/setdbmodelpropertiesnode');

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/** Greenhouse's Watering, minus its own `at`: declared columns only, as the backend's cache and Studio write them. */
const WATERING = { name: 'Watering', columns: [{ name: 'note', type: 'String' }] };
const NODEGX_PROJECT = {
  cloudservices: { endpoint: 'http://localhost:8581', appId: 'backend_x', type: 'nodegx' },
  dbCollections: [WATERING]
};

/** Drive an assembled node module's `setup` the way the editor does and return what it announced. */
function portsFor(module: Any, parameters: Record<string, unknown>, metadata: Record<string, unknown>): RuntimeDiscoveredPort[] {
  const node = { id: 'n1', parameters, on: () => undefined };
  const handlers: Record<string, (() => void)[]> = {};
  let announced: RuntimeDiscoveredPort[] = [];
  const graphModel = {
    getMetaData: (key: string) => metadata[key],
    getNodesWithType: (typeName: string) => (typeName === module.node.name ? [node] : []),
    on: (event: string, handler: () => void) => {
      (handlers[event] = handlers[event] || []).push(handler);
    },
    off: () => undefined
  } as Any;
  const context = {
    editorConnection: {
      isRunningLocally: () => true,
      sendDynamicPorts: (_id: string, ports: RuntimeDiscoveredPort[]) => {
        announced = ports;
      }
    }
  } as Any;
  module.setup(context, graphModel);
  (handlers['editorImportComplete'] || []).forEach((h) => h());
  return announced;
}

const port = (ports: RuntimeDiscoveredPort[], name: string) => ports.find((p) => p.name === name);
const typeName = (p: RuntimeDiscoveredPort | undefined) => (p && typeof p.type === 'object' ? (p.type as Any).name : p?.type);

describe('P123-GH-NOCREATEDAT — the Record node draws the built-in dates on a class that does not declare them', () => {
  const ports = () => portsFor(DbModel2, { collectionName: 'Watering' }, NODEGX_PROJECT);

  test('prop-createdAt and prop-updatedAt are outputs, typed date, beside the declared field', () => {
    const drawn = ports();
    expect(port(drawn, 'prop-note')).toBeDefined();
    for (const name of ['prop-createdAt', 'prop-updatedAt']) {
      expect(port(drawn, name)).toMatchObject({ plug: 'output', group: 'Properties' });
      expect(typeName(port(drawn, name))).toBe('date');
    }
  });

  test('each with its Changed signal, as a declared field has', () => {
    const drawn = ports();
    expect(port(drawn, 'changed-createdAt')).toMatchObject({ plug: 'output', type: 'signal' });
    expect(port(drawn, 'changed-updatedAt')).toMatchObject({ plug: 'output', type: 'signal' });
  });

  test('drawn once when the schema already lists them (an introspected or Parse-era class)', () => {
    const parseEra = {
      ...NODEGX_PROJECT,
      dbCollections: [{ name: 'Watering', schema: { properties: { note: { type: 'String' }, createdAt: { type: 'Date' }, updatedAt: { type: 'Date' } } } }]
    };
    const drawn = portsFor(DbModel2, { collectionName: 'Watering' }, parseEra);
    expect(drawn.filter((p) => p.name === 'prop-createdAt')).toHaveLength(1);
    expect(drawn.filter((p) => p.name === 'changed-updatedAt')).toHaveLength(1);
  });

  test('not on a node with no class chosen, nor off the Parse wire (a Directus table has no createdAt)', () => {
    expect(port(portsFor(DbModel2, {}, NODEGX_PROJECT), 'prop-createdAt')).toBeUndefined();
    const directus = {
      backendServices: {
        activeBackendId: 'd1',
        backends: [{ id: 'd1', name: 'D', type: 'directus', url: 'http://x', schema: { collections: [{ name: 'Watering', fields: [{ name: 'note', type: 'string' }] }] } }]
      }
    };
    const drawn = portsFor(DbModel2, { collectionName: 'Watering', backendId: 'd1' }, directus);
    expect(port(drawn, 'prop-note')).toBeDefined();
    expect(port(drawn, 'prop-createdAt')).toBeUndefined();
  });

  test('the write nodes do not take them: the server owns both', () => {
    for (const module of [CreateRecord, UpdateRecord]) {
      const drawn = portsFor(module, { collectionName: 'Watering' }, NODEGX_PROJECT);
      expect(port(drawn, 'prop-note')).toBeDefined();
      expect(port(drawn, 'prop-createdAt')).toBeUndefined();
      expect(port(drawn, 'prop-updatedAt')).toBeUndefined();
    }
  });
});

describe('P123-GH-NOCREATEDAT — the record carries them as a Date, as a declared Date field arrives', () => {
  const MADE = '2026-10-30T15:49:00.000Z';
  const CHANGED = '2026-10-31T08:00:00.000Z';
  const AT = '2026-10-30T15:50:00.000Z';

  beforeEach(() => {
    declared.current = [{ name: 'Watering', columns: [{ name: 'note', type: 'String' }, { name: 'at', type: 'Date' }] }];
    (CloudStore as Any).invalidateCollections();
  });

  test('the backend answer (bare ISO strings, Parse-style) reads as two Dates, the same shape as the declared `at`', () => {
    const m = (CloudStore as Any)._fromJSON(
      { objectId: 'w1', note: 'a good soak', at: { __type: 'Date', iso: AT }, createdAt: MADE, updatedAt: CHANGED },
      'Watering'
    );
    expect(m.get('at')).toBeInstanceOf(Date);
    expect(m.get('createdAt')).toBeInstanceOf(Date);
    expect(m.get('createdAt').toISOString()).toBe(MADE);
    expect(m.get('updatedAt')).toBeInstanceOf(Date);
    expect(m.get('updatedAt').toISOString()).toBe(CHANGED);
    expect(m.get('note')).toBe('a good soak');
  });

  test('on a class the project does not declare at all, too', () => {
    const m = (CloudStore as Any)._fromJSON({ objectId: 'w2', createdAt: MADE }, 'Undeclared');
    expect(m.get('createdAt')).toBeInstanceOf(Date);
  });

  test('a declared field of another name holding an ISO string is left a string (only the two built-ins are typed)', () => {
    const m = (CloudStore as Any)._fromJSON({ objectId: 'w3', note: MADE }, 'Watering');
    expect(m.get('note')).toBe(MADE);
  });
});

describe('P123-GH-NOCREATEDAT — a loaded record still matches a date filter locally, now that its dates are Dates', () => {
  // Query Records decides whether a record made or changed here belongs in its results with `matchesQuery`. While
  // createdAt was a string a filter typed as text compared as text; a Date against text (or against the wire's
  // `{ __type: 'Date', iso }`, which a declared Date field always met) is NaN and matched nothing.
  const record = () => (CloudStore as Any)._fromJSON({ objectId: 'w9', createdAt: '2026-10-30T15:49:00.000Z' }, 'Watering');

  test.each([
    ['text', '2026-10-30T00:00:00.000Z', '2026-10-31T00:00:00.000Z'],
    ['the wire Date', { __type: 'Date', iso: '2026-10-30T00:00:00.000Z' }, { __type: 'Date', iso: '2026-10-31T00:00:00.000Z' }],
    ['a Date', new Date('2026-10-30T00:00:00.000Z'), new Date('2026-10-31T00:00:00.000Z')]
  ])('an operand given as %s', (_how, before, after) => {
    expect(Boolean(matchesQuery(record(), { createdAt: { $gt: before } }))).toBe(true);
    expect(Boolean(matchesQuery(record(), { createdAt: { $gte: before, $lte: after } }))).toBe(true);
    expect(Boolean(matchesQuery(record(), { createdAt: { $gt: after } }))).toBe(false);
    expect(Boolean(matchesQuery(record(), { createdAt: { $lt: before } }))).toBe(false);
  });
});
