// CHR-006 AC2, second half: back on the launcher, the new project's card draws the seeded picture.
//   NOODL_REMOTE_DEBUG_PORT=9333 node ac2-projects.js <outDir> <projectName>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));
const [outDir, projectName] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let client = await connect(await appTarget());
  await evaluate(client, 'location.reload()');
  await sleep(5000);
  client = await connect(await appTarget());
  const ev = (e) => evaluate(client, e);
  const t0 = Date.now();
  while (!(await ev(`!!document.querySelector('nav[aria-label="Launcher sections"]')`))) {
    if (Date.now() - t0 > 90000) throw new Error('the launcher never came back');
    await sleep(500);
  }
  await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((x) => x.textContent === 'Projects').click()`);
  await sleep(3000);
  const out = {};
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(900);
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(1200);
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `ac2-projects-1368x900-${theme}.png`), Buffer.from(data, 'base64'));
    out[theme] = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[data-test="launcher-project-card"]')].map((c) => {
      const img = c.querySelector('img'); const h = c.querySelector('h3');
      return { title: h && h.textContent, img: img ? { prefix: (img.getAttribute('src') || '').slice(0, 24), loaded: img.complete && img.naturalWidth > 0, natural: [img.naturalWidth, img.naturalHeight] } : null,
        placeholder: !!c.querySelector('[class*="LauncherProjectCard-module__Placeholder"]') };
    }))`));
  }
  await client.send('Emulation.clearDeviceMetricsOverride');
  const mine = out.dark.find((c) => c.title === projectName);
  fs.writeFileSync(path.join(outDir, 'ac2-projects.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ cards: out.dark.length, mine, mineLight: out.light.find((c) => c.title === projectName) }, null, 2));
  process.exit(mine && mine.img && mine.img.loaded && mine.img.prefix.startsWith('data:image/webp') ? 0 : 2);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
