// CHR-004 s33 — photograph a control in a forced state, so a ratio can be ruled on as a PICTURE.
//
// Richard's standing rule since s21: "greyed is a picture, not a DOM attribute". Two of the look
// gate's findings only exist in a state nobody can hold still — the primary button's PRESSED ink —
// so the state is forced with `CSS.forcePseudoState`, exactly as the gate forces it, and the crop
// is taken while it is held.
//
//   NOODL_REMOTE_DEBUG_PORT=9231 node shoot-state.js --selector='<css>' --state=active
//                                                    --theme=dark --name=<label> [--pad=24]
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const selector = opt('selector', '');
const state = opt('state', '');
const theme = opt('theme', 'dark');
const name = opt('name', 'shot');
const pad = Number(opt('pad', '24'));
const outDir = path.resolve(__dirname, opt('out', '2026-09-18-gate'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget('editor'));
  const ev = (e) => evaluate(client, e);

  await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
  await sleep(600);

  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await client.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  if (!nodeIds.length) throw new Error(`nothing matches ${selector}`);
  if (state) {
    for (const nodeId of nodeIds) {
      await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: state.split('+') });
    }
  }
  await sleep(400);

  // The box comes from the DOM, after the state is held: a pressed control can move.
  const box = await ev(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, Math.floor(r.x) - ${pad}), y: Math.max(0, Math.floor(r.y) - ${pad}),
             width: Math.ceil(r.width) + ${pad * 2}, height: Math.ceil(r.height) + ${pad * 2}, scale: 1 };
  })()`);
  if (!box) throw new Error('the element vanished while the state was held');

  const shot = await client.send('Page.captureScreenshot', { format: 'png', clip: box });
  const file = path.join(outDir, `${name}-${theme}${state ? '-' + state : ''}.png`);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));

  const measured = await ev(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const cs = getComputedStyle(el);
    return { text: (el.textContent || '').trim().slice(0, 40), colour: cs.color, fill: cs.backgroundColor };
  })()`);
  console.log(JSON.stringify({ file: path.basename(file), state: state || 'rest', theme, box, measured }, null, 2));

  if (state) {
    for (const nodeId of nodeIds) await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
  }
  await client.close();
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});
