---
title: "Object"
---
:::warning Deprecated
This node is deprecated and kept only so existing projects keep working. It is not offered in the node picker for new use.
:::

Deprecated all-in-one shared object node. Use Model2 (Object) plus NewModel and SetModelProperties.

The legacy Model node combined reading, creating and storing a shared client-side object in one node. Its successors split the roles: Object (Model2) reads reactively by id, New Object creates, Set Object Properties writes. The object store is shared, so legacy graphs and new nodes see the same objects by id.

## When to use it

Do not use in new graphs — use Model2 with NewModel/SetModelProperties instead.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Model` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | not written yet |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `modelId` | String (ModelName id) | — | — |
| `properties` | Stringlist | — | — |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `clear` | Signal | — | — |
| `fetch` | Signal | — | — |
| `new` | Signal | — | — |
| `store` | Signal | — | — |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | — |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | — |
| `created` | Signal | — | — |
| `fetched` | Signal | — | — |
| `stored` | Signal | — | — |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Some ports are discovered at runtime from user code, parameters or connected components, and are pushed to the editor per instance; the static port list below is incomplete for such instances.

## Ports at runtime

Property ports are generated from the per-instance `properties` list (runtime-discovered), as on its successors.

## Related nodes

[Object](./model2.md), [Create New Object](./new-model.md), [Set Object Properties](./set-model-properties.md)

## Code export

Does not export to React yet. A project that uses it exports with this node named in the export report.

Why: deliberately out of scope — the type is deprecated in the catalog, so nobody building today is offered one. A project that still holds one exports it as a named deferral, which is the right answer for a node its own editor has retired.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
