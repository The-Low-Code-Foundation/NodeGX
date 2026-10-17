---
title: "Set Variable"
---
Writes one named app-wide variable when its Do signal fires, converting the value per the 'Set as' type choice.

Set Variable stores a value into the named app-wide variable — the same store Variable2 reads — only when the `do` (Do) signal fires; the incoming value is held but nothing is written before that. `setWith` (Set as, parameters-only) selects the value type: it types the node's dynamic `value` input and controls conversion on store — 'boolean' coerces with !!, 'emptyString' writes '' and removes the value input entirely, and 'object'/'array' accept a shared Object/Array id string and resolve it to the actual object or collection before storing. Writes always use force-change semantics, so Variable2 nodes bound to that name fire `changed` even when the new value equals the old one. `done` fires after the store completes, `failure` when no `name` is set, and `completed` after either.

## When to use it

Use it when writing shared state should happen at an explicit moment — on click, on submit, after a fetch — or when you need the type conversions ('Set as'). For continuous write-on-change semantics, wire into a Variable2 node's `value` input instead; to clear a variable, choose Set as 'Empty string'.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Set Variable` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | String (VariableName id) | — | Which app-wide variable to write; leaving it blank refuses the write rather than storing it somewhere unreadable |
| `setWith` | Enum (`string`, `boolean`, `number`, `emptyString`, `date`, `object`, `array`, `*`) | `*` | Chooses the type of the Value port; Empty string stores "" and needs no Value, Object and Array accept an id as well as a value, and Boolean is coerced |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `do` | Signal | — | Writes Value into the named variable, or fires Failure when no Name is set |

### What each input does

**Name** (`name`)

- always: the variable the next Do writes

**Set as** (`setWith`)

- always: how the next Do converts Value

**Do** (`do`)

- always: Value is written to the variable at the end of the frame, once however many Dos arrived — Done for each Do; Error, and Failure for each Do, when Name is empty

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the variable has been written and every Variable node reading it has been notified |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the write was refused, in one sentence; empty until something fails |
| `failure` | Signal | — | Fires when nothing was stored because no variable Name is set |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

The value input type follows the selected variable type.

## Ports at runtime

The value input is runtime-determined: the editor pushes a single dynamic input port named `value` whose type follows the `setWith` parameter ('*' when unset), and no value port exists at all when setWith is 'emptyString'. The runtime registers `value` on demand when a connection or parameter references it. An authoring tool may wire or set `value` (except in emptyString mode) and must set `setWith` via parameters, never a connection.

## Patterns

- Button `onClick` → `do` with the form's data on `value`: commit shared state at the moment of a user action.
- `done` → a navigation or feedback signal: sequence 'store, then move on' explicitly.

## Watch out for

- Expecting the write to happen when `value` changes — Set Variable only writes on `do`. Use Variable2's value input for write-on-change.

## Examples

**Share a value between components with Set Variable and Variable**

The idiomatic shared-state shape, contrasting per-instance and app-wide storage. In the form component, a String node snapshots the text field: because its saveValue (Set) is connected, keystrokes only latch a pending value, and the Button click commits it. The String's stored signal then fires the Set Variable's do, writing the committed text into the app-wide variable 'userName' (setWith 'string' types the dynamic value input). In a completely separate component, a Variable2 node bound to the same name reads the value reactively — its changed/value update the greeting automatically whenever the variable is written, with no connection between the two components.

## Related nodes

