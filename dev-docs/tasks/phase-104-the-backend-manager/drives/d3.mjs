export default async ({ ev, shot, sleep, nav, key, typeText }) => {
  const schema = (t) => `fetch('/admin/schema',{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>JSON.stringify(j.tables.find(x=>x.name==='${t}')||null))`;
  const btn = (txt, scope='') => `[...document.querySelectorAll('${scope} button')].find(b=>b.textContent===${JSON.stringify(txt)})`;
  const card = (t) => `[...document.querySelectorAll('.card')].find(c=>c.querySelector('b').textContent==='${t}')`;
  await nav('http://127.0.0.1:8692/_admin#token=t0k');
  await ev(`location.hash = '#/schema'`); await sleep(900);
  await shot('s1-schema');
  // New collection with two fields, one a pointer
  await ev(`${btn('New collection')}.click()`); await sleep(400);
  await ev(`${btn('Create collection', '.modal')}.click()`); await sleep(200);
  console.log('empty name error:', await ev(`document.querySelector('.modal .notice.bad').textContent`));
  await ev(`(function(){var m=document.querySelector('.modal');m.querySelector('input').value='Visit';
    var l=m.querySelectorAll('.field-line')[0]; l.querySelector('input[type=text]').value='when'; var s=l.querySelector('select'); s.value='Date'; s.dispatchEvent(new Event('change'));})()`);
  await ev(`${btn('+ Add field', '.modal')}.click()`); await sleep(100);
  await ev(`(function(){var l=document.querySelectorAll('.modal .field-line')[1]; l.querySelector('input[type=text]').value='pet'; var s=l.querySelector('select'); s.value='Pointer'; s.dispatchEvent(new Event('change')); var t=l.querySelectorAll('select')[1]; t.value='Pet'; l.querySelector('input[type=checkbox]').checked=true;})()`);
  await ev(`${btn('+ Add field', '.modal')}.click()`); await sleep(100);
  await ev(`(function(){var l=document.querySelectorAll('.modal .field-line')[2]; l.querySelector('input[type=text]').value='paid'; var s=l.querySelector('select'); s.value='Number'; s.dispatchEvent(new Event('change')); l.querySelectorAll('input[type=text]')[1].value='abc';})()`);
  await shot('s2-new-collection');
  await ev(`${btn('Create collection', '.modal')}.click()`); await sleep(300);
  console.log('bad default error:', await ev(`document.querySelector('.modal .notice.bad').textContent`));
  await ev(`(function(){var l=document.querySelectorAll('.modal .field-line')[2]; l.querySelectorAll('input[type=text]')[1].value='25';})()`);
  await ev(`${btn('Create collection', '.modal')}.click()`); await sleep(900);
  console.log('Visit:', await ev(schema('Visit')));
  // Add field to Visit
  await ev(`[...${card('Visit')}.querySelectorAll('button')].find(b=>b.textContent==='Add field').click()`); await sleep(300);
  await ev(`(function(){var l=document.querySelector('.modal .field-line'); l.querySelector('input[type=text]').value='notes';})()`);
  await ev(`${btn('Add field', '.modal')}.click()`); await sleep(900);
  // Rename notes -> comment
  await ev(`[...${card('Visit')}.querySelectorAll('button.inline-edit')].find(b=>b.textContent==='notes').click()`); await sleep(200);
  await ev(`document.activeElement.select()`); await typeText('comment'); await key('Enter'); await sleep(900);
  // Change paid Number -> String (confirm)
  await ev(`(function(){var s=[...${card('Visit')}.querySelectorAll('select.inline-type')][2]; s.value='String'; s.dispatchEvent(new Event('change'));})()`); await sleep(300);
  await shot('s3-type-confirm');
  await ev(`${btn('Change type', '.modal')}.click()`); await sleep(900);
  console.log('Visit after:', await ev(`${schema('Visit')}.then(s=>JSON.stringify(JSON.parse(s).columns))`));
  // Indexes
  await ev(`[...${card('Visit')}.querySelectorAll('button')].find(b=>b.textContent==='Indexes').click()`); await sleep(300);
  await ev(`${btn('+ Add index', '.modal')}.click()`); await sleep(100);
  await ev(`(function(){var r=document.querySelector('.modal .field-line'); var s=r.querySelectorAll('select'); s[0].value='pet'; s[1].value='when'; r.querySelector('input[type=checkbox]').checked=true; s[3].value='desc';})()`);
  await shot('s4-indexes');
  await ev(`${btn('Apply', '.modal')}.click()`); await sleep(900);
  console.log('indexes:', await ev(`${schema('Visit')}.then(s=>JSON.stringify(JSON.parse(s).indexes))`));
  await shot('s5-schema-after');
  // Open records jumps to that collection
  await ev(`[...${card('Visit')}.querySelectorAll('button')].find(b=>b.textContent==='Open records').click()`); await sleep(1000);
  console.log('opened:', await ev(`location.hash + ' ' + document.querySelector('#app select').value`));
  await ev(`${btn('New record')}.click()`); await sleep(800);
  await shot('s6-visit-form');
};
