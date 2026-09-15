/**
 * CHR-007 — which row a port gets, as data.
 *
 * This was `Ports.viewClassForPort`: 37 nested predicates and a 40-arm `else if`, in one 283-line
 * method, on a view that cannot be loaded without a project. It is now an ordered table of
 * `{ widget, test }` that imports nothing but a codec, so the decision can be asked — and graded —
 * with no DOM, no React and no editor singletons. `Ports` maps the answer to a row class.
 *
 * 🔴 **Order is the decision.** Several predicates match the same port — a `string` with both
 * `multiline` and `identifierOf` is a text area, a `number` with `marginPaddingComp` and `units` is
 * a margin/padding row, an `enum` with `alignComp` and `sizeComp: 'mode'` is align tools. The table
 * is tried top to bottom and the first match wins, exactly as the `else if` chain did.
 * `tests-unit/chr-007/widgetDispatch.test.ts` pins every port on every shipped node type, recorded
 * against the old method before this file existed.
 *
 * ⚠️ Kept verbatim, deliberately, including two sharp edges a behaviour-identical refactor must not
 * quietly fix: `type: null` throws (it passes `typeof type === 'object'`), and a `marginPaddingComp`
 * on a non-number still wins over `BasicType` because its test never looks at the type name.
 *
 * ## Which string ports get `fx` — POL-011, decided rather than inherited
 *
 * A `string` port can reach four different rows, and until POL-011 only `BasicType` had heard of
 * expressions. It is a decision now, per route:
 *
 * | Route | `fx` | Why |
 * |---|---|---|
 * | `basic` — plain `string`/`number` | **yes** | the original, unchanged |
 * | `textArea` — `multiline` | **yes** | the reported gap; the literal is multiline, the expression is one line |
 * | `codeEditor` — `codeeditor` | **no** | the value already *is* code; an expression producing code is a second language in one field |
 * | `identifier` — `identifierOf` | **no** | a name chosen from a set the project holds; an expression could name something that does not exist |
 *
 * The two `no`s are structural rather than a flag: neither row renders `PropertyPanelInput`, so
 * neither can offer the toggle. The decision is recorded here, at the one place that routes them.
 */
import { listPortTypeFor } from '@noodl-core-ui/components/json-editor/utils/listValueCodec';

import { nameForPortType } from '@noodl-models/nodelibrary/portTypeName';

export type WidgetId =
  | 'logicBuilderWorkspace'
  | 'logicBuilderHidden'
  | 'alignTools'
  | 'sizeMode'
  | 'enum'
  | 'color'
  | 'boolean'
  | 'textArea'
  | 'codeEditor'
  | 'listValue'
  | 'marginPadding'
  | 'numberWithUnits'
  | 'dimension'
  | 'identifier'
  | 'basic'
  | 'image'
  | 'icon'
  | 'font'
  | 'textStyle'
  | 'component'
  | 'sourceCode'
  | 'stringList'
  | 'resizing'
  | 'variable'
  | 'curve'
  | 'byobFilter'
  | 'querySorting'
  | 'pages'
  | 'propList'
  | 'workflowCondition'
  | 'workflowCases'
  | 'workflowValue'
  | 'workflowParams'
  | 'workflowTransform'
  | 'workflowValidate'
  | 'workflowBackoff'
  | 'workflowTriggerInfo'
  | 'workflowFunctionRef';

