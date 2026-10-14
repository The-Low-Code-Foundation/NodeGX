// The hand-over (OWN-019 s3, R31 as ruled again in s3: one session, taught; the notes carry it over when it must).
// Vibe runs this before every tool call (`.vibe/hooks.toml`), with the call on stdin:
// { transcript_path, cwd, tool_name, tool_input, ... }.
//
// A session has a size. At HANDOVER_AT tool calls it is asked to hand over — write docs/NEXT.md with where things are
// and stop — so a long build never runs on with a context too big to think in (s2's one-session rounds reached ~9M
// input). And once this session has written an app's docs/NEXT.md (a hand-over, or "# Done"), its work is written
// down: every tool but reading and the notes is refused, so it stops there — measured: with Vibe's headless "complete
// the entire task in a single pass", Large 4 reached past a NEXT.md it had just written (q3).
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

const HANDOVER_AT = 100;

const deny = (reason) => {
  process.stdout.write(JSON.stringify({ decision: 'deny', reason }));
  process.exit(0);
};

/** Tool calls this session has made so far (Vibe saves the transcript after every model step). */
function callsSoFar(transcript) {
  let n = 0;
  for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
    if (!line.includes('"tool_calls"')) continue;
    try {
      const m = JSON.parse(line);
      if (m.role === 'assistant' && Array.isArray(m.tool_calls)) n += m.tool_calls.length;
    } catch {}
  }
  return n;
}

try {
  const cwd = call.cwd || process.cwd();
  const name = String(call.tool_name || '');
  const target = String(call.tool_input?.path ?? call.tool_input?.filePath ?? call.tool_input?.file_path ?? '');
  const inDocs = /(^|[\\/])docs[\\/][^\\/]+\.md$/.test(target);
  // Reading anything, and writing the notes themselves, are always open.
  if (name === 'read_file' || name === 'grep' || ((name === 'write_file' || name === 'edit') && inDocs)) allow();
  const notes = nextNotes(cwd);
  const start = sessionStart(call.transcript_path);
  if (start === null) allow();
  const written = notes.filter((f) => fs.statSync(f).mtimeMs > start);
  if (written.length === 0) {
    if (callsSoFar(call.transcript_path) >= HANDOVER_AT) {
      deny(
        `This session has made ${HANDOVER_AT} tool calls — time to hand over, and that's part of the process: a new ` +
          'session carries on with a clear head. Mark the checklist lines you proved, add what you learned to PLAN.md, ' +
          'and write docs/NEXT.md — "# Next session: <the step>", then what is built, what passes, what is left, and ' +
          'what to try. Then stop.'
      );
    }
    allow();
  }

  const note = path.relative(cwd, written[0]);
  const reason =
    `${note} is written, so this session's work is handed over. Don't start the next step here — a new session ` +
    'starts from that note with a clear head. Tell me what this session did and what is next (or, if it says ' +
    '"# Done", one line per checklist item), ending "Next: <the step>. Type /clear, then "continue".", and stop.';
  deny(reason);
} catch {
  allow();
}
