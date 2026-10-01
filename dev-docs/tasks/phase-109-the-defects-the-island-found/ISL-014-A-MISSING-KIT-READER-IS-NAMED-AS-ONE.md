# ISL-014 — A missing kit reader is named as one

**Status: 🟡 fix landed 2026-10-01 (session 1, `aab96a056`, route (a)) — AC1–AC4 green; AC5 waits on the 🔒 ruling (a)/(b); AC6 owed.** Scoped 2026-10-01 at `27d891bf3`. Takes ownership of register **D83** (owner was
`NONE`). **Source:** [the island audit](AUDIT-2026-10-01.md) row **F18** · [P78 D83](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md)
(TPL-011 on `ubuntu-latest`, 2026-09-26) · met again by P106 [IG-001](../phase-106-the-island-grows/IG-001-THE-FIXES.md)
deviation 8 and every garden worktree lane · **Side:** product (MCP door: kit overlay and write refusals; dev tooling)

The MCP door learns a project's kit nodes by running a bundled reader, `packages/noodl-mcp/dist/kit-extract.cjs`.
That file is a gitignored build output. Without it, every write that places a kit node is refused with *"ensure the
module is installed"*. The module **is** installed. The server knows the reader is missing and says so in another
tool's answer, but not in the refusal the author is looking at.

## 1. The person sentence

**An author or agent whose kit node is refused is told the true reason, and the one command that fixes it, in the
refusal itself, and a fresh checkout of the repository either has the reader or builds it.**

## 2. What was measured

Read at HEAD `27d891bf3`, 2026-10-01, by the author of this file. Nothing was run.

| reading | where |
|---|---|
| **The reader's path.** `resolveKitExtractEntry` honours `NODEGX_KIT_EXTRACT`, else probes `dist/kit-extract.cjs` beside the bundled server and one level up from `src/`. Re-read at HEAD | `packages/noodl-mcp/src/kitExtract/extract.ts:132-153` |
| **The good sentence exists.** With no bundle, the overlay comes back `unavailable` with *"The kit extractor bundle is not present in this installation, so this project's own node types could not be read. Run `npm run build` in packages/noodl-mcp, or set NODEGX_KIT_EXTRACT to a built kit-extract.cjs."* Every other failure (timeout, non-zero exit, non-JSON) is also `unavailable` with its own reason. Re-read at HEAD | `extract.ts:181-232` |
| **Where the sentence reaches today:** `get_project_info`'s kits report (`unavailable`), `install_prefab`'s kit-load failures, the lesson tools, and `scripts/validate-project.ts`, which prints `WARN kit node types … could not be read: <reason>`. Re-read at HEAD | `noodl-mcp/src/tools/read.ts:90-121`; `tools/libraryTools.ts:438-442`; `tools/lessonTools.ts:284-285`; `scripts/validate-project.ts:146-148` |
| 🔴 **Where it does not reach: the refusal.** The write gate's diagnostic comes from the editor's shared rule: *"Unknown node type "X" — not found in the node catalog. If this is a module-provided node, ensure the module is installed; otherwise it may be a legacy or misspelt type."* The rule sees only the catalog. Nothing in `noodl-mcp/src` adds the overlay's state to it (grep `unknown-node-type` in `noodl-mcp/src` → 0). Re-read at HEAD | `noodl-editor/src/editor/src/validation/rules/unknownNodeType.ts:43-56`; formatter `validation/diagnostics.ts:1363-1378`; callers `noodl-mcp/src/tools/author.ts:404`, `tools/planTools.ts:522` |
| ⚠️ **When the rule finds a near-miss, the module sentence is dropped** and the refusal says only *"did you mean `<built-in>`?"* (`:52`). A kit type with a near-miss name is pointed at a built-in. Re-read at HEAD | `unknownNodeType.ts:50-56` |
| **The reader is read once per bind.** `installProjectOverlay` is idempotent per directory. Only `create_node_kit` and `install_prefab` re-read (`refreshProjectOverlay`). So building the reader while a server is bound changes nothing until it is re-bound or restarted. Re-read at HEAD | `noodl-mcp/src/kitOverlay.ts:45-77` |
| **It is gitignored and built by `build.mjs`** (3,734,700 bytes on the primary, built 2026-09-27 09:15). The packaged editor ships it (`package.json` `build.files`: `../noodl-mcp/dist/kit-extract.cjs` → `noodl-mcp/kit-extract.cjs`), and the npm package's `files` includes `dist`. So the gap is checkouts, worktrees and CI. Re-read at HEAD | `.gitignore:117`; `noodl-mcp/build.mjs:105-133`; `noodl-editor/package.json:130-131`; `noodl-mcp/package.json` `files` |
| **Three workarounds carry it.** The nightbook workflow builds it (*"(P78 D83)"*); `make-worktree.sh` symlinks the primary's whole `noodl-mcp/dist` into each worktree (commit `33f6c4cb4`); generators set `NODEGX_KIT_EXTRACT`. Re-read at HEAD | `.github/workflows/nightbook-desktop.yml:34-37`; `scripts/devtools/make-worktree.sh:139-150` |
| 🔴 **The symlink shares one bundle across every lane.** A lane that edits the reader's inputs (`entry.js`, the viewer's bridge, the built-in register) and rebuilds writes into the **primary's** `dist`, under every other lane. A lane that does not rebuild reads the primary's bundle, not its own source. Read from the script; not run | `make-worktree.sh:143-147` |
| **Staleness today:** the primary's bundle (09-27 09:15) is newer than `entry.js` (09-16) and `react-component-node.ts` (09-17). IG-001 dev 8 recorded the same. So it is not stale at HEAD by modification time. Nothing checks that. Re-read at HEAD (`stat`) | as cited; IG-001 line 122-125 |
| The refusal text and the CI run (`36250389583`). **As recorded in D83 2026-09-26, not re-run** | register line 3241-3262 |

