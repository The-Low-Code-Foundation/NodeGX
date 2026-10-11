# ISL-037 — The templates carry no shape the product warns about

**Status: 🟢 s45 (2026-10-11): 4 of 7 fixed — DEF038 `f7d3bcc2b`, TOUCHBUILD `5778f4b1c` (ruled "Building pays nothing"), ARIALABELWORDS `822081831`, OLIVEDRIVE `07392a4ed`. Left: DBTPAGETITLES (blocked on P109-S45-WIREDTITLE, found s45: a wired Page title never reaches the tab), and P78's untracked Nightbook pile (NIGHTBOOKHOME; ROWWRAP's three Nightbook rows — its landing-pages row was fixed by `db086d75f`). Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 7 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 4 medium · 3 low. **Side:** templates (nightbook, landing-pages, digital-bricks-training (+ demo), bot-garden) and the island drives

## 1. The person sentence

**Every shipped template opens with a home page, settles under the editor's migrations, translates all of its words, and passes its own drive.**

## 2. Why these belong together

What a person gets when they start from a template. Nightbook has no home page (S13-NIGHTBOOKHOME). Four template rows
cannot wrap (S4-ROWWRAP). The DBT demo and others would be rewritten by an editor load (S6-DEF038). The training app's tab
titles and the island's screen-reader names stay English in French (S11-DBTPAGETITLES, S11-ARIALABELWORDS). Two island
drives are red: the touch drive never sees Pip and Cobble build (S18-TOUCHBUILD), and the Olive drive walks to where the
can used to be (S7-OLIVEDRIVE).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P109-S6-DEF038](../../bugs/p109-s6-def038-four-templates-unsettled-against-run-on-change.md) | medium | fixed | The DBT demo template would be rewritten by an editor load — 6 Function inputs lose their run-on-change (DEF-038's settled gate) |
| [P109-S11-ARIALABELWORDS](../../bugs/p109-s11-arialabelwords-the-islands-screen-reader-names-stay-english-in-french.md) | medium | fixed | Eight screen-reader names on Olive's Island stay in English when the page is in French |
| [P109-S13-NIGHTBOOKHOME](../../bugs/p109-s13-nightbookhome-the-nightbook-template-has-no-home.md) | medium | open | The Nightbook template has no home page — its project file carries no rootNodeId, the D9 shape again |
| [P109-S18-TOUCHBUILD](../../bugs/p109-s18-touchbuild-the-touch-drive-never-sees-pip-and-cobble-build-on-her-land.md) | medium | fixed | "`drive-iw007-touch.js` never sees Pip and Cobble build on her land at 1368 (BUILD, PILLS, PAY red on HEAD's garden too)" |
| [P109-S4-ROWWRAP](../../bugs/p109-s4-rowwrap-four-template-rows-cannot-wrap-and-no-css-rescues-them.md) | low | open | Four template rows are set to wrap and cannot — nightbook's three text-tool rows and landing-pages' nav, with no CSS rescuing them |
| [P109-S7-OLIVEDRIVE](../../bugs/p109-s7-olivedrive-three-ig006-clauses-walk-the-old-can.md) | low | fixed | The Olive pages drive is red in three IG-006 clauses — its programs walk to where the can was before P108's R7 |
| [P109-S11-DBTPAGETITLES](../../bugs/p109-s11-dbtpagetitles-the-training-apps-tab-titles-stay-english-in-french.md) | low | open | The Digital Bricks Training app's browser-tab titles stay in English when the app is in French |
| [P109-S45-WIREDTITLE](../../bugs/p109-s45-wiredtitle-a-page-title-from-a-wire-never-reaches-the-browser-tab.md) | medium | open | A Page's Title set by a wire never reaches the browser tab — the Router always uses the typed one (found s45; blocks DBTPAGETITLES) |

## 4. Order of work

S13-NIGHTBOOKHOME and S6-DEF038 first (product-visible on open), then the words (S11-*), then S4-ROWWRAP, then the two drives.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line. Re-run its
  reproduction at HEAD before building. A row that no longer reproduces is closed in the ledger with the commit that
  fixed it, not fixed again.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:` if it has a `kit:`).

## 6. Related work and collisions

- 🔴 **The island rows (S11-ARIALABELWORDS, S18-TOUCHBUILD, S7-OLIVEDRIVE) are template faults.** README §6 routes those to
  **P108 IW-010** (the island rebuilt in native nodes). If IW-010 is running, hand them there instead of building them here.
- Nightbook's generator (`tpl011Template.ts`) has been untracked since 2026-09-27. Read its owner (P78 TPL-011) first.
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

## 8. Record

### s45 (2026-10-11) — 4 of 7

IW-010 has not started (P108's last commit 2026-10-04), so §6 keeps the island rows here.

| row | state | what happened |
|---|---|---|
| DEF038 (medium) | ✅ `f7d3bcc2b` | Re-measured: 2 keys left of 6 (s42's DEMOSTUBWIRES took the writers' inputs). The demo has a generator (`tools/build-demo.mjs`): its responders carried no pin. `responder()` pins `true` (what the runtime does with the key absent). Control: HEAD's builder reproduced the committed demo byte for byte. The gate's one red is Nightbook (P78's untracked pile) |
| TOUCHBUILD (medium) | ✅ `5778f4b1c` | Diagnosed: the spa stood finished "in 0 s" — since P108 s9 the Workshop builds each part. A real change sat under PAY: building had paid nothing since 3 Oct (s7 read Pip +6, Cobble +4). **Asked; ruled "Building pays nothing".** The drive reads carrying in the Workshops, pills at rest, and PAY as ruled: 31/31, its first green since 2026-10-01 |
| ARIALABELWORDS (medium) | ✅ `822081831` | The words drive gained ARIA: red on HEAD (8 English), green after (L’île, Le jardin, the divider, Mon robot, and each robot card by its own name). `isl037AriaLabels` with an arm |
| OLIVEDRIVE (low) | ✅ `07392a4ed` | 19/3 at HEAD, as filed. Both requests' `referenceProgram` now begin by picking the can up (R7); the drive's programs gain those blocks: 22/22 |
| ROWWRAP (low) | ⏸ P78 | Its landing-pages row was fixed on 2026-10-02 by ISL-022 (`db086d75f`); the three Nightbook rows wait on P78's pile |
| DBTPAGETITLES (low) | ⏸ WIREDTITLE | The app ships English only, so nobody reads an English tab in French today; the editor warns on 11 titles. The proposed wire would do nothing: the Router never reads a wired title. Filed P109-S45-WIREDTITLE (read, not driven) |
| NIGHTBOOKHOME (medium) | ⏸ P78 | Nightbook's generator is untracked (P78) |

