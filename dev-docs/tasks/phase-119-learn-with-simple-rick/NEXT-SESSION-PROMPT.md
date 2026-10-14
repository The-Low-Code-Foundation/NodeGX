# Next session — Phase 119, Learn with Simple Rick (s3)

Read, in this order: [README.md](README.md) (the board; §1b and §2 are what s2 built), [BRIEF.md](BRIEF.md) (Richard's
words, rulings R1–R14), [LOOK.md](LOOK.md) and open `look/learner-thread.html` in a browser at phone width. Then the
template itself, `templates/learn-with-simple-rick/` (its `docs/world/`, `nodegx.security.json`, `tools/`, `privacy/`).

**Where s2 left it (2026-10-12):**

- **SRK-003 is done and verified.** The template was made with the `nodegx` MCP's `create_project` (the npm route,
  P116 path). `docs/world/` holds eight nouns and eleven links; `validate_world` asked 47 questions, Richard answered
  them as four (R8–R11), and it now asks nothing. The projection is 16 collections (a history beside each, R11), written
  to `backend/schema.json` byte for byte. The policy reads through paths from the learner's sign-in, hides `notes` and
  `aliases` per field, and lets **nobody** write a row directly: every write is a cloud function that writes the row and
  its history row together (README §2 says why a db-change trigger was not used). `tools/setup-backend.mjs` and
  `tools/setup-studio-key.mjs` are proven against a real backend by the spec. `privacy/notice.en.json` passes the offline
  copy checks; two facts in it are TODO lines, not shown.
- **Readings taken, 2026-10-12, at HEAD `9505d342d` plus this session's files:**
  `packages/nodegx-backend/tests/srk-003-policy.test.ts` 20/20, and four policy mutants (field rule dropped, messages
  open, learner create allowed, coach notes open) each reddened the test aimed at it. `noodl-mcp`
  `def038SettledTemplates` 32/33 (the red one is `templates/nightbook`, a peer's untracked template, red before s2's
  change too). `npm run ontology-census:check` green after regenerating. `tsc` clean on `nodegx-backend` tests and
  `noodl-mcp`. The full `nodegx-backend` suite (s1's owed run): 249 of 251 suites, both red ones filed and not auth
  (README SRK-001 row). `test:main` not run: nothing in `tests-unit` reads `templates/` (checked).
- **Two gates the new template tripped, both fixed in s2.** The ontology census wanted a verdict on the eight history
  collections (one wildcard verdict in P116's `kinds.hand.json`, then a regenerate). DEF-038 called a template with no
  run-on-value-change node a broken reader. It now counts family types in the raw files as a second reading, so an
  honest zero passes and a zero beside a non-zero still fails. A mutant of that reading reddens the control.
- **Where the handoff was wrong:** the "peer" whose full backend suite s2 waited on for 30 minutes was s1's own
  background job, still running after `/clear`.

**Next to build, in order:**

1. **SRK-004, the learner's thread**, held to LOOK.md 1–13. It owes the learner's four functions first (`sendMessage`
   sets `from: learner` itself, `markProgress`, `resetConversation`, `setPrefs`), each writing its row and its history
   row through one shared helper. Then the Thread, Sign in and Privacy pages. The thread refetches on open, on focus
   and on the push, because live updates refuse path rules (P119-S2-LIVEPATH). The welcome popup and the reply bar wait
   on Richard's wording ruling: build the slots with the pitch, marked as such.
2. **SRK-008, the studio's ingest**, in parallel (`~/vscode_projects/learn-with-simple-rick`), once Richard's two
   screencasts exist (SRK-000 #2).
3. Then SRK-009, SRK-005/006 as in README §4's order.

**Owed by Richard (human decisions, not ours):**

1. A ruling on the welcome-popup and reply-bar pitch (BRIEF.md slots).
2. The clips-bucket check (does a public-read object under `clips/` load without credentials, while the listing and
   `dbtraining/` stay private?). R12 adds a second thing to measure there: a presigned GET on a private object.
3. Two ~3 min screencasts, English and French, with the ten sentences written down.
4. A sketch of the teacher side he says yes to, before SRK-006.
5. To overturn if he wants: the world's defaults s2 set from his words (README §1b: no noun is a single record, what a
   row is called, nothing read aloud, every text field free words).

**Product findings (s2):** filed `P119-S2-WORLDPERLINK` (the world asks a link question once per link, 40 of 47),
`P119-S2-LIVEPATH` (live updates refuse a path rule, so a chat refetches), `P119-S2-SECRETNOBODY` (a secret field
projects to `read: "nobody"`, hiding it from the coach too). DEF-038's honest-zero blind spot fixed in place (above).

**Traps already known:** `gh` and `ssh` are sometimes refused by the auto-mode classifier; `grep -rn` on this machine
silently skips `.ts` files, so use `git grep`; shared-checkout rules in memory (temp-index commits, no stash). New in
s2: `validateSecurityConfig` refuses any unknown top-level key (no `_about` in `nodegx.security.json`); the admin
routes answer `{ config }` for `/admin/permissions` and `/admin/auth`, and `/admin/users` searches with `?q=`.
