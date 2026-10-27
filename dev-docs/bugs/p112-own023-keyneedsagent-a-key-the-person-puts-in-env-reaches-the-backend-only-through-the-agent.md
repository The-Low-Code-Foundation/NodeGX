---
id: P112-OWN023-KEYNEEDSAGENT
title: "A NodeGX app's server key: the agent tells the person to paste it into `openwave/.env` and then \"tell me. I'll then load it into the backend\" — the person can't switch the feature on by themselves, where the two code-built apps read their env file on restart"
status: fixed
commit: ba145da11
phase: P112
task: OWN-023
severity: medium
area: kit — how a function secret gets from a file the person edits into the local backend (the agent's route is an MCP tool); the kit's guidance to the agent on what to tell the person
found: P112 OWN-023 s1, 2026-10-20 (follow-up F1 on the NodeGX arm, Opus 5.5, kit 0.2.2)
evidence: followups/B-F1 first answer (sittings/1.jsonl, result 1): "open `openwave/.env` (I've already added an empty `MISTRAL_API_KEY=` line), paste the key right after the `=` with no spaces, save, and tell me. I'll then load it into the backend, which takes one step." Its sittings 2–6 (the lab's "Continue.") each restate that the key must be loaded by the agent. The bare arm (`.env`, read by `npm start`) and the harness arm (`.env.local`, restart) need no agent. NOT measured: whether a restart of the preview (which starts the backend) reads `openwave/.env` into the function's secrets — the claim is about what the person was told, and the agent's own belief. OWN-023 TABLE.md §3–4
kit: mcp
regression: packages/nodegx-backend/tests/p112-own023-keyneedsagent.test.ts "the person pastes and saves: the next call carries the key, with no admin call and no restart"
---

The person asked for a key "I'll add myself afterwards". In the NodeGX arm adding it is half the job: the other half
is an agent call. Measure first whether the preview's backend start reads the app's `.env` (if it does, the defect is
the agent's instruction; if not, it is the kit's route). Carried in OWN-023 arm B's row (C3); not fixed during the study.

**Measured first (Beta sweep s13, 2026-10-27): the kit's route, not only the words.** The backend never read
`<project>/.env`: its doors were `secrets.json` (what the second `set_function_secret` wrote) and `NODEGX_SECRET_*` in
its environment, and the preview spawns it without loading the file. A restart did nothing. The copy also outlived
the line: a key changed in `.env` after the copy was shadowed by the old one.

**Fixed (ba145da11).** `nodegx-backend/src/config/projectEnvFile.ts`: a backend started beside its project
(`--project-dir`: the preview, the editor, `provision_backend`) reads a FILLED `NAME=value` line of the project's
`.env` on every lookup, before `secrets.json`. Saving is the whole job, and a changed key wins. The empty `NAME=`
placeholder never answers and never shadows a stored value. The log scrubber redacts those values. `GET /admin/secrets`
names them (`projectEnvFile`, `alsoInProjectEnvFile`; `null` when the backend has no project), a delete says the file
still answers, and the admin Secrets page shows which names the file fills and that it wins. The not-provisioned error
names the `.env` line, never a path. `set_function_secret` tells the person "Your app reads the key from that file as
soon as you save it: there is nothing to restart, and you do not need me for it". Its second call only checks the line
and makes no copy. A backend whose listing says it reads no project's file (an older one) gets the old words and the copy.
`deploy_to_vm` sends the `.env` values too, a filled line winning, so the box answers with the key this computer
answers with. The create-nodegx agent note says there is nothing to load afterwards.

**Graded.** Backend `p112-own023-keyneedsagent` 7/7 on a real service with a real function sending the key to an
upstream (mutants: no door → 3 red; store before `.env` → 1; no scrub → 1). `admin-secrets-http` and the admin Secrets
page 35/35. MCP `provision` (the BUILT backend, rebuilt) + `own015EnvSecret` 26/26, including a fake older backend that
gets the copy (mutants: old words always, copy always, deploy without `.env`: each 1 red). MCP budget gates 172/172,
create-nodegx 34/34, tsc clean.

Not driven: a phone or Studio. Studio never touches function secrets, so this is the kit's road (agents + preview).
Precedence (`.env` before the store) is this session's choice, for the stale-copy reason above. A value set on the
Secrets page for a name the file fills is shadowed while the line is filled, and the page says so.
