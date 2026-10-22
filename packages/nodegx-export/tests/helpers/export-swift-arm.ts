import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { EmittedSwiftApp } from '../../src/emit/swift/emitSwift';

/**
 * The Swift arm (EXP-022 S2): what the exported SwiftUI app draws, driven as `export-react-arm.js` drives the React one.
 *
 * The emitted package is written into a folder kept per `name` under the system temp folder (so a second run builds only
 * what changed), with one more test file in its test target: it draws `RootView()` in an off-screen window through the
 * package's own `Drive` (`Support.swift`), and for each scenario reads every Text, presses each step's Button by its label
 * and reads again, letting the page settle between (its effects, its timers, the renders they ask for). `swift test`
 * prints the readings on one line; this returns them, per scenario, one reading after load and one after each press, as the
 * other arms do. A step whose Button is not drawn reads as one cell saying so, so the row fails by name.
 *
 * macOS only, and a heavy job (a `swift build` of the package): behind `NODEGX_SWIFT_BUILD=1` in every test that calls it.
 */
export function swiftArm(name: string, app: EmittedSwiftApp, scenarios: string[][]): string[][][] {
  const dir = path.join(os.tmpdir(), 'nodegx-swift-arm', name);
  const kit = `${app.preflight.appName}Kit`;
  const files: Record<string, string> = { ...app.files };
  files[`Tests/${kit}Tests/ArmTests.swift`] = [
    '// Written by tests/helpers/export-swift-arm.ts: the scenarios, driven through the package\'s own Drive.',
    'import XCTest',
    'import Foundation',
    `@testable import ${kit}`,
    '',
    '@MainActor',
    'final class ArmTests: XCTestCase {',
    '  func testScenarios() throws {',
    `    let scenarios = try JSONDecoder().decode([[String]].self, from: Data(${rawString(JSON.stringify(scenarios))}.utf8))`,
    '    var out: [[[String]]] = []',
    '    for steps in scenarios {',
    '      let drive = Drive(RootView())',
    '      var readings = [drive.read()]',
    '      for step in steps { readings.append(drive.press(step) ? drive.read() : ["no button labelled \\(step)"]) }',
    '      drive.close()',
    '      out.append(readings)',
    '    }',
    '    let data = try JSONSerialization.data(withJSONObject: out)',
    '    print("NODEGX-READINGS " + String(data: data, encoding: .utf8)!)',
    '  }',
    '}',
    ''
  ].join('\n');
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(dir, rel);
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === text) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  // A file a previous run wrote and this one does not (a component renamed away) would still compile: remove it.
  for (const rel of listFiles(path.join(dir, 'Sources')).map((f) => path.join('Sources', f))) {
    if (!(rel.split(path.sep).join('/') in files)) fs.rmSync(path.join(dir, rel));
  }
  let output: string;
  try {
    output = execFileSync('nice', ['-n', '19', 'swift', 'test', '--filter', 'ArmTests'], { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    const said = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.split('\n').filter((l) => /error:/.test(l)).slice(0, 3).join(' | ') || String(e).split('\n')[0];
    return scenarios.map(() => [[`the Swift arm failed: ${said}`]]);
  }
  const line = output.split('\n').find((l) => l.startsWith('NODEGX-READINGS '));
  if (!line) return scenarios.map(() => [['the Swift arm printed no readings']]);
  return JSON.parse(line.slice('NODEGX-READINGS '.length));
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(path.join(dir, e.name)).map((f) => path.join(e.name, f)) : [e.name]
  );
}

/** A Swift raw string literal holding `text`, with as many `#` as it needs. */
function rawString(text: string): string {
  let hashes = '#';
  while (text.includes(`"${hashes}`)) hashes += '#';
  return `${hashes}"${text}"${hashes}`;
}
