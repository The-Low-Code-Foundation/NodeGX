// OWN-023 §4.1, the path audit: every absolute path any tool call in a round named (file tools' path fields, and every
// absolute path written in a shell command), sorted into inside the round root, system paths (binaries, /dev), and
// leaks: anything else — Richard's files, /Applications, another round, the rest of /tmp. Also the denials the rules
// made, and shell commands that climb with `..` (a relative path the audit can't resolve, listed to be looked at).
// Subagents' calls are in the same stream (parent_tool_use_id), so they are audited too.
//   node audit-arm.mjs <root>          (round-arm.mjs imports it and writes audit.json)
import fs from 'node:fs';
import path from 'node:path';

const SYSTEM = /^\/(usr|bin|sbin|opt|dev|etc|System|Library|private\/etc|private\/var\/db|var\/db)(\/|$)/;

export function audit(rootArg) {
  const root = fs.realpathSync(rootArg);
  const inside = (p) => p === root || p.startsWith(root + '/');
  const seen = new Map(); // path → { tool, k }
  const denials = [];
  const climbs = [];
  const sitDir = path.join(root, 'sittings');
  const files = fs.existsSync(sitDir) ? fs.readdirSync(sitDir).filter((f) => f.endsWith('.jsonl')).sort((a, b) => parseInt(a) - parseInt(b)) : [];
  for (const f of files) {
    const k = parseInt(f);
    for (const line of fs.readFileSync(path.join(sitDir, f), 'utf8').split('\n')) {
      let m;
      try { m = JSON.parse(line); } catch { continue; }
      if (m.type === 'assistant') {
        for (const c of m.message?.content || []) {
          if (c.type !== 'tool_use') continue;
          // /tmp and /var are /private/tmp and /private/var on macOS: the round's own paths are written either way.
          const add = (p) => { p = p.replace(/^\/(tmp|var)(\/|$)/, '/private/$1$2'); if (!seen.has(p)) seen.set(p, { tool: c.name, k }); };
          for (const key of ['file_path', 'path', 'notebook_path', 'directory', 'cwd']) {
            const v = c.input?.[key];
            if (typeof v === 'string' && v.startsWith('/')) add(path.normalize(v));
          }
          if (c.name === 'Bash' && typeof c.input?.command === 'string') {
            const cmd = c.input.command;
            for (const hit of cmd.matchAll(/(?:^|[\s'"=:(])((?:\/[\w.@+~-]+)+\/?)/g)) add(path.normalize(hit[1]));
            if (/(^|[\s/'"])\.\.\//.test(cmd)) climbs.push({ k, command: cmd.slice(0, 300) });
          }
        }
      }
      if (m.type === 'result') for (const d of m.permission_denials || []) denials.push({ k, tool: d.tool_name, input: JSON.stringify(d.tool_input).slice(0, 300) });
    }
  }
  const rows = [...seen].map(([p, v]) => ({ path: p, ...v }));
  return {
    root,
    sittings: files.length,
    touched: rows.length,
    inside: rows.filter((r) => inside(r.path)).length,
    system: rows.filter((r) => !inside(r.path) && SYSTEM.test(r.path)).map((r) => r.path),
    leaks: rows.filter((r) => !inside(r.path) && !SYSTEM.test(r.path)),
    denials,
    climbs
  };
}

if (process.argv[1] && new URL(import.meta.url).pathname === fs.realpathSync(process.argv[1])) {
  console.log(JSON.stringify(audit(process.argv[2]), null, 2));
}
