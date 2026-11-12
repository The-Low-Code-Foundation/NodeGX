/**
 * P112 OWN-004 — the real app, beside a home-made editor, from files held in memory.
 *
 * ```js
 * const preview = await NodegxPreview.mountPreview(element, { runtimeBase: '/runtime/' });
 * preview.onTrace(({ dictionary, events }) => lightTheWires(events));
 * await preview.update(store.files.entries());   // after every write through the store
 * ```
 *
 * `runtimeBase` is where a deploy folder's runtime is served from: `index.html`, `index.js`,
 * `noodl.deploy.js` and the React pair (`npm run build:editor:_viewer` writes them to
 * `packages/noodl-editor/src/external/deploy/`). No editor and no server of ours is involved.
 *
 * **Each update is a fresh deployed page in a fresh frame**, built by the deploy's own template and
 * `HtmlProcessor` with the export inlined, and written into a blank frame (see `makeFrame`). The CLI reloads its page for the same reason: a deployed
 * runtime has no teardown, so rendering a second project into the same document would leave the first
 * one's timers running and writing into the same global variables. The editor's page never reloads;
 * the new frame replaces the old one once its runtime is up, so the swap does not flash.
 *
 * **Live values** come from the runtime's own trace (OBS-001), the record `nodegx-observe` reads over
 * the editor's relay: armed on each new frame under this preview's owner name, read every
 * `traceIntervalMs`, and handed over as they are — every value or signal that crossed a wire, named by
 * node id and port, with the session dictionary (each node's type and component) whenever it changes.
 *
 * @module noodl-preview/inPage
 */

import { injectIntoTemplate } from '@nodegx/module-inject';

import type { PreviewReport } from '../validate';
import { pageFromFiles, type DeployTemplate, type InPagePage } from './exportInPage';
import { armed, TRACE_OWNER } from './armTrace';
import { drawnElements } from './drawnElements';
import { kitTags } from './kits';

export { exportInPage, importInputFromFiles, pageFromFiles } from './exportInPage';
// The format's store and in-memory files (OWN-001), so one script holds, writes and shows a project.
export { V2ProjectStore, memoryFiles, FormatRefusal } from '@nodegx/project-contract/format';
export type { DeployTemplate, InPageLoad, InPagePage } from './exportInPage';

/** One value or signal crossing one wire — `TraceBuffer`'s event, unchanged. */
export interface TraceEvent {
  seq: number;
  t: number;
  cause: number;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
  /** A preview of the value, capped by the runtime (`previewValue`). */
  value: string;
  kind: 'value' | 'signal';
}

/** `NodeContext.buildSessionDictionary()`: every live node and every wire between them. */
export interface SessionDictionary {
  nodes: Record<string, { name: string; type: string; component: string }>;
  edges: { from: { node: string; port: string }; to: { node: string; port: string } }[];
}

export interface TraceBatch {
  /** Present when the set of live nodes or wires changed since the last batch (a page opened, a row was added). */
  dictionary?: SessionDictionary;
  events: TraceEvent[];
}

export type PreviewStatus =
  /**
   * `report` is the validation a good build passed (warnings and info only; an error stops the build). P112-OWN020: an
   * editor beside the app (Studio) shows a person its layout warnings from it, which `warnings` (the export's own
   * sentences) does not carry.
   */
  | { status: 'ok'; warnings: string[]; report: PreviewReport; exportMs: number; frameMs: number }
  | Exclude<InPagePage, { status: 'ok' }>;

export interface PreviewOptions {
  /** Where the deploy runtime is served from; a trailing `/` is added when missing. */
  runtimeBase: string;
  /** How often the runtime's trace is read. Default 150 ms. */
  traceIntervalMs?: number;
  /** How long a frame may take to start its runtime before the update is reported failed. Default 20 s. */
  frameTimeoutMs?: number;
}

