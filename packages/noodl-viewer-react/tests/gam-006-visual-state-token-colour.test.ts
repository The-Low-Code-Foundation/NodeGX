/**
 * GAM-006 AC7 — a visual state (variant) switching a token colour, with a transition.
 *
 * `setVisualStates` (`react-component-node.ts`) hands every changed parameter with a transition to
 * `transitionParameter` (`node-transitions.ts`). For a `color` input that parses both endpoints
 * with the same hex-only `setRGBA` the States node used, after the same `styles.resolveColor`
 * lookup. Predicted from source, and measured here: a token parses to garbage, and unlike States
 * after GAM-006 (b), the timer's last frame is the tween's own hex. `onFinish` never writes the
 * value the state names.
 *
 * The node is a stub that carries exactly what `transitionParameter` reads (`getInputValue`,
 * `getInput`, `queueInput`, `_transitions`, `context`). The clock is the runtime's real
 * `TimerScheduler`, and the colour resolver is the viewer's real `Styles` with two legacy styles.
 *
 * | arm | start | end | why it is here |
 * |---|---|---|---|
 * | `token` | `var(--muted)` | `var(--primary)` | the defect |
 * | `hex` | `#334455` | `#8a4f16` | known-firing: hex parses (§7: it grades nothing on its own) |
 * | `named` | `Grey` | `Primary` | §7: a legacy colour style must keep resolving |
 * | `fromTransparent` | `transparent` | `#8a4f16` | the borrow-the-other-hue branch |
 */

/* eslint-env jest */

import transitionParameter from '../src/node-transitions';
import Styles from '../src/styles';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TimerScheduler = require('../../noodl-runtime/src/timerscheduler');

const COLOR_STYLES = { Grey: '#777777', Primary: '#112233' };
const TRANSITION = { curve: [0, 0, 0.58, 1], dur: 300, delay: 0 };

/** Runs one transition on a stub colour input and returns every value it queued, by frame time. */
function drive(start: string, end: string, raised?: Array<[string, string]>): Array<[number, unknown]> {
  const scheduler = new TimerScheduler(() => undefined);
  const styles = new Styles({
    graphModel: { getMetaData: () => ({ colors: COLOR_STYLES }), on: () => undefined },
    nodeRegister: {},
    // No scope: `setStyles` then stops before re-applying styles to live nodes, which a stub has none of.
    getNodeScope: () => undefined
  } as never);

  const queued: Array<[number, unknown]> = [];
  let now = 0;
  const node = {
    _transitions: undefined as unknown,
    context: { styles, timerScheduler: scheduler },
    getInputValue: () => start,
    getInput: () => ({ type: 'color' }),
    queueInput: (_name: string, value: unknown) => queued.push([now, value]),
    raiseRuntimeError: (code: string, message: string) => raised?.push([code, message])
  };

  transitionParameter(node as never, 'backgroundColor', end, TRANSITION as never);
  for (now = 0; now <= 480; now += 16) scheduler.runTimers(now);
  return queued;
}

const ARMS = {
  token: ['var(--muted)', 'var(--primary)'],
  hex: ['#334455', '#8a4f16'],
  named: ['Grey', 'Primary'],
  fromTransparent: ['transparent', '#8a4f16']
} as const;

const ARMS_TOKEN: [string, string] = [ARMS.token[0], ARMS.token[1]];

const last = (frames: Array<[number, unknown]>) => frames[frames.length - 1][1];

describe('GAM-006 AC7 — a visual state transition on a colour input', () => {
  test('the readings, recorded whatever they are', () => {
    for (const [arm, [start, end]] of Object.entries(ARMS)) {
      const frames = drive(start, end);
      const pick = [frames[0], frames[Math.floor(frames.length / 2)], frames[frames.length - 1]];
      console.log(`GAM-006 AC7 ${arm} (${frames.length} frames):`, JSON.stringify(pick));
    }
    expect(drive(...ARMS.hex).length).toBeGreaterThan(2);
  });

  // Known-firing at HEAD and after: the frames between the endpoints are real colours for every
  // notation the parse reads. A legacy style resolves first, so its midpoint is a real colour too.
  test.each(['hex', 'named', 'fromTransparent'] as const)('🟢 known-firing: %s glides through real colours', (arm) => {
    const frames = drive(ARMS[arm][0], ARMS[arm][1]);
    const middle = frames.slice(1, -2).map(([, v]) => v);
    expect(middle.length).toBeGreaterThan(5);
    for (const value of middle) expect(value).toMatch(/^#[0-9a-f]{8}$/);
    expect(new Set(middle).size).toBeGreaterThan(3);
  });

  // 🔴 Measured at HEAD: the token read `#0aNaNNaNNaN` on all 20 frames, the last included, and the
  // other three ended on the tween's 8-digit hex (`#8a4f16ff`, `#112233ff`). Transitions off queues
  // the authored value (`setVisualStates`' `queueInput`), so with (b) both end in the same place.
  test.each(Object.keys(ARMS) as Array<keyof typeof ARMS>)('🔴 %s ends on the value the state names', (arm) => {
    expect(last(drive(ARMS[arm][0], ARMS[arm][1]))).toBe(ARMS[arm][1]);
  });
});

const globals = globalThis as unknown as Record<string, unknown>;
const TOKENS: Record<string, string> = { '--muted': '#334455', '--primary': '#8a4f16' };
function installPage(supports?: (property: string, value: string) => boolean) {
  globals.document = { documentElement: {} };
  globals.getComputedStyle = () => ({ getPropertyValue: (name: string) => TOKENS[name] ?? '' });
  if (supports) globals.CSS = { supports };
}
function removePage() {
  delete globals.document;
  delete globals.getComputedStyle;
  delete globals.CSS;
}

describe('GAM-006 (a) on a visual state — a token colour is read before the tween', () => {
  afterEach(removePage);

  // 🔴 At HEAD every frame was `#0aNaNNaNNaN`.
  test('🔴 with a page, a token glides through real colours and lands on the token', () => {
    installPage();
    const frames = drive(...ARMS_TOKEN);
    const middle = frames.slice(1, -2).map(([, v]) => v);
    for (const value of middle) expect(value).toMatch(/^#[0-9a-f]{8}$/);
    expect(new Set(middle).size).toBeGreaterThan(3);
    expect(last(frames)).toBe('var(--primary)');
  });

  test('🔴 with no page, a token holds the colour on screen and lands', () => {
    const frames = drive(...ARMS_TOKEN);
    expect(new Set(frames.slice(0, -1).map(([, v]) => v))).toEqual(new Set(['var(--muted)']));
    expect(last(frames)).toBe('var(--primary)');
  });
});

describe('GAM-006 R7 on a visual state — reported only when the browser would also reject it', () => {
  afterEach(removePage);
  const REJECTS = (_property: string, value: string) => value !== 'notacolour';

  test.each([
    ['🟢 known-firing: a value CSS rejects is reported once', 'notacolour', REJECTS, 1],
    ['a named colour the tween cannot read is not', 'red', REJECTS, 0],
    ['with no CSS to ask, even a rejected value is not', 'notacolour', undefined, 0]
  ] as const)('%s', (_name, colour, supports, expected) => {
    installPage(supports);
    const raised: Array<[string, string]> = [];
    const frames = drive('#334455', colour, raised);
    expect(raised.filter(([code]) => code === 'visual-states/unreadable-color').length).toBe(expected);
    expect(last(frames)).toBe(colour);
  });
});
