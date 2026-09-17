/**
 * TPL-007 — the gate over `library/modules/game-kit`.
 *
 * The kit is plain JS the browser runs as-is, so this spec runs the BUILT file
 * (`project/noodl_modules/game-kit/index.js`) — the artefact a project installs —
 * inside a `vm` context with the two globals the runtime provides (`Noodl`,
 * `React`) and nothing else. No `window`, no `document`: the server-render arm,
 * which is also the arm where every browser API has to be absent without a throw.
 *
 * What it grades, and why each one is worth a spec:
 *
 * - **The built file carries the source verbatim.** `index.js` is generated; the
 *   thing a person edits is `src/kit.js`. If the two drift, the editor installs
 *   code nobody wrote.
 * - **Five nodes register, by the names the graph will use.** A kit that
 *   registers four renders the graph silently short of one.
 * - **`Sound` never fires after delete.** The `addDeleteListener` teardown is the
 *   whole reason the node is careful; measured with fake timers.
 * - **The React nodes render on the server without a DOM**, and draw what their
 *   ports say — a lit key, an avatar image, the course path.
 * - **Avatars are deterministic** — a profile stores two strings, so the same two
 *   strings must always be the same face.
 *
 * @module noodl-mcp/tests/tpl007GameKit.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { reducedMotionReport } from './reducedMotion';
import { HANGAR_SHELF } from './tpl007Curriculum';
import { HANGAR_HELPERS } from './tpl007Scripts';

const KIT_DIR = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'game-kit');
const BUILT = path.join(KIT_DIR, 'project', 'noodl_modules', 'game-kit', 'index.js');
const SOURCE = path.join(KIT_DIR, 'src', 'kit.js');

interface KitModule {
  nodes: Array<Record<string, any>>;
  reactNodes: Array<Record<string, any>>;
}

/** Load the built kit into a bare context and return what it handed `Noodl.defineModule`. */
function loadKit(extraGlobals: Record<string, unknown> = {}): { kit: KitModule; context: Record<string, any> } {
  let captured: KitModule | null = null;
  const context: Record<string, any> = {
    Noodl: {
      defineModule(m: KitModule) {
        captured = m;
      }
    },
    React,
    console,
    // Resolved at CALL time, not at load time, so jest's fake timers (installed
    // inside a describe) are the ones the kit reaches.
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    encodeURIComponent,
    ...extraGlobals
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(BUILT, 'utf8'), context, { filename: 'game-kit/index.js' });
  if (!captured) throw new Error('index.js never called Noodl.defineModule');
  return { kit: captured, context };
}

/** The smallest thing that behaves like a runtime node instance, for the logic nodes. */
function fakeNode() {
  const signals: string[] = [];
  const dirty: string[] = [];
  const deleteListeners: Array<() => void> = [];
  return {
    id: 'n1',
    _internal: {} as Record<string, any>,
    signals,
    dirty,
    deleteListeners,
    sendSignalOnOutput(name: string) {
      signals.push(name);
    },
    flagOutputDirty(name: string) {
      dirty.push(name);
    },
    addDeleteListener(fn: () => void) {
      deleteListeners.push(fn);
    },
    del() {
      for (const fn of deleteListeners) fn();
    }
  };
}

