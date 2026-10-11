# TBM-000 — The prototype, measured

**Opened 2026-10-11.** **Status: 🟢 built and gated, s1 (2026-10-11, Fable): `prototype/check.mjs` PASS ×3, 29 checks.**
**Model:** either. The page is plumbing Orbit already proved plus a costume layer; a wrong reading here costs an afternoon, not a release.

## 1. The person sentence

> **A kid presses a button and a balloon pops; they turn the wall over and it is the same machine with real names; they
> write a formula on a chalkboard and the balloon waits for the third marble — and every one of those is a write into a
> project the official editor opens.**

## 2. What was built

[`prototype/README.md`](prototype/README.md) is the description; the README's §1 is what was measured first. In one
paragraph: `tchac-boum.html` (one page, DOM + SVG, no Three.js) holds the v2 project `tchac/` in memory through
`V2ProjectStore`, mounts the real app beside the wall with `@noodl/preview`'s page bundle, reads ports from
`@nodegx/node-spec` with a French nickname dictionary on top, draws sixteen parts in costume at the files' positions,
rolls a marble along a string when the trace reports a signal on that wire, flips every part to the editor's card on one
press, takes parts from a shelf, ties strings through a connect popup that shows the nicknamed ports first, edits dials
and costumes in a panel, and checks three missions by playing a copy of the files in a second real app.

## 3. What it invented, and what the kit now owes

| invented here | owed to |
|---|---|
| the costume in `metadata.tchac.skin` (the first home-made editor to keep its own annotation in the files) | nothing: the schema allows it (`additionalProperties: true`, `metadata` listed). Worth a sentence in OWN-007's brief: *an editor's own data goes in `metadata.<editor>`*. |
| "few connectors, in French": a `FR` dictionary per type, the connect popup's front list + *Toutes les prises* | nothing; a rule for TBM-006 to audit |
| `pending` (rebuilds in flight) read by the gate before each real input | a line in OWN-007's brief: *a gate must wait for the rebuild the page's own edits await* |
| a costume reads a lone output and sees nothing | **P117-S1-UNWIREDOUT** (kit: preview), TBM-005 |
| Orbit's plumbing re-typed rather than imported | OWN-007: name the shared pieces so the third editor imports them |

## 4. Acceptance criteria

1. ✅ The page starts on the real app from the v2 files; a real press on a costume presses the real button; the chain is
   in the trace. (gate block 1)
2. ✅ Shelf, string, dial, cut, move, remove — each with real input, each read back from the files; the app rebuilt
   except for a move. (gate block 2)
3. ✅ The flip turns the same elements; the back says the real type. (gate block 3)
4. ✅ Three missions: fail first for their own reason, pass after Montre-moi, hold together; played on a copy. (gate block 4)
5. ✅ No console errors or exceptions across the drive.

## 5. Runs

| run (2026-10-11) | result |
|---|---|
| smoke (`scratchpad/smoke.mjs`): open, press, both faces | ready 18/15/16, export 10 ms, frame 164 ms; 💥 after one press; 9 wires seen; 0 problems |
| missions script | each check false on the start graph (ballon éclaté avant la 3e; les deux chats dorment; 1 bille après 5 s); each Montre-moi true (7.5 s, 8.9 s, 10.6 s); 21 nodes / 24 wires |
| `check.mjs` run 1 | **FAIL 5** — the connect popup pre-picked nothing (the Button spec has 22 outputs, several signals) → the "few connectors" rule built; the gate pressed during a rebuild → `pending` exposed |
| `check.mjs` run 2 | **FAIL 3** — the move raced the rebuild; the chain read once (a batch landed after the 💥); an assertion on an unwired output (§3) |
| `check.mjs` runs 3, 4, 5 | **PASS, PASS, PASS** — 29 checks |
