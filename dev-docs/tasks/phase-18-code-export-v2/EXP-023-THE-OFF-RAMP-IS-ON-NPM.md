# EXP-023 — The off-ramp is on npm

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), from Richard's ruling of 2026-10-21: "code export and deployment
as npm things, such that nobody would ever have to use the original Noodl / NodeGX editor." **Status: 🟡 s132 — prepared
(§5); the publish rides lane 1's next npm cut and Richard's terminal (2FA).**

## 1. The person sentence

> "I never opened the editor. `npm create nodegx`, my agent built the app, `npx @nodegx/preview` showed it, `nodegx-deploy`
> put it on my VM, and when I wanted to leave, `npx @nodegx/export export ./app ./react-app` gave me the React source
> and told me first what would and would not translate."

## 2. What was measured first (s132)

| fact | reading |
|---|---|
| `@nodegx/export` exists with the CLI built: `nodegx export` / `serve` / `deploy` / `live` / `render` (HLS-002, HLS-015) | `packages/nodegx-export/src/cli/` |
| its version | **0.0.1**; `npm view @nodegx/export` → **404**, never published |
| the tarball is self-contained | `npm pack --dry-run`: 49 files, 5.8 MB packed, 25.3 MB unpacked, `dist/node-catalog.json` inside, no runtime dependencies |
| deploy of the interpreted viewer from npm | already ships: `@nodegx/preview` 0.2.4's `nodegx-deploy` bin (lane 4, OWN-016 AC1 ✅, live on a VM) |
| `nodegx deploy` inside `@nodegx/export` | a front door onto an engine that is **not in the package** (`deployEngine.ts`: refuses with where it looked); the npm deploy is `@nodegx/preview`'s |
| the scaffold's note (`create-nodegx` `AGENT_NOTE`) | says how to see an app and build one; **says nothing about leaving** |
| `scripts/own/publish-npm.sh` | eight packages in dependency order; export not among them |
| the kit's published line | 0.2.4 (2026-10-20); the next cut is 0.2.5 |

## 3. The rule

- `@nodegx/export` is cut with the kit, at the kit's version, through the same script (`publish-npm.sh`, after
  `nodegx-preview`, before `nodegx-mcp`), from a tarball packed in the worktree the cut is tested in.
- The scaffold's note tells the agent, in one line, how the person leaves, and that the preflight comes first.
- The package README says what the export is today in numbers (the preflight's own sentence), not a promise.
- `nodegx deploy` in the export package stays a checkout tool; the note points at `nodegx-deploy` for a deploy from npm.

## 4. Acceptance criteria

- **AC1** — `npx @nodegx/export@<kit version> export --dry-run <a kit-made app>` prints the preflight in an empty folder
  with `HOME` empty (OWN-016 AC1's arm); `… export <app> <out>` writes an app that `npm install && npm run build`s.
- **AC2** — the scaffold's note names the command; `create-nodegx`'s test holds the line.
- **AC3** — `publish-npm.sh` publishes it in order; the registry serves the tested shasum (the script's own wait).
- **AC4** — nodegx.io's npm section lists it with the preflight sentence (SEE-009's rule: words bound to a gate).

## 5. Session 132: prepared

- `packages/nodegx-export/package.json` → **0.2.5** (the next kit cut's number; one release, one version, OWN-019 R13).
- `scripts/own/publish-npm.sh`: `nodegx-export` added after `nodegx-preview`.
- `create-nodegx` `AGENT_NOTE`: the leaving line; its test asserts it.
- README: the "what it does not do" paragraph re-read against s132's measurement.

What is owed: the cut itself (lane 1, Richard's terminal), AC1 from the registry, AC4.
