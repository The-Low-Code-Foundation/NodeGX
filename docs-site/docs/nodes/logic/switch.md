---
title: "Switch"
---
A remembered on/off boolean, driven by On / Off / Flip signals — the graph's toggle and one-bit memory.

Switch stores a single boolean state. The `on` (On), `off` (Off) and `flip` (Flip) signal inputs change it; `onFromStart` (State) is a boolean value input that sets the state directly and provides its initial value (default false). The current state is always readable on the `state` (Current State) boolean value output, and every state change also fires signals: `switched` (Switched) on any change, plus `switchedToOn` or `switchedToOff` matching the new state. `on` and `off` are ignored when the state already matches, so they never re-fire the signals; `flip` always changes state.

## When to use it

The idiomatic node for anything a user toggles: expand/collapse, mute, edit mode. Use `state` (a level) to drive `visible`/`enabled`-style inputs, and the switched signals only when something must happen at the moment of change. For more than two states use States; for deriving a boolean from data rather than events, use Condition or Expression.

## At a glance

| | |
|---|---|
| Category | Logic |
| Type name | `Switch` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `onFromStart` | Boolean | `false` | State to start in, and setting it announces a switch on Switched even though nothing switched |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `flip` | Signal | — | Switches to whichever state it is not currently in |
| `off` | Signal | — | Switches off, or fires Unchanged if it is already off |
| `on` | Signal | — | Switches on, or fires Unchanged if it is already on |

### What each input does

**On** (`on`)

- already on → Unchanged; Switched To On, Switched stay silent
- while off: it switches on → Switched To On, Switched, Done

**Off** (`off`)

- while on: it switches off → Switched To Off, Switched, Done
- already off → Unchanged; Switched To Off, Switched stay silent

**Flip** (`flip`)

- while on: it switches off → Switched To Off, Switched, Done; Switched To On stays silent
- while off: it switches on → Switched To On, Switched, Done; Switched To Off stays silent

**State** (`onFromStart`)

- true: the switch is on, announced even if it already was → Switched To On, Switched; Switched To Off stays silent
- false: the switch is off, announced even if it already was → Switched To Off, Switched; Switched To On stays silent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `state` | Boolean | — | True while the switch is on — wire it into a mounted or visible port for a gate that turns on AND off |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when the switch actually changed state |
| `switched` | Signal | — | Fires on every state change, alongside whichever of Switched To On and Switched To Off applies |
| `switchedToOff` | Signal | — | Fires when the switch becomes off |
| `switchedToOn` | Signal | — | Fires when the switch becomes on |
| `unchanged` | Signal | — | Fires when it was already in that state, so none of the Switched signals fired |

## Patterns

- Button `onClick` → `flip`, `state` → a Group's `visible`: the standard show/hide toggle.
- `state` → Boolean To String `input` → the toggling button's `label`: the button describes what it will do next.

## Watch out for

- Wiring `switchedToOn` (a momentary signal) to a boolean input like `visible` — it delivers only a pulse; use `state` for anything that must stay on.

## Examples

**Toggle a details panel with a self-labelling button**

The standard show/hide toggle: one button flips a Switch, and everything else derives from the Switch's boolean `state` as levels — the details Group's visibility directly, the summary text's visibility through an Inverter (visible only while collapsed), and the button's own label through Boolean To String so the button always names what it will do next. Note the split of flow kinds: `onClick` → `flip` is a signal (momentary), while every `state`-derived wire is a value that holds its level.

**Record audio in the browser and save it**

The full arc of a MediaRecorder capture, which is longer than it looks because three different things have to be true before a single byte is recorded. A `JavaScriptFunction` asks for microphone permission and a `Switch` gates everything on the answer; a `Javascript2` node owns the recorder itself and accumulates chunks; a second one runs the seconds counter; a third converts the finished `Blob` into the shape `NewDbModelProperties` can store. ⚠️ Permission is asynchronous and revocable, which is why the gate is a node and not an assumption — a recorder started before the user has answered produces silence rather than an error. The preview player is a Custom HTML node because an `<audio>` element with a blob URL is the shortest honest way to play back something that has no file yet.

**Blink a button, and stop cleanly**

A strobe is a good miniature of a hard problem: something that keeps running after the signal that started it, and therefore has to be stopped by something other than the thing that started it. A `Javascript2` node owns the interval, a `Switch` turns it on and off, a `States` node carries the two appearances, and a `Number` makes the period an input instead of a literal. ⚠️ The half people leave out is the reset — stopping an interval without restoring the state leaves the button frozen in whichever half of the blink it happened to be in, which looks like a different bug entirely. This one restores it.

## Related nodes

