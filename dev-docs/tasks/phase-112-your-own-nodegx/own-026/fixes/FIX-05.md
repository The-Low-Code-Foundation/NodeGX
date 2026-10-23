# FIX-05 — a row that names an owner must not be the caller's word

**Written 2026-10-23 ~15:20 CEST by the lab session (`opennoodl-8c`). Richard ruled at ~17:20: run it now, in parallel,
like FIX-04.** The test-2 NodeGX chain stays on FIX-03 to the end.

## 🔴 As for FIX-04: do NOT write `KIT`, do NOT touch `HOLD-nodegx`

Pack the kit on **FIX-03's commit (`cb7e0d6e4`) plus FIX-05 only** (not FIX-04, and not the P125 commits since), so
the lab measures this fix alone, into `/Users/Shared/nodegx-lab/kits/FIX-05-<short commit>/`. Then send the lab
(`opennoodl-8c`) one short message. The lab re-runs change 5 from the main chain's `t2-nodegx-c04` on it, twice, in
`own026-fix05/`. It wins if C5.3 and T7 pass and nothing else is lost.
## What happened (LEARNINGS #8)

t2-nodegx-c05 (a teacher invited by email) built a `teacherinvite` row created from the page, with a client-supplied
`familyId`, and a cloud function that returns every child whose `familyId` an invite for the caller's address
names. Replaying another family's invite with one's own address gives that family's children: to a teacher (C5.3)
and to any parent (T7, a regression). Its comment says the rows are server truth: *"No value arrives from the
caller, so there is nothing to forge."* The plain-code arm took the family from the session.
Evidence: `/Users/Shared/nodegx-lab/own026/t2-nodegx-c05/` (the function: `components/__cloud__/Cloud Functions/Teacher
Children/nodes.json`; rules: `home/.noodl/backends/*/security.json`; rows: `data/local.db`, `teacherinvite` with its ACL)
and the grade `own026-grades/t2-nodegx-c05/grade.json` (C5.3, T7: forged-T1.png, forged-famB.png).

## Candidates (measure first; generic, never this app's words)

- **A. The short way is the safe way:** a field that names an owner or a group (`familyId`, `ownerId`, …) can be set
  from the caller on create, by the server (a "the caller's" value in Create Record, or a rule that stamps it), so the
  page never sends it. Then the guidance and examples show that first for "invite someone to see my things".
- **B. Say it where it's decided:** a cloud function that filters rows by a field a client can write, with no check
  against the row's creator, answers with an `info` at the write (FIX-03 C's shape), naming A.
- **C. Check the rule model's reach:** whether "a row may name only the caller's own family" is expressible today
  (path rules, ONT-004/014). If so, an example; if not, the gap.

## Not now

