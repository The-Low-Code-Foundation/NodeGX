/**
 * EXP-022 S1 — the same plan, printed in SwiftUI.
 *
 * story-engine (the smaller of the two smallest templates by node count, 88 to pixel-game's 97, and the one whose first page
 * uses only §3's visual tier) goes through `emitSwiftApp`, which reads the plan the React export reads. These assertions
 * are on the printed text; the build and the simulator screenshot are in `dev-docs/tasks/phase-18-code-export-v2/exp-022/s1/`
 * (`xcodebuild` is a heavy job and does not run inside the package suite). `NODEGX_SWIFT_BUILD=1` adds a `swift build` of
 * the package on macOS.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CatalogIndex, loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { planProject } from '../src/analyze/plan';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';

const STORY = path.join(__dirname, '..', '..', '..', 'templates', 'story-engine');
const catalog = loadCatalog();
const ir = parseProject(STORY, catalog);
const app = emitSwiftApp(ir, catalog);
const kit = 'Sources/StoryEngineKit';

describe('EXP-022 S1: story-engine as a Swift package', () => {
  it('writes the package, one view per drawn component, and the app target that wraps it', () => {
    expect(Object.keys(app.files)).toEqual([
      'App/StoryEngineApp.swift',
      'EXPORT-PREFLIGHT.md',
      'Package.swift',
      'README.md',
      `${kit}/Router.swift`,
      `${kit}/Support.swift`,
      `${kit}/Theme.swift`,
      `${kit}/Views/CarriedView.swift`,
      `${kit}/Views/ChoiceView.swift`,
      `${kit}/Views/PassageView.swift`,
      `${kit}/Views/PasterView.swift`,
      `${kit}/Views/ReadPageView.swift`,
      `${kit}/Views/RemixPageView.swift`,
      `${kit}/Views/SidebarView.swift`,
      'StoryEngine.xcodeproj/project.pbxproj'
    ]);
    // A view for every component the React export writes a file for, except the logic component (a hook there).
    const plan = planProject(ir, new CatalogIndex(catalog));
    const drawn = plan.plans.filter((p) => p.file && !p.hook).map((p) => `${p.file!.symbol}View`).sort();
    expect([...app.preflight.views].sort()).toEqual(drawn);
  });

  it('is deterministic: the same project prints the same files, the project file included', () => {
    expect(emitSwiftApp(parseProject(STORY, catalog), catalog).files).toEqual(app.files);
  });

  it('prints the plan\'s decisions: the start page, a navigate, a States value, a mounted', () => {
    const router = app.files[`${kit}/Router.swift`];
    expect(router).toContain('@Published public var current: Route = .read');
    expect(router).toContain('case .remix: RemixPageView()');
    const read = app.files[`${kit}/Views/ReadPageView.swift`];
    expect(read).toContain('router.go(.remix)');
    expect(read).toContain('@State var whatThePageHasToSayInWords: String = "reading"');
    expect(read).toContain('if JS.truthy(Self.WHAT_THE_PAGE_HAS_TO_SAY_IN_WORDS_STATES[whatThePageHasToSayInWords]?["note"]) {');
    // The Restart press runs a refused chain: the button draws, its press does nothing, and the preflight says why.
    expect(read).toContain('// Nothing is wired to this press.');
    const passage = app.files[`${kit}/Views/PassageView.swift`];
    // A bound color replaces the static one (SwiftUI's innermost foregroundStyle wins).
    expect(passage).toContain('.foregroundStyle(Theme.color(JS.show(Self.READING_AN_ENDING_OR_A_PASSAGE_THAT_IS_NOT_THERE_STATES[readingAnEndingOrAPassageThatIsNotThere]?["tone"])) ?? Color.primary)');
    expect(passage).not.toContain('.foregroundStyle(Theme.primary)\n      .foregroundStyle(Theme.color');
    const sidebar = app.files[`${kit}/Views/SidebarView.swift`];
    expect(sidebar).toContain('ForEach(Array(JS.rows(things).enumerated()), id: \\.offset) { _, row in');
    expect(sidebar).toContain('CarriedView(thing: JS.show(JS.field(row, "thing")))');
  });

  it('writes the tokens the views read, and only those', () => {
    const theme = app.files[`${kit}/Theme.swift`];
    expect(theme).toContain('public static let primary: Color = Color(hex: 0x8a4f16)');
    expect(theme).toContain('public static let space6: CGFloat = 24');
    expect(theme).toContain('public static let fontSemibold: Font.Weight = .semibold');
    // story-engine declares 193 tokens; the views read a few dozen.
    const members = theme.match(/public static let /g)!.length;
    expect(members).toBeGreaterThan(20);
    expect(members).toBeLessThan(60);
  });

  it('names, before writing, what will not travel to a phone', () => {
    const p = app.preflight;
    // The plan's own refusals: the same nodes the React export leaves out.
    const plan = planProject(ir, new CatalogIndex(catalog));
    expect(p.planRefusals.map((r) => r.nodeId)).toEqual(plan.plans.flatMap((x) => x.refusals.map((r) => r.nodeId)));
    expect(p.planRefusals.map((r) => r.name)).toContain('Take what that choice gives you');
    // What the Swift printer read and does not print yet, by name.
    const losses = p.swiftLosses.map((l) => `${l.component} ${l.nodeId} ${l.what}`);
    expect(losses).toContain('Story/Source  a logic component: its Functions run in S2, in the JavaScriptCore host');
    expect(losses.some((l) => l.startsWith('Pages/Read rdSide its things reads a store (storyCarrying, untyped)'))).toBe(true);
    expect(losses.some((l) => l.startsWith('Pages/Read rdChoices the For Each\'s rows are not drawn'))).toBe(true);
    // CSS a phone has no counterpart for: the project's stylesheet classes.
    expect(p.webOnly.map((w) => w.decl)).toContain('cssClassName: pressable');
    expect(app.files['EXPORT-PREFLIGHT.md']).toContain(`## Left out by the plan (${p.planRefusals.length})`);
  });

  it('wraps the package in an iOS app target that depends on it', () => {
    const pbx = app.files['StoryEngine.xcodeproj/project.pbxproj'];
    expect(pbx).toContain('isa = XCLocalSwiftPackageReference;');
    expect(pbx).toContain('productName = StoryEngineKit;');
    expect(pbx).toContain('PRODUCT_BUNDLE_IDENTIFIER = io.nodegx.export.storyengine;');
    expect(pbx).toContain('SDKROOT = iphoneos;');
  });

  const swiftBuild = process.env.NODEGX_SWIFT_BUILD === '1' && process.platform === 'darwin' ? it : it.skip;
  swiftBuild(
    'builds on macOS (swift build)',
    () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exp022-'));
      for (const [rel, text] of Object.entries(app.files)) {
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), text);
      }
      execFileSync('swift', ['build'], { cwd: dir, stdio: 'pipe' });
    },
    300_000
  );
});
