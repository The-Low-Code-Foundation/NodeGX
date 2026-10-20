# The stranger's round, and how to run another

OWN-008's recipe with the project and the backend swapped in. One round = one Opus `claude -p` in a sealed lab with
the npm kit, a copy of the training product, a running backend copy, `BACKEND.md`, and the wish in `wishes.json`.

```sh
# 0. one heavy job at a time on this machine; the backend copy is light, the stranger's npm installs are not
S=<a scratch folder>; R=<the repo>
# 1. the backend copy (rebuild dist first if packages/nodegx-backend/src is newer than dist/cli.js)
cp -R $R/templates/digital-bricks-training $S/training; mkdir -p $S/backend
TOKEN=who-$(openssl rand -hex 8); PORT=<a free port>
nohup node $R/packages/nodegx-backend/bin/nodegx-backend.js serve --data-dir $S/backend --port $PORT --host 127.0.0.1 \
  --token $TOKEN --project-dir $S/training --backend-name "Training (WHO prototype)" > $S/backend.log 2>&1 &
(cd $S/training && node tools/setup-backend.mjs --backend http://127.0.0.1:$PORT --token $TOKEN \
  && node tools/deploy-functions.mjs --backend http://127.0.0.1:$PORT --token $TOKEN)
# 2. the lab root: the kit base, the project copy, the two one-line files
mkdir -p $S/lab && (cd $S/lab && npm create nodegx@0.2.3 base) && cp -R $S/training $S/lab/training
echo http://127.0.0.1:$PORT > $S/lab/backend-url; echo $TOKEN > $S/lab/admin-token
# 3. the facts the canvas will be graded against
node $R/dev-docs/tasks/phase-124-the-mystery-of-the-backend/stranger/facts.mjs $S/training http://127.0.0.1:$PORT $TOKEN $S/facts.json
# 4. the round (the terminal's claude 2.1.251 cannot run Opus 5.5; the VS Code extension's can)
export CLAUDE_BIN=$HOME/.vscode/extensions/anthropic.claude-code-2.1.304-darwin-arm64/resources/native-binary/claude
nohup node $R/dev-docs/tasks/phase-124-the-mystery-of-the-backend/stranger/round.mjs canvas $S/lab > $S/lab/round.log 2>&1 &
# 5. another round with Richard's words: a message file, same lab, same session
node …/round.mjs canvas $S/lab --again $S/richard-said.txt
```

The round writes `out/canvas/`: `prompt.txt`, `agent.jsonl` (the whole stream), `agent.exit` (code, minutes, a quota
stop if any), `before.json` / `after.json` (hashes of the project copy in the lab and at the root: a stranger that
changes either outside its editor has failed the brief), `teardown.json` (what it left running, killed). The editor it
built is `lab/canvas/editor/`, its report `lab/canvas/REPORT.md`, its screens `lab/canvas/editor-*.png`.

What the stranger does not get: the repo, git, the web, the messaging socket, any file under `/Users` (its lab is in
`/private/tmp`), the backend's data directory. What it does get that a person has: the backend's URL and admin
credential, and BACKEND.md. `--allowedTools` pre-approves; it does not restrict (memory: a stranger agent round
recipe), so the record says which shells it had.

`facts.mjs` is the grader's half: what the backend and the project say (tables, links by name, every table's effective
rule, each function's call rule and touches from its graph, its JavaScript and its nested helpers, which pages call it,
triggers, workflows, the run count). A canvas is graded by reading its screen against `facts.json`, never against its
own claim.
