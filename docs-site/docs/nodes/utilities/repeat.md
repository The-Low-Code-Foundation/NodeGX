---
title: "Repeat"
---
Repeat: fires a Tick signal every Interval milliseconds between Start and Stop, and counts the ticks.

Repeat turns one Start into a steady beat. After `start` (Start) the first `tick` (Tick) fires one `interval` (Interval, milliseconds, default 1000) later, then once every Interval until `stop` (Stop). `count` (Count) is how many ticks have fired since the last Start; Stop keeps it, the next Start resets it to 0. A Start while already running reports Unchanged and does not start a second beat. The beat does not drift, and ticks missed while the browser tab was in the background are skipped rather than fired in a burst. Repeat stops by itself when its page or component is left, and it never ticks during a server render. A Start whose Interval is not a number above zero reports Failure with the reason.

## When to use it

Use it for anything that happens on its own at a steady pace: a clock, a countdown, a slideshow that advances, polling for new data, an autosave, a number that counts up. For one later signal use Delay (Timer) instead; to animate a value smoothly use Animate To Value.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `Repeat` |
| Available in | browser |
| SSR compatibility | client-only — Does nothing during a server render: it never ticks there and Count reads empty. It starts in the browser after hydration. |
| Provided by | `noodl-viewer-react` |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `interval` | Number | `1000` | Time between ticks, in milliseconds. A change takes effect from the next tick. Must be above zero |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `start` | Signal | — | Starts ticking from a Count of 0: the first Tick fires one Interval later. Fires Unchanged while already running |
| `stop` | Signal | — | Stops ticking. Count keeps its value until the next Start |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many times Tick has fired since the last Start |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when Start began ticking or Stop stopped it |
| `tick` | Signal | — | Fires once every Interval while running |
| `unchanged` | Signal | — | Fires on a Start while already running, or a Stop with nothing running |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires on a Start whose Interval is not a number of milliseconds above zero |

## Patterns

- A Group's Did Mount → `start`, `tick` → Counter's Increase Count, the Counter's value into a Text: a number that goes up once a second, with no script.
- `count` into an Expression `10 - count` for the Text, and a second Expression `count >= 10` into a Condition whose On True → `stop`: a ten-second countdown that stops itself.

## Watch out for

- Looping a Delay's `timerFinished` into its own `restart` for a repeating tick — Repeat is that loop as one node, without drift.
- A `setInterval` inside a Function node — invisible on the canvas, and nothing stops it when the page is left.
- Treating `interval` as seconds — it is milliseconds.

## Examples

**Stopwatch: a number that goes up once a second, with no script**

A Repeat node is the beat. The root Group's Did Mount starts it, so the count begins when the part appears, and it stops by itself when the part is removed or its page is left. Start and Stop buttons drive the same node: a Start while it is already running reports Unchanged and does not start a second beat, and a Start after Stop begins again from 0. Count, the number of ticks since the last Start, goes through a String Format into the readout. Nothing here is JavaScript, and every moving part is on the canvas.

## Related nodes

[Delay](./timer.md), [Counter](../math/counter.md), [Animate To Value](../animation/net-noodl-animatetovalue.md)


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
