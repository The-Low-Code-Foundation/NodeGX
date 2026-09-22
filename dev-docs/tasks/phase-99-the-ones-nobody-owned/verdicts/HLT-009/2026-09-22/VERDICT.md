# HLT-009 — verdict, 2026-09-22 (P99 s20)

**Built. All four ACs graded.** Tree: `cline-dev` at `0322be23d`, plus this change. The change
removes 8 parameters from 4 nodes in `templates/digital-bricks-training`. Nothing else changed.

## AC1: the owner was asked, and answered

s19 messaged `digital-bricks-training-57` once (2026-09-22). Its answer, verbatim:

> "P99 take it: drop width+sizeMode from the four instances in templates/digital-bricks-training;
> do not declare the ports on the kit.
> Reason: every kit root already fills its parent by CSS in
> library/modules/dbt-lesson/src/styles.css (TASK-L159 made that fix after measuring a gauge at 4px
> wide). Declaring the ports would add a second width mechanism nothing reads. Touch only the
> template's nodes."

⚠️ The answer reached s19's conversation **after** s19 wrote its handoff. The handoff therefore
said "awaiting reply". s20 found the reply in s19's transcript. The task was not already in the
stream's own work, so it does not close as disproved.

**The claim was checked before acting on it.** `styles.css:2425` records the kit author's
measurement from 2026-09-20: *"`props.style` is EMPTY on every node in this kit — a
`width`/`sizeMode` parameter set on a kit-node instance is silently discarded."* The width comes
from `.dbt-pace, .dbt-rating-gauge, .dbt-timeline-row { width: 100% }`. `DossierSegment` has no
such rule, but that changes nothing here: its instance parameters were discarded too. So the
decision between the two options is: **the template stops setting them, and the kit stays as it
is.**

## The change

| component | node | type | removed |
|---|---|---|---|
| `/Course/Dossier segment` | `ds_seg` | `dbt-lesson.DossierSegment` | `width`, `sizeMode` |
| `/Course/Timeline row` | `tr_row` | `dbt-lesson.TimelineRow` | `width`, `sizeMode` |
| `/Course/Trajectory row` | `tj_gauge` | `dbt-lesson.RatingGauge` | `width`, `sizeMode` |
| `/Pages/Course` | `cs_pace` | `dbt-lesson.PaceTracker` | `width`, `sizeMode` |

The edit was made by script. Before writing, it asserted that each file round-trips byte for byte
through its JSON formatter, and that exactly these two keys came off exactly these four node ids.
The diff is 4 files, +4 / −28. `"parameters": {}` is a form the template already uses
(`Pages/Learner`).

## AC2: validator, 0 warnings

`npm run validate:project -- templates/digital-bricks-training`:

- before: `0 error(s), 8 warning(s), 2 info — 372 nodes, 854 endpoints`
  ([validate-before.txt](./validate-before.txt))
- after: `0 error(s), 0 warning(s), 2 info — 372 nodes, 854 endpoints`
  ([validate-after.txt](./validate-after.txt))

The task file counted 6 on 2026-09-20. L167 added `ds_seg` with the same pattern.

## AC3: rendered result unchanged

`measure-from-disk.js --out-dir --viewports desktop,phone`, run on three copies: a `git archive
HEAD` copy (before), the same copy rendered again (control), and the fixed tree (after).

- **Course, desktop and phone** (where `cs_pace`, `tj_gauge`, `ds_seg` and `tr_row` render): the
  PNGs are **byte-identical** before and after. Pair:
  [before](../../../shots/hlt009-course-desktop-before.png) / [after](../../../shots/hlt009-course-desktop-after.png).
- Home, People and Learner phone are byte-identical too.
- Learner desktop, Lesson ×2 and Palette ×2 differ between before and after. **The control
  explains this:** re-rendering the unchanged copy makes five frames differ, and those five include
  all four. Those pages render non-deterministically, so a byte compare cannot grade them.
- For all 12 page×viewport pairs, the report's page height, visible-element count, text-element
  count and overflow count are **identical** across before, control and after.

## AC4: the other templates

All ten `templates/*` report `0 error(s)`. The only warnings are `members-area`'s 2, the
out-of-scope pair the task file names. No shared kit code was touched. (`rocket-school` has a
peer's uncommitted edits in the tree and still reads 0/0.)
