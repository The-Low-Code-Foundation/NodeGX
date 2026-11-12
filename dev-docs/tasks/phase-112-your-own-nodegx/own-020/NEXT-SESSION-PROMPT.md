# OWN-020 — the session after the 0.2.4 candidate's rounds (Opus)

**Written 2026-10-20 ~14:40 CEST by the Opus session that packed the 0.2.4 candidate and ran DeepSeek on the Cline kit;
"Next" updated ~14:50 CEST by the session that fixed UNWIREDSIGNAL.**
Read, in order: this file; `../OWN-020-THREE-HARNESSES.md` §7 (acceptance), §10 (R41–R47), and §12's last three
entries ("The 0.2.4 candidate, packed and mock-rounded", "AC5's DeepSeek rounds on the 0.2.4 candidate's Cline kit",
and the option 4 entry above them); `round-cline.mjs`, `stream-tap.mjs`. Then the memory index, lane 5.

## Where it stands (2026-10-20, `cline-dev` at `d9a7383fc` + this session's close-out commit + peers')

Richard's question: can the Cline / DeepSeek V4.1 Flash version be declared done like the Mistral one and published?
**Closer, still not yet**, for two reasons he has to rule on (below) and because npm 0.2.3 isn't finished.

**Done and committed:**
- `d9a7383fc` **the OWN-020 pile**: the task file, `own-020/` (round-cline, mock-model, stream-tap, this file), five bug
  files. Read first: no `.env` key value and no key-shaped string in any (the scan's control found the variable name).
- **R47 (Richard): the Cline kit may move its OWN marked entry to a newer release**, never a person's own. Already the
  built behaviour (`377d4d312`).
- **P112-OWN020-UNWIREDSIGNAL filed** (open, medium, kit preview): a Function calling an unwired signal
  (`Outputs.done()`, no `out-done` wire, no saved port) throws "is not a function" from disk; the spec says the run
  succeeds. Lead only: minimal repro and the editor side unmeasured.

**Done, not committed anywhere (by design):**
- **The 0.2.4 candidate**: worktree `OpenNoodl-worktrees/own020-pack024` (local branch, `a6544370c` = `a93f0d2ed` + the
  version bump only there); tarballs in `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/tgz024/` (mcp,
  preview, create-nodegx, -vibe, -cline 0.2.4; shasums in §12). 0 first-party bundle inputs from outside the worktree.
  Tested from the tarballs in an empty HOME: create-nodegx, create-nodegx-cline (one marked entry in Cline's file),
  -vibe, the MCP through Cline's `call_tool` path (`set_element_style` reached via `find_tools`), the preview.
  `create.test.js` 32/34 in the worktree (26 and 34 = the known worktree resolution artefact, read off the assertion).
  **It is a candidate, not the cut:** `cline-dev` still says 0.2.3, and the real cut also owes project-contract 0.2.1
  (`3cb9eb745` changed it) and a lockfile bump.
- **Rounds on it (ClinePass spend, Richard's go):** kc-mock2 $0 ✓; **CDQ2** direct → died 14.5 min; **CDQ3** tap/record →
  died 6 min, **bytes saved: the error is IN-BAND from ClinePass's gateway** (`AI_InvalidResponseDataError` chunk,
  `finish_reason: "error"`); **CDL2** tap/record → **18/19**, every behaviour ✓ (✗ font); **CDQ4** tap/retry → **12/12**,
  carryover clean, **double tap NOT clean**, one silent reply re-asked by the tap. Gallery :4900 (CDQ4 :4925, CDL2 :4924),
  left running for Richard's eye; `GALLERY=own-020 node own-019/gallery.mjs stop` stops it.

## Settled this session (where the plan of record was wrong)

- The handoff said "CDQ2 and CDL2 on the candidate for AC5's **second** passes". AC5 says twice in a row **on one kit
  version**; CDQ1 / CDL1 were tgz35 (0.2.2's core kit). Strictly, 0.2.4c has one pass each. Ruling owed (below).
- "Direct vs tapped at the same hour" was the stream question. Answered better than planned: the tap in record mode
  caught a death, and the error object is in the gateway's own stream. The client is not the cause.
- `kc-mock1`'s pinned Cline install had been cleaned away with its scratchpad; this session's is
  `e824a1ee-…/scratchpad/cline-3.0.71` (it will go the same way: reinstall `npm i cline@3.0.71` in a scratchpad).
- Headless Chrome with `--virtual-time-budget` produced nothing on this Mac; plain `--dump-dom` / `--screenshot` worked.

## Next, in order (an agent alone)

Done 2026-10-20 evening (§12's last entry): **UNWIREDSIGNAL fixed in `3026899d4`** (runtime `placingSignalPorts`; from
disk the throw happened wired too, so the bug's first workaround was wrong) and **CDQ4's double tap read**: the model's
design (`lock_gate` is a literal-`true` fan-out, by its own comment), not the kit's; no kit note.

1. ~~The 0.2.4 cut~~ **PUBLISHED 2026-10-20 19:50, all six verified** (§12's last entry; AC7 met). Next for an
   agent: the CHANGELOG "npm packages 0.2.4" line and the site's npm section, through the content-authoring skill
   (public copy: Richard sees the words before they go anywhere).
2. Nothing else is an agent's alone until Richard rules (below).

## Waits on Richard

- ~~AC5 ruling~~ **ruled R48 (2026-10-20): yes to both.** AC5 for Cline is met by DeepSeek V4.1 Flash; AC8's words
  must say what the retry tap hides. OpenCode's half of AC5 is still open (no Launch round yet).
- ~~His bars~~ read 15:22: the four rounds = 10% of a 5-hour window (§12). ~~Raise it with Cline?~~ Filed:
  https://github.com/cline/cline/issues/15214. Watch it for a reply.
- **npm 0.2.3: Richard re-ran the publish at ~15:20 CEST** (in flight then). Was half out (12:04 CEST: mcp, preview, create-nodegx, create-nodegx-vibe still 0.2.2). He re-runs
  `scripts/own/publish-npm.sh /Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.3-tarballs`.
- **Option 4 step 2** ("adopt, keeping what's there") is its own task when he wants it; step 3 is his by-eye call.
- AC6 (his own Cline run) and AC8 (the claim's words, through the content-authoring skill) come last.
