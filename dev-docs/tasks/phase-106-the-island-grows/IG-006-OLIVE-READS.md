# IG-006 — Olive reads: three blocks a child can see, wire and doubt

**Opened 2026-09-28**, from README §1 point 6 and rulings R6, R7. **Status: ⬜ not started.** Depends on
IG-001 (D6 answers shown, D7 the sensor) and IG-002 (`note`, `sign` things). Lane C.

## 1. The person sentence

> **Mamie's note on the plot says "the red ones, not the yellow". The program cannot read; Olive can. The
> child drops `read the note` in front of an `if Olive read [red]`, and the robot waters the right row. When
> Olive is asked "is it a flower?" and says yes to a rock, the child asks three times and counts.**

## 2. What it is

The eighteen-rung `ask Olive` family leaves the Workshop palette. Three blocks replace it, each built on the
column of the readout the model **passes** (TPL-012 §2.6: pick-the-named-object 6/6, positive yes/no 16/18,
FR→EN 3/3), each with a visible answer:

| Block | Slots | What is sent (shell `olive-templates.json`) | Answer, shape | What the child can wire |
|---|---|---|---|---|
| `read [the note]` | the note/sign on the plot (picked from what is there) | the note's text + the list of objects on the plot | **one of** the objects present (grammar enum) → a bubble "Olive read: red tulip" | `if Olive read [x]`, `go to [what Olive read]` |
| `is it a…? [a flower]` | one slot: the kind | "In front of {b} there is {thing ahead}. Is it {kind}?" — the engine names the thing | yes/no, bubble "Olive: yes" | `if Olive says yes` (IG-001 D7); `ask 3 times` sub-option → the majority, with the count shown |
| `say [thank you] to [Mamie]` | deed, to (as today) | as today | a sentence, bubble | — |

- **Cards.** Every block in the palette (not only these) gets `{ label, line, example }` in the word table;
  the first tap on a palette entry opens a card (the line and the example as blocks) with "Got it"; a `?` on a
  placed block reopens it. The unrendered `or#Line` strings become these lines where they fit.
- **Requests.** Three new islander requests carry the blocks: Mamie's note (read → if), the rock and the
  rose (is-it-a → vote, the one 🎓 rung worth keeping in the Workshop), Sami's thank-you (say). Echo (IG-005)
  is the robot that carries them; band 10–12 only, as R8 of P105.
- **Olive's lessons (R7).** Five of the eighteen survive as canned exercises on a Skills tab "Olive's
  lessons", band 10–12: count the tulips (she says 6, the program says 4), the sum (14+9), the rule (no
  letter e — the page checks the letters and shows them), tall tales (three canned questions), the
  direction (FR→EN works, EN→FR shown wobbly). Each is a card with "Ask Olive" and the check underneath; no
  program, no block. The other thirteen go, with their palette entries, templates and after-run lines.
- **The exam** (`shell/exam.js`, the contract test) is re-cut to the three blocks and the five lessons, run
  on Metal and CPU 3× each before the requests are promoted (`a model probe that passed 3/3 is a sample`).

## 3. Acceptance criteria

1. The palette at band 10–12 lists exactly `read`, `is it a…?`, `say` under Olive; no `ask:<rung>` id remains
   in the generated template; band 7–9 lists none.
2. `read` with the stub answering "red tulip" makes `if Olive read [red tulip]` true and the drive waters the
   red row and not the yellow; the bubble shows "Olive read: red tulip" in both languages.
3. `is it a…?` sends the thing ahead's name from the engine (never a slot), the stub's yes/no shows in a
   bubble, `ask 3 times` shows "2 of 3 said yes" and the majority feeds `if Olive says yes`.
4. On the real model, Metal and CPU: `read` picks the named object ≥ 5/6 on the three requests' notes;
   `is it a…?` ≥ 15/18 on the `things_ahead × kinds` table; each written in §7 with the date.
5. Every palette entry has a card; the first tap opens it, "Got it" places nothing, the `?` reopens it; the
   FR lines are read by Richard before the kids see them.
6. The five lessons run on the Skills tab with the stub; the letter-e check highlights every `e` in Olive's
   sentence; a lesson never appears at band 7–9.
7. The after-run rung line (P105 `Logic/Olive played`) says which of the three blocks was asked, and
   "resting" when the fallback answered; no rung 4–18 line remains.
8. Both languages, both sizes, 0 console errors; Olive page drive with the stub; the shell's exam green
   3× on both paths.

## 4. How to build it

Templates and the exam first (the shell); then the engine's `read` step and `olive_read` sensor; then the
palette and cards; then the three requests and the lessons tab; then the FR read. The stub Olive takes
scripted answers per rung so the drives never wait on a model.

## 5. Gates

As IG-001 §5, plus the shell's contract test on the real model (CPU in CI, correctness only) and the P105
`unfaithful`/blocklist checks on every voiced line.

## 6. Traps

Safety is by construction, never by prompt (TPL-012 §2.6): `read`'s answer is a grammar enum of the objects on
the plot, so Olive cannot name a thing that is not there; the note's text is content, never typed. A judgement
("is the tulip dying?") is the failing column — do not add it because a request would read better. Rung 9's
old line said "Olive used the letter e anyway" without checking: the lesson page checks. A model probe that
passed last session is a sample: AC4 is re-run, not inherited.
