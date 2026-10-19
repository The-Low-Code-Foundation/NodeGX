# three-kit — three.js as NodeGX nodes (a prototype)

**Status: a prototype, being grown into a kit (Richard, 2026-10-19: nodes first, on npm too).** The idea, the rulings
and the readings are in [`dev-docs/parked/THREE-IN-NODES.md`](../../../dev-docs/parked/THREE-IN-NODES.md). A project
that has it in `noodl_modules/` gets its nodes in the MCP's catalog through the project overlay, the way every kit does
(`packages/noodl-mcp/tests/three-kit-catalog.test.ts`). No node-spec entries yet.

## The nodes

| node | what | under |
|---|---|---|
| `Scene` | a WebGL canvas; Width, Height, Background, Floor Grid, Camera Distance / Height / Angle, Field Of View, Orbit (drag turns, wheel zooms); out Ready, Supported, Mesh Count, Tapped Name, Tapped | any visual parent |
| `Mesh` | one primitive: Shape (box, sphere, cylinder, cone, torus, plane), Name, Colour, Wireframe, X Y Z, Width Height Depth, Rotation Y, Sit On Floor, Spin, Spin Speed; out Tapped | a Scene, a 3D Group, or a For Each under one |
| `Light` | Sun, Lamp or Sky; Colour, Ground, Intensity, X Y Z | a Scene or a 3D Group |
| `3D Group` (`three-kit.Group`) | Name, X Y Z, Rotation Y, Scale, Spin, Spin Speed; out Tapped (a tap on any mesh inside it). What is under it moves, turns and scales with it; a mesh with no Name is reported by the group's | a Scene, a 3D Group, or a For Each under one |

**Movement is the built-in Animate To Value**, not a kit node: wire its Current Value into a Mesh's or a 3D Group's X,
and a new Target Value glides it there (the fixture's robot; the drive's ANIM clause).

A Mesh, a Light or a 3D Group draws nothing itself. It tells the Scene above it what it is through a React context, and the Scene
keeps one three.js object per mounted child. That is why a `For Each` under a Scene makes one mesh per row: the viewer
renders a row's component under the Scene exactly as it renders one under a Group.

🔴 **A child's identity is per mounted instance, never the node id.** Under a For Each every row's Mesh is the same node
rendered many times; keying by `noodlNode.id` collapsed eight rows into one object on the prototype's first drive.

🔴 **A child speaks before its parent.** React runs a child's effects before its parent's, so a Mesh inside a 3D Group
reaches the engine before the group does. The engine parks it in the scene and the group adopts it when it arrives.

🔴 **Nothing says when a Mesh is outside a Scene** (PARKED-THREE-S2-MESHOUTSIDE): it validates clean and draws nothing.

## Build, assemble, deploy, drive

```
node library/modules/three-kit/build.mjs
node scripts/devtools/drive-three-kit.js assemble /tmp/three-app
node node_modules/.bin/nodegx deploy /tmp/three-app /tmp/three-site --allow-development-engine
node scripts/devtools/drive-three-kit.js /tmp/three-site --shots /tmp/shots --json /tmp/drive.json
```

The fixture is `dev-docs/parked/three-in-nodes/fixture/`: a Scene 520 px tall, two Lights, a spinning ball whose Y is a
Variable, a For Each over a Static Data of eight rows whose template is one Mesh with Height wired to the row's value,
and a robot (a 3D Group of three unnamed meshes) whose X comes out of an Animate To Value. The
drive runs headless Chrome on software GL (`--use-angle=swiftshader`) and reads the ports through Variables and the
scene graph through the Scene root; the screenshot is a look check, not the gate.

three.js 0.158.0 is vendored beside the kit as `three.min.js` (MIT, `LICENSE.txt`), the garden-3d-kit way: listed in
`manifest.json` `dependencies`, loaded before `index.js`, read as the `THREE` global at mount.
