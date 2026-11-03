/**
 * P134. An HTML export's folder, run in jsdom: `index.html`'s body, then `app.js` with every module it imports, read
 * from the export's own files and nowhere else.
 *
 * jsdom does not load `<script type="module">`, so esbuild joins `app.js` and what it imports into one script, resolving
 * each import against the export's `files` only: an import of anything outside the folder (a package, a file the export
 * did not write) fails the load. Nothing is transformed beyond the joining; the code that runs is the code a browser
 * gets.
 */

import * as path from 'path';
import * as esbuild from 'esbuild';

export interface HtmlPage {
  window: any;
  document: any;
  /** Waits for the effects queued by the last change to have run (the core flushes on a microtask). */
  settle(): Promise<void>;
  /** The visible text of the app's root, whitespace collapsed. */
  text(): string;
  close(): void;
}

/** The export's `app.js` and its imports as one script, every import resolved inside `files`. */
export async function bundleApp(files: Record<string, string>, entry = 'app.js'): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    write: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'the-export-folder',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind === 'entry-point') return { path: args.path, namespace: 'export' };
            if (!args.path.startsWith('.')) return { errors: [{ text: `${args.importer} imports "${args.path}", which is not a file in the export` }] };
            const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(args.importer), args.path));
            if (!(resolved in files)) return { errors: [{ text: `${args.importer} imports "${args.path}", which the export did not write` }] };
            return { path: resolved, namespace: 'export' };
          });
          build.onLoad({ filter: /.*/, namespace: 'export' }, (args) => ({ contents: files[args.path], loader: 'js' }));
        }
      }
    ]
  });
  return result.outputFiles[0].text;
}

/** `stored`: what the browser's storage holds before the page loads (a reload's leavings: the arms' `storage.seeds`). */
export async function openHtmlExport(files: Record<string, string>, hash = '', stored: Record<string, string> = {}): Promise<HtmlPage> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM, VirtualConsole } = require('jsdom') as { JSDOM: new (html: string, options?: unknown) => any; VirtualConsole: new () => any };
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e: Error) => {
    // jsdom draws nothing, so it has no scrolling: the router's scroll to the top is a no-op there.
    if (!/Not implemented: window\.scrollTo/.test(e.message)) errors.push(e.message);
  });
  virtualConsole.on('error', (...args: unknown[]) => errors.push(args.map(String).join(' ')));
  const dom = new JSDOM(files['index.html'].replace(/<script type="module"[^>]*><\/script>/, ''), {
    url: `http://localhost/index.html${hash}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });
  for (const [k, text] of Object.entries(stored)) dom.window.localStorage.setItem(k, text);
  dom.window.eval(await bundleApp(files));
  const settle = async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => dom.window.setTimeout(r, 0));
    if (errors.length > 0) throw new Error(`the page reported: ${errors.join('; ')}`);
  };
  await settle();
  return {
    window: dom.window,
    document: dom.window.document,
    settle,
    text: () => (dom.window.document.getElementById('app').textContent as string).replace(/\s+/g, ' ').trim(),
    close: () => dom.window.close()
  };
}
