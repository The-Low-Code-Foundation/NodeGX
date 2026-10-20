# Phase 123 — next session prompt

**Written 2026-10-16 by Fable 5.1 after s2** (s1: scoped and built in one session; s2: Richard's six things from real
Bubble and a design pass, the same day). Read BRIEF.md (his words, both asks, the assumptions), the README (§3 and §3b
what each tab does and how it was measured, §4 where it stops, §5 findings, §6 rulings R1–R6), LOOK.md §s2, then
PLAYTEST.md. The board lists P123 in §4 (parked, a prototype): **it opens only for Richard's sitting, or when he says
it takes a lane-2 slot.**

## What exists

- `editor/open-bubble.html` + `editor/serve.mjs`: the editor (four tabs on an icon rail: Design, Workflow, Data,
  Styles; the composer; custom states; branches; option sets) and its server (plain `node`, no install).
- `editor/cdp.mjs`: a headless-Chrome driver; `editor/check.mjs`: the gate, **PASS 37/37** at s2; `--shots` writes
  `look/s2-*.png`.
- `look/`: s1's four and s2's eight screenshots, on a copy of `templates/todo-list`.

## To run it

```sh
npm run build:editor:_viewer                                           # the deploy runtime, if missing
npm --prefix packages/noodl-preview run build                          # the in-page preview bundle (s2 fixed the exporter: rebuild it)
dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/build.sh       # look.js and specs.js (gitignored, Orbit's; s2 added expressionPorts)
cd dev-docs/tasks/phase-123-open-bubble/editor && node check.mjs       # the gate
node serve.mjs /path/to/a/COPY/of/a/project --port 47900               # then open http://127.0.0.1:47900/
```

A copy, never the real project. Bind the copy to a backend of its own (README s1 handoff has the two commands).
Richard's own instance from s1c (`serve.mjs /tmp/puppies`, port 47900-ish) reads the page from disk on every request,
so a reload shows s2 — but its `specs.js` and preview bundle are the files on disk too, rebuilt by s2.

## What s2 found in the kit (and fixed)

**P123-S2-VARIANTLOST**: the kit's preview and `render_report` exported every node without its variant
(`exportNode` read it through `NodeLibrary.findVariant`, empty outside `ProjectModel.instance`). Fixed in
`packages/noodl-editor/src/editor/src/utils/exporter/util.ts` with a fallback to the node's own `variantName`;
regression `packages/noodl-preview/tests/p123-s2-variant-exported.test.ts`; row in `dev-docs/bugs/`. Every kit
stranger's app with a Look was previewed without it until now — worth a line in OWN-019's defect list.

## If Richard sits with it (PLAYTEST.md)

Write his words and every "in Bubble I would…" into PLAYTEST.md as he says them. Ask R1–R6 (README §6) with the page
open, not before. The six things he named are built; what he does with them in the first ten minutes is the measure.

## If he says it takes a lane

