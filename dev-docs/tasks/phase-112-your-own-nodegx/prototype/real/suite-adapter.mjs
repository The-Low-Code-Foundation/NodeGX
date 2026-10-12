/**
 * P112 OWN-006 AC2 — orbit.html as an editor-suite adapter: the prototype graded by the suite like any editor.
 *
 *   open(files)  orbit.html?open=wait in headless Chrome, the files handed to the page (`window.__openProject`)
 *   apply(edit)  `__orbit.apply(edit)`: the page's OWN editing functions — the ones its picker, connect popup, Node
 *                panel and structure controls call — each a write through `V2ProjectStore`
 *   save()       every file the page's store holds
 *
 *   npx ts-node packages/nodegx-project-contract/editor-suite-node.ts \
 *     dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/suite-adapter.mjs \
 *     packages/nodegx-project-contract/tests/fixtures/editor-suite/small \
 *     packages/nodegx-project-contract/tests/fixtures/editor-suite/small.edits.json
 *
 * Needs what serve.mjs needs (the deploy runtime, the preview bundle), `./build.sh`, Chrome and the network for Three.js.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..', '..');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { connect, evaluate } = createRequire(import.meta.url)(join(repo, 'scripts/devtools/cdp.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });

async function start() {
  const sitePort = await freePort();
  const site = spawn(process.execPath, [join(here, 'serve.mjs'), String(sitePort)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r, j) => { site.stdout.on('data', (d) => /serve: http/.test(String(d)) && r()); site.once('exit', () => j(new Error('serve.mjs did not start'))); });
  const cdpPort = await freePort();
  const profile = mkdtempSync(join(tmpdir(), 'orbit-suite-'));
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  // the suite's command ends the process; Chrome and the server go with it
  process.once('exit', () => { proc.kill(); site.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold a file */ } });
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await wait(250);
    try { target = await new Promise((res, rej) => http.get({ host: '127.0.0.1', port: cdpPort, path: '/json/list' }, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b).find((t) => t.type === 'page')); } catch (e) { rej(e); } }); }).on('error', rej)); } catch { /* not up yet */ }
  }
  const client = await connect(target);
  const problems = [];
  client.on((m) => { if (m.method === 'Runtime.exceptionThrown') problems.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]); });
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  return { client, sitePort, problems };
}
const title = (client) => evaluate(client, 'document.title').catch(() => 'pending');
async function titleOtherThan(client, not, ms) {
  const t = Date.now();
  let now = await title(client);
  while (not.includes(now) && Date.now() - t < ms) { await wait(150); now = await title(client); }
  return now;
}

export default function orbitAdapter() {
  let session;
  return {
    name: 'orbit.html (the P112 prototype)',
    /**
     * OWN-003 step 4 / OWN-006 §6.4 — the suite's second door: the page plays the scenario itself on the kit's runner
     * (`@noodl/preview`'s noodl-graph-target.js, loaded by orbit.html on first use) with the spec package's own
     * `playGraph`, and hands the trace back; the suite grades it. A first bridge drove the page's runner STEP BY STEP as
     * a `GraphTarget` over CDP (set, signal, settle, trace…): 84 of 85, the last — nested popups — a frame early,
     * because each round trip is an event-loop turn between two steps the reference recorded as one synchronous run.
     * The whole play in the page is what the recordings were made of.
     */
    async playGraph(scenario, file) {
      if (!session) throw new Error('open() first');
      return evaluate(session.client, `__orbit.graph("play", ${JSON.stringify({ scenario, file })})`);
    },
    async open(files) {
      session ??= await start();
      const { client, sitePort } = session;
      await client.send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/orbit.html?open=wait` });
      const ready = await titleOtherThan(client, ['pending', ''], 30000);
      if (ready !== 'waiting') throw new Error(`orbit.html did not wait for a project: ${ready}`);
      await evaluate(client, `window.__openProject(${JSON.stringify(files)})`);
      const up = await titleOtherThan(client, ['waiting', 'pending', ''], 60000);
      if (!up.startsWith('ready')) throw new Error(`orbit.html did not open the project: ${up}`);
    },
    async apply(edit) {
      const { client, problems } = session;
      const before = problems.length;
      const out = await evaluate(client, `__orbit.apply(${JSON.stringify(edit)}).then((r) => r, (e) => ({ refused: String(e && e.message || e) }))`);
      if (out?.refused) throw new Error(out.refused);
      if (problems.length > before) throw new Error(`the page threw: ${problems.slice(before).join(' / ')}`);
      return out && out.id ? { id: out.id } : undefined;
    },
    async save() {
      return evaluate(session.client, '__orbit.files.entries()');
    }
  };
}
