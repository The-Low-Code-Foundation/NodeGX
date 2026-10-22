// The 3D view and the music, put together: what reference/src/main.js did (the frame loop, the pointer and keys on
// the canvas) and the half of ui.js that moved the world (refreshWorld, camCmd, setTab's camera cuts, tapAt,
// hoverAt, placeFloat, resize, beginRun/stopRun). The graph owns the state: it calls sync() with the save and the
// screen state whenever either changes, and hears back through env.emit(kind, data). Nothing here draws a page
// element; the only element it owns is three.js's own canvas.
const World = use('stage/world'), People = use('stage/people'), Play = use('stage/play'), Music = use('stage/music');
const { CLS, NUMBERS, PIECES, LOGE, seasonRules } = use('rules/data');
const { stageOf, fits, againstWall, footprint, clamp } = use('rules/engine');

function create(env) {
  const window = env.window, document = env.document, SIZE = env.size;
  const G = { S: env.save, lang: env.save.lang || 'fr', screen: 'prep', tab: 'order', run: null, speed: 1, follow: true, pickedRoom: null, armed: null, selected: null, pickNum: 'G1', editB: false, pickDancer: null, ruler: null, realT: 0, frames: 0 };
  const base = { T: env.T, window, document, size: SIZE, G, save: () => {} };
  const W = World.create({ ...base, mods: {} });
  const P = People.create({ ...base, mods: { world: W } });
  const PL = Play.create({ ...base, mods: { world: W, people: P } });
  const MU = Music.create({ ...base, mods: {} });
  const emit = (kind, data) => env.emit(kind, data);
  const canvas = W.canvas;
  let schoolName = env.schoolName || '';

  /* ---------------- the world follows the save ---------------- */
  function refreshWorld() {
    const sc = G.S.school, up = sc.upgrades;
    W.buildLoge(); W.showFurniture(); W.buildSeats(up.sieges || 0, !!up.confort); W.showBuvette(up.buvette); W.buildLights(up);
    W.buildParking(G.S.plan.parking.width, up.rangee ? 2 : 1); W.showBackdrop(G.S.plan.backdrop); W.drawStageTape(stageOf(sc)); W.drawSign(schoolName); W.setStageFloor('tapis');
    if (!G.run) PL.idleScene();
  }
  const camState = () => ({ mode: W.view.mode, high: W.view.high, wallMode: W.wallMode });
  const sendCam = () => emit('cam', camState());
  // the reference compared the selected piece by identity; the graph sends a copy, so find the piece it means
  const findPiece = (f) => (f ? G.S.school.furniture.find((x) => x.id === f.id && x.c === f.c && x.r === f.r && x.rot === f.rot) || null : null);

  let worldKey = '', classKey = '', lastTab = null, lastRoom = null, lastNum = null;
  function sync(save, ui, name) {
    G.S = save; G.lang = save.lang || 'fr'; schoolName = name || schoolName;
    G.screen = ui.screen || 'prep'; G.pickNum = ui.pickNum || G.pickNum; G.editB = !!ui.editB; G.pickDancer = ui.pickDancer ?? null;
    G.armed = ui.armed || null; G.selected = findPiece(ui.selected);
    if (G.run) { G.speed = ui.speed || 1; G.follow = ui.follow !== false; }
    if (!G.armed) W.setGhost(null);
    const ck = JSON.stringify([save.season, seasonRules(save.season).classes]);
    if (ck !== classKey) { classKey = ck; PL.buildDancers(); }
    const wk = JSON.stringify([save.school.logeCols, save.school.furniture, save.school.upgrades, save.plan.parking.width, save.plan.backdrop, schoolName, G.selected]);
    if (wk !== worldKey) { worldKey = wk; refreshWorld(); }
    // a tab sends the camera where its work is (setTab); a picked room is looked at from close up (pickRoom)
    const tab = ui.tab || 'order';
    if (tab !== lastTab && G.screen === 'prep') {
      lastTab = tab; G.tab = tab;
      if (tab === 'formation') W.cutTo('stage');
      else if (tab === 'costumes') W.cutTo('podium');
      else if (tab === 'parking') W.cutTo('park');
      else if (tab !== 'build' && ['podium', 'park', 'stage'].includes(W.view.mode)) W.cutTo('school');
      sendCam();
    }
    G.tab = tab;
    const room = ui.pickedRoom || null;
    if (room !== lastRoom) { lastRoom = room; G.pickedRoom = room; W.cutTo(room ? 'room' : 'school'); sendCam(); }
    if (G.screen === 'prep' && G.pickNum !== lastNum && tab === 'formation') { lastNum = G.pickNum; W.cutTo('stage'); }
    MU.setSound(save.sound !== false);
    if (!G.run) { for (const d of PL.dancers) if (d.wearing) PL.dress(d, d.wearing); PL.idle(); PL.idleScene(); }
    W.showFurniture();
  }

  /* ---------------- the camera bar ---------------- */
  function camCmd(c) {
    const v = W.view;
    if (c === 'rotL' || c === 'rotR') { v.rot = (v.rot + (c === 'rotL' ? 3 : 1)) % 4; if (['stage', 'podium', 'park'].includes(v.mode)) v.mode = G.pickedRoom ? 'room' : 'school'; W.cutTo(); }
    if (c === 'high') { v.high = !v.high; if (['stage', 'podium'].includes(v.mode)) v.mode = 'school'; W.cutTo(); }
    if (c === 'school') { if (G.pickedRoom) emit('ui', { pickedRoom: null }); G.pickedRoom = null; lastRoom = null; W.cutTo('school'); }
    if (c === 'stage') W.cutTo(v.mode === 'stage' ? 'school' : 'stage');
    if (c === 'park') { if (G.pickedRoom) emit('ui', { pickedRoom: null }); G.pickedRoom = null; lastRoom = null; W.cutTo(v.mode === 'park' ? 'school' : 'park'); }
    if (c === 'walls') W.setWallMode((W.wallMode + 1) % 3);
    if (c === 'in') W.zoomBy(1.25); if (c === 'out') W.zoomBy(0.8);
    if (G.run) G.run.auto = 'manual';
    sendCam();
  }

  /* ---------------- placing furniture in the dressing room ---------------- */
  function showGhost(f) { const cols = G.S.school.logeCols, ok = fits(f, G.S.school.furniture, cols); W.setGhost(f, !ok ? 'bad' : PIECES[f.id].wall && !againstWall(f, cols) ? 'warn' : 'ok'); }
  function hoverAt(x, y) {
    if (!G.armed || G.pickedRoom !== 'dr' || G.run) return;
    const tl = W.tileAt(W.groundAt(x, y)); if (!tl) { W.setGhost(null); return; }
    const cols = G.S.school.logeCols, fp = footprint({ id: G.armed.id, rot: G.armed.rot });
    const f = { id: G.armed.id, rot: G.armed.rot, c: clamp(tl.c - Math.floor((fp.w - 1) / 2), 0, cols - fp.w), r: clamp(tl.r - Math.floor((fp.d - 1) / 2), 0, LOGE.rows - fp.d) };
    const g = W.ghost.f; if (!g || g.c !== f.c || g.r !== f.r || g.rot !== f.rot || g.id !== f.id) showGhost(f);
  }
  function tapAt(x, y) {
    if (G.run) return;
    if (G.tab === 'build' && G.pickedRoom === 'dr') {
      if (G.armed) { hoverAt(x, y); const g = W.ghost.f; if (g && fits(g, G.S.school.furniture, G.S.school.logeCols)) { emit('place', { id: g.id, c: g.c, r: g.r, rot: g.rot }); W.setGhost(null); } return; }
      const f = W.pieceAt(x, y); if (f) { emit('ui', { selected: { ...f } }); return; }
      if (G.selected) { emit('ui', { selected: null }); return; }
    }
    const g = W.groundAt(x, y); if (!g) return; const r = W.roomAt(g.x, g.z);
    const inside = g.x > -15 && g.x < W.ROOMS.dr.x1 && g.z > -9 && g.z < 7;
    if (!inside) { if (G.pickedRoom) emit('ui', { pickedRoom: null }); return; }
    const room = r === 'wing' || r === 'stage' ? 'hall' : r; if (room !== G.pickedRoom) emit('ui', { pickedRoom: room });
  }
  function rotateArmed() { if (!G.armed) return; emit('ui', { armed: { ...G.armed, rot: (G.armed.rot + 1) % 4 } }); }
  // the little toolbar over a selected piece: the graph draws it, this says where
  let floatKey = '';
  function placeFloat() {
    const f = G.selected; let at = { show: false, x: 0, y: 0 };
    if (f && !G.run && G.tab === 'build' && G.screen === 'prep') {
      const fp = footprint(f), p = W.project(W.ROOMS.dr.x0 + f.c + fp.w / 2, 1.6, W.ROOMS.dr.z0 + f.r + fp.d / 2);
      if (!p.behind) at = { show: true, x: Math.round(p.x), y: Math.round(p.y) };
    }
    const k = `${at.show}|${at.x}|${at.y}`; if (k !== floatKey) { floatKey = k; emit('float', at); }
  }

  /* ---------------- the run ---------------- */
  let liveK = -1;
  const liveOf = (run) => ({ mode: run.mode, t: run.t, done: run.done, tryId: run.tryId || null, feed: run.feed.map((f) => ({ t: f.t, say: f.text })) });
  // play.js turns each trace line into words through onSay; the graph owns the words, so it gets the line itself
  PL.onSay((say) => say, (say) => emit('say', say));
  function beginRun(mode, tryId) {
    G.pickedRoom = null; G.armed = null; W.setGhost(null); G.selected = null; W.showFurniture();
    const run = PL.startRun(mode, tryId); if (!run) return null;
    MU.wake(); G.speed = 1;
    run.onDone = () => emit('done', liveOf(run));
    if (mode !== 'try' && G.follow) W.cutTo('school');
    sendCam(); emit('live', liveOf(run));
    return run.res;
  }
  function stopRun() { G.run = null; PL.idle(); PL.idleScene(); if (G.tab === 'formation') W.cutTo('stage'); sendCam(); }
  const skipNumber = () => { PL.skipNumber(); if (G.run) emit('live', liveOf(G.run)); };
  const skipToEnd = () => { if (G.run) PL.fastForward(G.run.endT - G.run.t + 1); if (G.run) emit('live', liveOf(G.run)); };

  /* ---------------- the pointer and the keys on the 3D view (main.js) ---------------- */
  const ptrs = new Map(); let pinch0 = 0, zoom0 = 1;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (G.armed) rotateArmed(); });
  canvas.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: window.performance.now(), button: e.button, type: e.pointerType }); canvas.setPointerCapture(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = W.view.zoom; } });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) { hoverAt(e.clientX, e.clientY); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) < 5 && ptrs.size === 1) return;
    if (ptrs.size === 1) W.panBy(dx, dy); else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; W.view.zoom = zoom0; W.zoomBy(Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinch0)); }
  });
  const endPtr = (e) => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!p || e.type === 'pointercancel' || ptrs.size) return; if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 8 || window.performance.now() - p.t0 > 450 || (p.type === 'mouse' && p.button !== 0)) return; tapAt(e.clientX, e.clientY); };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const unit = e.deltaMode === 1 ? 16 : 1; W.zoomBy(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.002))); }, { passive: false });
  const onKey = (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { W.panBy(e.key === 'ArrowLeft' ? 60 : -60, 0); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { W.panBy(0, e.key === 'ArrowUp' ? 60 : -60); e.preventDefault(); }
    if (e.key === '+' || e.key === '=') W.zoomBy(1.25); if (e.key === '-') W.zoomBy(0.8);
    if (e.key === 'q' || e.key === '[') camCmd('rotL'); if (e.key === 'e' || e.key === ']') camCmd('rotR');
    if (e.key === 'r' || e.key === 'R') { if (G.armed) rotateArmed(); else if (G.selected) emit('key', 'rotateSelected'); }
    if (e.key === 'Escape') { if (G.armed) emit('key', 'cancelArmed'); else if (G.pickedRoom && G.tab !== 'build') emit('ui', { pickedRoom: null }); }
  };
  window.addEventListener('keydown', onKey);

  /* ---------------- the frame loop ---------------- */
  // the sheet covers the right 400 px on a wide window, the bottom on a narrow one: the camera frames what is left
  function resize() {
    const w = SIZE.w, h = SIZE.h; if (w < 50 || h < 50) return;
    const side = w > 760, under = side ? 0 : Math.min(h * 0.6, h * 0.56);
    W.resizeRenderer(side ? 400 : 0, under, Math.min(h * 0.4, 100));
  }
  let last = window.performance.now(), raf = 0, stopped = false;
  function frame(now) {
    if (stopped) return;
    raf = window.requestAnimationFrame(frame); G.frames++;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; G.realT += dt;
    PL.stepRun(dt); MU.tick();
    if (G.run) {
      PL.stepScene(dt);
      if (Math.floor(G.realT * 4) !== liveK && !G.run.done) { liveK = Math.floor(G.realT * 4); emit('live', liveOf(G.run)); }
    } else W.stepLights(dt, false, false);
    W.curtain.open += (W.curtain.target - W.curtain.open) * Math.min(1, dt * 3);
    W.curtain.halves.forEach((g) => { g.scale.x = 1 - W.curtain.open * 0.86; });
    PL.updateDancers(dt); W.spinFans(dt);
    W.placeCamera(dt); placeFloat();
    W.renderer.render(W.scene, W.camera);
  }
  raf = window.requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => W.drawSign(schoolName));

  function destroy() { stopped = true; window.cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); W.renderer.dispose(); }

  sync(env.save, env.ui || {}, schoolName); PL.buildDancers(); refreshWorld(); PL.idle(); PL.idleScene(); resize(); sendCam();
  return {
    canvas, sync, camCmd, resize, beginRun, stopRun, skipNumber, skipToEnd, rotateArmed, destroy,
    setSpeed: (s) => { G.speed = s; }, setFollow: (f) => { G.follow = f; if (G.run) G.run.auto = ''; },
    wake: () => MU.wake(), music: () => MU.musicState(), G, W, PL,
  };
}
exports.create = create;
