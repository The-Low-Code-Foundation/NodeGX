# GRV-006 — The groovebox

**Opened 2026-10-06.** **Depends on OWN-011, GRV-002, GRV-003, GRV-004, GRV-005.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone with Claude Code and an empty folder runs one install, asks for a groovebox, and makes a three-minute
> track. Nobody opened the NodeGX editor.**

## 2. What to build

1. 4 tracks (drums, bass, synth, FX), 16 steps each, knobs per track.
2. Patterns A–D per track; a song is a chain ("A ×8, then B ×4").
3. Songs saved to the NodeGX backend and loaded back.
4. Export the song as a WAV file (R6, ruled yes 2026-10-06): render it offline, faster than real time, and save it.

## 3. How it is built

An agent, starting from OWN-011's one install, with the two kits listed as dependencies (GRV-002). Every problem it
hits is a bug in the ledger (`dev-docs/bugs/`, `kit:` field) or a sentence for P112's brief (OWN-007). Templates exist
to surface product defects; this one's defects are the phase's real output.

## 4. Acceptance criteria

1. The build log shows no editor process.
2. A three-minute song plays end to end, saves, reloads and plays again.
3. The official editor opens the project with zero new validator diagnostics.
4. The honesty number is reported, with the count of Function nodes and what each one does.
5. The exported WAV plays in another app and matches the song's length to the sample.
