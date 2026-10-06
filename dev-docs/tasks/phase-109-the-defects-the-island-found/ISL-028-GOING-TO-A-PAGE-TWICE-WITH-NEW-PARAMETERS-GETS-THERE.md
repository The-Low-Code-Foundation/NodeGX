# ISL-028 — Going to a page twice, with new parameters, gets there

**Status: ✅ s23 (2026-10-06): all 10 rows fixed, AC1–AC4 met — C27 + C29 (`3ae687fbe`), C26 (`d57c0e053`), C25 (`30b54e988`), D20 + D21 (`9404f00c4`), C28 (`e965f8241`), C30 (`3ce778c4f`), C32 (`46837f595`), C31 (`7f31bf97d`); §9. ✅ AC2: all 10 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 10 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 3 high · 4 medium · 3 low, **10 awaiting a ruling**. **Side:** viewer (Router, Navigate, Navigate To Path, Component Stack, Show / Close Popup)

## 1. The person sentence

**Navigating, pushing or opening a popup does what was pressed every time, with the parameters given. Each press is answered once, with the outcome that really happened.**

## 2. Why these belong together

A second Navigate or push to the same page with new parameters reports Unchanged and keeps the old page (C27, C29).
This is the list-detail pattern every app has: open item 1, go back, open item 2, and see item 1. Push Component To
Stack's Back Results and Back Actions never connect (C26). Navigate To Path never answers when the browser refuses the
push (C25), and does not encode its query (D21). The popup stack keeps a popup that failed to open (C30), cannot close an
outer popup by name (C31), and answers twice for two presses in one frame (C32).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C26](../../bugs/p107-c26-push-component-to-stack-back-results-and-back-actions-never-connect.md) | high | needs-ruling | Push Component To Stack's Back Results and Back Actions never connect — the TS port dropped `registerOutputIfNeeded` |
| [P107-C27](../../bugs/p107-c27-a-second-push-of-the-same-page-with-new-parameters-reports-unchanged.md) | high | needs-ruling | A second push or replace of the same page with new parameters, from one Push Component To Stack, reports Unchanged and keeps the old page |
| [P107-C29](../../bugs/p107-c29-a-second-navigate-to-the-same-page-with-new-parameters-reports-unchanged.md) | high | needs-ruling | A second Navigate to the same page with new parameters, from one Navigate node, reports Unchanged and keeps the old page |
| [P107-C25](../../bugs/p107-c25-navigate-to-path-never-answers-when-the-browser-refuses-the-push.md) | medium | needs-ruling | Navigate To Path never answers a press when the browser refuses the push (a Path on another origin with the Path URL type) |
| [P107-C30](../../bugs/p107-c30-a-popup-that-failed-to-open-keeps-its-slot.md) | medium | needs-ruling | A popup that failed to open keeps its place on the popup stack — the next popup reports Dismissed for it, and Escape stops working |
| [P107-C31](../../bugs/p107-c31-close-popup-cannot-close-the-popup-that-opened-its-popup.md) | medium | needs-ruling | A Close Popup in a nested popup cannot close the outer popup by name — the Popup input's "when popups are nested" never works |
| [P107-D21](../../bugs/p107-d21-navigate-to-path-does-not-encode-query-values.md) | medium | needs-ruling | Navigate To Path does not encode Query values — a value with & or # breaks the URL |
| [P107-C28](../../bugs/p107-c28-push-component-to-stack-never-answers-a-mode-that-is-not-push-or-replace.md) | low | needs-ruling | Push Component To Stack never answers a press when Mode is neither push nor replace |
| [P107-C32](../../bugs/p107-c32-show-popup-reports-done-for-a-popup-replaced-before-it-opened.md) | low | needs-ruling | Two Show Popups pressed in one frame — the first reports Dismissed AND Done, for a popup that never opened |
| [P107-D20](../../bugs/p107-d20-navigate-to-path-expands-dollar-patterns-inside-a-parameter-value.md) | low | needs-ruling | Navigate To Path expands $&, $$ and friends inside a parameter value |

## 4. Order of work

C27 + C29 first: one ruling ("hand a copy", already asked together in P107 README §7 near C27) and one shape of fix in two handlers. Then C26, then the popup rows, then D20/D21/C28.

## 5. Rules for every row

