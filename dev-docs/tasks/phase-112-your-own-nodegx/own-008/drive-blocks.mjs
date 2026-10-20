// OWN-008 AC1, the blocks stranger: open a copy of the todo app in Big Blocks (already running on URL, started with
// --no-open), and make a child's change the way a child would: tap the Header part, tap its title block, change
// "what it says" in the Change it panel, tap Save. `node drive-blocks.mjs <url> <outDir>`.
import path from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out] = process.argv.slice(2);
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 900));
const c = await openChrome(url);
try {
  await c.waitFor(`document.querySelector('#parts button[data-part="Todo/Header"]')`, 20_000, 'the parts list');
  await c.press(`document.querySelector('#parts button[data-part="Todo/Header"]')`, 'the Header part');
  await c.waitFor(`document.querySelector('#blocks [data-block="hdTitle"]')`, 10_000, 'the title block');
  await c.press(`document.querySelector('#blocks [data-block="hdTitle"]')`, 'the title block');
  await c.waitFor(`document.querySelector('#change input, #change textarea')`, 10_000, 'the Change it panel');
  const fields = await c.ev(`[...document.querySelectorAll('#change input, #change textarea')].map((f) => ({
    tag: f.tagName, type: f.type, value: f.value, label: (f.labels?.[0]?.textContent || f.getAttribute('aria-label') || f.placeholder || '').trim().slice(0, 40) }))`);
  say('change panel', { heading: await c.ev(`document.querySelector('#change h2, #change h3')?.textContent`), fields });
  const i = fields.findIndex((f) => f.value === 'Todo list');
  if (i < 0) throw new Error('no field holds the title "Todo list"');
  await c.press(`document.querySelectorAll('#change input, #change textarea')[${i}]`, `the "${fields[i].label}" field`);
  await c.selectAllAndType('My week');
  await c.key('Tab');
  await c.waitFor(`/My week/.test(document.querySelector('#blocks [data-block="hdTitle"]').textContent)`, 5000, 'the block to show the new words');
  say('typed', { block: await c.ev(`document.querySelector('#blocks [data-block="hdTitle"]').textContent.trim()`), save: await c.ev(`document.getElementById('save').textContent.trim()`) });
  await c.shot(path.join(out, 'blocks-0-changed.png'));
  await c.press(`document.getElementById('save')`, 'Save');
  await c.waitFor(`/^\\W*Saved/.test(document.getElementById('save').textContent.trim()) && document.getElementById('save').disabled`, 10_000, 'Save to settle');
  say('saved', { save: await c.ev(`document.getElementById('save').textContent.trim()`), message: await c.ev(`document.getElementById('message').textContent.trim()`) });
  await c.shot(path.join(out, 'blocks-1-saved.png'));
  say('page errors', { errors: c.errors });
} finally {
  c.close();
}
