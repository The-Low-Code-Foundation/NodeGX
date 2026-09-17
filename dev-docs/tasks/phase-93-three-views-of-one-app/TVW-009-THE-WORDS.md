# TVW-009 — The words

Proposal §1.1 and §4.6. The teaching layer is three sentences and a table, placed where the question
is asked. Not a tour.

## 1. The person sentence

**Someone who has never seen NodeGX reads, in the first minute and without leaving the editor, that
Components are the parts they have, Layers is what the page in the preview is made of, the canvas is
how one part is made, and the Workbench shows one part on its own — in the row of the table that
matches what they already know.**

## 2. The spec

### 2.1 Five words, everywhere

| word | means | replaces, and where the survivors are |
|---|---|---|
| **Component** | a definition; what the canvas edits | "component" when it meant an instance: the canvas node title (TVW-007 adds the eyebrow), `Create Visual Component` → `New component`, `Create Logic Component` → `New logic component`, `Create Page Component` → `New page` |
| **Instance** | a placed component | "component node" in tooltips, docs, the picker's `Project components` group description |
| **Page** | a component the Router shows, with a route | "page component" |
| **Layers** | the tree of what the page in the preview is made of | (new) |
| **Workbench** | one component running alone | "bench", "isolated component", "sandbox", "in isolation" — TVW-001 swept the surfaces; this task sweeps docs, tooltips, release notes template, the MCP's `guidance` field where it names the preview |

*Home* stays. *Sheet* is gone (TVW-001). *Folder* is a folder.

A ratchet, on the model of the hex ratchet: `scripts/vocabulary-ratchet.js` greps user-visible
strings in `packages/noodl-editor/src` and `packages/noodl-core-ui/src` for the retired words and
holds the count at 0 (test ids, comments and `data-*` excluded by an allowlist the script prints).

### 2.2 Three sentences, in their places

1. Layers, canvas on a logic component (TVW-004's note): *"Format price is logic — it has no screen.
   Watch it run on the Workbench."*
2. Components, first run of a project with ≤ 1 component, above the tree, dismissable once per
   machine: *"Components are the parts you have. Layers shows which of them are on the screen you are
   editing. The canvas is how one part is made."*
3. The Workbench caption (TVW-001's sweep): *"Workbench — Hero on its own, not the app. Sample
   values."*

### 2.3 The rail tooltip

`Project` on the rail: two lines, *"Layers — what the page in the preview is made of, through every
instance. Components — every component in the project, placed or not."*

### 2.4 The table

Proposal §1.1, verbatim, as:
- a docs page `docs/editor/three-views.md` (or wherever the editor docs live — find first), linked from
  the `?` on the trail and from the Components first-run sentence's `Learn more`;
- a step in P73's first tutorial, after the step that opens a project and before the one that adds a
  node — P73 owns the tutorial's shape; this task supplies the step's text and the table.

### 2.5 The MCP

`instructions.ts` (the briefing) says "visual tree down a left column". Add one sentence: *"The editor
draws a structure lane around the visual stack wherever it is; the column is a default, not a
rule."* Nothing else in the MCP changes here; P85's loop owns the doctrine.

## 3. Scope

In: 2.1–2.5, both themes where a surface is involved, the ratchet in CI.

Out: any new onboarding UI, tours, coach marks. Renaming node types. The picker's content beyond the
group description.

## 4. Acceptance criteria

1. **(person)** A fresh install, a new project from the blank template. The Components panel shows
   sentence 2 above one row (`App`). The rail tooltip reads as specified. The `?` opens the table.
   Press the table's *React* row's `Storybook` cell — nothing happens, it is a table, and that is
   fine; the row is the lesson.
2. `scripts/vocabulary-ratchet.js` reports `0` for each retired word on user-visible strings, and
   the allowlist it prints has no entry that is a user-visible string (a reviewer reads the list).
3. Every `New …` menu item's label matches 2.1 (assert on `createMenu.ts`'s built items).
4. The MCP briefing contains the lane sentence (a spec on `instructions.ts`'s output).
5. P73's tutorial has the step and the table (P73's own drive covers it; this task's AC is that the
   step file exists and renders).
6. `test:ci` at the floor; the ratchet green.

## 5. Landmines

- The vocabulary lives in five packages and the community shelf's copy. Grep before claiming a
  sweep is complete, and grep with `-a` ([[ugrep-silently-skips-a-source-file-as-binary]]).
- FIX-019's spec pinned the old caption; TVW-001 re-pinned it. Do not pin it a third time.
- An example description is published ([[an-example-description-is-published]]); a corpus example
  that says "sandbox" is a public string.
