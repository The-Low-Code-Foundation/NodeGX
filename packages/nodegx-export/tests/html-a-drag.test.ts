/**
 * P134 session 13 — a Drag in plain files (EXP-011 §63; HiveClip's cover, its last five of the printer's own gaps).
 *
 * The React export's way, carried: `lib/drag.js` is React's `drag.ts` (drag.ts, Drag.tsx and react-draggable 4.5.0,
 * transcribed) with its types out and the `useDrag` hook cut off (generated, and made again here); in the hook's place
 * `dragNode(l, el, source, options, listeners)` does what its render and six effects do, over the same state object. The
 * page makes the wrapper with the handle, before anything reads its Drag X, and puts it where the Drag sits.
 *
 * Graded on React's own fixture (`tests/fixtures/board-desk`: a card in a 320 by 200 board, four live reads, three
 * listeners, two snaps): the React export under StrictMode and the HTML export in jsdom, dragged by one hand
 * (`helpers/drag-steps.js`, the sizes React's §B fake gives), the same readings after each step, and a prediction of both
 * written first from the rules React's §B asserts (B3 start, B4 move, B5 the bound and its slack, B7 the commit, B13 and
 * B16 the snaps, B15 the arrival).
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { DRAG_JS } from '../src/emit/html/dragJs';
import { REPEAT_JS } from '../src/emit/html/repeatJs';
import { htmlArm } from './helpers/export-html-arm';
import { htmlDragJs, htmlRepeatJs } from './helpers/html-core-js';

const catalog = loadCatalog();
const ir = parseProject(path.join(__dirname, 'fixtures', 'board-desk'), catalog);
const html = emitHtmlApp(ir, catalog);
const LAYOUT = { wrapper: [80, 80] as [number, number], parent: [320, 200] as [number, number] };

const STEPS = [
  'mouse:down:100:100', // 1 B3: the outputs are the position with no delta, then Drag Started
  'mouse:move:130:110', // 2 B4: 20 + 30, 20 + 10
  'mouse:move:400:110', // 3 B5: 50 + 270 = 320, held at the bound 320 − 80 = 240, 80 kept as slack
  'mouse:move:380:110', // 4 B5: 240 − 20 + 80 = 300, still held, slack 60: the card does not lag on the way back
  'mouse:up:380:110', // 5 B7: committed where it is, Drag Ended (no delta written)
  'type:Snap target X:100', // 6 B15: the Value arrives, a number from a string
  'Snap home', // 7 B13: Done at each call, the tweens join on a later frame
  'wait:700', // 8 B16: X over 200 ms to 100, Y over the unset 300 ms to 0; a snap writes no delta
  'mouse:down:200:100', // 9 B3 again, from where the snaps left it
  'mouse:move:150:100', // 10 B4: 100 − 50
  'mouse:up:150:100' // 11 B7
];

/** Board Desk · Card · Drag X · Drag Y · Delta X · Delta Y · status · the wrapper's transform. */
const row = (x: number, y: number, dx: number, dy: number, status: string, tx: number, ty: number): string[] => [
  'Board Desk',
  'Card',
  String(x),
  String(y),
  String(dx),
  String(dy),
  status,
  `transform=translate(${tx}px,${ty}px)`
];
const EXPECTED: Array<string[] | undefined> = [
  row(20, 20, 0, 0, '', 20, 20),
  row(20, 20, 0, 0, 'dragging', 20, 20),
  row(50, 30, 30, 10, 'dragging', 50, 30),
  row(240, 30, 190, 0, 'dragging', 240, 30),
  row(240, 30, 0, 0, 'dragging', 240, 30),
  row(240, 30, 0, 0, 'released', 240, 30),
  row(240, 30, 0, 0, 'released', 240, 30),
  undefined, // mid-tween: where a frame has landed is the clock's, not the export's (only the status is read, §B2)
  row(100, 0, 0, 0, 'snapped', 100, 0),
  row(100, 0, 0, 0, 'dragging', 100, 0),
  row(50, 0, -50, 0, 'dragging', 50, 0),
  row(50, 0, -50, 0, 'released', 50, 0)
];
const STATUS = 6;

