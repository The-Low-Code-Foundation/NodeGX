# HLT-014 §3.1 — verdict, 2026-09-22 (P99 s21). The popup that is announced as "dialog".

**BUILT. The row's last slice is closed.** `validate:project` now warns on a Show Popup whose
dialog has no accessible name. Tree: `cline-dev` at `ec1061805` plus this change.

## What it is

`DiagnosticCode.DialogWithoutName` (`dialog-without-name`), rule
`validation/rules/dialogWithoutName.ts`, registered in `ALL_RULES` beside `labelNotAClickTarget`,
`defaultEnabled: true`, severity **warning**.

It fires when a `NavigationShowPopup` has **neither** a non-blank `Accessible Name` **nor** an
`h1`–`h3` anywhere in the subtree its `target` renders.

## 🔴 The predicate was taken from the runtime, and it is not what the task file described

`PopupDialogLayer` names a popup from `Accessible Name` → `aria-label`, else from
`el.querySelector('h1, h2, h3')` → `aria-labelledby` (`popup-dialog.ts:109-114`, `:254-257`). Two
things follow that a rule written from §3's sentence would have got wrong:

1. **A `Text` is a heading only when its `as` parameter says so.** `nodes/visual/text.ts:47-68`
   declares `as` over `div|h1…h6|p|span`, default **`div`**. "There is a Text at the top" is not a
   heading. A version that accepted any `Text` passes **728 of 756** corpus popups that are every
   one of them still announced as "dialog" — and it is **mutant 2** below.
2. **`querySelector` searches the rendered subtree, including nested component instances**, so the
   walk recurses. Measured: **0** popups rely on that today — a fact about this corpus, not about
   the rule ([[a-reading-that-fits-is-not-one-that-excludes]]) — and a non-recursive version emits
   a warning that is simply **false** the day one does. It is **mutant 1**.

`h4`–`h6` deliberately do **not** count: `querySelector('h1, h2, h3')` does not match them, so a
popup titled with an `h4` really is unnamed. The rule reports what the runtime does.

## Calibrated against the shipped corpus BEFORE it was written

Scanned **238 projects**, both on-disk formats:

| | |
|---:|---|
| 871 | raw `"NavigationShowPopup"` occurrences (the CONTROL) |
| **756** | Show Popup nodes reached by the component walk |
| **0** | carrying an `Accessible Name` today |
| **5** | whose target contains a heading |
| **728** | the rule would warn on |

🔴 **And on what NodeGX ships it is 0.** The ten templates hold **exactly one** Show Popup and its
target already has a heading. Re-run after the rule landed: all ten templates **0 errors, 0 new
warnings** (`members-area`'s 2 are the known out-of-scope pair). So a default-enabled warning
cannot turn the product's own gate red ([[templates-exist-to-surface-product-defects]] — asked
first, not afterwards). On a legacy project it is loud, and that is the truth about those popups.

⚠️ **The scan's first version reported 0 Show Popups while `grep` found 567** — legacy components
nest under `component.graph.roots`, v2 keeps a **flat** `nodes` array with the name in a sibling
`component.json`. Reading one shape found nothing and looked like a clean answer
([[a-project-scan-must-read-both-project-formats]]). The scan now prints the raw occurrence count
beside the walked count every time.

## Readings (all 2026-09-22)

| gate | result |
|---|---|
| `tests-unit/hlt-014/dialogWithoutName.test.ts` | **22/22** |
| **Mutant 1** — recursion into component instances removed | **2 red, by name**: both "a heading N components down" arms |
| **Mutant 2** — any `Text` counts as a heading | **12 red**, incl. every `as=` arm and all three firing arms |
| Rule restored from a `cp` snapshot | **byte-identical** (`diff -q`), 22/22 green again |
| `validate:project templates/*` | **0 errors, 0 new warnings** across all ten |
| `--list-rules` | lists `dialog-without-name` with its description |
| `typecheck:editor` | **exit 0** |
| `tests-unit/validation` + `tests/validation` | **140/140** |
| `noodl-mcp` `gateParity.test.ts` | **8/8** |
| **`test:main`** | **538/538 suites, 8,570/8,570 tests, exit 0** — up from 537/8,548 by exactly this suite |

🔴 **Both mutants were applied over a `cp` snapshot and restored with `cp`, never
`git checkout --`** ([[git-checkout-is-not-a-mutant-undo.md]] — a peer's open edit in the same file
would have been destroyed).

## 📋 NOT run, and owed

**`test:ci`.** Editor `src/` changed, so it is owed. It was not run because a dev stack is up for
Richard's TVW-008 AC7 hand-test and `test:ci` launches its own Electron. **The next session runs it
after teardown**, and must not read this verdict as though it had
([[two-gates-covering-the-ends-of-a-chain-read-as-coverage]] — this phase's §7 exists because
`test:ci` and `test:main` are different gates and neither is a superset).

## What this row does NOT claim

- Nothing was fixed in any project. 728 popups in Richard's own drives and legacy projects are
  still announced as "dialog"; the rule says so, it does not repair them.
- Nothing about a Show Popup with **no target** (11 in the corpus) or an **unresolved** target
  (12). Those are other codes' business and a node told two things about one parameter is noise.
