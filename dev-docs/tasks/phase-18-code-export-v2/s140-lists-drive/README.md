# s140 — EXP-021 AC4, driven: rocket-school's lists are edited in the exported app (EXP-011 §110)

P18 session 140, 2026-10-22, BOARD lane 6. The handoff's item 1: drive AC4 ("rocket-school's list editing edits a set in
the exported app"), translated in s139 and not driven.

## The drive

`build.sh` copies `templates/rocket-school` and emits it per arm: **export-head** from HEAD's export `src` (a
`git archive` base under `packages/`, deleted after), **export-fixed** from the tree. Each is built with its own
`npm run build` (`tsc -b && vite build`) against npm's packages, installed once into `work/deps`. `emit.ts` is s137's,
plus `app.copies`: rocket-school has a kit (`game-kit`), whose script the bundle imports from `src/kits/modules/`. The
first build failed without it. The **runtime** arm is `render-from-disk.js` on the same copy (viewer bundle 07:42 today;
no runtime commit since 10-20).

`drive.cjs`: one headless Chrome, one origin per arm (its own port). The store is seeded before the app's first script
(`Page.addScriptToEvaluateOnNewDocument`, once per tab): Ada as the active profile, one set "Capitals" (France = Paris,
Spain = Madrid). The steps: open `/lists` (L0); Edit (L1); rename to "Capitals of Europe" and type three lines (L2); Save
(L3); New list, "Sums" with two lines, Save (L4); Delete "Capitals of Europe", "Yes, delete" (L5); reload (L6). Each
reading holds the page's lines, every field (tag, value, caret, `resize`, font, height) and
`localStorage["noodl_store_rocket-school"]`. `show.cjs` prints `readings.json` step by step.

Predicted first (`EXPECTED.md`). **Every step read as predicted on all three arms**, including the least certain row:
Chrome turns each line break typed into a one-line field into a space.

| step | runtime | export-head | export-fixed |
|---|---|---|---|
| L0 | "Capitals", "2 questions" | same | same |
| L1 | lines field a `<textarea>`: `France = Paris\nSpain = Madrid` | an `<input type="textArea">`: `France = ParisSpain = Madrid` | as the runtime |
| L3 | "Capitals of Europe", **3 questions**; stored | "Capitals of Europe", **1 questions**; stored as one item `France = Paris Spain = Madrid Italy` = `Rome` | as the runtime |
| L4 | "Sums", 2 questions | "Sums", 1 questions | as the runtime |
| L5 | one row, "Sums"; the set deleted from the store | same | same |
| L6 | after reload, "Sums" (the persisted copy) | same | same |

The fixed export's stored JSON equals the runtime's **at every step**, byte for byte, apart from the new list's generated
id. Profiles and `activeId` were untouched on every arm. No console errors or warnings on any arm. Caret, `resize` and
font of both fields are equal. The heights differ (29 / 57, 190 / 220) because the runtime measures its inner element
inside a padded wrapper. The screenshots (`shot-L1-*.png`) draw the same boxes.

Two drive bugs, both mine, fixed before the readings above: the lines field's placeholder has two lines (matched by
prefix now), and the runtime draws Save a beat after the lines parse (the press is its own step, `L4typed` then `L4`).
A third: a wait loop threw on a page mid-reload instead of waiting.

## What HEAD's export got wrong: P18-S120-TEXTAREA, fixed

The export printed `<input type="textArea">`. A browser knows no such type and draws one line, so every list typed or
edited in the exported app was saved as one question. The emitter (`component.ts`, `isTextArea`):

- `tagOf` draws `textarea` for a Text Input whose authored Type is Text Area;
- `contentAttrs` prints no `type` on it;
- its ref (a Focus / Set / Blur target) is `useRef<HTMLTextAreaElement>`;
- `base.css` gains `textarea { resize: none; }`, as the runtime's control sets.

Not ported, measured unneeded: the runtime puts a fresh textarea's caret at the end (P107-D35). The export's controlled
textarea had it at the end already at L1 (29 of 29).

**Graded on a desk** (`tests/a-text-area-keeps-its-lines.test.ts`, s129's Field Desk with the `name` field made a Text
Area and Fill's value `Bob\nAnn`), both arms in jsdom, which sanitizes an `<input>`'s value as Chrome does. Predicted
first (`EXPECTED.md`, "The desk"). **8 / 8.** HEAD's reading (mutant M1's A2 diff) is exactly the predicted HEAD row:
`France = ParisSpain = Madrid`, then `[name]=BobAnn` while `typed` holds `Bob\nAnn`. Both arms' `type:` step now accepts
a line break (`[\s\S]*`). **4 mutants, all killed** (`mutants.py`, `mutants.out`). M1 and M2 also fail the typecheck: a
textarea given an input's ref, or a `type` prop.

**Reach** (`areas.cts`, `areas.out`): the 17 templates hold 25 Text Area fields. HEAD drew all 25 as `<input
type="textArea">`; the tree draws 21 as `<textarea>`. The 4 left are one field whose Type is **wired** from a component
input (nightbook's `Field`, placed 3 times with `type="textArea"`, the letter's boxes) and one in landing-pages. Filed
**P18-S140-WIREDAREA** (low). The editor's two content templates hold 4 more authored ones (Site Builder 3, landing
pages 1).

## Found beside it: P18-S140-SHELLUNSAID (filed, medium)

The runtime's page is beige; the export's is white. `App`'s CSS Definition "The page ground and the pointer" (`html, body
{ background }`, press and hover motion, the pointer cursor) and the root Group's background are refused as "node beside
the router shell", and the report never says so. A `scaffolded` component's refusals print nowhere. `shell.cts`
(`shell.out`): 77 such nodes in 16 templates, 15 of them whole CSS Definitions. 13 of the 16 reports never say the
sentence. s137 counted the same 77 and wrote "the report says so". That was wrong: its own todo-list report does not.

Also seen and already known: the Editor's count line ("2 questions" under the lines field) is absent in the export (the
`count` wire into an unrendered sink, §101). The avatar's white disc is missing (kit styling, not chased).

## Readings

- Spec 8 / 8; `gam-011-input-mode` 7 / 7; mutants 4 / 4 killed.
- hls001's golden regenerated, predicted first: 64 `base.css` + puppy-test-3's Admin page. ts-node read **65 moved, 0
  added, 0 removed** before the regenerate, and agrees with jest's regenerated golden on every hash after it.
- `tplbuild` (s137's, `ROOTS=templates`): all 17 at the floor (1 in 1, nightbook STYLENULL). Package `tsc --noEmit` 0.
- Whole package (`nice -n 19 --runInBand`, JSON 12:53): **156 suites, 5,288 passed, 0 failed, 3 skipped**, as predicted
  (s139's 5,280 + the 8 new rows).