const reactReadings = (): string[][] => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-desk-react-'));
  for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
        input: JSON.stringify([{ dir, scenarios: [STEPS], settled: true, dragLayout: LAYOUT }]),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 16 * 1024 * 1024
      })
    )[0][0];
  } catch (e) {
    return [[`the React arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
  }
};

describe('§A a Drag on the Board Desk, in both exports', () => {
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromReact = reactReadings();
    fromHtml = (await htmlArm(html.files, [STEPS], { dragLayout: LAYOUT }))[0];
  }, 300000);

  it('A0. nothing on the desk is left out, and the page carries the drag machine, the tween and the error channel', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
    expect(Object.keys(html.files).filter((f) => f.startsWith('lib/'))).toEqual(['lib/animate.js', 'lib/core.js', 'lib/dom.js', 'lib/drag.js', 'lib/errors.js', 'lib/router.js']);
  });

  it('A1. the React export reads the prediction at every step', () => {
    expect(fromReact.length).toBe(STEPS.length + 1);
    EXPECTED.forEach((want, i) => {
      if (want === undefined) expect(fromReact[i][STATUS]).toBe('snapped');
      else expect(fromReact[i]).toEqual(want);
    });
  });

  it('A2. the HTML export reads what the React export reads, at every step but mid-tween, and the same status there', () => {
    EXPECTED.forEach((want, i) => {
      if (want === undefined) expect(fromHtml[i][STATUS]).toBe(fromReact[i][STATUS]);
      else expect(fromHtml[i]).toEqual(fromReact[i]);
    });
  });
});

describe('§B the printed page and its library', () => {
  const home = html.files['pages/Home.js'];

  it('B1. lib/drag.js is React\'s drag.ts with its types out and the hook cut off, made again from its source', () => {
    expect(DRAG_JS).toBe(htmlDragJs());
    expect(DRAG_JS).not.toMatch(/from 'react'|useRef|useState|useEffect\(/);
    expect(html.files['lib/drag.js']).toBe(DRAG_JS);
  });

  it('B2. the handle is made above the drawing, as React calls the hook above its render; the options are read again, the listeners are its chains', () => {
    const made = home.indexOf("const card = dragNode(l, cardElement, { label: 'Card', nodeId: 'drag', componentName: '/Pages/Home' }, function () {");
    expect(made).toBeGreaterThan(0);
    expect(made).toBeLessThan(home.indexOf("const page = el(element, 'div'"));
    expect(home).toContain("return { axis: 'both', startX: 20, startY: 20, snapX: variables.homeX.get(), snapXDuration: 200, snapY: 0 };");
    expect(home).toMatch(/onStart: function \(\) \{\n\s+variables\.status\.set\('dragging'\);/);
  });

  it('B3. the wrapper is put where the Drag sits, its child inside; the reads are the getters; the snaps are calls on the handle', () => {
    expect(home).toContain('board.insertBefore(cardElement, null);');
    expect(home).toContain("const cardEl = el(cardElement, 'div', 'HomePage-card');");
    expect(home).toContain('bindText(l, xText, function () { return card.x; });');
    expect(home).toContain("card.snapTo('x');\n    card.snapTo('y');");
  });
});

describe('§C a mutant on the live getters', () => {
  it('C1. a Drag X that does not read the tick is read once: the page stops following the drag (killed)', async () => {
    const getter = /get x\(\) \{\n\s*tick\.get\(\);\n/;
    expect(DRAG_JS).toMatch(getter);
    const mutant = { ...html.files, 'lib/drag.js': DRAG_JS.replace(getter, 'get x() {\n') };
    const readings = (await htmlArm(mutant, [STEPS.slice(0, 3)], { dragLayout: LAYOUT }))[0];
    // Drag Y still follows (its getter reads the tick); Drag X stays at its first reading.
    expect(readings[2][3]).toBe('30');
    expect(readings[2][2]).toBe('20');
  }, 120000);
});

/*
 * §D — a Repeat in plain files (GAM-013; bot-garden's two beats, the island's and the Runner's). React's `repeat.ts` with
 * its types out and `useRepeat` cut off (`lib/repeat.js`, generated); `repeatNode` hosts the beat for the part's life.
 * Graded on React's Beat Desk (`fixtures/beat-desk`: Start, Stop, Count into a Text, a Counter on Tick into another, the
 * outcome into a third), copied with its page at Home, where the arms look, and its Interval 200 ms instead of 1000, so
 * every wait below ends 100 ms away from a tick on either side.
 */
const writeBeatHomeDesk = (): string => {
  const from = path.join(__dirname, 'fixtures', 'beat-desk');
  const at = fs.mkdtempSync(path.join(os.tmpdir(), 'beat-home-desk-'));
  const copy = (src: string, to: string): void => {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const name = entry.name === 'Beat' ? 'Home' : entry.name;
      if (entry.isDirectory()) {
        fs.mkdirSync(path.join(to, name), { recursive: true });
        copy(path.join(src, entry.name), path.join(to, name));
      } else {
        const text = fs.readFileSync(path.join(src, entry.name), 'utf-8').replace(/Pages\/Beat/g, 'Pages/Home').replace(/"interval": 1000/g, '"interval": 200');
        fs.writeFileSync(path.join(to, name), text);
      }
    }
  };
  copy(from, at);
  return at;
};

describe('§D a Repeat on the Beat Desk, in both exports', () => {
  const beatIr = parseProject(writeBeatHomeDesk(), catalog);
  const beatHtml = emitHtmlApp(beatIr, catalog);
  const BEAT_STEPS = ['Start', 'wait:500', 'Start', 'Stop', 'wait:500', 'Stop', 'Start', 'wait:300', 'Stop'];
  /** Beat Desk · Count · the Counter · the last outcome; predicted from repeat.ts's rules (GAM-013 §A) before either arm ran. */
  const BEAT_EXPECTED = [
    ['Beat Desk', '0', '0', ''],
    ['Beat Desk', '0', '0', 'Done'], // Start: a beat begins
    ['Beat Desk', '2', '2', 'Done'], // ticks at 200 and 400: Count, then Tick (the Counter)
    ['Beat Desk', '2', '2', 'Unchanged'], // Start while one runs
    ['Beat Desk', '2', '2', 'Done'], // Stop: Count kept
    ['Beat Desk', '2', '2', 'Done'], // stopped: nothing ticks
    ['Beat Desk', '2', '2', 'Unchanged'], // Stop with none running
    ['Beat Desk', '0', '2', 'Done'], // Start again: Count reset, the Counter is its own
    ['Beat Desk', '1', '3', 'Done'], // one tick at 200
    ['Beat Desk', '1', '3', 'Done'] // Stop
  ];
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beat-desk-react-'));
    for (const [file, text] of Object.entries(emitApp(beatIr, catalog).files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
    try {
      fromReact = JSON.parse(
        execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
          input: JSON.stringify([{ dir, scenarios: [BEAT_STEPS], settled: true }]),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 180000,
          maxBuffer: 16 * 1024 * 1024
        })
      )[0][0];
    } catch (e) {
      fromReact = [[`the React arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
    }
    fromHtml = (await htmlArm(beatHtml.files, [BEAT_STEPS]))[0];
  }, 300000);

  it('D0. nothing on the desk is left out; the page carries the beat and the error channel, not the timer', () => {
    expect(beatHtml.preflight.htmlLosses).toEqual([]);
    expect(Object.keys(beatHtml.files).filter((f) => f.startsWith('lib/'))).toEqual(['lib/core.js', 'lib/dom.js', 'lib/errors.js', 'lib/repeat.js', 'lib/router.js']);
  });

  it('D1. the React export reads the prediction at every step', () => {
    expect(fromReact).toEqual(BEAT_EXPECTED);
  });

  it('D2. the HTML export reads what the React export reads at every step', () => {
    expect(fromHtml).toEqual(fromReact);
  });

  it('D3. lib/repeat.js is React\'s repeat.ts with its types out and the hook cut off, made again from its source', () => {
    expect(REPEAT_JS).toBe(htmlRepeatJs());
    expect(REPEAT_JS).not.toMatch(/from 'react'|useReducer|useRef|useEffect\(/);
  });

  it('D4. a Count that does not read what the beat publishes stays at 0 (killed)', async () => {
    const getter = /get count\(\) \{\n\s*published\.get\(\);\n/;
    expect(REPEAT_JS).toMatch(getter);
    const mutant = { ...beatHtml.files, 'lib/repeat.js': REPEAT_JS.replace(getter, 'get count() {\n') };
    const readings = (await htmlArm(mutant, [BEAT_STEPS.slice(0, 2)]))[0];
    expect(readings[2][1]).toBe('0');
    expect(readings[2][2]).toBe('2');
  }, 120000);
});

