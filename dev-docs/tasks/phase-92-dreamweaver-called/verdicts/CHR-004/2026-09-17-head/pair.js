// The field-edge finding as a PICTURE, in the SAME CROP, before and after.
//
// 🔴 s12's lesson: a static pair of differently-framed full shots does not let a person rule. One
// crop, one node, one theme per pair, and the only thing that varies is the armed stylesheet.
// 🔴 Numbers passed while the picture was broken in eight earlier slices — so this exists in
// addition to the gate's readings, never instead of them.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node pair.js --expect=<scratch copy> --node=chr004-gate-group
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith('--' + n + '=')) || '=' + d).split('=').slice(1).join('=');
const outDir = path.resolve(__dirname, opt('out', 'pair'));
const NODE_ID = opt('node', 'chr004-gate-group');
const CSS = path.resolve(__dirname, opt('css', 'arm-border-control.css'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const P = "document.querySelector('.sidebar-property-editor')";

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget('editor'));
  const ev = (e) => evaluate(client, e);

  if (!(await ev('!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())'))) {
    throw new Error('the editor is on the launcher — open the project first');
  }
  const selected = await ev(
    "(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId('" +
      NODE_ID +
      "'); if (!n) return null; ed.selectNode(n); return n.model.type.name; })()"
  );
  if (!selected) throw new Error('no node ' + NODE_ID + ' — run drive-gate-set.js first');
  await sleep(2500);

  // The panel's own host box, so both shots in a pair are byte-comparable crops.
  const box = JSON.parse(
    await ev(
      "(() => { const p = [...document.querySelectorAll('[class*=\"BasePanel-module__Root\"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor')); const r = (p || " +
        P +
        ").getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, Math.round(r.x)), width: Math.round(r.width) }); })()"
    )
  );
  console.log('selected', selected, 'panel crop', JSON.stringify(box));

  const shot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: box.x, y: 0, width: box.width, height: 880, scale: 2 }
    });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
    return name;
  };

  const css = fs.readFileSync(CSS, 'utf8');
  const arm = async (text) =>
    ev(
      '(() => { let el = document.getElementById("chr-004-arm"); if (!el) { el = document.createElement("style"); el.id = "chr-004-arm"; document.head.appendChild(el); } el.textContent = ' +
        JSON.stringify(text) +
        '; return el.textContent.length; })()'
    );
  const disarm = () => ev('(() => { const el = document.getElementById("chr-004-arm"); if (el) el.remove(); return true; })()');

  // 🔴 Read the edge back on the element a person sees, in each arm. An identical reading across
  // arms is what an arm that never took looks like — so this prints both and refuses if they match.
  const edge = () =>
    ev(
      "(() => { const el = " +
        P +
        ".querySelector('input[class*=\"PropertyPanelBaseInput-module__Root\"]'); return el ? getComputedStyle(el).borderTopColor : 'no field'; })()"
    );

  try {
    for (const theme of ['dark', 'light']) {
      await ev('document.documentElement.setAttribute("data-theme", "' + theme + '")');
      await sleep(900);
      await ev("(() => { let p = " + P + "; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; if (p) p.scrollTop = 0; })()");
      await ev('document.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 5 }))');
      await sleep(400);

      await disarm();
      await sleep(250);
      const before = await edge();
      await shot('field-edge-before-' + theme + '.png');

      await arm(css);
      await sleep(400);
      const after = await edge();
      await shot('field-edge-after-' + theme + '.png');

      console.log(theme + ':  before ' + before + '   after ' + after);
      if (before === after) {
        throw new Error('the arm did not take in ' + theme + ' — both arms read ' + before + ', which is what a dead selector looks like');
      }
      await disarm();
      await sleep(250);
    }
  } finally {
    await disarm();
    await ev('document.documentElement.setAttribute("data-theme", "dark")');
    client.close();
  }
  console.log('wrote', outDir);
})().catch((e) => {
  console.error('FAILED', e.stack || e.message);
  process.exit(1);
});
