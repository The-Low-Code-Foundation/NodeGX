// CHR-010 s33 — send a real key press to the editor renderer.
//
// 🔴 Keys and focus emulation must ride the SAME connection: a headless window is not focused, so
// without `Emulation.setFocusEmulationEnabled` on this client the renderer routes the press
// nowhere and the drive reads "nothing happened" as "the control ignored it".
//
//   NOODL_REMOTE_DEBUG_PORT=9231 node press.js Enter [--selector='<css>'] [--text=<literal>]
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate, elementCentre, dispatchClick } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const key = args.find((a) => !a.startsWith('--')) || 'Enter';
const selector = opt('selector', '');
const text = opt('text', '');

const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', vk: 27, text: '' },
  Tab: { key: 'Tab', code: 'Tab', vk: 9, text: '\t' }
};

(async () => {
  const client = await connect(await appTarget('editor'));
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  if (selector) {
    const box = await elementCentre(client, selector);
    await dispatchClick(client, box);
    await new Promise((r) => setTimeout(r, 300));
  }
  if (text) {
    await client.send('Input.insertText', { text });
    await new Promise((r) => setTimeout(r, 200));
  }
  const k = KEYS[key];
  if (!k) throw new Error('unknown key ' + key);
  for (const type of ['keyDown', ...(k.text ? ['char'] : []), 'keyUp']) {
    await client.send('Input.dispatchKeyEvent', {
      type,
      key: k.key,
      code: k.code,
      windowsVirtualKeyCode: k.vk,
      nativeVirtualKeyCode: k.vk,
      ...(type === 'char' ? { text: k.text, unmodifiedText: k.text } : {})
    });
  }
  await new Promise((r) => setTimeout(r, 800));
  const active = await evaluate(client, `(() => { const a = document.activeElement; return a ? a.tagName + '.' + String(a.className).slice(0, 40) : 'none'; })()`);
  console.log(`pressed ${key}${selector ? ' after clicking ' + selector : ''}${text ? ' + typed ' + JSON.stringify(text) : ''}; activeElement now ${active}`);
  await client.close();
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});
