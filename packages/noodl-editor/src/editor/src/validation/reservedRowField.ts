/**
 * GAM-007 — a Static Data row field the runtime cannot hand back by name.
 *
 * ## The row
 *
 * P78 D64: Rocket School's hangar drew no tiles. A shelf row's `on` field came back as the record's
 * event method, so the script threw `Cannot read properties of undefined (reading 'part')`. All 252
 * gates passed, because every gate fed the script plain JSON. The runtime hands each row to the
 * graph as a Noodl Object, and that object's proxy answers any name that is one of its own members
 * with the member (`noodl-runtime/src/model.ts`, `_modelProxyHandler.get`). `Object.keys(row)`
 * still lists the field, so nothing that inspects keys can see it.
 *
 * 🔒 **R8 (Richard, 2026-09-14): C. Reserve the names loudly now, and data wins later.** This is the
 * door's half of B. The runtime's half is `Collection.set` raising `collection/reserved-field-name`.
 *
 * ## The list is the runtime's, pinned
 *
 * The door cannot load the runtime, so the names are spelled here. They were read off real rows
 * through the trap (GAM-007 AC2), and `noodl-mcp/tests/gam007ReservedRowField.test.ts` compares
 * this set with the runtime's `Model.isReservedFieldName` over every candidate name, so a member
 * added to the Model turns that spec red rather than this list quietly short.
 *
 * ⚠️ `id` is not on it: it reads back the row's own id. `listeners` and `_class` are, although a
 * record only grows them later, because a row read before then and after then disagree.
 *
 * ## What is read
 *
 * Only Static Data, the one node whose rows are literal in the graph, in whichever format its
 * `type` selects (CSV when unset, as the runtime reads it). A CSV's field names are its header row.
 * JSON that does not parse is left to the runtime's `static-array/json-parse-failed`.
 *
 * Pure.
 *
 * @module noodl-editor/validation/reservedRowField
 */

import { DiagnosticCode, type Diagnostic, type Severity } from './diagnostics';

/** Read off the runtime in GAM-007 AC2. Pinned to `Model.isReservedFieldName` by the MCP spec. */
export const RESERVED_ROW_FIELD_NAMES: ReadonlySet<string> = new Set([
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  '__proto__',
  '_class',
  'constructor',
  'data',
  'fill',
  'get',
  'getId',
  'hasOwnProperty',
  'isPrototypeOf',
  'listeners',
  'notify',
  'off',
  'on',
  'propertyIsEnumerable',
  'set',
  'setAll',
  'toJSON',
  'toLocaleString',
  'toString',
  'valueOf'
]);

const STATIC_DATA_TYPE = 'Static Data';

/** A node as this check reads it. */
export interface ReservedRowFieldNode {
  id: string;
  type: string;
  label?: string;
  parameters?: Record<string, unknown> | null;
}

export interface CheckReservedRowFieldsOptions {
  /** Component identifier for the diagnostics' location. */
  component: string;
  /** Defaults to `warning`: R8 reserves the names, it does not refuse the graph. */
  severity?: Severity;
}

/**
 * A CSV's header cells, the way the runtime's tokeniser reads them: a leading BOM dropped, quoted
 * cells unquoted with `""` as a quote, and the row ending at the first unquoted line break.
 */
export function csvHeaderCells(text: string): string[] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') break;
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}

/** The row field names a Static Data node's literal rows carry, in first-seen order. */
function rowFields(parameters: Record<string, unknown>): { port: 'json' | 'csv'; fields: string[] } | undefined {
  if (parameters.type === 'json') {
    if (typeof parameters.json !== 'string') return undefined;
    let rows: unknown;
    try {
      rows = JSON.parse(parameters.json);
    } catch {
      return undefined;
    }
    if (!Array.isArray(rows)) return undefined;
    const fields = new Set<string>();
    for (const row of rows) {
      if (row && typeof row === 'object' && !Array.isArray(row)) for (const key of Object.keys(row)) fields.add(key);
    }
    return { port: 'json', fields: [...fields] };
  }
  if (parameters.type !== undefined && parameters.type !== null && parameters.type !== 'csv') return undefined;
  if (typeof parameters.csv !== 'string' || parameters.csv === '') return undefined;
  return { port: 'csv', fields: [...new Set(csvHeaderCells(parameters.csv))] };
}

/** One diagnostic per reserved field per Static Data node: each is its own rename. */
export function checkReservedRowFields(
  nodes: readonly ReservedRowFieldNode[],
  options: CheckReservedRowFieldsOptions
): Diagnostic[] {
  const { component, severity = 'warning' } = options;
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (node.type !== STATIC_DATA_TYPE || !node.parameters) continue;
    const read = rowFields(node.parameters);
    if (!read) continue;

    for (const field of read.fields) {
      if (!RESERVED_ROW_FIELD_NAMES.has(field)) continue;
      diagnostics.push({
        code: DiagnosticCode.ReservedRowField,
        severity,
        message:
          `A row field in this Static Data is named "${field}", and "${field}" is one of a Noodl Object's own ` +
          `names. Every row reaches the graph as a Noodl Object, so row.${field} reads that and never this data. ` +
          'Object.keys(row) still lists the field, which is why it looks like it should work.',
        location: {
          component,
          nodeId: node.id,
          nodeType: node.type,
          ...(node.label ? { nodeLabel: node.label } : {}),
          port: read.port
        },
        suggestion:
          `Rename "${field}" in every row, and in whatever reads it, to a name that says what it holds. ` +
          "A row field cannot be a Noodl Object's own name (on, off, get, set, fill, data, notify, setAll, " +
          'getId, toJSON) or a built-in JavaScript object name (toString, valueOf, constructor, hasOwnProperty).'
      });
    }
  }

  return diagnostics;
}
