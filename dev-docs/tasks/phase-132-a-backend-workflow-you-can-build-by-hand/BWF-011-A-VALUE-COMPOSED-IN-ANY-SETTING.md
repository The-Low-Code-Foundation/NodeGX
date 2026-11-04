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