- **Re-measure first, cheaply.** Every P107 row is a *known row* on the runtime target, and
  `packages/noodl-runtime/test/node-spec/conformance.test.ts:714` asserts each one **still fires** on every run. A row
  that has stopped firing turns that test red. So run the node-spec suite before you start. A row that no longer fires was fixed
  by someone else: close it in the ledger with the commit that fixed it, and do not fix it again.
- **A `needs-ruling` row is asked before it is fixed.** P107's R3 says the runtime wins until Richard rules. Most rows
  already carry the plain-words question and a recommended fix in their evidence section (the NSP task's §6, or the P107
  README §7). Ask the rows of this task **in one batch**, plain words, one decision per question, recommendation first,
  and say what the node is in each question. Ask only when this task is next to build.
- **A fix ships alone and closes its row in the same commit:** drop the known row from the spec's runtime list, bump
  the spec's `version` with a `changes` entry that names the bug's id (P107 NSP-010, P112 OWN-010), set the ledger
  file to `status: fixed` with `commit:`, and add a `regression:` line (the scenario that now passes). `node
  scripts/bugs.js check` fails a fixed kit bug without one.
- **The export is not fixed here.** If the exported app has the same fault, write a row on P18's ledger, as P107 §8 does.

## 6. Related work and collisions

- C24 (a Path that is not text) is in ISL-026, the wrong-kind group. It is fixed by the same coercion rule.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.

## 8. Rulings (2026-10-05)

Richard ruled every `needs-ruling` row of this task on the [Track F rulings page](https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH). Each card asked one plain-words
question with the options below; the full card is quoted in the bug's ledger file. **Build what is ruled.** A wording-only
ruling is still this task's work: the description changes, the node does not.

| bug | ruled | as recommended | what it means |
|---|---|---|---|
| P107-C26 | Put the method back | yes | Wires from Back Results and Back Actions work again, the way Show Popup's close results already do. One method restored in one file, and it touches nothing else. |
| P107-C27 | Hand the stack a copy | yes | Each press opens the page with the values it was pressed with, so the second product opens. One line each for push and replace, on the node's side. |
| P107-C29 | Hand the Router a copy | yes | Each press opens the page with the values it was pressed with, so the second product opens. One line on the node's side. |
| P107-C25 | Report a clear failure | yes | The press fires Failure with the error "The browser refused to navigate to this path", so the author's failure branch runs and they can see why. One small change in one place; to open another website they use External Link. |
| P107-C30 | Give the place back | yes | A failed popup leaves no trace, so later popups and Escape behave normally. One change in one place, and no change for any popup that opens. |
| P107-C31 | Reach the outer popup | yes | Naming the outer popup closes it, as the setting promises. This changes how a nested Close Popup finds its popup, so a nested popup whose name matches an outer one could close something new. |
| P107-D21 | Encode, and skip null | yes | Any text travels safely and arrives unchanged, because the router already decodes what it reads. It changes every address with query values, and an author who encoded values by hand would see them encoded twice. |
| P107-C28 | Fail and name the value | yes | The press fires Failure with an error such as "Unknown mode 'Push'", so the author sees what their wire sent. One extra branch in one place. |
| P107-C32 | Drop the Done | yes | The node fires Dismissed only, and that answers the press. Done then always means the popup opened. This makes Dismissed alone a full answer to a press, which other nodes may want to agree with. |
| P107-D20 | Insert values as written | yes | Any value, dollar signs included, lands in the address unchanged. One line in one place, the same fix as String Format's. |

## 9. Session 23 (2026-10-06) — what landed

AC1: each row re-measured at the session's HEAD before its fix, and every one still fired. Only C25 was a known row (the
"known rows still fire" test green for it at 20732). C28, C30, D20 and D21 had no known row: their specs modelled the
runtime (R3), so each control is HEAD's runtime file failing the rewritten scenario. C31 and C32 were `row`-marked graph
scenarios. C26, C27 and C29 were graded NOWHERE: the spec world records `params` canonically and has no back channel, so
their red runs are new viewer tests written first (red on exactly the defect rows, their controls green).

