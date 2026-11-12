---
id: P18-S106-PARSERAISE
title: An exported Parse CSV / Parse XML / Parse Feed never raises on the app error channel, so an On App Error beside it hears nothing
status: fixed
fixed: "EXP-022 S9, 2026-10-23 (Richard: \"Fix it in both\") — each parser read carries `raiser`; React and Swift raise once per parser node from an effect over its inputs (`parse*Failure` in lib/parse). The four t07 scenarios conform on both exports (15 of 85 each); see exp-022/s9/README.md"
severity: low
area: export / parsers (`nodegx-export/src/emit/parseLib.ts`, emitted `src/lib/parse.ts`; the channel is `src/emit/errorsLib.ts` `raiseAppError`)
found: P18 session 106, 2026-10-15 — the export's graph harness admitted nodes with no reducer spec (built from the catalog's ports), and t07's four On App Error scenarios played on the export for the first time
evidence: "`npx jest tests/node-spec-graph.test.ts` in nodegx-export: t07's four scenarios FAILED — e.g. first difference at event 3: runtime `{t:value, port:code, value:'parse-xml/parse-failed', subject:boundary}`, export `{t:value, port:error, …, subject:xml}` (the parser's own Error moves; the boundary's Code / Message / Node Id never do). The runtime raises in `parsecsv.ts:189`, `parsexml.ts:220`, `parsefeed.ts:245` (`raiseRuntimeError('parse-*/parse-failed', …)`); `grep -n raiseAppError src/emit/parseLib.ts` finds nothing. Census 2026-10-15: 0 projects on this machine pair a parser with On App Error (templates, export fixtures, `NodeGX test projects`; the only hits were node catalogs in an npm cache)"
---

The runtime's three parsers raise every failed parse on the app error channel as well as on their own Error output:
`parse-csv/parse-failed`, `parse-xml/parse-failed`, `parse-feed/parse-failed`, each with the node's id and type. The
export's On App Error (EXP-011 §54) is fed by the request verbs, Run Tasks, Script, realtime, SSE, drag and a few
others, but not by the parsers (§75). The parsers' helpers run as pure memoised calls inside render, and §54 already
notes that a raise *during a render pass* reaches the console only. So an exported app with a parser and an On App
Error shows the parser's Error and leaves the boundary silent, with nothing in the export report.

**Reach today: none.** No project on this machine pairs the two.

**Proposed:** raise from an effect keyed on the parse result's error, not from the render-time helper. The helper is
already memoised per input, so an effect on `[error]` fires once per new failure. That matches the runtime, which raises
once per re-parse that fails. Then add the parsers to the On App Error ledger row's list of raisers. Until then the four
t07 graph scenarios are pinned as this row in `tests/node-spec-graph.test.ts`.
