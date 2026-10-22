import * as THREE from 'three';
import { Game } from './game.mjs';

const game = new Game();
window.__game = game;
const btnContinue = document.getElementById('btn-continue');
btnContinue.hidden = !game.hasSave();
btnContinue.addEventListener('click', () => game.load());
document.getElementById('btn-new').addEventListener('click', () => game.newGame());
game.frame();

// For the drive and the console: shortcuts past the walking.
game.debug = {
  use: (id) => game.doUse(id),
  phase: (p, opts) => game.setPhase(p, opts),
  go: (kind, offset = 150) => {
    const e = game.world.entities.find((x) => x.kind === kind && x.alive);
    if (!e) return null;
    const p = e.kind === 'station' ? e.obj.localToWorld(e.obj.userData.dock.clone()) : e.obj.position.clone();
    const dir = p.clone().sub(game.player.obj.position).normalize();
    game.player.obj.position.copy(p).addScaledVector(dir, -offset);
    game.player.obj.lookAt(p);
    game.player.obj.updateMatrixWorld();
    return e.name;
  },
  credits: (n) => (game.state.credits += n),
  killHostiles: () => game.hostiles().forEach((e) => e.damage(99999, e.obj.position.clone(), 'player', game.player)),
  assist: (on) => (game.assist = on),
  stats: () => game.stats(),
  /** What the camera's centre ray lands on, through the camera's own layers: the one check that reads the view.
   *  stats() cannot see a wall in your face (2026-10-22: the drive was green while the spawn looked at the hull). */
  see: () => {
    game.controller.placeCamera(game.camera);
    game.camera.updateMatrixWorld();
    const dir = game.camera.getWorldDirection(new THREE.Vector3());
    const rc = new THREE.Raycaster(game.camera.getWorldPosition(new THREE.Vector3()), dir, 0, 1000);
    rc.layers.mask = game.camera.layers.mask;
    rc.camera = game.camera; // sprites (the engines' halos) need it
    const hit = rc.intersectObjects(game.scene.children, true).find((h) => h.object.visible && h.object.material && !h.object.isSprite && !h.object.isPoints && !(h.object.material.side === THREE.FrontSide && h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).dot(dir) > 0));
    if (!hit) return { dist: Infinity, color: null, geo: null };
    const p = hit.object.geometry.parameters ?? {};
    return { dist: Math.round(hit.distance * 100) / 100, color: '#' + (hit.object.material.color?.getHexString() ?? ''), geo: hit.object.geometry.type, size: [p.width, p.height, p.depth].filter((v) => v !== undefined) };
  }
};
