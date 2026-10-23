# OWN-016 — Ship it: from npm to a folder, then to a VM with the backend beside it

**Opened 2026-10-12** from R18 (see OWN-014's header). This task takes P115 **HST-005** ("a box you own") forward, for
the VM route only. The rest of P115 stays parked (Richard, 2026-10-07: *"after phase 107 and our Swift runtime
experiment phase"*). **Model:** **Opus** for step 1 and the packaging. **Fable** if step 3's server layout (static
site, backend, TLS, restarts) turns out to have no existing design to follow.

**Status: 🟡 s13 (2026-10-12): AC1 ✅ (§6); the VM route ✅ on nexus-1 (§8): site, backend, function and secret shipped by `own-016/ship-to-vm.sh`; **live at https://lingo.nodegx.io** with real Gemini speech through it, the key nowhere public, admin routes 404; restart, crash and a real reboot survived (AC4 ✅). Owed: the phone check with the real app, publish.**

## 1. The person sentence

> **Someone who built an app with `npm create nodegx` and their agent says "put it online on my server", and it's
> online, backend and secret included, on a machine they own.**

## 2. What was measured (2026-10-12, static reads; nothing driven)

- `nodegx deploy` lives in `@nodegx/export`, which isn't published. Even installed, it finds its engine only in a
  checkout and refuses on a plain npm install **by design** (`packages/nodegx-export/src/cli/deployEngine.ts:10-20`,
  `:60-80`; register row C72).
- **The engine itself already ships:** the `@nodegx/preview@0.1.0` tarball carries `dist/nodegx-deploy.cjs`.
  `NODEGX_DEPLOY_CLI` (`deployEngine.ts:44`) could point at it, but nothing documents that, and nobody has run it from
  an install.
- The MCP has no deploy tool. Its tools include `provision_backend`, `deploy_cloud_functions` and `render_report`,
  but nothing that writes the app's deploy folder.
- The deploy output is a static folder. Hosting it, and running the backend beside it, is the part DEP-005 and DEP-006
  designed and P115 HST-005 was going to lift into the CLI and the MCP.

## 3. The work

1. **Deploy to a folder from npm.** Expose the shipped engine as a published command (`npx @nodegx/preview deploy`, or
   publish `@nodegx/export`; measure which is less code, and record the choice here), plus an MCP tool that writes the
   folder and reports its path and size. The refusal on a bare install goes; R6 still applies.
2. **Read HST-005, DEP-005 and DEP-006 first** and reuse their designs. Write down what they decided before writing
   anything new.
3. **To a VM.** The person has a VM with SSH access. Their agent copies the deploy folder up and serves it, starts
   `@nodegx/backend` there (OWN-015) under a supervisor that survives a reboot, sets the function secret on the server
   (never in the folder it copied), and puts TLS in front. The commands are the agent's, run in the person's terminal.
   What we ship is the shape and the checks, not a hosting service.
4. **The human steps are named**: buying the VM, the DNS record, the SSH key. They're a sign-up and stay human, said
   in plain words (HST-009's rule).

## 4. Acceptance criteria

- **AC1 — the folder from npm.** In an empty folder with `HOME` empty, from packed tarballs (then the registry): the
  made project deploys to a folder that serves the app with no page errors. **Control arm:** a broken project refuses
  with what is wrong.
- **AC2 — online.** The language app (OWN-015's fixture) on a VM Richard owns, at a real `https://` address, loads on
  a phone, and speaks a sentence.
- **AC3 — the key stays on the server.** OWN-015 AC2's search, re-run against the live site's every request and the
  copied folder: zero hits, with the same control arm.
- **AC4 — it survives.** Reboot the VM. The site and the backend come back without anyone logging in.
- **AC5 — the published version**, after asking Richard (R11), with AC1 re-run from the registry.

## 5. Not this task

- Cloudflare Pages, Workers and D1 (HST-003, HST-004, HST-006), and buying the domain (HST-007): P115, parked.
- Choosing a hosting vendor for the person. Step 3 works on any VM with SSH.

## 6. Session 13 (2026-10-12, Opus): step 1, the folder from npm

**Measured first:** the published `@nodegx/preview@0.1.0`'s `dist/nodegx-deploy.cjs`, run by hand on a project the npm
kit made, already deploys it: `ok: true`, a production runtime (1.74 MB, no source map), 163 node types, 10 files.
So step 1 needed a **name**, not an engine: `bin/nodegx-deploy.js`, a three-line wrapper like the preview's own bin.
The engine's contract is unchanged (`<project-dir> <out-dir> [--base-url <url>]`, one JSON report on stdout). Chosen
over publishing `@nodegx/export`, whose `nodegx deploy` refuses outside a checkout by design and would need the same
engine anyway.

**Found and fixed: P112-S13-AGENTFILES (medium).** That first deploy also copied `.mcp.json` (the person's local
project path and the server command) and `CLAUDE.md` (the brief) into the public folder. They're now default
exclusions in the rule list the editor's Deploy and the npm engine share (`ignore.ts`), with a jest spec and its
control (5/5). The cloud function's graph does **not** reach the browser bundle (0 hits for `__cloud__` in the
bundle and `index-*.js`).

**AC1 ✅.** Empty folder, `HOME` empty: `npx -y --package <packed preview tgz> nodegx-deploy ./lingo ./site` → `ok:
true`, 8 files, excluded `.gitignore .mcp.json CLAUDE.md components/ docs/ nodegx.project.json`. Served statically and
read in headless Chrome over CDP: the page renders its text (*"Lingo — nothing built yet…"*) with **0** exceptions and
**0** console errors. **Control:** a copy with a malformed `nodes.json` → `ok: false`, nothing written. That run also
filed P112-S13-DEPLOYBADJSON (low): it says stage `write` for a read failure and names no file.

**Not built: an MCP tool for the deploy.** An agent in Claude Code has a terminal, and the command is one line. A
person on Claude Desktop has no terminal, so a `deploy_to_folder` tool is still owed. It would need the engine inside
`@nodegx/mcp` too, as OWN-014/015 did for the harness and the backend.

**Steps 2–4 (the VM) need Richard:** a VM he owns with SSH access, a DNS name for it, and his word to go. Before
writing anything new, read DEP-005/006 and HST-005 (step 2). The backend for the VM is the same one-file
`cli.js` OWN-015 ships (`node cli.js serve`).


## 7. Session 13, continued: the VM route, scripted (not yet run)

**Richard, 2026-10-12:** use nexus-1 (`49.12.102.195`; SSH permitted), with the test fixture rather than a real app.
A hostname waits for a real app (an A record, e.g. `lingo.nodegx.io` → `49.12.102.195`; `nodegx.io` has no wildcard).

**Measured on the box (read-only SSH):** Node v22.23.2 (the backend needs ≥ 22.13). Caddy imports `conf.d/*.caddy`.
3.8 GB RAM, 29 GB free. Ports 8690 (todo) and 8691 are taken, so Lingo uses **8692**. No `lingo` user or folders yet.
`todo.digitalbricks.io` is already the shape this needs (P78's `todo-digitalbricks/provision.sh`: a static site, a
`--no-admin` backend on loopback behind Caddy, admin routes 404). Its app has no cloud functions or secrets.

**Measured locally:** deployed cloud functions are files in `<dataDir>/workflows/*.workflow.json`, so a `--no-admin`
backend on the box can take the set the agent's local `deploy_cloud_functions` made. No admin API is needed.

**Written (bash -n clean, NOT YET RUN against the box):**
- `own-016/provision-app.sh` runs as root on the box. It is P78's script parametrized (`APP`, `PORT`, `DOMAIN`,
  `CADDY=off`). It adds `workflows/` and an `EnvironmentFile=/etc/<app>/secrets.env` (640 root:<app>), read through the
  backend's `NODEGX_SECRET_<NAME>` fallback, and refuses a Node below 22.13.
- `own-016/ship-to-vm.sh` runs locally: `<project> <local-backend-dir> <user@host> <app> <port> [domain]`.
  `nodegx-deploy` writes the site. The backend is `dist/backend/cli.js` from the `@nodegx/mcp` tarball. The functions
  come from the local backend's `workflows/`. The secrets come from the local backend's `secrets.json` (what
  `set_function_secret` stored) and go over ssh stdin.

> **2026-10-23 (P26 DEP-002 s3): both scripts now ship the `--full-stack` folder** (the app, the backend that serves
> it, the project's functions and rules, `start.js`) to `/opt/<app>`, with the data in `/var/lib/<app>/data` and Caddy
> proxying everything but the admin paths. `--mcp-tgz` is gone (the backend comes with `@nodegx/preview`). The layout
> described here ran the backend dev-open: lingo.nodegx.io is public with no rules (bug P26-VMOPEN, one command for
> Richard to run on the box). See [DEP-002 "Session 3"](../phase-26-deployment/DEP-002-LOCAL-FULLSTACK-BUNDLE.md).

🔴 **The auto-mode classifier refused the run as [Production Deploy]**, despite Richard's chat permission (the
same as 2026-10-05, ssh memory). Read-only SSH worked. It needs Richard to run `ship-to-vm.sh` himself, or a Bash
permission rule for it. Then: health, `/functions/speak` over loopback returns RIFF, a key search under
`/srv/<app>` and `/opt/<app>` finds 0 (with `/etc/<app>/secrets.env` as the known-firing control),
`systemctl restart` comes back, and `is-enabled` says enabled. A real reboot of nexus-1 is Richard's call: it serves
live sites.

## 8. Session 13, continued: the VM route, run

Richard ran `ship-to-vm.sh` himself (`bash …/ship-to-vm.sh --ssh-key … --preview <0.2.0 preview tgz> --mcp-tgz <0.2.0
mcp tgz> <project> <local backend> root@49.12.102.195 lingo 8692`, no domain, so Caddy was untouched): "it worked".
The script lost its executable bit because the `chmod +x` was inside a refused command, so run it as `bash …`.

**Read back on the box (this session, over SSH):**
- `lingo-backend` is active and enabled at boot, and `/health` answers 200.
- `/etc/lingo/secrets.env` is 640 root:lingo and holds `NODEGX_SECRET_GOOGLE_TTS_KEY` only. The function
  `Lingo-babb9778.workflow.json` is installed.
- `POST /functions/speak` over loopback → **real Gemini audio**: `audio/wav`, 119,394 bytes, RIFF/WAVE.
- **Restart:** `systemctl restart` → new PID, health 200, `speak` 71,394 bytes RIFF. **Crash:** `kill -9` →
  systemd restarted it within 5 s, health 200.
- Neighbours: `nodegx.io`, `community.nodegx.io`, `todo.digitalbricks.io` and `digitalbricks.io` all answer 200. No
  `lingo` Caddy drop-in exists.
- 🔴 **AC3's search found the key in the site folder**: `/srv/lingo/site/noodl_bundles/b2-…json`. It was the OWN-015
  driver's control page, which under `--real` carried the real key (P112-S13-CONTROLKEY, fixed, not exposed: no Caddy
  route). It was deleted on the box. **After: 0 files under `/srv`, `/opt` and `/var/lib/lingo`; 1 in
  `secrets.env` (the known-firing control).** The search did its job.

