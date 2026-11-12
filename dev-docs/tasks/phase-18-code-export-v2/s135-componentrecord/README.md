# s135 — the component's record (EXP-020 slice 2), measured first

## What the handoff ranked, and what it was

Session 134 ranked slice 2 by the corpus's re-worded rows: `Noodl.Events` 132, `Noodl.Object` 50, `Noodl` handed on 47,
`Noodl.Array` 22. Counted by distinct body (`bodies.ts` → `bodies.json`, deduplicated by the body's sha1):

| what the corpus counted | distinct bodies | where they come from |
|---|---|---|
| `Noodl.Events.emit` 132 | 6 | the Filters prefab, installed in one project copied ~22 times (CMG Drive Looks A–K, drives) |
| `Noodl.Object.create` 50 | 2 + 2 | the Filters prefab; the Multi Select prefab (UPG-001, test112) |
| `Noodl` handed on 47 | 3 | the Site Builder editor template (`Noodl && Noodl.Variables`, `Noodl.SEO.setTitle`) |
| `Noodl.Array` 22 | 1 | a scratch body (`Noodl.Array.foo = …`) |

The prefabs, scanned as text (`library/prefabs/*/project/project.json`, legacy format the exporter does not read until a
prefab is installed): **every** front-end body that reads `Noodl.Events` (13 of 13: filters, form, table) also reads
`Component.*`. So carrying `Events` alone gains nothing. `Noodl.Object` / `Objects` without `Component.*`: 9 bodies
(supabase 5, xano 3, table 1).

The templates (what a person gets): **one** body refused for a Noodl member (`Noodl.Users`, digital-bricks-training). The
Function refusal that ranked first there was the Component scope: gram's ten page loaders and marketplace's two, every
one refused for `Component.Object` alone (each Noodl member they read travels since s134), every one the instance's
private scratch record (`var keep = Component.Object; … keep.get('links') … keep.set('links', links)`), literal keys,
in a component with no Component Object node. And EXP-020 §5 sent `Component.*` to EXP-021, whose §5 sent
`Component.Object` to "the controlled-state slice": nobody's.

So slice 2 is the record. `Events` / `Object` wait behind the scope's other members (the Filters prefab shares functions
on it: `Component.UpdateCondition`, `UpdateValue`, `UpdateFilter`).

## Files

- `bodies.ts`, `bodies.json` — every deferred Function that reads `Noodl`, deduplicated, across the corpus and templates.
- `EXPECTED.md` — the Component Desk, predicted before either arm ran.
- `dispdiff.json` (templates: 51 gained, 0 lost, 7 re-worded), `dispdiff-corpus.json` (0 gained, 0 lost, 160 re-worded).
- `tplbuild.json` — all 17 at the floor (1 in 1, nightbook STYLENULL).
- `mutants.py`, `mutants.out` — 10 arms, 0 survived.
