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
import { ident, printView, structNameOf, swiftString, type SwiftLoss } from './view';
import { SUPPORT_SWIFT } from './support';
import { functionFileJs, functionId, HOST_JS, SCRIPTS_SWIFT } from './scripts';
import { clientModulesJs } from './client';
import { emitApp } from '../emitApp';
import { projectPbxproj } from './xcodeproj';
import type { JsFunctionPlan } from '../../analyze/plan';

export interface SwiftPreflight {
  appName: string;
  views: string[];
  /** The logic components, each a `…Logic` view that draws nothing (React's hooks). */
  logic: string[];
  /** Plan-layer refusals: the same nodes the React export leaves out, for the same reasons. */
  planRefusals: Array<{ component: string; nodeId: string; name: string; reason: string }>;
  /** What the Swift printer read in the plan and does not print yet. */
  swiftLosses: SwiftLoss[];
  /**
   * AC3. The Functions whose bodies touch the browser (EXP-019's classifier: `document`, `window`, `localStorage`, a url).
   * They run in the JavaScriptCore host like every other; what they read of a browser is not there on a phone, so each is
   * named here, before anything is written, never dropped.
   */
  browserScripts: Array<{ component: string; name: string; nodeId: string }>;
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
  for (const plan of project.plans) if (plan.file) structByLegacy.set(plan.legacyPath, structNameOf(plan));
  // The app-wide Variables (EXP-011 Tier 1.4): one `@Published` member each on `Variables`, as `src/stores/variables.ts` is.
  const variableMember = new Map(project.variables.map((v) => [v.name, ident(v.exportName)]));

  const losses: SwiftLoss[] = [];
  const webOnly = new Map<string, string[]>();
  const views: string[] = [];
  const logic: string[] = [];
  const functions: Array<{ plan: (typeof project.plans)[number]; def: JsFunctionPlan }> = [];
  for (const plan of project.plans) {
    if (!plan.file) continue;
    const component = ir.components.find((c) => c.path === plan.path)!;
    const printed = printView(plan, {
      project,
      catalog: index,
      theme,
      styles: ir.project.styles,
      nodesOf: (path) => (path === plan.path ? component.nodes : (ir.components.find((c) => c.path === path)?.nodes ?? [])),
      structOf: (legacy) => structByLegacy.get(legacy),
      routeOf: (url) => routeByUrl.get(url),
      variableOf: (name) => variableMember.get(name)
    });
    files[`Sources/${libraryName}/${plan.hook ? 'Logic' : 'Views'}/${printed.struct}.swift`] = printed.source;
    (plan.hook ? logic : views).push(printed.struct);
    losses.push(...printed.losses);
    // Every Function body travels, run or not (the React export keeps a refused one's body as a comment): the code is theirs.
    for (const def of Object.values(plan.jsFunctions)) {
      if (def.kind === 'function') functions.push({ plan, def });
      else losses.push({ component: plan.path, nodeId: def.nodeId, what: `${def.kind === 'expression' ? 'an Expression' : 'a Visual Function'} node is not carried by the Swift target yet` });
    }
    for (const w of printed.webOnly) {
      const list = webOnly.get(w.decl) ?? [];
      list.push(`${w.component}#${w.nodeId}`);
      webOnly.set(w.decl, list);
    }
  }

