// EXP-022 S6 (S4's harness, copied): one fresh seeded backend per arm (`run-backend.cjs`, its own data folder), so every arm starts from the
// same rows, and the backend's own request log as each arm's wire. A query is tunnelled as POST (`_method: 'GET'`), so a
// request reads `METHOD path status`: `POST /classes/Task 200` is a query, `POST /classes/Task 201` a create.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const X = __dirname;
const W = path.join(X, 'work');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function startBackend() {
  fs.mkdirSync(W, { recursive: true });
  const seededFile = path.join(X, 'seeded.json');
  if (fs.existsSync(seededFile)) fs.unlinkSync(seededFile);
  const logFile = path.join(W, `backend-${Date.now()}.log`);
  const fd = fs.openSync(logFile, 'w');
  const child = spawn('node', [path.join(X, 'run-backend.cjs')], { stdio: ['ignore', fd, fd] });
  for (let i = 0; i < 120 && !fs.existsSync(seededFile); i++) await wait(250);
  if (!fs.existsSync(seededFile)) {
    child.kill('SIGTERM');
    throw new Error(`backend did not seed:\n${fs.readFileSync(logFile, 'utf8')}`);
  }
  await wait(200);
  const seeded = JSON.parse(fs.readFileSync(seededFile, 'utf8'));
  const logStart = fs.readFileSync(logFile, 'utf8').split('\n').length - 1;
  return { seeded, logFile, logStart, pid: child.pid, stop: () => child.kill('SIGTERM') };
}

/** The requests the backend logged after `start` (a line count), with `from < ts <= to` (ISO times; either may be omitted). */
function requestsBetween(logFile, start, from, to) {
  const lines = fs.readFileSync(logFile, 'utf8').split('\n').slice(start);
  const out = [];
  for (const line of lines) {
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.event !== 'request') continue;
    if (from && d.ts <= from) continue;
    if (to && d.ts > to) continue;
    out.push(`${d.method} ${d.path} ${d.status}`);
  }
  return out;
}

module.exports = { startBackend, requestsBetween };
