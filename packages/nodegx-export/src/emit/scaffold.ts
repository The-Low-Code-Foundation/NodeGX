/**
 * Scaffolding generator — EXP-002 implementation step 3: "a project that builds with an empty
 * component proves the pipeline end to end."
 *
 * Emits everything around the components: package.json, Vite/TS config, entry point, the route
 * table derived from the project's Router node(s) + each page's `Page` node urlPath, the design
 * tokens as tokens.css, and a placeholder page per routed component so the output builds before
 * the visual generator exists. Placeholders are explicitly marked and are replaced file-for-file
 * as later generators land.
 *
 * Pure: ExportIR in, sorted { path → content } out. No filesystem access here — writing (and
 * EXP-007's provenance headers/hashes, which need the final bytes) happens in a separate step.
 */

import { ComponentIR, ExportIR, NodeIR, ParamValue, RouterIR } from '../ir/types';

/** Deliberately minimal provenance line until EXP-007 lands the full marker set. */
const GENERATED_TS = '// @nodegx:generated (scaffold — placeholder markers complete in EXP-007)\n';
const GENERATED_CSS = '/* @nodegx:generated (scaffold) */\n';

/**
 * EXP-011 §54. The router shell kept as a component file for the logic beside its Router — an `On App Error`
 * boundary — which `App.tsx` renders as the first child of the router, alive for the app's life.
 */
export interface ScaffoldShell {
  symbol: string;
  fileBase: string;
}

export interface ScaffoldPage {
  /** Component path form: "Pages/Landing". */
  componentPath: string;
  /** "ThankYou" — PascalCased last path segment, deduplicated. */
  fileBase: string;
  /** "ThankYouPage". */
  symbol: string;
  /** "/thank-you", or "/product/{id}" — the component's Page node urlPath, verbatim. */
  urlPath: string;
  /**
   * The same path as a react-router pattern: "/product/{id}" → "/product/:id".
   *
   * 🔴 **Not cosmetic — a braced segment matches nothing in react-router.** The runtime's own
   * matcher splits on "/" and treats a `{name}` part as a capture (`router.tsx:746`); react-router
   * spells the same thing `:name`. Emitting the authored path into `<Route path=…>` produced a
   * route that only ever matched the literal text "{id}", so every detail page 404'd to the
   * start page and the parameters this slice reads were never populated at all.
   */
  routePath: string;
  /** The braced segment names, in path order — "/product/{id}/{tab}" → ["id", "tab"]. */
  pathParams: string[];
  isStart: boolean;
}

/**
 * The braced segments of an authored urlPath, in order.
 *
 * ⚠️ Deliberately the runtime's own regex (`router.tsx:614`), not a stricter one. `Navigate To
 * Path` uses `/\{[A-Za-z0-9_]*\}/g` — a narrower alphabet — and the two disagreeing is a
 * runtime fact this export is not the place to resolve: a Page whose urlPath is `/x/{a-b}` has a
 * parameter as far as the Router is concerned, so it has one here.
 */
export function bracedParams(urlPath: string): string[] {
  return (urlPath.match(/{([^}]+)}/g) ?? []).map((part) => part.slice(1, -1));
}

/**
 * The runtime's `_trimUrlPart` (`router.tsx:39`) — one leading and one trailing slash.
 *
 * 🔴 **Without it an authored leading slash emitted a route nothing could reach.** A Page whose
 * `urlPath` is `/note/{id}` became `<Route path="//note/:id">`, because this line prefixed a
 * slash unconditionally — while the Router trims the page pattern before matching, so the same
 * project routes perfectly well in the app it was exported from. Every fixture happens to author
 * the path unslashed, which is why 797 tests and four drives never saw it.
 */
function trimUrlPart(url: string): string {
  if (url[0] === '/') url = url.substring(1);
  if (url[url.length - 1] === '/') url = url.substring(0, url.length - 1);
  return url;
}

/** "/product/{id}" → "/product/:id". */
function routePatternOf(urlPath: string): string {
  return urlPath.replace(/{([^}]+)}/g, (_match, name: string) => `:${name}`);
}

