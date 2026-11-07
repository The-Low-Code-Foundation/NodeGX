---
id: BETA-S2-CLINEWRAPPERWORKTREE
title: "In a worktree, create-nodegx's OWN-020 test grades the worktree's create-nodegx against the PRIMARY checkout's: the cline wrapper's `require.resolve('create-nodegx/…')` follows node_modules into the primary, so any change to the agent notes reads red there"
status: open
severity: low
area: kit tests (`packages/create-nodegx/test/create.test.js` "P112 OWN-020 (R41)", `packages/create-nodegx/cline/bin/create-nodegx-cline.js`)
found: Beta sprint S2, 2026-11-07, running create-nodegx's tests after adding the plain-files line to the agent notes
evidence: "in the beta-s2 worktree: 41/42, the one red OWN-020 (R41) with a diff that is exactly the new lines (the wrapper's output has the old note); `node_modules/create-nodegx` there links to /…/OpenNoodl/node_modules/create-nodegx. The same package copied to a scratch folder with `node_modules/create-nodegx` linked to the copy: OWN-020 green (the 3 reds there are tests that read sibling packages the copy does not have)"
---

The test compares what `npm create nodegx-cline` writes with what `create-nodegx --cline` writes, file for file. The
wrapper finds `create-nodegx` with `require.resolve`, which walks up to the repo root's `node_modules`. In the primary
checkout that is this package; in a worktree made by `make-worktree.sh` it is a link into the primary checkout, so the
test compares the worktree's command with the primary's, and is red in every worktree whose agent notes differ from
the primary's. It goes green once the change is in the primary. Ways out: resolve the wrapper's `create-nodegx` from
the test's own package (an env override the wrapper honours), or have `make-worktree.sh` link the workspace packages
to the worktree's own folders, as it already does for `@nodegx/*`.