/** A port as the dispatch reads it: only its `type`, after `editAsType`. */
export interface WidgetPortLike {
  type?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EditType = any;

/** `getEditType`, moved here so the dispatch does not import the panel's utilities. */
export function editTypeOf(port: WidgetPortLike): EditType {
  const type = port.type as EditType;
  return type?.editAsType ? type.editAsType : type;
}

const named =
  (...names: string[]) =>
  (type: EditType) =>
    names.includes(nameForPortType(type));

/**
 * The table. One row per widget; a widget reached by two unrelated rules has one row with both
 * (`byobFilter` is the query filter and the BYOB filter — BCN-003b retired the second builder).
 */
export const WIDGET_RULES: readonly { widget: WidgetId; test: (type: EditType) => boolean }[] = [
  { widget: 'logicBuilderWorkspace', test: (t) => typeof t === 'object' && t.editorType === 'logic-builder-workspace' },
  // Internal Logic Builder parameters: a row that renders nothing.
  { widget: 'logicBuilderHidden', test: (t) => typeof t === 'object' && t.editorType === 'logic-builder-hidden' },
  { widget: 'alignTools', test: (t) => nameForPortType(t) === 'enum' && typeof t === 'object' && t.alignComp !== undefined },
  { widget: 'sizeMode', test: (t) => nameForPortType(t) === 'enum' && typeof t === 'object' && t.sizeComp === 'mode' },
  { widget: 'enum', test: (t) => nameForPortType(t) === 'enum' && typeof t === 'object' && Boolean(t.enums) },
  { widget: 'color', test: named('color') },
  { widget: 'boolean', test: named('boolean') },
  { widget: 'textArea', test: (t) => nameForPortType(t) === 'string' && typeof t === 'object' && Boolean(t.multiline) },
  { widget: 'codeEditor', test: (t) => nameForPortType(t) === 'string' && typeof t === 'object' && Boolean(t.codeeditor) },
  // Array-, object- and optionslist-typed ports edit as a literal in the shared JSON editor (ERG-003,
  // P82). `listPortTypeFor` is the one definition of "list-shaped"; `stringlist` and `proplist` have
  // their own rows and are deliberately absent from it.
  { widget: 'listValue', test: (t) => ['array', 'object', 'optionslist'].includes(listPortTypeFor(t)) },
  // ⚠️ Never looks at the type name — see the header.
  { widget: 'marginPadding', test: (t) => Boolean(t) && t.marginPaddingComp !== undefined },
  { widget: 'numberWithUnits', test: (t) => nameForPortType(t) === 'number' && t.units !== undefined },
  { widget: 'dimension', test: named('dimension') },
  { widget: 'identifier', test: (t) => nameForPortType(t) === 'string' && typeof t === 'object' && Boolean(t.identifierOf) },
  { widget: 'basic', test: named('string', 'number') },
  { widget: 'image', test: named('image') },
  { widget: 'icon', test: named('icon') },
  { widget: 'font', test: named('font') },
  { widget: 'textStyle', test: named('textStyle') },
  { widget: 'component', test: named('component') },
  { widget: 'sourceCode', test: named('source') },
  { widget: 'stringList', test: named('stringlist') },
  { widget: 'resizing', test: named('resizing') },
  { widget: 'variable', test: named('variable') },
  { widget: 'curve', test: named('curve') },
  { widget: 'byobFilter', test: named('query-filter', 'byob-filter') },
  { widget: 'querySorting', test: named('query-sorting') },
  { widget: 'pages', test: named('pages') },
  { widget: 'propList', test: named('proplist') },
  // WFA-004 / CWF-001…005 / WFA-005 / WFA-006: workflow step params, the registry's extension point.
  { widget: 'workflowCondition', test: named('workflow-condition') },
  { widget: 'workflowCases', test: named('workflow-cases') },
  { widget: 'workflowValue', test: named('workflow-value', 'workflow-path') },
  { widget: 'workflowParams', test: named('workflow-params') },
  { widget: 'workflowTransform', test: named('workflow-transform') },
  { widget: 'workflowValidate', test: named('workflow-validate') },
  { widget: 'workflowBackoff', test: named('workflow-backoff') },
  { widget: 'workflowTriggerInfo', test: named('workflow-trigger-info') },
  { widget: 'workflowFunctionRef', test: named('workflow-function-ref') }
];

/** The row a port gets, or `undefined` when it gets none (a signal, a `*`, an unknown type). */
export function widgetForPort(port: WidgetPortLike): WidgetId | undefined {
  const type = editTypeOf(port);
  for (const rule of WIDGET_RULES) {
    if (rule.test(type)) return rule.widget;
  }
  return undefined;
}