## 3. Where it bites a person

- Anyone who clones the repository and authors through the door before building `@noodl/mcp`: CI, a new worktree, a
  new contributor, an agent in a clean sandbox. The refusal sends them to reinstall a module that is installed.
- It reads as "works on my machine", because a machine that built the package once never sees it.
- A lane on a shared bundle can pass on code it does not contain, or break its neighbours by rebuilding.

## 4. Related work and collisions

- **D83** itself: this task owns it. The builder updates D83's owner column to ISL-014 when AC2 lands (another file;
  not edited by this scoping).
- **P69 [CN-003](../phase-69-the-node-you-write-yourself/CN-003-THE-PROJECT-CATALOG-OVERLAY.md)** ✅ built the overlay
  and the `unavailable` distinction (*"Absent is not the same as empty"*, `extract.ts:39-45`). This task carries that
  distinction one step further, into the refusal.
- **P69 [CN-002](../phase-69-the-node-you-write-yourself/CN-002-NAME-THE-HOLE.md)** ✅: the same lesson one layer up.
- **TPL-005**'s note on *"the catalog is built from built-in node types only"* (named in D83 as the same family).
- **[ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md)**: a kit that **failed** in the reader (for example, it used a
  dependency at definition) is refused with the same wrong sentence. The fix here should name a kit failure too.
