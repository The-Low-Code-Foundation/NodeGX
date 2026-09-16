/**
 * CHR-008 §3.1 — what a multiline-string row draws, as data.
 *
 * `TextAreaType.renderReact()` decided four things every time it ran: which literal to show when
 * the parameter is an expression object, whether the row counts as changed, whether a connection
 * replaces the control, and whether a blur is worth an undo entry. Those are facts about the
 * parameter, not about a React root, so they live here and the component draws what this says.
 *
 * ## 🔴 Import-free on purpose, like `describeRows` beside it
 *
 * `tests-unit` is plain Node with no DOM, and §9.2's trap was that importing ONE constant from a
 * module that reaches `./index` dragged in `projectmodel` → `bugtracker` and killed a suite **at
 * import** — a failure that looks nothing like its cause. So this module imports only
 * `ExpressionParameter` (which imports nothing at all) and `ParameterValueResolver` (which imports
 * only that), and the two things that cannot be pure — the connection lookup, which reaches
 * `NodeGraphContext`, and the model writes — are **injected** by {@link TextAreaWidget} rather
 * than reached from here.
 */
import { ParameterValueResolver } from '@noodl-utils/ParameterValueResolver';

/**
 * `PropertyPanelInputType.TextArea`, as its literal value.
 *
 * 🔴 **Deliberately not imported.** `PropertyPanelInput.tsx` declares that enum and also imports
 * `common/Icon`, whose `require.context` this runner cannot load — naming the enum here would make
 * every spec that touches this module fail *to run*. The component passes the real enum member at
 * runtime; `textAreaRow.test.tsx` asserts the two are equal behind FLD-017's `Icon` stub, so the
 * literal cannot drift away from the enum silently.
 */
export const TEXT_AREA_INPUT_TYPE = 'text-area';

/** What the row needs to know, with nothing on it that requires the editor to be running. */
export interface TextAreaRowSource {
  name: string;
  displayName: string;
  isDefault: boolean;
  isConnected: boolean;
  /** The parameter exactly as the model holds it — a string, or an expression object. */
  parameter: unknown;
  /** FB-018's binding chip label, already looked up. Ignored unless `isConnected`. */
  connectionLabel?: string;
  onConnectionClick?: () => void;
}

export interface TextAreaRowProps {
  label: string;
  value: string;
  dataIdentifier: string;
  inputType: string;
  properties: undefined;
  isChanged: boolean;
  isConnected: boolean;
  connectionLabel?: string;
  onConnectionClick?: () => void;
}

/**
 * The literal the textarea shows.
 *
 * 🔴 In expression mode the stored parameter is an `{ mode, expression, fallback }` object, and the
 * textarea must never be handed one — it would render `[object Object]` over the author's text. The
 * **fallback** is the literal: what the property is worth before anything evaluates.
 *
 * ⚠️ **One call, not two.** The legacy row — and the first version of this function — unwrapped the
 * fallback by hand *and then* called the resolver, which already does it
 * (`ParameterValueResolver.resolve(…, Display)` returns `fallback ?? ''`). A mutant that deleted the
 * hand-written branch **survived**: no test could tell the two apart, because there is nothing to
 * tell apart. Keeping a line no behaviour depends on, under a comment claiming it is the guard, is
 * how the next reader comes to believe the protection lives here rather than in the resolver.
 * `textAreaRow.test.tsx` pins the behaviour itself, so the resolver cannot quietly stop doing it.
 */
export function textAreaLiteral(parameter: unknown): string {
  return ParameterValueResolver.toString(parameter);
}

/**
 * Whether a committed edit is worth writing.
 *
 * ⚠️ Kept from the legacy view rather than tidied away: a textarea commits on **blur**, so tabbing
 * through the panel commits every row it passes. Without this, moving the caret across a panel
 * fills the undo queue with entries that changed nothing, and Cmd+Z then appears to do nothing
 * several times in a row.
 */
export function shouldCommitTextArea(next: unknown, parameter: unknown): boolean {
  return String(next ?? '') !== textAreaLiteral(parameter);
}

/**
 * The half of the row's props that is decided by the parameter.
 *
 * The handlers and the `fx` half are added by the component — they close over the model, and a
 * function that writes to the editor is not something this module can build or a spec can grade.
 */
export function textAreaRowProps(source: TextAreaRowSource): TextAreaRowProps {
  return {
    label: source.displayName,
    value: textAreaLiteral(source.parameter),
    dataIdentifier: source.name,
    inputType: TEXT_AREA_INPUT_TYPE,
    // No special properties for a textarea, as the legacy row passed.
    properties: undefined,
    isChanged: !source.isDefault,
    isConnected: source.isConnected,
    // 🔴 Only when connected. Passing a stale label through on a disconnected row would draw
    // FB-018's chip over a field the author can and should edit.
    connectionLabel: source.isConnected ? source.connectionLabel : undefined,
    onConnectionClick: source.isConnected ? source.onConnectionClick : undefined
  };
}
