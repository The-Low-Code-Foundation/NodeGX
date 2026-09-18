// CHR-010 s33 — the drag chrome, caught mid-drag.
//
// `popuplayer.ts` held Font Awesome in the one shape a `fa fa-` grep never sees:
// `classList.add('fa-share')` on the drop indicator. It is now an `iconHost` — a detached React
// root in an `inline-flex` span — and the only way to look at it is to be holding a drag when the
// screenshot is taken, because the whole `.popup-layer-dragger` is display:none otherwise.
//
// The drag is released back where it started, so nothing is reordered.
//
//   NOODL_REMOTE_DEBUG_PORT=9231 node drag-capture.js --from=x,y --to=x,y [--name=drag] [--out=dir]
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));
const { censusExpr } = require('./census.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const [fx, fy] = opt('from', '100,92').split(',').map(Number);
const [tx, ty] = opt('to', '260,300').split(',').map(Number);
const name = opt('name', 'drag-overlay');
const outDir = path.resolve(__dirname, opt('out', '2026-09-18-surfaces'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget('editor'));
  const ev = (e) => evaluate(client, e);
  const mouse = (type, x, y, extra = {}) =>
    client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, clickCount: 1, ...extra });

  const result = { from: [fx, fy], to: [tx, ty] };
  await mouse('mousePressed', fx, fy);
  // The dragger only appears once the pointer has actually travelled.
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await mouse('mouseMoved', fx + ((tx - fx) * i) / steps, fy + ((ty - fy) * i) / steps);
    await sleep(60);
  }
  await sleep(500);

  result.dragger = await ev(`(() => {
    const d = document.querySelector('.popup-layer-dragger');
    if (!d) return 'no dragger element';
    const r = d.getBoundingClientRect();
    const cs = getComputedStyle(d);
    const ind = d.querySelector('.popup-layer-drop-type-indicator, [class*="drop-type"]');
    return {
      display: cs.display, box: [Math.round(r.width), Math.round(r.height)],
      text: (d.innerText || '').trim(),
      indicatorHtml: ind ? ind.outerHTML.slice(0, 200) : 'no indicator',
      colour: cs.color
    };
  })()`);
  result.census = await ev(censusExpr(`document.querySelector('.popup-layer-dragger')`));
  const shot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(shot.data, 'base64'));

  // Put it back: return to the start point and release there.
  for (let i = steps; i >= 0; i--) {
    await mouse('mouseMoved', fx + ((tx - fx) * i) / steps, fy + ((ty - fy) * i) / steps);
    await sleep(40);
  }
  await mouse('mouseReleased', fx, fy, { buttons: 0 });
  await sleep(500);
  result.afterRelease = await ev(`(() => { const d = document.querySelector('.popup-layer-dragger'); return d ? getComputedStyle(d).display : 'gone'; })()`);

  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await client.close();
})().catch((e) => {
  console.error('FAILED', e.stack || e.message);
  process.exit(1);
});