export interface Preview {
  /** Renders this snapshot. Resolves once it is on screen, or with why it is not (the last good one stays). */
  update(files: Record<string, string>): Promise<PreviewStatus>;
  /** Every batch of live values from now on. Returns the unsubscribe. */
  onTrace(listener: (batch: TraceBatch) => void): () => void;
  /** The frame on screen, for a test or a screenshot. */
  readonly frame: HTMLIFrameElement | null;
  /**
   * What the runtime says every node type is — its ports, types and docs, the JSON `getNodeLibrary()`
   * sends the editor, with the last update's kits loaded (`undefined` before the first update). The export
   * reads it; a home-made editor's node picker can too.
   */
  readonly nodeLibrary: unknown;
  /**
   * The elements a visual node draws in the app on screen, by its id in the project's files (the trace's
   * `fromNode` / `toNode`). More than one when the node is inside a component placed several times or a
   * repeated row; none for a node that draws nothing (logic) or is not mounted. What lets a home-made editor
   * point from a card to the part of the screen it makes. For a copy of a component, the elements its roots draw.
   */
  elementsOf(nodeId: string): HTMLElement[];
  dispose(): void;
}


/**
 * The smallest project the runtime will render: one Group. It is rendered hidden, with the project's kits, on
 * the first update and whenever the kits change, for one reason — the runtime registers its node types when its viewer is constructed, and the export
 * needs them before the real project can be exported. Reading them from the runtime the page will
 * use (rather than shipping a copy) is what keeps the two in step.
 */
const BOOT_PROJECT = {
  settings: {},
  components: [
    {
      name: '/App',
      nodes: [{ id: 'boot', type: 'Group', parameters: {}, ports: [], children: [] }],
      connections: [],
      ports: [],
      roots: ['boot'],
      metadata: {}
    }
  ],
  componentIndex: {},
  routerIndex: { routers: [], pages: [] },
  rootComponent: '/App',
  rootNode: 'boot',
  metadata: {},
  variants: []
};

type FrameWindow = Window & { Noodl?: { Navigation?: { _noodlRuntime?: TSFixme } } };

const runtimeOf = (frame: HTMLIFrameElement): TSFixme =>
  (frame.contentWindow as FrameWindow | null)?.Noodl?.Navigation?._noodlRuntime;

function waitFor<T>(read: () => T | undefined, timeoutMs: number, what: string): Promise<T> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let value: T | undefined;
      try {
        value = read();
      } catch {
        value = undefined;
      }
      if (value) return resolve(value);
      if (performance.now() - started > timeoutMs) return reject(new Error(`Timed out after ${timeoutMs} ms waiting for ${what}.`));
      setTimeout(tick, 10);
    };
    tick();
  });
}

/**
 * A frame holding `html` as its document.
 *
 * Written into a blank frame with `document.write`, not given as `srcdoc`: a `srcdoc` document's URL is
 * `about:srcdoc`, where the browser allows `history.pushState` to change only the `#` part — and a
 * Router on path navigation pushes `/sign-in`, which throws there (measured on the todo template: its
 * first redirect failed). A document written by `document.open` takes this page's own http(s) URL, so
 * path navigation works as it does when the app is deployed.
 */
function makeFrame(container: HTMLElement, html: string, hidden: boolean): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'App preview');
  // Hidden by stacking, not `display: none`: a frame that is not rendered gets no animation frames,
  // and the runtime schedules its updates on them.
  frame.style.cssText = `position:absolute;inset:0;width:100%;height:100%;border:0;background:white;${
    hidden ? 'visibility:hidden;' : ''
  }`;
  container.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) throw new Error('The preview frame has no document.');
  doc.open();
  doc.write(html);
  doc.close();
  return frame;
}

async function readTemplate(baseUrl: string): Promise<DeployTemplate> {
  const read = async (file: string) => {
    const response = await fetch(baseUrl + file);
    if (!response.ok) throw new Error(`${baseUrl + file} answered ${response.status}: the deploy runtime is not served there.`);
    return response.text();
  };
  const [html, indexJs] = await Promise.all([read('index.html'), read('index.js')]);
  return { html, indexJs, baseUrl };
}

