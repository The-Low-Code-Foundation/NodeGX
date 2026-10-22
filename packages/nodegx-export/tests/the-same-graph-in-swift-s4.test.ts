/**
 * EXP-022 S4 — todo-list driven in the simulator, against a real backend.
 *
 * The drive itself (an XCUITest on the iPhone 17 simulator beside the running app and the React export in Chrome, each
 * on a fresh seeded backend) is outside the package suite, as s137's is: `xcodebuild` and a simulator are heavy jobs.
 * Its files and readings are in `dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/`. These rows grade what the drive
 * made the printer do, on the printed text:
 *
 * §A the Sign in page a person can use on a phone: the password hidden, the email keyboard with no capital letter, the
 *    label the web draws above each field drawn above it here (and said by a screen reader); a bound placeholder read;
 *    a node authored Mounted false not drawn, as the React export removes it.
 * §B the UI test target the drive runs in: every `.swift` file in `<App>UITests/` is a UI test, and the launch test the
 *    export writes points the app at the backend the test run names.
 */

import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';

const TODO = path.join(__dirname, '..', '..', '..', 'templates', 'todo-list');
const catalog = loadCatalog();
const todoIr = parseProject(TODO, catalog);
const todo = emitSwiftApp(todoIr, catalog);
const kit = 'Sources/TodoListKit';
const signIn = todo.files[`${kit}/Views/SignInPageView.swift`];

/** The lines from the one starting with `start` to the next line at the same indent that closes it. */
function block(text: string, start: string): string {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.trim().startsWith(start));
  if (i === -1) return '';
  const indent = lines[i].length - lines[i].trimStart().length;
  const end = lines.findIndex((l, j) => j > i && l.length - l.trimStart().length === indent && l.trim() === '}');
  return lines.slice(i, end + 1).join('\n');
}

describe('§A the Sign in page, on a phone', () => {
  it('A1 the password field hides what is typed (type password ⇒ SecureField); the email field asks for an address keyboard', () => {
    expect(signIn).toContain('SecureField("", text: $password)');
    expect(signIn).not.toContain('TextField("", text: $password)');
    expect(block(signIn, 'TextField("", text: $email)')).toContain('.inputKind(.email)');
    // The keyboard is a phone's: the helper is iOS-only, so the package still builds and tests on a Mac.
    expect(todo.files[`${kit}/Support.swift`]).toMatch(/case \.email: self\.keyboardType\(\.emailAddress\)\.textInputAutocapitalization\(\.never\)\.autocorrectionDisabled\(\)/);
    expect(todo.files[`${kit}/Support.swift`]).toMatch(/@ViewBuilder func inputKind\(_ kind: InputKind\) -> some View \{\n\s+#if os\(iOS\)/);
  });

  it('A2 each field wears the label the web draws above it (useLabel), styled from the label parameters, and a screen reader says it', () => {
    const email = block(signIn, 'VStack(alignment: .leading, spacing: 6) {');
    expect(email.split('\n').map((l) => l.trim()).slice(0, 5)).toEqual([
      'VStack(alignment: .leading, spacing: 6) {',
      'Text(verbatim: "Email")',
      '.font(.system(size: Theme.textSm))',
      '.foregroundStyle(Theme.foreground)',
      '.accessibilityHidden(true)'
    ]);
    expect(email).toContain('.accessibilityLabel("Email")');
    expect(email).toContain('.accessibilityIdentifier("siEmail")');
    expect(signIn).toContain('Text(verbatim: "Password")');
    expect(signIn).toContain('.accessibilityLabel("Password")');
  });

  it('A3 so the label parameters are no longer filed as looks a phone has no counterpart for', () => {
    const decls = todo.preflight.webOnly.map((w) => w.decl);
    for (const name of ['useLabel', 'label', 'labelSpacing', 'labelfontSize', 'labelcolor']) {
      expect(decls.filter((d) => d === name || d.startsWith(`${name}:`))).toEqual([]);
    }
  });

  it('A4 a placeholder the graph binds is read from the binding ("Add a task (it goes in at #4)"), not the authored text', () => {
    expect(todo.files[`${kit}/Views/TaskListView.swift`]).toContain('TextField(JS.show(placeholder), text: $newTask)');
  });

  it('A5 a node authored Mounted false, whose Mounted wire the plan does not carry, is not drawn — as the React export removes it', () => {
    const page = todo.files[`${kit}/Views/TodoPageView.swift`];
    expect(page).toContain('// tdProjectsOn: authored Mounted false, so not drawn');
    expect(page).not.toContain('"Also keep track of projects and money"');
    const react = emitApp(todoIr, catalog);
    const reactPage = Object.entries(react.files).find(([f, t]) => f.endsWith('.tsx') && t.includes('node tdProjectsOn'));
    expect(reactPage?.[1]).toContain('{/* node tdProjectsOn: authored Mounted false — removed from the tree */}');
  });

  it('A6 every drawn Text and Button carries its graph node id as its accessibility identifier, so a UI test finds a node as the graph names it', () => {
    expect(todo.files[`${kit}/Support.swift`]).toContain('return content.accessibilityIdentifier(node).onDisappear { Probe.current?.remove(key) }');
  });
});

describe('§B the UI test target', () => {
  const pbx = todo.files['TodoList.xcodeproj/project.pbxproj'];

  it('B1 the project has a UI test target for the app, whose sources are the folder TodoListUITests (a synchronized folder)', () => {
    expect(pbx).toContain('objectVersion = 77;');
    expect(pbx).toMatch(/isa = PBXFileSystemSynchronizedRootGroup;\n\s+path = TodoListUITests;/);
    expect(pbx).toContain('productType = "com.apple.product-type.bundle.ui-testing";');
    expect(pbx).toContain('TEST_TARGET_NAME = TodoList;');
    expect(pbx).toContain('PRODUCT_BUNDLE_IDENTIFIER = io.nodegx.export.todolist.uitests;');
    expect(pbx).toMatch(/fileSystemSynchronizedGroups = \(\n\s+[0-9A-F]{24} \/\* TodoListUITests \*\/,/);
    // The project lists both targets, and the test target depends on the app's.
    expect(pbx).toMatch(/targets = \(\n\s+[0-9A-F]{24} \/\* TodoList \*\/,\n\s+[0-9A-F]{24} \/\* TodoListUITests \*\/,/);
    expect(pbx).toMatch(/isa = PBXTargetDependency;\n\s+target = [0-9A-F]{24} \/\* TodoList \*\/;/);
  });

  it('B2 the launch test the export writes, and the test run\'s VITE_NODEGX_ variables handed to the app it launches', () => {
    const ui = todo.files['TodoListUITests/TodoListUITests.swift'];
    expect(ui).toContain('final class TodoListUITests: XCTestCase {');
    expect(ui).toContain('for (key, value) in ProcessInfo.processInfo.environment where key.hasPrefix("VITE_NODEGX_") { app.launchEnvironment[key] = value }');
    expect(ui).toContain('let app = XCUIApplication.nodegx()');
  });

  it('B3 the same project prints the same file: every object id is derived from its name', () => {
    expect(emitSwiftApp(todoIr, catalog).files['TodoList.xcodeproj/project.pbxproj']).toBe(pbx);
  });
});
