# NSP-007 — The world: clock, randomness, network, backend

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: 📋 not started.**

## 1. The person sentence

> **A node that waits, rolls dice, or talks to a server is specced as a conversation with the
> outside world, and that world is scripted — so its behaviour is as checkable as Counter's.**

## 2. What to build

A `World` the runner owns and every adapter is handed. Four parts:

| part | what the spec sees | what the test controls |
|---|---|---|
| **Clock** | `now()`, `after(ms, event)`, frame ticks | `advance(ms)`; the time zone and locale are fixed per scenario |
| **Randomness** | `random()`, `bytes(n)`, `uuid()` | the seed |
| **Network** | reducers return `request: {…}` effects; responses arrive as events | a script: *for request matching R, answer X after N ms* (or fail, or never) |
| **Backend** | the same, for records, users, files, cloud functions | a scripted backend reusing `nodegx-backend-contract`'s filter and record semantics, **not** a real server |

Reducers stay pure: an effect is a value the reducer returns (`{ request: … }`, `{ after: … }`),
and the interpreter hands it to the world. Adapters for the runtime and the export install the
same world into their own seams (fake timers, a fetch stand-in, the backend client stand-in).

Traces gain `request` and `response` events, so *what the node asked for* is compared too, not
only what it did with the answer.

**Requests are recorded at the HTTP level** — method, URL, the headers that carry meaning, and
the body — never in the NodeGX backend's own vocabulary (not "query collection X with filter F").
The record-node specs may *also* state the query in the contract's neutral filter model, but the
trace records what went over the wire. Two reasons:
- a target talking to a different backend (Supabase, PocketBase — both already declared types in
  `nodegx-backend-contract/src/backends.ts`) produces traces that can still be compared; and
- a future *import your app into a canvas* feature (README §8) would record a hand-written React
  app's network traffic and the imported graph's, and compare them. HTTP is the one language both
  speak.

Normalisation (volatile headers, generated ids, timestamps, query-parameter order) is a table in
the canonicaliser (NSP-002), not ad hoc in each scenario.

## 3. Acceptance criteria

1. **Delay** (clock), **UUID** (randomness) and **HTTP Request** (network) have specs that conform
   on the runtime and the export.
2. A scenario that advances the clock past a Delay proves the pulse lands at the right `settle`,
   and one that does not advance it proves the pulse does **not** arrive (an absence asserted
   beside a known-firing control, memory).
3. HTTP Request's trace includes the request it made (method, URL, headers it chose, body), and a
   failing response takes the *Failure* path with the outcome contract's `failed`.
4. A request event recorded from a **plain `fetch` call outside NodeGX** (a hand-written fixture)
   validates against the same schema and compares equal to HTTP Request's event for the same call
   after normalisation — proof the format is not NodeGX-specific.
5. No scenario touches the real network or the real clock (the runner fails a run that does).

## 4. Watch for

- Memory: *a frame throttle never fires in a hidden window* — `requestAnimationFrame` must come
  from the world's clock in every adapter, or the export adapter will hang headless.
- Memory: *`Timer` is one-shot; NodeGX has no ticker node.* Spec what the node does, not what its
  name suggests.
- The backend fake must not become a second backend. Use the contract's filter semantics; skip
  anything the conformance suite at `nodegx-backend-contract/conformance/` already grades.

## 5. Built

*(empty)*
