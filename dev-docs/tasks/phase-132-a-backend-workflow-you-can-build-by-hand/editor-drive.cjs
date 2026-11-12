// P132 s10: drive the dev editor over CDP (port 9222), one connection per call. Usage:
//   node editor-drive.cjs eval "<js>" | click X Y | dbl X Y | rclick X Y | key Escape | type "text" | shot file.png
//   node editor-drive.cjs eval "$(node editor-drive.cjs find)"  installs window.__f(text, sel) -> {x, y} of the
//   smallest visible element whose text includes `text`. x,y are CSS pixels (a screenshot is at device scale, x2).
// A press moves, pauses, presses with buttons:1 and releases: without that the node-graph canvas ignores it.
// A key carries `code`: without it Escape does not close the node picker.
const FIND = "// window.__f(text, sel?) -> center of the smallest visible element whose innerText includes text\nwindow.__f = (text, sel = '*') => { const els = [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (e.innerText || e.textContent || '').includes(text); }); els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height); const e = els[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), tag: e.tagName, cls: String(e.className).slice(0, 60) }; }; 'ok'\n";
if (process.argv[2] === 'find') { console.log(FIND); process.exit(0); }
const http = require('http');
const fs = require('fs');
const WebSocket = require('/Users/richardosborne/vscode_projects/OpenNoodl/node_modules/ws');
const PORT = process.env.NOODL_REMOTE_DEBUG_PORT || 9222;

function list() {
  return new Promise((ok, no) => http.get(`http://127.0.0.1:${PORT}/json/list`, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => ok(JSON.parse(b))); }).on('error', no));
}
(async () => {
  const targets = await list();
  const t = targets.find((x) => x.type === 'page' && !/viewer|preview|devtools/i.test(x.url + x.title)) || targets[0];
  const ws = new WebSocket(t.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0; const wait = new Map();
  ws.on('message', (m) => { const j = JSON.parse(m); if (j.id && wait.has(j.id)) { wait.get(j.id)(j); wait.delete(j.id); } });
  await new Promise((r) => ws.on('open', r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const [cmd, a, b, c] = process.argv.slice(2);
  const mouse = async (x, y, button = 'left', clickCount = 1) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 3, y: y - 3 });
    await new Promise((r) => setTimeout(r, 60));
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await new Promise((r) => setTimeout(r, 120));
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount, buttons: button === 'right' ? 2 : 1 });
    await new Promise((r) => setTimeout(r, 80));
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount, buttons: 0 });
  };
  if (cmd === 'eval') {
    const r = await send('Runtime.evaluate', { expression: a, returnByValue: true, awaitPromise: true });
    console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description ?? r.result, null, 1));
  } else if (cmd === 'click') await mouse(+a, +b, 'left', +(c || 1));
  else if (cmd === 'dbl') { await mouse(+a, +b, 'left', 1); await mouse(+a, +b, 'left', 2); }
  else if (cmd === 'rclick') await mouse(+a, +b, 'right');
  else if (cmd === 'key') {
    const codes = { Escape: 27, Enter: 13, Backspace: 8, Tab: 9 };
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: a, code: a, windowsVirtualKeyCode: codes[a], nativeVirtualKeyCode: codes[a] });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: a, code: a, windowsVirtualKeyCode: codes[a], nativeVirtualKeyCode: codes[a] });
  } else if (cmd === 'type') await send('Input.insertText', { text: a });
  else if (cmd === 'shot') {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(a, Buffer.from(r.result.data, 'base64'));
    console.log(a);
  }
  ws.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
