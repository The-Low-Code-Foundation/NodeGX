---
id: P18-S123-FIRSTWIRE
title: An exported Set Variable fed by two Value wires wrote the first wire's value; the running app writes whichever wrote last
status: fixed
commit: 3d44078e8
regression: packages/nodegx-export/tests/the-failure-runs-its-chain.test.ts "two verbs' Failures run one Set Variable fed by both Errors: each says its own (planning's Sign in)" (and §C's two-wire refusal; mutants M and N)
severity: low
area: export / Set Variable, Global Store Set
found: P18 session 123, 2026-10-17, planning's Sign in (Log In's and Sign Up's Errors into one Set Variable)
evidence: dev-docs/tasks/phase-18-code-export-v2/s123-failchain/twowires.ts (36 such Sets on this machine, every one refused for something else at HEAD 06ea65ea3); EXP-011 §90
---

The Set Variable and Global Store Set compiles took `find()`, the first wire into Value, and dropped the rest with no
note. The runtime's Value holds whichever wire wrote last. No export printed it at HEAD (all 36 were refused first), but
the Failure chain of §90 reached two: planning's Sign Up would have said Log In's error, and the compiled-once sink
carried one chain's reads into the other.

Fixed: at a sender's pulse (a Function's signal, a verb's Failure) the sender's own wire wrote just before it pulsed, so
that wire is read, and the Set is compiled per wire. With no open sender feeding one, the Set is refused by name: "two
wires feed its Value input — last-writer-wins is not statically ordered". nightbook's Me toggles export now (each sets
the form from its own pulse).
