/**
 * P112-OWN026-QUERYFILTERSHAPE — a Query Records query in a shape its runtime does not read.
 *
 * An agent that wanted each signed-in user to see only their own rows could not find out how to
 * filter a Query Records node on the server, and wrote what it guessed (`querySettings.filter`). The
 * runtime takes ANY parameter name and stores it (`dbcollectionnode2.ts` `userInputSetter`), so the
 * guess was accepted, read by nothing, and every row in the collection reached every browser.
 *
 * This check refuses the four shapes that run and quietly answer with more rows than were asked for:
 *
 *  1. A parameter, or a wire, with a name Query Records has no use for. The names it reads are the ones
 *     its editor draws (`updatePorts`), listed in {@link QUERY_RECORDS_PARAMETERS}, plus three prefixed
 *     families: `qp-<name>` (a filter value), `runOnChange-<input>` (a run-on-change box) and
 *     `storageFilterValue-<name>` (a value the Javascript filter reads).
 *  2. A `visualFilter` the translators cannot read: not an object of either saved shape, a rule with an
 *     operator they do not know, a rule with no property, or a comparison with neither `input` nor
 *     `value`. `visualQueryToNeutral` / `savedFilterToNeutral` DROP such a rule rather than fail it, so
 *     the query is wider than the one written — the same silence as (1), one level down.
 *  3. A `visualSort` that is not a list of `{property, order}` rows (`convertVisualSorting`).
 *  4. A `qp-<name>` wire or parameter whose `<name>` no rule's `input` names: the runtime registers the
 *     input, stores the value under that name and no rule ever reads it.
 *
 * Abstentions: an empty object in a rule list or a sort list is a half-finished row the editor's own
 * builders leave behind (50 rules and 6 sort rows across the local projects, measured 2026-10-22) and is
 * skipped by every reader, so it is not reported. A `storageLimit` with `storageEnableLimit` off is inert
 * but the editor itself leaves it so when the box is unticked (14 nodes), so it is not reported either.
 *
 * Both saved filter shapes are read, for the reason `queryBeforeFilter.ts` reads both: the retired
 * QueryEditor's `{combinator, rules}` (operators in English, `input` naming the value's port) is what
 * templates and agents write; the builder's `{type, conditions}` (neutral operators, `valuePortName`) is
 * what the editor saves once the filter is opened in its panel. The two operator lists are copied from
 * `@noodl/backend-contract`'s translators rather than imported, because this layer must not pull the
 * runtime's dependencies in; `noodl-mcp/tests/own026QueryFilter.test.ts` compares them and fails the
 * day they disagree.
 *
 * Pure: the caller supplies nodes and the component's wires.
 *
 * @module noodl-editor/validation/queryFilterShape
 */

import { DiagnosticCode, type Diagnostic } from './diagnostics';
import type { FunctionWireLike } from './functionPorts';
import type { ParameterizedNode } from './parameterValues';
import { QUERY_NODE_TYPE } from './queryBeforeFilter';

/** The parameter names a Query Records node reads (the ports `updatePorts` draws), exact. */
export const QUERY_RECORDS_PARAMETERS: readonly string[] = Object.freeze([
  'collectionName',
  'backendId',
  'storageFilterType',
  'search',
  'storageEnableLimit',
  'storageLimit',
  'storageSkip',
  'storageFetch',
  'realtime',
  'storageEnableCount',
  'visualFilter',
  'visualSort',
  'storageJSONFilter'
]);

/** The prefixed families a Query Records node reads. */
const QUERY_RECORDS_PREFIXES = ['qp-', 'runOnChange-', 'storageFilterValue-'] as const;

const QP = 'qp-';

/**
 * The operators of the `{combinator, rules}` shape — `VISUAL_OPERATORS` in
 * `backend-contract/translators/saved.ts`, plus the three it answers before that table
 * (`exist`, `not exist`, `related to`).
 */
