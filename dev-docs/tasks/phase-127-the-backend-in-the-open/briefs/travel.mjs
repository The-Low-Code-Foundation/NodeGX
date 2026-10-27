// P127 BKO-006 "it travels": `node travel.mjs <labRoot> <brief> --mcp <noodl-mcp.cjs>`.
//
// A copy of the stranger's app is shipped by the published server's `deploy_to_vm` (called as an agent calls it) to a
// throwaway VM: a fresh `nodegx-shiptest-vm` container (P26 DEP-002's recipe), ssh on 127.0.0.1:22731. On the box,
// whose admin door is off, it reads what the ship carried and what the backend there was started with:
//
//   - the project's rules file, automations file and every cloud function are in /opt/<app>/backend/
//   - the box's backend has each trigger and workflow (its data dir's registry files) and the project's rules
//   - a person signs up there, a visitor is refused a table that is not public, and each cloud function answers
//
// The container is removed at the end. Writes <labRoot>/out/<brief>/travel.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const [labRoot, name] = process.argv.slice(2);
const mcpAt = process.argv[process.argv.indexOf('--mcp') + 1];
const LAB = path.join(labRoot, 'lab', name);
const OUT = path.join(labRoot, 'out', name);
const appSrc = fs.readdirSync(LAB, { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(LAB, e.name, 'nodegx.project.json'))).map((e) => path.join(LAB, e.name))[0];
const APPNAME = `bko-${name}`;
const BOXPORT = 8731, SSHPORT = 22731, CT = `bko006-vm-${name}`;
const results = [];
const ok = (cond, what, detail) => { results.push({ ok: !!cond, what, detail }); console.log(`  ${cond ? 'ok  ' : 'FAIL'} [travels] ${what}${!cond && detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const box = (script) => { try { return execFileSync('docker', ['exec', CT, 'bash', '-c', script], { encoding: 'utf8' }); } catch (e) { return `ERR ${e.stdout ?? ''}${e.stderr ?? ''}`; } };
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

const ship = path.join(OUT, 'ship');
fs.rmSync(ship, { recursive: true, force: true });
const app = path.join(ship, path.basename(appSrc));
fs.cpSync(appSrc, app, { recursive: true, filter: (p) => !/[/\\]node_modules$/.test(p) });
const key = path.join(labRoot, 'vmkey');
if (!fs.existsSync(key)) execFileSync('ssh-keygen', ['-t', 'ed25519', '-N', '', '-q', '-f', key]);
try { execFileSync('docker', ['rm', '-f', CT], { stdio: 'ignore' }); } catch {}
execFileSync('docker', ['run', '-d', '--name', CT, '--privileged', '--cgroupns=host', '-v', '/sys/fs/cgroup:/sys/fs/cgroup:rw', '-p', `127.0.0.1:${SSHPORT}:22`, 'nodegx-shiptest-vm']);
const record = {};
try {
  for (let i = 0; i < 60 && !/active/.test(box('systemctl is-active ssh')); i++) await wait(500);
  box(`mkdir -p /root/.ssh && echo '${fs.readFileSync(key + '.pub', 'utf8').trim()}' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys`);
  try { execFileSync('ssh-keygen', ['-R', `[127.0.0.1]:${SSHPORT}`], { stdio: 'ignore' }); } catch {}

  const shipped = await deploy();
  record.deploy = shipped;
  ok(shipped && !shipped.isError, 'deploy_to_vm ships the app to the box', shipped);

  const opt = `/opt/${APPNAME}`, data = `/var/lib/${APPNAME}/data`;
  record.optFiles = box(`cd ${opt} && find . -maxdepth 3 -not -path './node_modules*' | sort | head -80`);
  const autos = readJson(path.join(app, 'nodegx.automations.json')) ?? { triggers: [], workflows: [] };
  const security = readJson(path.join(app, 'nodegx.security.json'));
  ok(!/ERR/.test(box(`test -f ${opt}/backend/nodegx.security.json`)), 'the rules file is in the shipped folder');
  ok(!/ERR/.test(box(`test -f ${opt}/backend/nodegx.automations.json`)) || !(autos.triggers.length + autos.workflows.length), 'the automations file is in the shipped folder');
  const beTriggers = box(`cat ${data}/triggers.json 2>/dev/null || find ${data} -name 'triggers*.json' -exec cat {} +`);
  record.boxTriggers = beTriggers.slice(0, 2000);
  for (const t of autos.triggers ?? []) ok(beTriggers.includes(t.id), `the box's backend has the trigger ${t.name ?? t.id}`, beTriggers.slice(0, 300));
  const beWf = box(`ls ${data}/workflow-defs 2>/dev/null; cat ${data}/workflow-defs/*.json 2>/dev/null | head -c 4000`); // the definitions, not the functions' workflows/
  for (const w of autos.workflows ?? []) ok(beWf.includes(w.id), `the box's backend has the workflow ${w.name ?? w.id}`, beWf.slice(0, 300));
  const beRules = box(`cat ${data}/security.json`);
  record.boxRules = beRules.slice(0, 2000);
  for (const c of Object.keys(security?.collections ?? {})) ok(beRules.includes(`"${c}"`), `the box's backend has the rule for ${c}`, beRules.slice(0, 300));

  const curl = (method, p, body, session) => {
    const out = box(`curl -s -X ${method} -H 'Content-Type: application/json' -H 'X-Parse-Application-Id: ${APPNAME}' ${session ? `-H 'X-Parse-Session-Token: ${session}'` : ''} ${body ? `--data '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : ''} -w '\\n%{http_code}' http://127.0.0.1:${BOXPORT}${p}`);
    const lines = out.trim().split('\n'); const status = Number(lines.pop()); let j = lines.join('\n'); try { j = JSON.parse(j); } catch {}
    return { status, body: j };
  };
  const signed = curl('POST', '/users', { username: 'ada-box@example.com', email: 'ada-box@example.com', password: 'grade-Pass-1234' });
  ok(signed.status < 300 && signed.body?.sessionToken, 'a person signs up on the box', signed);
  const session = signed.body?.sessionToken;
  const effective = (n) => ({ ...(security?.defaults?.permissions ?? {}), ...(security?.collections?.[n]?.permissions ?? {}) });
  const tables = (readJson(path.join(OUT, 'expect.json'))?.tables ?? []);
  for (const t of tables) if (effective(t).find !== 'public') { const r = curl('GET', `/classes/${t}`); ok(r.status >= 400, `a visitor is refused ${t} on the box`, r); }
  const fns = ((readJson(path.join(OUT, 'grade.json'))?.record?.backend?.functions) ?? []);
  for (const f of fns) { const r = curl('POST', `/functions/${encodeURIComponent(f)}`, {}, session); ok(r.status !== 404 && !/not found/i.test(JSON.stringify(r.body)), `the cloud function ${f} answers on the box`, r); }
} catch (e) {
  ok(false, 'the travel grade ran to the end', e.stack);
} finally {
  try { execFileSync('docker', ['rm', '-f', CT], { stdio: 'ignore' }); } catch {}
}
fs.writeFileSync(path.join(OUT, 'travel.json'), JSON.stringify({ at: new Date().toISOString(), results, record }, null, 2));
console.log(`travels ${results.filter((r) => r.ok).length}/${results.length}`);

/** deploy_to_vm through the published server, on the copy, as the stranger's client would call it (HOME in the lab). */
async function deploy() {
  const mcp = spawn(process.execPath, [mcpAt, app, '--allow-writes'], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, HOME: path.join(LAB, '.home'), npm_config_cache: path.join(labRoot, 'npm-cache'), NODEGX_NO_UPDATE_CHECK: '1' } });
  let buf = '', id = 0; const waiting = new Map();
  mcp.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); try { const m = JSON.parse(line); waiting.get(m.id)?.(m); } catch {} } });
  const rpc = (method, params) => new Promise((r) => { const n = ++id; waiting.set(n, r); mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
  try {
    await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bko006-travel', version: '0' } });
    mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const args = { host: 'root@127.0.0.1', ssh_key: key, ssh_port: SSHPORT, app: APPNAME, port: BOXPORT };
    const m = await Promise.race([rpc('tools/call', { name: 'call_tool', arguments: { name: 'deploy_to_vm', arguments: args } }), wait(600000).then(() => null)]);
    if (!m) return { isError: true, why: 'no answer in 10 minutes' };
    const text = m.result?.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n') ?? JSON.stringify(m.error);
    let j = text; try { j = JSON.parse(text); } catch {}
    return { isError: !!m.result?.isError || !!m.error, result: j };
  } finally { mcp.kill('SIGTERM'); }
}
