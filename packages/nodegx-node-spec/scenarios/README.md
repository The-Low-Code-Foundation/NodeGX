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
| `steps` | in order: `{ "set": "<port>", "value": … }` (omit `value` to write `undefined`), `{ "signal": "<port>" }`, or `"settle"` |
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
