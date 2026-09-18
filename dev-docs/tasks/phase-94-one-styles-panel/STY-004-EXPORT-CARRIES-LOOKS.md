# STY-004 — Export carries Looks

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** 🟢 **Part A done, s3 — AC1–AC7 all green.** Part B not started (§3).
**Blocking** for anything this phase ships — `STY-DESIGN-THE-LOOK-MODEL.md` §6.

> Under the Look model every styled thing is a link. Shipping that design while the exporter drops
> links would mean **the more correctly someone builds, the more of their app silently disappears
> when they publish it.**

---

## 1. What is measured, and by whom

Everything below is from `STY-001-FINDINGS.md` §8.4a/§8.4b (**driven** — a real `export_react` run on
a scratch copy of `templates/todo-list`), re-read at HEAD this session (**read**).

| | measured |
|---|---|
| a variant on an ordinary leaf `Text` node | ❌ absent from the export, **0 mentions** in a 1,059-line report |
| that node's **text style** | ❌ absent, unreported. Its class contained `{ margin: 0; }` — the Text default and nothing else |
| the same values written **inline** on the same kind of node | ✅ export perfectly (`var(--text-sm)` appears in three other `.module.css` files) |
| colour styles | ⚠️ **unmeasured** — the only reference sat on a collapsed root Group |

**The mechanism, read at HEAD (`parse/parseProject.ts`):**

1. `parseProject` reads **four** files — `nodegx.project.json`, and per component `component.json`,
   `nodes.json`, `connections.json`. **`nodegx.styles.json` is never opened.** `grep -rn "styles.json"
   src` → 0 hits. So the exporter has never held the dictionary any of these three references point
   into.
2. `variant` is a **top-level field on the node**, not an entry in `parameters`. `parseNode`
   (`parseProject.ts:329-341`) copies `id`, `type`, `label`, `parameters`, ports — not `variant`. So
   it never reaches `NodeIR`, never reaches `style.unhandled`, and therefore never trips the
   `dropped, reported` note at `component.ts:373`. **The loss is silent in a layer whose own header
   says "Parsing never drops"** (`ir/types.ts:22`).
3. `textStyle` *is* a parameter, so it reaches `computeNodeStyle` — where it is in neither the style
   table nor `CONTENT_PARAMS`, so it lands in `unhandled` and is reported as unmapped. **Reported,
   but the values are still gone**, because nothing resolves the name.

---

## 2. The cascade this must transcribe — read from three runtime sites, not invented

🔴 **The exporter must reproduce the runtime's resolution order, not a plausible one.** Read at HEAD:

| layer | site | rule |
|---|---|---|
| variant under node | `noodl-viewer-react/src/react-component-node.ts:1811-1822` | `mergeDeep(params, variant.parameters)` **then** `mergeDeep(params, this.model.parameters)` — the node's own wins |
| textStyle under individual ports | `components/visual/Text/Text.tsx:48-51`, `controls/Button/Button.tsx:41-44` | `{...props.textStyle, ...props.style}` — the individual font ports win over the bundle, **whichever layer supplied them** |
| a colour style name | `noodl-viewer-react/src/styles.ts:122-127` | `resolveColor(v) = styles.colors[v] ?? v` — a name resolves, a `var(--token)` or hex passes through |

The `textStyle` port's own bundle is nine child ports, declared at
`node-shared-port-definitions.ts:2122-2133`: `fontFamily fontSize fontWeight fontStyle color
letterSpacing lineHeight textTransform fontVariantNumeric`, with the port's own description —
*"the individual font ports below override whatever it sets"*.

So the one rule, stated once:

```
effective = textStyleBundle(name)          ← lowest
          ← variant.parameters
          ← node.parameters                ← highest
where name = (node.parameters ?? variant.parameters).textStyle
and every colour value then passes through resolveColor
```

---

## 3. Scope — and the number §6 of the design asked for

**Split in two. Part A is not optional under any ruling; Part B is the quality target.**

| part | what | cost |
|---|---|---|
| **A — nothing vanishes** | the exporter reads `nodegx.styles.json`, carries `node.variant`, resolves the cascade above into the node's own CSS class, and **reports every Look it applied** | **one session** (this one) |
| **B — one rule per Look** | a shared `src/styles/looks.module.css`, one class per Look, joined by `composes:` — so N nodes wearing a Look share one rule across components, which is the actual benefit | **one further session, not yet started** |

**Part A already buys some of B for free**, and this is measured, not hoped: `component.ts:7035`
already merges identical declaration sets into one class within a component
(`partitionMergeGroup`). Nodes wearing the same Look with no overrides therefore already collapse to
one class **per component file**. What B adds is sharing **across** component files, and a class
whose *name* is the Look's.

⚠️ **B is the number to rule on.** A is being built now because a silent loss is not a thing to hold
a ruling open over.

---

## 4. Acceptance criteria

Graded by `tests/sty004-export-carries-looks.test.ts` against a new fixture, `tests/fixtures/look-desk`,
which is the first fixture in this package to carry a `nodegx.styles.json`.

🔴 **Every AC carries its control in the same run** — a fixture whose values vanish and one whose
identical values are written inline, so a green arm cannot be green because the assertion is dead
([[a-negative-arm-needs-its-control-in-the-same-run]], [[assert-an-absence-with-a-known-firing-signal-beside-it]]).

