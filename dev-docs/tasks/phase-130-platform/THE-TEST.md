# The test: the harness, the arms, the heat, the measures

## 1. The harness (what "obliging it to respect the canon" is made of)

The play kit does not exist yet (P126: nothing built). This phase builds the minimum, in one or two sittings, on our side.
The rule that matters is DIRECTION §0's: **prose advises, gates bind.** Every clause of the canon that can be a refusal is
one; the note is short.

| piece | what | from |
|---|---|---|
| `kit/knobs.mjs` | `knobs(group, {k: num(default, [min,max], unit, label, help) \| on() \| pick() \| colour() \| text()})`; returns a live object the code reads (`S.rate`); registers itself | new, small; the Kestrel's `legal`/`resolve`/`changesOf`/`show` lifted from `model.mjs` |
| `kit/model.mjs` | `model(id, {parts: {name: builder}, knobs, checks})`; `build(values)` tags every mesh `userData.part`; nested parts may declare their own knobs | Threadspace `models/model.mjs` + the part-as-function proposal (P129 §4) |
| `kit/place.mjs` | a level: a file exporting `place(id, {build, bounds, spawns, drive})` | new |
| `kit/design.mjs` | deltas in `design/<kind>/<id>.json`, layered under game state, `?design=default`, a refit hook | Threadspace `designs.mjs` |
| `kit/registry.mjs` + `tools/what.mjs` | everything above registers; `node tools/what.mjs` and `__play.what()` print the page | new; the graph-as-text shape |
| `kit/people.mjs` | the crowd route PEOPLE.md's probe picks | the probe |
| `tools/drive.mjs` + `tests/*.json` | headless Chrome at the owner's pixel ratio, `expect` with exit 1, a drive per place | Life Sim's `tools/drive.mjs` |
| `tools/check.mjs` | **the gates**, exit 1 | below |
| `CLAUDE.md` | the note (P129 §8), the procedure (brief → picture → rounds → LOOK.md), the folder shape, "run `check` before you say done" | castle canon + P129 |
| `RECORD.md`, `LOOK.md` | the owner's words verbatim; what the owner asked to keep | castle canon rule 2 |

**The gates in `check.mjs`** (each a line in the output naming the file; any one red is exit 1):

1. **No orphan number.** A numeric literal in `src/**` outside a `knobs()` call, outside an allow-list, without a
   `// why:` comment on its line. (Literals 0, 1, −1, 2, 0.5, array indices and `Math.PI` multiples are allowed.)
2. **Every mesh under a part.** A census of the scene after load: a `Mesh` with no `userData.part` on itself or an
   ancestor is named.
3. **The page prints.** `what.mjs` exits 0 and lists at least one model, one place and one knob group.
4. **The round-trip.** Every design file resolves to itself after a save and a reload.
5. **Files, not the browser.** No `localStorage`/`sessionStorage`/`indexedDB` write anywhere in `src/**`.
6. **A level is a file.** A commit that adds a file under `places/` and changes a file under `src/engine/**` is named.
7. **No panel unasked.** A file under `editors/` with no line in `RECORD.md` of the form `keep: <editor> — "<the owner's
   words>"` is named.
