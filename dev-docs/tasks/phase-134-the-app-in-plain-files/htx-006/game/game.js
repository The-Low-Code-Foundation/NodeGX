// HTX-006's small game: a ship circles a planet and passes through rings. Plain three.js, written once for this page.
// Its pause menu is not written here: it is a NodeGX component, exported into this folder (Settings.js, Settings.css and
// what they import, listed in nodegx-export.json). This file only mounts it, listens to it, and takes it away.
import * as THREE from 'three';
import { mountSettings } from './Settings.js';

const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 3.2, 9);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x557799, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(5, 6, 4);
scene.add(sun);

const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 2), new THREE.MeshStandardMaterial({ color: 0x2b6cb0, flatShading: true }));
scene.add(planet);
const ship = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x7cf9c0 }));
scene.add(ship);
const rings = [];
for (let i = 0; i < 6; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xf6ad55 }));
  const a = (i / 6) * Math.PI * 2;
  ring.position.set(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4);
  ring.lookAt(0, 0, 0);
  ring.userData.angle = a;
  scene.add(ring);
  rings.push(ring);
}

// What the game keeps. `window.game` is read by the drive in htx-006/drive.cjs; the game does not need it.
const game = { paused: false, volume: 0.8, rings: 0, frames: 0, resumes: 0, angle: 0 };
window.game = game;

const hudScore = document.getElementById('score');
const hudVolume = document.getElementById('volume');
const overlay = document.getElementById('overlay');
const showVolume = () => {
  hudVolume.textContent = `volume ${Math.round(game.volume * 100)}%`;
};

// The pause menu: mounted when the game pauses, given the volume, and listened to.
let menu = null;
function pause() {
  if (game.paused) return;
  game.paused = true;
  overlay.hidden = false;
  menu = mountSettings(overlay, { volume: game.volume });
  menu.outputs.volume.subscribe((v) => {
    if (typeof v !== 'number') return;
    game.volume = v;
    showVolume();
  });
  menu.outputs.resume.subscribe(() => resume());
}
function resume() {
  if (!game.paused) return;
  game.paused = false;
  game.resumes += 1;
  menu.destroy();
  menu = null;
  overlay.hidden = true;
}
document.getElementById('pause').addEventListener('click', pause);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') (game.paused ? resume : pause)();
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.paused) {
    game.frames += 1;
    game.angle += dt * 0.9;
    ship.position.set(Math.cos(game.angle) * 3.4, Math.sin(game.angle * 3) * 0.15, Math.sin(game.angle) * 3.4);
    ship.rotation.set(Math.PI / 2, 0, -game.angle);
    planet.rotation.y += dt * 0.2;
    for (const ring of rings) {
      const d = Math.abs(((game.angle - ring.userData.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (d < 0.05 && ring.userData.lap !== Math.floor(game.angle / (Math.PI * 2))) {
        ring.userData.lap = Math.floor(game.angle / (Math.PI * 2));
        game.rings += 1;
        hudScore.textContent = `${game.rings} rings`;
      }
      ring.rotation.z += dt;
    }
  }
  renderer.render(scene, camera);
});
showVolume();
