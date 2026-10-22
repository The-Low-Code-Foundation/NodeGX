/**
 * EXP-022 S2 — the plan's logic, printed in SwiftUI, and the Functions run in JavaScriptCore.
 *
 * S1 printed the visual tier. S2 prints what React's sessions decided about *when* things run — a logic component as a
 * view that draws nothing (React's hook), a signal input's pulse, a lifted value's push, a Function's run and its pulses,
 * an arrival run, the States moves, the app's Variables — and runs every Function body verbatim in one `JSContext`,
 * through the web export's own runner (`functionRun.ts`, compiled to JavaScript).
 *
 * §A grades it the way the React arm is graded (`a-logic-component-is-a-hook.test.ts`): the Hook Desk, driven step by step
 * in the exported SwiftUI app (`helpers/export-swift-arm.ts`, `swift test` on macOS, no simulator), against the runtime's
 * own nodes (`helpers/runtime-mounted-arm.js`), predicted in `s136-hooks/EXPECTED.md`. Behind `NODEGX_SWIFT_BUILD=1`, as
 * S1's build is: a `swift build` is a heavy job. §B is what is printed, §C is todo-list, S2's work list.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';
import { functionRunLibSource } from '../src/emit/functionRunLib';
import { FUNCTION_RUN_JS } from '../src/emit/swift/functionRunJs';
import { parseArgs } from '../src/cli/args';
import { runCli } from '../src/cli/run';
import { EXIT } from '../src/cli/exitCodes';
import { writeHookDesk } from './helpers/hook-desk';
import { swiftArm } from './helpers/export-swift-arm';

const catalog = loadCatalog();
const desk = writeHookDesk();
const app = emitSwiftApp(parseProject(desk.dir, catalog), catalog);
const kit = 'Sources/HookDeskKit';
const TODO = path.join(__dirname, '..', '..', '..', 'templates', 'todo-list');
const todo = emitSwiftApp(parseProject(TODO, catalog), catalog);

const STEPS = ['More', 'Go A', 'Go B', 'Go A', 'More', 'pick b', 'pick a', 'More', 'pick c'];
const building = process.env.NODEGX_SWIFT_BUILD === '1' && process.platform === 'darwin';
const swiftIt = building ? it : it.skip;

/** The runtime's own nodes, in a child process (as `a-logic-component-is-a-hook.test.ts` runs them). */
const runtimeArm = (dir: string, scenarios: string[][]): string[][][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-mounted-arm.js')], {
        input: JSON.stringify([{ dir, scenarios }]),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    )[0];
  } catch (e) {
    return scenarios.map(() => [[`the runtime arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]]);
  }
};
/** P18-S122-TEXTDEFAULT: a wired Text the wire has not reached shows the word "Text" in the runtime; an export draws ''. */
const withoutDefault = (rows: string[][]): string[][] => rows.map((r) => r.map((c) => (c === 'Text' ? '' : c)));

describe('§A the exported SwiftUI app does what the runtime does, step by step (swift test on macOS)', () => {
  const swift = building ? swiftArm('hook-desk', app, [STEPS])[0] : [];
  const runtime = building ? runtimeArm(desk.dir, [STEPS])[0] : [];

  swiftIt('A1 the desk: the Swift app reads exactly what the runtime reads, at every step, but the word "Text"', () => {
    expect(runtime).toHaveLength(STEPS.length + 1);
    expect(swift).toEqual(withoutDefault(runtime));
  });

  swiftIt('A2 a logic component with no Run computes at load and feeds another: y 0, "y is 0", then 2 and "y is 2" after More', () => {
    expect(swift.slice(0, 2).map((r) => r.slice(0, 2))).toEqual([['0', 'y is 0'], ['2', 'y is 2']]);
  });

  swiftIt('A3 a signal into a logic component runs its Function once; the signal it sends runs the page\'s chain; two placements keep two totals', () => {
    expect(swift[2].slice(2, 5)).toEqual(['total 1', '', 'dones 1']);
    expect(swift[4].slice(2, 5)).toEqual(['total 2', 'total 10', 'dones 3']);
  });

  swiftIt('A4 a value and the signal sent with it reach another logic component in that order (the delivered count)', () => {
    expect(swift.slice(0, 6).map((r) => r[5])).toEqual(['', '', 'echo total 1', 'echo total 1', 'echo total 2', 'echo total 2']);
  });

  swiftIt('A5 an arrival run (it reads the clock) runs at load and on each arrival', () => {
    expect(swift.slice(0, 6).map((r) => r[6])).toEqual(['rows 0', 'rows 3', 'rows 3', 'rows 3', 'rows 3', 'rows 6']);
  });

  swiftIt('A6 a logic component\'s list draws the For Each\'s rows, and the row pressed is the row picked', () => {
    expect(swift.map((r) => r.slice(7, -1).length)).toEqual([1, 2, 2, 2, 2, 3, 3, 3, 3, 3]);
    expect(swift.map((r) => r[r.length - 1])).toEqual(['', '', '', '', '', '', 'picked b', 'picked a', 'picked a', 'picked c']);
  });
});

describe('§B what is printed', () => {
  const home = app.files[`${kit}/Views/HomePageView.swift`] ?? '';
  const tally = app.files[`${kit}/Logic/TallyLogic.swift`] ?? '';
  const double = app.files[`${kit}/Logic/DoubleLogic.swift`] ?? '';

  it('B1 each logic component is a view of its own that draws nothing, and the page places all eight where the graph does', () => {
    expect(app.preflight.logic.sort()).toEqual(['DoubleLogic', 'EchoLogic', 'LabelLogic', 'PickerLogic', 'ShelfLogic', 'StampLogic', 'TallyLogic']);
    expect(tally).toContain('struct TallyLogic: View {');
    expect(tally).toContain('    Logic {}');
    expect(home).toContain('.background { Logic { logic0; logic1 } }');
    expect(home.match(/^ {4}TallyLogic\(/gm)).toHaveLength(2);
    expect(home).toContain('    DoubleLogic(x: JS.field(bumpOut, "n"), onYChanged: { y = $0 })');
  });

  it('B2 the boundary is React\'s: values, a pulse, a signal out, a lifted value', () => {
    expect(tally).toContain('  var go: Pulse? = nil');
    expect(tally).toContain('  var onDone: () -> Void = {}');
    expect(tally).toContain('  var onTotalChanged: (Any?) -> Void = { _ in }');
    expect(tally).toContain('.onChange(of: go?.sent, initial: true) { _, _ in');
    expect(tally).toContain('guard let go, go.taken.current != go.sent else { return }');
    expect(tally).toMatch(/for workPulse in workRun\.pulses \{\n\s+if workPulse\.signal == "done" \{\n\s+onDone\(\)/);
    expect(home).toContain('EchoLogic(said: total, take: Pulse(sent: echoTakeDelivered, taken: echoTakeTaken), onEchoChanged: { echo = $0 })');
    // A render run is a memo over its inputs (P18-S138-LIFTLOOP's rule).
    expect(double).toContain('workMemo.value(Same(x)) { Scripts.shared.call("Logic/Double/Work", ["x": x]) }');
  });

  it('B3 the Functions are files of their own, the body verbatim, registered by component and name', () => {
    const work = app.files[`${kit}/Scripts/functions/Logic/Tally/Work.js`] ?? '';
    expect(work).toContain('__nodegx.define("Logic/Tally/Work", function (Inputs, Outputs, self, Component) {');
    expect(work).toContain("this.total = (this.total || 0) + (Number(Inputs.step) || 0);\nOutputs.total = 'total ' + this.total;\nOutputs.done();");
    expect(work).toContain('}).call(self);');
    expect(app.files[`${kit}/Functions.swift`]).toContain('"Pages/Home/Bump",');
    expect(app.files['Package.swift']).toContain('.target(name: "HookDeskKit", resources: [.copy("Scripts")]),');
  });

  it('B4 the runner is the web export\'s own: functionRun.ts compiled to JavaScript, the same text', () => {
    const compiled = ts.transpileModule(functionRunLibSource(), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, removeComments: true }
    }).outputText;
    expect(FUNCTION_RUN_JS).toBe(compiled.replace(/^export /gm, '').trimEnd() + '\n');
    expect(app.files[`${kit}/Scripts/nodegx-host.js`]).toContain(FUNCTION_RUN_JS);
  });

  it('B5 the lifted list is the For Each\'s items, and a row\'s signal writes the row\'s id before it pulses (§108)', () => {
    expect(home).toContain('ForEach(Array(JS.rows(rows2).enumerated()), id: \\.offset) { index, row in');
    expect(home).toMatch(/onPick: \{\n\s+relayedId = JS\.field\(row, "id"\)\n\s+pickerGoPulses \+= 1\n/);
  });

  it('B6 every Text and Button says which graph node drew it, in page order (the seam the Swift arm reads)', () => {
    expect(home).toContain('.node(1, "yText", text: JS.show(y))');
    expect(home).toContain('.node(0, "moreBtn", label: "More", press: moreBtnPressed)');
  });
});

describe('§C todo-list, S2\'s work list', () => {
  const losses = todo.preflight.swiftLosses.map((l) => `${l.component} ${l.label ?? l.nodeId} — ${l.what}`);
  /** What S3 carries (the backend through the one client) and what the React export leaves undrawn too. */
  const BACKEND = /a api-call action|a query-fetch action|session-get expression|query-get expression|a record query|reads Noodl/;
  const REACT_TOO = /the plan feeds it no items, so the React export does not draw its rows either/;

  it('C1 of the 334 things S1 read and did not print, S2 left 44 (39 the backend); with S3\'s backend, 5 are left, each undrawn in React too', () => {
    expect(losses).toHaveLength(5);
    expect(losses.filter((l) => !REACT_TOO.test(l))).toEqual([]);
    expect(losses.filter((l) => BACKEND.test(l))).toEqual([]);
  });

  it('C2 every logic component is printed, and every Function body travels, run or not', () => {
    expect(todo.preflight.logic).toHaveLength(36);
    const fns = Object.keys(todo.files).filter((f) => f.includes('/Scripts/functions/'));
    expect(fns).toHaveLength(64);
    // S2 carried four and ran none of them; the two that run only in chains behind the session (the link's task and its
    // Today) run since S3, behind `session.read("authenticated")`, where the React export runs them.
    const home = todo.files['Sources/TodoListKit/Views/TodoPageView.swift'] ?? '';
    expect(home).toContain('"Pages/Todo/Which_task_did_the_link_ask_for"');
    expect(home).toContain('"Pages/Todo/Did_the_link_ask_for_Today"');
    expect(home).toMatch(/if JS\.truthy\(session\.read\("authenticated"\)\) \{\n\s+yourListFromTheBackendRefreshPulses \+= 1\n\s+let whichTaskDidTheLinkAskForRun/);
    expect(home).toContain('"Pages/Todo/A_minute_clock_and_a_wake_when_the_app_comes_back_into_view"');
  });

  it('C3 AC3: the ten Functions that touch the browser are named before anything is written, not dropped', () => {
    expect(todo.preflight.browserScripts.map((f) => `${f.component} ${f.name}`)).toEqual([
      'Pages/Todo A_minute_clock_and_a_wake_when_the_app_comes_back_into_view',
      'Pages/Todo Which_task_did_the_link_ask_for',
      'Pages/Todo Did_the_link_ask_for_Today',
      'Pages/Todo What_this_device_chose',
      'Pages/Todo Remember_the_choice_on_this_device',
      'Projects/View What_this_device_chose',
      'Projects/View Remember_By_kind_on_this_device',
      'Projects/View Remember_Most_urgent_first_on_this_device',
      'Todo/Reminders switch Ask_the_host_to_turn_reminders_on_or_off',
      'Todo/Theme switch Switch_to_the_other_theme'
    ]);
    expect(todo.files['EXPORT-PREFLIGHT.md']).toContain('## Functions that touch the browser (10)');
  });

  swiftIt(
    'C4 it builds on macOS, draws its first page and loads all 64 Functions without a JavaScript error (swift test)',
    () => {
      const dir = path.join(os.tmpdir(), 'nodegx-swift-arm', 'todo-list');
      for (const [rel, text] of Object.entries(todo.files)) {
        const file = path.join(dir, rel);
        if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === text) continue;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
      }
      const out = execFileSync('nice', ['-n', '19', 'swift', 'test'], { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
      expect(out).toContain("Test Case '-[TodoListKitTests.TodoListTests testTheFirstPageDraws]' passed");
      expect(out).toContain("Test Case '-[TodoListKitTests.TodoListTests testEveryFunctionLoads]' passed");
      expect(out.split('\n').filter((l) => l.startsWith('[js'))).toEqual([]);
    },
    600_000
  );
});

describe('§D nodegx export --target swift', () => {
  it('D1 the target is a value the export takes, react by default, and a target that is not one is a usage error', () => {
    expect(parseArgs(['export', 'app', 'out'])).toMatchObject({ kind: 'export', target: 'react' });
    expect(parseArgs(['export', '--target', 'swift', 'app', 'out'])).toMatchObject({ kind: 'export', projectDir: 'app', outDir: 'out', target: 'swift' });
    expect(parseArgs(['export', 'app', 'out', '--target', 'kotlin'])).toMatchObject({ kind: 'usage' });
    expect(parseArgs(['export', 'app', '--target'])).toMatchObject({ kind: 'usage' });
  });

  it('D2 it writes the Swift package, and its dry run prints the Swift pre-flight and writes nothing', () => {
    const story = path.join(__dirname, '..', '..', '..', 'templates', 'story-engine');
    const said: string[] = [];
    const io = { out: (t: string) => said.push(t), err: () => undefined };
    expect(runCli(['export', '--dry-run', '--target', 'swift', story], io)).toBe(EXIT.refusals);
    expect(said.join('')).toContain('# Before you export to Swift — StoryEngine');
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'exp022-cli-'));
    said.length = 0;
    expect(runCli(['export', '--target', 'swift', story, out, '--force'], io)).toBe(EXIT.ok);
    expect(fs.existsSync(path.join(out, 'StoryEngine.xcodeproj', 'project.pbxproj'))).toBe(true);
    expect(fs.readFileSync(path.join(out, 'Sources', 'StoryEngineKit', 'Logic', 'SourceLogic.swift'), 'utf-8')).toContain('struct SourceLogic: View {');
    expect(said.join('')).toContain('open StoryEngine.xcodeproj in Xcode');
  });
});
