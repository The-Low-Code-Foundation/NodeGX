---
id: P109-S5-RUNPORTDOC
title: The Function node's `run` port doc says wiring Run stops auto-runs; the code decides by the Run On Value Change boxes
status: open
severity: low
area: `docs/node-catalog/enrichment/javascriptfunction.json` (`ports.run`) vs `noodl-runtime/src/nodes/std-library/simplejavascript.ts:612-627`
found: P109 s5, 2026-10-02 — ISL-005's census (finding 15), re-read at HEAD
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ (ISL-009 §8 s5, ISL-005 §8 s5, ISL-005-CENSUS-2026-10-02.md)
---

The enrichment says *"Signal; executes the script. When connected, input changes no longer auto-run the script."*
NDA-017 §2 replaced `if (!this.isInputConnected('run'))` with `shouldRunOnValueChanged('in-' + name, …)`: wiring Run no
longer changes anything; the per-input Run On Value Change checkbox does. Agents read this text through `get_node_type`.

**Plain words:** *"The help for a script node's Run port describes how it used to work."*

**Proposed:** rewrite the line to point at Run On Value Change (and regenerate the enriched catalog; AWP-005's ratchet
applies).
