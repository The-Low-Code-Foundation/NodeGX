/**
 * IG-007 — the gate over `library/modules/garden-3d-kit`.
 *
 * The kit is plain JS the browser runs as-is, so this spec runs the BUILT file
 * (`project/noodl_modules/garden-3d-kit/index.js`) — the artefact a project installs —
 * inside a `vm` context with the globals the runtime provides (`Noodl`, `React`) and a
 * `THREE` STUB that counts what is constructed. No `window`, no `document`, no WebGL:
 * the server-render arm, which is also the arm where every browser API has to be absent
 * without a throw. `cg001GardenKit` is the precedent; the 2D kit's built file is loaded
 * into the same context so the port tables can be diffed and the copied helpers pinned.
 *
 * What it grades (IG-007 §3, the parts a lane can grade without a GPU):
 *
 * - the built file carries the source verbatim and registers exactly `garden-3d-kit.Garden3D`;
 * - **the ports are the 2D node's exactly** (name, type, group, default, description) plus
 *   `Camera`, `Focus` in and `Frame Ms`, `Supported` out;
 * - **AC2** a 24×16 world with 30 things and 3 robots builds ≤ 500 meshes (instanced tiles
 *   count as one); raycast-to-tile returns the tapped tile for 20 sampled points, at the
 *   island framing and at the closest zoom; the camera bounds hold at both zoom extremes;
 * - the manifest lists `three.min.js`, the vendored file exists and is 651,651 bytes, the
 *   licence is beside it, the README and the shell's NOTICE credit it;
 * - **Supported=false** (no THREE / no WebGL2 / a renderer that throws) draws nothing and
 *   throws nothing; Supported=true reaches Ready on the first frame, and Frame Ms is a p95
 *   over the last 60 frames measured only after Ready and only while visible;
 * - input: a still press taps the tile under it, a drag pans and does not tap, a pinch and a
 *   wheel zoom inside the bounds;
 * - **AC10 of CG-001** the built file carries no `fetch(`, no URL, no `url(`;
 * - the catalog overlay lists `Garden 3D` with `inNodePicker: true`, the way CG-001 measured
 *   garden-kit's two nodes (extractor over the two-module fixture);
 * - the copied helpers agree with garden-kit's on a shared set of inputs, and the sibling
 *   helpers are used when garden-kit is on the page.
 *
 * @module noodl-mcp/tests/ig007Garden3d.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { extractProjectOverlay } from '../src/kitOverlay';
import { buildKitExtractor } from './helpers';
// P106 s3 (lane F, item b): the 2D kit's dry tulip colour, which the 3D kit's dry petal is pinned to.
import { deltaE, dryLook, hexToRgb, hue, hueGap } from './dryTulipLook';

const LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');
const KIT_DIR = path.join(LIBRARY, 'garden-3d-kit');
const MODULE_DIR = path.join(KIT_DIR, 'project', 'noodl_modules', 'garden-3d-kit');
const BUILT = path.join(MODULE_DIR, 'index.js');
const SOURCE = path.join(KIT_DIR, 'src', 'kit3d.js');
const THREE_FILE = path.join(MODULE_DIR, 'three.min.js');
const LICENCE = path.join(MODULE_DIR, 'LICENSE.txt');
const MANIFEST = path.join(MODULE_DIR, 'manifest.json');
const README = path.join(MODULE_DIR, 'README.md');
const BUILT_2D = path.join(LIBRARY, 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');
const NOTICE = path.join(__dirname, '..', '..', '..', 'dev-docs', 'tasks', 'phase-105-the-coding-garden', 'garden-desktop', 'licenses', 'NOTICE.txt');
const FIXTURE = path.join(__dirname, 'fixtures', 'garden-3d-app');

const THREE_BYTES = 651651;
const MESH_BUDGET = 500;
const SAMPLED_POINTS = 20;

interface KitModule {
  nodes: Array<Record<string, any>>;
  reactNodes: Array<Record<string, any>>;
}

type Vec = { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };

/** A THREE stub: every class the kit constructs, counted by name, with just enough shape for the builders. */
function threeStub(opts: { rendererThrows?: boolean } = {}) {
  const counts: Record<string, number> = {};
  const vec = (): Vec => ({
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  });
  const cls = (name: string, extra?: (this: any, ...args: any[]) => void) =>
    function (this: any, ...args: any[]) {
      counts[name] = (counts[name] || 0) + 1;
      this.type = name;
      this.position = vec();
      this.rotation = vec();
      this.scale = vec();
      this.scale.set(1, 1, 1);
      this.children = [];
      this.userData = {};
      this.matrix = {};
      this.instanceMatrix = {};
      this.add = (...kids: any[]) => kids.forEach((k) => this.children.push(k));
      this.remove = () => {};
      this.traverse = (f: (o: any) => void) => {
        f(this);
        this.children.forEach((c: any) => c.traverse && c.traverse(f));
      };
      this.updateMatrix = () => {};
      this.setMatrixAt = () => {};
      this.setColorAt = () => {
        this.instanceColor = {};
      };
      this.lookAt = () => {};
      this.updateProjectionMatrix = () => {};
      this.dispose = () => {};
      if (extra) extra.apply(this, args);
    };
  const THREE: Record<string, any> = {};
  for (const n of ['Group', 'Object3D', 'Mesh', 'InstancedMesh', 'Scene', 'PerspectiveCamera', 'DirectionalLight', 'HemisphereLight']) THREE[n] = cls(n);
  for (const n of ['BoxGeometry', 'ConeGeometry', 'CylinderGeometry', 'IcosahedronGeometry', 'SphereGeometry', 'PlaneGeometry', 'MeshLambertMaterial', 'Color']) THREE[n] = cls(n);
  THREE.WebGLRenderer = opts.rendererThrows
    ? function () {
        counts.WebGLRenderer = (counts.WebGLRenderer || 0) + 1;
        throw new Error('no GL for you');
      }
    : cls('WebGLRenderer', function (this: any) {
        this.info = { render: { calls: 0 } };
        this.renders = 0;
        this.setPixelRatio = () => {};
        this.setSize = () => {};
        this.render = () => {
          this.renders++;
          this.info.render.calls = 7;
        };
      });
  return { THREE, counts };
}

/** Load the built kit(s) into a bare context; `first` loads before the 3D kit (the 2D kit, for the sibling arm). */
function loadKits(first?: string): { kit: KitModule; modules: KitModule[]; context: Record<string, any> } {
  const modules: KitModule[] = [];
  const context: Record<string, any> = {
    Noodl: {
      defineModule(m: KitModule) {
        modules.push(m);
      }
    },
    React,
    console,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id)
  };
  // The deploy prelude keeps every module in `__noodl_modules`; the 3D kit finds garden-kit's helpers there.
  context.__noodl_modules = modules;
  vm.createContext(context);
  if (first) vm.runInContext(fs.readFileSync(first, 'utf8'), context, { filename: path.basename(path.dirname(first)) + '/index.js' });
  vm.runInContext(fs.readFileSync(BUILT, 'utf8'), context, { filename: 'garden-3d-kit/index.js' });
  const kit = modules[modules.length - 1];
  if (!kit) throw new Error('index.js never called Noodl.defineModule');
  return { kit, modules, context };
}

/** Every thing kind a page may send (the 2D kit's and the brief's §4 vocabulary), each drawn by the 3D kit. */
const THING_KINDS = ['tulip', 'puddle', 'letter', 'bowl', 'label', 'rock', 'sign', 'note', 'stone', 'postbox'];

/** A 24×16 island with every kind, 30 things of every kind and 3 robots (two on one tile). */
function bigWorld(node: Record<string, any>) {
  const rows: string[] = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 24; x++) {
      const k = (x * 7 + y * 3) % 13;
      r += k === 0 ? 'T' : k === 1 ? 'R' : k === 2 ? 'H' : k === 3 ? 'F' : k === 4 ? 'W' : k === 5 ? 'P' : 'G';
    }
    rows.push(r);
  }
  const map = node.world.parseMap({ rows });
  const things = [];
  // P106 s2: the brief's §4 kinds too — rock (every `left`), sign, note, stone, post box — so the budget holds with them.
  for (let i = 0; i < 30; i++) things.push({ kind: THING_KINDS[i % THING_KINDS.length], x: i % 24, y: (i * 3) % 16, watered: i % 2 === 0, full: i % 3 === 0, left: i % 5, text: 'hi' });
  const robots = node.world.parseRobots([
    { x: 1, y: 1, d: 1, name: 'Pip', can: 2, canMax: 3, carry: ['stone'] },
    { x: 5, y: 5, d: 2, hat: 'cap', eyes: 'happy', name: 'Bo', carry: ['letter'] },
    { x: 5, y: 5, d: 3, hat: 'sun', eyes: 'wink', name: 'Cobble', can: 0, carry: ['parcel'] }
  ]);
  return { map, things, robots };
}

const MOCKUP = { rows: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] };

/** Robot inputs that exercise the brief's §4 fields: numbers, text, null, empty, junk, a load of mixed kinds. */
const VOCAB_ROBOTS: unknown[] = [
  [{ can: 2, canMax: 4, carry: ['stone', 3] }, { can: null, canMax: 0 }, { can: '', canMax: -2 }, { can: '1.7', canMax: '5.9', carry: 'stone' }, { can: -3, canMax: 'x', carry: [] }],
  '[{"can":0,"canMax":3,"carry":["letter"]},{"can":"junk"}]',
  { can: 3 }
];
/** The robot list parseRobots reads (the same filter), for the §4 reference below. */
function rawRobots(v: unknown): Array<Record<string, unknown>> {
  let list: unknown = v;
  if (typeof v === 'string') {
    try {
      list = JSON.parse(v);
    } catch {
      list = [];
    }
  }
  if (list && !Array.isArray(list) && typeof list === 'object') list = [list];
  return Array.isArray(list) ? (list.filter((r) => r && typeof r === 'object') as Array<Record<string, unknown>>) : [];
}
/** Brief §4, written a second way: `can` a whole number ≥ 0 or null; `canMax` a whole number > 0, else 3; `carry` strings. */
function vocab(r: Record<string, unknown>) {
  const n = (x: unknown) => (x === null || x === undefined || x === '' ? NaN : Number(x));
  const can = Number.isFinite(n(r.can)) ? Math.max(0, Math.floor(n(r.can))) : null;
  const canMax = Number.isFinite(n(r.canMax)) && n(r.canMax) > 0 ? Math.floor(n(r.canMax)) : 3;
  return { can, canMax, carry: Array.isArray(r.carry) ? r.carry.map(String) : [] };
}

/** A fake DOM just wide enough for the engine's overlay and root attributes. */
function fakeDom() {
  const mk = (): any => ({
    style: {},
    attrs: {} as Record<string, string>,
    children: [] as any[],
    textContent: '',
    setAttribute(k: string, v: string) {
      this.attrs[k] = v;
    },
    getAttribute(k: string) {
      return this.attrs[k];
    },
    appendChild(c: any) {
      this.children.push(c);
      return c;
    },
    removeChild(c: any) {
      this.children.splice(this.children.indexOf(c), 1);
    },
    get firstChild() {
      return this.children[0] || null;
    }
  });
  const doc = {
    visibilityState: 'visible',
    listeners: {} as Record<string, Array<() => void>>,
    addEventListener(name: string, fn: () => void) {
      (this.listeners[name] = this.listeners[name] || []).push(fn);
    },
    removeEventListener() {},
    createElement: () => mk(),
    createTextNode: (t: string) => ({ text: t })
  };
  const root = Object.assign(mk(), { clientWidth: 600, clientHeight: 450 });
  const handlers: Record<string, (ev: any) => void> = {};
  const canvas = {
    getContext: () => ({}),
    addEventListener(name: string, fn: (ev: any) => void) {
      handlers[name] = fn;
    },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture() {}
  };
  return { doc, root, canvas, overlay: mk(), handlers };
}

