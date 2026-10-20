# The next session on Phase 124 — the mystery of the backend

**Written 2026-10-20 by s1 (Fable 5.1).** Say which model you are in your first message. Read first: `README.md` §0,
§3 (the think), §7 (the rulings); `LOOK.md` §s1 (what the stranger built and how it graded); the stranger's own
`editor/REPORT.md` (its ten questions are the kit's to-do list for this shape). Then `dev-docs/BOARD.md` §4's P124 row.

## Where it stands

- The first round is done: an Opus stranger built "backend map" from the npm kit, a copy of the training product and
  its running backend, in 22 minutes for $7.12. It draws the §3 shape: screens → functions → tables, locks and
  shields in words, a lens per person, the *Is it secure?* card, live runs, and a grant that writes both the backend
  and `nodegx.security.json`. Graded here against `stranger/facts.mjs`; the grant held through a restart. The editor
  is kept in `editor/` (its `node_modules` and `test/.work` are not; `cd editor && npm install` brings it back).
- Two bugs filed from this round: `P124-S1-WRITESRECORDSJS` (the backend says no function writes; eight do, from
  JavaScript, one of them public) and `P124-S1-DOORREFUSALUNSEEN` (a 403 at the rule gate is no run and no audit
  row). Neither is fixed; neither blocks the next round.
- **Round 2 is done too** (the same evening). Richard saw the first screens: *"It looks so cool … psychadelic, in a
  good way"* and asked for three things (BRIEF.md §s2). The same stranger built them in 19 minutes for $13.40
  (LOOK.md §s2): the 12 real people as a column; a pathway followed as one of them, the screen's functions RUN as
  them through a key bound to them on the backend's MCP door (`stranger/BACKEND-2.md`); and one row's reach measured
  across all 12 (*"2 of 12 people can reach this row"*). A third bug, `P124-S2-ACTSASHTTP` (the plain functions door
  passes a bound key as the person but the function sees nobody).
- **Richard has not sat with it live.** That is the whole of what is next.

## What to do first: put the screen in front of Richard

The copy from s1 may still be running on this laptop (ports in the session's scratchpad are gone with it; make a
fresh one). Three commands, from the repo root, with `<a secret>` of your choosing:

```sh
S=/tmp/who && mkdir -p $S/backend && cp -R templates/digital-bricks-training $S/training
nohup node packages/nodegx-backend/bin/nodegx-backend.js serve --data-dir $S/backend --port 8650 --host 127.0.0.1 \
  --token <a secret> --project-dir $S/training --backend-name "Training (WHO)" > $S/backend.log 2>&1 &
(cd $S/training && node tools/setup-backend.mjs --backend http://127.0.0.1:8650 --token <a secret> \
  && node tools/deploy-functions.mjs --backend http://127.0.0.1:8650 --token <a secret>)
echo <a secret> > $S/admin-token
(cd dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor && npm install && \
  node server.mjs $S/training --backend http://127.0.0.1:8650 --token-file $S/admin-token --port 5190 --no-open)
# → http://127.0.0.1:5190/   (rebuild packages/nodegx-backend/dist first if its src is newer: node scripts/build.js)
```

Then the sitting in `PLAYTEST.md`: the four client questions out loud, the grant on `Concept`, the restart. Write
his words verbatim. **Ask the §7 rulings with this screen open, in plain words** (memory: a ruling is asked with real
screens, no option letters): where it lives (kit page / Studio tab), which backend to judge it on, who builds round 2.

## If he asks for a second round

`stranger/round.mjs canvas <labRoot> --again <his-words.txt>` carries the same stranger on with his words verbatim
(`stranger/README.md` step 5; `CLAUDE_BIN` = the VS Code extension's `resources/native-binary/claude`, the terminal's
is too old for Opus). The lab root from s1 is in s1's scratchpad and may be gone; a fresh lab is a fresh stranger
(`round.mjs canvas <labRoot>` with no `--again`), which is fine: the brief is the same. One heavy job at a time; the
stranger's npm installs are the heavy part.

Things the next round could be asked for, if he does not say otherwise, in the order the think ranks them: the real
app running beside the map so a click in the app sends the pulse (README §3.3; the stranger declined to start a
second backend, so hand it `--backend` for the app's preview); a function's call rule editable the same way as a
table's; a trigger made by dropping a function on a table (`POST /admin/triggers`, there are none to draw today);
the touches from a run rather than from the code (needs README §5.1 in the backend first).

## If he says "nope"

Then the shape is wrong, not the route, and the think's §3 is what to rewrite with his words. Do not polish the map.

## The kit work this round named (not this phase's to build; file or point)

The stranger's REPORT.md questions 1–10 and README §5: a `set_collection_rule` edit kind and a schema for
`nodegx.security.json` in the editor suite; `functionScriptRecordTouches(script)` beside `functionScriptPortNames`;
touches recorded per run; a denied-access audit action; a push channel for runs; `/admin/roles` listing the groups
the rules name. Lane 3 (OWN-015, P104-as-kit-pieces) is where they go.

## Housekeeping

- s1 left running on this laptop, both light: the backend copy and the editor's server (`lsof -nP -iTCP -sTCP:LISTEN
  | grep node` names their ports; kill by pid). The three OWN-023 apps the previous handoff listed were already down.
- Not touched: `dev-docs/README.md` (a peer's open edit) and `phase-112-your-own-nodegx/README.md` (same). The P124
  pointer is on the board (§4 and lane 5's row) and in `own-023/NEXT-SESSION-PROMPT.md`'s header.
