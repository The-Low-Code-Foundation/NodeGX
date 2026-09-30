/**
 * The Variables family — Boolean, Number, String, Color — read from
 * `packages/noodl-runtime/src/nodes/std-library/variables/variablebase.ts` on 2026-09-30
 * (NSP-011), with run-on-value-change.ts and outcome.ts beside it. One definition, four nodes
 * (`createDefinition`, :105-299); this file is its spec-side twin, and boolean.ts / number.ts /
 * string.ts / color.ts each supply what the runtime file of the same name supplies: the type, the
 * start value, the cast, and the `Treat empty as` options.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Why this family carries "the coercion table" (NSP-011 §3): a Variable is where a cross-type
 * value most often lands, and `setValueTo` (:248-296) is the one place that decides what a
 * `null`, a `NaN` or an `undefined` becomes. The rules, in order:
 *   - `undefined` ABSTAINS (:154, :255): nothing stored, nothing pending, nothing reported;
 *   - `null` becomes the selected `Treat empty as` value (:265-266) — `null` itself by default;
 *   - anything else goes through the node's `cast` (:268), and a cast that yields `NaN` is
 *     treated as a clear (:273-275);
 *   - "changed" is `!hasBeenSet || current !== casted` (:285) — the NDA-002 guard against a
 *     seeded start value passing for an author's.
 *
 * Two things the wire shows that the descriptions do not say, both NSP-011 §6 rows:
 *   - `latestValue` is seeded `0` (:121), not `undefined`, and the value setter compares the new
 *     value against it (DEF-046, :164-168). So the FIRST value to arrive, if it is `0`, is not a
 *     change and is never stored: a String variable handed the number 0 stays `''`, a Boolean
 *     stays `false` with `hasBeenSet` false, and a later Set then reports `done` for a value it
 *     had all along (row C5).
 *   - a `Set` pulsed before any Value stores that seed: `setValueTo(0)` — so a String variable
 *     stores `'0'`, a Color variable stores the NUMBER 0, and both fire Changed and report done
 *     (row C5 too; `initialize`'s comment at :121 gives no reason for 0).
 *
 * The `Set` outcome is DEFERRED (spec.ts `ReducerOutcome`): each pulse schedules its own
 * `setValueTo(latestValue)` for frame end (:200-206), so two pulses in one frame are two
 * invocations — the first may be `done`, the second is `unchanged` — and a value arriving after
 * the pulse but in the same frame is what gets stored. `afterInputs` resolves them in order.
 */

import type { Outcome } from '../spec';
import { valueDidChange } from './condition';

export type VariableType = 'boolean' | 'number' | 'string' | 'color';

/** :66-72 */
export interface EmptyOption {
  value: string;
  label: string;
  coerce: unknown;
}

/** :75-103 — what each concrete Variable supplies. */
export interface VariableArgs {
  type: VariableType;
  startValue: unknown;
  cast: (value: unknown) => unknown;
  emptyOptions: readonly [EmptyOption, EmptyOption];
}

/** :30-46 */
export type VariableState = {
  /** `_internal.currentValue` — the stored value, what every output reads */
  current: unknown;
  /** `_internal.latestValue` — the pending value; seeded 0 (:121) */
  latest: unknown;
  /** `_internal.hasBeenSet` (:39, :122) */
  hasBeenSet: boolean;
  /** `Set` pulses this frame whose after-inputs callback has not yet run (:200-206) */
  sets: number;
};

/** initialize (:119-124). `treatEmptyAs` is an input here (its default is `emptyOptions[0].value`, :123, :181). */
export const variableState = (args: VariableArgs): VariableState => ({ current: args.startValue, latest: 0, hasBeenSet: false, sets: 0 });

const VALUE_DESCRIPTION =
  'The empty-value contract (dev-docs/reference/EMPTY-VALUE-CONTRACT.md): `undefined` ' +
  "abstains and leaves the Variable's stored value untouched. `null` is a real value — " +
  'it clears the Variable, is stored, and fires Changed. What "cleared" is stored as is ' +
  'controlled by `Treat empty as` (null by default).';

/** The inputs every Variable declares: :140-214, run-on-value-change.ts :126-140, outcome.ts :228-262. */
export function variableInputs<T extends VariableType>(args: VariableArgs & { type: T }) {
  return {
    // :140-171 — no conversion on arrival; `setValueTo` casts (see the module docblock)
    value: {
      type: args.type,
      default: args.startValue,
      coerce: 'none',
      displayName: 'Value',
      group: 'Values',
      description: VALUE_DESCRIPTION
    },
    // :173-190
    treatEmptyAs: {
      type: 'enum',
      enums: [args.emptyOptions[0].value, args.emptyOptions[1].value],
      default: args.emptyOptions[0].value,
      coerce: 'none',
      displayName: 'Treat empty as',
      group: 'Advanced',
      description:
        'Back-compat for graphs written before Variables were nullable. `null` (default) ' +
        'keeps a cleared value distinguishable from a real ' +
        JSON.stringify(args.emptyOptions[1].coerce) +
        '. Choosing another option restores the pre-NDA-003 coercion for authors who relied on it.'
    },
    // :191-208 `valueChangedToTrue` → `beginOutcome()` + `scheduleAfterInputsHaveUpdated`
    saveValue: {
      type: 'signal',
      outcome: true,
      displayName: 'Set',
      group: 'Actions',
      description:
        'Stores the latest value now. This is additional to Value storing on change; untick Value under Run On Value Change to stop that'
    },
    // :213 `outcomeInputs(VARIABLE_OUTCOME)` → outcome.ts :242-261; two options, no failure port (:210-212)
    treatUnchangedAs: {
      type: 'enum',
      enums: ['unchanged', 'done'],
      default: 'unchanged',
      coerce: 'none',
      displayName: 'Treat Unchanged as',
      group: 'Advanced',
      description:
        'What this node reports when the action was valid and there was nothing to do. ' +
        'Unchanged (the default) keeps it a third outcome of its own. Done suits a project ' +
        'whose chains should carry on either way' +
        '. Completed fires whatever this is set to.'
    },
    // :118 `runOnValueChange: { controlSignal: 'saveValue', inputs: ['value'] }` → run-on-value-change.ts :126-140
    'runOnChange-value': {
      type: 'boolean',
      default: true,
      coerce: 'not-false',
      displayName: 'Value',
      group: 'Run On Value Change',
      description:
        'Whether a new value on Value re-runs this node. On by default; untick to make this input passive so only the control signal runs it'
    }
  } as const;
}