  // The Functions the components run: one file each, verbatim, and the host that runs them (EXP-022 S2).
  functions.sort((a, b) => functionId(a.plan, a.def).localeCompare(functionId(b.plan, b.def)));
  for (const { plan, def } of functions) files[`Sources/${libraryName}/Scripts/functions/${functionId(plan, def)}.js`] = functionFileJs(plan, def);
  files[`Sources/${libraryName}/Scripts/nodegx-host.js`] = HOST_JS;
  files[`Sources/${libraryName}/Scripts.swift`] = SCRIPTS_SWIFT;
  // EXP-022 S3. The backend client: the web export's own api modules and Noodl API, the same text, its types taken out.
  const client = clientModulesJs(emitApp(ir, catalog).files);
  for (const mod of client) files[`Sources/${libraryName}/Scripts/client/${mod.name}.js`] = mod.js;
  // EXP-022 S7. The Global Stores: each the web export's own module, held as a `JSStore` the views read and write.
  const stores = project.stores.filter((s) => s.deferred === undefined && client.some((m) => m.name === `stores/${s.exportName}`));
  if (stores.length > 0) {
    files[`Sources/${libraryName}/Stores.swift`] = [
      "// @nodegx:generated (EXP-022 S7) — the app's Global Stores: each one the web export's own module (`Scripts/client/stores/`),",
      "// `@nodegx/core`'s `store()`, run in the app's JavaScriptCore context. Any view reads and writes it by key.",
      'import JavaScriptCore',
      '',
      'public enum Stores {',
      ...stores.map((s) => `  /// "${s.name}".\n  public static var ${ident(s.exportName)}: JSStore { JSStore.named(${swiftString(`stores/${s.exportName}`)}, ${swiftString(s.exportName)}) }`),
      '}',
      ''
    ].join('\n');
  }
  const list = (items: string[]) => (items.length ? ['', ...items.map((x, i) => `    ${swiftString(x)}${i < items.length - 1 ? ',' : ''}`), '  '] : []).join('\n');
  files[`Sources/${libraryName}/Functions.swift`] = [
    '// @nodegx:generated (EXP-022) — the files the app loads into its JavaScriptCore context, in this order, and the',
    '// Variables a Function reads and writes through `Noodl.Variables`.',
    'extension Scripts {',
    `  /// The web export's backend client, one module each (\`Scripts/client/\`).`,
    `  static let clientModules: [String] = [${list(client.map((m) => m.name))}]`,
    `  /// The Functions (\`Scripts/functions/\`).`,
    `  static let functionFiles: [String] = [${list(functions.map(({ plan, def }) => functionId(plan, def)))}]`,
    '',
    '  /// `Noodl.Variables.<name>`, read.',
    '  static func variable(_ name: String) -> Any? {',
    ...(project.variables.length
      ? ['    switch name {', ...project.variables.map((v) => `    case ${swiftString(v.name)}: return Variables.shared.${variableMember.get(v.name)}`), '    default: return nil', '    }']
      : ['    nil']),
    '  }',
    '',
    '  /// `Noodl.Variables.<name> = value`.',
    '  static func setVariable(_ name: String, _ value: Any?) {',
    ...(project.variables.length
      ? ['    switch name {', ...project.variables.map((v) => `    case ${swiftString(v.name)}: Variables.shared.${variableMember.get(v.name)} = value`), '    default: break', '    }']
      : []),
    '  }',
    '}',
    ''
  ].join('\n');
  if (project.variables.length > 0) {
    files[`Sources/${libraryName}/Variables.swift`] = [
      '// @nodegx:generated (EXP-022) — the app-wide Variables: one value each, read and written by any component.',
      'import SwiftUI',
      '',
      'public final class Variables: ObservableObject {',
      '  public static let shared = Variables()',
      ...project.variables.map((v) => `  /// "${v.name}"${v.writers.length ? `, written by ${v.writers.map((w) => `${w.nodeType} on /${w.componentPath}`).join(', ')}` : ', with no statically-known writer'}.\n  @Published public var ${variableMember.get(v.name)}: Any? = nil`),
      '  public init() {}',
      '}',
      ''
    ].join('\n');
  }

