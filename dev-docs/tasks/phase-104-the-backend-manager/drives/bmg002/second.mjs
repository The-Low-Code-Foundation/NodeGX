// BMG-002 AC4, the second browser: a fresh Chrome profile (no localStorage, no sessionStorage) on the
// same backend opens the view the first browser saved; then *Delete view* asks before it deletes.
// usage: run.sh second keep $DRIVES/bmg002/second.mjs   (after `run.sh ac seed`)
export default async ({ ev, sleep, nav, shot }) => {
  const fs = await import('fs');
  const base = `http://127.0.0.1:${process.env.PORT || '8697'}`;
  const J = JSON.stringify;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + ' — ' + J(detail).slice(0, 300));
  };
  const admin = async (method, p) => (await fetch(base + p, { method, headers: { authorization: 'Bearer t0k' } })).json();
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}); b.click(); return true})()`);

  out.storageAtStart = await (async () => {
    await nav(`${base}/_admin`);
    return ev(`localStorage.length + sessionStorage.length`);
  })();
  // A hash change on the same document is not a navigation; leave the page so the handoff boots.
  await nav('about:blank');
  await nav(`${base}/_admin#token=t0k`);
  await sleep(1500);
  await ev(`location.hash = '#/collections/Task'`);
  await sleep(1500);
  const options = await ev(`[...document.querySelectorAll('#main select[aria-label="View"] option')].map(function(o){return o.textContent})`);
  await setVal('#main select[aria-label="View"]', 'Not done, biggest first');
  await sleep(1200);
  const sentence = await ev(`document.querySelector('.result-sentence').textContent.trim()`);
  const heads = await ev(`[...document.querySelectorAll('#main table.grid thead th')].map(function(th){return th.textContent.trim().split(' ')[0]}).filter(Boolean)`);
  const want = (await admin('GET', '/api/Task?count=1&limit=1&where=' + encodeURIComponent(J({ $or: [{ done: { $eq: false } }, { done: { $exists: false } }] })))).count;
  ok('AC4 a second browser (empty storage) opens the saved view', out.storageAtStart === 0 && options.indexOf('Not done, biggest first') !== -1 && sentence.indexOf(want + ' records where done is no') === 0 && heads[0] === 'n', { storageAtStart: out.storageAtStart, options, sentence, want, heads });
  await shot('bmg002-second-browser');

  await clickText('#main button', 'Delete view');
  await sleep(400);
  const asked = await ev(`(function(){var m=document.querySelector('.modal'); return m ? m.textContent : null})()`);
  const stillThere = (await admin('GET', '/admin/views/Task')).views.length;
  await shot('bmg002-delete-view-asks');
  await clickText('.modal button', 'Delete');
  await sleep(800);
  const after = (await admin('GET', '/admin/views/Task')).views.length;
  const optionsAfter = await ev(`[...document.querySelectorAll('#main select[aria-label="View"] option')].map(function(o){return o.textContent})`);
  ok('AC4 Delete view asks first, and deletes only on Delete', !!asked && asked.indexOf('Not done, biggest first') !== -1 && stillThere === 1 && after === 0 && optionsAfter.length === 1, { asked, stillThere, after, optionsAfter });
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
};
