# SEE-011 — Your app has tests: record a drive once, replay it after every change

**Opened 2026-10-06** from [DIRECTION.md](../../DIRECTION.md) D1 (ruled by Richard: app-level tests live in this phase,
beside SEE-003). **Depends on SEE-003, P107 NSP-002 and NSP-007 (built).**
**Status: 📋 not started.**

## 1. The person sentence

> **I tell my agent "add a task, tick it, reload" once. From then on, every change the agent makes is checked against
> what the app did that time, and if it now does something different, I'm told which screen and which value.**

## 2. Why

The testing reason in DIRECTION.md §3 has two halves. P107's conformance suite tests every node against its spec. Nothing
tests the app: whether the agent wired those nodes together the way the person wanted. A vibe coder never writes tests,
so the test has to come from using the app once.

## 3. What exists

- P107's trace format can name a subject other than a node (NSP-002). The `World` scripts the clock, randomness and the
  network (NSP-007). The runtime target already plays two-to-six-node graph scenarios (NSP-008).
- SEE-003 makes a running app, interpreted or exported, emit those traces over the observe socket.
- Not measured: whether the runtime target can load a whole project rather than a scenario's graph. Step 1 measures it.

## 4. What to build

1. **Measure** whether a whole template mounts in the runtime target headlessly, and how long a drive takes.
2. **Record.** A drive of the running app (taps, typing, navigation) with a scripted `World` becomes a trace file in the
   project, named by the person's words.
3. **Replay.** One MCP tool and one CLI command replay every recorded drive and report the first difference: the
   component, the node, the port and the two values.
4. **In every write.** The MCP runs the drives after a write the way it runs validation, and says so in its result.

## 5. Acceptance criteria

1. A drive recorded on the todo template replays green on the unchanged project.
2. A planted change to one wire makes the replay red and names that wire's component and port.
3. The replay grades something: each drive produces at least one event, checked by the runner (memory: *a rule reading
   zero in both arms grades nothing*).

## 6. Watch for

- Memory: *a self-healing defect is invisible to every arm that completes*. A drive that only checks the end state
  misses a value that was wrong on the way.
- Memory: *a frozen fixture answers a different question once its subject moves*. A drive the person no longer wants
  must be easy to re-record, not edited by hand.
