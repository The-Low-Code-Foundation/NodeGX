// CHR-009 slice 7 — a 4× shot of the two scope tracks, both themes: the glyphs are 14px and a full crop cannot show them.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const client = await connect(await appTarget());
  const ev = (e) => evaluate(client, e);
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800);
    for (const [i, name] of [[0, 'edge'], [1, 'corner']]) {
      await ev(`(() => { const t = document.querySelectorAll('.sidebar-property-editor [data-test="scope-row"] [role="group"]')[${i}]; t.scrollIntoView({ block: 'center' }); })()`);
      await sleep(500);
      const r = JSON.parse(await ev(`JSON.stringify(document.querySelectorAll('.sidebar-property-editor [data-test="scope-row"] [role="group"]')[${i}].getBoundingClientRect())`));
      const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8, scale: 4 } });
      fs.writeFileSync(path.join(__dirname, 'after', `zoom-${name}-${theme}.png`), Buffer.from(data, 'base64'));
    }
  }
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