- **[ISL-017](ISL-017-THE-DOOR-INSTALLS-A-KIT.md)**: installs go through the door; it re-reads after an install.
- Memory: *"a worktree has no gitignored build output"* (the phase's harness note), the reason for `33f6c4cb4`.
- Owner grep: `grep -rlai --include='*.md' "D83\b\|kit-extract\|kit extractor bundle" dev-docs/tasks` → 14 files
  outside this phase: D83 (register row 62 and the section), TPL-011-DESKTOP line 278, P78's handoff line 193, IG-001,
  IG-007, CG-003 lines 106 and 163 (the env-var workaround), CG-005, CN-003, CN-017, GAM-014, GAM-018, GAM-024 line 27
  (reuses the reader), TVW-001 and P82 TASKS (mentions of the bundle). None owns the refusal or the checkout gap.

## 5. Design — 🔒 rulings first

[README §5](README.md) puts this task in slice 0. **The refusal sentence needs no ruling: build it first** (AC1-AC3).
One question about a fresh checkout does need Richard, and it does not block the sentence:

1. 🔒 **What should a checkout do when the reader is missing?**
   - **(a) Say so, and nothing more.** The refusal names the reader and the command. Contributors run it once.
   - **(b) Build it on demand.** When the server runs from a checkout (its `src/` is present and esbuild resolves), and the
     bundle is missing **or older than its inputs**, it builds the reader once, in a few seconds, then reads. A
     packaged install never does this; it ships the file.
   - **(c) Commit the bundle.** 3.7 MB of generated code, rebuilt by every change to the runtime's node library. Every
     lane merge would conflict on it (the pain of audit F19), and a forgotten rebuild ships a stale reader silently.
   - **Recommendation: (a) now, then (b)** with a staleness check, so worktrees stop sharing one bundle. Not (c).

Design constraints, whatever the ruling:
- The message is added **where the overlay is known**: either the MCP door rewrites an `unknown-node-type`
  diagnostic when `currentKitOverlay()` is `unavailable` or has `failures`, or the rule's context carries the
  overlay's state. The editor and `validate-project.ts` share the rule; whichever route is taken must not make the
  editor's own message worse.
- The new sentence says three things: the reader could not run (and why, from `unavailable.reason`), the module may
  well be installed, and what to do, including **re-binding or restarting the server**, because the overlay is read
  once per bind.
- A kit that **failed** in the reader is named with its failure message, not with "ensure installed".
- A near-miss suggestion must not replace the kit sentence when the type looks like a kit's (`<module>.<Name>` with
  `<module>` a folder in the project's `noodl_modules`).

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** In a scratch project with a kit installed in `noodl_modules/`, start the door with `NODEGX_KIT_EXTRACT` pointing at a path that does not exist (🔴 never by deleting or moving the shared `dist`). `create_component` placing the kit node: record the refusal text, and that `get_project_info` in the same session reports `kits.unavailable`. **Known-firing control:** the same call with the reader present passes. A second arm: a kit whose `main` throws at definition; record its refusal and its `failures` row. |
| AC2 | **The refusal names the reader.** Both arms of AC1 now say the true reason and the command; the module sentence is gone from them. A plain misspelt built-in type still gets *"did you mean"*. **Reverted arm:** remove the rewrite and AC1's text returns, by name. |
| AC3 | **The near-miss trap.** A kit type whose name is one edit from a built-in, with the reader missing, is refused with the reader sentence, not "did you mean `<built-in>`". **Sabotage arm** included. |
| AC4 | **The editor is unchanged.** The editor's validation of a project with an unknown, non-kit type reads byte-for-byte as before (a spec on the rule's output). |
| AC5 | **The ruled checkout behaviour.** Under (b): a fresh worktree made by `make-worktree.sh` with **no** link for `noodl-mcp/dist` builds its own reader on first bind, inside the worktree, and a reader older than `entry.js` is rebuilt. **Sabotage arm:** touch `entry.js` and the next bind rebuilds. `make-worktree.sh` stops linking `noodl-mcp/dist`. Under (a): record why the link stays. |
| AC6 | **Person sentence, end to end, on a deployed page.** From a fresh checkout state (reader missing), an agent places a kit node, reads the refusal, runs the command it names, re-binds as told, places the node, and the page deploys with the kit node drawing. Screenshot looked at. |

## 7. Traps

- 🔴 **Never reproduce by deleting the shared bundle.** Worktrees link the primary's `dist`; removing it breaks every
  peer lane at once. Use `NODEGX_KIT_EXTRACT` at a missing path (AC1).
- 🔴 **Building in a worktree writes the primary's `dist`** while the symlink stands (`make-worktree.sh:147`). AC5 must
  run in a worktree without that link.
- The overlay is read once per bind. A test that builds the reader and retries in the same session reads RED for a
  reason that is not the defect.
