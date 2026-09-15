// CHR-006 AC2 drive: "Use this template →" on a card creates a project that starts with the card's picture.
//   NOODL_REMOTE_DEBUG_PORT=9333 node ac2.js <outDir> <profileDir> <expectedShot> [--title="Todo list"] [--name=chr006-todo]
// Steps: reload → Templates → click the card → the wizard → type a name (the location is the profile's
// remembered folder, never a native dialog) → the confirm button → then read the CONSEQUENCE off disk:
// the profile's recently_opened_project.json row for that name, and whether its thumbURI is a data URI of
// exactly the expected shot's bytes. A shot of the wizard and of whatever the app shows after.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const [outDir, profileDir, expectedShot] = args.filter((a) => !a.startsWith('--'));
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split('=')[1];
const title = opt('title', 'Todo list');
const projectName = opt('name', 'chr006-todo');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (client, name) => {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
};

(async () => {
  const log = {};
  let client = await connect(await appTarget());
  let ev = (expr) => evaluate(client, expr);
  await ev('location.reload()');
  await sleep(4000);
  client = await connect(await appTarget());
  ev = (expr) => evaluate(client, expr);
  const waitFor = async (expr, ms, what) => {
    const t0 = Date.now();
    while (!(await ev(expr))) {
      if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
      await sleep(400);
    }
  };
  await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`, 90000, 'the launcher');
  await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((x) => x.textContent === 'Templates').click()`);
  await waitFor(`document.querySelectorAll('[data-test="template-card"]').length > 0`, 30000, 'template cards');
  await sleep(1500);

  log.cardHasPicture = await ev(`(() => { const c = [...document.querySelectorAll('[data-test="template-card"]')].find((x) => x.querySelector('h3') && x.querySelector('h3').textContent === ${JSON.stringify(title)});
    const img = c && c.querySelector('img'); return img ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 } : null; })()`);
  const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[data-test="template-card"]')].find((x) => x.querySelector('h3') && x.querySelector('h3').textContent === ${JSON.stringify(title)}); if (c) c.click(); return !!c; })()`);
  if (!clicked) throw new Error(`no card titled ${title}`);
  await waitFor(`!!document.querySelector('input[placeholder="My New Project"]')`, 15000, 'the wizard name field');
  await sleep(600);

  // A React-controlled input: the native value setter, then an input event React listens for.
  await ev(`(() => { const i = document.querySelector('input[placeholder="My New Project"]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(projectName)});
    i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(600);
  log.wizard = await ev(`(() => ({ location: (document.querySelector('input[placeholder="Choose folder..."]') || {}).value,
    buttons: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /Create|Next/.test(t)) }))()`);
  await shot(client, 'ac2-wizard.png');

  // Walk "Next" until the confirm button is the one on screen, then press it.
  for (let step = 0; step < 5; step++) {
    const label = await ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(Create Project|Create project|Next)/.test(x.textContent.trim()) && !x.disabled); if (!b) return null; const t = b.textContent.trim(); b.click(); return t; })()`);
    (log.pressed = log.pressed || []).push(label);
    if (!label || /^Create/.test(label)) break;
    await sleep(900);
  }

  // The consequence, off disk: the recent-projects row and its thumbURI.
  const recentFile = path.join(profileDir, 'recently_opened_project.json');
  const expected = `data:image/webp;base64,${fs.readFileSync(expectedShot).toString('base64')}`;
  const t0 = Date.now();
  let row = null;
  while (Date.now() - t0 < 60000) {
    try {
      const rows = JSON.parse(fs.readFileSync(recentFile, 'utf8')).recentProjects || [];
      row = rows.find((r) => r.name === projectName || (r.retainedProjectDirectory || '').endsWith(`/${projectName}`)) || null;
      if (row && row.thumbURI && row.thumbURI.startsWith('data:image/')) break;
    } catch {}
    await sleep(1000);
  }
  log.recentRow = row && { name: row.name, dir: row.retainedProjectDirectory, thumbPrefix: (row.thumbURI || '').slice(0, 30), thumbLength: (row.thumbURI || '').length };
  log.thumbEqualsShot = Boolean(row && row.thumbURI === expected);
  await sleep(4000);
  await shot(client, 'ac2-after-create.png');
  fs.writeFileSync(path.join(outDir, 'ac2.json'), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
  process.exit(log.thumbEqualsShot ? 0 : 2);
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});
