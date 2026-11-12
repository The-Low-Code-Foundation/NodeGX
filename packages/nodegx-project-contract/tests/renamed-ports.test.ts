/**
 * P107-S86-STOREDWIRE — the outputs ERG-001 renamed: the table against the catalog, and the editor-load migration.
 */
import * as fs from 'fs';
import * as path from 'path';

import { RENAMED_OUTPUTS, applyRenamedPortMigration, describeRenamedPortMigration, renamedOutput } from '../renamed-ports';

interface CatalogNode {
  typeName: string;
  outputs?: Array<{ name: string }>;
}

const catalog: { nodes: CatalogNode[] } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../noodl-types/src/node-catalog.json'), 'utf8')
);
const outputsOf = new Map(catalog.nodes.map((n) => [n.typeName, new Set((n.outputs || []).map((o) => o.name))]));

describe('RENAMED_OUTPUTS against the node catalog', () => {
  const rows = Object.entries(RENAMED_OUTPUTS).flatMap(([type, renames]) =>
    Object.entries(renames).map(([from, to]) => ({ type, from, to }))
  );

  it('lists the 41 renames of 39 types the pre-ERG-001 catalog measured', () => {
    expect(Object.keys(RENAMED_OUTPUTS)).toHaveLength(39);
    expect(rows).toHaveLength(41);
  });

  it.each(rows)('$type: $to is an output today', ({ type, to }) => {
    expect(outputsOf.get(type)).toBeDefined();
    expect(outputsOf.get(type)!.has(to)).toBe(true);
  });

  it.each(rows)('$type: $from is not an output today, so the alias never takes a live port', ({ type, from }) => {
    expect(outputsOf.get(type)!.has(from)).toBe(false);
  });
});

describe('renamedOutput', () => {
  it("answers the new name for an old one on its own type only", () => {
    expect(renamedOutput('SetModelProperties', 'stored')).toBe('done');
    expect(renamedOutput('Number', 'stored')).toBe('completed');
    expect(renamedOutput('noodl.cloud.sendemail', 'failed')).toBe('failure');
    expect(renamedOutput('Variable', 'stored')).toBeUndefined();
    expect(renamedOutput('SetModelProperties', 'done')).toBeUndefined();
  });

  it('never answers from the prototype', () => {
    expect(renamedOutput('constructor', 'name')).toBeUndefined();
    expect(renamedOutput('SetModelProperties', 'toString')).toBeUndefined();
    expect(renamedOutput('SetModelProperties', 'hasOwnProperty')).toBeUndefined();
  });
});

/** The Multi Choice filter's Item, as the 22 copies of CMG Drive Looks save it. */
function multiChoiceItem() {
  return {
    components: [
      {
        name: '/Filters/Multi Choice/Item',
        graph: {
          roots: [
            {
              id: 'group',
              type: 'Group',
              children: [{ id: 'set', type: 'SetModelProperties', children: [] }]
            },
            { id: 'out', type: 'Component Outputs' },
            { id: 'var', type: 'Variable' }
          ],
          connections: [
            { fromId: 'set', fromProperty: 'stored', toId: 'out', toProperty: 'Selection Changed' },
            { fromId: 'var', fromProperty: 'stored', toId: 'out', toProperty: 'Other' },
            { fromId: 'group', fromProperty: 'onClick', toId: 'set', toProperty: 'store' }
          ]
        }
      }
    ]
  };
}

describe('applyRenamedPortMigration', () => {
  it("renames a nested node's old wire and leaves another type's same name alone", () => {
    const project = multiChoiceItem();
    const writes = applyRenamedPortMigration(project);

    expect(writes).toEqual([
      {
        component: '/Filters/Multi Choice/Item',
        nodeId: 'set',
        nodeType: 'SetModelProperties',
        from: 'stored',
        to: 'done',
        duplicate: false
      }
    ]);
    expect(project.components[0].graph.connections.map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual([
      'set.done',
      'var.stored',
      'group.onClick'
    ]);
    expect(describeRenamedPortMigration(writes)).toBe(
      'Renamed 1 wire from outputs renamed in August 2026: SetModelProperties.stored → done.'
    );
  });

  it('is idempotent: a second run moves nothing', () => {
    const project = multiChoiceItem();
    applyRenamedPortMigration(project);
    const before = JSON.stringify(project);
    expect(applyRenamedPortMigration(project)).toEqual([]);
    expect(JSON.stringify(project)).toBe(before);
  });

  it('drops the old wire when the same wire on the new name is already there', () => {
    const project = multiChoiceItem();
    project.components[0].graph.connections.push({
      fromId: 'set',
      fromProperty: 'done',
      toId: 'out',
      toProperty: 'Selection Changed'
    });
    const writes = applyRenamedPortMigration(project);

    expect(writes.map((w) => w.duplicate)).toEqual([true]);
    const doneWires = project.components[0].graph.connections.filter((c) => c.fromId === 'set');
    expect(doneWires).toEqual([{ fromId: 'set', fromProperty: 'done', toId: 'out', toProperty: 'Selection Changed' }]);
  });

  it('leaves a project with no graphs, or no connections, as it was', () => {
    expect(applyRenamedPortMigration({})).toEqual([]);
    expect(applyRenamedPortMigration({ components: [{ name: '/A' }, { name: '/B', graph: { roots: [] } }] })).toEqual([]);
  });
});
