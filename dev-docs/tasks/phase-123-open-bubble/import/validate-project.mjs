// Validate a NodeGX project folder through the noodl-mcp server over stdio (validate_project), grouping every error by kind. Needs the repo's noodl-mcp built (packages/noodl-mcp/dist).
//   node mcp-validate.mjs <projectDir>
import { spawn } from 'node:child_process';
const [,, dir] = process.argv;
const repo = '/Users/richardosborne/vscode_projects/OpenNoodl';
const proc = spawn(process.execPath, [`${repo}/packages/noodl-mcp/bin/noodl-mcp.js`, dir], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env } });
let buf = ''; const waiting = new Map(); let seq = 0;
proc.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue; try { const m = JSON.parse(line); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } } catch {} } });
proc.stderr.on('data', (d) => { if (/error|Error/.test(String(d))) process.stderr.write(d); });
const call = (method, params) => new Promise((ok) => { const id = ++seq; waiting.set(id, ok); proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const notify = (method, params) => proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mcp-validate', version: '0' } });
notify('notifications/initialized', {});
const text = (r) => (r.result?.content || []).map((c) => c.text || '').join('\n');
const v = await call('tools/call', { name: 'validate_project', arguments: {} });
let out = text(v); let data; try { data = JSON.parse(out.replace(/^[^{]*/, '')); } catch { console.log(out.slice(0, 2000)); proc.kill(); process.exit(1); }
console.log('summary:', JSON.stringify(data.summary));
const errs = (data.diagnostics || []).filter((d) => d.severity === 'error');
const groups = new Map();
for (const e of errs) { const k = `${e.code}: ${e.message.replace(/"[^"]*"/g, '"…"').slice(0, 110)} [${e.location?.nodeType || ''}.${e.location?.port || ''}]`; const g = groups.get(k) || { n: 0, ex: e }; g.n++; groups.set(k, g); }
for (const [k, g] of [...groups].sort((a, b) => b[1].n - a[1].n)) console.log(`${String(g.n).padStart(5)}  ${k}\n       e.g. ${g.ex.location?.component} / ${g.ex.location?.nodeLabel} — ${g.ex.message.slice(0, 160)}${g.ex.alternatives ? ' → ' + g.ex.alternatives.slice(0, 8).join(',') : ''}`);
const warns = new Map(); for (const d of (data.diagnostics || []).filter((d) => d.severity === 'warning')) warns.set(d.code, (warns.get(d.code) || 0) + 1);
console.log('warnings by code:', JSON.stringify([...warns].sort((a, b) => b[1] - a[1])));
proc.kill();