export function emitScaffold(ir: ExportIR, shell?: ScaffoldShell): Record<string, string> {
  const pages = routedPages(ir);
  const files: Record<string, string> = {};

  files['package.json'] = packageJson(ir);
  files['vite.config.ts'] = viteConfig();
  files['tsconfig.json'] = tsConfig();
  files['index.html'] = indexHtml(ir);
  files['src/main.tsx'] = mainTsx();
  files['src/App.tsx'] = appTsx(pages, shell);
  files['src/styles/tokens.css'] = tokensCss(ir);
  files['src/styles/base.css'] = baseCss();
  for (const page of pages) {
    files[`src/pages/${page.fileBase}.tsx`] = placeholderPage(page);
  }

  // Deterministic file order (D-rules): callers may iterate Object.entries directly.
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * The route table: the first Router node's `routes` in source order, joined with each target
 * component's `Page` node `urlPath`. Components a router lists but the project lacks are
 * skipped here — analysis reports them (nothing in emit is allowed to throw on content).
 */
export function routedPages(ir: ExportIR): ScaffoldPage[] {
  const router = ir.project.routers[0];
  if (!router) return [];
  // P18-S110-ROUTERSELF. The Router's own Url Path goes in front of every page's, as `router.tsx` puts it in front of
  // every pattern it matches and every URL it pushes — so the route table and every exported `navigate(…)` wear it.
  const prefix = routerPrefix(ir, router);

  const byLegacyPath = new Map<string, ComponentIR>();
  for (const component of ir.components) byLegacyPath.set(`/${component.path}`, component);

  const usedNames = new Set<string>();
  const pages: ScaffoldPage[] = [];
  for (const legacyPath of router.routes) {
    const component = byLegacyPath.get(legacyPath);
    if (!component) continue;
    const fileBase = dedupe(pascalCase(lastSegment(component.path)), usedNames);
    const urlPath = `/${prefix}${trimUrlPart(pageUrlPath(component))}`;
    pages.push({
      componentPath: component.path,
      fileBase,
      symbol: `${fileBase}Page`,
      urlPath,
      routePath: routePatternOf(urlPath),
      pathParams: bracedParams(urlPath),
      isStart: legacyPath === router.startPage
    });
  }
  return pages;
}

/** The Router node a `RouterIR` was read from. Its own ports are read here, at emit time, as every other node's are. */
function routerNodeOf(ir: ExportIR, router: RouterIR): { component: ComponentIR; node: NodeIR } | undefined {
  const component = ir.components.find((c) => c.path === router.componentPath);
  const node = component?.nodes.find((n) => n.id === router.nodeId);
  return component && node ? { component, node } : undefined;
}

/**
 * `"shop/"` for a Router whose Url Path is `/shop`: the runtime's `_trimUrlPart(urlPath) + '/'` (`router.tsx`
 * `getNavigationRelativeURL`, `matchPageFromUrl`). Blank is none — the runtime's `''` prefixes a lone slash that no
 * URL it pushes can match, which this export does not reproduce. A wired one is not carried and is said
 * (`routerNotes`).
 */
function routerPrefix(ir: ExportIR, router: RouterIR): string {
  const value = routerNodeOf(ir, router)?.node.parameters.find((p) => p.name === 'urlPath')?.value;
  if (value?.kind !== 'literal' || typeof value.value !== 'string') return '';
  const trimmed = trimUrlPart(value.value);
  return trimmed === '' ? '' : `${trimmed}/`;
}

/** The Router element's own paint, in panel order, with the value that paints nothing (`router.tsx`, `react-component-node.ts`). */
const ROUTER_OWN_STYLE: Array<{ port: string; label: string; paints: (text: string) => boolean }> = [
  { port: 'backgroundColor', label: 'Background Color', paints: (t) => t.trim() !== '' && t.trim() !== 'transparent' },
  { port: 'clip', label: 'Clip Behavior', paints: (t) => t === 'scroll' || t === 'clip' },
  { port: 'cssClassName', label: 'CSS Class', paints: (t) => t.trim() !== '' },
  // The port's default is a comment, `/* background-color: red; */`: it declares nothing.
  { port: 'styleCss', label: 'CSS Style', paints: (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').trim() !== '' }
];

const paramText = (value: ParamValue | undefined): string | undefined =>
  value === undefined
    ? undefined
    : value.kind === 'literal'
      ? String(value.value)
      : value.kind === 'script' || value.kind === 'expression'
        ? value.source
        : value.kind === 'json'
          ? JSON.stringify(value.value)
          : `${value.value}${value.unit}`;

/**
 * P18-S110-ROUTERSELF. What the export does not do with a Router's own ports, one sentence each. The Router collapses
 * into `App.tsx` (`plan.ts` `routerShellDisposition`), which renders the pages straight into the route table: there
 * is no Router element to paint, clip or class, and no Router to unmount.
 */
export function routerNotes(ir: ExportIR): string[] {
  const lines: string[] = [];
  for (const router of ir.project.routers) {
    const found = routerNodeOf(ir, router);
    if (!found) continue;
    const { component, node } = found;
    const wired = (port: string) => component.connections.some((c) => c.toId === node.id && c.toProperty === port);
    const value = (port: string) => node.parameters.find((p) => p.name === port)?.value;
    const at = `${router.componentPath}: node ${router.nodeId} (Router "${router.name}")`;

    if (wired('mounted')) {
      lines.push(`${at}: its Mounted is wired — the running app shows no page while the value is false; this export always routes`);
    } else {
      const mounted = value('mounted');
      if (mounted?.kind === 'literal' && mounted.value === false) {
        lines.push(`${at}: its Mounted is unticked — the running app renders no Router, so it shows no page at all; this export routes every page`);
      }
    }
    if (wired('urlPath')) {
      lines.push(`${at}: its Url Path is wired — the running app puts the value in front of every page's path; the exported routes carry none`);
    }
    const own = ROUTER_OWN_STYLE.filter(({ port, paints }) => {
      if (wired(port)) return true;
      const text = paramText(value(port));
      return text !== undefined && paints(text);
    }).map((s) => s.label);
    if (own.length > 0) {
      const names = own.length === 1 ? own[0] : `${own.slice(0, -1).join(', ')} and ${own[own.length - 1]}`;
      lines.push(
        `${at}: its own ${names} ${own.length === 1 ? 'is' : 'are'} not carried — the export renders the pages with no Router element to put ${own.length === 1 ? 'it' : 'them'} on`
      );
    }
  }
  return lines;
}

function pageUrlPath(component: ComponentIR): string {
  const pageNode = component.nodes.find((n) => n.type === 'Page');
  const urlPath = pageNode?.parameters.find((p) => p.name === 'urlPath')?.value;
  if (urlPath?.kind === 'literal' && typeof urlPath.value === 'string' && urlPath.value.length > 0) {
    return urlPath.value;
  }
  return slug(lastSegment(component.path));
}

function packageJson(ir: ExportIR): string {
  // Dependencies are computed from the output, not declared up front (TARGET-OUTPUT §3):
  // the scaffold itself needs only React and the router. @nodegx/core joins this list the
  // moment a generated file imports it, and not before.
  return (
    JSON.stringify(
      {
        name: slug(ir.project.name),
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc -b && vite build',
          preview: 'vite preview'
        },
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          'react-router-dom': '^7.1.0'
        },
        devDependencies: {
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
          '@vitejs/plugin-react': '^4.3.4',
          typescript: '~5.7.2',
          vite: '^6.0.0'
        }
      },
      null,
      2
    ) + '\n'
  );
}

function viteConfig(): string {
  return (
    GENERATED_TS +
    `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()]
});
`
  );
}

function tsConfig(): string {
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          isolatedModules: true,
          types: ['vite/client']
        },
        include: ['src']
      },
      null,
      2
    ) + '\n'
  );
}

