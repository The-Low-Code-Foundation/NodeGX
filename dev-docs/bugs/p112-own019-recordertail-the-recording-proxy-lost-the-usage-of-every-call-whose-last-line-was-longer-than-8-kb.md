---
id: P112-OWN019-RECORDERTAIL
title: "The lab's recording proxy lost the usage of every call whose last stream line was longer than 8 KB — L1's sitting 1 recorded 35 of 43 calls' usage ($2.29 against Vibe's $2.70), so per-round money from the recorder ran low"
status: fixed
phase: P112
task: OWN-019
severity: medium
area: the lab — `dev-docs/tasks/phase-112-your-own-nodegx/own-018/record-proxy.mjs` (`--record` in round-kit)
found: P112 OWN-019 s5, 2026-10-14 (lever 5: recorder vs Vibe $ on L1, tgz28)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s5)
kit: lab
---

Measured on L1's `calls/calls.jsonl`: sitting 1 has 43 chat calls, all 200, 8 with `usage: null` and `finish: null`
(sitting 2: 7 of 45). The recorded sum is 5.19M in / 123k out; Vibe's own export says 6.85M / 187k — the 8 missing
calls are ~207k input each, the size of a call at that point. They are among the largest responses (21–1063 KB). The
proxy kept the last 8192 characters of the stream and searched them for whole `data: {…}` lines; a last chunk that
carries a big tool call's arguments together with `usage` is one line longer than that, so its start was cut off
and it never matched (it also decoded UTF-8 per chunk, splitting a character at a boundary).

**Fixed:** `sseReader()` reads every complete line as it arrives (a streaming TextDecoder), last usage and finish
win. Checked on a synthetic stream (a 20 KB last line with usage, in 4 KB chunks): the new reader returns it, the old
tail logic returns null. Every recorder $ before s5 (s3–s4 rounds) is low by the calls it missed; Vibe's export
(`vibeUsd` in sittings.json) is the number to use for those.
