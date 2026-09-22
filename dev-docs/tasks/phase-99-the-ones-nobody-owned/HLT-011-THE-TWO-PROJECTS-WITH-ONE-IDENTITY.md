# HLT-011 — The two projects with one identity

✅ **BUILT 2026-09-21 (session 7). Clicking the second of two cards sharing one identity opens the
second project — driven, control opens the first one on the identical fixture, 9/9 arms each.**
[verdict](./verdicts/HLT-011/2026-09-21/VERDICT.md) ·
`scripts/devtools/drive-hlt011-identity.js` · `tests-unit/hlt-011/projectIdentity.test.ts` (12)

🔴 **§2 measured TRUE — the second task file in this phase that did — and the origin turned out to
be written down already.** P73 `TUT-001`'s verdict records *making* this collision: it cloned the
store entry of the project it copied so the copy would inherit the backend. That backend is
`backend_msjck0y2ukxwv`, **"Puppy test 3 backend"**, and both projects own it today. A drive
fixture is a write to the user's machine, and it outlives the session that made it.

⚠️ **AC4: the collision on Richard's machine is LEFT, deliberately and explicitly** — re-minting
an id moves a datastore. The editor now *says* it; the repair is a person's call.

✅ **RULED 2026-09-22 (P99 s21). Richard: *"I'll end up deleting these projects at one point,
there's a million from all the phases and they're just taking up space. Do whatever."*** So AC4
closes as **left, by decision, not by omission** — no re-mint, no datastore move. The detection
ships; the two rows keep their shared `id` until he deletes them.

🔴 **What that ruling does NOT retire.** The detection is the criterion, and it is built and
driven. The collision on this machine was a *fixture* — P73 `TUT-001` cloned a store entry so a copy
would inherit `backend_msjck0y2ukxwv` — and the reason it mattered was never the disk space. It was
that the launcher addressed rows by a field two rows shared, and eight `.find(p => p.id === …)`
reads answered honestly about the wrong project. That is fixed by addressing rows by their
directory, and deleting the fixtures neither proves nor unproves it. ⚠️ **A later session must not
read "Richard deleted the projects" as "the defect is gone"** — the next clone makes another one,
and the warning is what catches it ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).

**Opened by HLT-003 on 2026-09-21, from a measurement rather than a suspicion. Two different
projects on this machine carry the same project `id`, and the launcher addresses rows by it.**

## 1. The person sentence

> **Clicking a project on the launcher opens that project, and the settings it remembers are its
> own.**

## 2. What is measured, and what is only mechanism

**Measured**, `<userData>/recently_opened_project.json`, 2026-09-21, 104 entries:

| entry | directory | `id` |
|---|---|---|
| `tut001-drive` | `…/NodeGX test projects/tut001-drive` | `692d3658-f11a-10db-e6c8-6b000f774898` |
| `Puppy test 3` | `…/NodeGX test projects/Puppy test 3` | `692d3658-f11a-10db-e6c8-6b000f774898` |

Also measured: `tut001-drive/nodegx.project.json` carries that same `id` on disk; `Puppy test 3`'s
project file has **no `id` field at all**. And a 128-bit `Math.random` collision across 104 entries
is not a credible explanation, so the id was **copied, not generated**.

**Mechanism, read from the code and not yet driven:**

- `LocalProjectsModel.getProjectEntryWithId` is a `.find(…)` — it returns the **first** match. The
  launcher grid's `onClick` passes `project.id`, and `fetch()` sorts most-recently-opened first, so
  today a click on *Puppy test 3* resolves to *tut001-drive*.
- `projectmodel.ts` documents `project.id` as *"the project's durable identity, and the ownership
  key a backend is bound to"*, read by `BackendServices/provisionBackend.ts` as the ownership half
  of `findReusableBackend`. Two unrelated projects claim one backend's ownership.
- `_addProject`'s own comment says the id is *"used internally to store project specific local
  settings"*, and `loadProject` calls `setCurrentGlobalGitAuth(projectEntry.id)`. Both are shared
  between the two projects.

🔴 **None of the three consequences above has been driven.** They are what the code says, which is
why this is a row with acceptance criteria rather than a claim in a verdict
([[a-relayed-conclusion-decays-faster-than-a-relayed-measurement]]).

## 3. What HLT-003 already did, and deliberately did not do

**Did:** the launcher grid now keys on the project **directory** — a row *is* a project directory —
and `recentProjectRows.ts` guarantees one row per directory. That removed all 62 duplicate-key
events. HLT-003's verdict has the control pair.

**Deliberately did not:** touch the colliding `id`. Re-minting one of the two would silently change
which project owns a backend, which is a decision about ownership, not a repair of a warning. The
collision is **still present in the store** and is therefore still reproducible for whoever builds
this.

## 4. Scope

**In:** how the launcher addresses a row it wants to open, and whether two projects can hold one
durable id. The three consequences in §2, each driven before it is fixed.

**Out:** the React key (HLT-003, done). The `nodegx.project.json` format. Any change to what
`findReusableBackend` *means* — if the fix needs that, it needs a ruling first.

## 5. Acceptance criteria

1. ✅ **(drove it first)** A driven session demonstrates the misrouted open: with the two colliding
   entries present, clicking the lower card opens the other project. If it does **not** reproduce,
   that is the finding and this row closes as disproved — with the reading recorded.
2. ✅ **Addressing a row does not depend on a field that can collide.** The launcher opens by
   something unique per row. ⚠️ Note `retainedProjectDirectory` is unique only *because* HLT-003's
   de-duplication makes it so; a fix that leans on it inherits that dependency and should say so.
3. ✅ **Two projects cannot come to share a durable id**, or if they can, the editor detects it and
   says so rather than resolving it silently. A spec covers whichever is chosen.
4. ✅ **The existing collision is explicitly LEFT**, with the reason written down. If healed,
   a control shows what happened to the backend ownership and git auth that were keyed on it —
   silently moving either is the defect this row exists to avoid causing.
5. ✅ `test:ci` at the floor (8 by name); `typecheck:editor` 0; `test:main` green.

## 6. Landmines

- 🔴 **`project.id` is persisted and read back, and "copy a real project to drive it" is this
  team's standard practice.** Whatever the fix is, a copied directory must not be able to
  manufacture a second entry with the first one's identity.
- 🔴 **`projectmodel.ts`'s constructor comment warns against minting on load** — *"two copies of the
  same project would then diverge silently"*. That note anticipated this and chose the other
  failure. Read it before changing where ids come from.
- ⚠️ **The launcher store is 7.4 MB** because entries carry base64 thumbnails. Read it with a script,
  not by opening it.
- ⚠️ **HLS-009 AC3 pins the single writer of that store by `file:line`.** Editing
  `LocalProjectsModel.ts` above line 100 moves it and turns that gate red; the pin is a location,
  the property is the *count*.