function indexHtml(ir: ExportIR): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(ir.project.name)}</title>
${moduleStylesheetLinks(ir)}  </head>
  <body>
    <div id="root"></div>
${moduleDependencyScripts(ir)}    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

/**
 * The `<script>` tags a project's kit `dependencies` earn — P109-S17-EXPORTKITDEPS.
 *
 * The export copied each dependency to `public/` and nothing loaded it, so a kit reading `window.THREE` at mount threw
 * in the exported app and drew in the deployed one. These are the deploy injector's `<%modules_dependencies%>` tags
 * (`buildInjectionTags`), over the list the injector itself ordered (`parseModuleDependencies`): a classic script
 * per dependency, each once, an `http` entry at its own URL and anything else against `public/`, where it is copied. Classic and before the app's module script on purpose: a
 * classic script runs as it is parsed and a module script after the document, so the library is defined before the
 * bundled kit (`src/kits/modules/…`) evaluates — the order the deployed page has.
 */
function moduleDependencyScripts(ir: ExportIR): string {
  return (ir.project.moduleDependencies ?? [])
    .map((d) => `    <script src="${escapeHtml(d.startsWith('http') ? d : `/${d}`)}"></script>\n`)
    .join('');
}

/**
 * The `<link>` tags a project's `noodl_modules` stylesheets earn (EXP-010 AC5).
 *
 * 🔴 **Plain `<link>` against `public/`, not a bundler import**, and the reason is the icon font.
 * `lucide-icons/styles.css` carries `url(lucide.woff2)` relative to itself; an `import` would put
 * the stylesheet through Vite's asset pipeline, and while that *does* rewrite the URL it also
 * moves both files, which is exactly the "ships verbatim" contract `iconsets.ts` documents for a
 * deploy. Copying the folder untouched and linking it means the export and the deploy serve the
 * same bytes at the same paths, so an icon that renders in the preview renders here.
 *
 * A `http(s)` stylesheet (an ERG-002 library's CDN skin) is linked at its own URL — the export
 * cannot bundle it and inventing a local path would 404.
 */
