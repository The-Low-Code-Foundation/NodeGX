# Phase 91 — The app in your dock

**Scoped:** 2026-09-15, at HEAD `3206e12e5`. **This is the third of three phases scoped together:**
1. [P89 — a box of your own](../phase-89-a-box-of-your-own/README.md): hosting, sign-in and the PWA.
2. [P90 — every change has a number](../phase-90-every-change-has-a-number/README.md): the backend learns to sync.
3. **P91 (this one):** a desktop app with a local copy of the data that syncs.

P89 explains why there are three phases, and which earlier ruling they reopen.

**Status: ⬜ NOT STARTED — an index only.** No task file is written. Each task gets its file when a later session opens
the phase, and that session re-reads the task's row at HEAD first. **Prefix: `DSK`.**

> "Something bothers me about the idea of having to open the browser and log in every time. I feel like if the app were
> wrapped in Electron or another more appropriate framework, I could have an icon on my Mac app bar for it and still
> have it sync with the cloud version." — Richard, 2026-09-14

> "If you want you can even deploy the backend locally and have everything running locally and offline, like for an IoT
> project or something." — Richard, 2026-09-14

## 1. The person sentences

**Track A — a copy that keeps working.**

> **An app's backend can run on your own machine as a copy of the cloud one. It works with no network, and catches up
> when the network comes back.**

**Track B — an app in the dock.**

> **Deploying as a desktop app puts an icon in your Applications folder. It opens in its own window, keeps your data
> when you rebuild it, and can live in the menu bar.**

## 2. What is in, and what is not

**In:**
- Local copy mode for the backend, and what an app needs to use it: credentials, rejected changes, a sync status,
  cloud functions while offline, and files added offline.
- The same local copy running headless on a small Linux box.
- A Desktop app deploy target on macOS, Windows and Linux, each built on the machine it runs on.

**Out:**
- **Code signing, notarisation, app stores and auto-update.** A V1 app runs on the machine that built it.
- **Offline data in a browser or PWA.**
- **Native mobile apps.**
- **Features that go beyond wrapping an app:** file system access, spawning processes, kiosk mode. Phase 5's Electron
  spec lists these and they stay parked.

## 3. What scoping measured

Read on 2026-09-15 at `3206e12e5`. **✔** = re-read at that HEAD. **·** = reported by a read-only search, not re-read.

| | reading | where |
|---|---|---|
| ✔ | The editor already runs the backend as a child process: its own Electron binary with `ELECTRON_RUN_AS_NODE=1` | `packages/noodl-editor/src/main/src/local-backend/ServiceSupervisor.js:6`, `:207` |
| ✔ | The editor is on Electron `43.2.0` | `packages/noodl-editor/package.json:249` |
| · | `node:sqlite` already runs in the editor's main process | `packages/noodl-editor/src/main/src/execution-history/engine.ts:53` |
| · | P16 RUN-004 has a gate proving the packaged editor's backend keeps its data across a restart | [RUN-004](../phase-16-runtime-deploy-health/RUN-004-STABILIZE-LOCAL-BACKEND.md) |
| · | `LocalSQLAdapter` needs Node, so a page cannot hold the local copy. It has to talk to a local backend | `packages/noodl-runtime/src/api/adapters/local-sql/engine.ts:185-255` |
| · | No desktop packaging exists for user apps. Every `electron-builder` reference is for the editor | search |
| · | Phase 5 has a parked Electron spec | [03-electron-desktop](../phase-5-multi-target-deployment/03-electron-desktop/) |
| — | *Not measured:* an app built on the Mac that runs it is not quarantined, and Apple Silicon needs only an ad-hoc signature. DSK-011 measures this | — |

## 4. Decisions — proposed at scoping, not ruled

| # | question | proposal | task |
|---|---|---|---|
| R1 | Where does sync run: in the page, or between two backends? | **Between two backends.** The page talks to a backend on `127.0.0.1` exactly as it talks to the cloud today, and that backend syncs with the cloud. The runtime and apps do not change, and local queries behave the same as in the cloud because both run the same `LocalSQLAdapter`. A Raspberry Pi gets the same thing. **The cost:** a PWA cannot use it | DSK-001 |
| R2 | Electron or Tauri? | **Electron.** It ships Node, so the backend runs exactly as the editor already runs it. Tauri would need a separate Node binary bundled and supervised. Electron's larger download is accepted | DSK-009 |
| R3 | How does the window load the app? | From the local backend's own origin, not `file://`, and with no Node in the page | DSK-009 |
| R4 | Signing | None in V1. An app is built for the machine that runs it. Copying it to another Mac means right-click → Open, and the deploy tab says so | DSK-011 |
| R5 | Where does the Electron runtime come from? | Copy the editor's own, or download one at build time. Measure first whether the editor's own can be reused | DSK-011 |
| R6 | A cloud function while offline | Ask Richard: should a function marked cloud-only queue until the network returns, or fail clearly? | DSK-005 |
| R7 | Where do the backend and its data live on a desktop? | On a local port chosen at launch, with data in `~/Library/Application Support/<App>` or the platform's equivalent. The app is replaceable; the data is not | DSK-010 |

