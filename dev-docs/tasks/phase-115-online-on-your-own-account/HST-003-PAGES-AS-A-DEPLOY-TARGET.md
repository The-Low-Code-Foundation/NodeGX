# HST-003 — Cloudflare Pages as a deploy target

**Opened 2026-10-07.** **Depends on DEP-003's design, P112 R2.** **Status: 📋 not started.** Kind: plumbing.

## 1. The person sentence

> **"Put it online" from Claude, with a Cloudflare token the person pasted once, and a minute later there is a URL
> on their own account. No git, no YAML, no build service.**

## 2. What exists

- `nodegx deploy` (P91 HLS-015) writes the folder: `index.html`, a hashed export, the bundles, the interpreter (about
  14.9 MB). HLS-014's manifest makes the second deploy an update rather than a second first deploy.
- The engine is **not in the npm package** (`deployEngine.ts`, register row C72): from a bare install the command
  refuses and says where it looked.
- DEP-003 designed the direct upload: a project, a manifest of hashes, the server says which it lacks, the client
  uploads only those, then a deployment. Read it; do not redesign it.
- DEP-004 decided where tokens live: never in the project file. The editor's `AiCredentials` store is the precedent;
  the CLI and MCP need the same store outside the editor.
- Cloudflare Pages free, read 2026-10-07: unlimited sites and static bandwidth, 500 builds a month, 20,000 files.
  Direct upload is not a build. Re-read on the day.

## 3. What to do

1. Decide, with P112 R2's ruling, where the engine runs: published with the kit, or driven in the checkout. Write the
   answer at the top of this file; it bounds what "from the npm install" means for the whole phase.
2. A `cloudflare-pages` target for `nodegx deploy` and an MCP tool that calls it, behind DEP-003's adapter interface.
3. The token store, shared by CLI and MCP, outside the project (DEP-004).
4. Measure the interpreter on a phone: first page over mobile data, from a Pages URL, three runs, the numbers in this
   file. This is R5's evidence.
5. The redeploy: edit one word in a fixture, deploy again, confirm only the changed files went up (DEP-003's
   incremental model) and the old page is gone (HLS-014).

## 4. Acceptance criteria

1. Fixture A is at a `*.pages.dev` URL from one MCP call, on Richard's account, and the token is in no project file.
2. The second deploy uploads fewer files than the first, and the count is printed.
3. The phone measurement is in this file with the date and the fixture's size.
4. A deploy from a machine with no engine refuses with the same sentence C72 already prints, and the sentence names the
   next step for the person.

## 5. Not this task

Netlify (DEP-003 had both; one first, and the interface shaped by the second later). The domain (HST-007). Workers.
