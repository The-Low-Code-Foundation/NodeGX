/**
 * EXP-022. `nodegx export --target swift`: the same IR, the same plan, a second printer.
 *
 * `emitSwiftApp` reads exactly what `emitApp` reads — `planProject(ir, catalog)` and the shared style layer — and writes
 * a Swift package (every view, the theme, the router) with a thin Xcode app target beside it. It is pure, as `emitApp`
 * is: path → text, and the caller writes. `swiftPreflight` is its *before you export* page: what will not travel to a
 * phone, named before anything is written — the plan's own refusals (the same ones the React preflight counts), what
 * the Swift printer does not print yet, and the CSS looks a phone has no counterpart for.
 *
 * @module emit/swift/emitSwift
 */

import type { ExportIR } from '../../ir/types';
import { type Catalog, CatalogIndex } from '../../catalog';
import { planProject } from '../../analyze/plan';
import { routedPages } from '../scaffold';
import { camelCase } from '../naming';
import { Theme } from './theme';
import { printView, structNameOf, swiftString, type SwiftLoss } from './view';
import { SUPPORT_SWIFT } from './support';
import { projectPbxproj } from './xcodeproj';

export interface SwiftPreflight {
  appName: string;
  views: string[];
  /** Plan-layer refusals: the same nodes the React export leaves out, for the same reasons. */
  planRefusals: Array<{ component: string; nodeId: string; name: string; reason: string }>;
  /** What the Swift printer read in the plan and does not print yet. */
  swiftLosses: SwiftLoss[];
  /** CSS declarations with no SwiftUI counterpart, by declaration, with the nodes that carry them. */
  webOnly: Array<{ decl: string; nodes: string[] }>;
}

export interface EmittedSwiftApp {
  files: Record<string, string>;
  preflight: SwiftPreflight;
}

/** A page's file base as its route case: `Read` → `read`. */
function routeName(fileBase: string): string {
  const c = camelCase(fileBase);
  return c.charAt(0).toLowerCase() + c.slice(1);
}

/** "Story engine" → "StoryEngine". */
function typeName(name: string): string {
  const t = name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');
  return /^[A-Za-z]/.test(t) ? t : `App${t}`;
}

