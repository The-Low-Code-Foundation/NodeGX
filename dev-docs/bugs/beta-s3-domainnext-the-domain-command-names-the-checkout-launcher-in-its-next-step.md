---
id: BETA-S3-DOMAINNEXT
title: "kit: after a purchase, `npx @nodegx/backend domain buy` tells the person to run `domain.mjs email …`, a file only a checkout has"
status: open
severity: low
area: "`packages/nodegx-backend/cloudflare/domainCommand.ts` (the `Next:` line after a purchase, and its usage text)"
found: Beta sprint row S3, 2026-11-07, reading the domain command bundled into `@nodegx/backend`
evidence: "`domainCommand.ts:278`: `Next: \\`domain.mjs email ${name} --to <your address>\\`, then deploy with --domain …`"
---

`@nodegx/backend` ships the domain command as `npx @nodegx/backend domain …`. Its sentence after a successful purchase
names the checkout launcher (`domain.mjs email …`) and `deploy` without its command. An AI coder reading it in a
stranger's folder would look for a file that does not exist.

The deploy's usage line had the same problem; `@nodegx/backend`'s build replaces it from
`NODEGX_CLOUDFLARE_COMMAND` without editing the file. The domain command was left as it is because a peer phase is
editing `cloudflare/` (2026-11-07).

Fix: the same `NODEGX_CLOUDFLARE_COMMAND`-style name for the domain command (`npx @nodegx/backend domain` when set),
in the `Next:` line and the usage text.
