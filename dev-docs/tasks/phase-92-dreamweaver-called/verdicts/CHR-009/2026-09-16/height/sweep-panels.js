// CHR-009 slice 6 — the base input's box is used outside the property panel. For each rail panel that
// draws `PropertyPanel*Input`s (Settings sections expanded, then any other open panel), read every visible
// base input: its height, and whether it collapsed under a heightless wrapper (< 20px). Shoot each panel.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node sweep-panels.js --out=<dir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const outDir = (args.find((a) => a.startsWith('--out=')) || '--out=' + __dirname).slice(6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const vh = window.innerHeight;
  const inputs = [...document.querySelectorAll('input[class*="PropertyPanelBaseInput-module__Root"]')].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < vh; });
  const heights = {};
  for (const i of inputs) { const h = Math.round(i.getBoundingClientRect().height * 10) / 10; heights[h] = (heights[h] || 0) + 1; }
  return JSON.stringify({
    count: inputs.length, heights,
    collapsed: inputs.filter((i) => i.getBoundingClientRect().height < 20).map((i) => ({ value: i.value, placeholder: i.placeholder, h: i.getBoundingClientRect().height, parent: String(i.parentElement.className).slice(0, 60) })),
    clipped: inputs.filter((i) => i.value && i.scrollHeight > i.clientHeight + 1).map((i) => i.value)
  });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
  const shot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 520, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const results = {};
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  for (const id of ['settings-panel', 'backend-services-panel', 'project-docs-panel', 'workflows-panel']) {
    await ev(`document.querySelector('[data-test="${id}"]').click()`);
    await sleep(1500);
    // expand every collapsed section the panel draws, so its inputs render
    await ev(`[...document.querySelectorAll('[aria-expanded="false"]')].filter((b) => b.offsetParent !== null && b.closest('[class*="BasePanel"], [class*="SidebarPanel"], [class*="Settings"]')).forEach((b) => b.click())`);
    await sleep(1200);
    results[id] = JSON.parse(await ev(READ));
    console.log(id, JSON.stringify(results[id]));
    await shot(`sweep-${id}.png`);
  }
  await ev(`document.querySelector('[data-test="components-panel"]').click()`);
  fs.writeFileSync(path.join(outDir, 'sweep-results.json'), JSON.stringify(results, null, 2));
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
