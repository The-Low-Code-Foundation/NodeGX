# Gate 3 — the picture

Richard asked for a run, not a mock-up, so the picture is the build: four screenshots of Open Bubble on a copy of
Puppy test 3 (a landing page with a puppy grid and an inquiry form, an admin page with CRUD, one collection), taken
headless at 1600×1000 on 2026-10-16. His yes or no is owed on these.

| | |
|---|---|
| ![Design](look/s1-design.png) | **Design.** Palette and reusable components top-left, the page's element tree below; the real app in the middle (the width selector sets the viewport, *Use the app* lets clicks through); the property editor on the right once something is selected. |
| ![Design, selected](look/s1-design-selected.png) | **An element selected.** The blue box with its size tag and three handles; the tree row lit; the property editor shows the Text node's groups in the official editor's order (General, Text, Text Style, Style, Layout …) with the project's tokens as values. The hero lead was dragged above the title a moment earlier. |
| ![Workflow](look/s1-workflow.png) | **Workflow.** Events on the left (*When Submit inquiry button: Click*), the event card and its numbered steps in the middle; each step names the NodeGX node, its literal settings and the values wired into it; *Settings* opens the fields, *+ Add an action* appends a step wired from the one before. |
| ![Data](look/s1-data.png) | **Data.** Types on the left; the selected type's fields (name, type, target type) editable in place and written to the project file; *App data* under it, the rows read from the bound backend, with new entry, inline edit and delete. |

## The mapping, Bubble → NodeGX

| Bubble | NodeGX, as this editor reads and writes it |
|---|---|
| page | a `page` component; its root `Page` node; the Router's `pages.routes` |
| element | a visual node in a parent's `children` (Group, Text, Button, Text Input, Image, …) |
| reusable element | a component placed as a node of type `/Components/<name>` |
| container: Row / Column / Align to parent / Fixed | a Group with `flexDirection` row / column; `position: absolute` |
| property editor | the node's `parameters`, by the runtime library's input ports |
| event ("When Button is clicked") | a signal output of a visual node (`onClick`) with at least one wire |
| action, step 1…n | the logic node a signal wire reaches, then its Done output's wire, and so on |
| "Input Name's value" in an action's field | a value wire from that node's output to the step's input |
| "Only when" | a Condition node in the chain |
| data type, field | `metadata.dbCollections[]` `{ name, columns: [{ name, type }] }` in `nodegx.project.json` |
| App data | the bound backend's `/classes/<type>` (Parse wire) |
| privacy rules | `nodegx.security.json` (not shown yet) |

## §built — the build held to the picture

Gate 4 is `editor/check.mjs`: PASS 17/17 on 2026-10-16 on a fresh copy of `templates/todo-list` with an ephemeral
backend started by the gate; every assertion reads the files on disk, the backend, or the app's own text, never the
editor's claim. README §3 lists each row and its measurement.
