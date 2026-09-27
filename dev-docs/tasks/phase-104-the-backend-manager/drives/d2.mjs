export default async ({ ev, shot, sleep, nav, key, typeText }) => {
  const q = (n) => `fetch('/api/Pet?where='+encodeURIComponent(JSON.stringify({name:'${n}'})),{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>JSON.stringify(j.results[0]||null))`;
  await nav('http://127.0.0.1:8692/_admin#token=t0k');
  await ev(`location.hash = '#/collections'`); await sleep(900);
  await ev(`(function(){var s=document.querySelector('#app select'); s.value='Pet'; s.dispatchEvent(new Event('change'));})()`); await sleep(900);
  const cellOf = (rowName, col) => `(function(){var ths=[...document.querySelectorAll('table.grid th')].map(t=>t.firstChild&&t.firstChild.textContent);var ci=ths.indexOf('${col}');var tr=[...document.querySelectorAll('table.grid tbody tr')].find(r=>[...r.children].some(td=>td.textContent==='${rowName}'));return tr.children[ci];})()`;
  // inline text edit: Bella -> Belle via Enter
  await ev(`${cellOf('Bella','name')}.click()`); await sleep(200);
  await ev(`document.activeElement.select()`); await typeText('Belle'); await key('Enter'); await sleep(700);
  console.log('after Enter:', await ev(q('Belle')));
  // inline number edit + Escape cancels
  await ev(`${cellOf('Belle','age')}.click()`); await sleep(200);
  await ev(`document.activeElement.select()`); await typeText('99'); await key('Escape'); await sleep(500);
  console.log('after Esc, age:', await ev(`${q('Belle')}.then(s=>JSON.parse(s).age)`));
  // inline number via blur
  await ev(`${cellOf('Belle','age')}.click()`); await sleep(200);
  await ev(`document.activeElement.select()`); await typeText('6'); await ev(`document.activeElement.blur()`); await sleep(700);
  console.log('after blur, age:', await ev(`${q('Belle')}.then(s=>JSON.parse(s).age)`));
  // boolean toggle
  await ev(`${cellOf('Belle','isGood')}.click()`); await sleep(700);
  console.log('bool toggled:', await ev(`${q('Belle')}.then(s=>JSON.parse(s).isGood)`), 'cell:', await ev(`${cellOf('Belle','isGood')}.textContent`));
  // date inline
  await ev(`${cellOf('Belle','born')}.click()`); await sleep(200);
  await ev(`(function(){var i=document.activeElement;i.value='2022-07-08T12:00';})()`); await key('Enter'); await sleep(700);
  console.log('date:', await ev(`${q('Belle')}.then(s=>JSON.parse(s).born)`));
  // array via modal
  await ev(`${cellOf('Belle','tags')}.click()`); await sleep(400);
  await shot('c5-json-modal');
  await ev(`document.querySelector('.modal textarea').value='["x"]'`);
  await ev(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Save').click()`); await sleep(700);
  console.log('tags:', await ev(`${q('Belle')}.then(s=>JSON.stringify(JSON.parse(s).tags))`));
  // pointer inline
  await ev(`${cellOf('Belle','owner')}.click()`); await sleep(600);
  await ev(`(function(){var s=document.activeElement; s.value=s.options[s.options.length-1].value; s.dispatchEvent(new Event('change'));})()`); await sleep(700);
  console.log('owner:', await ev(`${q('Belle')}.then(s=>JSON.parse(s).owner)`));
  await shot('c6-after-inline');
  // Edit form prefilled
  await ev(`(function(){var tr=[...document.querySelectorAll('table.grid tbody tr')].find(r=>[...r.children].some(td=>td.textContent==='Belle'));[...tr.querySelectorAll('button')].find(b=>b.textContent==='Edit').click();})()`); await sleep(700);
  console.log('edit form values:', await ev(`[...document.querySelectorAll('.modal .field')].map(f=>f.querySelector('b').textContent+'='+(function(i){return i.type==='checkbox'?i.checked:i.value})(f.querySelector('input,textarea,select'))).join(' ; ')`));
  await shot('c7-edit-form');
  await ev(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Cancel').click()`); await sleep(300);
  // search
  await ev(`(function(){var s=document.querySelector('input[type=search]'); s.value='mil'; s.dispatchEvent(new Event('input'));})()`); await sleep(1000);
  console.log('search rows:', await ev(`[...document.querySelectorAll('table.grid tbody tr')].length`), await ev(`document.querySelector('.chip.accent').textContent`));
  await ev(`(function(){var s=document.querySelector('input[type=search]'); s.value=''; s.dispatchEvent(new Event('input'));})()`); await sleep(1000);
  // bulk select 2 and delete
  await ev(`[...document.querySelectorAll('table.grid tbody td.pick input')].slice(0,2).forEach(c=>{c.checked=true;c.dispatchEvent(new Event('change'))})`); await sleep(200);
  console.log('bulk button:', await ev(`[...document.querySelectorAll('button')].map(b=>b.textContent).find(t=>/selected/.test(t))`));
  await ev(`[...document.querySelectorAll('button')].find(b=>/selected/.test(b.textContent)).click()`); await sleep(300);
  await shot('c8-bulk-confirm');
  await ev(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Delete').click()`); await sleep(1200);
  console.log('rows left:', await ev(`[...document.querySelectorAll('table.grid tbody tr')].length`));
};