export const VISUAL_FILTER_OPERATORS: readonly string[] = Object.freeze([
  'equal to',
  'not equal to',
  'greater than',
  'greater than or equal to',
  'less than',
  'less than or equal to',
  'contain',
  'exist',
  'not exist',
  'points to',
  'related to'
]);

/** Operators of the `{combinator, rules}` shape that read no value. */
const VALUELESS_VISUAL_OPERATORS = new Set(['exist', 'not exist']);

/** The neutral operators of the builder's `{type, conditions}` shape — `FILTER_OPERATORS` in `backend-contract/filter.ts`. */
export const SAVED_FILTER_OPERATORS: readonly string[] = Object.freeze([
  'equalTo',
  'notEqualTo',
  'lessThan',
  'greaterThan',
  'lessThanOrEqualTo',
  'greaterThanOrEqualTo',
  'containedIn',
  'notContainedIn',
  'exists',
  'matchesRegex',
  'contains',
  'notContains',
  'containsIgnoreCase',
  'startsWith',
  'notStartsWith',
  'startsWithIgnoreCase',
  'endsWith',
  'notEndsWith',
  'endsWithIgnoreCase',
  'between',
  'notBetween',
  'isEmpty',
  'isNotEmpty',
  'textSearch',
  'pointsTo',
  'relatedTo',
  'path',
  'idEqualTo',
  'idContainedIn',
  'nearSphere',
  'withinBox',
  'withinPolygon'
]);

/** The real shape, as every diagnostic here suggests it. */
export const QUERY_FILTER_SHAPE_SUGGESTION =
  '"visualFilter": {"combinator": "and", "rules": [{"property": "<field>", "operator": "equal to", "input": "<name>"}]} ' +
  'and wire the value into the port "qp-<name>" (or give the rule "value": <literal> instead of "input"). ' +
  'Operators: ' +
  VISUAL_FILTER_OPERATORS.map((o) => `"${o}"`).join(', ') +
  '. A rule may itself be a {"combinator", "rules"} group. ' +
  'Sort: "visualSort": [{"property": "<field>", "order": "ascending" | "descending"}]. ' +
  'Limit: "storageEnableLimit": true, "storageLimit": <n>, "storageSkip": <n>. ' +
  'Example: get_example cloud-query-own-rows.';

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isEmptyRow = (v: unknown) => isPlainObject(v) && Object.keys(v).length === 0;

/** `isVisualQueryFormat` in `backend-contract/translators/saved.ts`, copied for the reason above. */
function isVisualShape(query: Record<string, unknown>): boolean {
  if (Array.isArray(query.conditions)) return false;
  return query.combinator !== undefined || query.property !== undefined || query.operator !== undefined;
}