function moduleStylesheetLinks(ir: ExportIR): string {
  const hrefs: string[] = [];
  for (const module of ir.project.modules) {
    // A module declaring only `cloud` contributes nothing to a browser page — the same
    // `runtimes` filter `buildInjectionTags` applies, so the export and the preview agree.
    if (!module.runtimes.includes('browser')) continue;
    for (const sheet of module.stylesheets) {
      hrefs.push(/^https?:\/\//.test(sheet) ? sheet : `/${sheet}`);
    }
  }
  if (hrefs.length === 0) return '';
  return hrefs.map((href) => `    <link rel="stylesheet" href="${escapeHtml(href)}" />\n`).join('');
}

function mainTsx(): string {
  return (
    GENERATED_TS +
    `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`
  );
}

function appTsx(pages: ScaffoldPage[], shell?: ScaffoldShell): string {
  const imports = [
    ...(shell !== undefined ? [`import { ${shell.symbol} } from './components/${shell.fileBase}';`] : []),
    ...pages.map((p) => `import { ${p.symbol} } from './pages/${p.fileBase}';`)
  ]
    .sort()
    .join('\n');
  const start = pages.find((p) => p.isStart) ?? pages[0];
  const routes = [
    ...(start ? [`        <Route path="/" element={<${start.symbol} />} />`] : []),
    ...pages.map((p) => `        <Route path="${p.routePath}" element={<${p.symbol} />} />`),
    ...(start ? [`        <Route path="*" element={<Navigate to="/" replace />} />`] : [])
  ].join('\n');

  return (
    GENERATED_TS +
    `import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

${imports}

export function App() {
  return (
    <BrowserRouter>
${shell !== undefined ? `      <${shell.symbol} />\n` : ''}      <Routes>
${routes}
      </Routes>
    </BrowserRouter>
  );
}
`
  );
}

function placeholderPage(page: ScaffoldPage): string {
  return (
    GENERATED_TS +
    `/**
 * TODO(export): placeholder for the "${page.componentPath}" component — replaced when the
 * visual-node generator (EXP-002 step 4) lands.
 */
export function ${page.symbol}() {
  return <div>${escapeHtml(page.componentPath)}</div>;
}
`
  );
}

function tokensCss(ir: ExportIR): string {
  const lines = ir.project.designTokens.flatMap((token) => [
    ...(token.description ? [`  /* ${token.description} */`] : []),
    `  ${token.name}: ${token.value};`
  ]);
  return GENERATED_CSS + ':root {\n' + lines.join('\n') + '\n}\n';
}

function baseCss(): string {
  // Deliberately minimal (TARGET-OUTPUT §3): box-sizing, the body font and the colour floor.
  // Element resets are per-class in the generated CSS modules, not global surprises.
  //
  // EXP-016. The two body declarations are the runtime's own, transcribed from
  // `StyleTokensModel/TokenResolver.ts` `generateCss`, which appends exactly this block after the
  // `:root` token list. They were `font-family: system-ui, sans-serif` and no `color` at all, and
  // that literal is why an exported app downloaded four Inter faces, linked their stylesheet,
  // defined `--font-sans` naming Inter first — and then rendered every word in the platform UI
  // font. The token is the only name for the typeface; a project that overrides `--font-sans`
  // re-fonts the whole app, which is the behaviour the token exists for.
  //
  // ⚠️ **The bare `var()` is safe here, and it was worth measuring rather than assuming.** A bare
  // `var()` naming a token nothing defines is invalid at computed-value time, and for `font-family`
  // that means the body falls through to the browser's serif — so this only works if every exported
  // project defines `--font-sans`. It does: `parseProject`'s `effectiveTokens` merges the shipped
  // `DEFAULT_TOKENS` under a project's overrides, and both `--font-sans` and `--foreground` are in
  // that set, so `tokens.css` carries them whether or not the author ever opened the token editor.
  // `the-typeface.test.ts` §D pins that on a fixture with no overrides of its own.
  //
  // `font: inherit` on the form controls is not a reset for its own sake. A `<button>` does not
  // inherit `font-family` from `body`, so before this the exported buttons landed on the UA default
  // (measured: `Arial`) while everything else landed on the wrong-but-deliberate `system-ui` — two
  // different wrong fonts on one page. A node's own class still wins: a class selector outranks
  // these element selectors whatever the sheet order.
  //
  // `resize: none` on the textarea is the running app's own (TextInput.tsx sets it on the only textarea it draws, a Text
  // Input of Type Text Area — P18-S120-TEXTAREA): without it the export's box grows a drag handle the app never had.
  return (
    GENERATED_CSS +
    `*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--foreground);
}

button,
input,
select,
textarea {
  font: inherit;
}

textarea {
  resize: none;
}
`
  );
}

function lastSegment(componentPath: string): string {
  const segments = componentPath.split('/');
  return segments[segments.length - 1];
}

function pascalCase(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const joined = cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return /^[0-9]/.test(joined) ? `Page${joined}` : joined || 'Component';
}

/** D5: collisions resolve first-wins with numeric suffixes, in iteration order. */
function dedupe(base: string, used: Set<string>): string {
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) candidate = `${base}${counter++}`;
  used.add(candidate);
  return candidate;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'nodegx-export'
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
