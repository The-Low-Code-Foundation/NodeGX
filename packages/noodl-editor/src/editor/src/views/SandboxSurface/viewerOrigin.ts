/**
 * Where the editor serves the running app.
 *
 * ⚠️ **Its own module, extracted by BLD-014, and the reason is the test runner.**
 * This used to live in `useSandboxViewer.ts`, which imports React and
 * `ViewerConnection` — so anything needing the origin inherited a React
 * dependency. `tests-unit/` is a plain-Node runner by design (no React, no
 * Electron, no editor singletons), and the CDP producer's rules — which URL is
 * external, which viewport was asked for — are exactly the kind of pure logic
 * that belongs there. One import of a hook would have put all of it out of
 * reach.
 *
 * 🔴 **HLT-021 — this is the renderer's ONLY reader of the web server's port.**
 * It used to be `process.env.NOODLPORT || 8574`, copied into five places. That
 * reads the port that was *requested*, and with `NOODLPORT=0` ("any free port",
 * which a harness and a second editor both use) the request is not the answer:
 * main writes the bound port back to its own `process.env`, but this process's
 * env was copied when the window was created, before the server bound. So the
 * renderer read `'0'` — and `|| 8574` never fired, because `'0'` is a non-empty
 * string. The preview dialled `ws://localhost:0/` 28 times in one drive.
 *
 * So the bound port is asked of main, the route `getContentEndpoint` already
 * uses, and it is asked **at call time**: a module-scope `const` evaluates when
 * the bundle loads, which can be before `listening` fires.
 *
 * @module noodl-editor/views/SandboxSurface/viewerOrigin
 */

/** The main-process global `web-server.js` sets on `listening`. */
export const BOUND_PORT_GLOBAL = 'noodlBoundPort';

/** Files under `editor/src` allowed to read `process.env.NOODLPORT` — this one, for the fallback. */
export const NOODLPORT_READERS = ['views/SandboxSurface/viewerOrigin.ts'];

const DEFAULT_PORT = 8574;

/**
 * The port to use, given what main reports as bound and what this process was asked for.
 *
 * Bound wins. Without it — outside Electron, or before the server has bound — the request is
 * used as it was, `'0'` included: nothing is listening yet, and 8574 could be another editor's
 * server, which would be a quiet wrong answer where `:0` is a loud one.
 */
export function resolveViewerPort(bound: unknown, requested: string | undefined): number {
  if (typeof bound === 'number' && Number.isInteger(bound) && bound > 0) return bound;
  if (requested === undefined || requested === '') return DEFAULT_PORT;
  return Number(requested);
}

function readBoundPort(): unknown {
  try {
    // Deferred: a module-scope require would take `tests-unit/`, where there is no Electron, down
    // with every suite that imports this file.
    return require('@electron/remote').getGlobal(BOUND_PORT_GLOBAL);
  } catch {
    return undefined;
  }
}

export function viewerPort(): number {
  return resolveViewerPort(readBoundPort(), process.env.NOODLPORT);
}

export function viewerOrigin(): string {
  const protocol = process.env.ssl ? 'https://' : 'http://';
  return `${protocol}localhost:${viewerPort()}`;
}
