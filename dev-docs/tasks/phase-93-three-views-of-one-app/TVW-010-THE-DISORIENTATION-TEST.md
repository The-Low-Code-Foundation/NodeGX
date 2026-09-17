# TVW-010 — The disorientation test, and the after picture

The phase's close. BEN-007 §C has been open since 2026-08-09 because it needs someone who did not
build the thing. Everything in this phase is a claim about what a person understands; this task is
where the claim is tested on a person.

## 1. The person sentence

**Someone who did not build any of this sits down at the editor, is given the mock's five scenarios
as tasks, and is not lost — they say where they are, what the preview is showing, and where the
component they are editing lives, without being told.**

## 2. The protocol

BEN-007 §C's protocol, extended. The tester is not a NodeGX contributor and has not read this phase.
Richard may run it, or the community may (P86's shelf has people).

| # | the task given | what "not lost" means, observably |
|---|---|---|
| 1 | "Open `Landing page test V2`. Find the hero and change its headline." | They use Layers or the preview's design mode to find it (either is a pass); they enter Hero; they edit the Text node; they see the change in the preview. Asked "which page is the preview showing?" they answer correctly |
| 2 | "Now go to the Pricing page in the preview. Then open Hero from the Components list." | They notice the strip. Asked "why isn't Hero in the preview?" they answer from the strip's words, not by guessing. They press one door; asked which one shows the app's real data, they answer correctly |
| 3 | "There's a component called Price Tag that isn't on any page. Look at it." | They reach the Workbench by any door (strip, panel menu, segmented control). Asked "is this the app?" they say no and can say why (caption, hatched stage, `sample values`) |
| 4 | "Look at `Format price`." | They read the logic note or strip; they reach the Workbench outputs rail; asked "why is there no picture?" they answer from the sentence |
| 5 | "Show me every component in the project at once." | They find `All components`. Asked "are these the real pages?" they say no |
| 6 | "Where is the Nav used?" | They use `×4` or Layers; they can name a page it is on |
| 7 | (control) "Put the work strip above the hero." | They use Layers or the canvas; the preview updates; they can undo |

Scoring: each row is pass/fail on the observable, with the tester's own words recorded verbatim. A
fail names the surface and the sentence that failed; that is a defect row with an owner, and per
[[build-the-tasks-do-not-farm-the-defects]] it blocks the close only if it fails a row's observable.

## 3. The after picture

The same corpus as every visual task's `verdicts/`, re-taken on the finished build, both themes:
- the Components panel (300 and 240), Layers on Home and on Pricing with Hero on the canvas;
- the preview: the three strips and the agree case;
- the canvas: Home, Hero, Format price, three filter states;
- the trail, both forms;
- the board at 100% and 50%.

And §3 of the README re-measured on the artefact: trees listing the screen (**1**), surfaces that
say *instance* (**≥ 3**), sentences when the preview does not contain the canvas's component
(**1, always**), ways to organise the list (**2**).

## 4. Acceptance criteria

1. **(person, the close)** Rows 1–7 of §2 run on someone who did not build it, recorded. Rows 2, 3
   and 5 must pass; a fail on 1, 4, 6 or 7 files a defect with an owner and the phase may still close
   on Richard's ruling.
2. The four numbers read as §3 says, each counted on the artefact by a script committed beside the
   screenshots.
3. Every surface's screenshot in §3 is ruled **WORTHY** by Richard, with the image in context, per
   P81 VIB-001 §5. A not-WORTHY names the region and reopens that task.
4. BEN-007 §C is marked closed in `phase-56-component-bench/README.md` with a pointer here.
5. `test:ci` at the floor; every ratchet green; the phase README's status line updated by hand with
   the date, the tester's role (not name), and the four numbers.

## 5. Landmines

- A gate that replays against your own output cannot see a human's input
  ([[a-gate-that-replays-against-your-own-output-cannot-see-a-humans-input]]). The tester's words
  are the measurement; do not paraphrase them into a pass.
- Correct and usable were never the same criterion
  ([[correct-and-usable-were-never-the-same-criterion]]). A tester who *finds* the Workbench after
  ninety seconds of searching has passed the observable and failed the phase; record the time.
- Drive a copy of the project ([[open-a-copy-of-a-real-project-in-the-editor]]); opening writes
  three files into it.
