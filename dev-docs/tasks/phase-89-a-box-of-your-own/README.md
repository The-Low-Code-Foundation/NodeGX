# Phase 89 — A box of your own

**Scoped:** 2026-09-15, at HEAD `3206e12e5`, from a conversation with Richard about running the todo list
([TPL-008](../phase-78-the-templates/TPL-008-THE-TODO-LIST.md)) on his laptop and his phone. **This is the first of three
phases scoped together:**
1. **P89 (this one):** the app runs on a server the editor made, and you sign in to it from your phone.
2. [P90 — every change has a number](../phase-90-every-change-has-a-number/README.md): the backend learns to sync.
3. [P91 — the app in your dock](../phase-91-the-app-in-your-dock/README.md): a desktop app with a local copy of the data
   that syncs.

**Status: ⬜ NOT STARTED — an index only.** No task file is written. Each task gets its file when a later session opens
the phase, and that session re-reads the task's row at HEAD first, because this index is dated. **Prefix: `BOX`.**

> "I'd like in theory to have the todo app on my laptop and phone. For the phone I'd probably go PWA and sign in with an
> OTP email code that is locked to my email." — Richard, 2026-09-14

> "Throw in being able to deploy to a Hetzner or other VM, whatever hosts use API keys that would let you deploy a small
> VM and storage box if necessary and do the SSH key thing to SSH in to do the deploy, basically what we're already
> doing for the NodeGX homepage and all the templates we've added there." — Richard, 2026-09-15

> "Can we write three phases with task indexes, but not the individual task files yet." — Richard, 2026-09-15

**Why three phases, not one:** each one is useful when it ships. This phase needs no sync at all: a hosted app with
sign-in on a phone is the whole of what a PWA user gets. P90 is backend-only and can be graded in one process. P91
needs both.

## 1. The person sentences

**Track A — a server you own.**

> **Deploying to a server you own is a button in the editor. The editor can make the server, adds your app without
> breaking anything already running there, and proves the app is up.**

**Track B — signing in from a phone.**

> **You sign in on your phone with a code from your email, only the people you allowed can sign up, and a device stays
> signed in until you revoke it.**

**Track C — on the home screen.**

> **A deployed app can be installed on a phone's home screen and opens like an app.**

## 2. What is in, and what is not

**In:**
- **Five Phase 26 specs, revived:** [DEP-001](../phase-26-deployment/DEP-001-RUNTIME-BACKEND-CONFIG.md),
  [DEP-002](../phase-26-deployment/DEP-002-LOCAL-FULLSTACK-BUNDLE.md),
  [DEP-004](../phase-26-deployment/DEP-004-DEPLOY-TARGETS-AND-SECRETS.md),
  [DEP-005](../phase-26-deployment/DEP-005-REMOTE-DEPLOY-SSH.md) and
  [DEP-006](../phase-26-deployment/DEP-006-HETZNER-PROVISIONING.md). Their spec files stay where they are, and each is
  the starting point for its BOX task file, not a substitute for one.
- A second VM provider, a storage volume, and object storage.
- Sign-in with a typed email code, sign-up limited to an allow-list, and per-device sessions.
- [CONFIG-005](../phase-3-editor-ux-overhaul/TASK-007-app-config/CONFIG-005-pwa-manifest.md), the PWA manifest.

**Out:**
- **DEP-003** (Netlify and Cloudflare Pages) and **DEP-007** (the deploy assistant): neither is needed for this goal,
  and both stay in Phase 26.
- **Data that works offline on the phone.** A browser cannot run `node:sqlite`, and P90 and P91 do not change that.
- **Code signing and app stores**, Capacitor, a Chrome extension, and Phase 5's target-system core.
- **Managed NodeGX hosting**, Kubernetes, Terraform, and multi-region. The target user has one server.

## 3. The ruling these three phases reopen

