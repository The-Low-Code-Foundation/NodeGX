// AC3 deep links + AC4 light/dark, against the seeded throwaway backend.
import fs from 'fs';
export default async ({ ev, sleep, nav, shot }) => {
  const port = process.env.PORT || '8697';
  const out = {};
  await nav(`http://127.0.0.1:${port}/_admin#token=t0k`);
  await sleep(1500);
  out.signedIn = await ev(`!!document.getElementById('app')`);
  out.tokenScrubbed = await ev(`location.hash`);
  // The record id of Milo, through the API.
  const milo = await ev(`fetch('/api/Pet?where='+encodeURIComponent(JSON.stringify({name:'Milo'})),{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>j.results[0].objectId)`);
  out.milo = milo;

  // AC3a: #/collections/Pet/<id> opens the record drawer on load (a fresh load, not a hash change).
  await nav(`http://127.0.0.1:${port}/_admin#/collections/Pet/${milo}`);
  await sleep(2000);
  out.drawerOnLoad = {
    hash: await ev(`location.hash`),
    drawer: await ev(`!!document.querySelector('.drawer')`),
    title: await ev(`(document.querySelector('.drawer h3')||{}).textContent||''`),
    nameField: await ev(`(function(){var f=[...document.querySelectorAll('.drawer .field')].find(x=>x.querySelector('b') && x.querySelector('b').textContent==='name'); return f? f.querySelector('input').value : null})()`),
    focusInside: await ev(`!!document.querySelector('.drawer') && document.querySelector('.drawer').contains(document.activeElement)`)
  };
  await shot('ac3-drawer-on-load');
  // Esc closes and the URL goes back to the collection.
  await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await sleep(500);
  out.afterEsc = { hash: await ev(`location.hash`), drawer: await ev(`!!document.querySelector('.drawer')`) };

  // AC3b: #/schema/_User scrolls to the accounts card and marks it.
  await nav(`http://127.0.0.1:${port}/_admin#/schema/Toy`);
  await ev(`location.reload()`); await sleep(2200);
  out.schemaUser = {
    hash: await ev(`location.hash`),
    cards: await ev(`[...document.querySelectorAll('#main .card')].map(c => c.id + ':' + c.className)`),
    hit: await ev(`(function(){var c=document.getElementById('schema-Toy'); return c ? c.className : null})()`),
    top: await ev(`(function(){var c=document.getElementById('schema-Toy'); if(!c) return null; var r=c.getBoundingClientRect(); return Math.round(r.top)})()`),
    petTop: await ev(`(function(){var c=document.getElementById('schema-Pet'); if(!c) return null; var r=c.getBoundingClientRect(); return Math.round(r.top)})()`),
    userListed: await ev(`fetch('/admin/schema',{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>j.tables.map(t=>t.name))`),
    mainScrollTop: await ev(`document.getElementById('main').scrollTop`),
    firstCard: await ev(`(document.querySelector('#main .card b')||{}).textContent||''`)
  };
  await shot('ac3-schema-user');

  // AC3c: the back button walks the hashes.
  await ev(`location.hash = '#/users'`); await sleep(900);
  await ev(`location.hash = '#/roles'`); await sleep(900);
  await ev(`location.hash = '#/keys'`); await sleep(900);
  const walk = [await ev(`location.hash + ' ' + (document.querySelector('nav [aria-current="true"]')||{}).textContent`)];
  await ev(`history.back()`); await sleep(900);
  walk.push(await ev(`location.hash + ' ' + (document.querySelector('nav [aria-current="true"]')||{}).textContent`));
  await ev(`history.back()`); await sleep(900);
  walk.push(await ev(`location.hash + ' ' + (document.querySelector('nav [aria-current="true"]')||{}).textContent`));
  await ev(`history.back()`); await sleep(900);
  walk.push(await ev(`location.hash + ' ' + (document.querySelector('nav [aria-current="true"]')||{}).textContent`));
  out.backWalk = walk;

  // AC3d: the other deep links land on their rows / open the detail.
  const trig = await ev(`fetch('/admin/triggers',{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>j.triggers[0].id)`);
  await ev(`location.hash = '#/triggers/' + ${JSON.stringify(trig)}`); await sleep(1500);
  out.triggerHit = await ev(`(function(){var r=document.querySelector('tr.hit'); return r ? r.textContent.slice(0,60) : null})()`);
  const run = await ev(`fetch('/executions?limit=1',{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>(Array.isArray(j)?j:j.executions||j.results||[])[0].id)`);
  await ev(`location.hash = '#/runs/' + ${JSON.stringify(run)}`); await sleep(1800);
  out.runOnLink = { hash: await ev(`location.hash`), modalTitle: await ev(`(document.querySelector('.modal h3')||{}).textContent||''`) };
  await shot('ac3-run-detail');
  await ev(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Close').click()`); await sleep(600);
  out.runAfterClose = await ev(`location.hash`);
  const userId = await ev(`fetch('/api/_User?limit=1',{headers:{authorization:'Bearer t0k'}}).then(r=>r.json()).then(j=>j.results[0].objectId)`);
  await ev(`location.hash = '#/users/' + ${JSON.stringify(userId)}`); await sleep(1500);
  out.userHit = await ev(`(function(){var r=document.querySelector('tr.hit'); return r ? r.textContent.slice(0,60) : null})()`);
  await ev(`location.hash = '#/roles/staff'`); await sleep(1500);
  out.roleHit = await ev(`(function(){var r=document.querySelector('tr.hit'); return r ? r.textContent.slice(0,60) : null})()`);
  // The legacy id still lands.
  await ev(`location.hash = '#/executions'`); await sleep(1200);
  out.legacy = { hash: await ev(`location.hash`), title: await ev(`document.querySelector('#main h1').textContent`) };

  // AC4: light and dark. Read computed colours of the same surfaces under both themes.
  const probe = `(function(){var cs=getComputedStyle; var b=cs(document.body); var m=cs(document.getElementById('main')); var btn=document.querySelector('button.btn.primary')||document.querySelector('button.btn'); var h=document.querySelector('#main h1'); return {theme: document.documentElement.getAttribute('data-theme'), bodyBg: b.backgroundColor, bodyFg: b.color, mainBg: m.backgroundColor, h1: h?cs(h).color:null, btnBg: btn?cs(btn).backgroundColor:null}})()`;
  const views = ['collections','schema','users','roles','signin','permissions','keys','triggers','workflows','runs','files','email','backups','audit'];
  out.themes = {};
  for (const theme of ['dark','light']) {
    await ev(`localStorage.setItem('nodegx.admin.theme', '${theme}')`);
    await nav(`http://127.0.0.1:${port}/_admin#/collections`);
    await ev(`location.reload()`); await sleep(1800);
    out.themes[theme] = { attr: await ev(`document.documentElement.getAttribute('data-theme')`), toggleLabel: await ev(`document.querySelector('.theme-toggle').getAttribute('aria-label')`), pages: {} };
    for (const v of views) {
      await ev(`location.hash = '#/${v}'`); await sleep(1100);
      out.themes[theme].pages[v] = await ev(probe);
      if (v === 'collections' || v === 'runs' || v === 'schema') await shot(`ac4-${theme}-${v}`);
    }
  }
  // The toggle itself.
  await ev(`document.querySelector('.theme-toggle').click()`); await sleep(400);
  out.toggled = { attr: await ev(`document.documentElement.getAttribute('data-theme')`), stored: await ev(`localStorage.getItem('nodegx.admin.theme')`) };
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ signedIn: out.signedIn, drawerOnLoad: out.drawerOnLoad, afterEsc: out.afterEsc, schemaUser: out.schemaUser, backWalk: out.backWalk, triggerHit: out.triggerHit, runOnLink: out.runOnLink, runAfterClose: out.runAfterClose, userHit: out.userHit, roleHit: out.roleHit, legacy: out.legacy, dark: out.themes.dark.pages.collections, light: out.themes.light.pages.collections, toggled: out.toggled }, null, 1));
};
