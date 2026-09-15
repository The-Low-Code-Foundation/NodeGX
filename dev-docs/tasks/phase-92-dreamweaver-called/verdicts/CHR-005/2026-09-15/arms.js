// CHR-005 AC4 arms, on the Projects tab.
//   NOODL_REMOTE_DEBUG_PORT=9333 node arms.js <outDir> mock    — flag ON: the four mock cards draw; then flag OFF (control): the real list
//   NOODL_REMOTE_DEBUG_PORT=9333 node arms.js <outDir> empty   — a profile with zero projects: welcome + agent card, no cards
// Every reading is taken beside a control that fires on the same page (an absence next to a presence).
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const [outDir, mode] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `JSON.stringify({
  cards: [...document.querySelectorAll('[data-test="launcher-project-card"]')].map((c) => c.querySelector('h3') && c.querySelector('h3').textContent),
  kittenImages: [...document.querySelectorAll('img')].filter((i) => /placekitten/.test(i.src)).length,
  welcome: /Welcome to NodeGX/.test(document.body.textContent),
  agentCard: /Build it by describing it/.test(document.body.textContent),
  title: (document.querySelector('[class*="Launcher-module__ContentArea"] h1') || {}).textContent || null,
  flag: localStorage.getItem('launcher:useMockData')
})`;

(async () => {
  const client = await connect(await appTarget());
  const ev = (e) => evaluate(client, e);
  const ready = async () => {
    const t0 = Date.now();
    while (true) {
      try { if (await ev(`!!document.querySelector('nav[aria-label="Launcher sections"]')`)) break; } catch (e) { /* page mid-reload */ }
      if (Date.now() - t0 > 60000) throw new Error('launcher never appeared');
      await sleep(500);
    }
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((b) => b.textContent === 'Projects').click()`);
    await sleep(3000);
  };
  const shoot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const out = {};

  await ready();
  if (mode === 'mock') {
    await ev(`localStorage.setItem('launcher:useMockData', 'true'); location.reload(); true`);
    await sleep(2000);
    await ready();
    out.flagOn = JSON.parse(await ev(READ));
    await shoot('arm-mock-flag-on-projects');
    await ev(`localStorage.removeItem('launcher:useMockData'); location.reload(); true`);
    await sleep(2000);
    await ready();
    out.flagOff = JSON.parse(await ev(READ));
    await shoot('arm-mock-flag-off-projects');
  } else if (mode === 'empty') {
    out.emptyProfile = JSON.parse(await ev(READ));
    await shoot('arm-empty-profile-projects');
  } else {
    throw new Error('mode must be mock or empty');
  }
  fs.writeFileSync(path.join(outDir, `arm-${mode}.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});
