/**
 * TPL-010-L L5 — `?task=<id>` opens that task in the todo list, driven as a DEPLOYED todo demo.
 *
 * Planning links a block to its task with `<todoUrl>?task=<id>`. This opens the todo demo at
 * `?task=seed-task-vat` (one of its seeded tasks, not the first) and reads the detail pane: the task
 * the link named is the one selected, its history is loaded, and nothing is logged as an error.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/todo-list-demo <site>/templates/todo-list --base-url /templates/todo-list/ --allow-development-engine
 *   node scripts/devtools/drive-tpl010-l5.js <site> --path /templates/todo-list/ [--shots <dir>]
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = flag('--shots');
const BASE = (flag('--path') || '/').replace(/\/?$/, '/');
if (!DIR) {
  console.error('usage: drive-tpl010-l5.js <site-dir|https://origin> [--path /templates/todo-list/] [--shots <dir>]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
};

const LIVE = /^https?:\/\//.test(DIR);
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const js = (expr) => page.evaluate(expr);
  const until = async (read, ok, ms = 12000) => {
    const end = Date.now() + ms;
    let last = await read();
    while (!ok(last) && Date.now() < end) {
      await wait(250);
      last = await read();
    }
    return last;
  };
  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(`${BASE}?task=seed-task-vat`);
  const text = await until(
    () => js('document.body.innerText'),
    (t) => String(t).includes('Select a task') === false && String(t).includes('Chase the accountant about VAT') && String(t).includes('History')
  );
  const empty = await js(`[...document.querySelectorAll('*')].some((e) => e.childElementCount === 0 && e.textContent.trim() === 'Select a task to see its details.' && e.getClientRects().length)`);
  check('L5 — the link selects a task (the detail pane is not empty)', !empty, 'the pane says Select a task');
  const title = await js(`(() => { const i = [...document.querySelectorAll('input, textarea')].find((x) => x.value === 'Chase the accountant about VAT'); return i ? i.value : null; })()`);
  const heading = await js(`[...document.querySelectorAll('h1,h2,h3')].map((h) => h.textContent.trim()).join(' | ')`);
  check('L5 — …and it is the task the link named', title === 'Chase the accountant about VAT' || String(heading).includes('Chase the accountant about VAT'), `${title} / ${heading}`);
  check('L5 — its history is on screen', String(text).includes('History'), String(text).slice(0, 300));
  if (SHOTS) await page.screenshot(path.join(SHOTS, 'l5-todo-link.png'));

  await page.navigate(BASE);
  await wait(1500);
  const plain = await js(`[...document.querySelectorAll('*')].some((e) => e.childElementCount === 0 && e.textContent.trim() === 'Select a task to see its details.' && e.getClientRects().length)`);
  check('without ?task= nothing is selected (the link was read once)', plain, 'a task was selected');
  check('logs no console errors', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors));
})
  .then(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} clauses`);
    process.exit(failed ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
