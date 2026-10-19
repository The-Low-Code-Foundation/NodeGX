# How a hat is run

A hat is a fresh Opus 5.5 agent in a clean folder outside this repository: `claude -p` with `--setting-sources` set
to nothing (no user or project settings, no CLAUDE.md, no skills), `--strict-mcp-config` with no servers, no memory.
It is given, by path inside its folder:

- `apps/K`, `apps/M`, `apps/R` — the three app folders as built (copies), with their transcripts beside them
  (`transcript.jsonl`, the agent's own words and tool calls, in order), and each app running at a URL named in
  `apps/README.txt`
- `grades/` — the two blind graders' reports per app, with screenshots
- `followups/` — for each app, what was asked (F1–F4), what the stranger did, and the re-grade after
- the hat's own brief (`A.md` … `X.md`)

And this line, as the person commissioning it: *"I'm choosing how to build my next app. These three were built from
the same paragraph in three ways. Read them as the person described in your brief and tell me what you'd do."*

It is not given: anything from `dev-docs/`, nodegx.io, this repository's memory, the other hats' verdicts, the task
file, or the name of who is asking. The folders show their own stack (one has a `nodegx.project.json`); that can't be
hidden and isn't.

A hat's verdict is saved unedited in `own-023/verdicts/<hat>.md`. Nobody rewrites a hat.