- `unavailable` and "no kits" are different answers (`extract.ts:39-45`). Do not collapse them to make the message simpler.
- The reader runs kit code. A kit that logs on stdout breaks the JSON answer (register D84's note on `entry.js`). A
  "not JSON" reason is a kit fault, and must be named as one, not as a missing reader.
- The editor's validation rule is shared by three callers. Grep its callers before changing its text.

## 8. Record

### Session 1 — 2026-10-01, P109 s1, on `cline-dev` from `22303a534` (committed at `aab96a056`)

**AC1, RED at HEAD, recorded before any change.** New spec `packages/noodl-mcp/tests/isl014KitRefusal.test.ts`: a copy
of `fixtures/kit-app` bound with `NODEGX_KIT_EXTRACT` at a path that does not exist (never the shared `dist/`), and the
control bound with `buildKitExtractor`'s fresh bundle. `create_component` placing `demo.kit.Badge`:

| arm | at HEAD | after |
|---|---|---|
| control, reader built: kit node accepted; `Buttn` → `Unknown node type "Buttn" — not found in the node catalog.` + did you mean `Button` (byte for byte) | ✓ | ✓ unchanged (AC4) |
| **reader missing**, `get_project_info` says `kits.unavailable: NODEGX_KIT_EXTRACT points at … does not exist` | ✓ said there | — |
| **reader missing**, the refusal | *"…If this is a module-provided node, ensure the module is installed; otherwise it may be a legacy or misspelt type."* ✕ | *"…this project's own kit node types could not be read, so a kit node is not recognised here: NODEGX_KIT_EXTRACT points at "…", which does not exist. The module may well be installed. Build the reader with `npm run build` in packages/noodl-mcp, or point NODEGX_KIT_EXTRACT at a built kit-extract.cjs, and restart or re-bind this server afterwards — a project's kits are read once, when it is bound."* ✓ |
| reader missing, `Buttn` | did you mean `Button`, nothing about kits ✕ | did you mean `Button` kept, plus the could-not-be-read sentence ✓ |
| **AC3 near-miss trap**: module folder `Texts`, type `Texts` (one edit from `Text`), reader missing | *"Unknown node type "Texts" — not found in the node catalog."* + did you mean `Text` — the module sentence dropped entirely ✕ | the reader sentence, no suggestion ✓ |
| **second arm**: `throwing-kit` copied beside `demo-kit`, reader built; `demo.kit.Badge` accepted; `throwing.kit.Thing` | the module sentence ✕ | *"A kit in this project failed to load, so its node types are unknown: Throwing Kit (noodl_modules/throwing-kit): this kit is deliberately broken. If this node comes from that kit, the module is installed — fix the kit, and restart or re-bind…"* ✓ |

4 red / 1 green at HEAD → 5/5 after.

**The fix, route (a) of §5** (no ruling needed for it): `packages/noodl-mcp/src/kitRefusal.ts` — `KitAwareValidator extends
SemanticValidator`, overriding `validate` (which `validateComponent` goes through) to run `explainUnknownNodeTypes`
over the report from `currentKitOverlay()`. Constructed in `validate.ts` and `tools/planTools.ts` in place of the bare
`SemanticValidator`, so the write gate, the plan door, `validate_project` and the lesson grader all say it. Untouched
when there is no overlay, when the project has no `noodl_modules` (then "ensure installed" is right), or when every
kit loaded. **The editor's rule is not edited**, so the editor and `scripts/validate-project.ts` read as before (AC4,
also pinned by the control's byte-for-byte clause).

Kit-shaped (drops the near-miss when the reader is missing): a module folder's name, `<folder>.<Name>`, or a dotted
name whose suggestion is not itself dotted — so `net.noodl.ParseFeeed` still gets `net.noodl.ParseFeed`.

**AC2 reverted arm** (`explainUnknownNodeTypes` returning its input, restored `cmp`-identical): 4 failed / 1 passed —
the control stays green, every rewritten arm returns to AC1's text.

**Neighbours:** `kitOverlay`, `gam-014`, `gam-018`, `cn009`, `cn010`, `capability`: green. `cn004` has one red,
*"still errors under strict"* (2 `unknown-node-type` for one stray node), **which the control with HEAD's `validate.ts`
and `planTools.ts` also reads** — pre-existing, filed as `dev-docs/bugs/p109-s1-cn004-…md`, not this task's.
`tsc -p packages/noodl-mcp --noEmit`: no error in any file this task touched (the errors it prints are in peers'
uncommitted P105–P108 specs).

**Owed, with why:**
- 🔒 **AC5 needs the ruling** (§5): (a) stop here, or (b) build the reader on demand from a checkout with a staleness
  check, so worktrees stop sharing one bundle. Recommended (a) now, then (b). Under (a), `make-worktree.sh`'s link stays
  because a worktree has no `dist/` and the refusal now names the one command.
- **AC6** (an agent from a fresh-checkout state reads the refusal, runs the command, re-binds, places the node, the page
  deploys with the kit node drawing, screenshot looked at): a deploy plus a screenshot, one job; not run beside a
  peer's drive.
- **`noodl-mcp/dist` is not rebuilt.** Twelve installed servers were running from it this session and the worktrees
  link it; the installed server carries the old sentence until `npm run build` in `packages/noodl-mcp` is run at a
  quiet moment.

**Register:** D83's owner cell set to `ISL-014` and its status to 🟡, in the working tree only — the row lives in a
peer's uncommitted hunk of the register (since 09-27). The ledger `dev-docs/bugs/p78-d83-…md` is the committed record
(`status: fixed`, `commit: aab96a056`).

🔒 **Ruling to ask (§5):** *"When the kit reader is missing from a checkout, should the door only say so and name the
command (done), or also build it on demand the first time, so a fresh worktree never shares the primary's bundle?"*
Recommended: say so now, build on demand next; never commit the 3.7 MB bundle.