| # | criterion | state |
|---|---|---|
| **AC1** | `parseProject` reads `nodegx.styles.json` into `ProjectIR.styles` — colours, text styles and variants — and falls back to the legacy `metadata.styles` in `nodegx.project.json`. A project with no styles file parses to an absent dictionary, not a throw | 🟢 |
| **AC2** | `NodeIR.variant` carries the node's `variant` field verbatim when present, and is absent when not | 🟢 |
| **AC3** | A node wearing a Look exports that Look's declarations into its CSS class, **with the node's own parameters overriding** — the §2 order, graded on a node that overrides one field and keeps the rest | 🟢 |
| **AC4** | A `textStyle` on an ordinary leaf `Text` node exports its declarations, and an individual font port on the same node still beats the bundle. `textStyle` no longer appears as an unmapped parameter in the report | 🟢 |
| **AC5** | A colour param naming a project colour style exports the style's **value**; a `var(--token)` and a hex on the same fixture still pass through untouched (the control that proves the resolver did not eat them) | 🟢 |
| **AC6** | The report **names every Look, text style and colour style the export resolved**, and which nodes wore them — so a person can see the links were carried rather than infer it from CSS. 🔴 The old behaviour's signature was *0 mentions in 1,059 lines*; silence is the defect | 🟢 |
| **AC7** | 🔴 **The whole-suite control:** across the 48 existing fixtures — none of which has a styles file — this change moves **zero emitted bytes** | 🟢 **measured, see §4a** |

### 4a. AC7, and the red it had to be separated from

`npx jest --maxWorkers=2` over the whole package: **3640 passed, 3 failed, 1 skipped, 106 suites,
962s.** All three failures are in one file, `hls001-corpus-identity.test.ts` — the gate that hashes
every emitted file of every fixture against a golden.

🔴 **That gate was already red at HEAD, for another phase's reason.** Its own header says the honest
first question is what changed in the export, never whether the golden is stale, so it was counted
before anything was concluded:

| the gate says | entries | whose |
|---|---|---|
| projects in the corpus | 49, golden knows 48 | **mine** — `look-desk` |
| files the golden does not know | 15, **every one** under `look-desk/` | **mine** |
| files emitting a different byte | 48, and **every single one is `<project>/src/styles/tokens.css`** | 🔴 **not mine** |

**Why the 48 are not mine, measured rather than argued:**

- `git log 99522fd72..HEAD -- packages/nodegx-project-contract/tokens.ts` → **one commit**,
  `19b3517d3` *"fix(p88/gam-026): the ring goes on the box a person sees"*, which adds
  `--ring-width` to the shared token vocabulary (+6 lines).
- `git merge-base --is-ancestor 99522fd72 19b3517d3` → **true**: the golden's last regeneration is
  *older* than that token change, and `19b3517d3` did not regenerate it.
- The gate's own header already predicted exactly this shape: *"changing one value in
  `@nodegx/project-contract/tokens` moves 42 of these hashes (every project's `tokens.css`)"*.
- GAM-026's own "what was built" names the `nodegx-export` gates it ran: `hls001-package-boundary`
  and the MCP readers. **Not `hls001-corpus-identity`** — a neighbouring gate with a similar name.
  ([[a-gate-can-have-a-hole-shaped-like-the-defect]]; [[harness-and-gates-pointers]] — a per-directory
  run misses cross-phase gates.)

**And that same list is the strongest form of AC7 available.** If this change had moved any existing
byte, a `.module.css`, a `.tsx` or an `EXPORT-REPORT.md` would appear in the differing set for some
fixture. **None does** — across 48 projects the only differing file is the one a P88 commit
explains. In particular no fixture's `EXPORT-REPORT.md` moved, which is the direct confirmation that
`stylesReport` returns undefined for a project with no styles and prints nothing at all.

⚠️ **The golden is NOT regenerated here, deliberately.** Regenerating it would bake in two things
that are not this task's to decide: P88's uncounted `--ring-width` change, and — more sharply — the
working tree currently carries a **peer's uncommitted edit to `packages/noodl-types/src/node-catalog.json`**,
which is the artefact this exporter loads. A wholesale rewrite of a shared golden over another
session's in-flight file is an unperformed merge ([[a-wholesale-write-over-a-shared-file-is-an-unperformed-merge]],
[[regenerating-a-shared-artefact-is-an-unperformed-merge]]). The counting the header asks for is
done and written above; the regeneration is one command
(`HLS001_REGENERATE=1 npx jest hls001-corpus`) once the corpus is quiet and P88 has ruled on its own
48.

## 5. Out of scope

- **Part B** (§3) — the shared per-Look class. Its own row when the number is ruled.
- `stateParameters` / `stateTransitions` on a variant — hover/pressed/disabled. The design doc §9
  names these *"the obvious next thing after this lands"* and explicitly *"not in this design"*.
  🔴 Not to be smuggled in here. **But note:** a Look's state parameters are the other half of what
  the 73 `cssClassName` nodes in the corpus are hand-writing CSS for (`STY-001-FINDINGS.md` §7).
- Anything in the editor. This task is `packages/nodegx-export` only.
- The Look *model* rename (`Preset`/`Size` removal) — that is STY-002. This task carries
  `VariantModel` as it exists today, which is what the design says a Look already is.
