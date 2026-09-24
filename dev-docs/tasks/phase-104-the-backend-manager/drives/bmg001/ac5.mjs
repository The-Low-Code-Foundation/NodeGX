// AC5: on a FRESH backend every list page shows an EmptyState with a CTA.
import fs from 'fs';
export default async ({ ev, sleep, nav, shot }) => {
  const port = process.env.PORT || '8697';
  await nav(`http://127.0.0.1:${port}/_admin#token=t0k`);
  await sleep(1500);
  const views = ['collections','schema','users','roles','signin','permissions','keys','triggers','workflows','runs','files','email','backups','audit'];
  const out = {};
  for (const v of views) {
    await ev(`location.hash = '#/${v}'`); await sleep(1400);
    out[v] = await ev(`(function(){var e=[...document.querySelectorAll('#main .empty-state')]; return e.map(function(x){var b=x.querySelector('button, a.empty-docs'); return {text:(x.querySelector('.empty-text')||{}).textContent||'', cta: b? b.textContent.trim() : null}})})()`);
    if (v === 'users' || v === 'triggers') await shot('ac5-' + v);
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  for (const [v, e] of Object.entries(out)) console.log(v.padEnd(12), e.length ? e.map((x) => `[${x.cta}] ${x.text}`).join(' | ') : '(no empty state)');
};
