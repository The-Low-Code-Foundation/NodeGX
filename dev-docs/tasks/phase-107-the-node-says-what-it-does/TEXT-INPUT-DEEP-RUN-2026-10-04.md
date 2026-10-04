# Text Input — the runtime's 10,000-sequence run, 2026-10-04 (s39 ran it for s38)

Raw excerpt of `NSP_DEEP=10000 NSP_ONLY=net.noodl.controls.textinput npx jest test/node-spec/conformance.test.ts` (runtime, the day's seed); the 200-run before it conforms. Kept so s40 need not re-run the hour: the ten unattributed divergences (shrunk) and the twenty-two surviving mutants. Interpreter at 10,000 (seed 20729): 0 divergences, 8 swap twins (NSP-016 §7.3).

## s40's reading (2026-10-04) — every one replayed on both targets, traces aligned; six rules, none a face gap

| seed | shape | the rule (NSP-016 §7.5) |
|---|---|---|
| 3033132983 | `aabc` vs `abca` — Insert after a Type change Email → Text lands at the start | HTML's type change steps: a type without the selection API to one with it puts the cursor at the START; the spec now keeps the caret (`caret`, `hadCaret`); row D35's second half |
| 282795636 | off the page, Insert `0` then Set with no Value ever written: the wire holds `'0'` | node.ts never sends `undefined`: the wire keeps the last defined value while the getter is emptied (`wire` beside `out`, [[last-sent-value]]) |
| 2571860563 · 1540320501 · 1028244634 | Max length `-0.5`: typing lands nothing | HTML parses `maxlength="-0.5"` as 0 (`-0` is not negative) — the SPEC's parse refused the sign and read "no limit"; the face was right |
| 3516661601 | Backspace, `advance 0`, Insert: `fals0` | an `advance` is a turn of the event loop: React commits the component's own setState (`world.turn`, a new world-handler kind) |
| 3346361197 | Value `[]`, `advance 0`, Backspace Unchanged | the same turn: the Value's `''` committed before the Backspace read the field |
| 3064539079 | Text Area `[object Object]`, Insert queued, Focus action: `0[object Object]` | a fresh `<textarea>`'s cursor is at the START (default content) — the Focus action set `hadCaret`, the Insert went to the cursor: row D35 |
| 3832506663 · 955539596 | Type Number then Clear / Backspace in one frame: `''` not `null` | the component converts with `this.props.type` as LAST RENDERED (`shownType`; the Max length too, `shownMaxLength`): row C72 |

The twelve survivors: see §7.5 (the `person.key` drop-set is killed by a Blur-reading scenario; the rest re-measured after the rules above).

```
    net.noodl.controls.textinput v1 on runtime: CONFORMS (171517 ms, seed 20730)
    net.noodl.controls.textinput v1 on runtime: DOES NOT CONFORM (3522839 ms, seed 20730)
    ✕ net.noodl.controls.textinput at 10000 (3522853 ms)
        seed 3033132983 (shrunk to 5 step(s) in 101 runs)
          params {"type":"email","textToInsert":"abc"}  steps [{"act":"type","value":"a"},{"set":"type"},{"signal":"insert"},{"act":"leave"},"settle"]  world {"seed":3033132983}
          first difference at event 11:
            interpreter  {"t":"value","port":"onTextChanged","value":"aabc"}
            runtime      {"t":"value","port":"onTextChanged","value":"abca"}
        seed 282795636 (shrunk to 3 step(s) in 67 runs)
          params {"textToInsert":0,"mounted":""}  steps [{"signal":"insert"},{"signal":"set"},"settle"]  world {"seed":282795636}
          first difference at event 9:
            interpreter  {"t":"value","port":"pressedState","value":false}
            runtime      {"t":"value","port":"onTextChanged","value":"0"}
        seed 2571860563 (shrunk to 2 step(s) in 72 runs)
          params {"maxLength":-0.5}  steps [{"act":"type","value":"42"},"settle"]  world {"seed":2571860563}
          first difference at event 7:
            interpreter  {"t":"value","port":"onTextChanged","value":"42"}
            runtime      {"t":"value","port":"onTextChanged","value":""}
        seed 3516661601 (shrunk to 4 step(s) in 123 runs)
          params {"startValue":false,"textToInsert":0}  steps [{"signal":"backspace"},{"advance":0},{"signal":"insert"},"settle"]  world {"seed":3516661601}
          first difference at event 10:
            interpreter  {"t":"value","port":"onTextChanged","value":"false0"}
            runtime      {"t":"value","port":"onTextChanged","value":"fals0"}
        seed 3064539079 (shrunk to 3 step(s) in 70 runs)
          params {"type":"textArea","startValue":{},"textToInsert":0}  steps [{"signal":"insert"},{"signal":"focus"},"settle"]  world {"seed":3064539079}
          first difference at event 10:
            interpreter  {"t":"value","port":"onTextChanged","value":"[object Object]0"}
            runtime      {"t":"value","port":"onTextChanged","value":"0[object Object]"}
        seed 3832506663 (shrunk to 3 step(s) in 77 runs)
          params {}  steps [{"set":"type","value":"number"},{"signal":"clear"},"settle"]  world {"seed":3832506663}
          first difference at event 7:
            interpreter  {"t":"value","port":"onTextChanged","value":null}
            runtime      {"t":"value","port":"onTextChanged","value":""}
        seed 1540320501 (shrunk to 2 step(s) in 68 runs)
          params {"maxLength":-0.5}  steps [{"act":"type","value":"x y"},"settle"]  world {"seed":1540320501}
          first difference at event 7:
            interpreter  {"t":"value","port":"onTextChanged","value":"x y"}
            runtime      {"t":"value","port":"onTextChanged","value":""}
        seed 3346361197 (shrunk to 4 step(s) in 66 runs)
          params {"startValue":0}  steps [{"set":"startValue","value":[]},{"advance":0},{"signal":"backspace"},"settle"]  world {"seed":3346361197}
          first difference at event 15:
            interpreter  {"t":"signal","port":"textChanged"}
            runtime      {"t":"outcome","port":"backspace","value":"unchanged"}
        seed 1028244634 (shrunk to 2 step(s) in 67 runs)
          params {"maxLength":-0.5}  steps [{"act":"type","value":"x y"},"settle"]  world {"seed":1028244634}
          first difference at event 7:
            interpreter  {"t":"value","port":"onTextChanged","value":"x y"}
            runtime      {"t":"value","port":"onTextChanged","value":""}
        seed 955539596 (shrunk to 3 step(s) in 79 runs)
          params {"startValue":"3"}  steps [{"set":"type","value":"number"},{"signal":"backspace"},"settle"]  world {"seed":955539596}
          first difference at event 8:
            interpreter  {"t":"value","port":"onTextChanged","value":null}
            runtime      {"t":"value","port":"onTextChanged","value":""}
      mutants: 4065 / 4087 killed
        SURVIVED person.key drop-set on branch {"set":[],"emit":["onEnter"],"outcome":null,"outcomes":[],"request":false}
        SURVIVED afterInputs drop-set on branch {"set":["onPage","queue","startValue"],"emit":["didMount"],"outcome":null,"outcomes":["set:unchanged"],"request":false}
        SURVIVED person.hover swap-branch on branch {"set":["hover","queue","startValue"],"emit":["hoverStart"],"outcome":null,"outcomes":["insert:unchanged","set:unchanged"],"request":false} ↔ {"set":["hover"],"emit":["hoverStart"],"outcome":null,"outcomes":[],"request":false}
        SURVIVED afterInputs drop-set on branch {"set":["announced","elementFocused","hasAnnounced","onPage","out","queue","startValue"],"emit":["textChanged","willUnmount"],"outcome":null,"outcomes":["insert:unchanged","set:done"],"request":false}
        SURVIVED person.type swap-branch on branch {"set":["announced","hasAnnounced","onPage","out"],"emit":["textChanged","didMount"],"outcome":null,"outcomes":[],"request":false} ↔ {"set":[],"emit":[],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.type swap-branch on branch {"set":["announced","hasAnnounced","onPage","out"],"emit":["textChanged","didMount"],"outcome":null,"outcomes":[],"request":false} ↔ {"set":["elementFocused"],"emit":[],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.release swap-branch on branch {"set":["announced","hasAnnounced","onPage","out"],"emit":["textChanged","didMount"],"outcome":null,"outcomes":[],"request":false} ↔ {"set":[],"emit":[],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.release swap-branch on branch {"set":["announced","hasAnnounced","onPage","out"],"emit":["textChanged","didMount"],"outcome":null,"outcomes":[],"request":false} ↔ {"set":["elementFocused"],"emit":[],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.lift swap-branch on branch {"set":["pressed","queue","startValue"],"emit":["pointerUp"],"outcome":null,"outcomes":["insert:unchanged","set:unchanged"],"request":false} ↔ {"set":["pressed"],"emit":["pointerUp"],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.focus swap-branch on branch {"set":["announced","hasAnnounced","onPage","out"],"emit":["textChanged","didMount"],"outcome":null,"outcomes":[],"request":false} ↔ {"set":[],"emit":[],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.focus swap-branch on branch {"set":["announced","hasAnnounced","onPage","out"],"emit":["textChanged","didMount"],"outcome":null,"outcomes":[],"request":false} ↔ {"set":["elementFocused"],"emit":[],"outcome":null,"outcomes":[],"request":false}
        SURVIVED person.release swap-branch on branch {"set":["pressed","queue","startValue"],"emit":["pointerUp"],"outcome":null,"outcomes":["insert:unchanged","set:unchanged"],"request":false} ↔ {"set":["pressed"],"emit":["pointerUp"],"outcome":null,"outcomes":[],"request":false}


```
