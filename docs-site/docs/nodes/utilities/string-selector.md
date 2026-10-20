---
title: "Index To String"
---
:::warning Deprecated
This node is deprecated and kept only so existing projects keep working. It is not offered in the node picker for new use.
:::

Deprecated 'Index To String' lookup: outputs one of a numbered list of author-defined strings selected by a number index.

String Selector (shown as 'Index To String') holds a numbered series of author-entered strings and outputs the one at the current `index` on `currentValue`, firing `indexChanged` when the index changes. It is deprecated; a States node (mapping each state to arbitrary values) or an Expression covers the same need with more flexibility.

## When to use it

Do not use in new graphs — use States or an Expression instead.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `String Selector` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | not written yet |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `index` | Number | `0` | Which of the numbered strings to publish, counting from zero and truncated to a whole number |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `currentValue` | String | — | The numbered string sitting at Index, or nothing when there is none |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `indexChanged` | Signal | — | Fires when Index changes, after Current Value has been updated |

## Dynamic ports

_This node's port list changes at runtime (numbered-inputs); the tables above may be incomplete for a given instance._

Accepts an unbounded numbered series of inputs (see numberedInputs); ports are named "&lt;base> &lt;N>" counting from 0.

## Ports at runtime

Inputs are a numbered series: ports named 'input 0', 'input 1', … (displayed 'String for N') are added by the editor as each is used; there is no static bound on the count.

## Code export

Does not export to React yet. A project that uses it exports with this node named in the export report.

Why: deliberately out of scope — the type is deprecated in the catalog, so nobody building today is offered one. A project that still holds one exports it as a named deferral, which is the right answer for a node its own editor has retired.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