/*
 * §E — the three smaller gaps of session 13, each React's rule copied: a Close Popup is the host's close (`onClose`,
 * POPUPS-TARGET; landing-pages' CaseStudy, Close and the backdrop), a Fetch into a query the export does not keep is no
 * step (P18-S116-QUERYFETCH; nightbook's three data parts), and a For Each whose row the plan skips says so, not that its
 * items are unread (marketplace, digital-bricks-training-demo; React defers the same rows, "exports no component").
 */
describe('§E Close Popup, an unkept Fetch, a skipped row', () => {
  const TEMPLATES = path.join(__dirname, '..', '..', '..', 'templates');
  const landing = emitHtmlApp(parseProject(path.join(TEMPLATES, 'landing-pages'), catalog), catalog);

  const mountCaseStudy = async (withClose: boolean): Promise<{ calls: unknown[]; window: any }> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { JSDOM } = require('jsdom') as { JSDOM: new (html: string, options?: unknown) => any };
    const { bundleApp } = await import('./helpers/html-in-jsdom');
    const entry = [
      "import { mountCaseStudy } from './components/CaseStudy.js';",
      'window.__calls = [];',
      `mountCaseStudy(document.getElementById('app'), ${withClose ? '{ onClose: function (how) { window.__calls.push(how); } }' : '{}'});`
    ].join('\n');
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(await bundleApp({ ...landing.files, '__entry.js': entry }, '__entry.js'));
    return { calls: dom.window.__calls, window: dom.window };
  };

  it('E1. shown by a host that hands it a close, Close and the backdrop call it with "close", as React\'s onClose?.(\'close\')', async () => {
    const { calls, window } = await mountCaseStudy(true);
    const close = [...window.document.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Close');
    close.click();
    // P134-S13-CLICKBUBBLES fixed (R9): Close keeps its click, so the backdrop that holds it does not run too — once, as the app.
    expect(calls).toEqual(['close']);
    window.document.querySelector('.CaseStudy-csBackdrop').click();
    expect(calls).toEqual(['close', 'close']);
  });

  it('E2. drawn as a plain part, with no close handed to it, a press does nothing and throws nothing', async () => {
    const { calls, window } = await mountCaseStudy(false);
    const close = [...window.document.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Close');
    expect(() => close.click()).not.toThrow();
    expect(calls).toEqual([]);
  });

  it('E3. nightbook: the load chains print, the Fetch into an unkept query no step, and nothing is left out for it', () => {
    const night = emitHtmlApp(parseProject(path.join(TEMPLATES, 'nightbook'), catalog), catalog);
    expect(night.preflight.htmlLosses.filter((l) => /Fetch/.test(l.what))).toEqual([]);
    expect(night.files['components/Keep.js']).toContain('// the Fetch of "Everything she kept": nothing here reads its rows, so it asks for nothing (as in the React export).');
  });

  it('E4. a For Each whose row the plan skips names the row and the plan\'s reason', () => {
    const market = emitHtmlApp(parseProject(path.join(TEMPLATES, 'marketplace'), catalog), catalog);
    expect(market.preflight.htmlLosses.map((l) => l.what)).toContain('a For Each not drawn: its row /Admin/WayToggle exports no component (no visual root — logic-only components defer to EXP-003), as in the React export');
  });
});
