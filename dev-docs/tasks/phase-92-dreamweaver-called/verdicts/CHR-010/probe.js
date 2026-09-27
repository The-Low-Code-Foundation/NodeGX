// CHR-010 s33 — census one surface, in one theme or both, and shoot it.
//
// The s32 drive (`drive-icons.js`) walks the panel end to end. This one is the hand tool for the
// surfaces AC1 names that only open on an interaction — a popup, a picker, a tab — where the drive
// has to stop between steps and look. It takes the scope as an argument, because a popup is drawn
// in the popup layer and a census silently scoped to `document` reads the same whether the surface
// opened or not.
//
//   NOODL_REMOTE_DEBUG_PORT=9231 node probe.js --name=<label> --scope='<js expr>' [--themes=both]
//                                              [--clip='<js expr for an element>'] [--out=<dir>]
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));
const { censusExpr } = require('./census.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const name = opt('name', 'surface');
const scope = opt('scope', 'document');
const clip = opt('clip', '');
const themes = opt('themes', 'both') === 'both' ? ['dark', 'light'] : [opt('themes', 'dark')];
const outDir = path.resolve(__dirname, opt('out', '2026-09-18-surfaces'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget('editor'));
  const ev = (e) => evaluate(client, e);
  const result = { name, scope, themes: {} };

  for (const theme of themes) {
    // 🔴 A theme write is not visible in the SAME eval — set it, wait, read it back.
    await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
    await sleep(600);
    const ground = await ev(`getComputedStyle(document.body).backgroundColor`);
    const census = await ev(censusExpr(scope));
    let box = null;
    if (clip) {
      box = await ev(`(() => { const e = ${clip}; if (!e) return null; const r = e.getBoundingClientRect();
        return { x: Math.max(0, Math.floor(r.x) - 8), y: Math.max(0, Math.floor(r.y) - 8),
                 width: Math.ceil(r.width) + 16, height: Math.ceil(r.height) + 16, scale: 1 }; })()`);
    }
    const shot = await client.send('Page.captureScreenshot', box ? { format: 'png', clip: box } : { format: 'png' });
    const file = path.join(outDir, `${name}-${theme}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    result.themes[theme] = { ground, census, clip: box, png: path.basename(file) };
  }

  const jsonFile = path.join(outDir, `${name}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await client.close();
})().catch((e) => {
  console.error('FAILED', e.stack || e.message);
  process.exit(1);
});
