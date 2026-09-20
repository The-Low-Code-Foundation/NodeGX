# 003 — Every string has one owner

_Recorded 2026-09-20, TASK-L160/L161/L162 (sprint 46 in the Digital Bricks Training repo)._

## What changed

Every learner-facing string on the three pages became one entry in `Data/Strings`, and *which
language the viewer reads* became one value — the `Language` parameter on the `i18next` node in
`App`. The library's existing `i18next-translation` module is mounted; no second string mechanism
was built beside it.

## Decisions

**The kit keeps its English `COPY` as a per-call fallback, and it is never deleted.** A kit that
renders blank when the graph forgets to wire a copy object is worse than one that renders English —
and it is why a missing key can never put a raw key on screen, which is a defect the real product
carries on `/course` today.

**English is the BASE and a locale is an OVERLAY on top of it.** So an untranslated key renders
English by construction rather than by a fallback rule somebody has to remember, and the same rule
serves both readers: the kit, which is handed a resolved copy object, and the graph's `Translation`
nodes, which read i18next directly. i18next's own `fallbackLng` would have given the graph half of
that and the kit nothing at all — it exposes no global, so the kit cannot reach it.

**A `Language Bundle` declares the language its CONTENT is in; the `i18next` node decides the
language the VIEWER reads.** Those look like one question and are two. Wiring the viewer's language
into a bundle whose JSON does not change with it re-registers the English strings under the new
code, so the page renders English always and the switch *appears* to work — which is why the bundle
JSON and the language it registers under are emitted from the same merge, and why the language wire
is one node shorter than the JSON wire: `loadBundle()` reads its `Language` only at the moment
`Bundle` changes.

**The language reaches a second string table through a named `Variable`, which is a transport and
not a second decision.** `Data/Strings` is instantiated once per surface that needs a copy object
and a component cannot wire across to another. The instance on `Pages/Lesson` was silently serving
English until it was told; `tools/check-language-owner.py` now fails on any instance that is not.

**No second locale ships — the mechanism only.** *Richard, 2026-09-20, against the recommendation,*
which was to draft French for review on the grounds that a switch with one locale is a control whose
condition nothing can change. The answer is about what **ships**, not about what is **proven**: the
switch was driven against a throwaway pseudo-locale and the pseudo-locale was deleted before commit.

**`/course`'s strings are deliberately NOT in the table, permanently.** *Richard, 2026-09-20, against
the recommendation,* which was to ship this task and give the gap its own task. Measured: twelve
learner-facing strings render from a hardcoded `COPY` map inside `Logic/Ordered timeline`'s function
— invisible to `tools/check-strings.py`, which reads node parameters and not function bodies — and
three of the four kit-node sites (`TimelineRow`, `RatingGauge`, `PaceTracker`) are never handed a
copy object, so they render the kit's built-in English whatever the language is. The superseded
options were (a) grow this task to close it and (b) a follow-up task. `START-HERE.md` names the gap
rather than leaving it to be discovered, and the claim this template makes is narrowed to match.

## What this template may claim

> Every learner-facing string on the three pages has one owner, and the language is one value.

Not *"the template is in two languages"* and not *"i18n is finished"*. There is one locale; the only
non-English rendering anybody has seen was a pseudo-locale that was deleted; `/course` carries a
named, deliberate exception.