**AC status:**
- AC1 ✅ (§6).
- AC2: the app runs on the VM and speaks over loopback. The public `https://` address and the phone check wait for a
  DNS record and a real app (Richard: "we don't need the real app yet").
- AC3 ✅ on the box, as above.
- AC4: restart and crash recovery ✅, enabled at boot ✅. A real reboot of nexus-1 is Richard's call, because it
  serves live sites.
- AC5: publish (the commands are with Richard).

**AC4 ✅, the real reboot (Richard: "go ahead and reboot", 2026-10-12 08:44 UTC).**
- **Before:** 29 running services were snapshotted, and each was checked for being enabled at boot. That found
  `nexus.service` **disabled**: it had been running by hand since 2026-09-11 and would not have come back. Richard ruled
  "Enable it, then reboot", and it was enabled. SSH is socket-activated (`ssh.socket` enabled) and PostgreSQL starts
  through `postgresql.service`.
- **The reboot** applied a pending kernel (6.8.0-137 → 146), and the box was back in about 20 s.
- **After:** 28 of 29 services are running; the missing one is `polkit` (D-Bus-activated, on demand). There are 0 failed
  units and the listening ports are the same.
- `lingo-backend` came back on its own: health 200, and `speak` returned 94,434 bytes RIFF.
- `nodegx.io`, `community.nodegx.io`, `todo.digitalbricks.io`, `digitalbricks.io` and `nexus.digitalbricks.io` all
  answer 200.