describe('IG-007 — garden-3d-kit, the built artefact', () => {
  let kit: KitModule;
  let kit2d: KitModule;

  beforeAll(() => {
    const both = loadKits(BUILT_2D);
    kit = both.kit;
    kit2d = both.modules[0];
  });

  const node = () => kit.reactNodes.find((n) => n.name === 'garden-3d-kit.Garden3D')!;
  const node2d = () => kit2d.reactNodes.find((n) => n.name === 'garden-kit.Garden')!;
  const defaults = () => Object.fromEntries(Object.entries(node().inputProps as Record<string, { default?: unknown }>).map(([k, p]) => [k, p.default]));
  const render = (props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(node().getReactComponent(), { ...defaults(), ...props }));

  describe('the node registers, from the source a person edits', () => {
    it('the built file ends with src/kit3d.js verbatim under its banner', () => {
      const built = fs.readFileSync(BUILT, 'utf8');
      const source = fs.readFileSync(SOURCE, 'utf8');
      expect(built.endsWith(source)).toBe(true);
      expect(built.startsWith('/* garden-3d-kit')).toBe(true);
    });

    it('registers exactly garden-3d-kit.Garden3D as "Garden 3D", documented, in a context with no window, no document and no THREE', () => {
      const alone = loadKits();
      const names = [...alone.kit.nodes, ...alone.kit.reactNodes].map((n) => n.name);
      expect(names).toEqual(['garden-3d-kit.Garden3D']);
      const n = alone.kit.reactNodes[0];
      expect(n.displayNodeName).toBe('Garden 3D');
      expect(typeof n.docs).toBe('string');
      expect(n.docs.length).toBeGreaterThan(40);
      expect(n.ssr).toEqual({ compat: 'safe' });
      expect(alone.kit.nodes).toEqual([]);
    });

    it('renders on the server from its defaults: the root, a canvas and the overlay, with the markers a drive reads', () => {
      const html = render({});
      expect(html).toContain('data-gd3-world="true"');
      expect(html).toContain('data-w="8"');
      expect(html).toContain('data-h="6"');
      expect(html).toContain('data-camera="plot"');
      expect(html).toContain('<canvas');
      expect(html).toContain('data-gd3-overlay="true"');
      expect(html.match(/<style>/g)).toHaveLength(1);
      // The bridge seeds props.style from defaultCss; display:none from the graph is kept, anything else is block.
      expect(render({ style: { display: 'none' } })).toMatch(/style="[^"]*display:none/);
      expect(render({ style: { display: 'grid' } })).toMatch(/style="[^"]*display:block/);
      expect(node().defaultCss).toEqual({ display: 'block' });
    });
  });

  describe('🔴 the ports are the 2D node’s exactly, plus Camera, Focus, Frame Ms and Supported', () => {
    const table = (def: Record<string, any>, side: 'inputProps' | 'outputProps') =>
      Object.fromEntries(
        Object.entries(def[side] as Record<string, any>).map(([k, p]) => [k, { type: p.type, displayName: p.displayName, group: p.group, default: p.default, description: p.description }])
      );

    it('every input of Garden is on Garden 3D with the same type, name, group, default and description', () => {
      const a = table(node2d(), 'inputProps');
      const b = table(node(), 'inputProps');
      for (const k of Object.keys(a)) expect({ port: k, def: b[k] }).toEqual({ port: k, def: a[k] });
      expect(Object.keys(b).filter((k) => !(k in a))).toEqual(['camera', 'focus']);
      // P108 IW-002 (brief §4.4): Watch and Picking are the 2D node's too, so they are here by the first line's rule.
      expect(Object.keys(a)).toEqual(['map', 'things', 'robots', 'bubble', 'stepMs', 'celebrate', 'label', 'watch', 'picking']);
      expect(b.camera.type).toEqual({ name: 'enum', enums: [{ value: 'plot', label: 'Plot' }, { value: 'island', label: 'Island' }, { value: 'follow', label: 'Follow' }] });
      expect(b.camera.default).toBe('plot');
      expect(b.focus.type).toBe('object');
      for (const k of Object.keys(b)) expect({ port: k, named: !!b[k].displayName }).toEqual({ port: k, named: true });
    });

    it('every output of Garden is on Garden 3D, plus Frame Ms (number), Supported (boolean) and Too Slow (signal)', () => {
      const a = table(node2d(), 'outputProps');
      const b = table(node(), 'outputProps');
      for (const k of Object.keys(a)) expect({ port: k, def: b[k] }).toEqual({ port: k, def: a[k] });
      expect(Object.keys(a)).toEqual(['onTileX', 'onTileY', 'onTileTapped', 'onReady']);
      expect(Object.keys(b).filter((k) => !(k in a))).toEqual(['onFrameMs', 'onSupported', 'onTooSlow']);
      expect([b.onFrameMs.type, b.onFrameMs.displayName, b.onSupported.type, b.onSupported.displayName]).toEqual(['number', 'Frame Ms', 'boolean', 'Supported']);
      // P106 s2 (AC4): the fallback rule's cue, decided where the frames are (visible time only), fired once.
      expect([b.onTooSlow.type, b.onTooSlow.displayName, b.onTooSlow.group]).toEqual(['signal', 'Too Slow', 'Events']);
    });
  });

  describe('AC2 — the scene, the raycast and the camera bounds, on a 24×16 world', () => {
    it(`🔴 30 things and 3 robots build ≤ ${MESH_BUDGET} meshes with instanced tiles counted as one, and the count is the constructor count`, () => {
      const { THREE, counts } = threeStub();
      const world = bigWorld(node());
      expect([world.map.w, world.map.h, world.things.length, world.robots.length]).toEqual([24, 16, 30, 3]);
      const built = node().scene.buildScene(world, THREE);
      expect(built.meshCount).toBeLessThanOrEqual(MESH_BUDGET);
      console.log(`AC2 readout: ${built.meshCount} meshes (${counts.InstancedMesh} instanced, ${counts.Mesh} individual)`);
      expect(built.meshCount).toBeGreaterThan(50);
      // Honest arithmetic: what the builder says it made is what the stub saw constructed.
      expect(counts.Mesh + counts.InstancedMesh).toBe(built.meshCount);
      // The tiles: one InstancedMesh per kind present (all seven here), never one mesh per tile.
      expect(built.tiles.length).toBe(7);
      expect(counts.InstancedMesh).toBeGreaterThanOrEqual(7);
      expect(counts.InstancedMesh).toBeLessThan(30);
      expect(built.robots.length).toBe(3);
      // Two robots on one tile: both marked as sharing, offset apart, drawn smaller.
      expect(built.robots.map((r: any) => r.userData.share)).toEqual([-1, 0, 1]);
      expect(built.robots[1].position.x).not.toBe(built.robots[2].position.x);
      expect(built.robots[1].scale.x).toBeCloseTo(0.78);
      // One directional and one hemisphere light, no shadow maps.
      expect([counts.DirectionalLight, counts.HemisphereLight]).toEqual([1, 1]);
      expect(fs.readFileSync(BUILT, 'utf8')).not.toContain('shadowMap');
      expect(fs.readFileSync(BUILT, 'utf8')).not.toContain('castShadow');
    });

    it('🔴 raycast-to-tile returns the tapped tile for 20 sampled points at the island framing and at the closest zoom', () => {
      const C = node().camera;
      const { map } = bigWorld(node());
      const aspect = 1.5;
      const island = C.frameRect(map, { x: 0, y: 0, w: 24, h: 16 }, aspect);
      const close = C.clampCamera({ tx: 2, tz: -1, dist: 0 }, map, aspect);
      const misses: string[] = [];
      let sampled = 0;
      for (const [label, st, pick] of [
        ['island', island, (i: number) => [(i * 7) % 24, (i * 5) % 16]],
        ['close', close, (i: number) => [Math.floor(12 + 2 + ((i % 5) - 2)), Math.floor(8 - 1 + ((Math.floor(i / 5) % 4) - 1))]]
      ] as Array<[string, any, (i: number) => number[]]>) {
        for (let i = 0; i < SAMPLED_POINTS; i++) {
          const [x, y] = pick(i);
          const p = C.tileCentre(map, x, y);
          const top = C.tileHeight(C.kindAt(map, x, y));
          const n = C.project(st, aspect, [p.x, top, p.z]);
          if (Math.abs(n.x) > 1 || Math.abs(n.y) > 1) continue; // a tile outside the close view is not a tap
          sampled++;
          const hit = C.pickTile(C.rayFromNdc(st, aspect, n.x, n.y), map);
          if (!hit || hit.x !== x || hit.y !== y) misses.push(`${label} ${x},${y} → ${JSON.stringify(hit)}`);
        }
      }
      expect(misses).toEqual([]);
      expect(sampled).toBeGreaterThanOrEqual(SAMPLED_POINTS + 8);
      // A ray that misses the map, or goes up, is no tile.
      expect(C.pickTile(C.rayFromNdc(island, aspect, 1.5, 1.5), map)).toBeNull();
      expect(C.pickTile({ origin: [0, 5, 0], dir: [0, 1, 0] }, map)).toBeNull();
    });

    it('🔴 the camera bounds hold at both zoom extremes and at the corners; a Focus rectangle frames inside the margin', () => {
      const C = node().camera;
      const { map } = bigWorld(node());
      const aspect = 1.5;
      const z = C.zoomBounds(map, aspect);
      expect(z.minDist).toBeGreaterThan(0);
      expect(z.maxDist).toBeGreaterThan(z.minDist);
      expect(C.clampCamera({ tx: 999, tz: -999, dist: 1e9 }, map, aspect)).toEqual({ tx: 12, tz: -8, dist: z.maxDist });
      expect(C.clampCamera({ tx: -999, tz: 999, dist: 0 }, map, aspect)).toEqual({ tx: -12, tz: 8, dist: z.minDist });
      expect(C.clampCamera({ tx: NaN, tz: NaN, dist: NaN }, map, aspect)).toEqual({ tx: 0, tz: 0, dist: z.maxDist });
      const island = C.frameRect(map, { x: 0, y: 0, w: 24, h: 16 }, aspect);
      expect(island.dist).toBeLessThanOrEqual(z.maxDist);
      expect(island.dist).toBeGreaterThanOrEqual(z.minDist);
      // The whole island's ground corners are inside the view with the margin.
      for (const [x, z2] of [[-12, -8], [12, -8], [-12, 8], [12, 8]]) {
        const n = C.project(island, aspect, [x, 0, z2]);
        expect(Math.abs(n.x)).toBeLessThanOrEqual(C.CAMERA.margin + 1e-6);
        expect(Math.abs(n.y)).toBeLessThanOrEqual(C.CAMERA.margin + 1e-6);
      }
      // A plot: the 8×6 rectangle at the island's corner frames closer than the island and stays in bounds.
      const plot = C.frameRect(map, C.focusRect(map, { x: 16, y: 10, w: 8, h: 6 }), aspect);
      expect(plot.dist).toBeLessThan(island.dist);
      expect(C.clampCamera(plot, map, aspect)).toEqual(plot);
      // Junk Focus is the whole map; a rectangle hanging off the edge is clipped to it.
      expect(C.focusRect(map, null)).toEqual({ x: 0, y: 0, w: 24, h: 16 });
      expect(C.focusRect(map, '{bad')).toEqual({ x: 0, y: 0, w: 24, h: 16 });
      expect(C.focusRect(map, { x: 20, y: 12, w: 8, h: 6 })).toEqual({ x: 20, y: 12, w: 4, h: 4 });
      expect(C.CAMERA.tiltDeg).toBe(35);
    });
  });

  describe('P106 s2 — the brief’s §4 vocabulary drawn, the mockup’s camera, and the fallback’s cue', () => {
    const W = () => node().world;
    const small = { rows: ['GGGGGG', 'GGGGGG', 'GGGGGG'] };
    const build = (things: unknown[], robots: unknown[] = []) => {
      const s = threeStub();
      const built = node().scene.buildScene({ map: W().parseMap(small), things: W().parseThings(things), robots: W().parseRobots(robots) }, s.THREE);
      return { built, counts: s.counts };
    };
    const meshesIn = (g: any) => {
      let n = 0;
      g.traverse((o: any) => {
        if (o.type === 'Mesh' || o.type === 'InstancedMesh') n++;
      });
      return n;
    };
    const named = (g: any, name: string) => {
      let hit: any = null;
      g.traverse((o: any) => {
        if (!hit && o.name === name) hit = o;
      });
      return hit;
    };

    it('🔴 every thing kind draws something (label is a DOM pill); rock, sign, note and stone are one or two primitives', () => {
      const { built } = build(THING_KINDS.map((kind, i) => ({ kind, x: i % 6, y: Math.floor(i / 6), left: 4, text: 'words' })));
      const byKind = Object.fromEntries(built.things.map((g: any) => [g.userData.kind, meshesIn(g)]));
      for (const kind of THING_KINDS.filter((k) => k !== 'label')) expect({ kind, drawn: byKind[kind] > 0 }).toEqual({ kind, drawn: true });
      expect(byKind.label).toBe(0);
      for (const kind of ['rock', 'sign', 'note', 'stone']) expect({ kind, primitives: byKind[kind] >= 1 && byKind[kind] <= 2 }).toEqual({ kind, primitives: true });
    });

    it('🔴 P106 IG-003: the tick (a challenge hit) draws on its tile, a few primitives, like the 2D kit’s sprite', () => {
      const { built } = build([{ kind: 'tick', x: 2, y: 1 }]);
      const tick = built.things.find((g: any) => g.userData.kind === 'tick');
      expect(!!tick && [tick.userData.x, tick.userData.y]).toEqual([2, 1]);
      expect(meshesIn(tick)).toBeGreaterThanOrEqual(2);
      expect(meshesIn(tick)).toBeLessThanOrEqual(4);
    });

    it('🔴 a rock is big at left ≥ 3, medium at 2, small at 1, gone at 0 (and big with no left, as a request places it)', () => {
      const { built } = build([4, 3, 2, 1, 0, undefined].map((left, x) => ({ kind: 'rock', x, y: 0, left })));
      const rocks = built.things.filter((g: any) => g.userData.kind === 'rock');
      expect(rocks.map((g: any) => g.userData.size)).toEqual(['big', 'big', 'medium', 'small', 'none', 'big']);
      const width = rocks.map((g: any) => (g.children[0] ? g.children[0].scale.x : 0));
      expect(width[0]).toBe(width[1]);
      expect(width[1]).toBeGreaterThan(width[2]);
      expect(width[2]).toBeGreaterThan(width[3]);
      expect(meshesIn(rocks[4])).toBe(0);
      expect(width[5]).toBe(width[0]);
    });

    it('🔴 a sign’s and a note’s text is not drawn on the tile (a label’s is, as a pill)', () => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: (f: () => void) => (frames.push(f), 1), caf: () => {} });
      eng.setWorld({ map: W().parseMap(small), things: W().parseThings([{ kind: 'sign', x: 1, y: 1, text: 'Sign words' }, { kind: 'note', x: 2, y: 1, text: 'Note words' }, { kind: 'label', x: 3, y: 1, text: 'Label words' }]), robots: [] });
      const texts = dom.overlay.children.map((c: any) => c.textContent);
      expect(texts).toEqual(['Label words']);
      eng.destroy();
    });

    it('🔴 the can shows can of canMax (full at canMax, empty at 0, nothing at null); the load on the back is the last of carry', () => {
      const { built, counts } = build([], [
        { x: 0, y: 0, can: 2, canMax: 4, carry: ['letter', 'stone'] },
        { x: 1, y: 0, can: null, carry: ['stone', 'letter'] },
        { x: 2, y: 0, can: 0, canMax: 3, carry: ['cake'] },
        { x: 3, y: 0, can: 7, canMax: 3, carry: [] },
        { x: 4, y: 0, carry: ['stone', 'egg'] },
        { x: 5, y: 0, carry: ['food'] }
      ]);
      const [a, b, c, d, e, f] = built.robots;
      expect(named(a, 'level').scale.y).toBeCloseTo(0.5);
      expect(named(a, 'level').visible).not.toBe(false);
      expect(named(b, 'level')).toBeNull();
      expect(named(c, 'level').visible).toBe(false);
      expect(named(d, 'level').scale.y).toBeCloseTo(1);
      // stone, letter, egg and food as themselves (the 2D kit's, lane A), anything else the parcel, nothing when empty.
      expect([a, b, c, d, e, f].map((g: any) => (named(g, 'load') ? named(g, 'load').userData.load : null))).toEqual(['stone', 'letter', 'parcel', null, 'egg', 'food']);
      for (const g of [a, b, c, d]) expect(named(g, 'can')).not.toBeNull();
      // The honest count again: what the builder says it made is what was constructed.
      expect(counts.Mesh + (counts.InstancedMesh || 0)).toBe(built.meshCount);
    });

    it('🔴 the camera is the mockup’s (island-3d.html makeView, measured running: dist 10.75 for its 8×6 at aspect 1.436): 35° from straight down, turned 0.42 rad, a 38° lens, aimed at the tile tops', () => {
      const C = node().camera;
      expect([C.CAMERA.tiltDeg, C.CAMERA.yawRad, C.CAMERA.fovDeg, C.CAMERA.targetY]).toEqual([35, 0.42, 38, 0.4]);
      const p = C.pose({ tx: 1, tz: 2, dist: 10 });
      const s = Math.sin((35 * Math.PI) / 180);
      const c = Math.cos((35 * Math.PI) / 180);
      expect(p.position[0]).toBeCloseTo(1 + 10 * s * Math.sin(0.42));
      expect(p.position[1]).toBeCloseTo(10 * c);
      expect(p.position[2]).toBeCloseTo(2 + 10 * s * Math.cos(0.42));
      // Forward points at the target; right is level (no roll) and square to forward; up completes the frame.
      const range = Math.hypot(1 - p.position[0], 0.4 - p.position[1], 2 - p.position[2]);
      const toTarget = [1 - p.position[0], 0.4 - p.position[1], 2 - p.position[2]].map((v) => v / range);
      p.forward.forEach((v: number, i: number) => expect(v).toBeCloseTo(toTarget[i]));
      expect(p.right[1]).toBeCloseTo(0);
      expect(p.right[0] * p.forward[0] + p.right[2] * p.forward[2]).toBeCloseTo(0);
      expect(p.up[0] * p.forward[0] + p.up[1] * p.forward[1] + p.up[2] * p.forward[2]).toBeCloseTo(0);
      // The target projects to the centre of the screen.
      const n = C.project({ tx: 1, tz: 2, dist: 10 }, 1.5, [1, 0.4, 2]);
      expect([n.x, n.y]).toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6)]);
      // The framing is the mockup's v.fit: max(width across, tilted depth down) × 1.18 + 1.2, at the rectangle's centre.
      // Measured in the running mockup (P106 s2): views.ws.dist 10.7466 at aspect 1.4359 (a 672×468 stage).
      const map = W().parseMap(MOCKUP);
      const aspect = 672 / 468;
      expect(C.fitRect(map, { x: 0, y: 0, w: 8, h: 6 }, aspect).dist).toBeCloseTo(10.746556042188667, 6);
      const tan = Math.tan((38 * Math.PI) / 360);
      const want = Math.max(8 / (2 * tan * aspect), (6 * c) / (2 * tan)) * 1.18 + 1.2;
      const fit = C.fitRect(map, { x: 0, y: 0, w: 8, h: 6 }, aspect);
      expect([fit.tx, fit.tz]).toEqual([0, 0]);
      expect(fit.dist).toBeCloseTo(want, 6);
      // It fills the stage (closer than everything-inside-a-margin) and stays inside the zoom range a pinch has.
      const z = C.zoomBounds(map, aspect);
      expect(fit.dist).toBeLessThan(C.frameRect(map, { x: 0, y: 0, w: 8, h: 6 }, aspect).dist);
      expect(C.clampCamera(fit, map, aspect)).toEqual(fit);
      expect(z.maxDist).toBeGreaterThan(fit.dist);
    });

    it('🔴 a rebuild (Start over, a tulip watered again) makes new meshes but no new geometry and no new material: the engine shares its caches', () => {
      const { THREE, counts } = threeStub();
      const dom = fakeDom();
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: () => 1, caf: () => {} });
      const made = () => Object.entries(counts).filter(([k]) => /Geometry$|Material$/.test(k)).reduce((n, [, v]) => n + v, 0);
      const robots = W().parseRobots([{ x: 0, y: 3, d: 1, name: 'Pip', can: 1, carry: ['stone'] }]);
      const dry = { map: W().parseMap(MOCKUP), things: W().parseThings([{ kind: 'tulip', x: 2, y: 2 }]), robots };
      const wet = { map: W().parseMap(MOCKUP), things: W().parseThings([{ kind: 'tulip', x: 2, y: 2, watered: true }]), robots };
      // The first dry and wet builds meet every colour and shape once; a Start over and a second watering meet none.
      eng.setWorld(dry);
      eng.setWorld(wet);
      const meshes0 = counts.Mesh;
      const before = made();
      eng.setWorld(dry);
      eng.setWorld(wet);
      expect(counts.Mesh).toBeGreaterThan(meshes0);
      expect(made()).toBe(before);
      eng.destroy();
    });

    it('🔴 the first framing waits for the stage: a resize re-frames until a finger moves the camera, never after', () => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      // Not laid out yet: the root has no size, the canvas its default 300×150 (the page's first render).
      Object.assign(dom.root, { clientWidth: 0, clientHeight: 0 });
      Object.assign(dom.canvas, { width: 300, height: 150 });
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: () => 1, caf: () => {} });
      const C = node().camera;
      eng.setWorld({ map: W().parseMap(MOCKUP), things: [], robots: [] });
      const early = { ...eng.state };
      Object.assign(dom.root, { clientWidth: 632, clientHeight: 472 });
      eng.resize();
      const want = C.fitRect(eng.world.map, { x: 0, y: 0, w: 8, h: 6 }, 632 / 472);
      expect(eng.state.dist).toBeCloseTo(want.dist, 6);
      expect(Math.abs(early.dist - want.dist)).toBeGreaterThan(0.5);
      // A wheel is the hand: after it, a resize keeps the child's view (clamped), never re-frames.
      dom.handlers.wheel({ deltaY: -300, preventDefault() {} });
      const held = eng.state.dist;
      Object.assign(dom.root, { clientWidth: 600, clientHeight: 450 });
      eng.resize();
      expect(eng.state.dist).toBeCloseTo(held, 6);
      eng.destroy();
    });

    it('🔴 on demand: a still scene draws no frame; a glide draws until it lands; a finger down keeps drawing; a still spell is never timed', () => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      let t = 0;
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => t, raf: (f: () => void) => (frames.push(f), frames.length), caf: () => {} });
      const at = (x: number) => ({ map: W().parseMap(MOCKUP), things: [], robots: W().parseRobots([{ x, y: 3, d: 1 }]) });
      const drain = (dt: number, max = 500) => {
        let n = 0;
        while (frames.length && n < max) {
          t += dt;
          frames.shift()!();
          n++;
        }
        return n;
      };
      eng.setStepMs(380);
      eng.setWorld(at(0));
      expect(drain(16)).toBe(1);
      // A glide of 380 ms draws about 24 frames at 16 ms, then stops by itself.
      eng.setWorld(at(1));
      const glide = drain(16);
      expect(glide).toBeGreaterThanOrEqual(22);
      expect(glide).toBeLessThanOrEqual(27);
      expect(dom.root.attrs['data-idle']).toBe('true');
      const sampled = eng.frames.length;
      // Ten still seconds: nothing drawn, nothing sampled; the next glide's first frame is not a 10 s interval.
      t += 10000;
      eng.setWorld(at(2));
      drain(16);
      expect(Math.max(...eng.frames)).toBeLessThan(100);
      expect(eng.frames.length).toBeGreaterThan(sampled);
      // A finger held on the canvas keeps the frames coming (a pan follows it); lifted, they stop.
      dom.handlers.pointerdown({ type: 'pointerdown', clientX: 100, clientY: 100, pointerId: 1, pointerType: 'touch', button: 0 });
      expect(drain(16, 40)).toBe(40);
      dom.handlers.pointerup({ type: 'pointerup', clientX: 100, clientY: 100, pointerId: 1, pointerType: 'touch', button: 0 });
      expect(drain(16, 40)).toBeLessThanOrEqual(2);
      expect(frames.length).toBe(0);
      eng.destroy();
    });

    it('🔴 a Robots write that changes only the can, or only carry, redraws the level and the load (a move alone rebuilds nothing)', () => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: () => 1, caf: () => {} });
      const things = W().parseThings([{ kind: 'tulip', x: 3, y: 1 }]);
      const world = (r: Record<string, unknown>) => ({ map: W().parseMap(MOCKUP), things, robots: W().parseRobots([{ x: 1, y: 1, d: 3, can: 0, canMax: 3, carry: [], ...r }]) });
      const levelOf = () => named(eng.built.robots[0], 'level');
      const loadOf = () => (named(eng.built.robots[0], 'load') ? named(eng.built.robots[0], 'load').userData.load : null);
      eng.setWorld(world({}));
      expect([levelOf().userData.can, levelOf().visible]).toEqual([0, false]);
      // fill: only the can changes (IG-002's fetch-and-return) — the drawn level follows.
      eng.setWorld(world({ can: 3 }));
      expect([levelOf().userData.can, levelOf().visible, levelOf().scale.y]).toEqual([3, true, 1]);
      // a pick: only carry changes — the load on the back follows.
      eng.setWorld(world({ can: 3, carry: ['stone'] }));
      expect(loadOf()).toBe('stone');
      eng.setWorld(world({ can: 3, carry: ['stone', 'letter'] }));
      expect(loadOf()).toBe('letter');
      // A move alone keeps the built scene (no rebuild for a glide) and still glides.
      const built = eng.built;
      eng.setWorld(world({ x: 2, can: 3, carry: ['stone', 'letter'] }));
      expect(eng.built).toBe(built);
      expect(eng.robotAt(0).gliding === true || eng.robotAt(0).x !== undefined).toBe(true);
      // A look change mid-glide keeps the glide: the rebuilt robot starts where the old one was drawn.
      const x0 = eng.robotAt(0).x;
      eng.setWorld(world({ x: 2, can: 2, carry: ['stone', 'letter'] }));
      expect(eng.built).not.toBe(built);
      expect(eng.robotAt(0).x).toBeCloseTo(x0, 6);
      expect(levelOf().userData.can).toBe(2);
      eng.destroy();
      // A move and a look change in ONE write (a step that also fills): the robot glides there, it never jumps.
      const clock = { t: 0 };
      const e2 = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => clock.t, raf: () => 1, caf: () => {} });
      e2.setWorld(world({ x: 2, can: 2 }));
      clock.t = 1000;
      e2.frame();
      const settled = e2.robotAt(0);
      e2.setWorld(world({ x: 3, can: 1 }));
      clock.t = 1100;
      e2.frame();
      const moving = e2.robotAt(0);
      expect(moving.gliding).toBe(true);
      expect(moving.x).toBeGreaterThan(settled.x);
      expect(moving.x).toBeLessThan(settled.x + 0.9);
      clock.t = 2000;
      e2.frame();
      expect(e2.robotAt(0).x).toBeCloseTo(settled.x + 1, 6);
      expect(named(e2.built.robots[0], 'level').userData.can).toBe(1);
      e2.destroy();
    });

    it('🔴 Too Slow fires once when Frame Ms stays above 50 ms for 3 s of moving, visible time; fast frames never; a hidden spell restarts the count', () => {
      const E = node().engine;
      expect(E.SLOW).toEqual({ ms: 50, forMs: 3000 });
      const make = () => {
        const { THREE } = threeStub();
        const dom = fakeDom();
        const frames: Array<() => void> = [];
        const clock = { t: 0 };
        const fired: number[] = [];
        const eng = E.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => clock.t, raf: (f: () => void) => (frames.push(f), frames.length), caf: () => {}, onTooSlow: () => fired.push(clock.t) });
        // A glide that never ends keeps the frames coming (the scene is drawn on demand).
        eng.setStepMs(1e9);
        eng.setWorld({ map: W().parseMap(MOCKUP), things: [], robots: W().parseRobots([{ x: 0, y: 3, d: 1 }]) });
        eng.setWorld({ map: W().parseMap(MOCKUP), things: [], robots: W().parseRobots([{ x: 1, y: 3, d: 1 }]) });
        /** Draw frames `dt` apart for `ms` of the engine's clock (only the frames the engine scheduled). */
        const run = (dt: number, ms: number) => {
          const end = clock.t + ms;
          while (clock.t < end && frames.length) {
            clock.t += dt;
            frames.shift()!();
          }
        };
        return { eng, dom, frames, clock, fired, run };
      };
      // Fast: 16 ms frames for 10 s — never.
      const fast = make();
      fast.run(16, 10000);
      expect(fast.fired).toEqual([]);
      // Slow: 60 ms frames — once, no sooner than 3 s after the first slow readout, and never again.
      const slow = make();
      slow.run(60, 2900);
      expect(slow.fired).toEqual([]);
      slow.run(60, 10000);
      expect(slow.fired.length).toBe(1);
      expect(slow.fired[0]).toBeGreaterThanOrEqual(3000);
      expect(slow.fired[0]).toBeLessThan(3000 + 500 + 60 + 500);
      expect(slow.dom.root.attrs['data-too-slow']).toBe('true');
      // Hidden: 2 s slow, then 10 s hidden (no frames are drawn), then 2 s slow — not yet; 1.5 s more — once.
      const hid = make();
      hid.run(60, 2000);
      hid.dom.doc.visibilityState = 'hidden';
      hid.run(60, 100);
      expect(hid.frames.length).toBe(0);
      hid.clock.t += 10000;
      hid.dom.doc.visibilityState = 'visible';
      hid.dom.doc.listeners.visibilitychange.forEach((f) => f());
      hid.run(60, 2000);
      expect(hid.fired).toEqual([]);
      hid.run(60, 2000);
      expect(hid.fired.length).toBe(1);
      for (const x of [fast, slow, hid]) x.eng.destroy();
    });
  });

  describe('P106 s3 lane F (b) — a dry red and a dry yellow tulip stay apart, and both kits show the same dry colour', () => {
    it('🔴 the dry petals drawn are the 2D kit’s dry look (its petal faded over the bed): red stays red, yellow stays yellow, far apart', () => {
      const s = threeStub();
      // The stub keeps no constructor arguments; for this clause the petal's material colour is what is graded.
      const BaseMesh = s.THREE.Mesh;
      s.THREE.Mesh = function (this: any, geo: unknown, material: unknown) {
        BaseMesh.call(this, geo, material);
        this.material = material;
      };
      const BaseMat = s.THREE.MeshLambertMaterial;
      s.THREE.MeshLambertMaterial = function (this: any, opts: { color?: number }) {
        BaseMat.call(this, opts);
        this.color = opts ? opts.color : undefined;
      };
      const W = node().world;
      const things = [
        { kind: 'tulip', x: 1, y: 0, colour: 'red' },
        { kind: 'tulip', x: 2, y: 0, colour: 'yellow' },
        { kind: 'tulip', x: 3, y: 0, colour: 'red', watered: true },
        { kind: 'tulip', x: 4, y: 0, colour: 'yellow', watered: true }
      ];
      const built = node().scene.buildScene({ map: W.parseMap({ rows: ['GFFFFG'] }), things: W.parseThings(things), robots: [] }, s.THREE);
      const P = node().scene.PALETTE as Record<string, number>;
      const petalAt = (x: number): string => {
        const g = built.things.find((t: any) => t.userData.kind === 'tulip' && t.userData.x === x);
        const colours: number[] = [];
        g.traverse((o: any) => {
          if (o.type === 'Mesh' && o.material && o.material.color !== P.stem) colours.push(o.material.color);
        });
        expect(colours).toHaveLength(1);
        return '#' + colours[0].toString(16).padStart(6, '0');
      };
      const two = node2d();
      const look = dryLook(two.css as string, (two.sprite as { sprites: Record<string, any> }).sprites);
      // The same dry colour as the 2D kit's composite, and the same wet colour as its sprite.
      expect({ dryRed: petalAt(1), dryYellow: petalAt(2) }).toEqual({ dryRed: look.dry.red.toLowerCase(), dryYellow: look.dry.yellow.toLowerCase() });
      expect({ wetRed: petalAt(3), wetYellow: petalAt(4) }).toEqual({ wetRed: look.wet.red.toLowerCase(), wetYellow: look.wet.yellow.toLowerCase() });
      const [dryRed, dryYellow] = [hexToRgb(petalAt(1)), hexToRgb(petalAt(2))];
      expect({ red: hueGap(hue(dryRed), hue(hexToRgb(petalAt(3)))) <= 30, yellow: hueGap(hue(dryYellow), hue(hexToRgb(petalAt(4)))) <= 30 }).toEqual({ red: true, yellow: true });
      expect(deltaE(dryRed, dryYellow)).toBeGreaterThanOrEqual(40);
      // The droop stays: a dry tulip is tilted, a wet one upright.
      const tilt = (x: number) => built.things.find((t: any) => t.userData.kind === 'tulip' && t.userData.x === x).rotation.z;
      expect([tilt(1) > 0, tilt(2) > 0, tilt(3), tilt(4)]).toEqual([true, true, 0, 0]);
    });
  });

  describe('three.js is vendored the maplibre way, pinned, licensed, credited', () => {
    it(`the manifest lists three.min.js as a dependency and the file is ${THREE_BYTES} bytes, r158`, () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
      expect(manifest.main).toBe('index.js');
      expect(manifest.dependencies).toEqual(['three.min.js']);
      expect(manifest.nodeKitTypes).toBe('1.0.0');
      expect(fs.statSync(THREE_FILE).size).toBe(THREE_BYTES);
      const head = fs.readFileSync(THREE_FILE, 'utf8').slice(0, 2000);
      expect(head).toContain('three.js');
      expect(fs.readFileSync(THREE_FILE, 'utf8')).toContain('"158"');
    });

    it('the MIT licence sits beside it; the README and the shell NOTICE credit it; no other asset', () => {
      const licence = fs.readFileSync(LICENCE, 'utf8');
      expect(licence).toContain('MIT License');
      expect(licence).toContain('three.js authors');
      const readme = fs.readFileSync(README, 'utf8');
      for (const words of ['three.js 0.158.0', 'MIT', 'LICENSE.txt', '651,651', 'GPL-3.0', 'icon.png', 'never from a CDN', 'console.warn']) expect(readme).toContain(words);
      const notice = fs.readFileSync(NOTICE, 'utf8');
      expect(notice).toContain('three.js 0.158.0');
      expect(notice).toContain('LICENSE-three.js.txt');
      expect(fs.existsSync(path.join(path.dirname(NOTICE), 'LICENSE-three.js.txt'))).toBe(true);
      expect(fs.readdirSync(MODULE_DIR).sort()).toEqual(['LICENSE.txt', 'README.md', 'index.js', 'manifest.json', 'three.min.js', 'types']);
    });
  });

  describe('🔴 Supported=false draws nothing and throws nothing; Supported=true reaches Ready', () => {
    it('no THREE, no WebGL2, a renderer that throws: each is a quiet false with its reason on the root', () => {
      const E = node().engine;
      const dom1 = fakeDom();
      const e1 = E.create({ THREE: undefined, root: dom1.root, canvas: dom1.canvas, overlay: dom1.overlay, doc: dom1.doc });
      expect([e1.supported, e1.reason, dom1.root.attrs['data-supported']]).toEqual([false, 'no THREE', 'false']);
      const s2 = threeStub();
      const dom2 = fakeDom();
      dom2.canvas.getContext = () => null as any;
      const e2 = E.create({ THREE: s2.THREE, root: dom2.root, canvas: dom2.canvas, overlay: dom2.overlay, doc: dom2.doc });
      expect([e2.supported, e2.reason, s2.counts.Mesh || 0, s2.counts.Scene || 0]).toEqual([false, 'no WebGL2', 0, 0]);
      const s3 = threeStub({ rendererThrows: true });
      const dom3 = fakeDom();
      const e3 = E.create({ THREE: s3.THREE, root: dom3.root, canvas: dom3.canvas, overlay: dom3.overlay, doc: dom3.doc });
      expect([e3.supported, s3.counts.WebGLRenderer, s3.counts.Mesh || 0]).toEqual([false, 1, 0]);
      expect(e3.reason).toContain('no GL for you');
      expect(dom3.root.attrs['data-unsupported-reason']).toContain('renderer threw');
      // Nothing was wired: no setWorld, no frame, and destroy is a no-op.
      expect(e3.setWorld).toBeUndefined();
      expect(() => e3.destroy()).not.toThrow();
      expect(dom3.canvas).not.toHaveProperty('__listened');
      expect(Object.keys(dom3.handlers)).toEqual([]);
    });

    it('🔴 with a renderer: the first frame draws, Ready fires once, draw calls and meshes are on the root; a still scene asks for no second frame', () => {
      const { THREE, counts } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      let t = 0;
      let ready = 0;
      const eng = node().engine.create({
        THREE,
        root: dom.root,
        canvas: dom.canvas,
        overlay: dom.overlay,
        doc: dom.doc,
        now: () => t,
        raf: (f: () => void) => (frames.push(f), frames.length),
        caf: () => {},
        onReady: () => ready++
      });
      expect(eng.supported).toBe(true);
      const W = node().world;
      eng.setWorld({ map: W.parseMap(MOCKUP), things: [], robots: W.parseRobots([{ x: 0, y: 3, d: 1, name: 'Pip' }]) });
      expect(ready).toBe(0);
      expect(frames.length).toBe(1);
      t = 16;
      frames.shift()!();
      expect(ready).toBe(1);
      expect(dom.root.attrs['data-ready']).toBe('true');
      expect(dom.root.attrs['data-draw-calls']).toBe('7');
      expect(Number(dom.root.attrs['data-meshes'])).toBe(eng.meshCount);
      expect(counts.Scene).toBe(1);
      // The overlay holds the robot's name pill, placed from a projected point.
      expect(dom.overlay.children.length).toBe(1);
      expect(dom.overlay.children[0].textContent).toBe('Pip');
      expect(dom.overlay.children[0].attrs['data-robot']).toBe('0');
      expect(dom.overlay.children[0].style.left).toMatch(/px$/);
      // On demand (P106 s2): nothing moves, so nothing more is drawn until something changes.
      expect(frames.length).toBe(0);
      expect(dom.root.attrs['data-idle']).toBe('true');
      eng.setWorld({ map: W.parseMap(MOCKUP), things: [], robots: W.parseRobots([{ x: 1, y: 3, d: 1, name: 'Pip' }]) });
      expect(frames.length).toBe(1);
      t = 32;
      frames.shift()!();
      expect(ready).toBe(1);
      eng.destroy();
    });

    it('🔴 Frame Ms is the p95 of the last 60 frame intervals, measured only after Ready and only while visible', () => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      let t = 0;
      const reports: number[] = [];
      const eng = node().engine.create({
        THREE,
        root: dom.root,
        canvas: dom.canvas,
        overlay: dom.overlay,
        doc: dom.doc,
        now: () => t,
        raf: (f: () => void) => (frames.push(f), frames.length),
        caf: () => {},
        onFrameMs: (ms: number) => reports.push(ms)
      });
      const W = node().world;
      // A glide that never ends keeps the frames coming (the scene is drawn on demand).
      eng.setStepMs(1e9);
      eng.setWorld({ map: W.parseMap(MOCKUP), things: [], robots: W.parseRobots([{ x: 0, y: 3, d: 1 }]) });
      eng.setWorld({ map: W.parseMap(MOCKUP), things: [], robots: W.parseRobots([{ x: 1, y: 3, d: 1 }]) });
      const step = () => frames.shift()!();
      // Hidden: frames are scheduled only while visible, so nothing is sampled.
      dom.doc.visibilityState = 'hidden';
      t = 10;
      step();
      expect(frames.length).toBe(0);
      expect(eng.frames.length).toBe(0);
      dom.doc.visibilityState = 'visible';
      dom.doc.listeners.visibilitychange.forEach((f) => f());
      expect(frames.length).toBe(1);
      // 70 frames: 10 slow ones (40 ms) first, then 60 at 16 ms — the window forgets the slow ones.
      const intervals: number[] = [];
      for (let i = 0; i < 70; i++) {
        const dt = i < 10 ? 40 : 16;
        t += dt;
        intervals.push(dt);
        step();
      }
      const last60 = intervals.slice(-60);
      const sorted = [...last60].sort((a, b) => a - b);
      const p95 = sorted[Math.min(59, Math.floor(0.95 * 60))];
      expect(eng.frames.length).toBe(node().engine.FRAME_WINDOW);
      expect(node().engine.p95(eng.frames)).toBe(p95);
      // The port is written at most every FRAME_REPORT_MS of the engine's clock: a dozen more frames reach the next report.
      for (let i = 0; i < 12; i++) {
        t += 16;
        step();
      }
      expect(eng.frameMs).toBe(16);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[reports.length - 1]).toBe(16);
      // While the slow frames were still in the window the readout said 40.
      expect(reports[0]).toBe(40);
      expect(dom.root.attrs['data-frame-ms']).toBe('16');
      eng.destroy();
    });
  });

  describe('input — a still press taps the tile under it, a drag pans, a pinch and a wheel zoom in bounds', () => {
    function engineOn(world?: any) {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      const taps: number[][] = [];
      let t = 0;
      const eng = node().engine.create({
        THREE,
        root: dom.root,
        canvas: dom.canvas,
        overlay: dom.overlay,
        doc: dom.doc,
        now: () => t,
        raf: (f: () => void) => (frames.push(f), frames.length),
        caf: () => {},
        onTap: (x: number, y: number) => taps.push([x, y])
      });
      const W = node().world;
      eng.setWorld(world || { map: W.parseMap(MOCKUP), things: [], robots: W.parseRobots([{ x: 0, y: 3, d: 1 }]) });
      frames.shift()!();
      const ev = (type: string, x: number, y: number, id = 1, pointerType = 'touch') => dom.handlers[type]({ type, clientX: x, clientY: y, pointerId: id, pointerType, button: 0, preventDefault() {} });
      /** Advance the engine's clock and draw one frame (a camera glide lives in the frame loop). */
      const tick = (ms: number) => {
        t += ms;
        eng.frame();
      };
      return { eng, dom, taps, ev, tick };
    }

    it('🔴 a press that moves ≤ 8 px fires the tile under it (finger, pen and mouse); one that moves 9 px does not', () => {
      const { eng, taps, ev } = engineOn();
      for (const [x, y, pt] of [[5, 2, 'touch'], [0, 3, 'pen'], [7, 5, 'mouse']] as Array<[number, number, string]>) {
        const s = eng.screenOfTile(x, y);
        ev('pointerdown', s.sx, s.sy, 1, pt);
        ev('pointermove', s.sx + 5, s.sy + 5, 1, pt);
        ev('pointerup', s.sx + 5, s.sy + 5, 1, pt);
      }
      expect(taps).toEqual([[5, 2], [0, 3], [7, 5]]);
      const s = eng.screenOfTile(3, 1);
      const before = { ...eng.state };
      ev('pointerdown', s.sx, s.sy);
      ev('pointermove', s.sx + 9, s.sy);
      ev('pointerup', s.sx + 9, s.sy);
      expect(taps.length).toBe(3);
      expect(eng.state.tx).not.toBe(before.tx);
      expect(eng.state.dist).toBe(before.dist);
      eng.destroy();
    });

    it('🔴 a drag pans inside the map; a pinch and a wheel zoom inside the zoom bounds', () => {
      const { eng, dom, taps, ev } = engineOn();
      const C = node().camera;
      const z = C.zoomBounds(eng.world.map, eng.aspect);
      // Drag far to the right and down: the target hits the map's edge and stops there.
      ev('pointerdown', 100, 100);
      for (let i = 1; i <= 40; i++) ev('pointermove', 100 - i * 50, 100 - i * 50);
      ev('pointerup', -1900, -1900);
      expect(taps).toEqual([]);
      expect(eng.state.tx).toBeCloseTo(4);
      expect(eng.state.tz).toBeCloseTo(3);
      // Pinch out (fingers spread) zooms in, clamped at minDist; pinch in zooms out, clamped at maxDist.
      ev('pointerdown', 200, 200, 1);
      ev('pointerdown', 220, 200, 2);
      ev('pointermove', 100, 200, 1);
      ev('pointermove', 2000, 200, 2);
      ev('pointerup', 100, 200, 1);
      ev('pointerup', 2000, 200, 2);
      expect(eng.state.dist).toBeCloseTo(z.minDist);
      ev('pointerdown', 100, 200, 1);
      ev('pointerdown', 500, 200, 2);
      ev('pointermove', 299, 200, 1);
      ev('pointermove', 300, 200, 2);
      ev('pointerup', 299, 200, 1);
      ev('pointerup', 300, 200, 2);
      expect(eng.state.dist).toBeCloseTo(z.maxDist);
      expect(taps).toEqual([]);
      // A wheel: many notches in either direction never leave the bounds.
      let prevented = 0;
      for (let i = 0; i < 50; i++) dom.handlers.wheel({ deltaY: -400, preventDefault: () => prevented++ });
      expect(eng.state.dist).toBeCloseTo(z.minDist);
      for (let i = 0; i < 50; i++) dom.handlers.wheel({ deltaY: 400, preventDefault: () => prevented++ });
      expect(eng.state.dist).toBeCloseTo(z.maxDist);
      expect(prevented).toBe(100);
      eng.destroy();
    });

    it('Camera: island frames the whole map (every corner inside the margin — P106 s4 (a)), plot frames Focus closer, follow keeps robot 0 in the middle', () => {
      const { eng, tick } = engineOn();
      const C = node().camera;
      const map = eng.world.map;
      const island = C.frameRect(map, { x: 0, y: 0, w: 8, h: 6 }, eng.aspect);
      eng.setCamera('island', null);
      tick(500);
      expect(eng.state.dist).toBeCloseTo(island.dist);
      eng.setCamera('plot', { x: 0, y: 0, w: 3, h: 3 });
      // The camera glides there over CAMERA_MS: half way it is between, at the end it is there.
      tick(200);
      expect(eng.state.dist).toBeLessThan(island.dist);
      tick(300);
      expect(eng.state.dist).toBeLessThan(island.dist * 0.7);
      expect(eng.state.tx).toBeCloseTo(-2.5);
      expect(eng.state.tz).toBeCloseTo(-1.5);
      eng.setCamera('follow', null);
      tick(500);
      const r = eng.robotAt(0);
      expect(eng.state.tx).toBeCloseTo(r.x);
      expect(eng.state.tz).toBeCloseTo(r.z);
      eng.destroy();
    });
  });

  describe('P106 s4 (a) — the island camera shows the whole 46 × 22 island, and a robot’s name is never under a bubble', () => {
    it('🔴 at the Island page’s stage (1368: 952 × 590) every corner of the 46 × 22 island, ground and object height, projects inside the view; the mockup’s fit (the plot look) ran a corner off it', () => {
      const C = node().camera;
      const map = { w: 46, h: 22 };
      const aspect = 952 / 590;
      const whole = { x: 0, y: 0, w: 46, h: 22 };
      const inside = (st: { tx: number; tz: number; dist: number }) => {
        const out: number[][] = [];
        for (const y of [0, C.CAMERA.objectHeight]) for (const [x, z] of [[-23, -11], [23, -11], [-23, 11], [23, 11]]) {
          const n = C.project(st, aspect, [x, y, z]);
          if (!(n.depth > 0 && Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1)) out.push([x, y, z]);
        }
        return out;
      };
      // Known-firing: the plot framing clips the island (s3's shot: the bottom-right corner off the stage).
      expect(inside(C.fitRect(map, whole, aspect)).length).toBeGreaterThan(0);
      expect(inside(C.frameRect(map, whole, aspect))).toEqual([]);
    });

    it('🔴 the engine’s island camera is that framing', () => {
      const built = fs.readFileSync(BUILT, 'utf8');
      expect(built).toMatch(/if \(eng\.cameraMode === 'island'\) return frameRect\(map, \{ x: 0, y: 0, w: Math\.max\(1, map\.w\), h: Math\.max\(1, map\.h\) \}, eng\.aspect\);/);
    });

    it('🔴 a robot’s name draws above an islander’s bubble (the bubbles are added after the names, so without it the later one covered Pip at work)', () => {
      const built = fs.readFileSync(BUILT, 'utf8');
      const z = (cls: string) => Number((built.match(new RegExp(`'\\.${cls}\\{[^}]*z-index:(\\d+)`)) || [])[1]);
      expect([z('gd3-name'), z('gd3-isl-say')]).toEqual([2, 1]);
    });
  });

  describe('AC10 — nothing is fetched; the helpers agree with garden-kit and are borrowed from it when it is there', () => {
    it('🔴 the built file carries no fetch, no URL, no image element and no url() — beside its known-firing THREE calls', () => {
      const built = fs.readFileSync(BUILT, 'utf8');
      expect(built).toContain('THREE.MeshLambertMaterial');
      expect(built).toContain('THREE.WebGLRenderer');
      for (const forbidden of ['fetch(', 'http://', 'https://', '<img', 'url(', 'XMLHttpRequest', '@import', "'img'", 'TextureLoader', 'importScripts']) {
        expect({ forbidden, found: built.includes(forbidden) }).toEqual({ forbidden, found: false });
      }
    });

    it('🔴 the copied parse helpers give garden-kit’s answers on every input shape (the two copies cannot drift unseen)', () => {
      const a = node2d().world;
      const b = node().world;
      const maps = [MOCKUP, null, { not: 'rows' }, '{bad', ['GG', 'GGGG'], 'GG\nGG', { rows: ['ab'], legend: { a: 'water', b: 'not-a-kind' } }, JSON.stringify(MOCKUP), { rows: 'GT\nRH' }, 7];
      for (const m of maps) expect(JSON.stringify(b.parseMap(m))).toBe(JSON.stringify(a.parseMap(m)));
      const things = [null, '', '[{"kind":"tulip","x":1,"y":2},{"x":1},{"kind":"puddle","x":"a","y":1},7]', [{ kind: 'bowl', x: '3', y: 4, full: true }], { not: 'a list' }];
      for (const t of things) expect(JSON.stringify(b.parseThings(t))).toBe(JSON.stringify(a.parseThings(t)));
      const robots = [null, { x: 1, y: 2 }, [{ d: -1, color: '#123', eyes: 'happy', hat: 'sun' }, { d: 6.4, hat: 'nope', bump: '2' }], '[{"x":"3","y":3,"name":"Bo"}]', 'junk', [7, null], ...VOCAB_ROBOTS,
        // P106 IG-005 (brief s4 §4.3): the accessory, every shape.
        [{ accessory: 'hod' }, { accessory: 'satchel' }, { accessory: 'bell' }, { accessory: 'can' }, { accessory: '' }, { accessory: 'jetpack' }, { accessory: null }, {}]];
      // P106 s2 (brief §4): the copy carries `can`, `canMax`, `carry` — garden-kit gets the same three lines in lane A.
      // Green on both sides of the merge: every field garden-kit answers is answered the same (order-free), and the copy's
      // only extra fields are exactly those three, each by the §4 rule. After the merge the extras are empty and the
      // clause is full equality; if garden-kit ever answers them differently, the first half goes red.
      for (const r of robots) {
        const want = a.parseRobots(r) as Array<Record<string, unknown>>;
        const got = b.parseRobots(r) as Array<Record<string, unknown>>;
        expect(got.length).toBe(want.length);
        got.forEach((g, i) => {
          const shared = Object.fromEntries(Object.keys(want[i]).map((k) => [k, g[k]]));
          expect({ input: r, i, fields: shared }).toEqual({ input: r, i, fields: want[i] });
          const extra = Object.keys(g).filter((k) => !(k in want[i])).sort();
          expect({ input: r, i, extra: extra.filter((k) => !['can', 'canMax', 'carry'].includes(k)) }).toEqual({ input: r, i, extra: [] });
        });
        const raw = (b.parseRobots(r) as Array<Record<string, unknown>>).map((g) => ({ can: g.can, canMax: g.canMax, carry: g.carry }));
        expect({ input: r, vocab: raw }).toEqual({ input: r, vocab: rawRobots(r).map(vocab) });
      }
      for (const [x, y] of [[0, 1], [1, 1], [2, 1], ['a', 3], [3, NaN], [null, 2]]) expect(b.rose(x, y)).toBe(a.rose(x, y));
      expect(b.DEFAULT_LEGEND).toEqual(a.DEFAULT_LEGEND);
      expect(b.KINDS).toEqual(a.KINDS);
    });

    it('with garden-kit on the page the sibling helpers are used; alone, the local copy', () => {
      expect(node().worldHelpers().source).toBe('sibling');
      expect(node().worldHelpers().parseMap).toBe(node2d().world.parseMap);
      const alone = loadKits();
      expect(alone.kit.reactNodes[0].worldHelpers().source).toBe('local');
    });
  });

  describe('the catalog — the overlay lists Garden 3D in the picker, the way CG-001 measured garden-kit’s two nodes', () => {
    let tempDir: string;
    let project: string;

    beforeAll(async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig007-catalog-'));
      process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(tempDir);
      project = path.join(tempDir, 'garden-3d-app');
      fs.cpSync(FIXTURE, project, { recursive: true });
      for (const k of ['garden-kit', 'garden-3d-kit']) fs.cpSync(path.join(LIBRARY, k, 'project', 'noodl_modules', k), path.join(project, 'noodl_modules', k), { recursive: true });
    }, 120_000);

    afterAll(() => {
      delete process.env.NODEGX_KIT_EXTRACT;
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('🔴 the two-module fixture yields four overlay nodes (P108 IW-004: + Blocks), Garden 3D among them with inNodePicker true and every port', () => {
      const overlay = extractProjectOverlay(project);
      expect(overlay.unavailable).toBeUndefined();
      expect(overlay.failures).toEqual([]);
      // P108 IW-004: garden-kit now also carries Blocks (the program on Blockly).
      expect(overlay.nodes.map((n) => n.typeName).sort()).toEqual(['garden-3d-kit.Garden3D', 'garden-kit.BlockList', 'garden-kit.Blocks', 'garden-kit.Garden']);
      const g3 = overlay.nodes.find((n) => n.typeName === 'garden-3d-kit.Garden3D')!;
      expect(g3.inNodePicker).toBe(true);
      // The bridge adds its own inputs to every React node (cssClassName, mounted, styleCss, variant); the kit's are all there.
      const inputs = g3.inputs.map((p) => p.name);
      const outputs = g3.outputs.map((p) => p.name);
      for (const p of ['bubble', 'camera', 'celebrate', 'focus', 'label', 'map', 'robots', 'stepMs', 'things', 'watch', 'picking']) expect({ port: p, present: inputs.includes(p) }).toEqual({ port: p, present: true });
      for (const p of ['onFrameMs', 'onReady', 'onSupported', 'onTileTapped', 'onTileX', 'onTileY', 'onTooSlow']) expect({ port: p, present: outputs.includes(p) }).toEqual({ port: p, present: true });
      const g2 = overlay.nodes.find((n) => n.typeName === 'garden-kit.Garden')!;
      expect(g2.inNodePicker).toBe(true);
      // Exactly the four new ports beyond the 2D node's, by the catalog's reading.
      expect(inputs.filter((p) => !g2.inputs.some((q) => q.name === p)).sort()).toEqual(['camera', 'focus']);
      expect(outputs.filter((p) => !g2.outputs.some((q) => q.name === p)).sort()).toEqual(['onFrameMs', 'onSupported', 'onTooSlow']);
      // The 3D node's ports are the 2D node's plus the four new ones, by the catalog's own reading.
      const shared = g2.inputs.map((p) => `${p.name}:${p.type.name}`);
      const g3in = g3.inputs.map((p) => `${p.name}:${p.type.name}`);
      for (const s of shared) expect(g3in).toContain(s);
    }, 60_000);
  });
  describe('IG-004 (P106 s3) — the island’s vocabulary in 3D: an islander (her bubble in the overlay), a fence round a locked plot, its padlock', () => {
    const W = () => node().world;
    const meshesIn = (g: any) => {
      let n = 0;
      g.traverse((o: any) => {
        if (o.type === 'Mesh' || o.type === 'InstancedMesh') n++;
      });
      return n;
    };
    it('🔴 each islander, the fence and the padlock draw something; the fence’s posts are one instanced mesh; the count the builder gives is what it made', () => {
      const s = threeStub();
      const map = W().parseMap({ rows: ['GGGGGGGGGG', 'GGGGGGGGGG', 'GGGGGGGGGG', 'GGGGGGGGGG'] });
      const things = [{ kind: 'islander', who: 'mamie', x: 0, y: 0 }, { kind: 'islander', who: 'sami', x: 1, y: 0 }, { kind: 'islander', who: 'biscuit', x: 2, y: 0 }, { kind: 'fence', x: 1, y: 1, w: 8, h: 3 }, { kind: 'padlock', x: 5, y: 2 }];
      const built = node().scene.buildScene({ map, things: W().parseThings(things), robots: [] }, s.THREE);
      const by = (k: string) => built.things.filter((g: any) => g.userData.kind === k);
      expect(by('islander').map((g: any) => [g.userData.who, meshesIn(g) > 0])).toEqual([['mamie', true], ['sami', true], ['biscuit', true]]);
      const fence = by('fence')[0];
      expect([fence.userData.w, fence.userData.h, fence.userData.posts]).toEqual([8, 3, 2 * 9 + 2 * 2]);
      expect(fence.children.filter((c: any) => c.type === 'InstancedMesh')).toHaveLength(1);
      expect(meshesIn(fence)).toBe(5);
      expect(meshesIn(by('padlock')[0])).toBe(5);
      expect(s.counts.Mesh + (s.counts.InstancedMesh || 0)).toBe(built.meshCount);
    });
    it('🔴 an islander with a line says it in the overlay (her own element, over her head); one with none says nothing', () => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: (f: () => void) => (frames.push(f), 1), caf: () => {} });
      eng.setWorld({ map: W().parseMap({ rows: ['GGGG', 'GGGG'] }), things: W().parseThings([{ kind: 'islander', who: 'sami', x: 1, y: 1, say: 'Lay four stones on the path' }, { kind: 'islander', who: 'mamie', x: 2, y: 1, say: '' }]), robots: [] });
      const says = dom.overlay.children.filter((c: any) => c.className === 'gd3-isl-say');
      expect(says.map((c: any) => c.textContent)).toEqual(['Lay four stones on the path']);
      eng.destroy();
    });
  });
  describe('IG-005 (P106 s4) — robots for the job: each robot wears its accessory in 3D, in its own colour', () => {
    it('🔴 Cobble’s hod, Pocket’s satchel and Echo’s bell are an `accessory` group on the robot; Pip keeps his can; \'\' wears nothing', () => {
      const W = node().world;
      const s = node().scene;
      // The stub keeps no constructor arguments; the body's material colour is graded here (as the dry-petal clause does).
      const st = threeStub();
      const BaseMesh = st.THREE.Mesh;
      st.THREE.Mesh = function (this: any, geo: unknown, material: unknown) {
        BaseMesh.call(this, geo, material);
        this.material = material;
      };
      const BaseMat = st.THREE.MeshLambertMaterial;
      st.THREE.MeshLambertMaterial = function (this: any, opts: { color?: number }) {
        BaseMat.call(this, opts);
        this.color = opts ? opts.color : undefined;
      };
      const built = s.buildScene({ map: W.parseMap({ rows: ['GGGGG'] }), things: [], robots: W.parseRobots([
        { x: 0, y: 0, name: 'Pip', colour: '#FF7A59', accessory: 'can' },
        { x: 1, y: 0, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' },
        { x: 2, y: 0, name: 'Pocket', colour: '#FFB347', accessory: 'satchel' },
        { x: 3, y: 0, name: 'Echo', colour: '#8F6BFF', accessory: 'bell' },
        { x: 4, y: 0, name: 'Bare', accessory: '' }
      ]) }, st.THREE);
      const named = (g: any, n: string): any => { let f: any = null; g.traverse((o: any) => { if (!f && o.name === n) f = o; }); return f; };
      const acc = built.robots.map((g: any) => (named(g, 'accessory') ? named(g, 'accessory').userData.accessory : null));
      const can = built.robots.map((g: any) => !!named(g, 'can'));
      expect(acc).toEqual([null, 'hod', 'satchel', 'bell', null]);
      expect(can).toEqual([true, false, false, false, false]);
      // Each body in its own colour (the first mesh of the robot is its body box).
      const body = (g: any) => { let m: any = null; g.traverse((o: any) => { if (!m && o.type === 'Mesh') m = o; }); return '#' + Number(m.material.color).toString(16).padStart(6, '0'); };
      expect(built.robots.slice(0, 4).map(body)).toEqual(['#ff7a59', '#7a8ca3', '#ffb347', '#8f6bff']);
    });
  });

  // ── P108 IW-002 AC6 (lane D): the job model in 3D, the pinned copies of the one table, Watch and Picking ──
  describe('IW-002 AC6 (P108 s2, lane D) — the job model in 3D from the engine’s names; the table’s copies pinned; Watch and Picking', () => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { REQUESTS, JOB_VOCABULARY, SITE_STAGES, WALL_TILE } = require('./cg002Content');
    const { ENGINE, helper } = require('./cg002Scripts');
    /* eslint-enable @typescript-eslint/no-var-requires */
    const W = () => node().world;
    const named = (g: any, name: string) => {
      let hit: any = null;
      g.traverse((o: any) => {
        if (!hit && o.name === name) hit = o;
      });
      return hit;
    };
    const meshesIn = (g: any) => {
      let n = 0;
      g.traverse((o: any) => {
        if (o.type === 'Mesh' || o.type === 'InstancedMesh') n++;
      });
      return n;
    };
    const build = (rows: string[], things: unknown[], robots: unknown[] = []) => {
      const st = threeStub();
      const built = node().scene.buildScene({ map: W().parseMap({ rows }), things: W().parseThings(things), robots: W().parseRobots(robots) }, st.THREE);
      return { built, counts: st.counts };
    };
    /** A live engine on the fake DOM (the input clause's harness, with a clock and a frame queue). */
    const live = (world: { rows: string[]; things: unknown[]; robots?: unknown[] }) => {
      const { THREE } = threeStub();
      const dom = fakeDom();
      const frames: Array<() => void> = [];
      const taps: number[][] = [];
      const eng = node().engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: (f: () => void) => (frames.push(f), frames.length), caf: () => {}, onTap: (x: number, y: number) => taps.push([x, y]) });
      eng.setWorld({ map: W().parseMap({ rows: world.rows }), things: W().parseThings(world.things), robots: W().parseRobots(world.robots || []) });
      eng.frame();
      const ev = (type: string, x: number, y: number, id = 1) => dom.handlers[type]({ type, clientX: x, clientY: y, pointerId: id, pointerType: 'mouse', button: 0, preventDefault() {} });
      const chips = () => dom.overlay.children.filter((c: any) => /gd3-meter/.test(c.className)).map((c: any) => `${c.attrs['data-kind']}:${c.attrs['data-meter']}${/gd3-watch/.test(c.className) ? ':watch' : ''}${/gd3-full/.test(c.className) ? ':full' : ''}`);
      const rings = () => dom.overlay.children.filter((c: any) => c.className === 'gd3-ring').map((c: any) => `${c.attrs['data-ring']}@${c.attrs['data-x'] ?? 'r' + c.attrs['data-robot']},${c.attrs['data-y'] ?? ''}`);
      return { eng, dom, ev, taps, chips, rings };
    };

    it('🔴 the pinned copies: both kits’ JOB_VOCABULARY, SITE_STAGES and WALL_TILE are cg002Content’s ONE table; L is the wall in both legends; the meter and watch helpers give garden-kit’s answers', () => {
      const one = { JOB_VOCABULARY: JSON.parse(JSON.stringify(JOB_VOCABULARY)), SITE_STAGES: [...SITE_STAGES], WALL_TILE };
      for (const [name, job] of [['garden-kit', node2d().world.job], ['garden-3d-kit', W().job], ['garden-3d-kit (node)', node().job]] as const)
        expect({ name, tables: { JOB_VOCABULARY: job.JOB_VOCABULARY, SITE_STAGES: job.SITE_STAGES, WALL_TILE: job.WALL_TILE } }).toEqual({ name, tables: one });
      for (const w of [node2d().world, W()]) expect([w.DEFAULT_LEGEND[WALL_TILE], w.KINDS.includes('wall')]).toEqual(['wall', true]);
      const a = node2d().world.job;
      const b = W().job;
      const things: unknown[] = [
        null, 7, {}, { kind: 'tulip' }, { kind: 'tulip', need: 3 }, { kind: 'tulip', have: 2, need: 3 }, { kind: 'tulip', need: '4', watered: true }, { kind: 'tulip', have: 9, need: 3 },
        { kind: 'site', have: 0, need: 4 }, { kind: 'site', have: 2, need: 4, stage: 'cobbles' }, { kind: 'site', have: 4, need: 4, item: 'brick' }, { kind: 'site', stage: 'nonsense', have: 1, need: 4 },
        { kind: 'basket', count: 3, capacity: 4 }, { kind: 'basket', count: 4, capacity: 4, item: 'egg' }, { kind: 'bowl', food: 1, count: 1 }, { kind: 'bowl', count: 1, capacity: 2 }, { kind: 'store', count: 0, capacity: 12 },
        { kind: 'can', level: 2, max: 3 }, { kind: 'can' }, { kind: 'can', level: 'x', max: 3 }, { kind: 'rock', left: 2 }, { kind: 'rock', left: 0, max: 4 }, { kind: 'rock', left: 7, max: 4 },
        { kind: 'hen', pen: [4, 2, 2, 1] }, { kind: 'hen', pen: [1, 2] }, { kind: 'hen', pen: ['a', 1, 2, 3] }, { kind: 'postbox' }, { kind: 'egg' }, { kind: 'letter' }
      ];
      for (const t of things) {
        expect({ t, meter: b.meterOf(t) }).toEqual({ t, meter: a.meterOf(t) });
        expect({ t, pen: b.penOf(t) }).toEqual({ t, pen: a.penOf(t) });
        if (t && (t as any).kind === 'site') expect({ t, stage: b.siteStage(t) }).toEqual({ t, stage: a.siteStage(t) });
      }
      const ts = [{ kind: 'tulip', id: 'tu', x: 0, y: 0 }, { kind: 'basket', x: 2, y: 0 }, { kind: 'egg', x: 3, y: 0 }];
      const rs = [{ x: 1, y: 1, can: 1 }, { x: 2, y: 1, holds: 'can', can: 2 }];
      for (const v of ['', null, '{bad', 7, { kind: 'egg', x: 3, y: 0 }, '[{"kind":"basket","x":2,"y":0}]', [{ id: 'tu', kind: 'x', x: 9, y: 9 }, { kind: 'can', x: 5, y: 5 }, { kind: 'ahead', x: 3, y: 1 }, { x: 1 }, null, { kind: 'ahead', x: -1, y: 'a' }]]) {
        expect({ v, refs: b.watchRefs(v) }).toEqual({ v, refs: a.watchRefs(v) });
        expect({ v, seen: b.resolveWatch(v, ts, rs) }).toEqual({ v, seen: a.resolveWatch(v, ts, rs) });
      }
      // Known-firing: the resolution is not empty on the mixed list (by id, the holder of the can, the tile).
      expect(b.resolveWatch([{ id: 'tu', kind: 'x', x: 9, y: 9 }, { kind: 'can', x: 5, y: 5 }, { kind: 'ahead', x: 3, y: 1 }], ts, rs)).toEqual({ things: [0], robots: [1], tiles: ['3,1'] });
      // parseRobots carries holds the same in both copies (only when it holds the can).
      expect(W().parseRobots([{ holds: 'can' }, { holds: 'x' }, {}]).map((r: any) => r.holds)).toEqual(node2d().world.parseRobots([{ holds: 'can' }, { holds: 'x' }, {}]).map((r: any) => r.holds));
    });

    it('🔴 every new thing builds from primitives, honestly counted: the wall tile, a site by stage with its stones, a basket’s eggs, a store, the can’s level, the hen and her pen, a used rock, a letter in the post box, a part-watered and a drooping tulip', () => {
      const { built, counts } = build(['GLLG', 'GGGG', 'GGGG', 'GGGG'], [
        { kind: 'site', x: 0, y: 1, have: 0, need: 4 }, { kind: 'site', x: 1, y: 1, have: 1, need: 4 }, { kind: 'site', x: 2, y: 1, have: 3, need: 4, stage: 'cobbles' }, { kind: 'site', x: 3, y: 1, have: 4, need: 4 },
        { kind: 'basket', x: 0, y: 2, count: 3, capacity: 4 }, { kind: 'store', x: 1, y: 2, count: 2, capacity: 6 }, { kind: 'can', x: 2, y: 2, level: 1, max: 4 }, { kind: 'rock', x: 3, y: 2, left: 0, max: 4 },
        { kind: 'hen', x: 0, y: 3, pen: [0, 3, 1, 3] }, { kind: 'postbox', x: 3, y: 3 }, { kind: 'letter', x: 3, y: 3 }, { kind: 'letter', x: 2, y: 3 },
        { kind: 'tulip', x: 3, y: 0, need: 3, have: 1 }, { kind: 'tulip', x: 0, y: 0, need: 3, have: 2, droop: true }
      ]);
      const by = (k: string) => built.things.filter((g: any) => g.userData.kind === k);
      expect(by('site').map((g: any) => g.userData.stage)).toEqual(['dirt', 'gravel', 'cobbles', 'path']);
      expect(by('site').map(meshesIn)).toEqual([1, 2, 4, 3]);
      expect(by('basket')[0].userData.eggs).toBe(3);
      expect(meshesIn(by('store')[0])).toBe(4);
      expect(named(by('can')[0], 'level').scale.y).toBeCloseTo(0.25);
      expect(by('rock')[0].userData.size).toBe('used');
      expect(meshesIn(by('rock')[0])).toBe(1);
      expect(by('hen')[0].userData.pen).toEqual({ x: 0, y: 3, w: 2, h: 1 });
      expect(named(by('hen')[0], 'pen').scale.x).toBeCloseTo(1.96);
      expect(named(by('hen')[0], 'hen')).not.toBeNull();
      const letters = by('letter');
      expect(letters.map((g: any) => !!g.userData.inBox)).toEqual([false, true]);
      expect(letters[1].position.y).toBeGreaterThan(letters[0].position.y + 0.5);
      const tulips = by('tulip');
      expect(tulips.map((g: any) => [g.userData.x, g.userData.look])).toEqual([[0, 'droop'], [3, 'part']]);
      expect(tulips[0].rotation.z).toBeGreaterThan(0.31);
      expect(tulips[1].rotation.z).toBeLessThan(0.31);
      // The wall: its tiles are grass-height and grass-shaded; two instanced parts (body and cap) for both walls.
      const wallDecor = built.decor.filter((m: any) => m.type === 'InstancedMesh' && m.children !== undefined && m.name !== 'x');
      expect(built.tiles.map((m: any) => m.name)).toContain('tiles-wall');
      expect(node().scene.TILE_HEIGHT.wall).toBe(node().scene.TILE_HEIGHT.grass);
      expect(wallDecor.length).toBe(2);
      expect(counts.Mesh + (counts.InstancedMesh || 0)).toBe(built.meshCount);
      // Every thing a job world carries draws something; the 13 requests’ worlds carry no meter and no wall.
      for (const k of ['site', 'basket', 'store', 'can', 'hen']) expect({ k, drawn: by(k).every((g: any) => meshesIn(g) > 0) && by(k).length > 0 }).toEqual({ k, drawn: true });
      for (const r of REQUESTS) {
        const b = build([...r.map], r.things.map((t: any) => ({ ...t }))).built;
        expect({ id: r.id, meters: b.things.filter((g: any) => g.userData.meter).length, wall: b.tiles.some((m: any) => m.name === 'tiles-wall') }).toEqual({ id: r.id, meters: 0, wall: false });
      }
    });

    it('🔴 the meters are the mockup’s chips in the overlay; Watch rings the chip’s thing, a held can’s robot, or the tile, and draws the meter large — without rebuilding the scene', () => {
      const L = live({
        rows: ['GGGG', 'GGGG'],
        things: [{ kind: 'tulip', id: 'tu', x: 0, y: 0, need: 3, have: 3 }, { kind: 'basket', x: 2, y: 0, count: 2, capacity: 4 }, { kind: 'egg', x: 3, y: 0 }, { kind: 'rock', x: 3, y: 1, left: 2, max: 4 }],
        robots: [{ x: 1, y: 1, d: 1, holds: 'can', can: 1, canMax: 3, name: 'Pip' }]
      });
      expect(L.chips()).toEqual(['tulip:3/3:full', 'basket:2/4', 'rock:2/4', 'can:1/3']);
      expect(L.rings()).toEqual([]);
      const before = L.eng.built;
      L.eng.setWatch([{ id: 'tu', kind: 'tulip', x: 9, y: 9 }, { kind: 'basket', x: 2, y: 0 }, { kind: 'can', x: 5, y: 5 }, { kind: 'ahead', x: 3, y: 1 }]);
      expect(L.eng.built).toBe(before);
      expect(L.chips()).toEqual(['tulip:3/3:watch:full', 'basket:2/4:watch', 'rock:2/4', 'can:1/3:watch']);
      expect(L.rings()).toEqual(['tulip@0,0', 'basket@2,0', 'robot@r0,', 'tile@3,1']);
      expect(L.dom.root.attrs['data-watched']).toBe('4');
      L.eng.frame();
      const ring = L.dom.overlay.children.find((c: any) => c.className === 'gd3-ring');
      expect(parseFloat(ring.style.width)).toBeGreaterThan(10);
      expect(parseFloat(ring.style.height)).toBeGreaterThan(5);
      for (const junk of ['', '{bad', 7, [{ x: 1 }], null]) {
        L.eng.setWatch(junk);
        expect({ junk, rings: L.rings().length, watched: L.chips().filter((c: string) => c.includes(':watch')).length }).toEqual({ junk, rings: 0, watched: 0 });
      }
      L.eng.destroy();
      const css = node().css as string;
      expect(css).toMatch(/\.gd3-meter\.gd3-watch\{[^}]*outline:3px solid #8F6BFF[^}]*font-size:15px/);
      expect(css).toMatch(/\.gd3-ring\{[^}]*border:3px solid #8F6BFF/);
      // A robot that does not hold the can gets no chip (its level is in the can it wears, as before).
      const plain = live({ rows: ['GG'], things: [], robots: [{ x: 0, y: 0, can: 2, canMax: 3 }] });
      expect(plain.chips()).toEqual([]);
      plain.eng.destroy();
    });

    it('🔴 Picking: the root says so, the things on the tile under the pointer lift (and only those), a tap still reports its tile, and off puts them down', () => {
      const L = live({ rows: ['GGGG', 'GGGG', 'GGGG'], things: [{ kind: 'basket', x: 1, y: 1, count: 0, capacity: 4 }, { kind: 'egg', x: 2, y: 1 }] });
      const basket = L.eng.built.things.find((g: any) => g.userData.kind === 'basket');
      const egg = L.eng.built.things.find((g: any) => g.userData.kind === 'egg');
      const y0 = [basket.position.y, egg.position.y];
      const s = L.eng.screenOfTile(1, 1);
      L.ev('pointermove', s.sx, s.sy);
      L.eng.frame();
      expect(basket.position.y).toBe(y0[0]);
      L.eng.setPicking(true);
      expect(L.dom.root.attrs['data-picking']).toBe('true');
      L.ev('pointermove', s.sx, s.sy);
      L.eng.frame();
      expect(L.dom.root.attrs['data-hover']).toBe('1,1');
      expect(basket.position.y).toBeCloseTo(y0[0] + node().scene.PICK_LIFT);
      expect(egg.position.y).toBe(y0[1]);
      L.ev('pointerdown', s.sx, s.sy);
      L.ev('pointerup', s.sx + 2, s.sy + 1);
      expect(L.taps).toEqual([[1, 1]]);
      L.eng.setPicking(false);
      L.eng.frame();
      expect([basket.position.y, L.dom.root.attrs['data-picking']]).toEqual([y0[0], 'false']);
      L.eng.destroy();
      const html = render({ picking: true });
      expect(html).toContain('class="gd3-world gd3-picking"');
      expect(render({})).toContain('class="gd3-world"');
      expect(node().css as string).toMatch(/\.gd3-world\.gd3-picking\{border-color:#8F6BFF/);
    });

    it('🔴 AC4 (the 3D kit): Start world’s seeded layout builds the same for the same seed and three layouts for seeds 1, 2, 3 — the wall where the map says, the eggs on their tiles', () => {
      const req = { seeded: { wallAt: [2, 5], wallRow: 0, eggs: { count: 3, among: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]] } } };
      const laid = (seed: number) => helper(ENGINE, 'seedWorld', { map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG'], things: [], robots: [{ id: 'pip', x: 0, y: 1, d: 1 }] }, req, seed);
      const shape = (seed: number) => {
        const w = laid(seed);
        const { built } = build(w.map, w.things);
        const wall = W().parseMap({ rows: w.map }).cells.filter((c: any) => c.kind === 'wall').map((c: any) => c.x);
        const eggs = built.things.filter((g: any) => g.userData.kind === 'egg').map((g: any) => g.userData.x).sort();
        return { wall, eggs, walls: built.tiles.filter((m: any) => m.name === 'tiles-wall').length };
      };
      const three = [1, 2, 3].map(shape);
      expect(new Set(three.map((l) => JSON.stringify(l))).size).toBe(3);
      expect(shape(2)).toEqual(three[1]);
      for (const l of three) expect([l.wall.length, l.eggs.length, l.walls]).toEqual([1, 3, 1]);
    });
  });
});