Two earlier decisions closed this door:
- [Phase 26's README](../phase-26-deployment/README.md): *"No mobile/desktop targets. Phase 5's Capacitor and Electron
  targets stay parked."*
- [The revival roadmap §5](../../reviews/NOODL-REVIVAL-ROADMAP.md): *"one good web deploy + export beats five mediocre
  wrappers."*

**Richard's request on 2026-09-15 reopens it, but only in part.** P89–P91 build one PWA and one desktop wrapper, for
your own computer, with no signing. The objection was to [Phase 5's](../phase-5-multi-target-deployment/README.md)
five-target matrix, and that matrix stays dead: Capacitor, the extension and the target-system core remain parked.
Phase 26's README carries a dated pointer to this phase.

## 4. What scoping measured

Read on 2026-09-15 at `3206e12e5`. **✔** = re-read at that HEAD. **·** = reported by a read-only search, not re-read.

| | reading | where |
|---|---|---|
| ✔ | Magic-link sign-in exists (`POST /auth/magic-link`, `GET /auth/magic-link/callback`) | `packages/nodegx-backend/src/server/oauth-routes.ts:8-9` |
| · | There is no typed-code sign-in. The only one-time codes are internal handoff codes after a redirect | `packages/nodegx-backend/src/auth/FlowStore.ts` |
| · | Magic link is off by default, needs SMTP, and has its own `allowSignup` | `packages/nodegx-backend/src/auth/model.ts` |
| · | No allow-list for sign-up emails. The only allow-list is for redirect origins | search |
| ✔ | The todo template's sign-up is public | `templates/todo-list.security.json:52` |
| ✔ | PWA settings reach the runtime config, but **no build or deploy code writes a manifest or registers a service worker** (searched `noodl-editor/.../utils`, `noodl-editor/src/external`, `noodl-preview/src`, `noodl-viewer-react/src`, `noodl-runtime/src`) | `packages/noodl-runtime/src/config/config-manager.ts:137-141` |
| · | Nothing named `ssh2`, `DeploySecrets`, `ServerProvider` or `nodegx-config.json` exists in `packages/` | search |
| · | **DEP-008 is built** (`e3c8198e6`), while Phase 26's PROGRESS.md still says 0/8 | git log |
| · | **nodegx.io ships differently from Phase 26's plan:** system `ssh` and `rsync` as root, systemd, and a validated Caddy drop-in on a shared box. Neighbouring sites are curled before and after, and the result is read back from Caddy's admin API | `~/vscode_projects/nodegx-web/ops/deploy.sh` |
| ✔ | D20 dropped Docker on nexus-1, because its Caddy config loads all or nothing and three live sites share it | `dev-docs/tasks/phase-67-nodegx-university/README.md:176` |
| · | Hetzner refuses a second server. It is an account limit, identical in every location | Richard's account, 2026-08 |
| · | TPL-008's backend runs only on `localhost:8690`, and reaching it from the LAN was deferred | TPL-008 |

## 5. Decisions — proposed at scoping, not ruled

| # | question | proposal | task |
|---|---|---|---|
| R1 | Transport: bundled `ssh2` (Phase 26), or system `ssh` and `rsync` (what nodegx-web does)? | Phase 26's reason still holds (Windows has no `rsync`). Use `ssh2` in the product, and make every check `deploy.sh` performs an acceptance criterion | BOX-001 |
| R2 | Box shape: Docker Compose with one box per app (Phase 26, WF-003), or systemd as an additive tenant on a shared box (D20)? | An additive systemd tenant is the default, because it is the only shape that has run beside real neighbours. Docker stays for a fresh box that asks for it | BOX-001 |
| R3 | Which second provider? | Either DigitalOcean or Vultr, whichever API is closer to Hetzner's server-plus-cloud-init shape. The point is to prove the interface is not Hetzner-shaped | BOX-008 |
| R4 | Where do files and backups live? | Volumes and object storage are separate tasks. A volume holds the SQLite file; object storage holds uploads and backups | BOX-007, BOX-009 |
| R5 | Is the sign-in code separate from the magic link, or sent in the same email? | Send both in one email. On iOS, a home-screen app does not share storage with Safari, so a tapped link signs in the wrong place and the PWA needs the code | BOX-010 |
| R6 | Allow-list by exact email, by domain, or both? | Both, checked on every sign-up path: password, magic link, code and OAuth | BOX-011 |
| R7 | How long does a device session last, and how is it renewed? | Ask Richard | BOX-012 |

## 6. Tasks

**No task files yet.** The `source` column names the spec or reading each task file starts from.

### Track A — a server you own

| id | task | source | depends on |
|---|---|---|---|
| BOX-001 | Phase 26 is reconciled with how nodegx.io actually ships (R1, R2) | Phase 26 README, `nodegx-web/ops/`, P67 D20 | — |
| BOX-002 | One build runs on any host: the app reads its backend address when it loads | DEP-001 | — |
| BOX-003 | One folder, one process: the backend serves the app and the API, and every route survives a reload | DEP-002, P78 D74, Phase 5 TASK-007F | BOX-002 |
| BOX-004 | A server target and its SSH key live in the editor, never in the project or its deploy output | DEP-004 | BOX-003 |
| BOX-005 | A deploy to a box you own adds the app, breaks nothing already running there, and proves the app is up | DEP-005, `nodegx-web/ops/deploy.sh` | BOX-001, BOX-004 |
| BOX-006 | The editor can make a Hetzner server, and refuses before any billing prompt when the account is at its server limit | DEP-006 | BOX-005 |
| BOX-007 | A server can have a storage volume, and deleting the server says what happens to the volume | new (DEP-006 lists volumes out of scope) | BOX-006 |
| BOX-008 | A second provider works behind the same interface (R3) | new | BOX-006 |
| BOX-009 | Uploaded files and backups can live in the provider's object storage | new (the S3-compatible driver exists) | BOX-004 |

### Track B — signing in from a phone

| id | task | source | depends on |
|---|---|---|---|
| BOX-010 | You can sign in with a code from your email (R5) | new, beside the magic link | — |
| BOX-011 | Only emails you allowed can sign up, whichever way they sign in (R6) | new | — |
| BOX-012 | A device stays signed in, and you can see and revoke it in `/_admin` (R7) | new | BOX-010 |

### Track C — on the home screen

| id | task | source | depends on |
|---|---|---|---|
| BOX-013 | A deployed app can be installed on a phone's home screen, with the name, icon and colours from its PWA settings | CONFIG-005 | BOX-003 |

### The proof

| id | task | source | depends on |
|---|---|---|---|
| BOX-014 | The todo list runs on a server the editor made, and is installed on Richard's phone and signed in with a code | TPL-008 | all |

## 7. Collisions

- **Phase 26** keeps DEP-003, DEP-007 and DEP-008. BOX-002 to BOX-006 must not fork a second target list or a second
  Deploy popup, because DEP-002's spec says that popup's structure belongs to one task.
- **Phase 19 WF-003** owns the Docker Compose deploy and `deploy-assets.test.ts`, which reads `getRouteTable()`. BOX-003
  and BOX-005 read the same live contract, never a hand-written route list.
- **P78 D74:** a multi-page app 404s on reload under a plain `file_server`. BOX-003 fixes that for a self-hosted app. The
  nodegx.io template demos are separate, and stay on hash navigation until someone changes that site's Caddy block.
- **`nodegx-web/ops/`** is a separate repo with no remote. BOX-001 reads it and does not move it.
- **P91 DSK-002** relies on BOX-012's device session, so BOX-012 must allow a session held by a backend, not only by a
  browser.

## 8. Rules every task inherits

- 🔴 **Re-read the row at HEAD before writing its task file.** This index is dated 2026-09-15.
- 🔴 **Network behaviour is not in CI, and no task may claim it is.** Record what was actually run in a `-NOTES.md`, as
  Phase 26's verification posture says.
- 🔴 **A 308 from Caddy is not evidence that a site block matched.** Read the loaded config from the admin API.
- 🔴 **A shared box is only ever added to.** Neighbouring sites are curled before and after, and a failed validation
  removes the drop-in.
- 🔴 **Count the account's servers before promising one.** Driving BOX-006 needs Richard to raise the Hetzner limit, or to
  delete a server.
- 🔴 **A secret never lands in the project, the editor's settings or a deploy's output**, and a test proves it by reading
  all three.
- **An absence is only a finding beside a known-firing signal.**
- **A fix without a reverted arm is not graded.**
- **One heavy job at a time.**
- 🔴 **Do not scope by time.** Dependency order only, and no estimates.

## 9. The end condition

This phase closes when:
- BOX-014 is driven on the public URL, on a real phone;
- every BOX task is graded or recorded as disproved;
- Phase 26's README marks DEP-001, 002, 004, 005 and 006 as absorbed here.
