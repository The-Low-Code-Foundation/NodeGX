import json, os, sys
root = sys.argv[1]
T = "2026-10-15T21:30:00.000Z"
ids = {"App": "5e4d0000-0000-4000-8000-000000000002", "Home": "5e4d0000-0000-4000-8000-000000000003", "Rename": "5e4d0000-0000-4000-8000-000000000006"}
ROUTER = "5e4d0000-0000-4000-8000-000000000004"
PAGE = "5e4d0000-0000-4000-8000-000000000005"
def w(rel, obj):
    p = os.path.join(root, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w").write(json.dumps(obj, indent=2) + "\n")
def conn(f, fp, t, tp): return {"fromId": f, "fromProperty": fp, "toId": t, "toProperty": tp}
w("nodegx.project.json", {
  "$schema": "https://opennoodl.dev/schemas/project-v2.json", "name": "Record Desk", "id": "5e4d0000-0000-4000-8000-000000000001",
  "version": "4", "nodegxVersion": "0.1.0", "runtimeVersion": "react19", "created": T, "modified": T,
  "settings": {"htmlTitle": "Record Desk", "navigationPathType": "path"},
  "structure": {"componentsDir": "components", "assetsDir": "assets"},
  "metadata": {
    "cloudservices": {"instanceId": "backend_recorddesk", "endpoint": "http://localhost:8581", "appId": "backend_recorddesk", "type": "nodegx"},
    "dbCollections": [{"name": "Page", "columns": [{"name": "title", "type": "String"}], "createdAt": None}]},
  "rootNodeId": ROUTER})
w("components/App/component.json", {"$schema": "https://opennoodl.dev/schemas/component-v2.json", "id": ids["App"], "name": "App", "path": "/App", "type": "root", "modified": T})
w("components/App/nodes.json", {"$schema": "https://opennoodl.dev/schemas/nodes-v2.json", "componentId": ids["App"], "version": 1,
  "nodes": [{"id": ROUTER, "type": "Router", "label": "Main Router", "parameters": {"name": "Main", "pages": {"startPage": "/Pages/Home", "routes": ["/Pages/Home"]}}}],
  "visualRoots": [ROUTER]})
w("components/App/connections.json", {"$schema": "https://opennoodl.dev/schemas/connections-v2.json", "componentId": ids["App"], "version": 1, "connections": []})

home_nodes = [
  {"id": PAGE, "type": "Page", "label": "Home", "parameters": {"title": "Record Desk", "urlPath": "home"}, "children": ["shell"], "x": 40, "y": 40},
  {"id": "shell", "type": "Group", "label": "Desk", "parent": PAGE, "parameters": {"flexDirection": "column", "alignItems": "flex-start", "rowGap": "var(--space-4)", "paddingLeft": "var(--space-6)", "paddingTop": "var(--space-6)"},
   "children": ["heading", "pageIdInput", "loadBtn", "shownTitle", "frozenTitle", "rename"], "x": 100, "y": 140},
  {"id": "heading", "type": "Text", "label": "Heading", "parent": "shell", "parameters": {"text": "Record Desk", "fontSize": "var(--text-3xl)", "fontWeight": "var(--font-semibold)"}, "x": 100, "y": 220},
  {"id": "pageIdInput", "type": "net.noodl.controls.textinput", "label": "Page id", "parent": "shell", "parameters": {"placeholder": "a page id"}, "x": 100, "y": 300},
  {"id": "loadBtn", "type": "net.noodl.controls.button", "label": "Load", "parent": "shell", "parameters": {"label": "Load"}, "x": 100, "y": 340},
  {"id": "shownTitle", "type": "Text", "label": "Shown title", "parent": "shell", "parameters": {"text": ""}, "x": 100, "y": 380},
  {"id": "frozenTitle", "type": "Text", "label": "Frozen title", "parent": "shell", "parameters": {"text": ""}, "x": 100, "y": 440},
  {"id": "rename", "type": "/Components/Rename", "label": "Rename", "parent": "shell", "parameters": {}, "x": 100, "y": 520},
  {"id": "pageIdVar", "type": "Variable2", "label": "Page id variable", "parameters": {"name": "pageId"}, "x": 600, "y": 300},
  # Fetch wired to Load, the documented record-detail flow. With Fetch wired an unstated box is settled unticked
  # (NDA-017's migration, as the editor settles it), so "Record properties" is ticked here by hand: live.
  {"id": "shownRec", "type": "DbModel2", "label": "Shown page", "parameters": {"collectionName": "Page", "idSource": "explicit", "runOnChange-record": True}, "x": 600, "y": 380},
  # The control: the same read with "Record properties" unticked keeps what it read.
  {"id": "frozenRec", "type": "DbModel2", "label": "Frozen page", "parameters": {"collectionName": "Page", "idSource": "explicit", "runOnChange-record": False}, "x": 600, "y": 440},
]
home_conns = [
  conn("pageIdInput", "onTextChanged", "pageIdVar", "value"),
  conn("pageIdVar", "value", "shownRec", "modelId"),
  conn("pageIdVar", "value", "frozenRec", "modelId"),
  conn("loadBtn", "onClick", "shownRec", "fetch"),
  conn("loadBtn", "onClick", "frozenRec", "fetch"),
  conn("shownRec", "prop-title", "shownTitle", "text"),
  conn("frozenRec", "prop-title", "frozenTitle", "text"),
]
w("components/Pages/Home/component.json", {"$schema": "https://opennoodl.dev/schemas/component-v2.json", "id": ids["Home"], "name": "Home", "path": "/Pages/Home", "type": "page", "modified": T,
  "description": "P18-S111-RECORDLIVE fixture: a Record shows a page by Id; a form in another component renames it."})
w("components/Pages/Home/nodes.json", {"$schema": "https://opennoodl.dev/schemas/nodes-v2.json", "componentId": ids["Home"], "version": 1, "nodes": home_nodes, "visualRoots": [PAGE]})
w("components/Pages/Home/connections.json", {"$schema": "https://opennoodl.dev/schemas/connections-v2.json", "componentId": ids["Home"], "version": 1, "connections": home_conns})

rn_nodes = [
  {"id": "renameGroup", "type": "Group", "label": "Rename", "children": ["titleInput", "saveBtn", "renameError"], "parameters": {"flexDirection": "row", "columnGap": "var(--space-2)", "alignItems": "center"}, "x": 40, "y": 40},
  {"id": "titleInput", "type": "net.noodl.controls.textinput", "label": "New title", "parent": "renameGroup", "parameters": {"placeholder": "a new title"}, "x": 100, "y": 120},
  {"id": "saveBtn", "type": "net.noodl.controls.button", "label": "Save", "parent": "renameGroup", "parameters": {"label": "Save"}, "x": 100, "y": 200},
  {"id": "renameError", "type": "Text", "label": "Rename error", "parent": "renameGroup", "parameters": {"text": "", "color": "var(--destructive)"}, "x": 100, "y": 280},
  {"id": "renameIdVar", "type": "Variable2", "label": "Page id", "parameters": {"name": "pageId"}, "x": 500, "y": 120},
  {"id": "renameRec", "type": "SetDbModelProperties", "label": "Rename page", "parameters": {"collectionName": "Page"},
   "dynamicports": [{"name": "prop-title", "displayName": "title", "type": {"name": "string"}, "plug": "input", "group": "Properties", "index": 13}], "x": 500, "y": 200},
]
rn_conns = [
  conn("renameIdVar", "value", "renameRec", "modelId"),
  conn("titleInput", "onTextChanged", "renameRec", "prop-title"),
  conn("saveBtn", "onClick", "renameRec", "store"),
  conn("renameRec", "error", "renameError", "text"),
]
w("components/Components/Rename/component.json", {"$schema": "https://opennoodl.dev/schemas/component-v2.json", "id": ids["Rename"], "name": "Rename", "path": "/Components/Rename", "type": "visual", "modified": T,
  "description": "Elsewhere in the app: a form that writes the record the page shows."})
w("components/Components/Rename/nodes.json", {"$schema": "https://opennoodl.dev/schemas/nodes-v2.json", "componentId": ids["Rename"], "version": 1, "nodes": rn_nodes, "visualRoots": ["renameGroup"]})
w("components/Components/Rename/connections.json", {"$schema": "https://opennoodl.dev/schemas/connections-v2.json", "componentId": ids["Rename"], "version": 1, "connections": rn_conns})
reg = lambda path, typ, n, c: {"path": path, "type": typ, "nodeCount": n, "connectionCount": c, "created": T, "modified": T}
w("components/_registry.json", {"$schema": "https://opennoodl.dev/schemas/registry-v2.json", "version": 1, "lastUpdated": T,
  "components": {"App": reg("App", "root", 1, 0), "Components/Rename": reg("Components/Rename", "visual", len(rn_nodes), len(rn_conns)), "Pages/Home": reg("Pages/Home", "page", len(home_nodes), len(home_conns))},
  "stats": {"totalComponents": 3, "totalNodes": 1 + len(rn_nodes) + len(home_nodes), "totalConnections": len(rn_conns) + len(home_conns)}})
