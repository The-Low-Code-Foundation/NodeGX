/**
 * P134. `nodegx export --target html`: the same IR, the same plan, a third printer, and a folder of plain files.
 *
 * `emitHtmlApp` reads what `emitApp` and `emitSwiftApp` read — `planProject(ir, catalog)` and the shared style layer —
 * and writes HTML, CSS and JavaScript that a static server serves as they are: no framework, no npm, no build step. It
 * is pure, as the other two are: path → text, plus the project files to copy (the fonts), and the caller writes.
 * `HtmlPreflight` is its *before you export* page: the plan's own refusals (the same ones the React export counts) and
 * what this printer reads in the plan and does not print yet, by node and in a sentence.
 *
 * | file | what |
 * |---|---|
 * | `index.html` | the page shell, the stylesheets, one `<script type="module" src="app.js">` |
 * | `app.js` | the pages and the one the app opens on |
 * | `pages/<Name>.js`, `components/<Name>.js` | one ES module per component, `mount<Name>(element, inputs, before)` |
 * | `pages/<Name>.css`, `components/<Name>.css` | its look, from `computeNodeStyle` |
 * | `styles/theme.css`, `styles/base.css` | the project's tokens as custom properties, and the body's floor |
 * | `styles/app.css` | the app shell's CSS Definitions, verbatim |
 * | `lib/core.js`, `lib/dom.js`, `lib/router.js` | the small library every export carries (R1) |
 *
 * @module emit/html/emitHtml
 */

import type { ExportIR } from '../../ir/types';
import { type Catalog, CatalogIndex } from '../../catalog';
import { planProject, type ProjectPlan } from '../../analyze/plan';
import { baseCss, moduleStylesheetLinks, routedPages, tokensCss } from '../scaffold';
import { emitKits } from '../kits';
import { emitApp } from '../emitApp';
import { clientFilesEsm } from './client';
import { CORE_JS } from './coreJs';
import { FUNCTION_RUN_JS } from './functionRunJs';
import { COMPONENT_SCOPE_JS } from './componentScopeJs';
import { TIMER_JS } from './timerJs';
import { DRAG_JS } from './dragJs';
import { REPEAT_JS } from './repeatJs';
import { KITS_JS } from './kitsJs';
import { REACT_GLOBAL_PATHS, reactGlobalFiles } from './reactGlobals';
import { UTIL_JS } from './utilJs';
import { projectScriptsFiles } from './projectScripts';
import { PERSIST_STORE_JS } from './persistStoreJs';
import { ANIMATE_JS, STATES_JS } from './statesJs';
import { DOM_JS, ROUTER_JS } from './libJs';
import { js, mountNameOf, printComponent, type HtmlLoss } from './printComponent';

export interface HtmlPreflight {
  appName: string;
  /** The components drawn, as their mount functions. */
  components: string[];
  /** The logic components (React's hooks), not run by this target yet. */
  logic: string[];
  /** Plan-layer refusals: the same nodes the React export leaves out, for the same reasons. */
  planRefusals: Array<{ component: string; nodeId: string; name: string; reason: string }>;
  /**
   * Plan refusals this target prints all the same: the app shell's CSS Definitions, carried into `styles/app.css`
   * (P18-S140-SHELLUNSAID is React's). Listed apart, so the preflight never calls a printed node left out (HTX-004).
   */
  carried: Array<{ component: string; nodeId: string; name: string }>;
  /** What the HTML printer read in the plan and does not print yet. */
  htmlLosses: HtmlLoss[];
}

export interface EmittedHtmlApp {
  files: Record<string, string>;
  copies: Array<{ from: string; to: string }>;
  preflight: HtmlPreflight;
  /** HTX-006. Every printed part: what `emitHtmlComponent` picks one from. */
  parts: HtmlPart[];
}