- T6, F6: graded both ways (LEARNINGS #5, #7).

## Done (2026-10-23, fixer session)

**Commit `fbd337bfe` on cline-dev.** The kit is packed from **FIX-03's commit plus this one only**: branch
`own026-fix05-pack` = `cb7e0d6e4` + `9127660c1` (the same change, cherry-picked clean), in the clean worktree
`OpenNoodl-worktrees/own026-fix05-pack`. The runtime types, `nodegx-export` and `nodegx-backend` were built there from
that source, never linked from primary's newer `dist`. HEAVY.lock was held while packing (after waiting for
opennoodl-ab's check:editor to release it), and `git status` was empty after. `KIT` and `HOLD-nodegx` are untouched.

**Kit:** `/Users/Shared/nodegx-lab/kits/FIX-05-fbd337bfe/`

| tarball | sha1 |
|---|---|
| `nodegx-mcp-0.2.5.tgz` | `6d0832c6ce0f350d13b5fd73ac6078ecef4ae398` |
| `nodegx-preview-0.2.4.tgz` | `c2244e209fa83613219fc87e6794dd6851c03c69` (**the graded app needs it**: its backend copy and its runtime carry A) |
| `create-nodegx-0.2.5.tgz` | `cee60bdc412884eb655e2816f80973293f3eeb6d` (the registry's, unchanged) |

Nothing lives in a registry-only command. **🔴 One confound for the lab:** this kit is the first to serve FIX-03's own
`cloud-shared-counter` (Update Record with Add To). The FIX-03 and FIX-04 kits served the older script version, because
the generated `node-catalog-enriched.json` had not been regenerated after FIX-03 changed the example
(`P112-OWN026-ENRICHEDSTALE`). Regenerating it for this fix brought that change in too.

### Measured first

- **The defect, generically.** The page wired `User.id → Create Record prop-familyId`; the function trusted
  `row.familyId`. The backend already stamped `owner` (the creator, from the session) on every record in a creator-owned
  collection, and in the round's database every honest row had `owner` = `familyId`. A forged invite carries the forger
  in `owner`, so a function that checked `owner` would have been safe.
- **But `owner` was not safe to teach yet**, measured on a live backend before the fix:
  - `PUT {owner: <another user>}` on your own record answered 200 and stored it;
  - a shared collection (`creatorOwns: false`) kept whatever `owner` the page sent.

  And on a page or in a Function, `owner` read as a Model of the wire envelope, not an id: the project declares no
  `dbCollections`, so `row.owner === caller` was false.
- **The kit taught the defect.** The example `cloud-query-own-rows` said *"owner isolation by an explicit field … Each
  row is created with `ownerId` set from the same User id"*: DeepSeek's `familyId` is that shape.
- **C, the rule model:** not expressible. A path rule (ONT-004) is refused on `create` (`a path rule is allowed only on
  find, get, update and delete`), and `onlyWhile` (ONT-014) reads a record's old values. So "a new record may name only
  the caller's own group" has no rule today. With `owner` made the server's, most of that need goes away; a group of
  several people (two parents) is the gap left.

### What changed

- **A. `owner` is the server's word** (`P112-OWN026-OWNERWRITABLE`). A session, a key bound to a user and an anonymous
  caller never write it:
  - a create names the caller (an anonymous one, nobody), on a shared collection too, where the template ACL is still
    not applied;
  - an update drops it, on every door (parse wire put and upsert, `/api` save and batch, the backend's MCP update).

  The update is not refused, because an 'All' save sends the record back as read. An admin or an unbound server key
  still may name an owner (a seed, a transfer, a function running as the system). The suite caught one overreach: an app
  may use `owner` as its own link to one of its classes (SB-004's `Chunk.owner → Owner`). So a declared `owner` that is a
  Pointer to a class other than `_User`, or a first write whose `owner` is one, is left alone; a `_User` column is the
  server's whatever label a forged pointer carries (tested).
- **A, runtime** (`P112-OWN026-POINTERMODEL`). An undeclared Pointer field reads as the id it points at, as a declared
  one and a `plain` read already did. Outside the node spec's grading ("schema conversions … NOT GRADED HERE").
- **B. Said at the write** (`P112-OWN026-CALLEROWNER`, `ownerField.ts`). Two infos, never blocking:
  - `owner-sent-by-the-page`: a Create or Update Record field fed (within three hops) from the User `id`, in a browser
    component;
  - `function-trusts-a-field-the-caller-wrote`: a cloud function reads records, answers per caller (a User node or the
    Request's `userId` wired in), and names `owner` nowhere. It is silent when the project's `nodegx.security.json`
    says no caller creates or updates any collection it reads.

  Both fire on t2-nodegx-c05's own two components. They fire on 0 of 171 example components and 0 of 1,051 template
  components; 60 template functions answer per caller. The 2 that fired before the rules check read `Member`, which only
  a function writes.
- **Taught where it is read:**
  - `cloud-query-own-rows` filters on `owner`, and says never to copy the User id into a field of your own;
  - a new example, `cloud-share-my-records-with-someone`: a share naming only an address, and a cloud function that
    returns the records of the shares' owners;
  - one `readFirst` rule, the backend doctrine, the enforced-rules note, and the Create Record and Query Records
    enrichments.

### Proof from the tarballs

Empty HOME, the server over stdio exactly as the Cline entry runs it, a copy of the MCP's fixture app.

- **Scaffold:** `create-nodegx --cline my-apps` exit 0; it wrote `my-apps/AGENTS.md` and `cline_mcp_settings.json`.
- **Reading surface:**
  - `get_project_info`: the owner rule is at character 1,178 of 55,736, inside the first 4,000.
  - `list_examples`: "invite someone to see my records" and "invite a teacher by email to see my children" both answer
    `cloud-share-my-records-with-someone` first.
  - `get_example cloud-query-own-rows` wires `qp-owner`, and no longer `qp-ownerId`.
- **Writes:**
  - the measured page shape answers `owner-sent-by-the-page`;
  - the measured function shape answers `function-trusts-a-field-the-caller-wrote`;
  - the example's own function, copied as an agent would copy it, is silent.
- **On the backend the kit started** (`provision_backend`, enforced, functions deployed with `deploy_cloud_functions`),
  with three people: Ana shares with Cat, and Ben forges a share with his address naming Ana's group and Ana as `owner`.
  - The forged share is stored with **Ben** as `owner`, on create and after his `PUT {owner: Ana}`.
  - **Control:** the measured shape (decides by the page's `groupId`), called as Ben, returns **Ana's note**. The leak
    reproduces in this kit's backend, so the next arm proves something.
  - **The example's function** returns:
    - to Ben, only his own note (his forged share names himself as its owner);
    - to Cat, Ana's note and only hers;
    - to Ana, whom nobody shared with, nothing.

### Suites

- `own026-owner-is-the-servers.test.ts` 10/10; with the fix taken out, 4 fail.
- `hlt022-plain-records` 6/6; its new arm fails on the mutant.
- `ownerField.test.ts` 12/12; editor `tests-unit/validation` 210/210.
- `catalog:examples` 113/113 clean; `catalog:merge:check` and `catalog:check` up to date.
- nodegx-backend: 233 of 235 files without the Chrome drives. The two reds are `sb004` (fixed in the commit: four arms,
  the overreach above) and `admin-app/where-cards`, which passed on the next run.
- The Chrome drives, run outside the sandbox: 34 reds.
  - 28 are `ac2-page-editor-drag-drive` hanging for 30 minutes;
  - 6 are in `rel002b` and `sbr015`. The same 6 fail at `cb7e0d6e4` in the clean worktree.
- noodl-mcp: 22 reds in 11 files, none from this change.
  - The FIX-04 list: SBR-009, DEF-018, DEF-038, CMP-004, CMP-001, `own020CallToolStrip`, FLD-013.
  - BST-006 (`instructions`, the P125 briefing).
  - `p125PuppyBursts` and `tpl011Template`: a peer's P125 and Nightbook work in progress.

### Not done, and why

- **A group of several people** (two parents of one family) has no create-time rule (C above). The example and the
  infos teach `owner`, which is one person. A family of two needs a membership record that a function checks, and nothing
  teaches that yet.
- **The first writer to a brand-new shared collection** can claim `owner` as a link to another class, after which that
  collection is not stamped. Any earlier signed-in write closes it. Recorded in the bug file.
- **The infos stay inside one component.** They do not know that a field a function reads was written from the User id
  on some page; views carry no wires. The function-side info is therefore about "names `owner` nowhere", not about a
  specific field.
- **Not touched:** `KIT`, `HOLD-nodegx`, `KIT-PROVEN`, versions, npm.