[Condition](./condition.md), [States](../animation/states.md), [Inverter](./inverter.md), [Boolean To String](../utilities/boolean-to-string.md), [Value Changed](./value-changed.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "on": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| State (`onFromStart`) | `js-boolean` | any truthy value is `true`, anything else `false` |

### How actions report back

Each time On, Off or Flip is triggered, the node reports exactly one of **Done** or **Unchanged**.

### The code it replaces

What you would write by hand instead:

- a boolean in state that a handler flips: `setOn((on) => !on)`
- separate on / off handlers setting a flag: `const turnOn = () => setOn(true)`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/switch.ts"
/**
 * Switch — read from `packages/noodl-runtime/src/nodes/std-library/switch.ts` on 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where
 * the spec and the runtime disagree, that is a §6 row in NSP-004 and a ruling — not an edit here.
 *
 * Why this node is in the pilot: a latch, special-cased in the exporter's `plan.ts` beside
 * Counter (`isLatchType`). Three signal inputs share one body (:118-129) and one outcome contract.
 */

import { defineNode } from '../spec';

export const Switch = defineNode({
  type: 'Switch',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/switch.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a boolean in state that a handler flips', example: 'setOn((on) => !on)' },
    { says: 'separate on / off handlers setting a flag', example: 'const turnOn = () => setOn(true)' }
  ],

  // initialize (:22-25): state false. `initialized` (:24) is written there and read nowhere else in
  // the file — dead state, not carried.
  state: { on: false },
  // :26-30 — one value entry holding the state
  inspect: (s) => String(s.on),
  // :108-115 outcomeOutputs({ done, unchanged }) — no failure: a switch cannot fail
  outcomes: ['done', 'unchanged'],

  inputs: {
    // :32-39, :40-47, :48-56 — `valueChangedToTrue`, each through `setStateByAction` (:118-129)
    on: {
      type: 'signal',
      outcome: true,
      displayName: 'On',
      group: 'Change State',
      description: 'Switches on, or fires Unchanged if it is already on'
    },
    off: {
      type: 'signal',
      outcome: true,
      displayName: 'Off',
      group: 'Change State',
      description: 'Switches off, or fires Unchanged if it is already off'
    },
    flip: {
      type: 'signal',
      outcome: true,
      displayName: 'Flip',
      group: 'Change State',
      description: 'Switches to whichever state it is not currently in'
    },
    // :58-69 `set: … this._internal.state = !!value`
    onFromStart: {
      type: 'boolean',
      default: false,
      coerce: 'js-boolean',
      displayName: 'State',
      group: 'General',
      description: 'State to start in, and setting it announces a switch on Switched even though nothing switched'
    }
  },

  outputs: {
    // :72-80 getter → `_internal.state`
    state: {
      type: 'boolean',
      from: (s) => s.on,
      displayName: 'Current State',
      group: 'Values',
      description: 'True while the switch is on — wire it into a mounted or visible port for a gate that turns on AND off'
    },
    // :81-98 — `emitSignals` (:130-137) pulses the matching sibling FIRST, then `switched`
    switched: {
      type: 'signal',
      displayName: 'Switched',
      group: 'Events',
      description: 'Fires on every state change, alongside whichever of Switched To On and Switched To Off applies'
    },
    switchedToOn: { type: 'signal', displayName: 'Switched To On', group: 'Events', description: 'Fires when the switch becomes on' },
    switchedToOff: { type: 'signal', displayName: 'Switched To Off', group: 'Events', description: 'Fires when the switch becomes off' }
  }
}).on({
  // :118-129 `setStateByAction(next)`: already there → `unchanged` and nothing else (:120-123,
  // ERG-001 §4's register — the bare `return` that stopped a chain dead); otherwise move,
  // pulse the sibling then `switched` (:125-126, :130-137), then `done` (:128).
  on: (s) =>
    s.on
      ? { says: 'already on', outcome: 'unchanged' }
      : { says: 'while off: it switches on', set: { on: true }, emit: ['switchedToOn', 'switched'], outcome: 'done' },
  off: (s) =>
    s.on
      ? { says: 'while on: it switches off', set: { on: false }, emit: ['switchedToOff', 'switched'], outcome: 'done' }
      : { says: 'already off', outcome: 'unchanged' },
  // :48-56 — Flip cannot no-op: `setStateByAction(!state)` never meets the unchanged guard. Two branches, not one with
  // a ternary pulse: the rules reader reads `emit` literally (NSP-018 s73)
  flip: (s) =>
    s.on
      ? { says: 'while on: it switches off', set: { on: false }, emit: ['switchedToOff', 'switched'], outcome: 'done' }
      : { says: 'while off: it switches on', set: { on: true }, emit: ['switchedToOn', 'switched'], outcome: 'done' },

  // :64-68 — the setter announces EVERY write, including one to the state it already has
  // ("announces a switch on Switched even though nothing switched", :62; NDA-012's Logic row 1).
  // No outcome: a value arriving is not an invocation.
  onFromStart: (_s, v) =>
    v
      ? { says: 'true: the switch is on, announced even if it already was', set: { on: true }, emit: ['switchedToOn', 'switched'] }
      : { says: 'false: the switch is off, announced even if it already was', set: { on: false }, emit: ['switchedToOff', 'switched'] }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
