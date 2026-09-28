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
  for (const n of ['BoxGeometry', 'ConeGeometry', 'CylinderGeometry', 'IcosahedronGeometry', 'SphereGeometry', 'MeshLambertMaterial', 'Color']) THREE[n] = cls(n);
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
  for (let i = 0; i < 30; i++) things.push({ kind: ['tulip', 'puddle', 'letter', 'bowl', 'label'][i % 5], x: i % 24, y: (i * 3) % 16, watered: i % 2 === 0, full: i % 3 === 0, text: 'hi' });
  const robots = node.world.parseRobots([{ x: 1, y: 1, d: 1, name: 'Pip' }, { x: 5, y: 5, d: 2, hat: 'cap', eyes: 'happy', name: 'Bo' }, { x: 5, y: 5, d: 3, hat: 'sun', eyes: 'wink', name: 'Cobble' }]);
  return { map, things, robots };
}

const MOCKUP = { rows: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] };

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
      expect(Object.keys(a)).toEqual(['map', 'things', 'robots', 'bubble', 'stepMs', 'celebrate', 'label']);
      expect(b.camera.type).toEqual({ name: 'enum', enums: [{ value: 'plot', label: 'Plot' }, { value: 'island', label: 'Island' }, { value: 'follow', label: 'Follow' }] });
      expect(b.camera.default).toBe('plot');
      expect(b.focus.type).toBe('object');
      for (const k of Object.keys(b)) expect({ port: k, named: !!b[k].displayName }).toEqual({ port: k, named: true });
    });

    it('every output of Garden is on Garden 3D, plus Frame Ms (number) and Supported (boolean)', () => {
      const a = table(node2d(), 'outputProps');
      const b = table(node(), 'outputProps');
      for (const k of Object.keys(a)) expect({ port: k, def: b[k] }).toEqual({ port: k, def: a[k] });
      expect(Object.keys(a)).toEqual(['onTileX', 'onTileY', 'onTileTapped', 'onReady']);
      expect(Object.keys(b).filter((k) => !(k in a))).toEqual(['onFrameMs', 'onSupported']);
      expect([b.onFrameMs.type, b.onFrameMs.displayName, b.onSupported.type, b.onSupported.displayName]).toEqual(['number', 'Frame Ms', 'boolean', 'Supported']);
    });
  });

  describe('AC2 — the scene, the raycast and the camera bounds, on a 24×16 world', () => {
    it(`🔴 30 things and 3 robots build ≤ ${MESH_BUDGET} meshes with instanced tiles counted as one, and the count is the constructor count`, () => {
      const { THREE, counts } = threeStub();
      const world = bigWorld(node());
      expect([world.map.w, world.map.h, world.things.length, world.robots.length]).toEqual([24, 16, 30, 3]);
      const built = node().scene.buildScene(world, THREE);
      expect(built.meshCount).toBeLessThanOrEqual(MESH_BUDGET);
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

    it('🔴 with a renderer: the first frame draws, Ready fires once, draw calls and meshes are on the root', () => {
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
      eng.setWorld({ map: W.parseMap(MOCKUP), things: [], robots: [] });
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

    it('Camera: island frames the whole map, plot frames Focus closer, follow keeps robot 0 in the middle', () => {
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
      const robots = [null, { x: 1, y: 2 }, [{ d: -1, color: '#123', eyes: 'happy', hat: 'sun' }, { d: 6.4, hat: 'nope', bump: '2' }], '[{"x":"3","y":3,"name":"Bo"}]', 'junk', [7, null]];
      for (const r of robots) expect(JSON.stringify(b.parseRobots(r))).toBe(JSON.stringify(a.parseRobots(r)));
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

    it('🔴 the two-module fixture yields three overlay nodes, Garden 3D among them with inNodePicker true and every port', () => {
      const overlay = extractProjectOverlay(project);
      expect(overlay.unavailable).toBeUndefined();
      expect(overlay.failures).toEqual([]);
      expect(overlay.nodes.map((n) => n.typeName).sort()).toEqual(['garden-3d-kit.Garden3D', 'garden-kit.BlockList', 'garden-kit.Garden']);
      const g3 = overlay.nodes.find((n) => n.typeName === 'garden-3d-kit.Garden3D')!;
      expect(g3.inNodePicker).toBe(true);
      // The bridge adds its own inputs to every React node (cssClassName, mounted, styleCss, variant); the kit's are all there.
      const inputs = g3.inputs.map((p) => p.name);
      const outputs = g3.outputs.map((p) => p.name);
      for (const p of ['bubble', 'camera', 'celebrate', 'focus', 'label', 'map', 'robots', 'stepMs', 'things']) expect({ port: p, present: inputs.includes(p) }).toEqual({ port: p, present: true });
      for (const p of ['onFrameMs', 'onReady', 'onSupported', 'onTileTapped', 'onTileX', 'onTileY']) expect({ port: p, present: outputs.includes(p) }).toEqual({ port: p, present: true });
      const g2 = overlay.nodes.find((n) => n.typeName === 'garden-kit.Garden')!;
      expect(g2.inNodePicker).toBe(true);
      // Exactly the four new ports beyond the 2D node's, by the catalog's reading.
      expect(inputs.filter((p) => !g2.inputs.some((q) => q.name === p)).sort()).toEqual(['camera', 'focus']);
      expect(outputs.filter((p) => !g2.outputs.some((q) => q.name === p)).sort()).toEqual(['onFrameMs', 'onSupported']);
      // The 3D node's ports are the 2D node's plus the four new ones, by the catalog's own reading.
      const shared = g2.inputs.map((p) => `${p.name}:${p.type.name}`);
      const g3in = g3.inputs.map((p) => `${p.name}:${p.type.name}`);
      for (const s of shared) expect(g3in).toContain(s);
    }, 60_000);
  });
});
