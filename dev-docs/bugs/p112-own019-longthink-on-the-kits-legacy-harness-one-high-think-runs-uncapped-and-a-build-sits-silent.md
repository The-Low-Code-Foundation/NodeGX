---
id: P112-OWN019-LONGTHINK
title: "The Vibe kit runs Large 4 at thinking \"high\" on the legacy harness, where nothing caps one answer — a think ran 12+ min (175 KB of reasoning, deciding a plan's operation order) with no output, and the build sat silent"
status: open
phase: P112
task: OWN-019
severity: low
area: kit — the Vibe config create-nodegx writes (`thinking`, the harness); Mistral Vibe 2.26.1
found: P112 OWN-019 s1 (v1, one 32-min step) and s2 (v4), 2026-10-13
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s2)
kit: core
---

Round v4 (Vibe kit tgz16, the quiz): 11 minutes of sound work — create_project, examples, the first staged
operations — then one answer that never ended. Vibe flushed it when the lab stopped the round at 12 minutes without
journal growth: a single reasoning entry of **175 KB** (~44k tokens) going back and forth over whether the App
component's operation must come before the pages it routes to ("Hmm — wait, but there's a chicken-and-egg…"). v1
(s1, the plain kit) sat 32 minutes the same way. v2 and v3 did not (12/12 each).

Measured in Vibe 2.26.1's source: on the legacy harness (the kit's, because it shows the model the server's error
messages) the model call's `max_tokens` is the agent loop's, which only the app-server protocol sets; a model's
`max_output_tokens` reaches the unified harness only; `--max-tokens` is a session total checked between turns. So no
setting the kit can write cuts one think off. A person in `vibe` sees a spinner and nothing else.

Levers, one per round. `thinking = "low"` (v5): worse — malformed tool calls, no authoring. Temperature 0.2 (v6):
inconclusive (ended by the lab, fixed). A cap on the unified harness would not rescue it either: an answer cut at the
cap is appended as it is, and an answer with no tool call ends a `-p` turn. **v8 (kit defaults) stalled the same way**
— 145 KB designing the whole app (components, instance cross-wiring) in one answer before staging anything; v4's was
the same shape. So the lever is what the model is told: the Vibe kit's AGENTS.md step 4 now says to keep each answer
to one decision and one tool call, and why (a staged operation can be replaced; an answer with no tool call runs on
with nothing saved). Measured from v9.

**Re-measured, s2 (2026-10-13) — v4 and v8 were stopped by the LAB, not stuck.** Every think over 80 KB in the
journals, timed by its own `createdAt`/`updatedAt`: the rounds that finished thought for up to **10.1 min** (v3 151 KB
in 9.0 min, pk2 134 KB in 10.0, pk1 91 KB in 10.1), writing 9–17 KB/min; v4's "stall" was 172 KB at 11.8 min and v8's
143 KB at 12.4 min, still writing at 14.5 and 11.5 KB/min when `--stall-min 12` stopped them (Vibe writes a think to
the journal only when it ends, so a long think reads as no growth). Neither was a loop: 8-word phrases repeated in the
last third, ~1% — the same as the thinks that finished (0.2–8%); doubt words ("wait", "hmm", "actually") 22–30 per
10 KB, the same as finished rounds. The harness facts above stand (nothing caps an answer), but they did not cause
these two stops. Lab: `--stall-min` now defaults to 30. v1's 32-minute step (s1, the wrong key) is not re-measured
here and stays unexplained. The AGENTS.md answer-size line stays under measurement as a speed lever (v9's longest
think 98 KB), not as a stall fix. Severity → low until a stop past 30 minutes is seen.