| bug | commit | what changed | regression |
|---|---|---|---|
| C27, C29 | `3ae687fbe` | Push (push and replace) and Navigate hand `{ ...pageParams }` | `isl-028-a-second-press-with-new-parameters.test.ts`, 9 rows; red on the 6 defect rows before |
| C26 | `d57c0e053` | Push's `registerOutputIfNeeded` restored (Show Popup's shape) | `isl-028-push-back-results-and-actions.test.ts`; red on the 2 Push rows before |
| C25 | `30b54e988` | the refused `pushState` is caught: Failure `navigate-to-path/refused`; known row and predicate dropped | the C25 scenario; control red on it alone |
| D20, D21 | `9404f00c4` | a function replacement; query name and value encoded, null left out; the API twin too; Navigate To Path v2 | 3 scenarios (1 new) + `isl-028-navigate-to-path-api-query.test.ts`; controls red |
| C28 | `e965f8241` | an unknown Mode is Failure `push-component-stack/unknown-mode`, Error naming it; Push v2 | the C28 scenario; control red |
| C30 | `3ce778c4f` | `showPopup` gives a failed build's slot back; Show Popup v2 (its dead Escape arm removed) | the two C30 scenarios; control red on both |
| C32 | `46837f595` | `showPopup` resolves `'dismissed'` for a popup replaced before it opened; Show Popup reports no Done for it | t12 graph scenario, unmarked, re-recorded (one event gone: a's Done); control red |
| C31 | `7f31bf97d` | Close Popup's walk crosses from a popup to the component that opened it (`popupParent`), in Close Popup only | t12 graph scenario, unmarked, re-recorded (one event added: Closed) + `isl-028-nested-close-popup.test.ts`; controls red |

**What the plan did not know.**
- **Three of the ten rows had no grade anywhere** (C26, C27, C29). The NSP-015 specs said so in their docblocks; the
  task's §5 assumed every row was a known row. Each now has a viewer test on the real stack / Router methods.
- **D21 had a twin the ruling did not name:** `Noodl.Navigation.navigateToPath` built its query the same raw way (the
  ledger file names it). Fixed in the same commit so the scripting API and the node keep one rule; its doc comment said
  "Values are not URL-encoded".
- **The ruling's premise for D21 was checked before building on it:** the Router's `_getSearchParams` decodes both halves
  (`decodeURIComponent`, `+` as a space), so encoded text arrives as sent. The API test round-trips through that loop.
- **C30 and C32 meet in one place:** a popup replaced while its build then FAILS has already answered with Dismissed, so the
  C30 catch returns `'dismissed'` for it rather than a Failure on top.
- **C31 was scoped to Close Popup**, not `componentwalk.ts`, which Parent Component Object and others share: the ruling is
  about how a Close Popup finds its popup. A blank Popup still closes the nearest (a control row says so).
- **Read, not measured:** ISL-004's kept page stored the same live `params` (`_isl004Page.params`); with C29's copy each
  kept page holds its own. No test names this.
- The `showPopup` return type is declared in THREE places (`nodecontext.ts`, `noodl-runtime/src/internal.d.ts`,
  `@noodl/types` `node-definition.d.ts`); the second is the one the runtime's own type check reads.

**Readings (2026-10-06):** each fix at seeds 20732 and 13 where its spec changed, 0 divergences, every mutant killed
(Navigate To Path 26 / 26, Push 46 / 46, Show Popup 119 / 119 and 142 / 142; Close Popup's two declared equivalents as
before). Runtime jest without the conformance file 3161 passed (one earlier run read 1 failed and the two reruns 0 — not
named, recorded as a flake); runtime graph 87 / 87; spec navigation batch, catalog parity, graph, world, schema 509 / 509;
viewer full suite 1772 / 1772 (143 suites); runtime, spec and viewer tsc 0. AC4: `bugs.js` lists none of the ten open;
`--status fixed --from P107` lists all ten. `bugs.js check`: 5 problems, none in P109's rows (s22: 5).

**Owed by P18 (the export):** does the exported app (a) hand a copy of a Navigate / Push's parameters (C27, C29), (b)
register Push's back outputs (C26), (c) answer a refused push (C25), (d) insert path values as written and encode its
query (D20, D21), (e) fail an unknown Mode (C28), (f) give a failed popup's slot back, report no Done for a popup
replaced before it opened, and let a nested Close Popup reach the outer popup (C30, C32, C31)? Not checked here.

