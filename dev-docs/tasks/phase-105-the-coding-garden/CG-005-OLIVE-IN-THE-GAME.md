# CG-005 — Olive in the game: the ask-Olive blocks, the fallbacks, the exam gate

**Opened 2026-09-27**, scoped from TPL-012 §2.4 and §2.6. **Status: ⬜ not started.** Depends on
CG-002 and CG-004. Lanes B+C.

## 1. The person sentence

> **A child drops an "ask Olive" block into her program, fills its slots from a picker, chooses the
> shape of the answer, and the robot uses what Olive says — and when Olive is slow, wrong or absent, the
> program still runs and the child can see which it was.**

## 2. What it is

- **The block family** (in CG-001's palette, CG-002's model): `ask Olive` with a *rung* (which
  template), *slots* (from the garden word list; one ≤40-character text slot in band 10–12), a *shape*
  (a word · a number · yes/no · one of […] · a list of 3 · a sentence · a card with fields · blocks), and a
  *dial* (same every time ↔ surprise me, i.e. temperature 0 / 0.8 / 1.2). The answer lands in the
  program's `Olive says` sensor and, for `blocks`, as a proposed block list the child accepts or edits.
- **The run**: an `ask Olive` step parks the interpreter, shows the owl "thinking" (dots, no clock), the
  world keeps animating, and resumes on the reply or the fallback. At most one Olive call in flight.
- **The voiced hint**: the hint table's chosen key is sent as a rung (`voice-hint`) with the key and the
  language as slots; the written line shows at once and is replaced by the voiced one if it arrives in
  time and passes the checks. Never the other way round.
- **The fallbacks**: no model, timeout, a refused output → the written line, marked in the owl row with
  a small "Olive is resting" so the child can tell.
- **The exam gate**: the rungs a machine failed in Olive's exam are not offered in the palette; the
  Skills page shows them as "Olive can't do this here yet".
- **The stub Olive** for drives: the relay route answered by a deterministic table keyed by rung and
  slots, so every page drive runs without a model and asserts the exact text.
- **Try Olive** on Grown-ups: a fixed list of example asks, run through the real route.

## 3. Acceptance criteria

1. Each shape produces a valid value through the real route (contract test in CG-004) and the interpreter
   consumes it: a number drives `repeat n`, yes/no drives `if Olive says yes`, one-of drives a branch,
   blocks become a proposed list the child must accept.
2. A parked run resumes on the reply; on a 12 s timeout it resumes with the fallback and the owl row says
   so; the world's animation never stalls (a drive samples the robot's transition mid-wait).
3. The voiced hint never replaces a written line with a different key, and a voiced line failing the
   blocklist is dropped silently in favour of the written one (a mutant stub returning a listed word
   proves it).
4. With the model absent the whole ladder's green rungs still run on written lines; the 🎓 rungs show
   the canned failing answer so the lesson survives without a model.
5. The exam gate withholds a rung the exam failed and offers it after a re-run that passes (drive with
   a stub whose exam answers are switchable).
6. The slot picker in band 7–9 offers only words from the request's list; band 10–12's text slot refuses
   the 41st character and a listed word inline, before anything is sent.
7. The dial: at "same every time" two runs give the same word; at "surprise me" three runs give at least
   two different words (real route, contract test).
8. Every Olive rung has EN and FR templates and the exam covers both languages.

## 4. How to build it

- The rung table (template, slots, shape, temperature, must-contain, expected exam answer) is one data
  file in `garden-desktop/shell/olive/rungs.json`, read by the shell (prompts) and by the generator (the
  palette and the Skills page), so the two cannot drift.
- Precedent for the async step: TPL-010's coach route; for the parked run: the interpreter's `ask` step
  in CG-002.

## 5. Gates

`tests/cg005Olive.test.ts` over the interpreter with a fake reply source (AC1, AC2, AC4, AC5);
`drive-cg005-olive.js` on the pages with the stub (AC3, AC6); the contract test (AC1, AC7) in CG-004.

## 6. Traps

A `.catch()` misses a synchronous throw (the route handler); a window opened after the event attributes
nothing (arm the drive's listener before the press); a self-healing defect is invisible to every arm that
completes — add the abandoned arm (a reply arriving after the run was reset must be dropped).