/** What is wrong with one `visualFilter` value, as sentences; empty when it reads. Also returns the input names it makes. */
export function visualFilterProblems(filter: unknown): { problems: string[]; inputs: string[] } {
  const problems: string[] = [];
  const inputs: string[] = [];
  const addInput = (name: string) => {
    if (!inputs.includes(name)) inputs.push(name);
  };

  function rule(r: unknown, at: string): void {
    if (isEmptyRow(r)) return;
    if (!isPlainObject(r)) {
      problems.push(`${at} is not an object`);
      return;
    }
    if (r.rules !== undefined || r.combinator !== undefined) {
      if (r.combinator !== 'and' && r.combinator !== 'or') problems.push(`${at} has "combinator" ${JSON.stringify(r.combinator)}; it must be "and" or "or"`);
      if (!Array.isArray(r.rules)) {
        problems.push(`${at} is a group with no "rules" list`);
        return;
      }
      r.rules.forEach((child, i) => rule(child, `${at}.rules[${i}]`));
      return;
    }
    const op = r.operator;
    if (typeof op !== 'string' || !VISUAL_FILTER_OPERATORS.includes(op)) {
      const hint = typeof op === 'string' && SAVED_FILTER_OPERATORS.includes(op) ? ` ("${op}" is the editor's saved-shape spelling; in a "rules" filter write the English one)` : '';
      problems.push(`${at} has operator ${JSON.stringify(op)}, which this filter does not know${hint} — the rule is dropped and the query returns more rows`);
      return;
    }
    if (op === 'related to') {
      if (typeof r.relationProperty !== 'string') problems.push(`${at} ("related to") has no "relationProperty"`);
    } else if (typeof r.property !== 'string' || r.property.length === 0) {
      problems.push(`${at} has no "property" — the rule is dropped and the query returns more rows`);
    }
    if (typeof r.input === 'string' && r.input.length > 0) addInput(r.input);
    else if (r.input !== undefined) problems.push(`${at} has "input" ${JSON.stringify(r.input)}; it must be the name of the qp- port that carries the value`);
    else if (!VALUELESS_VISUAL_OPERATORS.has(op) && r.value === undefined) {
      problems.push(`${at} has neither "input" nor "value" — the rule is dropped and the query returns more rows`);
    }
  }

  function condition(c: unknown, at: string): void {
    if (isEmptyRow(c)) return;
    if (!isPlainObject(c)) {
      problems.push(`${at} is not an object`);
      return;
    }
    if (c.type === 'and' || c.type === 'or' || c.conditions !== undefined) {
      if (c.type !== 'and' && c.type !== 'or') problems.push(`${at} has "type" ${JSON.stringify(c.type)}; it must be "and" or "or"`);
      if (!Array.isArray(c.conditions)) {
        problems.push(`${at} is a group with no "conditions" list`);
        return;
      }
      c.conditions.forEach((child, i) => condition(child, `${at}.conditions[${i}]`));
      return;
    }
    const op = c.operator;
    if (typeof op !== 'string' || !SAVED_FILTER_OPERATORS.includes(op)) {
      problems.push(`${at} has operator ${JSON.stringify(op)}, which this filter does not know — the condition is dropped and the query returns more rows`);
      return;
    }
    if (c.kind !== 'relation' && (typeof c.field !== 'string' || c.field.length === 0)) {
      problems.push(`${at} has no "field" — the condition is dropped and the query returns more rows`);
    }
    if (c.valueSource === 'connected') {
      if (typeof c.valuePortName !== 'string' || c.valuePortName.length === 0) problems.push(`${at} is "connected" with no "valuePortName"`);
      else addInput(c.valuePortName.startsWith(QP) ? c.valuePortName.slice(QP.length) : c.valuePortName);
    }
  }

  if (!isPlainObject(filter)) {
    problems.push(`"visualFilter" is ${Array.isArray(filter) ? 'a list' : typeof filter}, not a filter object`);
  } else if (isVisualShape(filter)) {
    rule(filter, 'visualFilter');
  } else if (Array.isArray(filter.conditions)) {
    condition(filter, 'visualFilter');
  } else if (Object.keys(filter).length > 0) {
    problems.push(
      `"visualFilter" has neither "combinator"/"rules" nor "type"/"conditions" (it has ${Object.keys(filter)
        .slice(0, 4)
        .map((k) => `"${k}"`)
        .join(', ')}) — the runtime reads no rule from it and the query returns every row`
    );
  }
  return { problems, inputs };
}

function visualSortProblems(sort: unknown): string[] {
  if (!Array.isArray(sort)) return [`"visualSort" is ${typeof sort}, not a list of {"property", "order"} rows`];
  const problems: string[] = [];
  sort.forEach((row, i) => {
    if (isEmptyRow(row)) return;
    if (!isPlainObject(row) || typeof row.property !== 'string' || row.property.length === 0) {
      problems.push(`visualSort[${i}] has no "property"`);
      return;
    }
    if (row.order !== undefined && row.order !== 'ascending' && row.order !== 'descending') {
      problems.push(`visualSort[${i}] has "order" ${JSON.stringify(row.order)}; it must be "ascending" or "descending"`);
    }
    const extra = Object.keys(row).filter((k) => k !== 'property' && k !== 'order');
    if (extra.length) problems.push(`visualSort[${i}] has ${extra.map((k) => `"${k}"`).join(', ')}, which sorting does not read`);
  });
  return problems;
}

