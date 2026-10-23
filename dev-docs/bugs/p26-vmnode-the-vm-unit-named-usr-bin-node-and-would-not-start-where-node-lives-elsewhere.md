---
id: P26-VMNODE
title: The VM service named /usr/bin/node and would not start on a box whose Node lives elsewhere
status: open
severity: medium
area: deploy / OWN-016 provision-app.sh (VM layout)
found: P26 lane 5 session 3 (the VM push), 2026-10-23
evidence: dev-docs/tasks/phase-26-deployment/DEP-002-LOCAL-FULLSTACK-BUNDLE.md "Session 3"
---

What a person sees: the ship stops with "FATAL: backend not healthy" and a journal of
`status=203/EXEC` lines, on a VM where `node --version` works.

Where: `provision-app.sh` wrote `ExecStart=/usr/bin/node …` while checking the Node version with whatever
`node` the shell found. A Node installed from nodejs.org's tarball (or nvm, or Homebrew on Linux) is in
`/usr/local/bin` or elsewhere, so the check passed and the service could not start.

Reproduce (measured 2026-10-23): a throwaway Ubuntu 24.04 container with Node 22.13.1 in /usr/local/bin,
the committed old script → 203/EXEC. With a `/usr/bin/node` symlink it started.

Fix: the unit is written with `command -v node`, the same Node the check ran.
