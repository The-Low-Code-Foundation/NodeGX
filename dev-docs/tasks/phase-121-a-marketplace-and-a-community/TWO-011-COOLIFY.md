# TWO-011 — Coolify, for a home lab

**Opened 2026-10-14** from the builder's question: would Coolify suit a non-programmer, and could NodeGX work with it? **Depends on one app running (TWO-003 or TWO-005 slice 1);
reads P112 OWN-016 and P115 HST-005.** **Status: 📋 not started.** Kind: experiment.
**Model:** Opus.

## 1. The person sentence

> **The builder has an old PC at home. We can tell him, from having done it, whether Coolify lets him put the community app online
> from it without the terminal, what breaks when the power or the connection drops, and what it would cost instead on
> a small rented server.**

## 2. What exists

- Coolify (read 2026-10-14): an open-source, self-hosted platform for deploying apps; it deploys Dockerfiles and
  Docker Compose stacks, installs with one script on Ubuntu (or another Linux), and serves its dashboard on port 8000.
  Community guides give 2 cores, 2–4 GB RAM and 20–30 GB disk as the minimum, and about 800 MB RAM for Coolify itself.
- The builder's home: an always-on unlimited connection; an older desktop with 12 GB RAM (P120 LOC-000), which he builds on.
- P112 OWN-016 (ship it: a folder, then a VM with the backend beside it) and the DBT template's hosting (Caddy,
  backend, nightly backup) as the routes NodeGX has.
- A home connection usually has no fixed public address; a tunnel (Cloudflare Tunnel, for example) is the usual way in.

## 3. What to do

1. **A Docker Compose file** for one NodeGX app: the backend and the built front end. If OWN-016 has one, use it.
2. **The spike:** an old PC or a VM with Ubuntu; Coolify installed; the compose file deployed through Coolify's
   dashboard; a tunnel so it's reachable from outside; a backup to somewhere off the machine. Count every step that
   needed a terminal.
3. **Failure:** pull the power and the network; what comes back by itself, what doesn't, what was lost.
4. **The comparison:** the same app on the cheapest rented server we'd recommend, by OWN-016's route. Cost a month,
   steps, what fails.
5. **Integration question:** what would working with Coolify from NodeGX mean in practice (a one-click "deploy to my
   Coolify" from the MCP or the helper, through Coolify's API)? Measure its API before proposing anything.

## 4. Acceptance criteria

1. One app online through Coolify on the spike machine, reached from a phone on another network.
2. The step list with every terminal step marked, and which ones a non-programmer could do with a guide.
3. The power-and-network test written down.
4. The home-lab versus rented-server table, and a recommendation Richard can pass to the builder.

## 5. Not this task

Building the Coolify integration (a later task if step 5 says it's worth it). Hosting the builder's live apps for him.
