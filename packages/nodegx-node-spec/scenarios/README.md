# Scenarios — the hand-written cases, one JSON file per node

A file is `scenarios/<catalog typeName>.json` holding an array. Each entry is one scenario, played from a
fresh mount on the reference (the spec interpreter) and on the target under test; the two traces are
compared line by line. The runner reads these files (`src/runner/scenario.ts`); a target's author reads
this page (NSP-006 asked for it).

```json
{
  "name": "Reset when already at Start Value reports unchanged",
  "params": { "startValue": 3 },
  "steps": ["settle", { "signal": "reset" }, "settle"],
  "because": "counter.ts :107-117 — the FH-022 guard"
}
```

| field | meaning |
|---|---|
| `name` | unique in the file; what the report prints |
| `params` | the node's parameters at mount, applied as ordinary writes in this key order (adapter.ts `mount`) |
| `steps` | in order: `{ "set": "<port>", "value": … }` (omit `value` to write `undefined`), `{ "signal": "<port>" }`, `{ "advance": <ms> }` (NSP-007: the world's clock moves — what the world already delivered lands, the clock moves and fires what is due, what that delivered lands), or `"settle"` |
| `world` | NSP-007, for a node whose spec declares `needs`: the world's script — `{ "seed": <n>, "network": [ { "match": { "method", "url" }, "answer": …, "after": <ms> } ] }`. `answer` is `{ "status", "statusText", "headers", "body" }` (a string body travels as text, anything else as its JSON text), `{ "error": "<message>" }` (never reaches a server), or `{ "never": true }`. The first rule whose `match` fits answers (absent `match` fits all; a `url` ending in `*` is a prefix). A request no rule answers FAILS the play (AC5). `"registry"` (NSP-012) seeds the shared records and arrays; `"timeZone"` (NSP-013) is the IANA zone the play runs in (absent: UTC); `"viewport"` (NSP-013 s13) is `{ "width", "height", "resizes": [ { "at": <ms>, "width", "height" } ] }` — a browser window whose size changes only at `at` on the world's clock (absent: no window at all, a server render); `"activation"` (NSP-015 s16) is `true` or `false` — whether the press came from a person, `navigator.userActivation.isActive` for the whole play (absent: the browser has no `userActivation`; read only with a window); `"location"` (NSP-015 s17) is the href the play's location starts at (absent: `https://app.example/`; read only with a window); `"projectSettings"` (NSP-015 s17) is the project's settings as a node reads them, e.g. `{ "navigationPathType": "path" }` (absent: `{}`, a project that set nothing); `"stack"` (NSP-015 s18) is the Component Stacks a navigation node hands its requests to — `{ "names": ["Main"], "answers": [ { "match": { "op", "target" }, "answer": "done" | "unchanged" | { "failure": { "code", "message" } } } ], "back": <answer> | [<answer>, …] }`: `names` the stacks registered (absent: none — every push is queued and never answered), `answers` first match wins (`done` when none fits), `back` what the n-th pop is told, the last repeating (absent: no Pop Component Stack sits in a pushed page); `"router"` (NSP-015 s19) is the Routers a Navigate hands its requests to, and the Router whose page a Page Inputs sits in — `{ "names": ["Main"], "answers": [ { "match": { "target", "noTarget": true, "openInNewTab" }, "answer": … } ], "page": [ { "params": { … } }, { "at": <ms>, "params": { … } } ] }`: `names` the routers registered (absent: none — every navigate is queued), `answers` as `stack`'s (`noTarget: true` fits a Target never set), told 1 ms after the call; `page` what the Router hands its page's Page Inputs — no `at` at the mount, `at` on the clock (absent: the node sits in no Router's page). Absent: seed 1, no answers. The rules of the world — the clock, the random stream, what goes on the wire — are the header of `src/world.ts` |
| `expect` | optional: a trace both targets are graded against; absent, the interpreter's trace is the expectation |
| `because` | free text — why the scenario exists: the docblock line, the divergence row. Written for the spec's reviewer; the rule itself is in the spec file |
| `seed` | on a replay the shrinker wrote: the generated sequence it came from |
| `row` | the §6 row of the phase's task files this scenario is KNOWN to fail under **on the runtime**, awaiting a ruling (R3 (a): the runtime wins until ruled). The runner reports the failure as `known`, not `failed` — and reports a PASS as "does not reproduce on <target>", which is expected on any target that does not carry the runtime's defect (the interpreter, a stranger's) and is a closed row on the runtime |

Values are in **canonical form** (`src/canonical.ts`): `{ "$num": "NaN" }`, `{ "$num": "-0" }`,
`{ "$num": "Infinity" }`, `{ "$date": "<ISO>" }` for what JSON cannot say; `loadScenarios` revives them and
the target receives the JavaScript value. A port name may be the empty string (String Format's `{}`).

The scenarios are the cases a person thinks of; the generated sequences (`src/runner/generate.ts`, seeded)
are the rest. A scenario whose reference trace has no observation event is refused — an arm with no
predicate grades nothing.