[Variable](./variable2.md), [Object](./model2.md), [String](../variables/string.md), [Boolean](../variables/boolean.md), [Number](../variables/number.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "dos": 0,
  "scheduled": false
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/set-variable.ts"
/**
 * Set Variable (catalog type `Set Variable`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/setvariablenode.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` writes one key of the shared `--ndl--global-variables`
 * record (:60, variable2.ts) at the frame end — one write for any number of presses in a frame,
 * one outcome PER press (:137-145, :159-211). With no `Name` (`undefined`, `null`, `''`) nothing
 * is written: `Error` carries the sentence and every press reports `failure` with
 * `set-variable/no-name` (:186-193). Otherwise the value written is `Value` as last sent, read
 * through `Set as` (:195-202): `Empty string` writes `''` and needs no Value; `Object` turns a
 * STRING into the record of that name (create-on-read, :199-200); `Array` turns a string into the
 * array of that name (:201); `Boolean` writes `!!value`; every other choice — `String`, `Number`,
 * `Date`, `Any` — writes what arrived untouched (the description's "coerced" is Boolean's alone;
 * NDA-012 filed the rest). The write FORCES a change notification (:205-207), so every Variable
 * node reading the name fires `Changed` even for the same value — and `done` is reported last
 * (:210). `Value` is a port the runtime registers on first write whatever `Set as` says (:213-223);
 * the editor draws it under the chosen type, and not at all for `Empty string` (:233-250).
 */

import type { ValueInputDecl, ValueType } from '../spec';
import { defineNode } from '../spec';
import { emptyId, errorOutput } from './data-base';
import { GLOBAL_VARIABLES } from './variable2';

/** :45-46, :187-190 */
export const NO_NAME_MESSAGE = 'No variable name is set — the value was not stored anywhere a Variable node can read';

/** :104-118 */
const SET_WITH = ['string', 'boolean', 'number', 'emptyString', 'date', 'object', 'array', '*'] as const;

/** :233-250 — the `value` port's declared type follows `Set as` (a value the editor could not offer reads as Any). */
function valuePort(setWith: unknown): ValueInputDecl {
  const type: ValueType = typeof setWith === 'string' && (SET_WITH as readonly string[]).includes(setWith) && setWith !== 'emptyString' ? (setWith as ValueType) : '*';
  return { type, coerce: 'none', displayName: 'Value', group: 'General', description: 'The value to write into the named variable when Do fires', examples: ['m1', 'abc', 'x'] };
}

export const SetVariable = defineNode({
  type: 'Set Variable',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/setvariablenode.ts',
  needs: ['registry'],

  // :21-38 — `name`, `value`, `lastError`, `setWith` (unset until the panel writes it: the declared default never runs a setter), the pending tokens
  state: { name: undefined as unknown, value: undefined as unknown, setWith: undefined as unknown, lastError: undefined as string | undefined, dos: 0, scheduled: false },
  // :60 — the shared record, bound at creation (nothing is watched: this node only writes)
  init: (w) => {
    w.registry.model(GLOBAL_VARIABLES);
    return {};
  },
  outcomes: ['done', 'failure'], // :76-79

  inputs: {
    // :91-103
    name: {
      type: 'string',
      coerce: 'none',
      displayName: 'Name',
      group: 'General',
      description: 'Which app-wide variable to write; leaving it blank refuses the write rather than storing it somewhere unreadable',
      examples: ['x', 'y', 'count']
    },
    // :104-132 — panel only
    setWith: {
      type: 'enum',
      enums: SET_WITH,
      default: '*',
      coerce: 'none',
      editOnly: true,
      displayName: 'Set as',
      group: 'General',
      description:
        'Chooses the type of the Value port; Empty string stores "" and needs no Value, Object and Array accept an id as well as a value, and Boolean is coerced'
    },
    // :133-146
    do: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Writes Value into the named variable, or fires Failure when no Name is set'
    }
  },

  outputs: {
    // :80-88
    error: errorOutput('Why the write was refused, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    name: (_s, v) => ({ says: 'always: the variable the next Do writes', set: { name: v }, send: [] }), // :100-102
    setWith: (_s, v) => ({ says: 'always: how the next Do converts Value', set: { setWith: v }, send: [] }), // :129-131
    // :137-145 — a token per press, one store per frame
    do: (s) => ({
      says: 'always: Value is written to the variable at the end of the frame, once however many Dos arrived — Done for each Do; Error, and Failure for each Do, when Name is empty',
      set: { dos: s.dos + 1, scheduled: true },
      outcome: 'deferred',
      send: []
    })
  },
  {
    // :228-250 — the one dynamic port, registered on first write whatever `Set as` says (:218-222)
    derived: {
      inputs: (params): Record<string, ValueInputDecl> => (params.setWith === 'emptyString' ? {} : { value: valuePort(params.setWith) }),
      discover: (port) => (port === 'value' ? valuePort('*') : undefined),
      candidates: ['value'],
      on: (_s, _port, v) => ({ set: { value: v }, send: [] }) // :156-158 setValue
    },
    // :164-211
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const n = s.dos;
      if (emptyId(s.name)) {
        // :186-193 reportFailure: Error first, then every token fails
        const outcomes = Array.from({ length: n }, () => ({ port: 'do' as const, outcome: 'failure' as const, error: 'set-variable/no-name' }));
        return { set: { scheduled: false, dos: 0, lastError: NO_NAME_MESSAGE }, send: ['error'], outcomes };
      }
      let value: unknown = s.setWith === 'emptyString' ? '' : s.value; // :195
      if (s.setWith === 'object' && typeof value === 'string') value = w.registry.model(value); // :199-200
      if (s.setWith === 'array' && typeof value === 'string') value = w.registry.collection(value); // :201
      if (s.setWith === 'boolean') value = !!value; // :202
      w.registry.model(GLOBAL_VARIABLES).set(s.name as string, value, { forceChange: true }); // :205-207 — the name as sent (a Variable node compares the notification's name with `===`)
      const outcomes = Array.from({ length: n }, () => ({ port: 'do' as const, outcome: 'done' as const })); // :210
      return { set: { scheduled: false, dos: 0 }, send: [], outcomes };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
