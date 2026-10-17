---
title: "Variable"
---
Reads and writes one named app-wide variable; every node bound to the same name sees the same value.

Variable2 (shown as 'Variable' in the editor) binds to one entry in the app-wide variable store — a single shared, untyped key/value map for the running session (in memory only, not persisted across reloads). `name` selects the variable; the `value` output reads it, and the `value` *input* writes it: sending a value in stores it under the current name for every other Variable node to see. When the variable is written anywhere else in the app, `changed` fires and the `value` output updates automatically. Connecting the `fetch` signal input changes this to pull mode: external changes and name changes no longer propagate on their own, and the node only re-reads when `fetch` fires, after which `fetched` fires. This is the shared counterpart of the per-instance Boolean/Number/String/Color holders, which each keep a private value.

## When to use it

Use it for state shared across components — the logged-in user's name, a selected id, a UI mode — reading it where needed and writing via its `value` input or, for explicit signal-driven writes with type control, a Set Variable node. For a value used only inside one component prefer a per-instance holder (Boolean/Number/String/Color); for structured data use Model2.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Variable2` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | String (VariableName id) | — | Which app-wide variable this node reads and writes |
| `runOnChange-name` | Boolean | `true` | Whether a new value on Name re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `runOnChange-variable` | Boolean | `true` | Whether a new value on Variable changes re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `value` | * | — | Stores this value in the named variable as soon as it arrives; refused, loudly, when Name is empty |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `fetch` | Signal | — | Re-reads the variable named by Name and refreshes Value. This is additional to Name rebinding on change and to changes being announced; untick either under Run On Value Change to stop it |

### What each input does

**Name** (`name`)

- with Name ticked under Run On Value Change: bound to that variable now, Value with it → Fetched
- with it unticked: Name changes, Value waits for Fetch → Fetched stays silent

**Fetch** (`fetch`)

- always: bound to the variable Name names, Value with it → Fetched, Done

**Value** (`value`)

- always: written to the variable at the end of the frame — Changed if that moved it and Variable changes is ticked under Run On Value Change; Error and Failure when Name is empty

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | String | — | The variable name this node is currently bound to |
| `value` | * | — | Current contents of the named variable, or empty until something writes it |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires when the named variable is written from anywhere in the app |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when a Fetch finished and Value is up to date |
| `fetched` | Signal | — | Fires once Fetch has rebound this node and Value is up to date |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last write was refused, in one sentence; empty until something fails |
| `failure` | Signal | — | Fires when a value arrived but could not be stored because no Name is set. This belongs to the Value input rather than to Fetch, so it reports no outcome and does not fire Completed |

## Patterns

- Set Variable writes on a user action; Variable2 nodes with the same name anywhere in the app update reactively — the idiomatic shared-state shape.
- `value` output → an Expression → visual inputs: derive display text or booleans from shared state where it is consumed.

## Watch out for

- Expecting each Variable2 instance to hold its own value — the name is the identity, all instances with one name share one value. For private per-node state use Boolean/Number/String/Color.
- Using variables as persistent storage — the store is in-memory and resets on page reload. A value one person keeps on their own device (a best score, a setting) needs no backend: a Function saves it with `localStorage.setItem` and reads it back at load. A backend is for data shared between people or devices.

## Examples

**Share a value between components with Set Variable and Variable**

The idiomatic shared-state shape, contrasting per-instance and app-wide storage. In the form component, a String node snapshots the text field: because its saveValue (Set) is connected, keystrokes only latch a pending value, and the Button click commits it. The String's stored signal then fires the Set Variable's do, writing the committed text into the app-wide variable 'userName' (setWith 'string' types the dynamic value input). In a completely separate component, a Variable2 node bound to the same name reads the value reactively — its changed/value update the greeting automatically whenever the variable is written, with no connection between the two components.

## Related nodes

