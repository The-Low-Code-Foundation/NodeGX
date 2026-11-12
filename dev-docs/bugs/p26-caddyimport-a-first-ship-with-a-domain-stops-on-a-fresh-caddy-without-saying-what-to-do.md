---
id: P26-CADDYIMPORT
title: A first ship with a domain stops on a freshly installed Caddy, and the refusal does not say what to do
status: fixed
commit: (this commit)
severity: medium
area: deploy / VM provisioning (`packages/nodegx-backend/deploy/vm/provision-app.sh`, run by `deploy_to_vm` and `ship-to-vm.sh`)
kit: backend
regression: none automated (the throwaway VM's Caddyfile already has the line); the block run alone against a stand-in Caddyfile, four ways (no line, the line, no file, CADDY=off), 2026-10-23
found: P26 lane 5 runbook draft, 2026-10-23 (opennoodl-d7), reading what a stranger's server needs
evidence: provision-app.sh's precondition `grep -qE '^\s*import\s+/etc/caddy/conf\.d/' /etc/caddy/Caddyfile`; DEP-002 Session 4 line "/etc/caddy/Caddyfile = { admin localhost:2019 } + import /etc/caddy/conf.d/*" (the test box was set up with the line)
---

`provision-app.sh` writes each app's site to `/etc/caddy/conf.d/<app>.caddy` and, on a shared server, never edits the
main Caddyfile. So it refuses unless `/etc/caddy/Caddyfile` imports that folder. A freshly installed Caddy's file
does not, so a stranger's first `deploy_to_vm` with a domain stopped at provision with
`FATAL: Caddyfile does not import conf.d`, which names the fault in the script's own terms and not the fix. The
throwaway VM every drive used had the line already, so no drive met it. A server with no Caddyfile at all failed on
grep's error instead.

**Fixed 2026-10-23 (opennoodl-d7).** The refusal says what to run on the server and that nothing was changed:

    FATAL: /etc/caddy/Caddyfile does not read /etc/caddy/conf.d/, where each app's site goes (a freshly installed
    Caddy's file does not). Nothing was changed. ON THE SERVER, add the line once, then ship again:

      mkdir -p /etc/caddy/conf.d && echo 'import /etc/caddy/conf.d/*' >> /etc/caddy/Caddyfile && systemctl reload caddy

and a missing Caddyfile says "Caddy is not set up on this server … Install Caddy, or ship with no domain."
`deploy_to_vm` returns provision's lines in `said`, so the agent reads the command. Not driven on a fresh-Caddy box.
