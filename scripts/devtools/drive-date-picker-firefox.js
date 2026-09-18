#!/usr/bin/env node
/**
 * The Date Picker in FIREFOX, on the todo list demo (a served folder or the live site).
 *
 * Why this exists: every other drive of the picker runs headless Chrome, and the picker shipped
 * (2026-09-16) drawing TWO calendar icons in Firefox — its own button, which no CSS can hide, beside
 * the picker's. Firefox now keeps its own picker, so this asserts: no enhancement, no popup of ours,
 * and a date changed in the field is still stored when the field is left.
 *
 * Needs a `playwright-core` whose Firefox revision is installed (this repo does not depend on it):
 *
 *   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core \
 *     node scripts/devtools/drive-date-picker-firefox.js https://nodegx.io/templates/todo-list/
 *
 * Exits 0 when every clause passed.
 */
const url = process.argv[2];
if (!url || !process.env.PLAYWRIGHT_CORE) {
  console.error('usage: PLAYWRIGHT_CORE=<playwright-core dir> drive-date-picker-firefox.js <todo demo url>');
  process.exit(2);
}
const { firefox } = require(process.env.PLAYWRIGHT_CORE);

const STORAGE_KEY = 'nodegx-todo-list-demo-v1';
const TASK = 'Write the release notes';

(async () => {
  const browser = await firefox.launch({ headless: true });
  let failed = 0;
  const check = (name, ok, saw) => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const stored = () =>
      page.evaluate(
        ([key, title]) => (JSON.parse(localStorage.getItem(key) || '{}').Task || []).find((t) => t.title === title)?.deadline,
        [STORAGE_KEY, TASK]
      );

    await page.goto(url);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.goto(url);
    // Counted from the clean load: the first navigation aborts its own in-flight fetches, and Firefox
    // reports each abort as a NetworkError that says nothing about the page.
    errors.length = 0;
    await page.getByText(TASK, { exact: true }).first().click();
    await page.waitForSelector('.ndg-dp-input', { timeout: 15000 });

    const state = await page.evaluate(() => ({
      type: document.querySelector('.ndg-dp-input').type,
      enhanced: !!document.querySelector('.ndg-dp--enhanced'),
      ourButtonShown: getComputedStyle(document.querySelector('.ndg-dp-button')).display !== 'none'
    }));
    check('a date input, left to Firefox (no enhancement, our button hidden)', state.type === 'date' && !state.enhanced && !state.ourButtonShown, JSON.stringify(state));

    const before = await stored();
    await page.click('.ndg-dp-input', { position: { x: 20, y: 20 } });
    await page.waitForTimeout(500);
    check('pressing the field opens no calendar of ours', !(await page.evaluate(() => !!document.querySelector('.ndg-dp-pop'))));
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    const mid = await stored();
    // Tab moves between the date's own segments in Firefox, so leave the field with a click elsewhere.
    await page.mouse.click(1200, 880);
    await page.waitForTimeout(1500);
    const after = await stored();
    const field = await page.inputValue('.ndg-dp-input');
    check('a typed change waits for the field to be left, then is stored', mid === before && after === field && after !== before, JSON.stringify({ before, mid, after, field }));
    check('logs no errors', errors.length === 0, JSON.stringify(errors));
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
