// OWN-008 AC1, the table stranger: open a copy of the todo app in its editor (already running on URL), retitle the
// header the way a person would (the component in the list, the Text's `text` cell, type, Enter, Save), and read
// the page's own status. `node drive-table.mjs <url> <outDir>`.
import path from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out] = process.argv.slice(2);
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 600));
const c = await openChrome(url);
try {
  await c.waitFor(`document.querySelector('button[data-key="Todo/Header"]')`, 20_000, 'the component list');
  await c.shot(path.join(out, 'table-0-open.png'));
  await c.press(`document.querySelector('button[data-key="Todo/Header"]')`, 'Todo/Header in the list');
  await c.waitFor(`document.querySelector('td[data-node="hdTitle"]')`, 10_000, 'the hdTitle row');
  const cols = await c.ev(`[...document.querySelectorAll('td[data-node="hdTitle"]')].map((td) => td.dataset.col + '=' + td.textContent.trim().slice(0, 30))`);
  say('row', { cols });
  const textCol = await c.ev(`[...document.querySelectorAll('td[data-node="hdTitle"]')].map((td) => td.dataset.col).find((k) => /(^|[:>\\s])text$/.test(k) || k === 'in:text' || k === 'text')`);
  say('text column', { textCol });
  await c.press(`document.querySelector('td[data-node="hdTitle"][data-col=${JSON.stringify(textCol)}]')`, 'the title cell');
  await c.waitFor(`document.getElementById('ed-text')`, 5000, 'the cell editor');
  say('editing', { before: await c.ev(`document.getElementById('ed-text').value`) });
  await c.selectAllAndType('My week');
  await c.key('Enter');
  say('after Enter', { cell: await c.ev(`document.querySelector('td[data-node="hdTitle"][data-col=${JSON.stringify(textCol)}]').textContent.trim()`), save: await c.ev(`document.getElementById('save').textContent`) });
  await c.press(`document.getElementById('save')`, 'Save');
  await c.waitFor(`/sav/i.test(document.getElementById('status').textContent)`, 10_000, 'a save status');
  say('saved', { status: await c.ev(`document.getElementById('status').textContent`), save: await c.ev(`document.getElementById('save').textContent`) });
  await c.shot(path.join(out, 'table-1-saved.png'));
  say('page errors', { errors: c.errors });
} finally {
  c.close();
}
