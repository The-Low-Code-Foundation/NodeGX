# Next session — Phase 119, Learn with Simple Rick (s2)

Read, in this order: [README.md](README.md) (the board; §1a is what s1 measured), [BRIEF.md](BRIEF.md) (Richard's
words, the rulings), [LOOK.md](LOOK.md) and open `look/learner-thread.html` in a browser at phone width. Then the
studio repo's README at `~/vscode_projects/learn-with-simple-rick/README.md` and its `CODEWORDS.md`.

**Where s1 left it (2026-10-12):**

- SRK-000: Drive (#4) and Web Push (#5) are measured, see README §1a. **A Meet recording's name carries no attendee, but a
  recurring meeting keeps its code**, so `Learner.meetCode` is the match key. There is no Web Push anywhere in the stack.
- SRK-001: the backend half is built. `POST /auth/email-code {email}` mails a six-digit code (always 200).
  `POST /auth/email-code/verify {email, code}` answers with the session in `/oauth/exchange`'s shape, roles included.
  It is the magic link's identity, so a link and a code are one account. Turn it on with
  `PUT /admin/auth {"emailCode":{"enabled":true}}`. Spec: `packages/nodegx-backend/tests/srk-001-email-code.test.ts`.
- **Not run in s1:** the full `nodegx-backend` suite and `test:main`. Fifteen auth and email specs plus the MCP's
  `backendTools` spec were run (all green). Run the full suite before anything else builds on SRK-001.

**Owed by Richard (s1 could not do these):**

1. The learner count on training.digitalbricks.io: the tunnel and `GET /admin/users`. The auto-mode classifier refused
   reading the box's admin token as credential exploration. Don't retry that path; ask him.
2. Two ~3 min screencasts, one English and one French, with the ten sentences he said written down (the STT
   reference).
3. The clips bucket: a public-read bucket in the Hetzner console (nbg1), or a key Claude may use.
4. Phones (iPhone + Android), once SRK-004 has a build to install.
5. The welcome-popup wording and the reply-bar line, in his words (BRIEF.md slots).

**Next to build, in order:** SRK-003 (the schema with `meetCode`, the policy, the staff key, the privacy page), then
SRK-004 (the thread, held to LOOK.md 1–13). SRK-002 (`package-deploy.js` secret-scan false positive) is a small core
fix that can go in any gap. The client half of SRK-001 (a sign-in-by-code node, both auth adapters, the export) is
carried in SRK-005.

**Traps already known:** `package-deploy.js` refuses every build (hosting README §1 has the workaround); `gh` and
`ssh` are sometimes refused by the auto-mode classifier, so test in one command and never inherit the block; `grep -rn`
on this machine silently skips `.ts` files, so use `git grep`; the shared-checkout rules in memory (temp-index commits,
no stash).
