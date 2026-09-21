# 004 — The coach's voice

_Recorded 2026-09-21, TASK-L163 (sprint 47 in the Digital Bricks Training repo)._

## What changed

The graph knows **who is reading**, and that one value decides both what the words say and which
entries exist. A coach and their client can now read the same programme without reading the same
sentences.

Concretely: `Data/Strings` takes an `audience`; the coach's words are an overlay on the English
base; `Logic/Ordered timeline` drops signals for a learner and `TimelineRow` does not draw a message
for one; and the kit's `signal` and `message` render rules stopped being `null`.

## Decisions

**Both label maps move into `Data/Strings`.** *Richard, 2026-09-21, against the recommendation*,
which was a second map inside `Logic/Ordered timeline` chosen by a `voice` input — keeping decision
003 exactly as taken and adding nothing to the table. This reverses 003's *"permanently"*, and a
task that puts the maps back in a function is now the reversal.

**The coach's programme renders both `signal` and `message`.** *Richard, 2026-09-21, against the
recommendation*, which was signals only, on the grounds that messages belong to the conversation and
that it keeps the kit's two `null`s down to one. So both `null`s went.

## The mechanism, and why it is the locale mechanism

**English is the base and the coach's voice is an overlay on top of it** — the same rule decision
003 established for a locale, used a second time rather than a second mechanism invented beside it.
Thirty override keys replace sixty-five duplicated strings, and a neutral key (`Lesson`, `Brief`,
`Review`, `goal`, `The pace for {when}`) keeps exactly one owner and cannot drift between audiences.
Adding a locale is still adding one key to the locale node; the voice composes underneath it.

**The voice layer is applied LAST**, and that is a decision rather than an accident of ordering. The
two orders differ only when a locale translates a key the coach overrides without also translating
the coach's version — and then locale-last hands a coach the learner's sentence, translated.

## The failure this creates, and the guard that answers it

A **locale** miss falls back to English: wrong language, right meaning, and a reader can see it.

A **voice** miss falls back to the **learner's sentence**. It tells a coach *"Your coach hasn't
written this one up yet"* about their own review, and *"You've finished 7 things on this programme"*
about somebody else's work. It is grammatical, it is in the right language, and nothing in the graph
can see it.

So `tools/check-coach-voice.py` resolves the coach's bundle the way the graph does and fails on any
string that still addresses the reader as the learner.

**Its scope is a decision, not a default.** The first version asserted *"the word you appears nowhere
in the coach bundle"* and reported twenty-six failures, twenty of them strings on pages a coach never
opens — the lesson kit's placeholders, the learner's home, `/course`'s own eyebrows. Writing coach
wordings for those would have been writing copy nobody renders. The scan is scoped to the namespaces
a coach surface draws, and a coach page's own copy joins that list when it exists.

**And `"You wrote"` is correct for a coach**, which a bare second-person pattern cannot tell from
`"Your coach wrote"`. That is one named entry with its reason rather than a looser regex, because a
looser regex would excuse every real hit as well.

## Two mechanisms, each in the layer that owns the decision

Ported from the product, which puts them in exactly these two places:

- **a learner's programme has no `signal`** — that is the PROJECTION's decision, and
  `Logic/Ordered timeline` makes it. A signal is our inference about somebody's confusion, and a
  list of the times we thought they were stuck is not something to put in front of them.
- **a learner's row does not draw a `message`** — that is the RENDERER's decision, and
  `TimelineRow` makes it, because a conversation belongs to the thread.

The entries are loaded once for both audiences on purpose: branching the load is how two projections
start to disagree about what happened to a person.

**A null in a total map is a decision nobody can override; a prop is a decision the graph makes.**
That is why the kit's four `null`s became rules plus an `audience` port rather than staying `null`
for one audience and not the other.

## There is no default audience

An unset `audience` throws by name, in `Data/Strings` and again in `Logic/Ordered timeline`. A
default would mean a page that forgot to say renders the wrong audience's words with nothing
reporting it. The cost is real and was paid immediately: adding the input broke both existing
instances until each said which it was, and that is the mechanism working rather than a snag.

## What this template may claim

> A coach and their client read the same programme, assembled once, and never the same sentences.

Not *"the coach's surfaces are built"* — the words and the projection are here; `Pages/People` and
`Pages/Learner` are not, and nothing renders a coach's view yet. **A template with a coach view and
no sign-in must say that the gate is the backend's job**, and when those pages land that sentence
belongs in `START-HERE.md`.
