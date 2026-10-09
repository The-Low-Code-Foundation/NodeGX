# The v2 project format

**Status:** canonical. Written 2026-10-09 (P112 OWN-001), when the format moved out of the editor into
`@nodegx/project-contract/format`. The schemas in `packages/nodegx-project-contract/schemas/` are the authority; this page
explains them. `packages/nodegx-project-contract/tests/format-doc.test.ts` validates every example below against them,
checks each example against the template file it was copied from, and fails when a schema gains a required field this
page does not name.

## The one sentence

**A NodeGX project is a folder of JSON files: a project file, a registry of components, and one folder per component
holding its nodes and the wires between them.**

## The folder

```
my-app/
  nodegx.project.json          the project: name, version, settings
  nodegx.routes.json           optional: URL routes
  nodegx.styles.json           optional: colours, text styles, variants, tokens
  components/
    _registry.json             every component: where its folder is, its type, its counts
    Week/
      Spark bar/
        component.json         the component: id, name, type, legacy path
        nodes.json             its nodes
        connections.json       its wires
```

A component's folder is its registry key: `Week/Spark bar`. A component placed inside another is a node whose `type` is
the component's **legacy name**, the same path with a leading slash: `/Week/Spark bar`. `component.json` keeps that name
in `path`.

## The files

| file | schema | required |
|---|---|---|
| `nodegx.project.json` | `project-v2.schema.json` | `name`, `version`, `nodegxVersion` |
| `components/_registry.json` | `registry.schema.json` | `version`, `components` |
| `component.json` | `component.schema.json` | `id`, `name`, `type` |
| `nodes.json` | `nodes.schema.json` | `componentId`, `nodes` |
| `connections.json` | `connections.schema.json` | `componentId`, `connections` |
| `nodegx.routes.json` | `routes.schema.json` | `routes` |
| `nodegx.styles.json` | `styles.schema.json` | nothing; every field is optional |

Each file's `$schema` names `https://opennoodl.dev/schemas/<name>-v2.json`. Those URLs are identifiers: the validator
registers the schemas under them and never fetches them.

## One component, whole

`Week/Spark bar` from `templates/planning`: one month's bar in a sparkline. It takes two values from whoever places it
and wires them into a Group.

<!-- example: templates/planning/components/Week/Spark bar/component.json -->
```json
{
  "$schema": "https://opennoodl.dev/schemas/component-v2.json",
  "id": "5f11333d-487d-56c9-81eb-76f40fe64ad1",
  "name": "Spark bar",
  "path": "/Week/Spark bar",
  "type": "visual",
  "created": "2026-09-20T00:00:00.000Z",
  "modified": "2026-09-20T00:00:00.000Z",
  "modifiedBy": "noodl-mcp",
  "description": "One month’s bar in a project’s sparkline."
}
```

<!-- example: templates/planning/components/Week/Spark bar/nodes.json -->
```json
{
  "$schema": "https://opennoodl.dev/schemas/nodes-v2.json",
  "componentId": "5f11333d-487d-56c9-81eb-76f40fe64ad1",
  "version": 1,
  "nodes": [
    {
      "id": "sbIn",
      "type": "Component Inputs",
      "label": "The month",
      "ports": [
        {
          "name": "height",
          "plug": "output",
          "type": "*"
        },
        {
          "name": "mark",
          "plug": "output",
          "type": "string"
        }
      ],
      "x": 290,
      "y": 40
    },
    {
      "id": "sbBar",
      "type": "Group",
      "label": "The bar",
      "parameters": {
        "sizeMode": "explicit",
        "width": {
          "value": 100,
          "unit": "%"
        },
        "borderRadius": "var(--radius-sm)"
      },
      "x": 40,
      "y": 40
    }
  ],
  "visualRoots": [
    "sbBar"
  ]
}
```

<!-- example: templates/planning/components/Week/Spark bar/connections.json -->
```json
{
  "$schema": "https://opennoodl.dev/schemas/connections-v2.json",
  "componentId": "5f11333d-487d-56c9-81eb-76f40fe64ad1",
  "version": 1,
  "connections": [
    {
      "fromId": "sbIn",
      "fromProperty": "height",
      "toId": "sbBar",
      "toProperty": "height"
    },
    {
      "fromId": "sbIn",
      "fromProperty": "mark",
      "toId": "sbBar",
      "toProperty": "backgroundColor"
    }
  ]
}
```

What to read in it:

- **A node** is `{ id, type, label, parameters, x, y }`, plus `ports` on a node that declares its own instance ports
  (Component Inputs and Component Outputs, for two). `children` lists child node ids in the visual tree; `visualRoots` lists the
  visual nodes at the top of the component.
- **A component's interface is its `Component Inputs` node.** Each port with `plug: "output"` is a value an instance
  receives. A component without one renders the same wherever it is placed.
- **A wire** is `{ fromId, fromProperty, toId, toProperty }`: from one node's output port to another node's input port.
- **A parameter can name a design token**: `"var(--radius-sm)"`. Tokens are CSS custom properties; a project's own values
  live in `nodegx.styles.json` under `tokens`.
- **x and y are layout only.** Two editors may place the same nodes differently; nothing else may differ.

## The registry entry

The registry says where each component's folder is and keeps counts the official writers maintain:

```json
"Week/Spark bar": {
  "path": "Week/Spark bar",
  "type": "visual",
  "nodeCount": 2,
  "connectionCount": 2,
  "modified": "2026-09-20T00:00:00.000Z",
  "created": "2026-09-20T00:00:00.000Z"
}
```

`stats` (`totalComponents`, `totalNodes`, `totalConnections`) and `lastUpdated` are recomputed on every write.

## Reading and writing it from code

```ts
import { V2ProjectStore, memoryFiles, SchemaValidator, SCHEMA_IDS } from '@nodegx/project-contract/format';
import { diskFiles } from '@nodegx/project-contract/format-node'; // Node only

const store = new V2ProjectStore(memoryFiles(filesByPath)); // or diskFiles('/path/to/my-app')
const bar = store.readComponent('Week/Spark bar');           // snapshots the three files
bar.files.nodes.nodes.push(newNode);
SchemaValidator.instance.validate(SCHEMA_IDS.NODES, bar.files.nodes);
store.writeComponent(bar.key, bar.files, { ifRevision: bar.revision });
```

The store carries the MCP server's rules:

- **It refuses a write after a change it did not read.** Reading snapshots each file's stamp (on disk: modification time
  and size; in memory: the content hash). A write first checks them, and checks `ifRevision` when given. Re-read and
  retry on `FormatRefusal` with `code: 'conflict'`.
- **It writes nothing that would not change.** A component equal to what is stored, apart from `modified` and
  `modifiedBy`, writes no file.
- **It keeps the registry true** on every write and delete.
- **It writes two-space JSON**, and keeps a replaced file's final newline when it had one.

The `format` entry has no `fs`, `path` or Node `crypto`; a page bundles it (about 150 KB minified, most of it the schema
validator). The structural validator checks shape only. The semantic validator, which knows every node type's ports, is
the editor's (`packages/noodl-editor/src/editor/src/validation/`).

## Two shapes, one project

This page is the shape the editor and the MCP read and write. The runtime reads a **deployed** shape made from it at
export, in which a wire is `{ sourceId, sourcePort, targetId, targetPort }` and `children` are nested node objects rather
than ids (`packages/noodl-runtime/src/nodescope.ts`). An editor writes the shape on this page, never the deployed one.
