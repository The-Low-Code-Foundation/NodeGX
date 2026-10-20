# SEE-003 — The picture follows the app: the inspector works on the export too

**Opened 2026-10-01.** **Depends on P101 (built), NSP-002 (built), P18's export.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone running the React export of their app, outside the editor, can attach the inspector and see the same live
> values on the same wires they saw in the preview, and if the export ever behaves differently from the preview, a row
> says where.**

## 2. Why

"Under the hood" means at runtime. The P101 inspector and `nodegx-observe`'s session dictionary (topology over a socket)
give the editor a live picture of the interpreted app. The moment the person takes the way out (export), the picture
goes dark, and the way out stops being a reason to stay. NSP-002 made traces able to "name a subject other than a node";
NSP-007 records network as plain HTTP so two implementations produce comparable traces. **This task is those two doors
walked through: the export emits the same traces, so the picture follows the app.**

## 3. What to build

1. **The emitter in the exported runtime** (`@nodegx/core` side): behind a flag, every node instance publishes value
   changes, pulses and outcomes in the P107 trace format over the observe socket, keyed by the same node ids the
   project file carries (SEE-002's deterministic ids help here).
2. **The inspector attaches to either**: the editor's observe client accepts an exported app as a peer, and the
   inspector shows last-sent values from whichever is attached, saying which one.
3. **The divergence row**: with both attached and the same scripted input (NSP-007's World, replayed), a trace diff is a
   red row with the node, the port and the two values. This is P107's parity test on a whole app instead of a scenario.
4. **The phone**: P110 PKT-005's Swift runtime gets the same socket protocol named in its brief, so PKT-012's reveal can
   show three homes with one inspector. Not built here; named here so the protocol is not web-shaped.

## 4. Acceptance criteria

1. The todo export, run from `npm start`, attaches to the editor's inspector and shows a task's title value on the wire
   that carries it when a task is added.
2. The same drive on the interpreted todo and on the export produces identical traces for the nodes the drive touches,
   or the divergence row names the first difference.
3. The flag off, the export's bundle size is unchanged within the P18 bundle budget (memory: *a bundle size claim is
   about the build config*).
4. The protocol is written in `packages/nodegx-observe/PROTOCOL.md` in words a Swift author can implement from.

## 5. Watch for

- Memory: *a frame throttle never fires in a hidden window.* The emitter must not depend on rAF.
- Memory: *a JavaScript output publishes only when it changes.* The trace format already says what "changed" means
  (NSP-006 §5.3 item 6); use that sentence, do not write a second one.
