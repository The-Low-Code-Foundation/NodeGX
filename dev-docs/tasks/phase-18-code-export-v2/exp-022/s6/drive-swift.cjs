// EXP-022 S6 (S4's harness, copied), the Swift arm: a fresh seeded backend (`run-backend.cjs`), the app uninstalled (a fresh install), then
// `Drive.swift` run by `xcodebuild test-without-building` on the iPhone 17 simulator. Writes `readings-swift.json`: each
// step's reading and the backend requests made between it and the step before (the backend's own request log).
// Run `./build.sh` first. Heavy: check `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and the lab's log first.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { startBackend, requestsBetween } = require('./backend-arm.cjs');

const X = __dirname;
const W = path.join(X, 'work');
const UDID = process.env.S4_UDID || 'CF38CA15-0E0F-4EDD-A8FE-BFC642026A36';
const BUNDLE = 'io.nodegx.export.todolist';

async function main() {
  const backend = await startBackend();
  const shots = path.join(X, 'shots');
  fs.mkdirSync(shots, { recursive: true });
  const out = { arm: 'swift', seeded: backend.seeded.ids, startedAt: new Date().toISOString(), steps: [] };
  try {
    spawnSync('xcrun', ['simctl', 'boot', UDID]);
    spawnSync('xcrun', ['simctl', 'bootstatus', UDID, '-b']);
    spawnSync('xcrun', ['simctl', 'uninstall', UDID, BUNDLE]);
    const log = fs.openSync(path.join(W, 'drive-swift.log'), 'w');
    const args = ['-n', '19', 'xcodebuild', 'test-without-building', '-project', path.join(W, 'swift/TodoList.xcodeproj'), '-scheme', 'TodoList',
      '-destination', `id=${UDID}`, '-derivedDataPath', path.join(W, 'dd'), '-only-testing:TodoListUITests/TodoListDrive'];
    const env = { ...process.env, TEST_RUNNER_S4_EMAIL: backend.seeded.email, TEST_RUNNER_S4_PASSWORD: backend.seeded.password, TEST_RUNNER_S4_SHOTS: shots };
    const code = await new Promise((resolve) => spawn('nice', args, { env, stdio: ['ignore', log, log] }).on('exit', resolve));
    out.xcodebuildExit = code;
    const text = fs.readFileSync(path.join(W, 'drive-swift.log'), 'utf8');
    let prev = out.startedAt;
    for (const line of text.split('\n')) {
      const i = line.indexOf('S4READ ');
      if (i < 0) continue;
      const r = JSON.parse(line.slice(i + 7));
      out.steps.push({ ...r, requests: requestsBetween(backend.logFile, backend.logStart, prev, r.at) });
      prev = r.at;
    }
    out.failures = text.split('\n').filter((l) => /error:|XCTAssert|failed/.test(l)).slice(0, 20);
    out.result = (text.match(/\*\* TEST [A-Z ]+\*\*/) || [''])[0];
  } finally {
    backend.stop();
  }
  fs.writeFileSync(path.join(X, 'readings-swift.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(out.result, out.steps.map((s) => s.step).join(' '));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
