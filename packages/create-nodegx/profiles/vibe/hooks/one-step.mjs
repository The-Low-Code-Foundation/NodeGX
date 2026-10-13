// One step per sitting (OWN-019 s3, R31). Vibe runs this before every tool call (`.vibe/hooks.toml`), with the call
// on stdin: { transcript_path, cwd, tool_name, tool_input, ... }.
//
// Once this sitting has written an app's docs/NEXT.md, its step is done: the next step belongs to a fresh sitting,
// which starts from that note. So from then on it refuses every tool but reading and touching up the notes in docs/,
// and says why. Measured: Large 4 wrote a good NEXT.md and then went on to build the next part in the same sitting
// (q3) — Vibe's headless prompt tells it to "complete the entire task in a single pass".
//
// Two more guards, both measured (OWN-019 s3, q5): a plan sitting that knew this hook wrote REQUEST, CHECKLIST and
// PLAN, held NEXT.md back, and began building — so while no app has a NEXT.md yet (sitting 1), the tools that build
// are refused; reading stays open. And a sitting that has made SITTING_BUDGET tool calls is past a sitting's size
// (the skill teaches ~30; q2 and q4 built part 1 in 47–51): only the notes stay open, to write where it got to.
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

const SITTING_BUDGET = 60;
// The nodegx tools that change the app or run it (through `call_tool`, or listed directly).
const BUILDS = new Set(['create_component', 'update_component', 'delete_component', 'create_plan', 'stage_plan_operation', 'apply_plan', 'render_report', 'drive_page']);

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
  const builds = (name === 'nodegx_call_tool' && BUILDS.has(String(call.tool_input?.name))) || BUILDS.has(name.replace(/^nodegx_/, ''));

  const notes = nextNotes(cwd);
  if (notes.length === 0) {
    if (builds) {
      deny(
        'This is sitting 1, the plan: it builds nothing. Finish the notes in the app\'s docs/ folder — REQUEST, ' +
          'CHECKLIST, PLAN, and NEXT.md last ("# Next sitting: build part 1 — …") — then stop. Part 1 is built by ' +
          'the next sitting, starting fresh from your notes with a clear head.'
      );
    }
    allow();
  }

  const start = sessionStart(call.transcript_path);
  if (start === null) allow();
  const written = notes.filter((f) => fs.statSync(f).mtimeMs > start);
  if (written.length === 0) {
    if (callsSoFar(call.transcript_path) >= SITTING_BUDGET) {
      deny(
        `This sitting has made ${SITTING_BUDGET} tool calls — past the size of a sitting, and that's fine: it means ` +
          'the part was bigger than it looked. Write where you got to: mark the checklist lines you proved, add what ' +
          'you learned to PLAN.md, and rewrite NEXT.md with what is built, what passes, and what is left of this part ' +
          '(split it if it is big). Then stop; the next sitting picks it up.'
      );
    }
    allow();
  }

  const note = path.relative(cwd, written[0]);
  const reason =
    `This sitting's step is done: ${note} is written for the next sitting. Don't start the next step here — ` +
    'a fresh sitting starts from that note with a small context. Tell me in two lines what this sitting did and ' +
    'what is next, ending "Next: <the step>. Type /clear, then "continue".", and stop.';
  deny(reason);
} catch {
  allow();
}
