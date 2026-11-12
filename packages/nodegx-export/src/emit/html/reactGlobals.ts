/**
 * P134 session 13, Richard's R8 (2026-11-04: "A little React just to run the kits is totally justifiable"). A kit node is
 * its author's own React component, so an HTML export that uses one carries React: the two global builds the running
 * app's deploy loads (`noodl-viewer-react/static/shared-react19`, React 19, `window.React` and `window.ReactDOM`), written
 * into `lib/vendor/` and loaded by `index.html` before the app. An app with no kit node carries none of it.
 *
 * Two places are tried, as `catalogPath` tries them: the copy `build.mjs` puts beside the bundle (`dist/react19`), and the
 * viewer's own files in this repo.
 *
 * @module emit/html/reactGlobals
 */

import * as fs from 'fs';
import * as path from 'path';

/** Where an app finds them, in the order `index.html` loads them. */
export const REACT_GLOBAL_PATHS = ['lib/vendor/react.production.min.js', 'lib/vendor/react-dom.production.min.js'] as const;

export function reactGlobalsDir(): string {
  const packaged = path.join(__dirname, 'react19');
  const inRepo = path.join(__dirname, '..', '..', '..', '..', 'noodl-viewer-react', 'static', 'shared-react19');
  for (const candidate of [packaged, inRepo]) if (fs.existsSync(path.join(candidate, 'react.production.min.js'))) return candidate;
  throw new Error(`React's global builds could not be found. Looked for the packaged copy at ${packaged} and the in-repo files at ${inRepo}. If this is a built package, \`npm run build\` did not copy them.`);
}

/** The two files, by the path the app loads them from. */
export function reactGlobalFiles(): Record<string, string> {
  const dir = reactGlobalsDir();
  return Object.fromEntries(REACT_GLOBAL_PATHS.map((p) => [p, fs.readFileSync(path.join(dir, path.basename(p)), 'utf8')]));
}
