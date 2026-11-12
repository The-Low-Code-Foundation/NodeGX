# HST-005 — A box you own

**Opened 2026-10-07.** **Depends on DEP-004, DEP-005, DEP-006's designs.** **Status: 📋 not started.** Kind: plumbing.

## 1. The person sentence

> **"I need a server" from Claude: it shows a machine and its monthly price, the person says yes, and a few minutes
> later the backend is on a box they own, with a real certificate, and the connector has told them what a box is and
> what it will need from them each month.**

## 2. What exists

- DEP-006: four Hetzner calls behind a `ServerProvider` interface, a cloud-init that installs Docker, a price the person
  confirms, a delete that works. DEP-005: SSH deploy, Caddy, automatic TLS; preflight checks Docker even when cloud-init
  installed it. DEP-004: targets and secrets outside the project. All three designed for the editor; none started.
- `nodegx-backend` ships a `bin`, SQLite or Postgres stores, backups (`cli-backup-audit`), and a permission model that
  must be locked on first run (P26 D15: `devOpen: true` is the shipped default).
- Hetzner, read 2026-10-07: the cheapest tier quoted between €3.49 and €5.49 plus €0.50 for IPv4, and **reported
  unavailable since 2026-09-07** (README §1 reading 7).
- Cloudflare Containers, read 2026-10-07: inside the $5 Workers Paid plan, scale to zero, billed per 10 ms running.

## 3. What to do

1. **Re-measure Hetzner on its own console** before anything else: which types can be bought today, at what price,
   with a screenshot in this file. If the cheap tier is gone, the VM route's price is the next tier's.
2. Lift DEP-004's target list and token store into the CLI and MCP (shared with HST-003).
3. Lift DEP-006's four calls and DEP-005's deploy into an MCP tool, with the price gate: the monthly figure is shown,
   repeated in the confirmation, and the delete is one call.
4. **Cloudflare Containers as the third row:** the same backend image on Containers, the same fixture, the same
   measurements. It is the box without the box.
5. Day 30: what the box needed (updates, disk, a certificate renewal) and whether the person would have known.

## 4. Acceptance criteria

1. Fixture C's `MUST.md` is ticked from a box on Richard's Hetzner account, provisioned and deployed from the connector,
   with the permission model locked before the first request.
2. The same list ticked from Cloudflare Containers, or the row that says why not.
3. The price shown to the person matches the bill on day 30, in this file with both figures.
4. The delete leaves nothing billable behind, checked on the console.

## 5. Not this task

A second VM provider. The free tier (UNI-008). Kubernetes or anything with a dashboard.
