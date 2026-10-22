// Start-up, the frame loop, the pointer on the 3D view, and window.__game (the drive's handle).
import { G, load, save } from './state.js';
import { simulate, stageOf, routineInfo, analyseLoge, judgeParking } from './engine.js';
import { CLS, NUMBERS, RULES } from './data.js';
import * as W from './world.js';
import { t } from './i18n.js';
import { tick as tickMusic, wake, setSound, soundOn, musicState } from './music.js';
import { dancers, buildDancers, idle, idleScene, stepRun, updateDancers, stepScene, onSay, fastForward, skipNumber, snapDancers, danceAt } from './play.js';
import {
  toast, hud, paintCamBar, camCmd, pickRoom, setTab, showScreen, paintSheet, paintRunSheet, refreshWorld, beginRun, stopRun, nextSeason, showIntro,
  tapAt, hoverAt, rotateArmed, rotateSelected, placeFloat, resize, sayText, changed, buy,
} from './ui.js';

load();
onSay(sayText, toast);
buildDancers(); refreshWorld(); idle(); idleScene(); paintCamBar(); showScreen('prep'); resize();
document.fonts?.ready.then(() => W.drawSign(G.S.school.name || t().school));
showIntro();

$lang();
function $lang() {
  document.getElementById('langBtn').onclick = () => { G.lang = G.lang === 'fr' ? 'en' : 'fr'; save(); paintCamBar(); paintSheet(); hud(); document.getElementById('soundBtn').title = t().sound(soundOn()); W.drawSign(G.S.school.name || t().school); };
  document.getElementById('introBtn').onclick = () => showIntro(true);
  const sb = document.getElementById('soundBtn'), paintSound = () => { sb.textContent = soundOn() ? '🔊' : '🔇'; sb.title = t().sound(soundOn()); sb.setAttribute('aria-label', sb.title); };
  sb.onclick = () => { setSound(!soundOn()); save(); paintSound(); };
  paintSound();
}

/* ---------------- the pointer on the 3D view ---------------- */
const canvas = W.canvas, ptrs = new Map(); let pinch0 = 0, zoom0 = 1;
canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (G.armed) rotateArmed(); });
canvas.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), button: e.button, type: e.pointerType }); canvas.setPointerCapture(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = W.view.zoom; } });
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) { hoverAt(e.clientX, e.clientY); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (Math.hypot(p.x - p.x0, p.y - p.y0) < 5 && ptrs.size === 1) return;
  if (ptrs.size === 1) W.panBy(dx, dy); else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; W.view.zoom = zoom0; W.zoomBy(Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinch0)); }
});
const endPtr = (e) => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!p || e.type === 'pointercancel' || ptrs.size) return; if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 8 || performance.now() - p.t0 > 450 || (p.type === 'mouse' && p.button !== 0)) return; tapAt(e.clientX, e.clientY); };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); const unit = e.deltaMode === 1 ? 16 : 1; W.zoomBy(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.002))); }, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.matches('input')) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { W.panBy(e.key === 'ArrowLeft' ? 60 : -60, 0); e.preventDefault(); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { W.panBy(0, e.key === 'ArrowUp' ? 60 : -60); e.preventDefault(); }
  if (e.key === '+' || e.key === '=') W.zoomBy(1.25); if (e.key === '-') W.zoomBy(0.8);
  if (e.key === 'q' || e.key === '[') camCmd('rotL'); if (e.key === 'e' || e.key === ']') camCmd('rotR');
  if (e.key === 'r' || e.key === 'R') { if (G.armed) rotateArmed(); else if (G.selected) rotateSelected(); }
  if (e.key === 'Escape') { if (G.armed) { G.armed = null; W.setGhost(null); paintSheet(); } else if (G.pickedRoom && G.tab !== 'build') pickRoom(null); }
});

/* ---------------- the loop ---------------- */
let last = performance.now(), hudK = -1, paintK = -1;
function frame(now) {
  requestAnimationFrame(frame); G.frames++;
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.realT += dt;
  stepRun(dt); tickMusic();
  if (G.run) {
    stepScene(dt);
    if (Math.floor(G.realT * 2) !== hudK) { hudK = Math.floor(G.realT * 2); hud(); }
    if (G.screen === 'run' && !G.run.done && Math.floor(G.realT * 4) !== paintK) { paintK = Math.floor(G.realT * 4); paintRunSheet(); }
  } else W.stepLights(dt, false, false);
  W.curtain.open += (W.curtain.target - W.curtain.open) * Math.min(1, dt * 3);
  W.curtain.halves.forEach((g) => { g.scale.x = 1 - W.curtain.open * 0.86; });
  updateDancers(dt); W.spinFans(dt);
  W.placeCamera(dt); placeFloat();
  W.renderer.render(W.scene, W.camera);
}
addEventListener('resize', resize);
if (window.ResizeObserver) { const ro = new ResizeObserver(() => resize()); ro.observe(document.getElementById('sheet')); ro.observe(document.getElementById('cam')); }
requestAnimationFrame(frame);

/* ---------------- the drive's handle ---------------- */
window.__game = {
  G, get S() { return G.S; }, simulate, stageOf, routineInfo, analyseLoge, CLS, NUMBERS, RULES, danceAt,
  setTab, beginRun, stopRun, nextSeason, buy, changed, refreshWorld, pickRoom, camCmd, tapAt, hoverAt, rotateArmed, rotateSelected,
  fastForward, skipNumber, view: W.view, camera: W.camera, renderer: W.renderer, project: W.project, tileCentre: W.tileCentre, snapCam: W.snapCam,
  get frames() { return G.frames; },
  get run() { const r = G.run; return r && { mode: r.mode, t: r.t, done: r.done, feed: r.feed.map((f) => f.text), points: r.res.points }; },
  dancers: () => dancers.map((d) => ({ id: d.id, x: +d.g.position.x.toFixed(2), y: +d.g.position.y.toFixed(2), z: +d.g.position.z.toFixed(2), visible: d.g.visible, emoji: d.emoji, wearing: d.wearing })),
  fitReport: () => { const spec = W.viewSpec(), u = W.usable(); const pts = spec.pts.map((q) => { const v = q.clone().project(W.camera); return { x: +v.x.toFixed(3), y: +v.y.toFixed(3) }; }); return { mode: W.view.mode, inside: pts.every((v) => v.x >= u.x0 - 0.03 && v.x <= u.x1 + 0.03 && v.y >= u.y0 - 0.03 && v.y <= u.y1 + 0.03), pts }; },
  snapDancers, idle, music: musicState, wake,
  furnitureDrawn: () => W.furnG.children.filter((o) => o.userData.f).length,
};
