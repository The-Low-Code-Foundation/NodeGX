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
import { CORE_JS } from './coreJs';
import { FUNCTION_RUN_JS } from './functionRunJs';
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
  /** What the HTML printer read in the plan and does not print yet. */
  htmlLosses: HtmlLoss[];
}

export interface EmittedHtmlApp {
  files: Record<string, string>;
  copies: Array<{ from: string; to: string }>;
  preflight: HtmlPreflight;
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
  const components: string[] = [];
  const logic: string[] = [];
  const stylesheets: string[] = [];
  let usesStates = false;
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
      routeOf
    });
    const base = `${plan.file.dir}/${plan.file.fileBase}`;
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
  const shellCss = shellSheets
    .map((n) => {
      const v = n.parameters.find((p) => p.name === 'style')?.value;
      // A codeeditor port parses as `{ kind: 'script', source }` (the plan's own reading of a CSS Definition, plan.ts).
      const css = v?.kind === 'script' ? v.source : v?.kind === 'literal' && typeof v.value === 'string' ? v.value : '';
      return css.trim() === '' ? '' : `/* ${(n.authoredLabel ?? n.id).replace(/\*\//g, '* /')} (${shell!.path}) */\n${css.trim()}\n`;
    })
    .filter((s) => s !== '');
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
  if (usesStates) {
    files['lib/states.js'] = STATES_JS;
    files['lib/animate.js'] = ANIMATE_JS;
  }
  if (project.variables.length > 0) files['variables.js'] = variablesJs(project.variables);
  files['app.js'] = appJs(pages, moduleByLegacy, start?.urlPath ?? '/');
  const fontLinks = moduleStylesheetLinks(ir).replace(/href="\//g, 'href="');
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
    '    <script type="module" src="app.js"></script>',
    '  </body>',
    '</html>',
    ''
  ]
    .filter((l) => l !== '')
    .join('\n')
    .concat('\n');

  const planRefusals = project.plans.flatMap((p) => p.refusals.map((r) => ({ component: p.path, nodeId: r.nodeId, name: r.label ?? r.displayName, reason: r.reason })));
  const preflight: HtmlPreflight = { appName, components, logic, planRefusals, htmlLosses: losses };
  files['EXPORT-PREFLIGHT.md'] = renderHtmlPreflight(preflight);
  files['README.md'] = readme(appName, preflight, pages.map((p) => p.urlPath));

  // The fonts and the icon sets: every module's files, copied as they are, at the paths `index.html` links.
  const copies = emitKits(ir, new Set()).copies.map((c) => ({ from: c.from, to: c.to.replace(/^public\//, '') }));
  copies.sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));

  return { files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1))), copies, preflight };
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