/** The boot page: the template with the project's kits and nothing else of it but `BOOT_PROJECT`. */
function bootPage(template: DeployTemplate, files: Record<string, string>): string {
  const indexJs = template.indexJs.replace(/{{#export#}}/g, () => JSON.stringify(BOOT_PROJECT));
  return injectIntoTemplate(template.html, kitTags(files, template.baseUrl))
    .replace('{{#title#}}', 'boot')
    .replace('{{#customHeadCode#}}', '')
    .replace(/%baseUrl%/g, template.baseUrl)
    .replace(/<%modules_[a-z_]+%>/g, '')
    .replace('<%index_js%>', () => `<script>${indexJs}</script>`);
}

export async function mountPreview(container: HTMLElement, options: PreviewOptions): Promise<Preview> {
  const baseUrl = options.runtimeBase.endsWith('/') ? options.runtimeBase : options.runtimeBase + '/';
  const traceIntervalMs = options.traceIntervalMs ?? 150;
  const frameTimeoutMs = options.frameTimeoutMs ?? 20_000;

  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const template = await readTemplate(baseUrl);

  /**
   * The node library, read from a boot page carrying the project's kits: a kit's node types are only known once
   * its script has run, and the export needs them. Booted again when the kit files change, never otherwise.
   */
  let nodeLibrary: unknown;
  let bootedKits: string | undefined;
  async function libraryFor(files: Record<string, string>): Promise<unknown> {
    const kits = kitTags(files, baseUrl).key;
    if (nodeLibrary !== undefined && kits === bootedKits) return nodeLibrary;
    const boot = makeFrame(container, bootPage(template, files), true);
    try {
      const runtime = await waitFor(() => runtimeOf(boot), frameTimeoutMs, 'the runtime to register its nodes');
      nodeLibrary = JSON.parse(runtime.getNodeLibrary());
      bootedKits = kits;
      return nodeLibrary;
    } finally {
      boot.remove();
    }
  }

  let current: HTMLIFrameElement | null = null;
  let pump: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<(batch: TraceBatch) => void>();
  let pending = Promise.resolve() as Promise<unknown>;

  function watch(runtime: TSFixme): void {
    if (pump) clearInterval(pump);
    const context = runtime.context;
    context.setTraceEnabled(true, TRACE_OWNER);
    let lastSeq = 0;
    let shape = '';
    pump = setInterval(() => {
      if (listeners.size === 0) return;
      const events: TraceEvent[] = context.getTraceEvents(lastSeq);
      const dictionary: SessionDictionary = context.buildSessionDictionary();
      const nextShape = `${Object.keys(dictionary.nodes).length}/${dictionary.edges.length}`;
      const changed = nextShape !== shape;
      if (!changed && events.length === 0) return;
      shape = nextShape;
      if (events.length) lastSeq = events[events.length - 1].seq;
      const batch: TraceBatch = changed ? { dictionary, events } : { events };
      for (const listener of listeners) listener(batch);
    }, traceIntervalMs);
  }

  async function show(files: Record<string, string>): Promise<PreviewStatus> {
    let library: unknown;
    try {
      library = await libraryFor(files);
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : String(err) };
    }
    const t0 = performance.now();
    const page = await pageFromFiles(files, library, template);
    const exportMs = performance.now() - t0;
    if (page.status !== 'ok') return page;

    const t1 = performance.now();
    const next = makeFrame(container, armed(page.html), true);
    let runtime: TSFixme;
    try {
      runtime = await waitFor(() => runtimeOf(next), frameTimeoutMs, 'the app to start');
      // Armed before the app draws, so the values its first render sends are in the record.
      watch(runtime);
      // On screen means the root component exists and the page has drawn into #root.
      await waitFor(
        () => runtime.context.rootComponent && next.contentDocument?.getElementById('root')?.childElementCount,
        frameTimeoutMs,
        'the app to draw'
      );
    } catch (err) {
      next.remove();
      if (current) {
        const previous = runtimeOf(current);
        if (previous) watch(previous);
      }
      return { status: 'error', message: err instanceof Error ? err.message : String(err) };
    }
    const frameMs = performance.now() - t1;

    next.style.visibility = '';
    current?.remove();
    current = next;
    return { status: 'ok', warnings: page.warnings, report: page.report, exportMs, frameMs };
  }

  return {
    update(files) {
      // One at a time, in order: a slow export must not land after a newer one.
      const run = pending.then(() => show(files));
      pending = run.catch(() => undefined);
      return run;
    },
    onTrace(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get frame() {
      return current;
    },
    get nodeLibrary() {
      return nodeLibrary;
    },
    elementsOf(nodeId) {
      const root = current ? runtimeOf(current)?.context?.rootComponent : undefined;
      if (!root) return [];
      // A copy of a component draws through its roots (P123-STU031-COPYBOX).
      return drawnElements(root.nodeScope.getNodesWithIdRecursive(nodeId) as TSFixme[]);
    },
    dispose() {
      if (pump) clearInterval(pump);
      listeners.clear();
      current?.remove();
      current = null;
    }
  };
}
