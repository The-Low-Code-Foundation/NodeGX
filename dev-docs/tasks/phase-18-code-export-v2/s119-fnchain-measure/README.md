# What the Function-chain gap was (P18 session 119, 2026-10-16)

The measurements behind EXP-011 §86.0, and the two runtime probes behind P18-S119-FIRSTWRITE and P18-S119-TOKENCLAIM.
Each script names its usage in its first line. Run the `.ts` ones from `packages/nodegx-export` with
`../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> $PWD/src …`; the `.js` probes with `node`.

| script | what it reads |
|---|---|
| `measure.ts` | every Query Records with a wired filter value over the three project roots (or `ROOTS=`), its disposition and the JS node feeding each value |
| `materialize.ts` | a shipped `*.content.json` template written out as a v2 project by the editor's own `ProjectExporter`, so the current template is measured rather than its stale copies |
| `dump.ts` | one component's nodes, parameters, wires, dispositions and notes |
| `tallytpl.ts` | every refused node of one project, grouped by reason |
| `stray.ts` | the "consumed outside the Run chain by an unrendered sink" refusal over the corpus: by component, by sink, by what runs the Function |
| `sigchain.ts` | of those, how many send a signal of their own that something consumes, and whether every value read sits on that signal's targets |
| `tickedrun.ts` | Run-wired Functions that also run on a ticked input and fire a signal of their own (TOKENCLAIM's reach) |
| `dispdiff.ts` | every node's disposition under two export sources (HEAD's `src` from `git archive HEAD` in a copy, and the tree), and the changes |
| `snapcond.ts` | the Evaluate-driven Condition refusal ("snapshots of the last Evaluate") over the corpus and the shipped templates (`TPLS=` the materialized ones) |
| `sigprobe.js` → `sigprobe.out` | the runtime's own Function into a recorder: what a signal's target reads, at the pulse and after its inputs update |
| `tokenprobe.js` → `tokenprobe.out` | the Site Builder's "Hold the token until the account exists" on the runtime's own Function, with the template's box, unticked and unset |

Readings, 2026-10-16: 62 wired filters in 214 projects, every one stopped at a Function a copy of the Site Builder;
134 Functions with the stray-read refusal in 28 projects, 130 sending a signal of their own, 76 with every read on
their own signal's targets; 13 Run-wired, ticked, signalling Functions in the shipped templates. After §86: 27 template nodes newly exported, 0 lost (`dispdiff.ts`); the next blocker, the Evaluate-driven Condition, holds 36 in the templates and 122 in the corpus (`snapcond.ts`).