/** The outputs every Variable declares: :216-245 (String adds `length` in string.ts). */
export const SAVED_VALUE_DESCRIPTION =
  "Can be `null` — a cleared Variable (see `value`'s description) stores and emits " +
  "null by default, not this type's zero value, unless `Treat empty as` says otherwise.";
export const CHANGED = {
  type: 'signal',
  displayName: 'Changed',
  group: 'Events',
  description:
    'Fires whenever the stored value actually changed, however it was reached — including ' +
    'Value writing straight through under Run On Value Change. It is a value-level event, ' +
    'not the outcome of a Set'
} as const;

/** :14-20 VARIABLE_OUTCOME → outcomeOutputs: done + unchanged (+ completed), no failure (:243-244) */
export const VARIABLE_OUTCOMES = ['done', 'unchanged'] as const;

type VariableInputsSeen = { readonly treatEmptyAs: string; readonly treatUnchangedAs: string; readonly 'runOnChange-value': boolean };
type ValuePatch = { set?: Partial<VariableState>; emit?: readonly ['changed'] };
type SetsPatch = ValuePatch & { outcomes?: ReadonlyArray<{ port: 'saveValue'; outcome: Outcome; error?: string }> };

/** :248-296 `setValueTo`, as a pure function of (current, hasBeenSet, value, Treat empty as). */
export function setValueTo(
  args: VariableArgs,
  s: { current: unknown; hasBeenSet: boolean },
  value: unknown,
  treatEmptyAs: unknown
): { current: unknown; hasBeenSet: boolean; changed: boolean } {
  if (value === undefined) return { current: s.current, hasBeenSet: s.hasBeenSet, changed: false }; // :255
  const empty = args.emptyOptions.find((o) => o.value === treatEmptyAs) ?? args.emptyOptions[0]; // :261-262
  let casted = value === null ? empty.coerce : args.cast(value); // :265-268
  if (typeof casted === 'number' && Number.isNaN(casted)) casted = empty.coerce; // :273-275
  const changed = !s.hasBeenSet || s.current !== casted; // :285
  return { current: casted, hasBeenSet: true, changed }; // :286-287
}

/** :150-171 — the `value` setter. */
export function onValue(args: VariableArgs, s: Readonly<VariableState>, v: unknown, i: VariableInputsSeen): ValuePatch {
  if (v === undefined) return {}; // :154 — abstains
  const previous = s.latest; // :164
  // :168 `shouldRunOnValueChanged('value', previous, value)` = valueDidChange && the checkbox
  if (!(valueDidChange(previous, v) && i['runOnChange-value'])) return { set: { latest: v } }; // :165
  const r = setValueTo(args, s, v, i.treatEmptyAs); // :169
  // not changed ⇒ hasBeenSet was already true and current === casted (:285): nothing to set but the pending value
  if (!r.changed) return { set: { latest: v } };
  return { set: { latest: v, current: r.current, hasBeenSet: true }, emit: ['changed'] }; // :286-292
}

/** :196-207 — a `Set` pulse: mint the outcome now, do the work at frame end. */
export function onSet(s: Readonly<VariableState>) {
  return { set: { sets: s.sets + 1 }, outcome: 'deferred' as const };
}

/** node.ts reportOutcome :1013-1030 — `Treat Unchanged as`, applied to an `unchanged` only. */
function report(outcome: 'done' | 'unchanged', policy: unknown): { port: 'saveValue'; outcome: Outcome; error?: string } {
  if (outcome === 'unchanged' && policy === 'done') return { port: 'saveValue', outcome: 'done' };
  if (outcome === 'unchanged' && policy === 'failure') return { port: 'saveValue', outcome: 'failure', error: 'outcome/unchanged-as-failure' };
  return { port: 'saveValue', outcome };
}

/** :201-206, once per pulse this frame, each against the frame's final `latestValue`. */
export function afterSets(args: VariableArgs, s: Readonly<VariableState>, i: VariableInputsSeen): SetsPatch {
  if (s.sets === 0) return {};
  let current = s.current;
  let hasBeenSet = s.hasBeenSet;
  let changedAny = false;
  const outcomes: Array<{ port: 'saveValue'; outcome: Outcome; error?: string }> = [];
  for (let k = 0; k < s.sets; k++) {
    const r = setValueTo(args, { current, hasBeenSet }, s.latest, i.treatEmptyAs); // :204
    current = r.current;
    hasBeenSet = r.hasBeenSet;
    changedAny = changedAny || r.changed;
    outcomes.push(report(r.changed ? 'done' : 'unchanged', i.treatUnchangedAs)); // :205
  }
  // nothing changed ⇒ current and hasBeenSet are what they were (:285); only the frame's count resets
  if (!changedAny) return { set: { sets: 0 }, outcomes };
  return { set: { current, hasBeenSet, sets: 0 }, emit: ['changed'], outcomes };
}
