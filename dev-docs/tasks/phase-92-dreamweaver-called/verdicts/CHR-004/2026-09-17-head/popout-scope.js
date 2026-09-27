// CHR-004 §3.3, second clause: can `:global(.sidebar-property-editor)` in a core-ui stylesheet go?
//
// The task says the hook goes "with its geometry moved into the component". That is only free if
// NOTHING renders a `PropertyPanelRow` outside that ancestor — otherwise dropping the hook silently
// GIVES those rows a 118px label column, a 30px min-height and an absolutely-positioned gutter dot
// they do not have today, which is a look change nobody asked for.
//
// `PopoutGroup.ts` is the candidate: it `createRoot`s a div and hands it to `showPopout`, and a
// popout opens in the popup layer at the document root. This counts, live, with a popout OPEN.
//
// 🔴 A population asserted is not a population printed. This prints where every row in the document
// actually lives, and refuses to answer if it never managed to open a popout — an absence is only
// worth something beside a known-firing signal.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node popout-scope.js --node=chr004-gate-button-popout
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith('--' + n + '=')) || '=' + d).split('=').slice(1).join('=');
const NODE_ID = opt('node', 'chr004-gate-button-popout');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every row drawn by the core-ui row components, wherever it is in the document, with the
// ancestor that decides whether the `:global` hook reaches it.
const CENSUS = [
  '(() => {',
  '  const ROW = \'[class*="PropertyPanelInput-module__Root"]\';',
  '  const rows = [...document.querySelectorAll(ROW)];',
  '  const where = {};',
  '  const samples = {};',
  '  for (const r of rows) {',
  '    const inPanel = !!r.closest(".sidebar-property-editor");',
  '    const host = inPanel ? "INSIDE .sidebar-property-editor" : "OUTSIDE — " + (() => {',
  '      for (let n = r.parentElement; n; n = n.parentElement) {',
  '        if (n === document.body) return "body (no named host)";',
  '        const c = String(n.className || "");',
  '        if (/popup|Popout|popout|layer|Modal|modal/.test(c)) return n.tagName + "." + c.slice(0, 60);',
  '      }',
  '      return "unknown";',
  '    })();',
  '    where[host] = (where[host] || 0) + 1;',
  '    if (!samples[host]) {',
  '      const label = r.querySelector(\'[class*="PropertyPanelInput-module__Label"]\');',
  '      const cs = label ? getComputedStyle(label) : null;',
  '      samples[host] = {',
  '        label: label ? label.textContent.trim().slice(0, 30) : "(no label)",',
  '        labelWidth: cs ? cs.width : null,',
  '        rowMinHeight: getComputedStyle(r).minHeight,',
  '        rowPosition: getComputedStyle(r).position',
  '      };',
  '    }',
  '  }',
  '  return JSON.stringify({ total: rows.length, where: where, samples: samples,',
  '    popupLayers: document.querySelectorAll(".popup-layer, .popup-layer-blocker").length });',
  '})()'
].join('\n');

(async () => {
  const client = await connect(await appTarget('editor'));
  const ev = (e) => evaluate(client, e);

  const selected = await ev(
    "(() => { const ed = window.__nodeGraphEditor; const n = ed && ed.findNodeWithId('" +
      NODE_ID +
      "'); if (!n) return null; ed.selectNode(n); return n.model.type.name; })()"
  );
  if (!selected) throw new Error('no node ' + NODE_ID + ' — run drive-gate-set.js first');
  await sleep(2500);
  console.log('selected', selected);

  console.log('\n--- rows with NO popout open (the control arm) ---');
  const closed = JSON.parse(await ev(CENSUS));
  console.log(JSON.stringify(closed, null, 1));

  // Open a popout: the Button's `Label Text Style` is a `PopoutGroup`. Its trigger is the group's
  // own button in the panel.
  const opened = await ev(
    '(() => { const b = [...document.querySelectorAll(".sidebar-property-editor button")].find((x) => /Text Style|Label Text|Style/i.test(x.textContent || "")); if (!b) return null; b.click(); return (b.textContent || "").trim().slice(0, 40); })()'
  );
  console.log('\nclicked popout trigger:', JSON.stringify(opened));
  await sleep(1800);

  console.log('\n--- rows with a popout OPEN ---');
  const open = JSON.parse(await ev(CENSUS));
  console.log(JSON.stringify(open, null, 1));

  // 🔴 If no popout actually opened, the "no rows outside" reading is vacuous — say so rather than
  // reporting a clean number from an instrument that measured the same state twice.
  if (open.total === closed.total && open.popupLayers === closed.popupLayers) {
    console.log(
      '\n⚠️ VACUOUS: nothing changed between the two arms, so this says nothing about a popout. ' +
        'The trigger was ' + JSON.stringify(opened) + '.'
    );
  }
  client.close();
})().catch((e) => {
  console.error('FAILED', e.stack || e.message);
  process.exit(1);
});