/** HTX-006. A printed component, as `--component` names it. */
export interface HtmlPart {
  /** The component's path in the project (`Menu/Settings`). */
  path: string;
  /** Its module, relative to the output root, and the function it exports. */
  file: string;
  mount: string;
  /** A logic component: it draws nothing. */
  logic: boolean;
  /** A page the Router lists. */
  page: boolean;
}

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function emitHtmlApp(ir: ExportIR, catalog: Catalog): EmittedHtmlApp {
  const index = new CatalogIndex(catalog);
  const project = planProject(ir, index);
  const appName = ir.project.name || 'App';
  const files: Record<string, string> = {};

  // The pages the Router lists, by the url path a Navigate names; the router path is the same text.
  const pages = routedPages(ir);
  const router = ir.project.routers[0];
  const routeOf = (urlPath: string): string | undefined => (pages.some((p) => p.urlPath === urlPath) ? urlPath : undefined);

  const moduleByLegacy = new Map<string, { file: string; mount: string }>();
  for (const plan of project.plans) if (plan.file) moduleByLegacy.set(plan.legacyPath, { file: `${plan.file.dir}/${plan.file.fileBase}.js`, mount: mountNameOf(plan) });

  const losses: HtmlLoss[] = [];
  const parts: HtmlPart[] = [];
  const components: string[] = [];
  const logic: string[] = [];
  const stylesheets: string[] = [];
  let usesStates = false;
  // HTX-004. The React export's own files, read for its backend client (`client.ts`).
  const reactFiles = emitApp(ir, catalog).files;
  // P134 session 13 (R8). The kit nodes the plans draw, bound as the React export binds them (`emitKits`): the same ports.
  const usedKitTypes = new Set<string>();
  for (const plan of project.plans) for (const custom of Object.values(plan.customNodes)) usedKitTypes.add(custom.def.type);
  const kitBindings = emitKits(ir, usedKitTypes).bindings;
  for (const plan of project.plans) {
    if (!plan.file) continue;
    const component = ir.components.find((c) => c.path === plan.path)!;
    const printed = printComponent(plan, {
      project,
      catalog: index,
      styles: ir.project.styles,
      nodesOf: (path) => (path === plan.path ? component.nodes : (ir.components.find((c) => c.path === path)?.nodes ?? [])),
      moduleOf: (legacy) => moduleByLegacy.get(legacy),
      variableOf: (name) => project.variables.find((v) => v.name === name)?.exportName,
      storeOf: (name) => project.stores.find((st) => st.name === name && st.deferred === undefined)?.exportName,
      routeOf,
      noodlClient: 'src/lib/noodl.ts' in reactFiles,
      columnsOf: (name) => (ir.project.collections.find((c) => c.name === name)?.columns ?? []).map((c) => c.name),
      kitOf: (type) => kitBindings.get(type)
    });
    const base = `${plan.file.dir}/${plan.file.fileBase}`;
    parts.push({ path: plan.path, file: `${base}.js`, mount: printed.mount, logic: plan.hook === true, page: plan.role === 'page' });
    files[`${base}.js`] = printed.js;
    Object.assign(files, printed.functions);
    usesStates ||= printed.usesStates;
    if (plan.hook) logic.push(plan.path);
    else {
      files[`${base}.css`] = printed.css;
      stylesheets.push(`${base}.css`);
      components.push(printed.mount);
    }
    losses.push(...printed.losses);
  }

  // The app shell's CSS Definitions: what a port cannot say (the page ground, a hover), carried as written. The React
  // export drops them (P18-S140-SHELLUNSAID); a stylesheet is what this target is made of.
  const shell = router ? ir.components.find((c) => c.path === router.componentPath) : undefined;
  const shellSheets = (shell?.nodes ?? []).filter((n) => n.type === 'CSS Definition');
  const shellPrinted = shellSheets
    .map((n) => {
      const v = n.parameters.find((p) => p.name === 'style')?.value;
      // A codeeditor port parses as `{ kind: 'script', source }` (the plan's own reading of a CSS Definition, plan.ts).
      const css = v?.kind === 'script' ? v.source : v?.kind === 'literal' && typeof v.value === 'string' ? v.value : '';
      return { node: n, text: css.trim() === '' ? '' : `/* ${(n.authoredLabel ?? n.id).replace(/\*\//g, '* /')} (${shell!.path}) */\n${css.trim()}\n` };
    })
    .filter((s) => s.text !== '');
  const shellCss = shellPrinted.map((s) => s.text);
  if (shellCss.length > 0) files['styles/app.css'] = `/* @nodegx:generated — the app shell's own stylesheets, as written in NodeGX. */\n\n${shellCss.join('\n')}`;
  for (const n of shell?.nodes ?? []) {
    if (n.type === 'CSS Definition' || n.id === router?.nodeId) continue;
    if (n.type === 'Group' || n.type === 'net.noodl.visual.group') losses.push({ component: shell!.path, nodeId: n.id, label: n.authoredLabel, what: "the app shell's own Group is not drawn: the pages draw straight into the page" });
  }

  const start = pages.find((p) => p.isStart) ?? pages[0];
  files['styles/theme.css'] = tokensCss(ir);
  files['styles/base.css'] = baseCss();
  files['lib/core.js'] = CORE_JS;
  files['lib/dom.js'] = DOM_JS;
  files['lib/router.js'] = ROUTER_JS;
  if (Object.keys(files).some((f) => f.startsWith('functions/'))) files['lib/functionRun.js'] = FUNCTION_RUN_JS;
  if (Object.values(files).some((text) => text.includes("/lib/componentScope.js'") || text.includes("from './lib/componentScope.js'"))) files['lib/componentScope.js'] = COMPONENT_SCOPE_JS;
  if (Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/timer\.js'/.test(text))) files['lib/timer.js'] = TIMER_JS;
  if (Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/util\.js'/.test(text))) files['lib/util.js'] = UTIL_JS;
  // P134 s12. A Function whose Uses lists a script file: the loader, the registry, and every file in the project once.
  if (Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/projectScriptFiles\.js'/.test(text))) Object.assign(files, projectScriptsFiles(ir.project.scripts ?? []));
  if (usesStates) {
    files['lib/states.js'] = STATES_JS;
    files['lib/animate.js'] = ANIMATE_JS;
  }
  // EXP-011 §63. A Drag: its machine, the snap tween's engine, and the error channel its one error rides.
  const usesDrag = Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/drag\.js'/.test(text));
  // GAM-013. A Repeat: its beat, and the same error channel (an unusable Interval raises before Failure).
  const usesRepeat = Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/repeat\.js'/.test(text));
  if (usesRepeat) files['lib/repeat.js'] = REPEAT_JS;
  if (usesDrag) {
    files['lib/drag.js'] = DRAG_JS;
    files['lib/animate.js'] = ANIMATE_JS;
  }
  // EXP-011 §49. An Animate To Value moves on the same engine a States move eases along.
  if (Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/animate\.js'/.test(text))) files['lib/animate.js'] = ANIMATE_JS;
  if (project.variables.length > 0) files['variables.js'] = variablesJs(project.variables);
  for (const st of project.stores) if (st.deferred === undefined) files[`stores/${st.exportName}.js`] = storeJs(st);
  if (project.stores.some((st) => st.deferred === undefined && st.persist !== undefined)) files['lib/persistStore.js'] = PERSIST_STORE_JS;
  // HTX-004. The backend client: the React export's own api modules, Noodl API and error channel, the same text, its
  // types taken out (`client.ts`), written only where a component calls into it.
  const usesClient = Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+(?:api\/|lib\/(?:session|errors|noodl)\.js')/.test(text));
  if (usesClient) Object.assign(files, clientFilesEsm(reactFiles));
  // EXP-011 §63, GAM-013. A Drag or a Repeat alone needs only the error channel its errors ride, the React export's own `errors.ts`.
  else if (usesDrag || usesRepeat) files['lib/errors.js'] = clientFilesEsm(reactFiles)['lib/errors.js'];
  files['app.js'] = appJs(pages, moduleByLegacy, start?.urlPath ?? '/');
  const fontLinks = moduleStylesheetLinks(ir).replace(/href="\//g, 'href="');
  // P134 session 13 (R8). A kit node: the kit bridge, React's two global builds (loaded first, by index.html), and one module
  // per kit that loads the bridge and then the kit's own script, as the React export's `src/kits/<Kit>.tsx` does.
  const usesKits = Object.values(files).some((text) => /from '(?:\.\.\/|\.\/)+lib\/kits\.js'/.test(text));
  if (usesKits) {
    files['lib/kits.js'] = KITS_JS;
    Object.assign(files, reactGlobalFiles());
    for (const module of ir.project.modules) {
      if (module.main === undefined || !module.nodes.some((n) => usedKitTypes.has(n.type))) continue;
      files[`kits/${module.dirName}.js`] = [
        `// @nodegx:generated — the kit "${module.displayName}": the bridge first (it gives the kit window.Noodl), then the kit's`,
        `// own script, noodl_modules/${module.dirName}/${module.main}, as written. Do not swap these two lines.`,
        "import '../lib/kits.js';",
        `import '../noodl_modules/${module.dirName}/${module.main}';`,
        ''
      ].join('\n');
    }
  }
  files['index.html'] = [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${escapeHtml(appName)}</title>`,
    fontLinks.trimEnd(),
    '    <link rel="stylesheet" href="styles/theme.css" />',
    '    <link rel="stylesheet" href="styles/base.css" />',
    ...(files['styles/app.css'] ? ['    <link rel="stylesheet" href="styles/app.css" />'] : []),
    ...stylesheets.sort().map((s) => `    <link rel="stylesheet" href="${s}" />`),
    '  </head>',
    '  <body>',
    '    <div id="app"></div>',
    // R8. React before the app, only when a kit node is drawn: a kit's script reads window.React as it loads.
    ...(usesKits ? REACT_GLOBAL_PATHS.map((p) => `    <script src="${p}"></script>`) : []),
    '    <script type="module" src="app.js"></script>',
    '  </body>',
    '</html>',
    ''
  ]
    .filter((l) => l !== '')
    .join('\n')
    .concat('\n');

  const carriedSheets = new Set(shellPrinted.map((s) => `${shell!.path}\u0000${s.node.id}`));
  const allRefusals = project.plans.flatMap((p) => p.refusals.map((r) => ({ component: p.path, nodeId: r.nodeId, name: r.label ?? r.displayName, reason: r.reason })));
  const isCarried = (r: { component: string; nodeId: string }) => carriedSheets.has(`${r.component}\u0000${r.nodeId}`);
  const planRefusals = allRefusals.filter((r) => !isCarried(r));
  const carried = allRefusals.filter(isCarried).map(({ component, nodeId, name }) => ({ component, nodeId, name }));
  const preflight: HtmlPreflight = { appName, components, logic, planRefusals, carried, htmlLosses: losses };
  files['EXPORT-PREFLIGHT.md'] = renderHtmlPreflight(preflight);
  files['README.md'] = readme(appName, preflight, pages.map((p) => p.urlPath));

  // The fonts and the icon sets: every module's files, copied as they are, at the paths `index.html` links.
  const copies = emitKits(ir, new Set()).copies.map((c) => ({ from: c.from, to: c.to.replace(/^public\//, '') }));
  copies.sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));

  return { files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1))), copies, preflight, parts };
}

/** HTX-006. What `--component` writes: one part and what it needs, and the files a host page reads. */
export interface EmittedHtmlComponent {
  files: Record<string, string>;
  copies: Array<{ from: string; to: string }>;
  /** The part's path in the project, and the entry a host page imports: `<Name>.js`, `<Name>.css`. */
  component: string;
  entry: { js: string; css: string; mount: string };
  /** What did not come across, for the parts written only (the plan's refusals and this printer's losses). */
  preflight: HtmlPreflight;
}

export type HtmlComponentChoice = { ok: true; part: HtmlPart } | { ok: false; reason: string };

/**
 * The part `name` names: its path (`Menu/Settings`, a leading `/` allowed) or, when only one component has it, its last
 * name (`Settings`). Case counts. A page can be one; a logic component cannot, since it draws nothing to mount.
 */
export function chooseHtmlPart(parts: HtmlPart[], name: string): HtmlComponentChoice {
  const wanted = name.replace(/^\/+/, '');
  const drawn = parts.filter((p) => !p.logic);
  const byPath = parts.find((p) => p.path === wanted);
  const byLast = drawn.filter((p) => p.path.split('/').pop() === wanted);
  const found = byPath ?? (byLast.length === 1 ? byLast[0] : undefined);
  const list = drawn.map((p) => `"${p.path}"`).join(', ');
  if (found?.logic) return { ok: false, reason: `"${found.path}" is a logic component: it draws nothing, so there is nothing to mount in a page.` };
  if (found) return { ok: true, part: found };
  if (byLast.length > 1) return { ok: false, reason: `"${name}" is the name of ${byLast.length} components: ${byLast.map((p) => `"${p.path}"`).join(', ')}. Give its path.` };
  return { ok: false, reason: `The project has no component "${name}". The components it can export: ${list || 'none'}.` };
}

/**
 * HTX-006. `nodegx export --target html --component <name>`: the part, the parts it places, their CSS, and the `lib/`
 * files they import, with no `index.html` and no router. It is the whole export's own files (`emitHtmlApp`), the same
 * text, taken by what the part's module imports; so a part exported alone and in its app is the same file.
 *
 * Two files are new, at the folder's top, named after the part: `<Name>.js`, the one module a host page imports, and
 * `<Name>.css`, the one stylesheet it links. The entry puts the part in a box of its own (`display: contents`, so it lays
 * out as if it were not there) whose class the tokens and the floor are scoped to: the project's custom properties, its
 * font and its colour stop at the part, and the page's body is not touched.
 */
export function emitHtmlComponent(ir: ExportIR, catalog: Catalog, name: string): EmittedHtmlComponent | { refused: string } {
  const whole = emitHtmlApp(ir, catalog);
  const choice = chooseHtmlPart(whole.parts, name);
  if (choice.ok === false) return { refused: choice.reason };
  const part = choice.part;
  const symbol = part.mount.replace(/^mount/, '');
  const entryJs = `${symbol}.js`;
  const entryCss = `${symbol}.css`;
  if (entryJs in whole.files) return { refused: `"${part.path}" would write its entry over ${entryJs}, a file of the app's own.` };

  // What the part's module imports, and what those import: the closure of relative imports, read off the printed text.
  const taken = new Set<string>();
  const queue = [part.file];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (taken.has(file) || !(file in whole.files)) continue;
    taken.add(file);
    const dir = file.split('/').slice(0, -1);
    for (const m of whole.files[file].matchAll(/(?:from|import)\s*\(?\s*'(\.{1,2}\/[^']+)'/g)) queue.push(resolveRelative(dir, m[1]));
  }
  const files: Record<string, string> = {};
  const sheets: string[] = [];
  for (const file of [...taken].sort()) {
    files[file] = whole.files[file];
    const css = file.replace(/\.js$/, '.css');
    if (css in whole.files) {
      files[css] = whole.files[css];
      sheets.push(css);
    }
  }

  const scope = `nodegx-${symbol}`;
  const tokens = tokensCss(ir).replace(/^:root \{/m, `.${scope} {`);
  const fontSheets = moduleStylesheetLinks(ir)
    .split('\n')
    .map((l) => /href="([^"]+)"/.exec(l)?.[1])
    .filter((h): h is string => h !== undefined)
    .map((h) => h.replace(/^\//, '').replace(/&amp;/g, '&'));
  // The cut, in a sheet of its own because it must come before the part's sheets: the page's own rules stop at the box
  // (`all: initial` on the box, `all: revert` inside, each one class strong, so the part's classes, later, still win).
  const floorCss = `styles/${symbol}.floor.css`;
  if (floorCss in whole.files) return { refused: `"${part.path}" would write its floor over ${floorCss}, a file of the app's own.` };
  files[floorCss] = [
    `/* @nodegx:generated by \`nodegx export --target html --component\` — where the page's own styles stop, for ${part.path}. */`,
    '',
    `/* The box: nothing the page sets reaches in by inheritance (its font, its colour, its letter spacing). The page's */`,
    `/* rules that name an element (every p, every button) stop here too: a rule with an id or a class in it is stronger. */`,
    `.${scope} {`,
    '  all: initial;',
    '  font-family: var(--font-sans);',
    '  color: var(--foreground);',
    '}',
    `.${scope} :where(*),`,
    `.${scope} :where(*)::before,`,
    `.${scope} :where(*)::after {`,
    '  all: revert;',
    '}',
    '',
    `/* The floor the whole export puts on the body (styles/base.css), on the box instead. */`,
    `.${scope} :where(*),`,
    `.${scope} :where(*)::before,`,
    `.${scope} :where(*)::after {`,
    '  box-sizing: border-box;',
    '}',
    `.${scope} :where(button, input, select, textarea) {`,
    '  font: inherit;',
    '}',
    `.${scope} :where(textarea) {`,
    '  resize: none;',
    '}',
    ''
  ].join('\n');
  files[entryCss] = [
    `/* @nodegx:generated by \`nodegx export --target html --component\` — ${part.path}, the one stylesheet to link. */`,
    ...fontSheets.map((h) => `@import url(${js(h)});`),
    `@import url(${js(floorCss)});`,
    ...sheets.sort().map((h) => `@import url(${js(h)});`),
    '',
    `/* The project's design tokens, on the part's own box only: they stop where it stops. */`,
    tokens.replace(/^\/\* @nodegx:generated \(scaffold\) \*\/\n/, '').trimEnd(),
    ''
  ].join('\n');

  const p = whole.preflight;
  const within = (c: string) => [...taken].some((f) => whole.parts.some((wp) => wp.file === f && wp.path === c));
  const preflight: HtmlPreflight = {
    appName: p.appName,
    components: whole.parts.filter((wp) => !wp.logic && taken.has(wp.file)).map((wp) => wp.mount),
    logic: whole.parts.filter((wp) => wp.logic && taken.has(wp.file)).map((wp) => wp.path),
    planRefusals: p.planRefusals.filter((r) => within(r.component)),
    carried: [],
    htmlLosses: p.htmlLosses.filter((l) => within(l.component))
  };
  const leftOut = [...preflight.planRefusals.map((r) => `\`${r.component}\` "${r.name}" — ${r.reason}`), ...preflight.htmlLosses.map((l) => `\`${l.component}\`${l.label ? ` "${l.label}"` : ''} — ${l.what}`)];
  files[entryJs] = partEntryJs(part, symbol, scope, entryCss, leftOut);

  // The fonts the project's modules carry: copied as the whole export copies them.
  const copies = fontSheets.length > 0 ? whole.copies : [];
  return { files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1))), copies, component: part.path, entry: { js: entryJs, css: entryCss, mount: part.mount }, preflight };
}

function resolveRelative(dir: string[], spec: string): string {
  const out = [...dir];
  for (const seg of spec.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return out.join('/');
}

/** `<Name>.js`: the part in its scoped box, and how a page uses it. */
function partEntryJs(part: HtmlPart, symbol: string, scope: string, css: string, leftOut: string[]): string {
  return [
    `// @nodegx:generated by \`nodegx export --target html --component\` — ${part.path}, for a page that is not NodeGX.`,
    '//',
    `// Link ${css} once, import this, and mount the part where it goes:`,
    '//',
    `//   <link rel="stylesheet" href="${css}" />`,
    `//   import { ${part.mount} } from './${symbol}.js';`,
    `//   const part = ${part.mount}(element, { /* its inputs */ });`,
    '//   part.update({ /* inputs that changed */ });',
    '//   part.outputs.<port>.subscribe((value) => { … });   // each output, by the name it has in NodeGX',
    '//   part.destroy();',
    '//',
    "// A value output's subscriber is called with each new value (`.peek()` reads the last one); a signal output's, on",
    '// each pulse. Every file this export wrote is listed in nodegx-export.json: export again and only those change.',
    ...(leftOut.length > 0 ? ['//', `// What did not come across (${leftOut.length}):`, ...leftOut.map((l) => `//   - ${l}`)] : []),
    `import { ${part.mount} as mountPart } from './${part.file}';`,
    '',
    '/**',
    ` * Draws ${part.path} into \`element\` (before \`before\`, when given), in a box of its own: the box lays out as if it were`,
    ` * not there (\`display: contents\`), and its class (\`${scope}\`) is where ${css}'s tokens apply and the page's own styles stop.`,
    ' */',
    `export function ${part.mount}(element, inputs = {}, before) {`,
    "  const box = document.createElement('div');",
    `  box.className = ${js(scope)};`,
    "  box.style.display = 'contents';",
    '  element.insertBefore(box, before ?? null);',
    '  const part = mountPart(box, inputs);',
    '  return {',
    '    update: part.update,',
    '    outputs: part.outputs,',
    '    destroy() {',
    '      part.destroy();',
    '      box.remove();',
    '    }',
    '  };',
    '}',
    ''
  ].join('\n');
}

/** The app's Variables: one value each, which every page and component reads and writes (React's `stores/variables.ts`). */
function variablesJs(variables: ProjectPlan['variables']): string {
  const blocks = variables.map((v) => {
    const writers = v.writers.map((w) => `${w.label !== undefined ? `"${w.label}" ` : ''}(${w.nodeType} on /${w.componentPath})${w.seed !== undefined ? `, which sets it to ${JSON.stringify(w.seed)} each time its component is placed` : ''}`);
    const said = writers.length === 0 ? 'Nothing in the app sets it.' : `Set by ${writers.join('; ')}.`;
    return `/** The Variable "${v.name}". ${said} */
export const ${v.exportName} = value(undefined);`;
  });
  return ['// @nodegx:generated by `nodegx export --target html` — the app\'s Variables.', "import { value } from './lib/core.js';", '', blocks.join('\n\n'), ''].join('\n');
}

/**
 * A Global Store (or a named Object): React's `src/stores/<name>.ts`, its interface out — `store(name, initial)` from
 * `lib/core.js`, the initial state in the order it was written, who declares and writes it, and Persist when it is on.
 */
function storeJs(st: ProjectPlan['stores'][number]): string {
  const who = (w: (typeof st.declarers)[number]) => `${w.label !== undefined ? `"${w.label}" ` : ''}(${w.nodeType} on /${w.componentPath})`;
  const said = [
    ...st.declarers.map((d) => `${st.origin === 'object' ? 'Read by' : 'Declared by'} ${who(d)}.`),
    ...st.writers.map((w) => (w.seeds !== undefined ? `Seeded by ${who(w)} each time its component is placed.` : `Written by ${who(w)}.`))
  ];
  const initial = st.keys.filter((k) => k.required);
  const literal = initial.length === 0 ? '{}' : `{\n${initial.map((k) => `  ${/^[A-Za-z_$][\w$]*$/.test(k.key) ? k.key : js(k.key)}: ${JSON.stringify(k.initial)}`).join(',\n')}\n}`;
  return [
    `// @nodegx:generated by \`nodegx export --target html\` — the ${st.origin === 'object' ? 'Object' : 'Global Store'} "${st.name}".`,
    "import { store } from '../lib/core.js';",
    ...(st.persist ? ["import { persistStore } from '../lib/persistStore.js';"] : []),
    '',
    `/**\n${said.map((l) => ` * ${l}`).join('\n')}\n */`,
    `export const ${st.exportName} = store(${js(st.name)}, ${literal});`,
    ...(st.persist ? ['', `/** Persist is on: kept in the browser as "noodl_store_${st.persist.storageKey}", as the running app keeps it. */`, `persistStore(${st.exportName}, ${js(st.persist.storageKey)});`] : []),
    ''
  ].join('\n');
}

function appJs(pages: ReturnType<typeof routedPages>, modules: Map<string, { file: string; mount: string }>, start: string): string {
  const rows = pages.map((p) => ({ page: p, module: modules.get(`/${p.componentPath}`) })).filter((r) => r.module !== undefined);
  return [
    '// @nodegx:generated by `nodegx export --target html` — the pages, and the one the app opens on.',
    "import { startRouter } from './lib/router.js';",
    ...rows.map((r) => `import { ${r.module!.mount} } from './${r.module!.file}';`),
    '',
    'startRouter({',
    "  root: document.getElementById('app'),",
    `  start: ${js(start)},`,
    '  routes: [',
    ...rows.map((r) => `    { path: ${js(r.page.urlPath)}, mount: ${r.module!.mount} },`),
    '  ]',
    '});',
    ''
  ].join('\n');
}

export function renderHtmlPreflight(p: HtmlPreflight): string {
  const lines = [
    `# Before you export to plain HTML — ${p.appName}`,
    '',
    `**${p.components.length} components drawn**: ${p.components.join(', ')}.`,
    '',
    `**${p.logic.length} logic components** (they draw nothing; each runs where a component places it): ${p.logic.join(', ') || 'none'}.`,
    '',
    `## Left out by the plan (${p.planRefusals.length}) — the same nodes the React export leaves out`,
    ''
  ];
  for (const r of p.planRefusals) lines.push(`- \`${r.component}\` "${r.name}" — ${r.reason}`);
  if (p.carried.length > 0) {
    lines.push('', `## Carried here, though the React export leaves it out (${p.carried.length})`, '');
    for (const c of p.carried) lines.push(`- \`${c.component}\` "${c.name}" — the app shell's stylesheet, in \`styles/app.css\` as written`);
  }
  lines.push('', `## Read in the plan, not printed by the HTML target yet (${p.htmlLosses.length})`, '');
  for (const l of p.htmlLosses) lines.push(`- \`${l.component}\`${l.nodeId ? ` ${l.label ? `"${l.label}"` : l.nodeId}` : ''} — ${l.what}`);
  lines.push('');
  return lines.join('\n');
}

function readme(appName: string, p: HtmlPreflight, paths: string[]): string {
  return [
    `# ${appName} — exported as plain HTML by NodeGX`,
    '',
    'This folder is the whole app: HTML, CSS and JavaScript, with nothing to install and nothing to build.',
    '',
    '## Run it',
    '',
    'Serve the folder with any static web server, and open the address it prints:',
    '',
    '```sh',
    'python3 -m http.server 8000     # then open http://localhost:8000',
    'npx serve .                     # or this, if you have Node',
    '```',
    '',
    'Any web host serves it the same way: upload the folder. Opening `index.html` straight from the disk does not work in',
    'most browsers, because they refuse JavaScript modules from a file.',
    '',
    `Each page is an address after \`#\`: ${paths.map((x) => `\`#${x}\``).join(', ')}. That is what lets a plain server`,
    'refresh any page without being told about it.',
    '',
    '## What is where',
    '',
    '| folder or file | what |',
    '|---|---|',
    '| `index.html` | the page: its stylesheets and one script, `app.js` |',
    '| `app.js` | the pages, and the one the app opens on |',
    '| `pages/`, `components/` | one JavaScript file per part, with its look beside it in a `.css` file of the same name |',
    '| `styles/theme.css` | the design tokens (colours, sizes, fonts) as CSS custom properties: change one here and it changes everywhere |',
    '| `styles/base.css`, `styles/app.css` | the page\'s floor, and the stylesheets the app\'s shell held in NodeGX |',
    '| `functions/` | each Function node\'s code, as it was written in NodeGX, one file per Function |',
    '| `lib/` | the small library every part uses: `core.js` holds values and redraws what reads them, `dom.js` makes the elements, `router.js` changes page, `functionRun.js` runs a Function as NodeGX runs it |',
    '',
    'A part is a function: `mountReadPage(element, inputs)` draws the page into `element`. To find where a piece of text',
    'comes from, search the `pages/` and `components/` files for it.',
    '',
    '## What did not come across',
    '',
    `${p.planRefusals.length + p.htmlLosses.length} things are listed in \`EXPORT-PREFLIGHT.md\`, each by the node it sat on.`,
    ''
  ].join('\n');
}