  const startLegacy = router?.startPage ?? (pages[0] ? `/${pages[0].componentPath}` : undefined);
  const startCase = startLegacy ? routeCase.get(startLegacy) : undefined;
  // P18-EXP022-S5-NOROUTE. A project with no routed page (components only) still gets a Router that builds: one case that
  // draws nothing. An empty enum held by a `@Published` with no value crashed the compiler (Swift 6.2.4, SILGen).
  const routed = pages.map((p) => ({ name: routeName(p.fileBase), struct: structByLegacy.get(`/${p.componentPath}`) }));
  const cases = routed.length ? routed : [{ name: 'none', struct: undefined }];
  const initialCase = startCase ?? cases[0].name;
  files[`Sources/${libraryName}/Router.swift`] = [
    '// @nodegx:generated (EXP-022) — the Router: which page is showing. A navigate replaces the page, as the web router does.',
    'import SwiftUI',
    '',
    'public enum Route: Hashable {',
    ...cases.map((c) => `  case ${c.name}`),
    '}',
    '',
    'public final class AppRouter: ObservableObject {',
    `  @Published public var current: Route = .${initialCase}`,
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
    '  targets: [',
    `    .target(name: ${swiftString(libraryName)}, resources: [.copy("Scripts")]),`,
    `    .testTarget(name: ${swiftString(`${libraryName}Tests`)}, dependencies: [${swiftString(libraryName)}])`,
    '  ]',
    ')',
    ''
  ].join('\n');
  files[`Tests/${libraryName}Tests/${appName}Tests.swift`] = [
    '// @nodegx:generated (EXP-022) — `swift test` on a Mac: the app draws its first page, and its Functions load.',
    'import XCTest',
    `@testable import ${libraryName}`,
    '',
    '@MainActor',
    `final class ${appName}Tests: XCTestCase {`,
    '  func testTheFirstPageDraws() {',
    '    let drive = Drive(RootView())',
    '    defer { drive.close() }',
    '    XCTAssertFalse(drive.probe.entries.isEmpty, "the first page draws nothing a person can read or press")',
    '  }',
    '',
    '  func testEveryFunctionLoads() {',
    '    XCTAssertEqual(Scripts.shared.defined.sorted(), Scripts.functionFiles.sorted())',
    '  }',
    '}',
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
  files[`${appName}UITests/${appName}UITests.swift`] = [
    '// @nodegx:generated (EXP-022) — `xcodebuild test` on a simulator: the app launches and draws its first page. Every',
    '// .swift file in this folder is a UI test (the folder is synchronized), so a drive is added by writing one beside it.',
    'import XCTest',
    '',
    'extension XCUIApplication {',
    '  /// The app, with the test run\'s `VITE_NODEGX_` variables in its environment: `TEST_RUNNER_VITE_NODEGX_ENDPOINT=…',
    '  /// xcodebuild test` points it at another backend, as the web build\'s `.env` does.',
    '  static func nodegx() -> XCUIApplication {',
    '    let app = XCUIApplication()',
    '    for (key, value) in ProcessInfo.processInfo.environment where key.hasPrefix("VITE_NODEGX_") { app.launchEnvironment[key] = value }',
    '    return app',
    '  }',
    '}',
    '',
    `final class ${appName}UITests: XCTestCase {`,
    '  @MainActor',
    '  func testTheAppLaunchesAndDraws() {',
    '    let app = XCUIApplication.nodegx()',
    '    app.launch()',
    '    let drawn = app.staticTexts.firstMatch.waitForExistence(timeout: 15) || app.buttons.firstMatch.exists',
    '    XCTAssertTrue(drawn, "the first page draws nothing a person can read or press")',
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
    logic,
    browserScripts: project.plans.flatMap((p) =>
      Object.values(p.jsFunctions)
        .filter((f) => f.host?.includes('touches the browser environment'))
        .map((f) => ({ component: p.path, name: f.fnName, nodeId: f.nodeId }))
    ),
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
    `- **Everything you edit is in \`Sources/${libraryName}/\`** — one SwiftUI view per component (\`Views/\`), one per logic`,
    '  component (`Logic/`, views that draw nothing), `Theme.swift` for the design tokens, `Router.swift` for the pages.',
    '- **Your Functions are in `Scripts/functions/`**, one JavaScript file each, verbatim. They run in the app\'s JavaScriptCore',
    '  context (`Scripts.swift`), through the same runner the web export uses (`Scripts/nodegx-host.js`).',
    '- `swift build` builds it on a Mac with no simulator; `swift test` draws the first page and loads the Functions.',
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
    `**${p.logic.length} logic components** (each a view that draws nothing): ${p.logic.join(', ') || 'none'}.`,
    '',
    `## Left out by the plan (${p.planRefusals.length}) — the same nodes the React export leaves out`,
    ''
  ];
  for (const r of p.planRefusals) lines.push(`- \`${r.component}\` "${r.name}" — ${r.reason}`);
  lines.push(
    '',
    `## Functions that touch the browser (${p.browserScripts.length}) — they run, but a phone has no browser around them`,
    '',
    'Each runs in the app\'s JavaScriptCore context. `window` is the global object there and `localStorage` is kept on the',
    'device; `document`, `location` and `matchMedia` are not there, so what a body reads of them reads nothing.',
    ''
  );
  for (const f of p.browserScripts) lines.push(`- \`${f.component}\` "${f.name}" (${f.nodeId})`);
  lines.push('', `## Read in the plan, not printed by the Swift target yet (${p.swiftLosses.length})`, '');
  for (const l of p.swiftLosses) lines.push(`- \`${l.component}\`${l.nodeId ? ` ${l.label ? `"${l.label}"` : l.nodeId}` : ''} — ${l.what}`);
  lines.push('', `## Looks a phone has no counterpart for (${p.webOnly.length} kinds)`, '');
  for (const w of p.webOnly) lines.push(`- \`${w.decl}\` — ${w.nodes.length} node${w.nodes.length === 1 ? '' : 's'}: ${w.nodes.join(', ')}`);
  lines.push('');
  return lines.join('\n');
}
