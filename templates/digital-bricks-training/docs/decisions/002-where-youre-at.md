# 002 — Where you're at

_Recorded 2026-09-20, TASK-L159 (sprint 45 in the Digital Bricks Training repo)._

## What changed

Three panels now sit above the programme: two counts in a sentence, the learner's own line against
the pace their programme needs, and one gauge per objective they and their coach agreed. The
maths is one `Logic/Standing` node; the drawing is two new kit nodes.

## Decisions

**The maths is PORTED and was proven equal before it was pasted in.** `standingView`, `paceView`,
`parPoints`, `trajectoryView`, `ratingGeometry` and `scaleFraction` came from the product's own pure
modules, and the ported copy was run against those same functions over this fixture at five instants
spanning the agreed end — before it, on it, and after it — and compared field by field. A second
spelling of the pace rule would let a learner's page and their coach's disagree about how they are
doing.

**Ordering is the graph's; drawing is the kit's — and the kit computes NOTHING.** Every position a
gauge or the pace SVG needs arrives as a fraction. `parPoints` is passed in rather than rebuilt,
because `pace.ts` exports it precisely so a renderer cannot become a second owner of the par rule,
and the 1–10 scale rides on the gauge object for the same reason.

**The panels must be able to not exist.** No horizon → no pace panel, and therefore no trajectory
panel. Driven with a positive control: the same programme renders `.pace` 0 without an agreed end
and `.pace` 1 with one. The counts block is deliberately not gated that way, because counts of your
own finished work need no deadline to be true — which is the one thing a self-study learner can be
told honestly.

**Colour only ever celebrates.** Ahead of pace wears `--go`; short of it is the same ink. Measured
on the behind run, per panel: `.pace` carries **no `--warm` and no `--go` at all** — there is
nothing to celebrate and nothing to accuse. The gauge's fill ramps from the ordinary series ink to
`--go`, clamped at the target.

**The dataviz palette is defined in the kit stylesheet and NOT in the Styles panel.** It is a
validated set rather than eight independent colours, and the one edit that reliably breaks it is
changing a hue by eye.

## Rejected

- **A denominator.** `total` is computed for the agreement check with the pace view and never
  rendered: beside `done` it is one edit away from `"6 of 12"`.
- **A yellow→green ramp**, which is what was originally asked for. `--warm` is the amber token and
  it is reserved for encouragement and human recording; a literal ramp would make *"you are a long
  way from your goal"* the brightest thing on the page.
- **A second y-axis.** Activity is an unbounded count and a rating is bounded 1–10; one axis with
  two scales is the classic dataviz lie.
- **Pressable marks.** In the product a mark leads back to the entry the judgement was made at.
  There is no pointer on this page and nothing to lead to, and a control that goes nowhere reads
  exactly like a broken product.
- **Interpolating a rating between two judgements**, or drawing any line into the future.
