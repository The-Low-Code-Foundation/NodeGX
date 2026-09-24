// Visit every view and record the visible text of the page. Used before and after the port (BMG-001 AC2).
import fs from 'fs';
const VIEWS = (process.env.VIEWS || 'collections,schema,users,roles,permissions,keys,signin,triggers,workflows,executions,email,backups,files,audit').split(',');
export default async ({ ev, sleep, nav, shot }) => {
  const port = process.env.PORT || '8697';
  await nav(`http://127.0.0.1:${port}/_admin#token=t0k`);
  await sleep(1500);
  const out = { signedIn: await ev(`!document.getElementById('app').classList.contains('hidden')`), topbar: await ev(`document.querySelector('.topbar').innerText`), pages: {} };
  for (const v of VIEWS) {
    await ev(`location.hash = '#/${v}'`);
    await sleep(1600);
    if (v === 'collections') { await ev(`(function(){var s=document.querySelector('#app select'); if(s){s.value='Pet'; s.dispatchEvent(new Event('change'));}})()`); await sleep(1200); }
    out.pages[v] = {
      hash: await ev(`location.hash`),
      nav: await ev(`document.getElementById('nav').innerText`),
      current: await ev(`(document.querySelector('nav [aria-current="true"]')||{}).textContent||''`),
      main: await ev(`document.getElementById('main').innerText`),
      buttons: await ev(`[...document.querySelectorAll('#main button')].map(b=>b.textContent.trim()).filter(Boolean)`),
      inputs: await ev(`[...document.querySelectorAll('#main input,#main select,#main textarea')].map(i=>(i.tagName+':'+(i.type||'')+':'+(i.placeholder||'')))`)
    };
    if (process.env.SHOTS) await shot(process.env.SHOTS + '-' + v);
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  console.log('captured', Object.keys(out.pages).length, 'pages →', process.env.OUT, 'signedIn', out.signedIn);
};
