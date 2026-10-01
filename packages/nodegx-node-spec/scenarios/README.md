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
| `world` | NSP-007, for a node whose spec declares `needs`: the world's script — `{ "seed": <n>, "network": [ { "match": { "method", "url" }, "answer": …, "after": <ms> } ] }`. `answer` is `{ "status", "statusText", "headers", "body" }` (a string body travels as text, anything else as its JSON text), `{ "error": "<message>" }` (never reaches a server), or `{ "never": true }`. The first rule whose `match` fits answers (absent `match` fits all; a `url` ending in `*` is a prefix). A request no rule answers FAILS the play (AC5). `"registry"` (NSP-012) seeds the shared records and arrays; `"timeZone"` (NSP-013) is the IANA zone the play runs in (absent: UTC); `"viewport"` (NSP-013 s13) is `{ "width", "height", "resizes": [ { "at": <ms>, "width", "height" } ] }` — a browser window whose size changes only at `at` on the world's clock (absent: no window at all, a server render). Absent: seed 1, no answers. The rules of the world — the clock, the random stream, what goes on the wire — are the header of `src/world.ts` |
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
