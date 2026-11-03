# P132 — next session

**BWF-003 is built** (s3, 2026-11-02, Studio only, committed nodegx-studio `b4609f8` after `check:app` 67/67 unlocked; its
[s3 log](BWF-003-PICK-A-VALUE-FROM-WHAT-CAME-BEFORE.md#s3-2026-11-02-built-ac1ac4-green) has each AC). A step's panel
shows *What it can read* (what started it, how, each upstream step, from the run / the sample / the shape), a field
dragged onto a setting or picked from its *From the run* menu writes `{ "$path" }`, and the value is a pill in words.
BWF-002 is s2's, BWF-001 s1's.

**Take BWF-004** ([task](BWF-004-FORMULAS-WITHOUT-CODE.md)): formulas without code (ruling R2, a small closed set, no
JavaScript in a setting). What s3 leaves for it:

- BWF-003's item 3, *text with values in it* ("Hi {name}, your {plant} needs water"), is BWF-004's text formula: the
  pills exist (`runValueField` in `studio.html`, words from `automations.mjs` `pathWords`), a text setting that holds
  several of them between words is what is missing.
- A JSON setting (a Transform's output, Validate's rules, a Switch's cases: `jsonField`) takes no drop and no pill. A
  formula setting will want the same picker: `pickMenu(anchor, w, item, done, asPath)` and the drop on `runValueField`
  are the pieces to reuse; `PATH_MIME` is the drag's type.
- The engine's no-eval rule (`nodegx-backend` `workflow/steps/values.ts` header) stands: `{ "$fn": … }` is resolved by a
  closed table, and the catalog serves it for the agent (`/admin/workflow-step-kinds`, the value language).

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html` is
the file every Studio session edits; an uncommitted change in it is someone's live work. (At the end of s3, Studio's
`docs/SCOPE.md` and three `docs/look/s2-composer-*.png` were still someone else's, uncommitted.)

🔴 **Studio from the kit refuses every test** until a NodeGX release carries `511e41d5d` (`testRuns` in the catalog).
The picker itself works on the kit's backend (the drive's BWF-003 section passes there). Drive with
`NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** if `src/` is newer (`npm run build` in
`packages/nodegx-backend`, gitignored).

**Driving the Electron app on a Greenhouse copy:** [greenhouse-drive.mjs](greenhouse-drive.mjs) (s2: sample, test, up
to a step) and [greenhouse-drive-bwf003.mjs](greenhouse-drive-bwf003.mjs) (s3: the same, then a setting emptied and a
field dragged onto it). Each copies Greenhouse, gives it its own backend (`NODEGX_BACKENDS_DIR` under its own folder),
starts Studio's Electron hidden on CDP 9461 (check it is free: `lsof -nP -iTCP:9461 -sTCP:LISTEN`), and drops
`ELECTRON_RUN_AS_NODE`. Set `NODEGX_DRIVE_DIR` to your scratchpad. In a template string passed to `ev`, write `\\s`, not
`\s` (s3's printout lost every "s").

Studio gates before you commit: `npm run check:automations` (with and without `NODEGX_REPO`), `check:hosted`,
`check:editor`, `check:app` (screen unlocked), one at a time; the Chrome ones outside the Bash sandbox. In zsh, run a
list of gate commands with `eval "$g"`, never `env $g` (zsh does not split it: nothing runs and it exits 0).

Still open: the list shows triggers as rows of their own (BWF-001 item 8's fold); TriggerTest's three ports crowd the
column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7).
