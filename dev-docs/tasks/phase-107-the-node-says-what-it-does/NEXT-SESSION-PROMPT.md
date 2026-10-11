# P107 — next session

**Written 2026-10-11 (s88, Opus).** Read the [README](README.md) §2–§7 (**R21 and R22 are the newest rulings**). Then
[NSP-021 §6.2](NSP-021-THE-SECOND-EDITOR.md) (what s88 measured and built) and the census's
[§5 "the source after"](NSP-021-EDITOR-KNOWLEDGE-CENSUS.md).

**Model: Opus.**

**s88 in one paragraph.** The R20 drive could not run again: a peer's editor (P112 OWN-011) held port 9222. So s88 did
NSP-021's `typecasts`, and measured first. Over 201 projects (31,026 wires typed at both ends) the agent's checker and
the canvas differed on **0** wires. Both refused the same 34, and **30 were one defect**: since Items became an
`optionslist` (2026-09-05), nobody could wire a list into a Dropdown's Items. That is **P107-S88-OPTIONSCAST**, filed.
Richard ruled both questions in one go. **R21** "Allow it, and fix bare labels" and **R22** "The canvas's rule". Built:
the table and the rule moved to **`@nodegx/project-contract/typecasts`** (the runtime imports it, so it is one table,
not a copy; `813657773`). Then **Dropdown v8**: a word in a wired list is an option (runtime `optionItems`, spec,
stranger round 4; `fecab7823`).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 `contract`; s85 `ports` (`floor.ports` **132** since s87) | `6a1ed0084`, s65, s85, s87 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 L1–L5 ✅, AC4 ✅, R19 ✅, oracle (c) ✅, R20 ✅ (s87; **its drive is owed**). Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| **NSP-021 the second editor** | 🟡 AC1 ✅ (s87); §3.2: Navigate, Cloud Function (s87), **`typecasts` ✅ s88 (R21, R22)**. Round trip (§3.3) = P112 OWN-006 | s87, `813657773`, `fecab7823` |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

## What s89 does (in order)

1. **Two drives in the running editor, one launch.** Check `lsof -nP -iTCP:9222 -sTCP:LISTEN` and the peer list
   first, and never run a second stack. Open a COPY of `NodeGX test projects/CMG Drive Looks B` with the `run-editor`
   skill (opening a project writes three files into it).
   (a) **R20**: read `ProjectValidationService.instance.report`. The For Each `addToBasket` wire must be an error
   naming `itemOutputSignal-addToBasket`.
   (b) **R21**: on a page, drag a Static Data's `Items` onto a Dropdown. The popup must offer Items, the wire must
   connect, and the Problems panel must show no type warning.
   A screenshot of each is the evidence.