const isKnownName = (name: string) => QUERY_RECORDS_PARAMETERS.includes(name) || QUERY_RECORDS_PREFIXES.some((p) => name.startsWith(p));

export interface CheckQueryFilterShapeOptions {
  /** Legacy name of the component being submitted. */
  component: string;
  /** Every connection in the component; the check reads the ones INTO a Query Records node. */
  wires?: readonly FunctionWireLike[];
}

/** P112-OWN026-QUERYFILTERSHAPE — see the module docblock. */
export function checkQueryFilterShape(nodes: readonly ParameterizedNode[], options: CheckQueryFilterShapeOptions): Diagnostic[] {
  const { component, wires } = options;
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (node.type !== QUERY_NODE_TYPE) continue;
    const parameters = node.parameters ?? {};
    const at = (port: string, plug: 'input' = 'input') => ({
      component,
      nodeId: node.id,
      nodeType: node.type,
      ...(node.label ? { nodeLabel: node.label } : {}),
      port,
      plug
    });
    const report = (port: string, message: string) =>
      diagnostics.push({
        code: DiagnosticCode.QueryRecordsShape,
        severity: 'error',
        message,
        location: at(port),
        suggestion: QUERY_FILTER_SHAPE_SUGGESTION
      });

    // 1 — names it has no use for, set or wired.
    const wiredInto = (wires ?? []).filter((w) => w.toId === node.id).map((w) => w.toProperty);
    for (const name of Object.keys(parameters)) {
      if (isKnownName(name)) continue;
      report(
        name,
        `Query Records has no parameter "${name}": it is stored by that name and nothing reads it, so it does not narrow ` +
          'the query. A server-side filter is the "visualFilter" parameter, with each value it compares to wired into a "qp-<name>" port.'
      );
    }
    for (const name of new Set(wiredInto)) {
      if (isKnownName(name)) continue;
      report(
        name,
        `Query Records has no input "${name}": a wire into it sets a value nothing reads. A filter value goes into a ` +
          '"qp-<name>" port, where <name> is the "input" of a rule in "visualFilter".'
      );
    }

    // 2 — a filter the translators cannot read.
    let filterInputs: string[] = [];
    if (parameters.visualFilter !== undefined) {
      const { problems, inputs } = visualFilterProblems(parameters.visualFilter);
      filterInputs = inputs;
      if (problems.length) {
        report('visualFilter', `This Query Records filter does not read as written: ${problems.slice(0, 4).join('; ')}.`);
      }
    }

    // 3 — a sort sorting cannot read.
    if (parameters.visualSort !== undefined) {
      const problems = visualSortProblems(parameters.visualSort);
      if (problems.length) report('visualSort', `This Query Records sort does not read as written: ${problems.slice(0, 4).join('; ')}.`);
    }

    // 4 — a qp- value no rule reads. Only judged in the Visual filter mode, where qp- ports exist.
    const visual = parameters.storageFilterType === undefined || parameters.storageFilterType === 'simple';
    const qpNames = new Set([...Object.keys(parameters), ...wiredInto].filter((n) => n.startsWith(QP)));
    for (const port of qpNames) {
      const name = port.slice(QP.length);
      if (visual && filterInputs.includes(name)) continue;
      report(
        port,
        visual
          ? `"${port}" feeds no rule: no rule in this node's "visualFilter" has "input": "${name}"` +
              (filterInputs.length ? ` (the ports it makes are ${filterInputs.map((n) => `"${QP}${n}"`).join(', ')})` : ' (it names no input at all)') +
              ', so the value is stored and never read and the query is not narrowed by it.'
          : `"${port}" feeds nothing: this node's Filter is "${String(parameters.storageFilterType)}", which reads no qp- port.`
      );
    }
  }

  return diagnostics;
}