[Set Variable](./set-variable.md), [Object](./model2.md), [Boolean](../variables/boolean.md), [Number](../variables/number.md), [String](../variables/string.md), [Color](../variables/color.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "storeScheduled": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Name (`runOnChange-name`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |
| Variable changes (`runOnChange-variable`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Fetch is triggered, the node reports exactly one of **Done**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/variable2.ts"
/**
 * Variable (catalog type `Variable2`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/variablenode2.ts` on 2026-10-01 (NSP-012).
 * Not the typed Variables of NSP-011 (variablebase.ts): this is the app-wide, name-keyed one.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: every app-wide variable is ONE KEY of ONE shared record, the
 * one named `--ndl--global-variables` (:83) — which is why a Set Variable anywhere reaches every
 * Variable node reading that name, and why two Variable nodes with one name are one value. The
 * node binds that record at creation and listens to it for life (:83-84). `Name` chooses the key:
 * with the `Name` checkbox on, every write of it rebinds — `Name` and `Value` are sent and
 * `Fetched` fires, whether or not the name changed (:174-180, :252-257; no DEF-046 compare here);
 * with it off only `Name` is sent (:176-179). `Fetch` re-reads the same way and reports `done` at
 * once (:187-194 — one token, settled in the same call, `Fetched` before the outcome). `Value`
 * STORES at the frame end, once per frame (:201-204, :214-250): with no name (`undefined`, `null`
 * or `''`) it REFUSES — `Error` carries the sentence and `Failure` pulses, a plain signal and not
 * an outcome, since a value arriving is nobody's invocation (:241-247, :135-141); with a name it
 * writes the key on the shared record (:249), which notifies this node like any other: `Changed`
 * pulses and `Value` is re-sent when the key written is this node's name and the `Variable
 * changes` checkbox is on (:62-68). A write that does not change the key notifies nothing
 * (model.ts :381 — a Set Variable's write does, by `forceChange`). `Value` reads the key, or
 * nothing while the name is falsy (:156-161).
 */

import type { ChangeEvent } from '../spec';
import { defineNode } from '../spec';
import { emptyId, errorOutput, runOnChange } from './data-base';

/** :19-22, :83 — the one record every Variable in a project is a key of. */
export const GLOBAL_VARIABLES = '--ndl--global-variables';

/** :40-41, :242-245 */
export const NO_NAME_MESSAGE = 'No variable name is set — the value was not stored anywhere a Variable node can read';

export const Variable2 = defineNode({
  type: 'Variable2',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/variablenode2.ts',
  needs: ['registry'],

  // :24-33 — `name`, `value` (pending the store), `lastError`; `hasScheduledStore`
  state: { name: undefined as unknown, value: undefined as unknown, lastError: undefined as string | undefined, storeScheduled: false },
  // :83-84 — bind the shared record and listen to it, at creation
  init: (w) => {
    w.registry.model(GLOBAL_VARIABLES);
    w.watch({ model: GLOBAL_VARIABLES });
    return {};
  },
  outcomes: ['done'], // :132-134 — Fetch cannot fail; the `failure` output is the Value setter's, a plain signal

  inputs: {
    // :165-181
    name: {
      type: 'string',
      coerce: 'none',
      displayName: 'Name',
      group: 'General',
      description: 'Which app-wide variable this node reads and writes',
      examples: ['x', 'y', 'count']
    },
    // :182-195
    fetch: {
      type: 'signal',
      outcome: true,
      displayName: 'Fetch',
      group: 'Actions',
      description:
        'Re-reads the variable named by Name and refreshes Value. This is additional to Name rebinding on change and to changes being announced; untick either under Run On Value Change to stop it'
    },
    // :196-205
    value: {
      type: '*',
      coerce: 'none',
      displayName: 'Value',
      group: 'General',
      description: 'Stores this value in the named variable as soon as it arrives; refused, loudly, when Name is empty'
    },
    // :54-58 runOnValueChange: inputs ['name'], sources [variable]
    'runOnChange-name': runOnChange('Name'),
    'runOnChange-variable': runOnChange('Variable changes')
  },

  outputs: {
    // :97-105
    name: { type: 'string', displayName: 'Name', group: 'General', description: 'The variable name this node is currently bound to', from: (s) => s.name },
    // :106-111
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the named variable is written from anywhere in the app' },
    // :112-117
    fetched: { type: 'signal', displayName: 'Fetched', group: 'Events', description: 'Fires once Fetch has rebound this node and Value is up to date' },
    // :135-141 — the Value setter's, not an outcome
    failure: {
      type: 'signal',
      displayName: 'Failure',
      group: 'Events',
      description:
        'Fires when a value arrived but could not be stored because no Name is set. This belongs to the Value input rather than to Fetch, so it reports no outcome and does not fire Completed'
    },
    // :142-150
    error: errorOutput('Why the last write was refused, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError),
    // :151-162 — nothing while the name is falsy
    value: {
      type: '*',
      displayName: 'Value',
      group: 'General',
      description: 'Current contents of the named variable, or empty until something writes it',
      // the name as sent is the key — a number keys the record as a plain object does (`data[7]`)
      from: (s, w) => (!s.name ? undefined : w.registry.model(GLOBAL_VARIABLES).get(s.name as string))
    }
  }
}).on(
  {
    // :174-180 — the checkbox alone decides (`shouldRunOnValueChange`, no compare)
    name: (_s, v, i) =>
      i['runOnChange-name']
        ? { says: 'with Name ticked under Run On Value Change: bound to that variable now, Value with it', set: { name: v }, send: ['name', 'value'], emit: ['fetched'] }
        : { says: 'with it unticked: Name changes, Value waits for Fetch', set: { name: v }, send: ['name'] },
    // :187-194 — setVariableName(name) then done, in the same call
    fetch: () => ({ says: 'always: bound to the variable Name names, Value with it', send: ['name', 'value'], emit: ['fetched'], outcome: 'done' }),
    // :201-204 — stored, the write scheduled once per frame
    value: (_s, v) => ({
      says: 'always: written to the variable at the end of the frame — Changed if that moved it and Variable changes is ticked under Run On Value Change; Error and Failure when Name is empty',
      set: { value: v, storeScheduled: true },
      send: []
    })
  },
  {
    // :214-250 — 'nothing due' and 'stored' return one shape (the flag cleared): neither shows on
    // the wire, and a suite that cannot tell them apart is not asked to
    afterInputs: (s, i, w) => {
      if (!s.storeScheduled) return { set: { storeScheduled: false }, send: [] };
      if (emptyId(s.name)) {
        // :241-247 reportFailure → :208-213: Error, the error channel, Failure
        return { set: { storeScheduled: false, lastError: NO_NAME_MESSAGE }, send: ['error'], emit: ['failure'] };
      }
      // :249 — the name as sent: the notification carries it as is, and :64 compares with `===`.
      // A write that moves the key notifies this node's own listener inside the write (:62-68):
      // the announcement sits here, beside the write
      const globals = w.registry.model(GLOBAL_VARIABLES);
      const moved = globals.get(s.name as string) !== s.value;
      globals.set(s.name as string, s.value);
      if (moved && i['runOnChange-variable']) return { set: { storeScheduled: false }, send: ['value'], emit: ['changed'] };
      return { set: { storeScheduled: false }, send: [] };
    },
    world: {
      // :62-68 — any key of the shared record, written by ANOTHER node; only this node's name is its business
      change: (s, i, e: ChangeEvent) =>
        e.kind === 'model' && i['runOnChange-variable'] && e.name === s.name ? { emit: ['changed'], send: ['value'] } : { send: [] }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
