// One step per sitting (OWN-019 s3, R31). Vibe runs this before every tool call (`.vibe/hooks.toml`), with the call
// on stdin: { transcript_path, cwd, tool_name, tool_input, ... }.
//
// Once this sitting has written an app's docs/NEXT.md, its step is done: the next step belongs to a fresh sitting,
// which starts from that note. So from then on it refuses every tool but reading and touching up the notes in docs/,
// and says why. Measured: Large 4 wrote a good NEXT.md and then went on to build the next part in the same sitting
// (q3) — Vibe's headless prompt tells it to "complete the entire task in a single pass".
//
// Anything unexpected — no transcript, no NEXT.md, an error — allows the call: this hook never stops a person's work.
import fs from 'node:fs';
import path from 'node:path';

const allow = () => process.exit(0);

let call;
try {
  call = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch {
  allow();
}

/** When this session started: its meta.json, else its folder's name (session_YYYYMMDD_HHMMSS_id, UTC). */
function sessionStart(transcript) {
  if (!transcript) return null;
  const dir = path.dirname(transcript);
  try {
    const t = Date.parse(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).start_time);
    if (!Number.isNaN(t)) return t;
  } catch {}
  const m = /session_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_/.exec(path.basename(dir));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/** Every app's docs/NEXT.md in this folder (one level down), and the folder's own. */
function nextNotes(cwd) {
  const found = [];
  const look = (dir) => {
    const f = path.join(dir, 'docs', 'NEXT.md');
    if (fs.existsSync(f)) found.push(f);
  };
  look(cwd);
  for (const e of fs.readdirSync(cwd, { withFileTypes: true })) {
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') look(path.join(cwd, e.name));
  }
  return found;
}

try {
  const cwd = call.cwd || process.cwd();
  const start = sessionStart(call.transcript_path);
  if (start === null) allow();
  const written = nextNotes(cwd).filter((f) => fs.statSync(f).mtimeMs > start);
  if (written.length === 0) allow();

  // Reading anything, and touching up the notes themselves, stay open.
  const name = String(call.tool_name || '');
  const target = String(call.tool_input?.path ?? call.tool_input?.filePath ?? call.tool_input?.file_path ?? '');
  const inDocs = /(^|[\\/])docs[\\/][^\\/]+\.md$/.test(target);
  if (name === 'read_file' || name === 'grep' || ((name === 'write_file' || name === 'edit') && inDocs)) allow();

  const note = path.relative(cwd, written[0]);
  const reason =
    `This sitting's step is done: ${note} is written for the next sitting. Don't start the next step here — ` +
    'a fresh sitting starts from that note with a small context. Tell me in two lines what this sitting did and ' +
    'what is next, ending "Next: <the step>. Type /clear, then "continue".", and stop.';
  process.stdout.write(JSON.stringify({ decision: 'deny', reason }));
  process.exit(0);
} catch {
  allow();
}
