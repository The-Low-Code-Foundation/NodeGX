/**
 * HLT-017 — the ports a card and a column need to be dragged between.
 *
 * The behaviour is graded by a drive (`scripts/devtools/drive-hlt017-drop.js`), because a drag is
 * pointer events, hit-testing and layout, and this package's jest runs with no DOM. What is left
 * for a spec is the shape of the promise, and one row that exists because the drive caught it:
 *
 * 🔴 **Every output name the controller writes must be a declared port.** `drag-drop.ts` names its
 * outputs as strings — `signal(node, 'dragCancelled')` — and `signal` checks `hasOutput` first, so
 * a misspelt name is not an error, it is silence. The first build signalled `'cancelled'` on a
 * port declared `dragCancelled`; everything typechecked, every other row passed, and the source's
 * Cancelled never fired. The row below reads the names out of the source and fails on that.
 */

/* eslint-env jest */

// `text.ts` reads `Noodl.deployed` at import time; see DEF-029's spec for why this sits here.
(globalThis as Record<string, any>).Noodl = { deployed: false, baseUrl: '/' };

import fs from 'fs';
import path from 'path';

import NodeSharedPortDefinitions from '../src/node-shared-port-definitions';
import CircleNode from '../src/nodes/visual/circle';
import ImageNode from '../src/nodes/visual/image';
import TextNode from '../src/nodes/visual/text';
import VideoNode from '../src/nodes/visual/video';

const text = (TextNode as any).node;

/** Group cannot be imported in this package (DEF-029's spec says why); drive the mutator it calls. */
function groupLike(): any {
  const def: any = { name: 'Group', inputs: {}, outputs: {}, inputCss: {} };
  NodeSharedPortDefinitions.addDragDropPorts(def);
  return def;
}

describe('HLT-017 — the ports exist, off by default', () => {
  it('gives every visual node that takes file drops the two checkboxes as well', () => {
    for (const [name, mod] of [
      ['Text', TextNode],
      ['Image', ImageNode],
      ['Circle', CircleNode],
      ['Video', VideoNode]
    ] as const) {
      const def = (mod as any).node;
      expect(`${name}:${def.inputs.draggable && def.inputs.draggable.default}`).toBe(`${name}:false`);
      expect(`${name}:${def.inputs.acceptDrops && def.inputs.acceptDrops.default}`).toBe(`${name}:false`);
    }
  });

  it('hides everything but the checkbox on each side until it is switched on', () => {
    const source = text.dynamicports.find((d: any) => d.condition === 'draggable = true');
    const zone = text.dynamicports.find((d: any) => d.condition === 'acceptDrops = true');

    expect(source.inputs).toEqual(['dragValue', 'dragKind', 'holdToDrag', 'holdTime']);
    expect(source.outputs).toEqual(['pickedUp', 'landed', 'dragCancelled', 'isLifted']);
    expect(zone.inputs).toEqual(['acceptKind', 'makeRoom', 'dropZoneName']);
    expect(zone.outputs).toEqual(['dropped', 'droppedValue', 'dropIndex', 'isDropTarget']);
  });

  it('carries the three rulings in its defaults: hold on touch, half a second, make room', () => {
    const def = groupLike();
    expect(def.inputs.holdToDrag.default).toBe('touch');
    expect(def.inputs.holdTime.default).toBe(0.5);
    expect(def.inputs.makeRoom.default).toBe(true);
  });

  it('names the zone outputs the way the task file specified them', () => {
    const def = groupLike();
    expect(def.outputs.isDropTarget.displayName).toBe('Drag Over');
    expect(def.outputs.dropped.displayName).toBe('Dropped');
    expect(def.outputs.droppedValue.displayName).toBe('Dropped Value');
    expect(def.outputs.dropIndex.displayName).toBe('Drop Index');
    expect(def.outputs.droppedValue.type).toBe('*');
  });

  it('does not collide with any File Drop port on the same node', () => {
    const fileDrop: any = { name: 'X', inputs: {}, outputs: {}, inputCss: {} };
    NodeSharedPortDefinitions.addFileDropPorts(fileDrop);
    const def = groupLike();
    const taken = new Set([...Object.keys(fileDrop.inputs), ...Object.keys(fileDrop.outputs), ...Object.keys(fileDrop.outputProps || {})]);
    for (const name of [...Object.keys(def.inputs), ...Object.keys(def.outputs)]) {
      expect(`${name}:${taken.has(name)}`).toBe(`${name}:false`);
    }
  });
});

describe('HLT-017 — every output the controller writes is one the node declares', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/drag-drop.ts'), 'utf8');
  const written = Array.from(source.matchAll(/\b(?:signal|publish)\(\s*[\w.]+,\s*'([^']+)'\s*\)/g)).map((m) => m[1]);

  it('finds the writes at all (a regex that matches nothing grades nothing)', () => {
    // Picked Up, Landed, Cancelled, Is Lifted, Dropped, Dropped Value, Drop Index, Drag Over.
    expect(new Set(written).size).toBe(8);
  });

  it('declares every one of them', () => {
    const def = groupLike();
    for (const name of written) expect(`${name}:${!!def.outputs[name]}`).toBe(`${name}:true`);
  });
});
