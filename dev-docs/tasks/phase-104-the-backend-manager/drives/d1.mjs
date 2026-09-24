export default async ({ ev, shot, sleep, nav, key, typeText }) => {
  await nav('http://127.0.0.1:8692/_admin#token=t0k');
  await ev(`location.hash = '#/collections'`); await sleep(900);
  await ev(`(function(){var s=document.querySelector('#app select'); s.value='Pet'; s.dispatchEvent(new Event('change'));})()`); await sleep(900);
  await shot('c1-grid');
  console.log('headers:', await ev(`[...document.querySelectorAll('table.grid th')].map(t=>t.textContent).join(' | ')`));
  console.log('row1:', await ev(`[...document.querySelectorAll('table.grid tbody tr')[0].children].map(t=>t.textContent).join(' | ')`));
  // New record form
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent==='New record').click()`); await sleep(700);
  await shot('c2-new-form');
  console.log('form fields:', await ev(`[...document.querySelectorAll('.modal .field-head')].map(h=>h.textContent).join(' / ')`));
  console.log('owner options:', await ev(`[...document.querySelectorAll('.modal select option')].map(o=>o.textContent).join(' / ')`));
  // Required check: submit empty
  await ev(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Create').click()`); await sleep(300);
  console.log('empty submit error:', await ev(`document.querySelector('.modal .notice.bad').textContent`));
  // Fill
  await ev(`(function(){var f=[...document.querySelectorAll('.modal .field')];
    function inp(n){return f.find(x=>x.querySelector('b').textContent===n)}
    inp('name').querySelector('input').value='Milo';
    inp('age').querySelector('input').value='7';
    inp('isGood').querySelector('input').checked=true;
    inp('born').querySelector('input').value='2019-03-04T09:30';
    inp('tags').querySelector('textarea').value='["small","brown"]';
    var s=inp('owner').querySelector('select'); s.value=s.options[s.options.length-1].value; })()`);
  await shot('c3-new-filled');
  await ev(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Create').click()`); await sleep(1000);
  console.log('modal gone:', await ev(`!document.querySelector('.modal')`));
  const rec = await ev(`fetch('/api/Pet?where='+encodeURIComponent(JSON.stringify({name:'Milo'})),{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>JSON.stringify(j.results[0]))`);
  console.log('stored:', rec);
  await shot('c4-after-create');
};
