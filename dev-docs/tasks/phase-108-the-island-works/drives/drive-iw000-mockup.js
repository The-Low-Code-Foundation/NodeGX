// IW-000 drive: headless Chrome (swiftshader) over raw CDP (the repo's `ws`), the mockup page opened from disk.
// Every program is built with real pointer drags from the Blockly drawer (mousePressed → mouseMoved × n → mouseReleased),
// the chip is picked by a real tap on the 3D canvas, runs are started and stopped with the real buttons.
//
// usage: node drive-iw000-mockup.js [stage …]      stages: smoke tulips path eggs teach ui sizes   (default: all, in order)
//   WT=<worktree> overrides the worktree; OUT/LOG go to the screenshot folder beside the page and the lane's scratch dir.
//   One Chrome, a private port and profile; it is killed by pid when the drive ends (CPU rule).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const WT = process.env.WT || path.resolve(__dirname, '../../../..');
const WebSocket = require(path.join(WT, 'node_modules/ws'));
const HTML = path.join(WT, 'dev-docs/tasks/phase-78-the-templates/tpl-012-mockups/island-jobs.html');
const OUT = path.join(WT, 'dev-docs/tasks/phase-78-the-templates/tpl-012-mockups/island-jobs');
const SCRATCH = process.env.SCRATCH || path.join(path.dirname(WT), path.basename(WT) + '-scratch');
const PORT = 9388;
const STAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['smoke', 'tulips', 'path', 'eggs', 'teach', 'ui', 'sizes'];
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SCRATCH, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = { started: new Date().toISOString(), stages: STAGES, console: [], exceptions: [], logEntries: [], checks: [] };
const check = (name, ok, detail) => { log.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); };
function getJson(url) { return new Promise((res, rej) => http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej)); }