2. **`allowAsChild` / visual-ness** (census §2: the catalog mirrors the rule by hand three times). Measure first, as
   s88 did: where do the editor's answer and the agent server's answer differ, over Richard's projects? The census
   script is in s88's scratchpad pattern: esbuild a `.ts` scan from `src` with `--alias:@nodegx/node-spec=…/src/
   browser.ts --alias:@nodegx/project-contract=…/nodegx-project-contract` (the node-spec `dist/` is stale). Keep a
   known-firing control beside any zero.
3. Display name / deprecation at node level; Router (ADAPTERLABEL) only if a reason appears.

**The L1 recipe, for any spec that moves later** (s82 + s83 + s84 + s87, one step per line):
- grep the runtime node's `registerOutputIfNeeded` callers;
- write `wiredOutputs` from the gated names the HEAD trace mentions (s87: a script reading `golden/<type>.json`; keep
  the file's indent and trailing newline — round-trip the HEAD text first);
- move the spec (`onWire` on the derived output, `discoverOutput`, the send asks `world.hasOutput`);
- diff the traces by scenario name (NOT `golden --check` alone: a moved input hash also reads "stale");
- run the interpreter with mutants at seeds 13 and 20728, and the runtime at 200 with seed 20737;
- for a seed-only survivor, run HEAD's spec at the same seed first, then add the hand scenario that kills it;
- add the oracle cases and a planted break;
- run both graph suites.

**Oracle (c) recipe (s87):** a jest test in `noodl-editor/tests-unit/nsp-020/` can run a REAL editor adapter by mocking
`@noodl-models/projectmodel` (`getNodesWithType`, `getComponentWithName`), `@noodl-models/warningsmodel` and
`@noodl-models/nodegraphmodel` (CloudFunctionAdapter also needs `@noodl-models/componentmodel`). Copy the node's params
BEFORE running the adapter, because RouterNavigateAdapter writes `router` into them.

**The survivor recipe (s86):** reproduce on the INTERPRETER at the deep run's own seed. Find the generated sequences
that reach the branch with `discoverBranches(spec).spec` and its `hits`. A sequence that ENDS at the branch is the hole,
so the killing scenario puts a READER after it.

**Human decisions:**
- NSP-019 AC3 and its three choices; C160; C161; C162.
- **P107-S84-USERACL**: should the User family hide `ACL` like the Record family?
- The Frappe note in NSP-010 §4 is owed to Richard **before the first `changes` entry answers `project`**. None does yet.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**Open, filed this phase:** P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM;
P107-S79-ADAPTERLABEL (low; s87 note: it no longer blocks oracle (c)). **Fixed s88:** P107-S88-OPTIONSCAST (R21) — its
drive in the running editor is step 1(b). Rocket School's keyboard (`noodl-mcp/tests/tpl007Components.ts` :1729) feeds its
Dropdown through a Function only to dodge it; back to Static Data is the template owner's call.

**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT (drop
`KNOWN_ROWS.States` and the States scenario's `row` in the same commit) and P107-S82-STATESLOADGATE (two pins in
`nsp-020-module-table.ts`). **P112 holds:** P107-SIZE.

## Gates (s88, this tree)

- editor: `tests-unit/nsp-021/typecasts` 4 / 4 (planted: the old signal leniency → red); `tests/validation/catalog-index`
  and the cast-rule suites under the editor's jest (`--testMatch '<rootDir>/tests/validation/…'`): 129 / 130, the one red
  is `rules.test.ts` nonexistent-port "lists available alternatives" (alternatives order; that rule never reads the cast
  rule — not s88's); `tests-unit/nsp-020/problems-panel-wire-check` green; `tsc` editor 0, `typecheck:editor-tests` 0.
- runtime: `tsc` 0; `nda-014-outbound-string-cast` + `nodelibraryexport.port-descriptions` 15 / 15; conformance
  `NSP_ONLY=net.noodl.controls.options NSP_SEED=20737`: v8 CONFORMS, 66 / 66 scenarios, 200 / 200 (planted: the bare-word
  mint removed → exactly the two new scenarios red).
- node-spec: Dropdown on the interpreter with mutants at seeds 13 and 20728 — conforms, 0 survivors, 0 unreached;
  `spec-golden:check --type net.noodl.controls.options` 0 (no existing trace moved); stranger hashes refreshed (2 lines,
  both s88's). Stranger round 4 (Dropdown) 66 / 66 and the hash check green.
- viewer-react corpus `nda-012-dropdown-items` + `p82-dropdown-default-items` 18 / 18.
- `catalog:check` 0 (the catalog moved by the one `optionslist` row); project-contract `tsc` 0.
- MCP `nsp020WireCheck` + `nsp020DrawnPorts` + `isl042CloudFunctionPorts` + `toolDisclosure` + `def011ScriptPortsDrive`
  32 / 32.

**Not run:** the whole MCP suite, `test:main`, `test:ci`, the full node-spec jest suite (the whole stranger file ran past a 15-minute limit; rounds 1–3 untouched by s88), and both
drives in the running editor.