8. **No inert knob.** For every declared model, a render at each knob's two extremes differs by ≥ 12 px on its declared
   parts (the shipyard's `runGate`, framed on the parts).
9. **Every place drives green.** `tests/<place>.json` exists for every file under `places/` and passes.
10. **Strings a player reads are data.** A quoted string in `src/**` rendered to the DOM or a canvas outside `strings/`
    is named (heuristic: `textContent =`, `innerHTML =`, `fillText(` with a literal).

Gate 1 and gate 10 will cry wolf at first; the allow-list is tuned on a fixture before Opus sees it, and the rate of
false reds is itself recorded (a gate that cries wolf gets ignored, and an ignored gate is prose).

## 2. The arms

| arm | gets | does not get |
|---|---|---|
| **A** | a fresh folder with the harness, `CLAUDE.md`, the people shelf, the brief (BRIEF.md's quote + GAME.md §6 as "the first play") | this repo, its memory, `dev-docs/`, GAME.md §7 |
| **B** | a fresh folder with three.js vendored, Life Sim's drive tool, the same brief, the same people assets as plain GLBs | the kit, the gates, the note |

Same model (Opus 5.5), same owner, same rounds, same device. Day one is expected to look the same (OWN-023); the arms
part on the heat. Recipe from the stranger rounds (memory): fresh folders outside this repo so there is no memory and
nothing to grep; record what the agent could reach; `--allowedTools` pre-approves and does not restrict, so say what it
had.

## 3. The build rounds (the castle procedure, both arms)

1. The brief, one exchange. The agent asks its questions; Richard answers; the answers go in `RECORD.md` verbatim.
2. A picture. Time to the first thing Richard can look at.
3. Rounds: Richard plays, writes a numbered list in `LOOK.md`; one session builds the list and republishes to the same
   address. Three rounds or until Richard says it is fun, whichever is later.

Measured per arm: minutes and dollars to the picture; rounds to "fun"; lines of code; `check.mjs` reds the agent
suppressed or argued with (arm A); what the agent did with the gates it could not pass (the finding, as in OWN-018).

## 4. The heat: the pedant's list

Richard asks these, in his words, after the build is "fun". Ten asks escalate from a knob to an editor to a new level,
and each one tests a specific clause. His own asks go on top, verbatim.

| # | the ask (the floor; Richard rewords) | what it tests | what "handled" looks like |
|---|---|---|---|
| 1 | "The hydroponics lamps are too white. A bit violet." | a knob exists and is found by name | one value changed in a design file; 0 engine files |
| 2 | "The generator is too loud for the first minute, then fine." | a knob the author did not think of (a curve over time) | a new knob where a constant was; no panel built |
| 3 | "I want to pick every dweller's jumpsuit colour myself." | an editor on demand, per instance, and keep or throw away asked | an `editors/jumpsuits` built from the people declaration; `RECORD.md` says keep or not; nothing else touched |
| 4 | "Let me take a crack at the infirmary's layout." | the shipyard case: an editor over one room's model | a stage over the infirmary's parts and knobs; the game reads the design file; refit without reload |
| 5 | "The rats' tails are too short, and they run too fast on the roof only." | a part, and a knob scoped to a place | a part change on the rat model; a per-place knob; 0 engine files |
| 6 | "I want the generator exhaust to be real particles, with turbulence, and I want to tune it." | the one-in-a-hundred: a part replaced by a new builder with nested knobs, and a specific editor | a new `exhaust` builder under the same part name declaring its knobs; an editor framing the generator; the hull of the game untouched |
| 7 | "Add a level: the drowned lighthouse out past the bay, with jellyfish that glow." | **the month-two test** (P129 §6) | a new file under `places/`, a jellyfish model, a drive; 0 files under `src/engine/`; every old drive still green; design files untouched |
| 8 | "Rename Grit to Guts everywhere a player sees it." | strings as data | one change in `strings/`; the registry page shows it |
| 9 | "Undo what I did to the lamps last time but keep the jumpsuits." | deltas per thing | one key removed from one design file |
| 10 | "Why does the baker always lose the vote?" | an explanation from the registry and the record, not a change | an answer naming the knobs and rules involved, with their values; 0 files changed |

Arm B gets the same ten. The expectation is not that B fails them; it is that B's diffs are larger, touch the engine, and
break old things more often. If B handles the list as well as A, the canon has not earned its claim and P129 says so.

## 5. The measures (per ask, per arm)

- files touched; files under `src/engine/**` touched (A: expected 0 for asks 1–9)
- lines changed
- old drives red after the change (the regression count)
- design files changed by the agent that the owner did not ask about (the "did it break my stuff" count)
- tool calls and minutes before the first edit (did it read the page, or re-read the game?)
- built only what was asked: yes/no, with the owner's words
- for asks 3, 4, 6: was the editor built as a view (no game code changed to make it), and did the owner's keep/throw
  ruling land in `RECORD.md`
- Richard's verdict on each, verbatim

## 6. What would make this phase a failure, and still worth it

- Opus under the harness cannot get to a picture in a sitting: the gates are too heavy, and the castle's rule wins. Then
  the gates are cut to the three that matter (orphan number, mesh under a part, files not browser) and the round reruns.
- Opus suppresses or games the gates (a `// why:` on every line): recorded as the finding; the gate's shape changes.
- The people probe fails on the tablet at 200: the game caps dwellers at what the tablet holds, and the number goes in
  the brief.
- A and B come out the same on the heat: the honest result, written into P129 before anything public says otherwise.