(async () => {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(SCRATCH, 'chrome-profile-' + Date.now()),
    '--window-size=1368,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-extensions', 'about:blank'
  ], { stdio: 'ignore' });
  console.log('chrome pid', chrome.pid);
  const done = (code) => { try { process.kill(chrome.pid); } catch (e) {} fs.writeFileSync(path.join(SCRATCH, 'drive-iw000-log.json'), JSON.stringify(log, null, 1)); process.exit(code); };
  process.on('uncaughtException', (e) => { console.error('DRIVE ERROR', e); log.driveError = String(e && e.stack || e); done(2); });
  process.on('unhandledRejection', (e) => { console.error('DRIVE ERROR', e); log.driveError = String(e && e.stack || e); done(2); });
  setTimeout(() => { console.error('DRIVE WATCHDOG: 14 min'); log.driveError = 'watchdog'; done(3); }, 14 * 60 * 1000).unref();
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) { await sleep(300); try { targets = await getJson('http://127.0.0.1:' + PORT + '/json/list'); } catch (e) {} }
  if (!targets) { console.error('no CDP'); done(2); }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((r) => ws.on('open', r));
  let id = 0; const pending = new Map(); const waiters = [];
  ws.on('message', (m) => {
    const msg = JSON.parse(m);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); return; }
    if (msg.method === 'Runtime.consoleAPICalled') log.console.push({ type: msg.params.type, text: msg.params.args.map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ') });
    if (msg.method === 'Runtime.exceptionThrown') log.exceptions.push(msg.params.exceptionDetails.exception ? (msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text) : msg.params.exceptionDetails.text);
    if (msg.method === 'Log.entryAdded') log.logEntries.push({ level: msg.params.entry.level, source: msg.params.entry.source, text: msg.params.entry.text, url: msg.params.entry.url });
    if (msg.method === 'Network.requestWillBeSent') (log.requests = log.requests || []).push(msg.params.request.url.slice(0, 120));
    for (const w of waiters.splice(0)) if (w.method === msg.method) w.res(msg.params); else waiters.push(w);
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const waitFor = (method) => new Promise((res) => waiters.push({ method, res }));
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text) + '\n  in: ' + expr.slice(0, 200)); return r.result.value; };
  const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64')); console.log('shot ' + name); };
  const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1, buttons: type === 'mouseReleased' ? 0 : 1 }, extra));
  const clickAt = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await sleep(40); await mouse('mouseReleased', x, y); await sleep(120); };
  const drag = async (a, b, steps = 12, holdMs = 30) => {
    await mouse('mouseMoved', a.x, a.y, { buttons: 0 }); await mouse('mousePressed', a.x, a.y); await sleep(holdMs);
    for (let i = 1; i <= steps; i++) { const k = i / steps; await mouse('mouseMoved', a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); await sleep(16); }
    await sleep(40); await mouse('mouseReleased', b.x, b.y); await sleep(220);
  };
  // a real click on a DOM element, refusing if something else is on top of it
  const click = async (sel) => {
    const p = await ev('(function(){ var el=document.querySelector(' + JSON.stringify(sel) + '); if(!el) return "missing"; var r=el.getBoundingClientRect(); if(!r.width) return "not rendered"; var x=r.left+r.width/2, y=r.top+r.height/2; var at=document.elementFromPoint(x,y); if(!at||!(el===at||el.contains(at))) return "covered by "+(at?at.tagName+"."+at.className:"nothing"); return {x:x,y:y}; })()');
    if (typeof p === 'string') throw new Error('click ' + sel + ': ' + p);
    await clickAt(p.x, p.y);
  };
  const key = async (k, code, text) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }); await sleep(80); };
  const until = async (expr, ms, step = 150) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(step); } return false; };
  const viewport = async (w, h, mobile) => { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile }); await send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile, maxTouchPoints: mobile ? 5 : 1 }); await sleep(500); };

  // ── Blockly geometry, read in the page (screen px). `which`: next | DO | COND | THING | A | B
  const GEO = `
    window.__drv = {
      flyVisible(fb){ var I=__iw, fw=I.flyWs(), o=fb.getRelativeToSurfaceXY(), s=I.screenOfWs(fw,o.x,o.y), r=document.getElementById('bwrap').getBoundingClientRect(); return { top:s.y, bottom:s.y+fb.height*fw.scale, min:r.top+6, max:r.bottom-6, fx:r.left+30 }; },
      plan(type, kind, tgtId, which, dx, dy){
        var I=__iw, fb=I.flyBlock(type, kind); if(!fb) return 'no drawer block '+type+' '+(kind||'');
        var fw=I.flyWs(), fs=fw.scale, w=I.ws, o=fb.getRelativeToSurfaceXY(), os=I.screenOfWs(fw,o.x,o.y);
        var grab={x:os.x+10*fs, y:os.y+Math.min(fb.height*fs/2, 18)};
        /* grab the block by its body (its path), not by a field: scan the middle row for the block's own path */
        var root=fb.getSvgRoot(); for(var gx=os.x+3; gx<os.x+fb.width*fs; gx+=3){ var e=document.elementFromPoint(gx, os.y+fb.height*fs/2); if(e && e.classList && e.classList.contains('blocklyPath') && e.parentNode===root){ grab={x:gx, y:os.y+fb.height*fs/2}; break; } }
        if(tgtId==null){ var r=document.getElementById('bwrap').getBoundingClientRect(); return {grab:grab, drop:{x:r.left+r.width*(dx||0.8), y:r.top+r.height*(dy||0.55)}}; }
        var tb=w.getBlockById(tgtId); if(!tb) return 'no target block '+tgtId;
        var conn= which==='next' ? tb.nextConnection : tb.getInput(which).connection;
        var cs=I.screenOfWs(w,conn.x,conn.y);
        var mine=(which==='next'||which==='DO') ? fb.previousConnection : fb.outputConnection;
        var off=mine.getOffsetInBlock();
        var want={x:cs.x-off.x*w.scale, y:cs.y-off.y*w.scale};
        return {grab:grab, drop:{x:grab.x+want.x-os.x, y:grab.y+want.y-os.y}, conn:cs};
      },
      blockRect(id){ var b=__iw.ws.getBlockById(id); if(!b) return null; var r=b.getSvgRoot().getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; },
      fieldRect(id,name){ var b=__iw.ws.getBlockById(id); var f=b&&b.getField(name); if(!f) return null; var r=f.getSvgRoot().getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; },
      ids(type){ return __iw.ws.getAllBlocks(true).filter(function(b){return b.type===type;}).map(function(b){return b.id;}); },
      last(type){ var a=this.ids(type); return a[a.length-1]||null; },
      childOf(id,input){ var b=__iw.ws.getBlockById(id); var c=b&&b.getInputTargetBlock(input); return c?c.id:null; },
      shape(){ function one(b){ var o={t:b.type.replace('garden_','')}; if(b.getField('N')&&b.type==='garden_repeat') o.n=+b.getFieldValue('N'); if(b.getField('KIND')) o.k=b.getFieldValue('KIND'); if(b.getField('STATE')) o.s=b.getFieldValue('STATE'); if(b.thing_) o.th=b.thing_.kind; if(b.type==='math_number') o.v=+b.getFieldValue('NUM'); if(b.type==='garden_compare') o.op=b.getFieldValue('OP'); ['COND','THING','A','B'].forEach(function(n){ var c=b.getInput(n)&&b.getInputTargetBlock(n); if(c) o[n]=one(c); }); if(b.getInput('DO')){ o.do=[]; for(var c=b.getInputTargetBlock('DO');c;c=c.getNextBlock()) o.do.push(one(c)); } return o; }
        var s=__iw.startBlock(), out=[]; for(var b=s.getNextBlock();b;b=b.getNextBlock()) out.push(one(b)); return JSON.stringify(out); },
      robot(){ var r=__iw.world().robots[0]; return {x:r.x,y:r.y,d:r.d,holds:r.holds,can:r.can,load:r.load,eggs:r.eggs}; },
      things(kind){ return __iw.world().things.filter(function(k){return k.kind===kind;}).map(function(k){ return {id:k.id,x:k.x,y:k.y,have:k.have,need:k.need,count:k.count,left:k.left,level:k.level}; }); },
      menuItems(){ return Array.prototype.map.call(document.querySelectorAll('.blocklyDropDownDiv .blocklyMenuItem, .blocklyWidgetDiv .blocklyMenuItem'), function(e){ return e.textContent.trim(); }).filter(Boolean); }
    };`;
  const showInDrawer = async (type, kind) => {
    // scroll the drawer with the wheel until the block is in view (the drawer is a real scrolling flyout)
    for (let i = 0; i < 16; i++) {
      const v = await ev('(function(){ var fb=__iw.flyBlock(' + JSON.stringify(type) + ',' + JSON.stringify(kind || null) + '); return fb? __drv.flyVisible(fb) : null; })()');
      if (!v) throw new Error('no drawer block ' + type + ' ' + kind);
      if (v.top >= v.min && Math.min(v.bottom, v.top + 40) <= v.max) break;
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: v.fx, y: (v.min + v.max) / 2, deltaX: 0, deltaY: v.top < v.min ? -120 : 120 }); await sleep(160);
    }
  };
  const dragFromDrawer = async (type, kind, tgtId, which, dx, dy) => {
    await showInDrawer(type, kind);
    const p = await ev('__drv.plan(' + [type, kind || null, tgtId || null, which || null, dx || null, dy || null].map((x) => JSON.stringify(x)).join(',') + ')');
    if (typeof p === 'string') throw new Error(p);
    const before = await ev('__iw.ws.getAllBlocks(false).length');
    if (!tgtId) await drag(p.grab, p.drop);
    else {
      // like a hand: carry the block out to the right of the target, come in level with the connection, then correct
      // once for the insertion marker's layout shift before letting go
      await mouse('mouseMoved', p.grab.x, p.grab.y, { buttons: 0 }); await mouse('mousePressed', p.grab.x, p.grab.y); await sleep(30);
      const via = { x: p.drop.x + 170, y: p.drop.y };
      for (let i = 1; i <= 10; i++) { const k = i / 10; await mouse('mouseMoved', p.grab.x + (via.x - p.grab.x) * k, p.grab.y + (via.y - p.grab.y) * k); await sleep(16); }
      for (let i = 1; i <= 8; i++) { const k = i / 8; await mouse('mouseMoved', via.x + (p.drop.x - via.x) * k, p.drop.y); await sleep(16); }
      for (let n = 0; n < 2; n++) {
        const q = await ev('(function(){ var w=__iw.ws, tb=w.getBlockById(' + JSON.stringify(tgtId) + '), c=' + JSON.stringify(which) + '==="next"? tb.nextConnection : tb.getInput(' + JSON.stringify(which) + ').connection; return __iw.screenOfWs(w,c.x,c.y); })()');
        const dx = q.x - p.conn.x, dy = q.y - p.conn.y;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) break;
        p.drop.x += dx; p.drop.y += dy; p.conn = q; await mouse('mouseMoved', p.drop.x, p.drop.y); await sleep(60);
      }
      await sleep(40); await mouse('mouseReleased', p.drop.x, p.drop.y); await sleep(220);
    }
    const after = await ev('__iw.ws.getAllBlocks(false).length');
    if (tgtId) {
      const joined = await ev('(function(){ var t=__iw.ws.getBlockById(' + JSON.stringify(tgtId) + '); var c=' + JSON.stringify(which) + '==="next"? t.getNextBlock() : t.getInputTargetBlock(' + JSON.stringify(which) + '); return c? c.type : null; })()');
      if (joined !== type) { await shot('dbg-drop'); log.dbgShape = await ev('__drv.shape()'); } if (joined !== type) throw new Error('drop did not connect ' + type + ' to ' + which + ' of ' + tgtId + ' (found ' + joined + ', blocks ' + before + '→' + after + ', plan ' + JSON.stringify(p) + ')');
      return await ev('(function(){ var t=__iw.ws.getBlockById(' + JSON.stringify(tgtId) + '); var c=' + JSON.stringify(which) + '==="next"? t.getNextBlock() : t.getInputTargetBlock(' + JSON.stringify(which) + '); return c.id; })()');
    }
    return await ev('__drv.last(' + JSON.stringify(type) + ')');
  };
  const dragToDrawer = async (id) => {
    const r = await ev('__drv.blockRect(' + JSON.stringify(id) + ')');
    const f = await ev('(function(){ var fw=__iw.flyWs(); var r=document.getElementById("bwrap").getBoundingClientRect(); return {x:r.left+40, y:r.top+r.height/2}; })()');
    await drag({ x: r.x + 12, y: r.y + 10 }, f, 14);
  };
  const openDropdown = async (id, name) => {
    // bring the field into the visible workspace first, as a child would by scrolling the workspace
    await ev('(function(){ var f=__drv.fieldRect(' + JSON.stringify(id) + ',' + JSON.stringify(name) + '), r=document.getElementById("bwrap").getBoundingClientRect(), w=__iw.ws; var dx=Math.max(0, f.x-(r.right-70)), dy=Math.max(0, f.y-(r.bottom-70)); if(dx||dy) w.scroll(w.scrollX-dx, w.scrollY-dy); })()'); await sleep(150);
    const p = await ev('__drv.fieldRect(' + JSON.stringify(id) + ',' + JSON.stringify(name) + ')'); await clickAt(p.x, p.y); await sleep(300); const items = await ev('__drv.menuItems()'); if (!items.length) log.dropdownDebug = await ev('(function(){ var d=document.querySelector(".blocklyDropDownDiv"); return d? (d.style.display+" | "+d.innerHTML.slice(0,600)) : "no div"; })()'); await key('Escape', 'Escape'); await sleep(150); return items; };
  const tapTile = async (x, y, lift) => { const p = await ev('__iw.tileScreen(' + x + ',' + y + ',' + (lift || 0) + ')'); await clickAt(p.x, p.y); await sleep(250); };
  const tapChip = async (chipId) => { const r = await ev('__drv.blockRect(' + JSON.stringify(chipId) + ')'); await clickAt(r.x + r.w / 2, r.y + r.h / 2); await sleep(200); };
  const clearProgram = async () => { const first = await ev('(function(){ var n=__iw.startBlock().getNextBlock(); return n? n.id : null; })()'); if (first) await dragToDrawer(first); await sleep(200); };
  const winShown = () => ev('!document.getElementById("win").hidden');
  const startId = () => ev('__iw.startBlock().id');

  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await viewport(1368, 900, false);
  const loaded = waitFor('Page.loadEventFired');
  await send('Page.navigate', { url: 'file://' + HTML });
  await loaded; await sleep(2500);
  await ev(GEO);

  const has = (s) => STAGES.includes(s);
  // ─────────────────────────── smoke ───────────────────────────
  if (has('smoke')) {
    check('three.js r158 from cdnjs', await ev('typeof THREE==="object" && THREE.REVISION==="158"'), await ev('typeof THREE==="object" ? THREE.REVISION : null'));
    check('Blockly 12.3.1 from jsdelivr, Zelos renderer', await ev('Blockly.VERSION==="12.3.1" && __iw.ws.getRenderer().name==="zelos"'), await ev('[Blockly.VERSION, __iw.ws.getRenderer().name]'));
    check('word table self-check logged ok', log.console.some((c) => /word table ok/.test(c.text)), log.console.filter((c) => /word table/.test(c.text)).map((c) => c.text));
    check('the drawer is a flyout toolbox, always open, with only the tulips blocks', await ev('__iw.ws.getFlyout().isVisible() && __iw.flyWs().getTopBlocks(true).map(function(b){return b.type.replace("garden_","")+(b.getField("KIND")?":"+b.getFieldValue("KIND"):"");}).join(" ")'), null);
    check('drawer blocks carry a ? ; the placed ▶ block carries none', await ev('__iw.flyWs().getTopBlocks(true).every(function(b){return !!b.getField("Q");}) && !__iw.startBlock().getField("Q")'));
    check('no trashcan, no Blockly zoom controls (our own + − ⤢)', await ev('!__iw.ws.trashcan && !__iw.ws.zoomControls_ && !!document.getElementById("zIn")'));
    check('3D canvas sized, workspace fills the right column (≥ 600 px tall at 1368×900)', await ev('(function(){ var c=document.querySelector("#stage canvas"), b=document.getElementById("bwrap").getBoundingClientRect(); return c.width>300 && b.height>=600; })()'), await ev('(function(){ var c=document.querySelector("#stage canvas"), b=document.getElementById("bwrap").getBoundingClientRect(); return {canvas:[c.width,c.height], bwrap:[Math.round(b.width),Math.round(b.height)]}; })()'));
    await shot('01-tulips-start');
  }

  // ─────────────────────────── tulips (Pip, band 1 icon-first) ───────────────────────────
  if (has('tulips')) {
    await click('#band1'); await sleep(600); await ev(GEO);
    check('band 7–9: the drawer is icon-first (one word) and has no if / go to [thing]', await ev('(function(){ var t=__iw.flyWs().getTopBlocks(true).map(function(b){return b.type;}); var fwd=__iw.flyBlock("garden_forward"); return t.indexOf("garden_if")<0 && t.indexOf("garden_go_to")<0 && fwd.inputList[0].fieldRow.some(function(f){return f instanceof Blockly.FieldImage && f.getSize().width>=26;}) && fwd.inputList[0].fieldRow.some(function(f){return f.getText && f.getText()==="forward";}); })()'));
    await click('#spdFast');
    const s = await startId();
    // an "is" block, loose, to read the can's state list after tapping the can on the island
    const isLoose = await dragFromDrawer('garden_is', null, null, null, 0.63, 0.62);
    const chip = await ev('__drv.childOf(' + JSON.stringify(isLoose) + ',"THING")');
    await tapChip(chip);
    check('a tap on the 👆 chip arms the world (banner, violet border)', await ev('!document.getElementById("armBar").hidden && document.getElementById("stage").classList.contains("armed")'));
    await shot('02-tulips-armed');
    await tapTile(7, 4, 0.3);
    check('tapping the can on the shed makes the chip "the can"', await ev('(function(){ var b=__iw.ws.getBlockById(' + JSON.stringify(chip) + '); return b.thing_ && b.thing_.kind==="can" && /can/.test(b.getField("LABEL").getText()); })()'), await ev('__iw.ws.getBlockById(' + JSON.stringify(chip) + ').getField("LABEL").getText()'));
    const canStates = await openDropdown(isLoose, 'STATE');
    check('the can\'s state list: is empty / is full / has', JSON.stringify(canStates) === JSON.stringify(['is empty', 'is full', 'has']), canStates);
    log.canStates = canStates;
    await dragToDrawer(isLoose);
    check('dragging a block back onto the drawer deletes it', await ev('!__iw.ws.getBlockById(' + JSON.stringify(isLoose) + ')'));
    // the program, by drags only
    const b1 = await dragFromDrawer('garden_go_nearest', 'can', s, 'next');
    const b2 = await dragFromDrawer('garden_pick', null, b1, 'next');
    const r1 = await dragFromDrawer('garden_repeat', null, b2, 'next');
    const b3 = await dragFromDrawer('garden_go_nearest', 'well', r1, 'DO');
    const b4 = await dragFromDrawer('garden_fill', null, b3, 'next');
    const b5 = await dragFromDrawer('garden_go_nearest', 'tulip', b4, 'next');
    const r2 = await dragFromDrawer('garden_repeat', null, b5, 'next');
    await dragFromDrawer('garden_water', null, r2, 'DO');
    const shape = await ev('__drv.shape()');
    check('tulips program built by 8 drags', shape === JSON.stringify([{ t: 'go_nearest', k: 'can' }, { t: 'pick' }, { t: 'repeat', n: 3, do: [{ t: 'go_nearest', k: 'well' }, { t: 'fill' }, { t: 'go_nearest', k: 'tulip' }, { t: 'repeat', n: 3, do: [{ t: 'water' }] }] }]), shape);
    check('placed blocks carry no ?', await ev('__iw.ws.getAllBlocks(false).every(function(b){return !b.getField("Q");})'));
    await shot('03-tulips-program');
    const shells0 = await ev('__iw.shells()');
    await click('#btnPlay'); await sleep(900);
    check('Play: Stop replaces Play and a block glows (highlight + ink ring class)', await ev('document.getElementById("btnPlay").hidden && !document.getElementById("btnStop").hidden && !!document.querySelector("#blocklyDiv .iw-run") && __iw.ws.highlightedBlocks && __iw.ws.highlightedBlocks.length===1'), await ev('(function(){ var g=document.querySelector("#blocklyDiv .iw-run>.blocklyPath"); return g? getComputedStyle(g).stroke+" "+getComputedStyle(g).strokeWidth : null; })()'));
    await shot('04-tulips-running');
    const won = await until('!document.getElementById("win").hidden', 60000);
    const tul = await ev('__drv.things("tulip")');
    check('tulips won: every tulip 3/3, Pip walked home, the can hung back on the shed', won && tul.every((k) => k.have === 3) && await ev('(function(){ var r=__drv.robot(); return r.x===4&&r.y===3&&r.holds===null && __drv.things("can").length===1; })()'), { tul, robot: await ev('__drv.robot()') });
    const shells1 = await ev('__iw.shells()');
    check('shells: +1 per drink (9) and +5 finish bonus', shells1 - shells0 === 14, { before: shells0, after: shells1, card: await ev('document.getElementById("winWork").textContent+" · "+document.getElementById("winBonus").textContent') });
    await shot('05-tulips-won');
    await click('#winStay');
    await click('#btnTime'); await sleep(400);
    check('⏳ time passes: one tulip is thirsty again (a meter drops), the job reopens', await ev('__drv.things("tulip").filter(function(k){return k.have<k.need;}).length===1'), await ev('__drv.things("tulip")'));
    const back = await until('!!__iw.run()', 3000);
    check('the won job\'s robot goes back by itself (D3)', back);
    await shot('06-tulips-goes-back');
    const back2 = await until('!__iw.run() && __drv.things("tulip").every(function(k){return k.have===3;})', 40000);
    check('…and waters it full again, then walks home', back2 && await ev('(function(){ var r=__drv.robot(); return r.x===4&&r.y===3; })()'), await ev('__drv.robot()'));
    // Stop mid-run
    await click('#btnPlay'); await sleep(700);
    const midBefore = await ev('JSON.stringify(__drv.robot())');
    await click('#btnStop');
    const stoppedAt = await ev('JSON.stringify(__drv.robot())'); await sleep(900);
    const stoppedLater = await ev('JSON.stringify(__drv.robot())');
    check('Stop ends the run at once: no run, Play back, no glow, the robot does not move after', await ev('!__iw.run() && !document.getElementById("btnPlay").hidden && !document.querySelector("#blocklyDiv .iw-run")') && stoppedAt === stoppedLater, { midBefore, stoppedAt, stoppedLater });
    await click('#band2'); await sleep(500); await ev(GEO);
  }

  // ─────────────────────────── path (Cobble, band 2): chip picker on "ahead", a never-ending loop, then the job ───────────────────────────
  if (has('path')) {
    await click('.job[data-job="path"]'); await sleep(800); await ev(GEO);
    await click('#spdFast');
    check('Cobble\'s drawer: rock and path square to go to, pick and put, if and go to [thing] at 10–12', await ev('(function(){ var t=__iw.flyWs().getTopBlocks(true).map(function(b){return b.type.replace("garden_","")+(b.getField("KIND")?":"+b.getFieldValue("KIND"):"");}); return t.indexOf("go_nearest:rock")>=0&&t.indexOf("go_nearest:site")>=0&&t.indexOf("put")>=0&&t.indexOf("water")<0&&t.indexOf("if")>=0&&t.indexOf("go_to")>=0; })()'), await ev('__iw.flyWs().getTopBlocks(true).map(function(b){return b.type.replace("garden_","");}).join(" ")'));
    const s = await startId();
    const rep = await dragFromDrawer('garden_repeat', null, s, 'next');
    // repeat 9: type the number into the field
    const nf = await ev('__drv.fieldRect(' + JSON.stringify(rep) + ',"N")'); await clickAt(nf.x, nf.y); await sleep(250);
    await send('Input.insertText', { text: '9' }); await key('Enter', 'Enter'); await sleep(200);
    const un = await dragFromDrawer('garden_until', null, rep, 'DO');
    const is = await dragFromDrawer('garden_is', null, un, 'COND');
    const chip = await ev('__drv.childOf(' + JSON.stringify(is) + ',"THING")');
    await tapChip(chip); await sleep(200);
    await shot('07-path-armed');
    await click('#armAhead');
    const ahead = await openDropdown(is, 'STATE');
    check('the tile-ahead chip\'s state list: is a wall / is a tulip / is a rock / is clear', JSON.stringify(ahead) === JSON.stringify(['is a wall', 'is a tulip', 'is a rock', 'is clear']), ahead);
    log.aheadStates = ahead;
    check('never-ending program: repeat 9 { until [ahead] is a wall { } }', await ev('__drv.shape()') === JSON.stringify([{ t: 'repeat', n: 9, do: [{ t: 'until', COND: { t: 'is', s: 'wall', THING: { t: 'thing', th: 'ahead' } }, do: [] }] }]), await ev('__drv.shape()'));
    await click('#btnPlay'); await sleep(1500);
    const running = await ev('!!__iw.run() && __iw.run().ticks>5');
    await shot('08-path-never-ending');
    await click('#btnStop'); const t1 = await ev('__iw.run()'); await sleep(600);
    check('a never-ending repeat 9 { until … } runs and Stop ends it at once', running && t1 === null && await ev('!__iw.run() && !document.querySelector("#blocklyDiv .iw-run")'));
    await dragToDrawer(rep); await sleep(200);
    check('dragging the loop back to the drawer throws the whole loop away', await ev('__iw.startBlock().getNextBlock()===null && __iw.ws.getAllBlocks(false).length===1'));
    const r1 = await dragFromDrawer('garden_repeat', null, s, 'next');
    const g1 = await dragFromDrawer('garden_go_nearest', 'rock', r1, 'DO');
    const r2 = await dragFromDrawer('garden_repeat', null, g1, 'next');
    await dragFromDrawer('garden_pick', null, r2, 'DO');
    const g2 = await dragFromDrawer('garden_go_nearest', 'site', r2, 'next');
    const r3 = await dragFromDrawer('garden_repeat', null, g2, 'next');
    await dragFromDrawer('garden_put', null, r3, 'DO');
    check('path program built by 7 drags', await ev('__drv.shape()') === JSON.stringify([{ t: 'repeat', n: 4, do: [{ t: 'go_nearest', k: 'rock' }, { t: 'repeat', n: 4, do: [{ t: 'pick' }] }, { t: 'go_nearest', k: 'site' }, { t: 'repeat', n: 4, do: [{ t: 'put' }] }] }]), await ev('__drv.shape()'));
    await click('#btnPlay'); await sleep(5000);
    check('mid-run a square shows a stage between dirt and path (meter 1..3 of 4) or the hod carries stones', await ev('__drv.things("site").some(function(k){return k.have>0;}) || __drv.robot().load>0'), await ev('__drv.things("site")'));
    await shot('09-path-running');
    const won = await until('!document.getElementById("win").hidden', 90000);
    check('path won: all four squares 4/4 (path), Cobble walked home', won && await ev('__drv.things("site").every(function(k){return k.have===4;}) && __drv.robot().x===3 && __drv.robot().y===5'), { sites: await ev('__drv.things("site")'), rocks: await ev('__drv.things("rock")'), robot: await ev('__drv.robot()') });
    await shot('10-path-won');
    await click('#winStay');
  }

  // ─────────────────────────── eggs (Pocket): the basket chip, band 1 until-full, band 2 count = 4 ───────────────────────────
  if (has('eggs')) {
    await click('.job[data-job="eggs"]'); await sleep(800); await ev(GEO);
    await click('#band1'); await sleep(600); await ev(GEO);
    await click('#spdFast');
    const eggs0 = await ev('__drv.things("egg").map(function(k){return k.x+","+k.y;}).join(" ")');
    const s = await startId();
    const un = await dragFromDrawer('garden_until', null, s, 'next');
    const is = await dragFromDrawer('garden_is', null, un, 'COND');
    const chip = await ev('__drv.childOf(' + JSON.stringify(is) + ',"THING")');
    await tapChip(chip);
    await tapTile(6, 3, 0.1);
    check('tapping the basket by Mamie\'s door makes the chip "the basket"', await ev('(function(){ var b=__iw.ws.getBlockById(' + JSON.stringify(chip) + '); return b.thing_ && b.thing_.kind==="basket"; })()'), await ev('__iw.ws.getBlockById(' + JSON.stringify(chip) + ').getField("LABEL").getText()'));
    const bs = await openDropdown(is, 'STATE');
    check('the basket\'s state list: is full / is empty / has — not the can\'s, not the tile ahead\'s', JSON.stringify(bs) === JSON.stringify(['is full', 'is empty', 'has']) && JSON.stringify(bs) !== JSON.stringify(log.canStates || []) && JSON.stringify(bs) !== JSON.stringify(log.aheadStates || []), bs);
    log.basketStates = bs;
    const g1 = await dragFromDrawer('garden_go_nearest', 'egg', un, 'DO');
    const p1 = await dragFromDrawer('garden_pick', null, g1, 'next');
    const g2 = await dragFromDrawer('garden_go_nearest', 'basket', p1, 'next');
    await dragFromDrawer('garden_put', null, g2, 'next');
    check('eggs program (7–9): until [basket] is full { go to nearest egg · pick · go to basket · put }', await ev('__drv.shape()') === JSON.stringify([{ t: 'until', COND: { t: 'is', s: 'full', THING: { t: 'thing', th: 'basket' } }, do: [{ t: 'go_nearest', k: 'egg' }, { t: 'pick' }, { t: 'go_nearest', k: 'basket' }, { t: 'put' }] }]), await ev('__drv.shape()'));
    await shot('11-eggs-program-band1');
    await click('#btnPlay'); await sleep(2500);
    check('the basket meter changes as Pocket works (a chip in the program rings its thing)', await ev('document.querySelector(".chip.meter.watch")!==null && __drv.things("basket")[0].count>=0'), await ev('document.querySelector(".chip.meter.watch") && document.querySelector(".chip.meter.watch").textContent'));
    await shot('12-eggs-running');
    const won = await until('!document.getElementById("win").hidden', 60000);
    check('eggs won: basket 4/4, no egg left in the pen, Pocket walked home', won && await ev('__drv.things("basket")[0].count===4 && __drv.things("egg").length===0 && __drv.robot().x===5 && __drv.robot().y===5'), { basket: await ev('__drv.things("basket")'), robot: await ev('__drv.robot()'), eggsAtStart: eggs0 });
    await shot('13-eggs-won');
    await click('#winStay');
    await click('#btnReset'); await sleep(400);
    const eggs1 = await ev('__drv.things("egg").map(function(k){return k.x+","+k.y;}).join(" ")');
    check('Start over: a new day, the hen has laid on other seeded tiles', eggs1 !== eggs0 && /Day 2/.test(await ev('document.getElementById("jobDay").textContent')), { eggs0, eggs1 });
    // 10–12: count of 🥚 in [basket] = 4
    await click('#band2'); await sleep(600); await ev(GEO);
    check('10–12 eggs drawer offers count of [🥚] in [thing] and compare', await ev('!!__iw.flyBlock("garden_count") && !!__iw.flyBlock("garden_compare")'));
    const oldIs = await ev('__drv.childOf(' + JSON.stringify(un) + ',"COND")');
    await dragToDrawer(oldIs); await sleep(200);
    const cmp = await dragFromDrawer('garden_compare', null, un, 'COND');
    const cnt = await dragFromDrawer('garden_count', null, cmp, 'A');
    const chip2 = await ev('__drv.childOf(' + JSON.stringify(cnt) + ',"THING")');
    await tapChip(chip2); await tapTile(6, 3, 0.1);
    const shape2 = await ev('__drv.shape()');
    check('10–12: until [count of 🥚 in [the basket] = 4], built from three blocks', /"COND":\{"t":"compare","op":"EQ","A":\{"t":"count","THING":\{"t":"thing","th":"basket"\}\},"B":\{"t":"math_number","v":4\}\}/.test(shape2) && await ev('__iw.evalCond(' + JSON.stringify(cmp) + ')') === false, shape2);
    await shot('14-eggs-band2-count');
    await click('#btnPlay');
    const won2 = await until('!document.getElementById("win").hidden', 60000);
    check('10–12 count program wins the eggs job too (basket 4/4), and its question now reads true', won2 && await ev('__drv.things("basket")[0].count===4') && await ev('__iw.evalCond(' + JSON.stringify(cmp) + ')') === true, await ev('__drv.things("basket")'));
    await click('#winStay');
  }

  // ─────────────────────────── Teach + fold, each job ───────────────────────────
  if (has('teach')) {
    const presses = { tulips: ['go:can', 'pick'].concat(...Array(3).fill(['go:well', 'fill', 'go:tulip', 'water', 'water', 'water'])), path: [].concat(...Array(4).fill(['go:rock', 'pick', 'pick', 'pick', 'pick', 'go:site', 'put', 'put', 'put', 'put'])), eggs: [].concat(...Array(4).fill(['go:egg', 'pick', 'go:basket', 'put'])) };
    for (const job of ['tulips', 'path', 'eggs']) {
      await click('.job[data-job="' + job + '"]'); await sleep(700); await ev(GEO);
      await click('#spdFast');
      await clearProgram();
      await click('#btnTeach'); await sleep(300);
      for (const op of presses[job]) { await click('#pad button[data-op="' + op + '"]'); await until('!__iw.busy()', 8000, 60); }
      const won = await until('!document.getElementById("win").hidden', 30000);
      const n0 = await ev('__iw.countBlocks()');
      check('Teach ' + job + ': ' + presses[job].length + ' pad presses won the job and became ' + presses[job].length + ' blocks', won && n0 === presses[job].length, { won, blocks: n0 });
      await click('#winStay');
      const foldShown = await ev('!document.getElementById("owlAct").hidden');
      await click('#btnFold'); await sleep(400);
      const shape = await ev('__drv.shape()'); const n1 = await ev('__iw.countBlocks()');
      check('fold offered and taken: ' + job + ' folds to ' + n1 + ' blocks', foldShown && n1 < n0, { shape });
      if (job === 'tulips') await shot('15-teach-fold-tulips');
      await click('#btnPlay');
      const won2 = await until('!document.getElementById("win").hidden', 90000);
      check('the folded ' + job + ' program wins on Play', won2);
      await click('#winStay');
    }
  }

  // ─────────────────────────── the Scratch-style details: tap-add, ?, context menu, flyout scale, trap, stats, FR ───────────────────────────
  if (has('ui')) {
    await click('.job[data-job="tulips"]'); await sleep(700); await ev(GEO);
    const n0 = await ev('__iw.countBlocks()');
    await showInDrawer('garden_forward');
    const fb = await ev('(function(){ var fb=__iw.flyBlock("garden_forward"), fw=__iw.flyWs(), o=fb.getRelativeToSurfaceXY(), s=__iw.screenOfWs(fw,o.x,o.y); return {x:s.x+fb.width*fw.scale*0.55, y:s.y+fb.height*fw.scale/2}; })()');
    await clickAt(fb.x, fb.y); await sleep(300);
    check('a tap on a drawer block adds it at the end of the program', await ev('__iw.countBlocks()') === n0 + 1 && await ev('(function(){ var b=__iw.startBlock(); while(b.getNextBlock()) b=b.getNextBlock(); return b.type==="garden_forward"; })()'), { before: n0, after: await ev('__iw.countBlocks()') });
    await showInDrawer('garden_water');
    const q = await ev('(function(){ var fb=__iw.flyBlock("garden_water"), f=fb.getField("Q"), r=f.getSvgRoot().getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()');
    await clickAt(q.x, q.y); await sleep(300);
    check('the ? on a drawer block opens its one-sentence card and adds nothing', await ev('!document.getElementById("card").hidden && /drink/.test(document.getElementById("cardP").textContent)') && await ev('__iw.countBlocks()') === n0 + 1, await ev('document.getElementById("cardP").textContent'));
    await shot('16-card');
    await click('#cardOk');
    const last = await ev('(function(){ var b=__iw.startBlock(); while(b.getNextBlock()) b=b.getNextBlock(); return b.id; })()');
    const lr = await ev('__drv.blockRect(' + JSON.stringify(last) + ')');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: lr.x + 14, y: lr.y + 12, button: 'right', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: lr.x + 14, y: lr.y + 12, button: 'right', clickCount: 1 }); await sleep(300);
    const menu = await ev('Array.prototype.map.call(document.querySelectorAll(".blocklyContextMenu .blocklyMenuItem"), function(e){return e.textContent.trim();})');
    check('the context menu offers only Help and Duplicate', JSON.stringify(menu.slice().sort()) === JSON.stringify(['Duplicate', 'Help']), menu);
    await key('Escape', 'Escape');
    await dragToDrawer(last);
    const sc0 = await ev('[__iw.ws.scale, __iw.flyWs().scale]');
    await click('#zIn'); await click('#zIn'); await sleep(300);
    const sc1 = await ev('[__iw.ws.scale, __iw.flyWs().scale]');
    check('zoom + changes the workspace scale; the drawer keeps its own scale', sc1[0] > sc0[0] && sc1[1] === sc0[1], { before: sc0, after: sc1 });
    await click('#zOut'); await click('#zOut'); await sleep(200);
    // the trap: a drag that starts on the workspace must not move the 3D camera, and a drag on the canvas must not reach Blockly
    const cam0 = await ev('JSON.stringify([__iw.view.tx.toFixed(3), __iw.view.tz.toFixed(3), __iw.view.dist.toFixed(3)])');
    // a point on the workspace's own background (never on a block, the drawer, a scrollbar or a zoom button)
    const wsp = await ev('(function(){ var r=document.getElementById("bwrap").getBoundingClientRect(); for(var y=r.bottom-40; y>r.top+40; y-=20) for(var x=r.right-80; x>r.left+40; x-=20){ var e=document.elementFromPoint(x,y); if(e && e.classList && e.classList.contains("blocklyMainBackground")) return {x:x,y:y}; } return null; })()');
    if (!wsp) throw new Error('no empty workspace background found');
    const stp = await ev('(function(){ var r=document.getElementById("stage").getBoundingClientRect(); return {x:r.left+r.width*0.4, y:r.top+r.height*0.6}; })()');
    const wsScroll0 = await ev('JSON.stringify([__iw.ws.scrollX, __iw.ws.scrollY])');
    const blocksA = await ev('JSON.stringify(__iw.ws.getAllBlocks(false).map(function(b){return b.type;}))');
    await drag(wsp, stp, 16);
    const cam1 = await ev('JSON.stringify([__iw.view.tx.toFixed(3), __iw.view.tz.toFixed(3), __iw.view.dist.toFixed(3)])');
    check('a drag that starts on the workspace and crosses the 3D view leaves the camera alone (and moves no block)', cam0 === cam1 && blocksA === await ev('JSON.stringify(__iw.ws.getAllBlocks(false).map(function(b){return b.type;}))'), { cam0, cam1, wsScroll0, wsScroll1: await ev('JSON.stringify([__iw.ws.scrollX, __iw.ws.scrollY])') });
    const blocks0 = await ev('JSON.stringify(__iw.ws.getAllBlocks(false).map(function(b){var p=b.getRelativeToSurfaceXY(); return b.type+"@"+Math.round(p.x)+","+Math.round(p.y);}))');
    const wsScroll1 = await ev('JSON.stringify([__iw.ws.scrollX, __iw.ws.scrollY])');
    await drag(stp, wsp, 16);
    const cam2 = await ev('JSON.stringify([__iw.view.tx.toFixed(3), __iw.view.tz.toFixed(3), __iw.view.dist.toFixed(3)])');
    check('a drag that starts on the 3D view pans the camera and never reaches the workspace', cam2 !== cam1 && blocks0 === await ev('JSON.stringify(__iw.ws.getAllBlocks(false).map(function(b){var p=b.getRelativeToSurfaceXY(); return b.type+"@"+Math.round(p.x)+","+Math.round(p.y);}))') && wsScroll1 === await ev('JSON.stringify([__iw.ws.scrollX, __iw.ws.scrollY])'), { cam1, cam2 });
    await click('#btnFit'); await sleep(200);
    await key('s', 'KeyS', 's'); await sleep(700);
    const stats = await ev('document.getElementById("stats").textContent');
    check('stats line on s: fps, frame p95, drag press→lift and lift→drop latency, both scales', !(await ev('document.getElementById("stats").hidden')) && /fps/.test(stats) && /lift→drop \d+ ms/.test(stats) && /drawer ×/.test(stats), stats);
    log.stats = stats;
    await shot('17-stats');
    await key('s', 'KeyS', 's');
    await click('#langFR'); await sleep(700); await ev(GEO);
    const bar = await ev('[...document.querySelectorAll(".modes .btn:not([hidden]) span")].map(function(e){return e.textContent;}).join(" · ")');
    check('FR: the bar reads Conduire · Apprendre · Jouer · Recommencer; the drawer speaks French (Blockly relabelled)', bar === 'Conduire · Apprendre · Jouer · Recommencer' && await ev('__iw.flyBlock("garden_forward").inputList[0].fieldRow.some(function(f){return f.getText && /avancer/.test(f.getText());})'), bar);
    await shot('18-fr');
    const fn = await ev('(function(){ var s=__iw.startBlock(); var b=s.getNextBlock(); return b? b.id : null; })()');
    if (fn) { const lr2 = await ev('__drv.blockRect(' + JSON.stringify(fn) + ')'); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: lr2.x + 14, y: lr2.y + 12, button: 'right', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: lr2.x + 14, y: lr2.y + 12, button: 'right', clickCount: 1 }); await sleep(300); const menuFr = await ev('Array.prototype.map.call(document.querySelectorAll(".blocklyContextMenu .blocklyMenuItem"), function(e){return e.textContent.trim();})'); check('FR context menu: Aide and Dupliquer (Blockly\'s own French)', JSON.stringify(menuFr.slice().sort()) === JSON.stringify(['Aide', 'Dupliquer']), menuFr); await key('Escape', 'Escape'); }
    await click('#langEN'); await sleep(500); await ev(GEO);
  }

  // ─────────────────────────── sizes: 1024×768, 1368×900, a phone at 400 px (touch drag) ───────────────────────────
  if (has('sizes')) {
    await viewport(1024, 768, false); await sleep(600); await ev('window.scrollTo(0,0)');
    await click('#btnFit'); await sleep(300);
    check('1024×768: no horizontal scroll; world and workspace side by side; workspace ≥ 480 px tall; Drive·Teach·Play above the fold', await ev('(function(){ var s=document.getElementById("stage").getBoundingClientRect(), b=document.getElementById("bwrap").getBoundingClientRect(), p=document.getElementById("btnPlay").getBoundingClientRect(); return document.documentElement.scrollWidth<=innerWidth && b.left>s.right && b.height>=480 && p.bottom<=innerHeight; })()'), await ev('(function(){ var s=document.getElementById("stage").getBoundingClientRect(), b=document.getElementById("bwrap").getBoundingClientRect(); return {sw:document.documentElement.scrollWidth, stage:[Math.round(s.width),Math.round(s.height)], bwrap:[Math.round(b.left),Math.round(b.width),Math.round(b.height)]}; })()'));
    await shot('19-1024x768');
    await viewport(1368, 900, false); await sleep(600);
    await shot('20-1368x900');
    // the artifact skeleton gives the page a device-width viewport; a file opened from disk has none, so add it as the skeleton would
    await ev('(function(){ if(!document.querySelector("meta[name=viewport]")){ var m=document.createElement("meta"); m.name="viewport"; m.content="width=device-width, initial-scale=1"; document.head.appendChild(m); } })()');
    await viewport(400, 860, true); await sleep(800); await ev(GEO); await click('#btnFit');
    check('phone 400 px: no horizontal scroll; the world stacks above the blocks', await ev('(function(){ var s=document.getElementById("stage").getBoundingClientRect(), b=document.getElementById("bwrap").getBoundingClientRect(); return document.documentElement.scrollWidth<=innerWidth && b.top>s.bottom; })()'), await ev('[document.documentElement.scrollWidth, innerWidth]'));
    await shot('21-phone-400-top');
    // one touch drag from the drawer under ▶ (emulated touch; the real tablet reading is Richard's, AC5)
    await ev('document.getElementById("bwrap").scrollIntoView({block:"start"})'); await sleep(300);
    const s = await startId();
    await showInDrawer('garden_forward');
    const p = await ev('__drv.plan("garden_forward", null, ' + JSON.stringify(s) + ', "next")');
    log.touchPlan = p; log.touchDbg = await ev('(function(){ var e=document.elementFromPoint(' + p.grab.x + ',' + p.grab.y + '); return {iw:innerWidth, fly:__iw.flyWs().scale, ws:__iw.ws.scale, at: e? e.tagName+"."+(e.getAttribute("class")||""):null}; })()');
    const tp = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }] });
    const before = await ev('__iw.countBlocks()');
    await ev('window.__pe=[]; ["pointerdown","pointermove","pointerup","pointercancel","touchstart","touchend"].forEach(function(t){ document.addEventListener(t, function(e){ if(window.__pe.length<60) window.__pe.push(t+":"+(e.pointerType||"")+":"+Math.round(e.clientX||(e.touches&&e.touches[0]&&e.touches[0].clientX)||0)+":"+(e.target&&e.target.getAttribute&&e.target.getAttribute("class"))); }, true); }); 1');
    await tp('touchStart', p.grab.x, p.grab.y); await sleep(60);
    for (let i = 1; i <= 14; i++) { await tp('touchMove', p.grab.x + (p.drop.x - p.grab.x) * i / 14, p.grab.y + (p.drop.y - p.grab.y) * i / 14); await sleep(20); }
    await tp('touchEnd'); await sleep(300); log.pe = await ev('window.__pe');
    check('phone, emulated touch: a drag from the drawer lands under ▶', await ev('__iw.countBlocks()') === before + 1 && await ev('__iw.startBlock().getNextBlock() && __iw.startBlock().getNextBlock().type') === 'garden_forward', { before, after: await ev('__iw.countBlocks()') });
    await shot('22-phone-400-blocks');
    await viewport(1368, 900, false);
  }

  // ── the console, read last
  const errors = log.console.filter((c) => c.type === 'error');
  const external = (log.requests || []).filter((u) => !/^(file:|data:|blob:|https:\/\/cdnjs\.cloudflare\.com\/|https:\/\/cdn\.jsdelivr\.net\/npm\/|https:\/\/fonts\.googleapis\.com\/|https:\/\/fonts\.gstatic\.com\/)/.test(u));
  check('0 console errors, 0 exceptions', errors.length === 0 && log.exceptions.length === 0, { errors: errors.slice(0, 5), exceptions: log.exceptions.slice(0, 5) });
  check('no request outside cdnjs / jsdelivr/npm / Google Fonts / data:', external.length === 0, external.slice(0, 5));
  const failed = log.checks.filter((c) => !c.ok).length;
  console.log('\n' + (log.checks.length - failed) + ' passed, ' + failed + ' failed, ' + log.checks.length + ' total');
  log.summary = { passed: log.checks.length - failed, failed, total: log.checks.length };
  done(failed ? 1 : 0);
})();
