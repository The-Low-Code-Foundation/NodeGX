/**
 * P112-S4-TRACEARM — the preview arms the runtime's trace at the moment the app's runtime exists, before the project
 * loads, so the values a run sends once at its start (a Number's value) are in the record.
 *
 * Before the fix the preview armed the trace from outside the frame, polling for the runtime every 10 ms, and on Orbit
 * (prototype/real/check.mjs) 2 of 36 wires were missing from the trace in about one page load in eight. That race is
 * not reproducible on demand; what IS deterministic is the property the fix rests on: in the app's own page, the trace
 * is on when `Noodl.Navigation._noodlRuntime` is assigned — the Viewer's constructor, before `setData`
 * (noodl-viewer-react `viewer.jsx`) — and the page behaves as before for everything else that reads those names.
 * Without the fix there is no script, and the first assertion below fails.
 */
import vm from 'vm';

import { ARM_TRACE, TRACE_OWNER, armed } from '../src/inPage/armTrace';

/** Runs the page's scripts in order in one fresh window, the way the deploy page does. */
function boot(html: string) {
  const window: Record<string, unknown> = {};
  const context = vm.createContext({ window });
  window.window = window;
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(m[1], context);
  return { window: window as TSFixme, context };
}

/** The deploy template's own bootstrap (`external/deploy/index.js`) and the two lines `createNoodlAPI` runs. */
const DEPLOY = `<!DOCTYPE html><html><head><title>t</title></head><body><div id="root"></div>
<script>window.Noodl = { deployed: true, Env: {} };</script>
<script>window.__boot = function (runtime, navigation) {
  window.Noodl.Navigation = navigation;
  window.Noodl.Navigation._noodlRuntime = runtime;
  runtime.loaded = true;   // setData: from here the app's nodes send their first values
};</script></body></html>`;

function fakeRuntime() {
  const calls: { enabled: boolean; owner: string; loadedYet: boolean }[] = [];
  const runtime = {
    loaded: false,
    context: { setTraceEnabled: (enabled: boolean, owner: string) => calls.push({ enabled, owner, loadedYet: runtime.loaded }) }
  };
  return { runtime, calls };
}

describe('P112-S4-TRACEARM — the trace is on before the app loads', () => {
  it('arms the trace when the runtime is published, before the project is loaded', () => {
    const { window } = boot(armed(DEPLOY));
    const { runtime, calls } = fakeRuntime();
    const navigation = { navigate() {} };
    window.__boot(runtime, navigation);
    expect(calls).toEqual([{ enabled: true, owner: TRACE_OWNER, loadedYet: false }]);
  });

  it('changes nothing else: every name reads back what was assigned', () => {
    const { window } = boot(armed(DEPLOY));
    const { runtime } = fakeRuntime();
    const navigation = { navigate() {} };
    window.__boot(runtime, navigation);
    expect(window.Noodl.deployed).toBe(true);
    expect(window.Noodl.Navigation).toBe(navigation);
    expect(window.Noodl.Navigation._noodlRuntime).toBe(runtime);
    expect(Object.keys(window.Noodl)).toEqual(expect.arrayContaining(['deployed', 'Env', 'Navigation']));
  });

  it('is the first thing in the head, so it runs before any of the page’s own scripts', () => {
    const page = armed(DEPLOY);
    expect(page.indexOf(ARM_TRACE)).toBe(page.indexOf('<head>') + '<head>'.length);
    expect(page.indexOf(ARM_TRACE)).toBeLessThan(page.indexOf('window.Noodl = '));
  });

  it('a runtime that throws when armed still loads (the app is never the price of the record)', () => {
    const { window } = boot(armed(DEPLOY));
    const runtime = { loaded: false, context: { setTraceEnabled: () => { throw new Error('no trace here'); } } };
    expect(() => window.__boot(runtime, {})).not.toThrow();
    expect(runtime.loaded).toBe(true);
  });
});