describe('TPL-007 — game-kit, the built artefact', () => {
  let kit: KitModule;
  let context: Record<string, any>;

  beforeAll(() => {
    ({ kit, context } = loadKit());
  });

  it('the built file ends with src/kit.js verbatim — the file a person edits is the file that runs', () => {
    const built = fs.readFileSync(BUILT, 'utf8');
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(built.endsWith(source)).toBe(true);
    expect(built.startsWith('/* game-kit')).toBe(true);
  });

  it('registers exactly six nodes under the game-kit namespace', () => {
    const names = [...kit.nodes, ...kit.reactNodes].map((n) => n.name).sort();
    expect(names).toEqual(['game-kit.AnswerPad', 'game-kit.Avatar', 'game-kit.KeepStorage', 'game-kit.KeyboardMap', 'game-kit.RaceTrack', 'game-kit.Sound']);
    for (const n of [...kit.nodes, ...kit.reactNodes]) {
      expect(typeof n.docs).toBe('string');
      expect(n.docs.length).toBeGreaterThan(40);
    }
  });

  it('the avatar bundle is present, deterministic, and answers every style it lists', () => {
    const dicebear = context.NodegxDicebear;
    expect(dicebear).toBeDefined();
    const styles = ['pixel-art', 'fun-emoji', 'thumbs', 'big-smile', 'adventurer'];
    for (const style of styles) {
      const svg = dicebear.avatarSvg(style, 'Léa');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(dicebear.avatarSvg(style, 'Léa')).toBe(svg);
      expect(dicebear.avatarSvg(style, 'Léo')).not.toBe(svg);
    }
    // The enum on the node names the same five, in the same spelling.
    const avatar = kit.reactNodes.find((n) => n.name === 'game-kit.Avatar')!;
    expect(avatar.inputProps.look.type.enums.map((e: { value: string }) => e.value)).toEqual(styles);
  });

  describe('Sound', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('Play schedules Ended after the notes, and no AudioContext is needed to do so', () => {
      const def = kit.nodes.find((n) => n.name === 'game-kit.Sound')!;
      const node = fakeNode();
      def.initialize.call(node);
      def.inputs.sound.set.call(node, 'correct');
      def.inputs.play.valueChangedToTrue.call(node);
      expect(node.signals).toEqual([]);
      jest.advanceTimersByTime(90 + 140);
      expect(node.signals).toEqual(['ended']);
    });

    it('🔴 a deleted node never sends Ended — the teardown is the point of the node', () => {
      const def = kit.nodes.find((n) => n.name === 'game-kit.Sound')!;
      const node = fakeNode();
      def.initialize.call(node);
      def.inputs.play.valueChangedToTrue.call(node);
      node.del();
      jest.advanceTimersByTime(5000);
      expect(node.signals).toEqual([]);
      // And a Play after delete does nothing either.
      def.inputs.play.valueChangedToTrue.call(node);
      jest.advanceTimersByTime(5000);
      expect(node.signals).toEqual([]);
    });

    it('Enabled false mutes without unwiring', () => {
      const def = kit.nodes.find((n) => n.name === 'game-kit.Sound')!;
      const node = fakeNode();
      def.initialize.call(node);
      def.inputs.enabled.set.call(node, false);
      def.inputs.play.valueChangedToTrue.call(node);
      jest.advanceTimersByTime(5000);
      expect(node.signals).toEqual([]);
    });
  });

  describe('Keep Storage', () => {
    it('answers Granted=false and Done when there is no navigator', () => {
      const def = kit.nodes.find((n) => n.name === 'game-kit.KeepStorage')!;
      const node = fakeNode();
      def.initialize.call(node);
      def.inputs.request.valueChangedToTrue.call(node);
      expect(def.outputs.granted.get.call(node)).toBe(false);
      expect(node.dirty).toEqual(['granted']);
      expect(node.signals).toEqual(['done']);
    });

    it('relays the browser\'s answer when navigator.storage.persist exists', async () => {
      const { kit: k } = loadKit({ navigator: { storage: { persist: () => Promise.resolve(true) } } });
      const def = k.nodes.find((n) => n.name === 'game-kit.KeepStorage')!;
      const node = fakeNode();
      def.initialize.call(node);
      def.inputs.request.valueChangedToTrue.call(node);
      await new Promise((r) => setTimeout(r, 0));
      expect(def.outputs.granted.get.call(node)).toBe(true);
      expect(node.signals).toEqual(['done']);
    });
  });

  describe('the React nodes render on the server', () => {
    const render = (name: string, props: Record<string, unknown>) => {
      const def = kit.reactNodes.find((n) => n.name === name)!;
      const Component = def.getReactComponent();
      const defaults: Record<string, unknown> = {};
      for (const [key, port] of Object.entries(def.inputProps as Record<string, { default?: unknown }>)) {
        defaults[key] = port.default;
      }
      return renderToStaticMarkup(React.createElement(Component, { ...defaults, ...props }));
    };

    it('Avatar draws the seed as an image, sized by Size, ringed when asked', () => {
      const html = render('game-kit.Avatar', { seed: 'Léa', look: 'thumbs', size: 48, ringWidth: 3 });
      expect(html).toContain('src="data:image/svg+xml;utf8,');
      expect(html).toContain('width="48"');
      expect(html).toContain('0 0 0 3px');
      expect(html).toContain('title="Léa"');
    });

    it('Keyboard Map lights exactly the next key, on the layout the port names', () => {
      const html = render('game-kit.KeyboardMap', { layout: 'azerty', nextKey: 'f' });
      const lit = html.match(/data-next="true"/g) ?? [];
      expect(lit).toHaveLength(1);
      expect(html).toMatch(/data-key="f"[^>]*data-next="true"/);
      // AZERTY home row is present and QWERTY's is not.
      expect(html).toContain('data-key="q"');
      expect(html).toContain('data-key="m"');
      expect(html).not.toContain('data-key="/"');
      const qwerty = render('game-kit.KeyboardMap', { layout: 'qwerty', nextKey: 'space' });
      expect(qwerty).toContain('data-key="/"');
      expect(qwerty).toMatch(/data-key=" "[^>]*data-next="true"/);
    });

    it('Keyboard Map with no next key lights nothing, and the digit row can be hidden', () => {
      const html = render('game-kit.KeyboardMap', { layout: 'azerty', nextKey: '', showDigits: false });
      expect(html).not.toContain('data-next');
      expect(html).not.toContain('data-key="1"');
    });

    it('🔴 RKT-012: Keyboard Map flashes a wrong key while the next key stays lit; a count of 0 flashes nothing', () => {
      const html = render('game-kit.KeyboardMap', { layout: 'qwerty', nextKey: 'o', wrongKey: 'X', wrongCount: 1 });
      expect(html.match(/data-wrong="true"/g) ?? []).toHaveLength(1);
      expect(html).toMatch(/data-key="x"[^>]*data-wrong="true"/);
      expect(html).toMatch(/data-key="o"[^>]*data-next="true"/);
      // Sabotage arm: the same wrong key with no count behind it is not a flash.
      expect(render('game-kit.KeyboardMap', { layout: 'qwerty', nextKey: 'o', wrongKey: 'x', wrongCount: 0 })).not.toContain('data-wrong');
    });

    it('Race Track draws the course and the planet colour, and no rocket until the path can be measured', () => {
      const def = kit.reactNodes.find((n) => n.name === 'game-kit.RaceTrack')!;
      const html = render('game-kit.RaceTrack', { progressA: 0.5, progressB: 0.25 });
      expect(html).toContain('<svg');
      expect(html).toContain(`d="${def.inputProps.path.default}"`);
      expect(html).toContain('stroke="var(--surface-raised)"');
      // Positions come from getPointAtLength, which only a browser has — so on
      // the server the rockets are honestly absent rather than drawn at 0,0.
      expect(html).not.toContain('<image');
    });

    it('every colour port on every visual node defaults to a token, except the finger palette', () => {
      for (const def of kit.reactNodes) {
        for (const [key, port] of Object.entries(def.inputProps as Record<string, { type: unknown; default?: unknown }>)) {
          if (port.type !== 'color') continue;
          const isFinger = def.name === 'game-kit.KeyboardMap' && /Color$/.test(key) && !/^(key|highlight|highlightText)Color$/.test(key) && key !== 'textColor';
          if (isFinger) continue;
          if (def.name === 'game-kit.KeyboardMap' && key === 'textColor') continue;
          expect({ node: def.name, port: key, value: port.default }).toEqual({
            node: def.name,
            port: key,
            value: expect.stringMatching(/^var\(--[a-z-]+\)$/)
          });
        }
      }
    });
  });

  describe('P87 RKT-011 — the face wears what the hangar shelf says', () => {
    const SEEDS = ['Léa', 'Sam', 'Noé'];
    const avatarSrc = (look: string, seed: string, options?: unknown) => {
      const def = kit.reactNodes.find((n) => n.name === 'game-kit.Avatar')!;
      const html = renderToStaticMarkup(React.createElement(def.getReactComponent(), { look, seed, size: 64, ...(options === undefined ? {} : { options }) }));
      const src = html.match(/src="([^"]+)"/);
      if (!src) throw new Error(`no picture for ${look}/${seed}: ${html}`);
      return src[1];
    };
    /** The profile's wear, as the scripts turn it into DiceBear options — out of the helpers the scripts ship, or a doctored copy. */
    const optionsFrom = (helpers: string) => new Function('look', 'wear', `${helpers}; return wearOptions(look, wear);`) as (look: string, wear: unknown) => Record<string, unknown>;
    /**
     * Every face item, on every face it fits, for which wearing it draws the same picture as not wearing it. 🔴 A seed's own face can
     * already carry exactly that part by chance (a Smile face draws a random accessory half the time; session 10: Léa's has the
     * moustache), and then wearing it cannot change the picture. The picture with that part forced OFF tells the two apart: if the
     * plain face differs from it, the plain face was already wearing this very value (a coincidence), otherwise the item drew nothing
     * (a miss).
     */
    function unchanged(helpers: string): { misses: string[]; coincidences: string[] } {
      const wearOptions = optionsFrom(helpers);
      const misses: string[] = [];
      const coincidences: string[] = [];
      for (const item of HANGAR_SHELF.filter((i) => i.kind === 'face')) {
        for (const [look, { part, value }] of Object.entries(item.faces!)) {
          for (const seed of SEEDS) {
            const plain = avatarSrc(look, seed);
            if (avatarSrc(look, seed, wearOptions(look, { face: { [look]: { [part]: value } } })) !== plain) continue;
            (avatarSrc(look, seed, { [`${part}Probability`]: 0 }) !== plain ? coincidences : misses).push(`${item.id} on ${look} (${seed})`);
          }
        }
      }
      return { misses, coincidences };
    }

    it('🔴 AC3: every face item on the shelf changes the picture, on every face it fits; with the part taken off, the face is the original', () => {
      const run = unchanged(HANGAR_HELPERS);
      expect(run.misses).toEqual([]);
      // Measured, not wished: the one seed here whose own face already wears a shelf item. A new coincidence is worth reading.
      expect(run.coincidences).toEqual(['moustache on big-smile (Léa)']);
      const wearOptions = optionsFrom(HANGAR_HELPERS);
      for (const item of HANGAR_SHELF.filter((i) => i.kind === 'face')) {
        for (const look of Object.keys(item.faces!)) {
          for (const seed of SEEDS) expect({ item: item.id, look, seed, same: avatarSrc(look, seed, wearOptions(look, { face: { [look]: {} } })) === avatarSrc(look, seed) }).toEqual({ item: item.id, look, seed, same: true });
        }
      }
      // Options as JSON draw the same as the object, and junk draws the plain face rather than nothing.
      const crown = wearOptions('big-smile', { face: { 'big-smile': { accessories: 'sailormoonCrown' } } });
      expect(avatarSrc('big-smile', 'Léa', JSON.stringify(crown))).toBe(avatarSrc('big-smile', 'Léa', crown));
      expect(avatarSrc('big-smile', 'Léa', '{not json')).toBe(avatarSrc('big-smile', 'Léa'));
    });

    it('AC3 sabotage arm: a worn part without its probability leaves the seed to decide, and the gate names what it misses', () => {
      const doctored = HANGAR_HELPERS.replace(" o[part + 'Probability'] = 100;", '');
      expect(doctored).not.toBe(HANGAR_HELPERS);
      expect(unchanged(doctored).misses.length).toBeGreaterThan(0);
    });

    it('AC2 held: the Avatar takes Options and the Race Track takes Avatar Options A and B, documented; before RKT-011 neither port existed', () => {
      const avatar = kit.reactNodes.find((n) => n.name === 'game-kit.Avatar')!;
      const track = kit.reactNodes.find((n) => n.name === 'game-kit.RaceTrack')!;
      for (const [def, key] of [[avatar, 'options'], [track, 'optionsA'], [track, 'optionsB']] as const) {
        const port = def.inputProps[key];
        expect({ node: def.name, key, type: port?.type, documented: String(port?.description ?? '').length > 20 }).toEqual({ node: def.name, key, type: 'object', documented: true });
      }
    });
  });

  describe('P87 D65 — a px port arrives at the component as a CSS string, "40px", and the kit draws that size', () => {
    // GAM-015 (2026-09-17): these arms fed `{ value: 40, unit: 'px' }` and a bare `40` into props, two shapes the
    // bridge never hands a component. `{ value, unit }` is what the port's SETTER receives; the component gets
    // `value + unit` (`react-component-node.ts`, the units branch), for a wired and a typed Size alike. Graded through
    // the real bridge in `noodl-viewer-react/tests/gam-015-a-wired-size-reaches-a-kit-node.test.ts`.
    /** Render one node out of a kit source (the built file, or a doctored copy of it). */
    const renderFrom = (source: string, name: string, props: Record<string, unknown>) => {
      let captured: KitModule | null = null;
      const ctx: Record<string, any> = { Noodl: { defineModule: (m: KitModule) => (captured = m) }, React, console, setTimeout, clearTimeout, encodeURIComponent };
      vm.createContext(ctx);
      vm.runInContext(source, ctx, { filename: 'game-kit/index.js' });
      const def = (captured as KitModule | null)!.reactNodes.find((n) => n.name === name)!;
      return renderToStaticMarkup(React.createElement(def.getReactComponent(), props));
    };
    const builtSource = () => fs.readFileSync(BUILT, 'utf8');
    const imgWidth = (html: string) => Number((html.match(/<img[^>]*width="(\d+)"/) || [])[1]);

    it('🔴 the Avatar draws the Size it is wired, in the shape the runtime delivers (session 10: every Game/Face drew at 64; the header asked for 40, the preview for 96)', () => {
      const face = (size: unknown) => imgWidth(renderFrom(builtSource(), 'game-kit.Avatar', { look: 'big-smile', seed: 'Léa', size }));
      expect([face('40px'), face('96px'), face('72px')]).toEqual([40, 96, 72]);
      // Known-firing: unset, zero, a token and junk still fall back to the port's default.
      expect([face(undefined), face('0px'), face('var(--space-4)'), face('tallpx')]).toEqual([64, 64, 64, 64]);
    });

    it('D65 sabotage arm: the old reader, Number(props.size), draws a wired Size at 64', () => {
      const doctored = builtSource().replace('var size = padPx(props.size, 64);', 'var size = Number(props.size) || 64;');
      expect(doctored).not.toBe(builtSource());
      expect(imgWidth(renderFrom(doctored, 'game-kit.Avatar', { look: 'big-smile', seed: 'Léa', size: '40px' }))).toBe(64);
    });
  });

  describe("P87 RKT-003 — the track fits its box", () => {
    /** The course every build before RKT-003 drew, spelled out so a drift in the default is caught too. */
    const S1_COURSE = "M 60 360 C 160 360, 180 140, 300 140 S 420 330, 520 330 S 640 90, 760 90 S 880 250, 940 200";
    const track = () => kit.reactNodes.find((n) => n.name === "game-kit.RaceTrack")!;
    const layout = () => track().layout as {
      chooseCourse: (aspect: unknown, path: unknown, box: { w: number; h: number } | null) => { id: string; w: number; h: number; d: string };
      spriteScale: (course: { w: number; h: number }, box: { w: number; h: number } | null, rocketSize: unknown) => number;
    };
    const unitOf = (course: { w: number; h: number }, box: { w: number; h: number }) => Math.min(box.w / course.w, box.h / course.h);
    // The boxes the race gives the track: a laptop strip, a phone, a portrait column.
    const LAPTOP = { w: 928, h: 230 };
    const PHONE = { w: 358, h: 218 };
    const COLUMN = { w: 300, h: 520 };

    it("the course is chosen by the box’s shape, and an unmeasured box draws the s1 course", () => {
      const { chooseCourse } = layout();
      expect(chooseCourse("auto", S1_COURSE, LAPTOP).id).toBe("wide");
      expect(chooseCourse("auto", S1_COURSE, PHONE).id).toBe("compact");
      expect(chooseCourse("auto", S1_COURSE, COLUMN).id).toBe("tall");
      expect(chooseCourse("auto", S1_COURSE, null)).toEqual({ id: "wide", w: 1000, h: 420, d: S1_COURSE });
      expect(chooseCourse("auto", S1_COURSE, { w: 0, h: 0 }).id).toBe("wide");
    });

    it("a named shape beats the box, and an author’s own Course beats both, in the 1000 × 420 box", () => {
      const { chooseCourse } = layout();
      expect(chooseCourse("tall", S1_COURSE, LAPTOP).id).toBe("tall");
      expect(chooseCourse("tall", "M 0 0 L 10 10", PHONE)).toEqual({ id: "custom", w: 1000, h: 420, d: "M 0 0 L 10 10" });
    });

    it("🔴 on a phone a rocket is drawn Rocket Size long, not the strip’s 22px; a big track keeps its natural size", () => {
      const { chooseCourse, spriteScale } = layout();
      const phone = chooseCourse("auto", S1_COURSE, PHONE);
      const natural = 64 * unitOf(phone, PHONE);
      expect(natural).toBeLessThan(28); // the defect, unscaled
      expect(64 * unitOf(phone, PHONE) * spriteScale(phone, PHONE, 44)).toBeCloseTo(44, 5);
      // A unit port delivers "44px"; the scale reads it the same.
      expect(spriteScale(phone, PHONE, "44px")).toBeCloseTo(spriteScale(phone, PHONE, 44), 10);
      const roomy = { w: 1200, h: 504 };
      expect(spriteScale(chooseCourse("auto", S1_COURSE, roomy), roomy, 44)).toBe(1);
      expect(spriteScale(phone, null, 44)).toBe(1);
    });

    it("sabotage arm: Rocket Size 0 turns the floor off, and the phone rocket is back under 28px", () => {
      const { chooseCourse, spriteScale } = layout();
      const phone = chooseCourse("auto", S1_COURSE, PHONE);
      expect(64 * unitOf(phone, PHONE) * spriteScale(phone, PHONE, 0)).toBeLessThan(28);
    });

    it("a named shape draws its own box on the server", () => {
      const def = track();
      const html = renderToStaticMarkup(
        React.createElement(def.getReactComponent(), {
          ...Object.fromEntries(Object.entries(def.inputProps as Record<string, { default?: unknown }>).map(([k, p]) => [k, p.default])),
          aspect: "tall"
        })
      );
      expect(html).toContain('viewBox="0 0 600 1000"');
      expect(html).toContain('data-course="tall"');
    });

    it("every port the race already wires is unchanged: name, type and default", () => {
      const props = track().inputProps as Record<string, { type: unknown; default?: unknown }>;
      const EXPECTED: Record<string, [unknown, unknown]> = {
        path: ["string", S1_COURSE],
        goal: ["string", "🪐"],
        progressA: ["number", 0],
        progressB: ["number", 0],
        showB: ["boolean", true],
        nameA: ["string", ""],
        nameB: ["string", ""],
        seedA: ["string", "Rocket"],
        seedB: ["string", "Computer"],
        colorA: ["color", "var(--primary)"],
        colorB: ["color", "var(--accent-foreground)"],
        trackColor: ["color", "var(--surface-raised)"],
        laneColor: ["color", "var(--border-strong)"],
        goalColor: ["color", "var(--accent)"]
      };
      for (const [name, [type, value]] of Object.entries(EXPECTED)) {
        expect({ name, type: props[name]?.type, value: props[name]?.default }).toEqual({ name, type, value });
      }
      expect({ styleA: props.styleA.default, styleB: props.styleB.default }).toEqual({ styleA: "pixel-art", styleB: "thumbs" });
      expect({ aspect: props.aspect.default, rocketSize: props.rocketSize.default }).toEqual({ aspect: "auto", rocketSize: 44 });
    });
  });

  describe("P87 RKT-002 AC4 — the reward moments", () => {
    const track = () => kit.reactNodes.find((n) => n.name === "game-kit.RaceTrack")!;
    const motion = () => track().motion as { css: string; burstRose: (before: unknown, after: unknown) => boolean };
    const defaults = () =>
      Object.fromEntries(Object.entries(track().inputProps as Record<string, { default?: unknown }>).map(([k, p]) => [k, p.default]));

    it("a burst is a Boost count going UP: a reset to 0, the same value again, or a non-number bursts nothing", () => {
      const { burstRose } = motion();
      expect([burstRose(0, 1), burstRose(4, 5), burstRose(undefined, 1)]).toEqual([true, true, true]);
      expect([burstRose(5, 0), burstRose(3, 3), burstRose(3, "x"), burstRose(undefined, 0)]).toEqual([false, false, false, false]);
    });

    it("🔴 every animation the track starts is stilled for reduced motion", () => {
      expect(reducedMotionReport(motion().css)).toEqual({ animated: ["gk-gain", "gk-ring", "gk-spark"], unstilled: [] });
    });

    it("sabotage arm: without its reduced-motion block, every animation is named", () => {
      const bare = motion().css.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\}$/, "");
      expect(reducedMotionReport(bare).unstilled).toEqual(["gk-gain", "gk-ring", "gk-spark"]);
    });

    it("the stylesheet travels with the track, and a track that mounts with a Boost count already up draws no burst", () => {
      const html = renderToStaticMarkup(React.createElement(track().getReactComponent(), { ...defaults(), burstA: 5, burstB: 2 }));
      expect(html).toContain("prefers-reduced-motion: reduce");
      expect(html).not.toContain("data-burst");
    });

    it("the three new ports are documented, and Boost left at its default bursts nothing", () => {
      const props = track().inputProps as Record<string, { type: unknown; default?: unknown; description?: string }>;
      expect(Object.fromEntries(["burstA", "burstB", "celebrate"].map((k) => [k, [props[k]?.type, props[k]?.default, !!props[k]?.description]]))).toEqual({
        // P88 GAM-017: signals. The bridge seeds a signal prop at 0 and adds one per pulse, so the burst code reads a count.
        burstA: ["signal", undefined, true],
        burstB: ["signal", undefined, true],
        celebrate: ["boolean", true, true]
      });
      expect(motion().burstRose(undefined, props.burstA.default)).toBe(false);
    });
  });

  describe("P87 RKT-007 — the stretch a move gained lights up", () => {
    const track = () => kit.reactNodes.find((n) => n.name === "game-kit.RaceTrack")!;
    const motion = () => track().motion as { gainSpan: (before: unknown, after: unknown) => { from: number; to: number } | null; gainMs: number };
    const defaults = () =>
      Object.fromEntries(Object.entries(track().inputProps as Record<string, { default?: unknown }>).map(([k, p]) => [k, p.default]));

    it("a Target that rises lights exactly the stretch it gained; the first value, the same value, a fall or a non-number lights nothing", () => {
      const { gainSpan } = motion();
      expect([gainSpan(0, 0.125), gainSpan(0.25, 0.3125), gainSpan(0.9, 1.2)]).toEqual([{ from: 0, to: 0.125 }, { from: 0.25, to: 0.3125 }, { from: 0.9, to: 1 }]);
      expect([gainSpan(undefined, 0.5), gainSpan(0.5, 0.5), gainSpan(0.5, 0), gainSpan(0.2, "x")]).toEqual([null, null, null, null]);
      expect(motion().gainMs).toBeGreaterThanOrEqual(2000);
    });

    it("a track that mounts with a Target already up lights nothing", () => {
      const html = renderToStaticMarkup(React.createElement(track().getReactComponent(), { ...defaults(), progressA: 0.5, targetA: 0.5, targetB: 0.25 }));
      expect(html).not.toContain("data-gain");
    });

    it("the two new ports are documented numbers that default to 0", () => {
      const props = track().inputProps as Record<string, { type: unknown; default?: unknown; description?: string }>;
      expect(Object.fromEntries(["targetA", "targetB"].map((k) => [k, [props[k]?.type, props[k]?.default, !!props[k]?.description]]))).toEqual({
        targetA: ["number", 0, true],
        targetB: ["number", 0, true]
      });
    });
  });

  describe("P87 RKT-005 — the answer pad", () => {
    const pad = () => kit.reactNodes.find((n) => n.name === "game-kit.AnswerPad")!;
    const logic = () =>
      pad().logic as {
        digitFromCode: (code: unknown, numeric: boolean, chord: boolean) => string | null;
        layoutFromKey: (code: unknown, key: unknown, shift: boolean, chord: boolean) => string | null;
        insertAt: (text: string, ch: string, start?: number, end?: number) => { text: string; caret: number };
        backspaceAt: (text: string, start?: number, end?: number) => { text: string; caret: number };
        padKeyList: (keys: unknown) => string[];
        padFieldMode: (field: unknown, numeric: boolean, coarse: boolean) => string;
        acceptsTyping: (expected: unknown, next: unknown) => boolean;
        wrongCharacter: (expected: unknown, text: unknown) => string;
        css: string;
      };
    const defaults = () =>
      Object.fromEntries(Object.entries(pad().inputProps as Record<string, { default?: unknown }>).map(([k, p]) => [k, p.default]));
    const html = (props: Record<string, unknown> = {}) => renderToStaticMarkup(React.createElement(pad().getReactComponent(), { ...defaults(), ...props }));

    it("🔴 a numeric pad reads a digit by its code: AZERTY's unshifted Digit4 is 4, and so is Numpad4", () => {
      const { digitFromCode } = logic();
      expect([digitFromCode("Digit4", true, false), digitFromCode("Numpad4", true, false), digitFromCode("Digit0", true, false)]).toEqual(["4", "4", "0"]);
    });

    it("sabotage arms: in a typing pad, in a chord (Ctrl+4) and on a letter key, the keyboard keeps its own character", () => {
      const { digitFromCode } = logic();
      expect([digitFromCode("Digit4", false, false), digitFromCode("Digit4", true, true), digitFromCode("KeyA", true, false), digitFromCode(undefined, true, false)]).toEqual([null, null, null, null]);
    });

    it('🔴 RKT-008 AC7: one key press tells the keyboard by its code AND its character — KeyQ typing "a" is AZERTY', () => {
      const { layoutFromKey } = logic();
      const table: Array<[string, string, boolean, boolean, string | null]> = [
        ['KeyQ', 'a', false, false, 'azerty'], ['KeyQ', 'q', false, false, 'qwerty'], ['KeyQ', 'A', true, false, 'azerty'],
        ['KeyA', 'q', false, false, 'azerty'], ['KeyA', 'a', false, false, 'qwerty'],
        ['KeyW', 'z', false, false, 'azerty'], ['KeyZ', 'z', false, false, 'qwerty'], ['Semicolon', 'm', false, false, 'azerty'],
        ['Digit1', '&', false, false, 'azerty'], ['Digit2', 'é', false, false, 'azerty'],
        // Says nothing: a key both share, an unshifted digit (Caps Lock on a French Mac types digits), Shift on the digit row, a chord.
        ['KeyS', 's', false, false, null], ['Digit1', '1', false, false, null], ['Digit1', '!', true, false, null], ['KeyQ', 'a', false, true, null], ['Enter', 'Enter', false, false, null]
      ];
      expect(table.map(([code, key, shift, chord]) => [code, key, layoutFromKey(code, key, shift, chord)])).toEqual(table.map(([code, key, , , want]) => [code, key, want]));
    });

    it('sabotage arm: guessing from the character alone reads a QWERTY child typing "a" as AZERTY; the code is what tells them apart', () => {
      const { layoutFromKey } = logic();
      const byCharacterOnly = (key: string) => (key === 'a' ? 'azerty' : key === 'q' ? 'qwerty' : null);
      expect(layoutFromKey('KeyA', 'a', false, false)).toBe('qwerty');
      expect(byCharacterOnly('a')).not.toBe(layoutFromKey('KeyA', 'a', false, false));
    });

    it("🔴 a key types at the caret, over a selection, and at the end when the box has no caret — the focused-Set trap, held", () => {
      const { insertAt, backspaceAt } = logic();
      expect(insertAt("13", "2", 1, 1)).toEqual({ text: "123", caret: 2 });
      expect(insertAt("1xx4", "23", 1, 3)).toEqual({ text: "1234", caret: 3 });
      expect(insertAt("12", "3")).toEqual({ text: "123", caret: 3 });
      expect(insertAt("12", "3", 99, 99)).toEqual({ text: "123", caret: 3 });
      expect(backspaceAt("123", 2, 2)).toEqual({ text: "13", caret: 1 });
      expect(backspaceAt("1234", 1, 3)).toEqual({ text: "14", caret: 1 });
      expect(backspaceAt("123", 0, 0)).toEqual({ text: "123", caret: 0 });
      expect(backspaceAt("123")).toEqual({ text: "12", caret: 2 });
    });

    it("one key per distinct character, and the box is display-only only for a numeric pad under a finger", () => {
      const { padKeyList, padFieldMode } = logic();
      expect(padKeyList("1123 ,,")).toEqual(["1", "2", "3", ","]);
      expect(padKeyList("âèéê")).toEqual(["â", "è", "é", "ê"]);
      expect(padKeyList(undefined)).toEqual([]);
      expect([padFieldMode("auto", true, true), padFieldMode("auto", false, true), padFieldMode("auto", true, false)]).toEqual(["display", "input", "input"]);
      expect([padFieldMode("input", true, true), padFieldMode("display", false, false)]).toEqual(["input", "display"]);
    });

    it("draws the box, the check key, one key per character and ⌫; a typing strip asks the tablet for letters", () => {
      const maths = html({ keys: "1234567890,", submitLabel: "Vérifier" });
      for (const ch of "1234567890,") expect(maths).toContain(`data-pad-key="${ch}"`);
      expect(maths).not.toContain('data-pad-key="."');
      expect(maths).toContain('data-pad-back="true"');
      expect(maths).toContain(">Vérifier</button>");
      expect(maths).toMatch(/<input[^>]*inputmode="decimal"/i);
      const typing = html({ keys: "âèéê", numeric: false });
      expect(typing).toMatch(/<input[^>]*inputmode="text"/i);
      expect(typing).not.toContain('data-pad-key="1"');
      const bare = html({ keys: "", numeric: false });
      expect(bare).not.toContain("data-pad-back");
      expect(bare).toContain("data-pad-submit");
    });

    it("a display-only box renders no <input>, so no soft keyboard can open", () => {
      const out = html({ field: "display" });
      expect(out).not.toContain("<input");
      expect(out).toContain('data-pad-field="display"');
      expect(out).toContain('role="textbox"');
    });

    it("🔴 RKT-012: a pad that knows the word accepts only a key that continues it, letter case aside; no word accepts everything", () => {
      const { acceptsTyping, wrongCharacter } = logic();
      expect([acceptsTyping("rocket", "r"), acceptsTyping("rocket", "roc"), acceptsTyping("rocket", "RO"), acceptsTyping("rocket", "rocket"), acceptsTyping("rocket", "")]).toEqual([true, true, true, true, true]);
      expect([acceptsTyping("rocket", "x"), acceptsTyping("rocket", "rox"), acceptsTyping("rocket", "rockets"), acceptsTyping("été", "ete")]).toEqual([false, false, false, false]);
      // Sabotage arm: the length rule the lit key used before this task accepts "xxx" for "rocket"; the prefix rule does not.
      const byLength = (want: string, next: string) => next.length <= want.length;
      expect([byLength("rocket", "xxx"), acceptsTyping("rocket", "xxx")]).toEqual([true, false]);
      expect([acceptsTyping("", "anything"), acceptsTyping(undefined, "42")]).toEqual([true, true]);
      expect([wrongCharacter("rocket", "rox"), wrongCharacter("rocket", "Rocz"), wrongCharacter("été", "ete"), wrongCharacter("rocket", "roc")]).toEqual(["x", "z", "e", ""]);
    });

    it("🔴 RKT-012: a pad that knows the word draws ⌫ beside the box, before the check key, and not again in its strip", () => {
      const typing = html({ keys: "âèéê", numeric: false, expected: "fête" });
      expect(typing.match(/data-pad-back=/g) ?? []).toHaveLength(1);
      expect(typing.indexOf('data-pad-back="beside"')).toBeGreaterThan(typing.indexOf("data-pad-field"));
      expect(typing.indexOf('data-pad-back="beside"')).toBeLessThan(typing.indexOf("data-pad-submit"));
      expect(typing).toContain('title="Delete"');
      // An English word has no strip, and still gets ⌫; a pad with no word keeps the strip's ⌫ and draws none beside the box.
      expect(html({ keys: "", numeric: false, expected: "rocket" })).toContain('data-pad-back="beside"');
      expect(html({ keys: "1234567890" })).not.toContain('data-pad-back="beside"');
      expect(html({ keys: "1234567890" })).toContain('data-pad-back="true"');
    });

    it("every port has a name, the outputs are Text and Submitted, every colour is a token, and nothing in its stylesheet animates", () => {
      const props = pad().inputProps as Record<string, { displayName?: string; type: unknown; default?: unknown }>;
      expect(Object.entries(props).filter(([, p]) => !p.displayName).map(([k]) => k)).toEqual([]);
      expect(Object.entries(props).filter(([, p]) => p.type === "color" && !/^var\(--/.test(String(p.default))).map(([k]) => k)).toEqual([]);
      const outs = pad().outputProps as Record<string, { type: string }>;
      // RKT-008 AC7 added Layout and Layout Seen: the keyboard a key press reports.
      // RKT-012 added Mistakes, Wrong Key and Mistake.
      expect(Object.fromEntries(Object.entries(outs).map(([k, o]) => [k, o.type]))).toEqual({ onText: "string", onMistakes: "number", onWrongKey: "string", onMistake: "signal", onSubmit: "signal", onLayout: "string", onLayoutSeen: "signal" });
      // RKT-012: the one animation is the refused key's shake, and reduced motion stills it (the red outline stays).
      expect(reducedMotionReport(logic().css)).toEqual({ animated: ["gk-pad-wrong-a", "gk-pad-wrong-b"], unstilled: [] });
    });
  });
});