Then it is an OWN-008 stranger built by us, and the first tasks are what §4 names: inserting a step between two, a
rejoin after a branch (R4), `:filtered`-style list operators in the composer, privacy rules from
`nodegx.security.json`, the editor-side ports (P123-S1-EDITORPORTS) and the composer's chip model moved into a kit
package so no editor invents them again. Run the editor suite's adapter against it (`@nodegx/project-contract/
editor-suite`, OWN-006) before any of that.

## Uncommitted at the end of s2

Nothing of this phase: committed by s2 with pathspecs (the phase folder, the exporter fix and its test, Orbit's
`specs-entry.ts`, the bug row, the board line, memory). The peers' piles in the working tree are theirs.

## s3 (2026-10-16): the Bubble importer spike — read import/IMPORT.md

`import/bubble2nodegx.mjs <export.json> <outdir>` converts a Bubble app export into a NodeGX v2 project and writes
`<outdir>/docs/IMPORT-REPORT.md` (counts + findings); `import/drive-open-bubble.mjs <outdir> <shots>` opens it in
this editor headless and screenshots the tabs. Measured on Richard's 2023 test export: everything in it converts, the
project opens here with the button in Bubble blue. **Waits on Richard:** real exports (IMPORT.md §5) — every Bubble
feature the test app lacks needs one real example before its dictionary row can be written. If he sends them: run the
converter, read the report, add rows until it says 0 "the dictionary" findings, open it here, screenshot. Uncommitted
at the end of s3: `import/`, `look/import-*.png`, this file, README §7 (all untracked or this phase's own).

### s3b: the run-mode bundles (read IMPORT.md §7 first)

`import/bubble-run-bundle-to-export.mjs <folder of *.dynamic.js> <out.json>` then `bubble2nodegx.mjs` converts any
Bubble app whose pages a person can open in run mode — TrybeUP (live on bubbleapps.io, test version) converted to 0
validation errors and opens here. The bundles themselves (38 MB, with keys inside) are in the session scratchpad only;
refetch with the loop in IMPORT.md §7 into `import/exports/` (gitignored). `import/validate-project.mjs <dir>` validates
through the MCP over stdio; `import/probe-heights.mjs <dir>` lists the tallest elements in the live preview. Next
rows, by count, are listed in IMPORT.md §7; the biggest single win is the Design canvas (instance width, fonts, texts
whose inputs never arrive). Uncommitted: everything in `import/`, `look/import-*.png`, README §7, this file,
`.gitignore` (three ignore lines).

## s4 (2026-10-16, evening): TrybeUP held; the template looks the same — read IMPORT.md §8 and §9

Richard stopped the TrybeUP push (*"we bit off more than we could chew"*) after §8's measurement: the page was
not flickering, the main thread was pegged by ~1,550 console errors a second, almost all converter rows plus 89
queries with no backend. He made a boilerplate Bubble template (one landing page, no data) and the brief became
**make the NodeGX render look the same, section by section, before any data.** Done for that page: 188/188
elements, 0 validation errors, 0 console errors, `look/import-template-nodegx.png` beside his
`import/template-screens/`. §9 has the eleven rows the page added (Google Fonts via `settings.headCode`,
Material Icons, `src`, Align-to-parent with an in-flow biggest child, a boxed Text, BBCode `[sup]`, `alignY`,
`{value, unit}` for a % size, empty Links, rotation, `fixed_width` ignored) and the three differences left.

**Next, in order:** (1) the row width-distribution rule (a two-column Bubble test page with known min/max widths,
measure Bubble's computed widths, write the rule) — it is the only thing that still reads as "not the same" on
this page; (2) Links to a URL → an External Link node; (3) then a second template page WITH a repeating group and
a search, against a `provision_backend`-seeded empty backend, before going back to anything TrybeUP-sized. To
re-run: `exports/template/` is gitignored — refetch with the curl loop in IMPORT.md §7 (the app is public), then
`bubble2nodegx.mjs exports/template/app.export.json /tmp/template-open-bubble` and `preview-solo.mjs` on it.
The converter has no test of its own yet: a gate that converts `exports/template` and asserts 0 errors, 0
dictionary findings except the Links, and the headCode link, is the first thing to add before the next row.

**s4, later:** Richard's first look at the template in Open Bubble found P123-S4-CANVASSCROLL — the overlay took the
wheel, so a page could not be scrolled in Design mode (the stage scrolled instead and snapped back). Fixed in
`open-bubble.html` (the overlay forwards the wheel to the frame); the gate grades it and is now **PASS 38/38**.

## s5b (2026-10-17): backend workflows → cloud functions — read import/IMPORT.md §10

Richard found the editor request that carries every backend workflow (`…/appeditor/load_single_path/…/c5r6j`; the
run-mode bundles never do) and saved two examples in `import/backend-workflows/`. Save one beside the `*.dynamic.js`
files and `bubble-run-bundle-to-export.mjs` picks it up; `bubble2nodegx.mjs` writes `/#__cloud__/…` functions,
`/#__cloud__/shared/…` for custom events, and `backend/triggers.bubble.json` (db-change and schedule triggers plus the
proposed `functions` call rules). 0 validation errors on the template + either example. Fixed on the way:
P123-S5B-DISABLEDSTEP (a disabled step was converted live). **Uncommitted**: both import scripts, IMPORT.md §10, this
section, the bug row; and an earlier P123 s5 pile from 10:16 the same morning (the `rootNodeId` line in the converter
and `dev-docs/bugs/p123-s5-nohome-…md`), left as it was. Next: the converter's gate (§10 "Not done" 1), then fire
the db-change trigger on a bound backend.

## s6 (2026-10-17, evening): privacy rules + the app's writes → nodegx.security.json; the converter's gate — read IMPORT.md §14

Richard's task 1 below is built. `bubble2nodegx.mjs` writes `nodegx.security.json` (the backend's own shape, validated
by `validateSecurityConfig` on every corpus) and the report's **Security** section: reads from the privacy rules (a
condition → one rule atom or none, fail closed), writes derived from every page step that creates / changes / deletes
a thing (the widest condition it ran under is the floor; a backend workflow that writes runs as `system`), `_User`
explained not written (fixed posture). Found and fixed on the way **P123-S6-THINGTYPE** (111 of TrybeUP's 216 writes
named their collection `Message` or `thing`; `thingTypeOf` now infers the type; 4 left) and filed
**P123-S6-CREATOREDITS** (needs Richard's ruling: no atom says "everyone reads, only the creator changes"). The
converter's gate exists: `cd import && node check.mjs` — **PASS 32/32** (fixtures, a synthetic page, the template
when its bundle is present). The privacy fixture was renamed `example-privacy-rule-entpawjzehwq0tbk.json` so the
bundler reads it. TrybeUP's 17 public bundles were refetched into the session scratchpad (gone with it; the curl loop
in IMPORT.md §7 refetches in a minute) — it has NO privacy rules on 40 types, so every read is public, and 13
collections get a write floor from its page workflows. Committed by s6 with pathspecs (this phase's folder, the two
bug rows, memory). The bubbleExporter copy was synced the same evening (see its CHANGELOG).

