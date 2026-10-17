# OWN-008: the strangers' lab and its graders

- `wishes.json`: the one prompt every stranger gets (`frame`), with each stranger's wish put in. The wishes are §3.2's.
  The prompt says "my own NodeGX editor" and never names the brief: finding it is part of the test.
- `round.mjs <table|blocks|map> <labRoot>`: one stranger. The lab is `<labRoot>/base` (what
  `npm create nodegx@0.2.2 base` writes) copied to `<labRoot>/lab/<name>`, plus a copy of `templates/todo-list`.
  `claude -p` on `claude-opus-5-5`, project settings only, the folder's own `nodegx` server with its HOME moved into the
  lab, no web, no git, no messaging socket, a shell limited to npm/npx/node and read-only tools. Output goes to
  `<labRoot>/out/<name>/` (`agent.jsonl`, `before.json` / `after.json` hashes, `agent.exit`, `teardown.json`). It stops
  itself when the week reaches 90% or the round alone has used 15% of it (`QUOTA_STOP`, `QUOTA_SPEND`), and on exit it
  kills every process left with its working directory in the lab.
- `series.sh <labRoot>`: the three, one after another. A quota stop ends the series.
- `grade.mjs <name> <labRoot> --adapter <path in lab> [--own-edits <path in lab>] [--saved <dir>]`: AC2's isolation
  scan, then AC1's suite. The suite uses the stranger's own installed command, the repo's todo-list script (which the
  stranger never saw), the control (`control-adapter.cjs`: the same adapter saving `paddingTop` as `"8"`, which must
  FAIL), and the stranger's own script. Then the saved folder: the official editor's validator (`validate:project`) diffed
  against the untouched template, and `validate_project` through `@nodegx/mcp@0.2.2` (`mcp-validate.mjs`).

The grader was proved on the kit's `referenceAdapter` (PASS in 56 ms; control FAIL with the one sentence) and on two
saved folders: a clean copy (0 new) and a copy with one dangling wire. Both validators named the wire.
