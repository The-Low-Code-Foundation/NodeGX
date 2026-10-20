# Round 2: seeing the backend as one real person, for real

Everything in BACKEND.md still holds. This page adds the one mechanism the new asks need, measured today on the same
running backend: **you can run the app's functions AS any person in the database, and read exactly what they get.**

## A key that acts as a person

- `POST /admin/keys` (admin credential) with `{ "name": "view-as-<who>", "scopes": ["functions:*"], "actsAsUserId": "<the person's objectId from /admin/users>" }`
  → `{ objectId, name, scopes, actsAsUserId, secret }`. The `secret` (`ngxk_…`) is shown once. `DELETE /admin/keys/<objectId>`
  removes it. Keep keys short-lived: make one, ask, delete it. Never show a secret on screen or write it to a file
  that ships.
- A key bound to a person is **narrowed to that person**: it may call only what its scopes allow AND what that
  person's rules allow, and inside a function it IS that person (the function's "signed-in learner" is them; a
  function that reads "the caller's rows" reads theirs). An unbound key is a server credential and sees everything
  its scopes name: do not use one for this.

## Running a function as that person: the MCP door

The plain HTTP door (`POST /functions/<name>`) does **not** carry the acting person into the function: with the
bound key it passes the rule but the function answers *"Unauthenticated requests not accepted."* (measured; filed as
a backend defect). The door that does is the backend's MCP endpoint, which offers exactly the functions that person
may call and runs them as them:

```
POST /mcp
Authorization: Bearer <the key's secret>
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"tools/list"}
→ {"result":{"tools":[{"name":"course","description":"…"},…]}}     (only what this person may call)

{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"course","arguments":{}}}
→ {"result":{"content":[{"type":"text","text":"{\"result\":{\"rows\":[…]}}"}]}}   (the function's answer, as JSON text)
```

A function's arguments are the same ones the page sends it (read the page's `CloudFunction2` node and what feeds it;
the tool's `description` says what it takes). A refused call answers a JSON-RPC error with the words.

**Measured today:** as Marie (a learner), `course` answered her project, her lessons and **her** conversation
(`conv-l-marie`). As the other eleven people it did not contain hers. The staff member's key is offered the staff
functions as well.

## What this makes possible, honestly

- *View as a real person*: their reachable functions are `tools/list` under their key (the rules, computed by the
  backend); their reachable tables directly are `POST /admin/permissions/check` with `{ "principal": { "kind": "user",
  "userId": … }, "collection": …, "op": … }`; what they reach THROUGH a function is only known by running it.
- *Follow a pathway*: "this person on the Course page" = the functions that page asks for, called as them, and what
  came back, shown as the page would show it (rows, counts, the words). Not a simulation: the real answer.
- *One record's reach*: for a row (say one Conversation), who can reach it = (a) directly: `permissions/check` with
  `"record": <the row>` for each person (the rules and the row's ACL); (b) through functions: call, as each person,
  every function that touches that table, and look for the row's id in the answers. Twelve people × a few functions
  is seconds. Say on screen which functions were run and that a function with required arguments you could not
  supply was not run.
- Every call made this way is a real run and lands in `/executions` and on the map's "what just ran". Say so, and
  make the probing calls visibly yours (a key named `view-as-…`).