**Next:** Richard adds an A record `lingo.nodegx.io` → `49.12.102.195` (Namecheap, `nodegx.io` → Advanced DNS; no AAAA,
since the zone is IPv4 only). Then re-run `ship-to-vm.sh` with `lingo.nodegx.io` as the sixth argument. That adds the
Caddy drop-in (validated, removed again if invalid) and gets the certificate, which completes AC2's `https://` half.
The phone check comes with the real app.

**AC2's public half ✅: `https://lingo.nodegx.io` (2026-10-12, after Richard saved the A record at Namecheap).**
- The record was missing from both authoritative nameservers for 40 minutes (a row not saved). Once it was saved it
  was live in about 15 s.
- Caddy obtained the Let's Encrypt certificate at 09:50:30 by itself on its next retry (`CN=lingo.nodegx.io`, until
  2027-01-10), with no re-run.
- Checked from outside with the IP pinned (this Mac's resolver still held the earlier NXDOMAIN):
  - `/` answers 200 over HTTP/2, with HSTS and nosniff.
  - `/_admin`, `/admin`, `/executions` and `/metrics` all return 404.
  - `POST /functions/speak` → `audio/wav`, 100,194 bytes, RIFF/WAVE: **real Gemini speech through the public
    address**.
  - The key appears in 0 of the 5 public files fetched, and all 5 answered 200, so the search read them.
  - In headless Chrome the page renders with 0 exceptions and 0 console errors.
- The five neighbouring sites answer 200.
- **Owed:** the phone check comes with the real app. AC5, the publish, waits for Richard's 2FA.

## 9. Session 14 (2026-10-12): the real app, at phone width, locally

OWN-015 §7's stranger-built language app (repaired copy, the checkout's preview, the round's backend with the real
key) was driven in headless Chrome at 390×844: Home → *Greetings* → tap *Bonjour* → the WAV played to the end (1.45 s
of 1.45 s), 0 console errors, the key in 0 of the page's requests. **The phone check on the live site is still
owed:** lingo.nodegx.io serves s13's fixture function, not this app. It's deployed there once CFPORTS, UNDEPLOYED and
DETACHEDVISUAL are fixed and a fresh round builds it with no repair. Two s14 fixes reach this task: the preview no
longer serves `.env` (ENVSERVED), and a copied or moved project can't redeploy its functions (MOVEDDEPLOY, open).