## 5. Tasks

**No task files yet.**

### Track A — a copy that keeps working

| id | task | source | depends on |
|---|---|---|---|
| DSK-001 | A backend can run as a copy of another (`serve --upstream <url>`). Local changes queue, and a sync loop pushes and pulls with backoff, surviving a restart | R1 | P90 SYN-008, SYN-012 |
| DSK-002 | The copy signs in to the cloud once and holds that session encrypted, and signing in to the app works offline | new | DSK-001, P89 BOX-012 |
| DSK-003 | A change the cloud refuses is undone locally, and the app is told | new | DSK-001 |
| DSK-004 | An app can show whether it is in sync: online or not, changes waiting, last synced, conflicts, and "sync now" | new | DSK-001 |
| DSK-005 | A cloud function that needs the cloud queues or fails clearly while offline (R6) | new | DSK-001 |
| DSK-006 | A file added offline uploads when the network returns | new | DSK-001 |
| DSK-007 | The same copy runs headless on a small Linux box, with no desktop app | Richard's IoT sentence | DSK-001 |

### Track B — an app in the dock

| id | task | source | depends on |
|---|---|---|---|
| DSK-008 | The Deploy popup has a Desktop app tab: name, icon (from the PWA source icon), and where the data lives: cloud only, this computer only, or this computer synced | new | P89 BOX-003 |
| DSK-009 | The app opens in its own window, as a single instance, with its pages served by its own backend and no Node in the page (R2, R3) | Phase 5 03-electron-desktop | DSK-008 |
| DSK-010 | The backend runs inside the app with its data in the platform's app-data folder, and quitting never loses a change (R7) | `ServiceSupervisor.js` | DSK-009 |
| DSK-011 | The app is packaged for this machine, opens without a signing prompt, and rebuilding it keeps the data (R4, R5) | new | DSK-010 |
| DSK-012 | The app can live in the menu bar, with a quick add, a global shortcut and launch at login | new | DSK-011 |
| DSK-013 | The same tab builds a Windows app on Windows and a Linux app on Linux | new | DSK-011 |

### The proof

| id | task | source | depends on |
|---|---|---|---|
| DSK-014 | The todo list on Richard's laptop and phone. While apart, the devices change different fields, the same field, and delete one record while editing it elsewhere, and a process is killed partway through a push. Every device ends the same, and the conflicts show | TPL-008, P90 SYN-017 | all |

## 6. Collisions

- **The editor's local-backend supervisor** (`packages/noodl-editor/src/main/src/local-backend/`) is the pattern DSK-010
  follows. DSK-010 reuses its code or copies it with a reason, and changes nothing about how the editor runs its own
  backends.
- **P16 RUN-004's gate** pins the packaged backend. A change to how the backend bundle is built must keep it green.
- **The editor's own packaging and signing** (P12 REV-007) is a separate pipeline. DSK-011 must not change what the
  editor's release build signs or ships.
- **Phase 5's 03-electron-desktop** stays parked. DSK-009 reads it and records what it takes and what it leaves.

## 7. Rules every task inherits

- 🔴 **Re-read the row at HEAD before writing its task file.**
- 🔴 **Drive the real app, not a test of its parts.** A desktop app is graded by launching the packaged `.app` and using
  it.
- 🔴 **A desktop app driven over CDP needs its own debug port.** A stray Chrome or a running editor can take `9222`.
- 🔴 **Drive a copy of the data, never Richard's real todo list.**
- 🔴 **Every test that completes can pass while a crash partway through corrupts data.** DSK-010, DSK-003 and DSK-014 each
  have an abandoned arm.
- **An absence is only a finding beside a known-firing signal.**
- **One heavy job at a time.** A packaged build and a drive are both heavy.
- 🔴 **Do not scope by time.** Dependency order only, and no estimates.

## 8. The end condition

This phase closes when:
- DSK-014 is driven on a real laptop and phone, with the packaged app;
- DSK-007 runs on a real small Linux box;
- every DSK task is graded or recorded as disproved.
