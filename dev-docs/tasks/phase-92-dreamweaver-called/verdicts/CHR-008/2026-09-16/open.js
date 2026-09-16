// Drive the launcher into the story-engine COPY, so the census/identity/focus drives have a graph.
//
// 🔴 A COPY, never a real project: these drives type into fields and flip parameters, and opening a
// project writes into it. The seeded `recently_opened_project.json` points at the scratch copy, and
// this refuses to go on if what opened is not that directory.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node open.js --expect-dir=<abs path of the scratch copy>
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const EXPECT_DIR = opt('expect-dir', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 90000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) {} await sleep(500); }
    return false;
  };

  const already = await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`);
  console.log('graph already open:', already);

  if (!already) {
    if (!(await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`, 60000))) {
      console.log('no launcher nav — what is on screen:', await ev(`document.body.innerText.slice(0, 300)`));
      process.exit(1);
    }
    await ev(`(() => { const b = [...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((x) => x.textContent === 'Projects'); b && b.click(); return !!b; })()`);
    await sleep(2500);
    const cards = await ev(`JSON.stringify([...document.querySelectorAll('[class*="Card-module__Card"]')].map((c) => c.innerText.split('\\n')[0]).slice(0, 10))`);
    console.log('cards:', cards);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="Card-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) { console.log('no Story engine card'); process.exit(1); }
    if (!(await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 90000))) {
      console.log('project did not open'); process.exit(1);
    }
  }

  await sleep(3000);

  // Which directory actually opened? Several routes, because the dev and packaged builds expose
  // different things — report every answer rather than trusting one.
  const where = await ev(`(() => {
    const out = {};
    try { out.title = document.title; } catch (e) {}
    try { const pm = window.ProjectModel && window.ProjectModel.instance; if (pm) out.projectModel = pm._retainedProjectDirectory || pm.getProjectDirectory?.(); } catch (e) {}
    try { out.noodlProjectDir = window.Noodl && window.Noodl.projectDirectory; } catch (e) {}
    try { const c = window.__nodeGraphEditor.getActiveComponent(); out.component = c && c.name; out.componentCount = c && c.owner && c.owner.components && c.owner.components.length; } catch (e) {}
    return JSON.stringify(out); })()`);
  console.log('opened:', where, '| expect-dir:', EXPECT_DIR);

  const dir = JSON.parse(where);
  const seen = [dir.projectModel, dir.noodlProjectDir].filter(Boolean).join(' ');
  if (EXPECT_DIR && seen && seen.indexOf(EXPECT_DIR) === -1) {
    console.log('🔴 REFUSING: the open project is not the expected copy');
    process.exit(1);
  }
  if (EXPECT_DIR && !seen) console.log('⚠️ could not read the project directory from the renderer — verify by other means');

  console.log('ready');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