**Next in order:** (1) Richard tests the rules on a bound backend — provision the converted template with its
`nodegx.security.json`, then as a stranger and as a signed-in user read and write each collection (IMPORT.md §14
"Not done"); (2) his ruling on P123-S6-CREATOREDITS; (3) task 2 below (plugins) after the licence ruling; (4) task 3
once his fixture app exists.

## Next tasks (Richard, 2026-10-17, after "what's left for a full export?")

Richard: *"plugins … there might be thousands, with some only used in a handful of apps. This will be the biggest
challenge to face. The other stuff we can leave in the phase for later. I can do stuff like scheduling backend API
calls and all the fiddly stuff. I can create an app that just has one example of all the basic workflow steps … with
all params filled in."* In order:

1. ✅ **s6 built it — read IMPORT.md §14; what follows is the plan as it was.** **Privacy rules → `nodegx.security.json`.** The fixture is `import/database-schema/example-privacy-rule.json` (the
   editor's `entpawjzehwq0tbk` request): three types, each with `everyone` plus a rule; `somePrivacyRule` on User has
   a condition (`Current User is logged in`) and every permission ticked. Measured 2026-10-17: the rules are ALSO in
   the run bundle (`user_types.<t>.privacy_role`; `exports/template/dynamic-with-schema.js` has User's
   `users_own_data` with its condition), so every app the converter reads already carries them. The converter only
   writes a finding today (`bubble2nodegx.mjs` line ~82). The draft mapping against `packages/nodegx-backend/src/
   security/model.ts`:
   - a condition-free rule (`everyone`) = the fallback; `Current User is logged in` → `authenticated`;
     `This User is Current User` (`InjectedValue equals CurrentUser`) on User → the caller's own row; `This thing's
     Creator is Current User` → `creatorOwns`; `This thing's <field> is Current User` → a `{ path }` rule
     (P116 ONT-004); any other condition → a finding.
   - `search_for` → `find`; `view_all` → `get`; `view_fields` (when `view_all` is off) → `fields: { f: { read } }`;
     `view_attachments` → `files`; `auto_binding` + `binding_fields` → `update` for those fields only (other fields
     frozen, ONT-014); `create_api`/`modify_api`/`delete_api` are Bubble's Data API only; `non_filterable_fields`
     has no counterpart found yet.
   - 🔴 **The gap that matters is writes.** As I understand Bubble (unmeasured), privacy rules govern reads,
     auto-binding and the Data API, while a page workflow's *Make changes* runs on Bubble's server, guarded by the
     workflow's own *Only when*. A converted Record node writes from the browser through the collection's
     create/update/delete rule, so those rules must be derived from the workflows that write each type, or a
     condition that was a server check becomes a browser check anyone can skip. That derivation is a person's (or an
     AI's) ruling per type; the converter can propose it and list every write it read.
2. **Plugins, the biggest challenge.** Thousands exist, many in a handful of apps, so a row per plugin does not
   scale. Measured on TrybeUP's `import/static.js` (rough scan, 2026-10-17): **all 48 client-side plugin actions
   ship their code, and none of the 80 server-side actions do** (only their fields and return values). Client
   elements are written against Bubble's plugin API (`instance.data` 1,028, `instance.publishState` 313,
   `instance.triggerEvent` 103, `instance.canvas` 55; `initialize`/`update` functions). Two things to try, in
   order: (a) a census of the most-used plugins across real apps (the IDs are timestamps; Bubble's marketplace lists
   install counts); (b) one **Bubble plugin API shim**: a NodeGX node that runs a plugin's own client code against
   an emulated `instance`/`properties`/`context`, its states as outputs and its events as signals, so one shim covers
   every client-side plugin instead of one port each. Server-side actions have no code to run: each is a cloud
   function written from its fields (AI-drafted, a person signs it). 🔴 Ruling for Richard before (b): running a
   plugin's code outside Bubble is a licence question per plugin (many are paid and licensed per app).
3. **Richard's workflow fixture app (waits on Richard).** One page with one of every basic page workflow step, every
   parameter filled, like `backend-workflows/example-c5r6j filled.json` did for backend steps. Each step then gets
   its dictionary row against a real example. Scheduling backend API calls, the *Schedule API workflow* parameters
   and the rest of the fiddly steps come from the same app.
4. **Later in the phase (parked by Richard):** files off `cdn.bubble.io` (copy them, rewrite the URLs); users must
   reset their passwords (none are exported) and social logins must be set up again; *Thing before change*;
   recurring-event frequency; email, API Connector secrets and webhooks re-entered; a one-click capture (browser
   extension) instead of the DevTools ritual; the TrybeUP runtime rows of IMPORT.md §8; the row width-distribution
   rule; Open Bubble's hang on a 3,100-node page.
