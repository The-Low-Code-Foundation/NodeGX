// The creature lab: the three creatures on a dark stone stage lit like a dark room, with buttons for each action.
// For the drive: window.__lab — `advance(s)` steps time by hand (with `paused`), `cam()` moves the camera, `tris()`.
import * as THREE from 'three';
import { makeView, canvasTexture, params } from '../src/look.mjs';
import { KINDS, makeCreature } from '../src/creatures.mjs';

const view = makeView(document.getElementById('view'), { quality: params.get('quality') ?? 'high' });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060c);
scene.fog = new THREE.FogExp2(0x0a0914, 0.06);
view.setScene(scene);

const stone = canvasTexture(512, 512, (g) => {
  g.fillStyle = '#26232e';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const v = 30 + Math.floor(Math.random() * 18);
      g.fillStyle = `rgb(${v},${v - 2},${v + 8})`;
      g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
    }
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.04)';
    g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
}, { repeat: [4, 3] });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: stone, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
scene.add(new THREE.HemisphereLight(0x3a4a7a, 0x120e18, 0.7));
const rim = new THREE.DirectionalLight(0x7aa0ff, 2.2);
rim.position.set(-2, 4, -5);
scene.add(rim);
const key = new THREE.PointLight(0xffb070, 30, 14, 2);
key.position.set(2.5, 3, 4);
scene.add(key);

// A stand-in for the heroine, where attacks are aimed.
const target = new THREE.Vector3(0, 1.0, 3.4);
const standIn = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 4, 12), new THREE.MeshStandardMaterial({ color: 0x8866cc, transparent: true, opacity: 0.35 }));
standIn.position.set(0, 0.77, 3.4);
scene.add(standIn);

const creatures = [];
const SPOTS = { moth: -2.4, soot: 0, grimoire: 2.4 };
function place(kind, seed = 0) {
  const c = makeCreature(kind, { seed });
  c.group.position.set(SPOTS[kind], 0, 0);
  scene.add(c.group);
  return c;
}
for (const k of KINDS) creatures.push(place(k));

view.camera.position.set(0, 2.0, 7.5);
view.camera.lookAt(0, 0.8, 0);

const panel = document.getElementById('panel');
creatures.forEach((c, i) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<b>${c.kind}</b>`;
  for (const act of ['wake', 'hurt', 'attack', 'free', 'reset']) {
    const b = document.createElement('button');
    b.textContent = act;
    b.onclick = () => {
      if (act === 'reset') {
        creatures[i].dispose();
        creatures[i] = place(c.kind);
      } else creatures[i][act](target);
    };
    row.appendChild(b);
  }
  panel.appendChild(row);
});

const clock = new THREE.Clock();
const lab = {
  creatures, scene, view, target, paused: false, ready: false,
  // Steps every creature by `seconds`, a 30th at a time, letting their promises move on between steps.
  async advance(seconds) {
    for (let t = 0; t < seconds; t += 1 / 30) {
      for (const c of creatures) c.update(1 / 30);
      await new Promise((r) => setTimeout(r, 0));
    }
    view.render();
  },
  cam(px, py, pz, tx, ty, tz) {
    view.camera.position.set(px, py, pz);
    view.camera.lookAt(tx, ty, tz);
    view.render();
  },
  tris(i) {
    let n = 0;
    creatures[i].group.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry, per = (g.index ? g.index.count : g.attributes.position.count) / 3;
      n += per * (o.isInstancedMesh ? o.count : 1);
    });
    return Math.round(n);
  },
  hidePanel() {
    panel.classList.add('hide');
  }
};
window.__lab = lab;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!lab.paused) for (const c of creatures) c.update(dt);
  view.render();
}
frame();
lab.ready = true;
