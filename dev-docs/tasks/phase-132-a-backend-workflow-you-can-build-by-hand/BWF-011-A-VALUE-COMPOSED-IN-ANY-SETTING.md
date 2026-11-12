# BWF-011 — A value composed in any setting (R8)

**Phase:** [132](README.md). **Ruling:** R8 (2026-11-03), before the Beta. **Size:** 1–2 sessions, Studio first; the
editor's picker (BWF-008 item 3, `workflowSources.ts`) follows in the same task or is said open.

## What he asked

> "In n8n and other similar tools, selecting 'from the run' is just a way of inserting a dynamic value into an
> expression. You might want to have 'from the run - SomeStep items:first value' like with the expression composer in
> the Studio in the front end workflow steps, way more customisable."

Today a setting is ONE of: Typed, From the run (the whole setting is one pill), or A formula (`runValueField`'s mode
select). Text with a value in the middle needs *A formula → Text with values*, two menus deep.

## What exists (measured 2026-11-03)

- The engine needs nothing: `getPath` (`steps/values.ts:114`) walks arrays by index (`items.0.name`, `-1` = last);
  the formulas (`steps/formulas.ts`) include `text` (parts), `first`, `last`, `count`, `sum`, `pick`, `join`.
- Studio's front-end composer (`openComposer`, STU-098's sentence view: words, chips, a typed value in a box of its
  kind) compiles to an Expression node's JavaScript, which a backend setting may not hold (R2): its LOOK and handling
  are reused, its output is a `{ $fn: 'text', … }` / `{ $path }` tree.

## Build

1. **Every text-like setting is a composer:** type words, drop a value from *What it can read* (or the picker) at the
   caret as a chip; saved as `$path` alone when it is one chip, `text` with parts when there are words around it,
   the typed string when there are no chips.
2. **A chip is refined in place:** a list chip offers *first*, *last*, *count*, *each one's <field>* (`pick`), *joined
   with …*; an object chip offers its fields (from the run's values or the shape, as the tree does). "Find plants →
   items → first → name" is a path (`upstream.find.items.0.name`) when it can be one, a formula when it must be.
3. A number, yes/no or choice setting keeps its typed control (P132-TYPEDISTEXT) with *From the run* / *A formula*
   beside it: a composer is for text.
4. The agent's half: the catalog's `formulaLanguage` already says it; the step-catalog words say a value can be text
   with values in it.

## Acceptance

- AC1: on a Greenhouse copy, *Send an email*'s subject is typed as "Water " + the plant's name chip + " today" with no
  formula menu opened; the file holds `{ $fn: 'text', … }`; a test sends that subject.
- AC2: a Find's first result's name is picked as items → first → name in two presses, saved as a path, and the test
  shows its value.
- AC3: `check:automations` grades both; the Electron app shows AC1.

## s14 (2026-11-04): built in Studio; the editor's picker open

**Studio** (`editor/studio.html` `composeBox`, `editor/automations.mjs` `composeParts` / `composeValue` / `isChip` /
`knownAt` / `chipRefinements` / `chipWords`):

- **Every text setting is a composer** (type text or any, not a number, yes/no or choice: those keep their typed
  control, item 3). It is one editable box of words with value chips in it. A chip is dropped from *What it can
  read*, or picked with **+ A value** or *From the run*, and lands where the cursor was (at the drop's point for a
  drop). Backspace takes a chip out whole. The box is kept when it is left.
- **Saved as the backend keeps it**: words alone are the typed value (`'any'` still reads "5" and "true" as
  themselves), one chip alone is itself (a `{ $path }`), and both are `{ $fn: 'text', args: parts }`. Another
  formula, a list or an object is not a composer's and keeps its old control.
- **A chip pressed** opens its menu. A list offers *the first one* and the first one's fields in one step, *the last
  one* (`.-1`), *how many there are* (`count`), *each one's <field>* (`pick`), or *joined with commas* when the items
  are not records. A `pick` chip offers *joined with commas* (`join`). A record offers its fields, own fields first,
  id and dates after. Under those, *Or another value*: what the step can read (folded), *Take it out*, and *Edit as
  path*. Before a run, a record step's rows are its table's columns (`knownAt`): a find's `items` is a list of
  them. `first` and `last` are paths (`items.0`, `items.-1`), never formulas.
- The select under the box (Typed / From the run / A formula…) stays: its Typed reads *Words and values*, and the
  words get the field's width.
- 🔴 **A real press found what the gate's `.click()` could not** (s4's lesson again): pressing in the picker takes
  the focus out of the box, which saved "Water " and then refused the chip's save. The fix: a save compares with
  the last kept value and is never one-shot. A box left for one of its own menus is kept when the menu has gone,
  unless the pick kept it first. The Chrome gate now sends the `focusout` before the pick, as a press does.

**The agent's half** (item 4): the catalog already said "text with values" (the value language, Call an API's address,
an email's subject). Added: a `$path` walks a list by position (`items.0.name`, `-1` the last), NodeGX
`packages/nodegx-backend/src/workflow/steps/values.ts`. 10 catalog suites, 225 tests green.

**Gates:** check:automations' unit half 133 (21 new BWF-011 lines), its drive 148/148 with `NODEGX_REPO` (the new
section: a Find then an email, its subject composed by drop-at-cursor and typed words, the chip refined in two
presses, no formula menu, tested through an SMTP catcher: "Water <the first task's title> today"). Three older
lines moved from `input[type=text]` to the composer.

**AC1/AC2 in the Electron app on a Greenhouse copy** ([greenhouse-drive-bwf011.mjs](greenhouse-drive-bwf011.mjs), real
presses and `Input.insertText`): *The morning check* got a Find records (Plant) and a Send an email. The subject was
typed "Water ", *+ A value* pressed, the found items picked, the chip pressed, "the first one's name" pressed, and
" today" typed. File and backend: `{"$fn":"text","args":["Water ",{"$path":"upstream.find-records.items.0.name"}," today"]}`.
**0** formula menus opened. Tested: the catcher received "Water Fern today", Fern being the Find's first plant.
🔴 On one run the Test press opened no warning and nothing ran; the next run tested fine. Not explained.

**Still open:**
- **The NodeGX editor's picker** (BWF-008 item 3, `workflowSources.ts`): no composer there yet. It still has one
  pill or one formula per setting.
- **Ask Richard:** a chip reads `items › #1 › name · from Find records`. The `#1` and `›` are pathWords' (every pill's).
  Would he rather read "the first one's name, from Find records"?
- Each text setting now has *+ A value* and the select under it: the panel is busier.