export function emitSwiftApp(ir: ExportIR, catalog: Catalog): EmittedSwiftApp {
  const index = new CatalogIndex(catalog);
  const project = planProject(ir, index);
  const theme = new Theme(ir.project.designTokens);
  const appName = typeName(ir.project.name || 'App');
  const libraryName = `${appName}Kit`;
  const files: Record<string, string> = {};

  // The routes: one case per routed page, the router's start page first.
  const pages = routedPages(ir);
  const router = ir.project.routers[0];
  const routeCase = new Map<string, string>(); // legacy path → case
  const routeByUrl = new Map<string, string>(); // url path → case
  for (const page of pages) {
    const name = routeName(page.fileBase);
    routeCase.set(`/${page.componentPath}`, name);
    routeByUrl.set(page.urlPath, name);
  }

  const structByLegacy = new Map<string, string>();
  for (const plan of project.plans) if (plan.file && !plan.hook) structByLegacy.set(plan.legacyPath, structNameOf(plan));

  const losses: SwiftLoss[] = [];
  const webOnly = new Map<string, string[]>();
  const views: string[] = [];
  for (const plan of project.plans) {
    if (!plan.file || plan.hook) continue;
    const component = ir.components.find((c) => c.path === plan.path)!;
    const printed = printView(plan, {
      project,
      catalog: index,
      theme,
      styles: ir.project.styles,
      nodesOf: (path) => (path === plan.path ? component.nodes : (ir.components.find((c) => c.path === path)?.nodes ?? [])),
      structOf: (legacy) => structByLegacy.get(legacy),
      routeOf: (url) => routeByUrl.get(url)
    });
    files[`Sources/${libraryName}/Views/${printed.struct}.swift`] = printed.source;
    views.push(printed.struct);
    losses.push(...printed.losses);
    for (const w of printed.webOnly) {
      const list = webOnly.get(w.decl) ?? [];
      list.push(`${w.component}#${w.nodeId}`);
      webOnly.set(w.decl, list);
    }
  }

  // Logic components and the router shell the plan keeps no view for.
  for (const plan of project.plans) {
    if (plan.hook) losses.push({ component: plan.path, nodeId: '', what: 'a logic component: its Functions run in S2, in the JavaScriptCore host' });
  }

  const startLegacy = router?.startPage ?? (pages[0] ? `/${pages[0].componentPath}` : undefined);
  const startCase = startLegacy ? routeCase.get(startLegacy) : undefined;
  const cases = pages.map((p) => ({ name: routeName(p.fileBase), struct: structByLegacy.get(`/${p.componentPath}`) }));
  files[`Sources/${libraryName}/Router.swift`] = [
    '// @nodegx:generated (EXP-022) — the Router: which page is showing. A navigate replaces the page, as the web router does.',
    'import SwiftUI',
    '',
    'public enum Route: Hashable {',
    ...cases.map((c) => `  case ${c.name}`),
    '}',
    '',
    'public final class AppRouter: ObservableObject {',
    `  @Published public var current: Route${startCase ? ` = .${startCase}` : ''}`,
    '  public init() {}',
    '  public func go(_ route: Route) { current = route }',
    '}',
    '',
    '/// The app: the page the router shows.',
    'public struct RootView: View {',
    '  @StateObject private var router = AppRouter()',
    '  public init() {}',
    '  public var body: some View {',
    '    Group {',
    '      switch router.current {',
    ...cases.map((c) => `      case .${c.name}: ${c.struct ? `${c.struct}()` : 'EmptyView()'}`),
    '      }',
    '    }',
    '    .environmentObject(router)',
    '  }',
    '}',
    ''
  ].join('\n');
  files[`Sources/${libraryName}/Support.swift`] = SUPPORT_SWIFT;
  files[`Sources/${libraryName}/Theme.swift`] = theme.source();
  files['Package.swift'] = [
    '// swift-tools-version:5.9',
    '// @nodegx:generated (EXP-022)',
    'import PackageDescription',
    '',
    'let package = Package(',
    `  name: ${swiftString(libraryName)},`,
    '  platforms: [.iOS(.v17), .macOS(.v14)],',
    `  products: [.library(name: ${swiftString(libraryName)}, targets: [${swiftString(libraryName)}])],`,
    `  targets: [.target(name: ${swiftString(libraryName)})]`,
    ')',
    ''
  ].join('\n');
  files[`App/${appName}App.swift`] = [
    '// @nodegx:generated (EXP-022) — the app target\'s one file; everything else is the package.',
    'import SwiftUI',
    `import ${libraryName}`,
    '',
    '@main',
    `struct ${appName}App: App {`,
    '  var body: some Scene {',
    '    WindowGroup { RootView() }',
    '  }',
    '}',
    ''
  ].join('\n');
  files[`${appName}.xcodeproj/project.pbxproj`] = projectPbxproj({
    appName,
    libraryName,
    bundleId: `io.nodegx.export.${appName.toLowerCase()}`
  });

  const planRefusals = project.plans.flatMap((p) =>
    p.refusals.map((r) => ({ component: p.path, nodeId: r.nodeId, name: r.label ?? r.displayName, reason: r.reason }))
  );
  const preflight: SwiftPreflight = {
    appName,
    views,
    planRefusals,
    swiftLosses: losses,
    webOnly: [...webOnly.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([decl, nodes]) => ({ decl, nodes }))
  };
  files['EXPORT-PREFLIGHT.md'] = renderSwiftPreflight(preflight);
  files['README.md'] = [
    `# ${appName} — exported to Swift by NodeGX`,
    '',
    `- **Open \`${appName}.xcodeproj\` in Xcode** and press Run, or build without Xcode open:`,
    `  \`xcodebuild -project ${appName}.xcodeproj -scheme ${appName} -destination 'generic/platform=iOS Simulator' build\`.`,
    `- **Everything you edit is in \`Sources/${libraryName}/\`** — one SwiftUI view per component, \`Theme.swift\` for the`,
    '  design tokens, `Router.swift` for the pages. `swift build` builds it on a Mac with no simulator.',
    '- **`EXPORT-PREFLIGHT.md`** says what did not travel to the phone, by name.',
    ''
  ].join('\n');

  const sorted: Record<string, string> = {};
  for (const k of Object.keys(files).sort()) sorted[k] = files[k];
  return { files: sorted, preflight };
}

export function renderSwiftPreflight(p: SwiftPreflight): string {
  const lines = [
    `# Before you export to Swift — ${p.appName}`,
    '',
    `**${p.views.length} views**: ${p.views.join(', ')}.`,
    '',
    `## Left out by the plan (${p.planRefusals.length}) — the same nodes the React export leaves out`,
    ''
  ];
  for (const r of p.planRefusals) lines.push(`- \`${r.component}\` "${r.name}" — ${r.reason}`);
  lines.push('', `## Read in the plan, not printed by the Swift target yet (${p.swiftLosses.length})`, '');
  for (const l of p.swiftLosses) lines.push(`- \`${l.component}\`${l.nodeId ? ` ${l.label ? `"${l.label}"` : l.nodeId}` : ''} — ${l.what}`);
  lines.push('', `## Looks a phone has no counterpart for (${p.webOnly.length} kinds)`, '');
  for (const w of p.webOnly) lines.push(`- \`${w.decl}\` — ${w.nodes.length} node${w.nodes.length === 1 ? '' : 's'}: ${w.nodes.join(', ')}`);
  lines.push('');
  return lines.join('\n');
}
