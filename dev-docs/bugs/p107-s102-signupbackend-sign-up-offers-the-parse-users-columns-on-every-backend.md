---
id: P107-S102-SIGNUPBACKEND
title: Sign Up draws its property inputs from the Parse `_User` whatever backend is selected — on a Directus backend it offers the built-in's columns, which `directus_users` does not have
status: fixed
commit: (this session, the Beta sweep s7)
severity: low
area: packages/noodl-viewer-react/src/nodes/std-library/user/signup.ts `updatePorts` :199-250 (reads `systemCollections` `_User`, Parse type map, no backend); compare user-ports.ts `userSchemaContext` / `userPropertyPorts`, which the User and Set User Properties nodes use
found: P107 NSP-020 s102, 2026-10-13 — the port-context drive's synthetic two-backend project (`twoBackends`), once Sign Up was added to it while fixing P107-S85-RESTCOLTYPES
evidence: packages/noodl-runtime/test/node-spec/nsp-020-port-context.test.ts `DRIVE_PINS` (two lines, `prop-nickname` and `prop-born`, on the Directus-active nodes)
kit: node-spec
phase: P107 (NSP-020)
regression: packages/noodl-runtime/test/node-spec/nsp-020-port-context.test.ts "P107-S102-SIGNUPBACKEND: Sign Up draws the active backend's accounts columns"
---

The User and Set User Properties nodes find the accounts table of the selected backend (`_User` on the Parse wire,
`directus_users`, PocketBase's `users`, none on Supabase) and type its columns by `recordPortType`. Sign Up does not. It
reads `_User` from the project's `systemCollections` cache with the Parse type map, and it has no Backend picker. In a
project whose built-in backend is cached and whose active backend is Directus, Sign Up offers `prop-nickname` and
`prop-born`, the built-in's columns. A sign-up on that backend goes through the REST adapter to `directus_users`, which has
neither.

**Plain words:** *"On a Directus app, the Sign Up node offers fields from the other backend's user table, fields the
Directus users table doesn't have."*

**Reach:** small. 4 of 721 projects on Richard's machine have a REST backend, and none uses Sign Up on one (s102).

**The spec** reads the selected backend's schema, as the User family does, so on Directus it draws nothing: it states no
port that the runtime draws wrongly. The fix is the runtime's: Sign Up should use `userSchemaContext` /
`userPropertyPorts`, as Set User Properties does. Then the two pins come out. It is not ruled: whether Sign Up should get a
Backend picker as well is a product question.

**Fixed 2026-10-25 (the Beta sweep s7).** Sign Up's `updatePorts` is now user-ports.ts's, as Set User Properties': the
active backend's accounts table (`userSchemaContext`), its columns by `recordPortType` (`userPropertyPorts`), less
`USER_INPUT_IGNORE_PARSE_BROWSER` on the Parse wire (the same seven names it always skipped) or `USER_INPUT_IGNORE_REST`
off it (the REST adapter sends every `prop-` value in the sign-up body, so a server-owned column would be refused). It
listens to the same three metadata keys. **No Backend picker** (the product question stays open): a saved `backendId`
is not read, because the sign-up itself always goes to the active backend; the contract builder gives this type the
active backend's schema for the same reason (`NO_BACKEND_INPUT`). Spec v3 (only `version` moved in the golden).

Graded: the two drive pins came out and (A) was red 8 diffs on HEAD's runtime; a new case names what Sign Up draws on the
two synthetic projects (converged: `first_name, age, prefs, last_access` from `directus_users` on every node, whatever
its saved Backend; legacy: `nickname, born`). Mutants: HEAD's `signup.ts` (2 red), the contract without `NO_BACKEND_INPUT`
(red: the saved `rig` Sign Up on the legacy project).
