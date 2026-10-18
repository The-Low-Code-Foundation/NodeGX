// The editor in headless Chrome, pressed through the way a child would: pick a part, tap blocks,
// type, tap sizes and colours, add, move, take away, undo, join and unjoin, drag a helper, save.
// Then the files on disk are checked, and the page is opened again to see the changes stayed.
//   node test/browser.test.mjs [app folder] [copy name]

import fs from 'node:fs';
import path from 'node:path';
import { validateStructure } from '@nodegx/project-contract/editor-suite.js';
import { startEditor, editor } from './browser-harness.mjs';

const app = path.resolve(editor, process.argv[2] || '../todo-list');
const run = await startEditor(app, process.argv[3] || 'browser');
const { page } = run;
let failures = 0;
const check = (ok, words) => {
  console.log(`${ok ? 'ok ' : 'BAD'} ${words}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tap = async (selector) => {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await page.click(selector);
};
const appText = () => page.evaluate(() => document.querySelector('#screen iframe:not([style*="hidden"])')?.contentDocument?.body?.innerText || '');
const waitForApp = async (words, ms = 20000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if ((await appText()).includes(words)) return true;
    await sleep(250);
  }
  return false;
};
const selectAll = async (selector) => {
  await page.waitForSelector(selector, { visible: true });
  await page.focus(selector);
  await page.$eval(selector, (e) => e.select());
};
const shot = (name) => page.screenshot({ path: path.join(editor, '.test-copies', name + '.png') });

try {
  await page.waitForFunction(() => window.bigBlocks?.lastPreview?.status === 'ok', { timeout: 60000 });
  check(true, 'the editor opened and the real app is running beside it');

  // A screen: change the title's words, size and colour.
  await tap('[data-part="Pages/Sign in"]');
  await tap('[data-face="siTitle"]');
  await page.waitForSelector('textarea[data-setting="text"]');
  await selectAll('textarea[data-setting="text"]');
  await page.keyboard.type('My very own list');
  await page.keyboard.press('Enter');
  await tap('[data-size="huge"]');
  await tap('[data-colour="var(--red-500)"]');
  check(await waitForApp('My very own list'), 'the new words show in the app before saving');
  const titleLook = await page.evaluate(() => {
    const el = window.bigBlocks.state.preview.elementsOf('siTitle')[0];
    if (!el) return null;
    const cs = getComputedStyle(el.querySelector('*') || el);
    const probe = el.ownerDocument.createElement('div');
    probe.style.cssText = 'font-size:var(--text-5xl);color:var(--red-500)';
    el.ownerDocument.body.append(probe);
    const want = getComputedStyle(probe);
    const out = { size: cs.fontSize, colour: cs.color, wantSize: want.fontSize, wantColour: want.color };
    probe.remove();
    return out;
  });
  check(titleLook && titleLook.size === titleLook.wantSize && titleLook.colour === titleLook.wantColour && parseFloat(titleLook.size) >= 40, `the app draws them big and red (${JSON.stringify(titleLook)})`);
  await sleep(400);
  const ringBox = await page.evaluate(() => {
    const r = document.querySelector('#screen .ring');
    const t = window.bigBlocks.state.preview.elementsOf('siTitle')[0]?.getBoundingClientRect();
    return r && !r.hidden && t ? { ring: [r.offsetLeft, r.offsetTop, r.offsetWidth, r.offsetHeight], title: [Math.round(t.left), Math.round(t.top), Math.round(t.width), Math.round(t.height)] } : null;
  });
  check(ringBox && Math.abs(ringBox.ring[0] + 4 - ringBox.title[0]) <= 2 && Math.abs(ringBox.ring[2] - 8 - ringBox.title[2]) <= 2, `the picked block is ringed in the app (${JSON.stringify(ringBox)})`);
  check((await page.$eval('#save', (b) => !b.disabled && b.textContent)).includes('1 part'), 'Save says one part has changed');

  // Name it.
  await selectAll('input[data-setting="label"]');
  await page.keyboard.type('Big red title');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-face="siTitle"] .name')?.textContent === 'Big red title');
  check(true, 'renaming shows on the block');

  // Add words into the card, then move them up.
  await tap('[data-face="siCard"]');
  await tap('[data-add="Text"]');
  const added = await page.evaluate(() => window.bigBlocks.state.picked);
  check(added && !['siCard', 'siTitle'].includes(added), 'tapping Words adds a block and picks it');
  await selectAll('textarea[data-setting="text"]');
  await page.keyboard.type('Made by me');
  await page.keyboard.press('Enter');
  const order = () => page.evaluate(() => window.bigBlocks.doc.node('Pages/Sign in', 'siCard').children);
  const lastBefore = (await order()).indexOf(added);
  await page.evaluate(() => [...document.querySelectorAll('#change button')].find((b) => b.textContent.includes('Up')).click());
  check((await order()).indexOf(added) === lastBefore - 1, 'Up moves it up one');
  check(await waitForApp('Made by me'), 'the added words show in the app');

  // Take one away, say yes, then undo.
  await tap('[data-face="siLead"]');
  await tap('[data-remove="siLead"]');
  await page.waitForSelector('#ask[open]');
  await page.click('#ask-yes');
  await page.waitForFunction(() => !document.querySelector('[data-face="siLead"]'));
  check(true, 'Take it away, then Yes, removes the block');
  await tap('#undo');
  await page.waitForSelector('[data-face="siLead"]');
  check(true, 'Undo brings it back');

  // A piece: unjoin a button and join it again.
  await tap('[data-part="Todo/Theme switch"]');
  await tap('[data-face="thToDark"]');
  const linkWords = await page.$$eval('#change .link .words', (els) => els.map((e) => e.textContent));
  check(linkWords.some((w) => w.includes('is pressed') && w.includes('Switch to the other theme')), `the join reads as words: ${JSON.stringify(linkWords)}`);
  await page.click('#change .link button');
  await page.waitForFunction(() => !document.querySelector('#change .link'));
  check(true, '✂️ unjoins it');
  await tap('[data-link="start"]');
  await tap('[data-link-target="thFlip"]');
  await page.waitForSelector('#change .link');
  const wires = await page.evaluate(() => window.bigBlocks.doc.wires('Todo/Theme switch'));
  check(wires.some((w) => w.fromId === 'thToDark' && w.fromProperty === 'onClick' && w.toId === 'thFlip' && w.toProperty === 'run'), 'joining it again writes onClick → run');

  // Drag a helper on the shelf.
  await page.click('#helpers-box summary');
  const card = await page.waitForSelector('#helpers [data-face="thFlip"]', { visible: true });
  const box = await card.boundingBox();
  const was = await page.evaluate(() => ({ ...window.bigBlocks.doc.node('Todo/Theme switch', 'thFlip') }));
  await page.mouse.move(box.x + 40, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 70, { steps: 8 });
  await page.mouse.up();
  const now = await page.evaluate(() => ({ ...window.bigBlocks.doc.node('Todo/Theme switch', 'thFlip') }));
  check(now.x === was.x + 60 && now.y === was.y + 50, `dragging a helper moves it (${was.x},${was.y} → ${now.x},${now.y})`);
  await shot('editor-before-save');

  // Save, and look at the files.
  await tap('#save');
  await page.waitForFunction(() => document.getElementById('message').textContent.includes('Saved'), { timeout: 10000 });
  check(true, 'Save says Saved');
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(run.copy, rel), 'utf8'));
  const signIn = read('components/Pages/Sign in/nodes.json');
  const title = signIn.nodes.find((n) => n.id === 'siTitle');
  check(title.parameters.text === 'My very own list' && title.parameters.fontSize === 'var(--text-5xl)' && title.parameters.color === 'var(--red-500)' && title.label === 'Big red title', 'the title is saved with its words, size, colour and name');
  const mine = signIn.nodes.find((n) => n.id === added);
  check(mine && mine.parent === 'siCard' && mine.parameters.text === 'Made by me' && mine.x === undefined, 'the added words are saved inside the card, with no position');
  check(signIn.nodes.some((n) => n.id === 'siLead'), 'the block taken away and undone is still there');
  const theme = read('components/Todo/Theme switch/nodes.json');
  check(theme.nodes.find((n) => n.id === 'thFlip').x === now.x, 'the helper’s new place is saved');
  const all = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else all[path.relative(run.copy, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
    }
  };
  walk(run.copy);
  const problems = validateStructure(all);
  check(problems.length === 0, `every saved file fits the format${problems.length ? ': ' + problems.slice(0, 3).join(' | ') : ''}`);
  check(fs.readFileSync(path.join(run.copy, 'nodegx.project.json'), 'utf8') === fs.readFileSync(path.join(app, 'nodegx.project.json'), 'utf8'), 'the project file is untouched');

  // Open it again: the changes stayed.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.bigBlocks?.lastPreview?.status === 'ok', { timeout: 60000 });
  await tap('[data-part="Pages/Sign in"]');
  const name = await page.$eval('[data-face="siTitle"] .name', (e) => e.textContent);
  check(name === 'Big red title' && (await page.$eval('#save', (b) => b.disabled)), 'opened again, the change is there and nothing is unsaved');
  check(await waitForApp('My very own list'), 'and the app shows it');
  await shot('editor-after-reopen');
  check(run.errors.length === 0, `no errors in the page${run.errors.length ? ': ' + run.errors.slice(0, 3).join(' | ') : ''}`);
} catch (err) {
  check(false, err.stack || String(err));
  await shot('editor-failure').catch(() => {});
} finally {
  await run.stop();
}
process.exit(failures ? 1 : 0);
