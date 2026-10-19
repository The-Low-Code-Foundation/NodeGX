# three-kit — three.js as NodeGX nodes (a prototype)

**Status: prototype, parked.** The idea and its measurement are in
[`dev-docs/parked/THREE-IN-NODES.md`](../../../dev-docs/parked/THREE-IN-NODES.md). Not in the kit catalog, not in the
picker, no node-spec entries: it exists to answer one question, *does a NodeGX graph with a Scene node and Mesh children,
a For Each among them, draw a three.js scene the graph controls?* The drive says yes.

## The nodes

| node | what | under |
|---|---|---|
| `Scene` | a WebGL canvas; Background, Floor Grid, Camera Distance / Height / Angle, Field Of View, Orbit (drag turns, wheel zooms); out Ready, Supported, Mesh Count, Tapped Name, Tapped | any visual parent |
| `Mesh` | one primitive: Shape (box, sphere, cylinder, cone, torus, plane), Name, Colour, Wireframe, X Y Z, Width Height Depth, Rotation Y, Sit On Floor, Spin, Spin Speed; out Tapped | a Scene, or a For Each under one |
| `Light` | Sun, Lamp or Sky; Colour, Ground, Intensity, X Y Z | a Scene |

A Mesh or a Light draws nothing itself. It tells the Scene above it what it is through a React context, and the Scene
keeps one three.js object per mounted child. That is why a `For Each` under a Scene makes one mesh per row: the viewer
renders a row's component under the Scene exactly as it renders one under a Group.

🔴 **A child's identity is per mounted instance, never the node id.** Under a For Each every row's Mesh is the same node
rendered many times; keying by `noodlNode.id` collapsed eight rows into one object on the prototype's first drive.

## Build, assemble, deploy, drive

```
node library/modules/three-kit/build.mjs
node scripts/devtools/drive-three-kit.js assemble /tmp/three-app
node node_modules/.bin/nodegx deploy /tmp/three-app /tmp/three-site --allow-development-engine
node scripts/devtools/drive-three-kit.js /tmp/three-site --shots /tmp/shots --json /tmp/drive.json
```

The fixture is `dev-docs/parked/three-in-nodes/fixture/`: a Scene, two Lights, a spinning ball whose Y is a Variable,
and a For Each over a Static Data of eight rows whose template is one Mesh with Height wired to the row's value. The
drive runs headless Chrome on software GL (`--use-angle=swiftshader`) and reads the ports through Variables and the
scene graph through the Scene root; the screenshot is a look check, not the gate.

three.js 0.158.0 is vendored beside the kit as `three.min.js` (MIT, `LICENSE.txt`), the garden-3d-kit way: listed in
`manifest.json` `dependencies`, loaded before `index.js`, read as the `THREE` global at mount.
