/**
 * GAM-007 — a Static Data row field the runtime answers with a Noodl Object member.
 *
 * The predicate, pure. The MCP spec (`noodl-mcp/tests/gam007ReservedRowField.test.ts`) grades the
 * doors an agent calls and pins the list to the runtime; this grades how the rows are read: which
 * format a node's `type` selects, and a CSV header the way the runtime's tokeniser reads it.
 *
 * 🔴 Every quiet case sits beside a firing twin that differs in one thing, so "silent" is never
 * "did not run".
 *
 * @module noodl-editor/tests-unit/gam-007/reservedRowField
 */
import { authoredPreconditionDiagnostics } from '@noodl-models/../validation/authoredCandidate';
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import {
  checkReservedRowFields,
  csvHeaderCells,
  RESERVED_ROW_FIELD_NAMES,
  type ReservedRowFieldNode
} from '@noodl-models/../validation/reservedRowField';

const COMPONENT = '/Data/Hangar';

const staticData = (parameters: Record<string, unknown>): ReservedRowFieldNode => ({
  id: 'datahangarData',
  type: 'Static Data',
  label: 'Hangar shelf',
  parameters
});
const json = (rows: unknown) => staticData({ type: 'json', json: JSON.stringify(rows) });
const fields = (node: ReservedRowFieldNode) =>
  checkReservedRowFields([node], { component: COMPONENT }).map((d) => ({
    field: d.message.match(/named "([^"]+)"/)?.[1],
    port: d.location.port
  }));

describe('GAM-007 — the reserved names', () => {
  it('hold the names that bite, and not `id`', () => {
    expect(['on', 'get', 'set', 'data', 'fill', 'toString', 'listeners', '_class'].every((n) => RESERVED_ROW_FIELD_NAMES.has(n))).toBe(true);
    expect(RESERVED_ROW_FIELD_NAMES.has('id')).toBe(false);
    expect(RESERVED_ROW_FIELD_NAMES.size).toBe(24);
  });
});

describe('GAM-007 — JSON rows', () => {
  it('`on` is named at the json port, as a warning at the node; `faces` is silent', () => {
    const [d] = checkReservedRowFields([json([{ id: 'cap', on: {} }])], { component: COMPONENT });
    expect(d).toEqual(
      expect.objectContaining({
        code: DiagnosticCode.ReservedRowField,
        severity: 'warning',
        location: { component: COMPONENT, nodeId: 'datahangarData', nodeType: 'Static Data', nodeLabel: 'Hangar shelf', port: 'json' }
      })
    );
    expect(fields(json([{ id: 'cap', faces: {} }]))).toEqual([]);
  });

  it('one finding per field however many rows carry it, in first-seen order, and `id` is never one', () => {
    const rows = [{ id: 'a', title: 'x' }, ...Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, data: i, on: true }))];
    expect(fields(json(rows))).toEqual([
      { field: 'data', port: 'json' },
      { field: 'on', port: 'json' }
    ]);
  });

  it('JSON that does not parse, or is not a list, is silent; its parseable twin is named', () => {
    expect(fields(staticData({ type: 'json', json: '[{"on": 1},' }))).toEqual([]);
    expect(fields(json({ on: 1 }))).toEqual([]);
    expect(fields(staticData({ type: 'json', json: '[{"on": 1}]' }))).toEqual([{ field: 'on', port: 'json' }]);
  });

  it('a JSON parameter the runtime does not read (Type unset or CSV) is silent', () => {
    expect(fields(staticData({ json: '[{"on": 1}]' }))).toEqual([]);
    expect(fields(staticData({ type: 'csv', json: '[{"on": 1}]' }))).toEqual([]);
  });
});

describe('GAM-007 — CSV rows', () => {
  it('a header cell is a field; the same word as a cell value is not', () => {
    expect(fields(staticData({ csv: 'id,on,title\ncap,yes,Cap' }))).toEqual([{ field: 'on', port: 'csv' }]);
    expect(fields(staticData({ csv: 'id,title\ncap,on' }))).toEqual([]);
  });

  it('reads a header the way the runtime tokeniser does: BOM, quotes, doubled quotes, CRLF', () => {
    expect(csvHeaderCells('﻿"on",title\r\nx,y')).toEqual(['on', 'title']);
    expect(csvHeaderCells('"a,b","say ""hi""",set\nx')).toEqual(['a,b', 'say "hi"', 'set']);
    expect(fields(staticData({ type: 'csv', csv: '﻿"get",title\r\nx,y' }))).toEqual([{ field: 'get', port: 'csv' }]);
  });

  it('`" on"` with a space is not `on`: the runtime does not trim a header', () => {
    expect(fields(staticData({ csv: 'id, on\nx,y' }))).toEqual([]);
    expect(fields(staticData({ csv: 'id,on\nx,y' }))).toEqual([{ field: 'on', port: 'csv' }]);
  });
});

describe('GAM-007 — the door runs it', () => {
  const run = (nodes: ReservedRowFieldNode[]) =>
    authoredPreconditionDiagnostics({
      component: COMPONENT,
      nodes,
      components: [COMPONENT],
      catalog: loadDefaultCatalog()
    }).filter((d) => d.code === DiagnosticCode.ReservedRowField);

  it('authoredPreconditionDiagnostics reports the shelf with `on`, and not the renamed shelf', () => {
    expect(run([json([{ id: 'cap', on: {} }])])).toHaveLength(1);
    expect(run([json([{ id: 'cap', faces: {} }])])).toEqual([]);
  });

  it('other node types carrying a `json` parameter are not read', () => {
    expect(run([{ id: 'x', type: 'Function', parameters: { type: 'json', json: '[{"on":1}]' } }])).toEqual([]);
  });
});
