// The château from outside, at night: the title screen. A Disney-shaped château on a rocky hill (round towers with
// tall slate cone roofs, a keep, walls with battlements, a gate and a bridge, flags), under a violet sky with a huge
// moon, stars that twinkle, mist round the hill, wisps and a few bats. Cursed windows glow sickly green and violet;
// ONE glows warm gold (hope). setRestored(f) lights more of them gold as rooms are won.
// Cheap for a slow tablet: the towers, roofs, windows, battlements, rocks and trees are instanced, and every stone
// texture is drawn once in code.
//   const ext = makeExterior(); view.setScene(ext.scene); each frame: ext.update(dt, view.camera)
import * as THREE from 'three';
import { canvasTexture, dotTexture } from './look.mjs';

// A small seeded random, so the château is the same every time.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0), (s >>> 8) / 16777216);
}

// Moonlit stone blocks, lavender grey, with a little moss at random.
function stoneTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#5d5873';
    g.fillRect(0, 0, w, h);
    const rows = 8, bh = h / rows;
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * 0.5;
      const cols = 4;
      for (let x = -1; x < cols + 1; x++) {
        const bx = (x + off) * (w / cols), by = y * bh;
        const v = 0.85 + r() * 0.3;
        const c = [150 * v, 144 * v, 170 * v].map((n) => Math.min(255, n | 0));
        g.fillStyle = `rgb(${c})`;
        g.fillRect(bx + 2, by + 2, w / cols - 4, bh - 4);
        if (r() < 0.18) {
          g.fillStyle = 'rgba(70,110,90,0.35)';
          g.fillRect(bx + 2, by + bh - 10, w / cols - 4, 8);
        }
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(bx + 2, by + 2, w / cols - 4, 3);
      }
    }
  });
}

// Fish-scale slates, deep blue.
function slateTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#1c2348';
    g.fillRect(0, 0, w, h);
    const rows = 8, cols = 8, sw = w / cols, sh = h / rows;
    for (let y = rows; y >= -1; y--)
      for (let x = -1; x <= cols; x++) {
        const cx = (x + (y % 2) * 0.5) * sw + sw / 2, cy = y * sh;
        const v = 0.8 + r() * 0.35;
        const grad = g.createLinearGradient(0, cy, 0, cy + sh * 1.1);
        grad.addColorStop(0, `rgb(${(58 * v) | 0},${(78 * v) | 0},${(140 * v) | 0})`);
        grad.addColorStop(1, `rgb(${(30 * v) | 0},${(40 * v) | 0},${(84 * v) | 0})`);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(cx - sw / 2, cy);
        g.lineTo(cx - sw / 2, cy + sh * 0.5);
        g.arc(cx, cy + sh * 0.5, sw / 2, Math.PI, 0, true);
        g.lineTo(cx + sw / 2, cy);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(10,12,30,0.6)';
        g.lineWidth = 2;
        g.stroke();
      }
  });
}

// Instanced surfaces whose texture keeps its block size whatever each instance is scaled to: the UVs are multiplied by
// the instance's own size (a tower's circumference and height, a wall's length and height).
function sizedMaterial(params, { blockU, blockV, mode }) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
#if defined( USE_INSTANCING ) && defined( USE_MAP )
  {
    float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz), sz = length(instanceMatrix[2].xyz);
    ${mode === 'cyl' ? 'float su = sx * 6.2832; float sv = sy;' : mode === 'cone' ? 'float su = sx * 6.2832; float sv = sqrt(sy * sy + sx * sx);' : 'float su = abs(normal.x) > 0.5 ? sz : sx; float sv = abs(normal.y) > 0.5 ? sz : sy;'}
    vMapUv *= vec2(su / ${blockU.toFixed(3)}, sv / ${blockV.toFixed(3)});
  }
#endif`
    );
  };
  return m;
}

// An arched window: a rectangle with a round top, its bottom edge at y = 0.
function archGeometry(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 6);
}

// The hill's height at a distance from the middle: flat for the château's plateau (out to 12.5), then a smooth fall
// (one curve, so the slope has no terraces).
function hillY(d) {
  if (d <= 12.5) return 0;
  return -19 * (1 - Math.exp(-Math.pow((d - 12.5) / 16, 1.6)));
}

// The plan. Round towers: [x, z, radius, wall height, roof height, base y].
const TOWERS = [
  [0, -0.5, 2.1, 22, 10, 0], // the great tower
  [-3.6, 1.2, 1.35, 16, 6.5, 0],
  [3.6, 1.0, 1.45, 17.5, 7, 0],
  [-2.4, -3.6, 1.2, 19, 6.5, 0],
  [2.6, -3.3, 1.3, 18, 6.5, 0],
  [-6.2, -0.8, 1.05, 14, 5, 0],
  [6.3, -0.6, 1.05, 14.5, 5, 0],
  [-8.6, 4.6, 1.6, 10.5, 5.5, 0], // front corners
  [8.6, 4.6, 1.6, 10.5, 5.5, 0],
  [-9, -4.8, 1.5, 12, 5.5, 0], // back corners
  [9, -4.8, 1.5, 12, 5.5, 0],
  [-11.2, 0, 1.15, 8.5, 4.2, 0],
  [11.2, 0, 1.15, 8.5, 4.2, 0],
  [-2, 4.6, 0.9, 10, 3.6, 0], // the gate's towers
  [2, 4.6, 0.9, 10, 3.6, 0],
  // Turrets perched high on the keep and walls.
  [-1.6, 1.6, 0.55, 3.5, 2.6, 13.5],
  [1.8, 1.4, 0.5, 3.2, 2.4, 14.2],
  [-4.9, 3.0, 0.45, 2.6, 2.0, 8.5],
  [5.0, 3.0, 0.45, 2.6, 2.0, 8.8],
  [0, 2.0, 0.6, 3.0, 2.8, 18.2]
];
// Square blocks: [x, z, width, depth, height] — the keep and the two halls.
const BLOCKS = [
  [0, -1, 7, 6, 13],
  [-5.5, -1.5, 5, 6.5, 9.5],
  [5.5, -1.5, 5, 6.5, 9.5]
];
// Curtain walls between the outer towers: [x1, z1, x2, z2, height].
const WALLS = [
  [-8.6, 4.6, -2, 4.6, 6.5],
  [2, 4.6, 8.6, 4.6, 6.5],
  [-8.6, 4.6, -11.2, 0, 6],
  [8.6, 4.6, 11.2, 0, 6],
  [-11.2, 0, -9, -4.8, 6],
  [11.2, 0, 9, -4.8, 6],
  [-9, -4.8, 9, -4.8, 6.5]
];

export function makeExterior() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x231a4a, 0.0085);
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const r = rng(2026);

  // --- The sky: a gradient dome, stars that twinkle, the moon and its glow, a few clouds.
  const skyMat = keep(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { moonDir: { value: new THREE.Vector3() } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 moonDir;
        void main(){
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 top = vec3(0.006, 0.005, 0.03);
          vec3 mid = vec3(0.035, 0.022, 0.11);
          vec3 hor = vec3(0.15, 0.07, 0.21);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, h));
          c = mix(c, top, smoothstep(0.25, 0.85, h));
          float m = max(dot(normalize(vDir), moonDir), 0.0);
          c += vec3(0.22, 0.2, 0.45) * pow(m, 24.0) + vec3(0.06, 0.04, 0.14) * pow(m, 5.0);
          gl_FragColor = vec4(c, 1.0);
        }`
    })
  );
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(150, 32, 16)), skyMat);
  scene.add(sky);

  const MOON = new THREE.Vector3(-8, 46, -95);
  skyMat.uniforms.moonDir.value.copy(MOON).normalize();

  {
    const n = 1100, pos = new Float32Array(n * 3), phase = new Float32Array(n), size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = r() * Math.PI * 2, v = 0.04 + Math.pow(r(), 0.7) * 0.96;
      const y = v, rr = Math.sqrt(1 - y * y);
      pos.set([Math.cos(u) * rr * 140, y * 140, Math.sin(u) * rr * 140], i * 3);
      phase[i] = r() * 6.283;
      size[i] = r() < 0.05 ? 3.2 + r() * 2 : 1.1 + r() * 1.6;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    var starMat = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 }, pr: { value: Math.min(devicePixelRatio, 1.75) } },
        vertexShader: `attribute float phase; attribute float size; uniform float time; uniform float pr; varying float vA;
          void main(){ vA = 0.55 + 0.45 * sin(time * (0.8 + fract(phase) * 1.7) + phase * 7.0);
            gl_PointSize = size * pr * (0.7 + 0.5 * vA); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.95, 1.1) * 1.4, a * vA); }`
      })
    );
    scene.add(new THREE.Points(g, starMat));
  }

  const moonTex = keep(
    canvasTexture(256, 256, (g) => {
      const rr = rng(3);
      const grad = g.createRadialGradient(118, 112, 10, 128, 128, 124);
      grad.addColorStop(0, '#fffbea');
      grad.addColorStop(0.8, '#f2ead6');
      grad.addColorStop(1, '#d9cfe8');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(128, 128, 124, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.clip();
      for (let i = 0; i < 26; i++) {
        const x = 30 + rr() * 196, y = 30 + rr() * 196, s = 6 + rr() * 26;
        g.fillStyle = `rgba(150,140,175,${0.12 + rr() * 0.2})`;
        g.beginPath();
        g.arc(x, y, s, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    })
  );
  const moon = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: moonTex, color: new THREE.Color(2.0, 1.95, 1.8), fog: false, depthWrite: false })));
  moon.position.copy(MOON);
  moon.scale.setScalar(24);
  scene.add(moon);
  const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: dotTexture(), color: new THREE.Color(0.55, 0.45, 0.95), opacity: 0.45, blending: THREE.AdditiveBlending, fog: false, depthWrite: false })));
  halo.position.copy(MOON).multiplyScalar(1.01);
  halo.scale.setScalar(58);
  scene.add(halo);

  // Soft noise for clouds and mist.
  const puff = keep(
    canvasTexture(256, 128, (g, w, h) => {
      const rr = rng(5);
      for (let i = 0; i < 70; i++) {
        const x = 30 + rr() * (w - 60), y = h * 0.5 + (rr() - 0.5) * h * 0.35, s = 14 + rr() * 34;
        const grad = g.createRadialGradient(x, y, 0, x, y, s);
        grad.addColorStop(0, 'rgba(255,255,255,0.22)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }
    })
  );
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: puff, color: new THREE.Color(0.16, 0.11, 0.3), opacity: 0.9, fog: false, depthWrite: false })));
    c.position.set(MOON.x - 40 + i * 26, MOON.y - 8 + (i % 2) * 14, MOON.z + 10);
    c.scale.set(50, 16, 1);
    c.userData.speed = 0.4 + i * 0.15;
    scene.add(c);
    clouds.push(c);
  }

  // --- Light: the moon from behind and above, a violet sky, a soft fill from where we stand.
  const moonLight = new THREE.DirectionalLight(0xb9c3ff, 2.4);
  moonLight.position.copy(MOON).normalize().multiplyScalar(50);
  scene.add(moonLight);
  scene.add(new THREE.HemisphereLight(0x7a64d8, 0x120c22, 1.1));
  const fill = new THREE.DirectionalLight(0x9a7cff, 0.9);
  fill.position.set(-30, 20, 40);
  scene.add(fill);
  // A warm glow under the gold window, and a sickly one in the courtyard.
  const hopeLight = new THREE.PointLight(0xffb45a, 6, 9, 2);
  scene.add(hopeLight);
  const curseLight = new THREE.PointLight(0x5dff9a, 10, 16, 2);
  curseLight.position.set(0, 7, 1);
  scene.add(curseLight);

  // --- The hill: a lathe, a little lumpy, dark blue-green, with rocks round the crag and pines down the slope.
  {
    const pts = [];
    for (let d = 0; d <= 160; d += d < 20 ? 0.75 : d < 60 ? 2 : 8) pts.push(new THREE.Vector2(d, hillY(d)));
    const g = keep(new THREE.LatheGeometry(pts, 72));
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
      if (d > 12.8) p.setY(i, p.getY(i) + (Math.sin(x * 0.7) * Math.cos(z * 0.6) + Math.sin(x * 0.23 + z * 0.31)) * 0.5 * Math.min(1, (d - 12.8) / 4));
      const k = Math.min(1, d / 40);
      const c = d < 12.8 ? [0.2, 0.19, 0.27] : [0.07 + 0.03 * k, 0.11 - 0.03 * k, 0.15 + 0.03 * k];
      col.set(c, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))));

    const rockGeo = keep(new THREE.DodecahedronGeometry(1, 0));
    const rocks = new THREE.InstancedMesh(rockGeo, keep(new THREE.MeshStandardMaterial({ color: 0x4a4560, roughness: 0.95, flatShading: true })), 70);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 12.2 + r() * 6;
      const sc = 0.6 + r() * 1.3;
      v.set(Math.cos(a) * d, hillY(d) - sc * 0.5, Math.sin(a) * d);
      q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
      s.set(sc * (0.8 + r() * 0.6), sc * (1 + r() * 1.2), sc * (0.8 + r() * 0.6));
      rocks.setMatrixAt(i, m.compose(v, q, s));
    }
    scene.add(rocks);

    // Pines: two stacked cones each.
    const tree = keep(new THREE.ConeGeometry(1, 2.4, 7, 1));
    const n = 160;
    const pines = new THREE.InstancedMesh(tree, keep(new THREE.MeshStandardMaterial({ color: 0x14243a, roughness: 1, flatShading: true })), n * 2);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = 16 + Math.pow(r(), 0.6) * 46;
      // Keep the front of the hill (the bridge's way) clear.
      if (Math.abs(Math.atan2(Math.cos(a), Math.sin(a))) < 0.18 && d < 30) continue;
      const sc = 0.8 + r() * 1.1, y = hillY(d);
      for (let j = 0; j < 2; j++) {
        v.set(Math.cos(a) * d, y + 1.1 * sc + j * 1.2 * sc, Math.sin(a) * d);
        s.set(sc * (1 - j * 0.3), sc * (1 - j * 0.15), sc * (1 - j * 0.3));
        pines.setMatrixAt(k++, m.compose(v, q.identity(), s));
      }
    }
    pines.count = k;
    scene.add(pines);
  }

  // --- The château.
  const stone = keep(stoneTexture());
  const slate = keep(slateTexture());
  const wallMat = keep(sizedMaterial({ map: stone, color: 0xd8d2ec, roughness: 0.9 }, { blockU: 3.2, blockV: 2.4, mode: 'cyl' }));
  const boxMat = keep(sizedMaterial({ map: stone, color: 0xd8d2ec, roughness: 0.9 }, { blockU: 3.2, blockV: 2.4, mode: 'box' }));
  const roofMat = keep(sizedMaterial({ map: slate, color: 0xb8c4ff, roughness: 0.55, metalness: 0.1 }, { blockU: 2.2, blockV: 1.6, mode: 'cone' }));
  const trimMat = keep(new THREE.MeshStandardMaterial({ color: 0x7c7698, roughness: 0.85 }));
  const goldMat = keep(new THREE.MeshStandardMaterial({ color: 0xe8c068, roughness: 0.3, metalness: 0.9, emissive: 0x3a2a08 }));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const towerBodies = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(1, 1, 1, 28, 1)), wallMat, TOWERS.length);
  const corbels = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(1, 0.9, 1, 28, 1)), trimMat, TOWERS.length * 2);
  const roofs = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(1, 1, 28, 1, true)), roofMat, TOWERS.length + 3);
  const finials = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(0.06, 1.4, 6)), goldMat, TOWERS.length);
  const balls = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.13, 10, 6)), goldMat, TOWERS.length);
  const windows = [];
  // A window on a round tower at angle a (0 = facing +z), its sill at height y.
  const inside = (p) => BLOCKS.some(([bx, bz, w, d, h]) => p.y < h + 0.2 && Math.abs(p.x - bx) < w / 2 + 0.05 && Math.abs(p.z - bz) < d / 2 + 0.05);
  const towerWindow = (t, a, y, big = 1) => {
    const [x, z, rad] = t;
    if (inside(new THREE.Vector3(x + Math.sin(a) * rad, y, z + Math.cos(a) * rad))) return;
    windows.push({ pos: new THREE.Vector3(x + Math.sin(a) * (rad + 0.02), y, z + Math.cos(a) * (rad + 0.02)), rot: a, scale: big * Math.min(1, 0.45 + rad * 0.35) });
  };
  TOWERS.forEach((t, i) => {
    const [x, z, rad, h, rh, y0] = t;
    towerBodies.setMatrixAt(i, m.compose(v.set(x, y0 + h / 2, z), q.identity(), s.set(rad, h, rad)));
    // A band of corbels below the roof, and a plinth.
    corbels.setMatrixAt(i * 2, m.compose(v.set(x, y0 + h - 0.35, z), q.identity(), s.set(rad * 1.12, 0.7, rad * 1.12)));
    corbels.setMatrixAt(i * 2 + 1, m.compose(v.set(x, y0 + (y0 > 0 ? -0.4 : 0.4), z), q.identity(), s.set(rad * (y0 > 0 ? 0.7 : 1.08), 0.8, rad * (y0 > 0 ? 0.7 : 1.08))));
    roofs.setMatrixAt(i, m.compose(v.set(x, y0 + h + rh / 2, z), q.identity(), s.set(rad * 1.22, rh, rad * 1.22)));
    finials.setMatrixAt(i, m.compose(v.set(x, y0 + h + rh + 0.6, z), q.identity(), s.set(1, 1, 1)));
    balls.setMatrixAt(i, m.compose(v.set(x, y0 + h + rh + 0.05, z), q.identity(), s.set(1, 1, 1)));
    // Windows round the side that faces the hill's front, a row every few metres.
    const levels = Math.max(1, Math.floor((h - 2) / 3.2));
    for (let L = 0; L < levels; L++) {
      const y = y0 + 1.6 + L * 3.2 + (i % 3) * 0.3;
      const count = rad > 1.3 ? 3 : rad > 0.7 ? 2 : 1;
      for (let k = 0; k < count; k++) towerWindow(t, (count === 1 ? 0 : -0.75 + (1.5 * k) / (count - 1)) + (L % 2) * 0.25 - 0.1, y);
    }
  });
  scene.add(towerBodies, corbels, roofs, finials, balls);

  // The keep and halls, with gabled slate roofs (a three-sided cone is a prism).
  const blocks = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), boxMat, BLOCKS.length + WALLS.length + 1);
  const gables = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1)), roofMat, BLOCKS.length);
  let bi = 0;
  BLOCKS.forEach(([x, z, w, d, h], i) => {
    blocks.setMatrixAt(bi++, m.compose(v.set(x, h / 2, z), q.identity(), s.set(w, h, d)));
    // A prism lying along x: its ridge up.
    q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    gables.setMatrixAt(i, m.compose(v.set(x, h + 1.1, z), q, s.set(d * 1.25, w + 0.4, 3.2)));
    q.identity();
    for (let row = 0; row < Math.floor((h - 2) / 3); row++)
      for (let c = 0; c < Math.max(2, Math.floor(w / 1.4)); c++) {
        const n = Math.max(2, Math.floor(w / 1.4));
        windows.push({ pos: new THREE.Vector3(x - w / 2 + (w * (c + 0.5)) / n, 2 + row * 3, z + d / 2 + 0.02), rot: 0, scale: 1 });
      }
  });
  // The walls, with battlements on top.
  const merlonList = [];
  WALLS.forEach(([x1, z1, x2, z2, h]) => {
    const len = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a - Math.PI / 2);
    blocks.setMatrixAt(bi++, m.compose(v.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2), q, s.set(len, h, 1)));
    const n = Math.floor(len / 0.9);
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      merlonList.push([x1 + (x2 - x1) * f, h + 0.3, z1 + (z2 - z1) * f, a]);
    }
  });
  // The gatehouse over the bridge.
  blocks.setMatrixAt(bi++, m.compose(v.set(0, 4.2, 4.7), q.identity(), s.set(3.2, 8.4, 1.6)));
  blocks.count = bi;
  merlonList.push(...[-1, -0.33, 0.33, 1].map((dx) => [dx * 1.3, 8.7, 4.7, Math.PI / 2]));
  const merlons = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.5, 0.6, 1.1)), boxMat, merlonList.length);
  merlonList.forEach(([x, y, z, a], i) => merlons.setMatrixAt(i, m.compose(v.set(x, y, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), s.set(1, 1, 1))));
  scene.add(blocks, gables, merlons);

  // The gate: a dark arch, a portcullis, and the bridge across the cliff edge on arches.
  const archDark = keep(new THREE.MeshBasicMaterial({ color: 0x07050f }));
  const gate = new THREE.Mesh(keep(archGeometry(2, 3.4)), archDark);
  gate.position.set(0, 0, 5.52);
  scene.add(gate);
  const bars = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.06, 3, 0.06)), goldMat, 7);
  for (let k = 0; k < 7; k++) bars.setMatrixAt(k, m.compose(v.set(-0.75 + k * 0.25, 1.2 + 0.3, 5.56), q.identity(), s.set(1, 1, 1)));
  scene.add(bars);
  const bridge = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), boxMat, 4);
  bridge.setMatrixAt(0, m.compose(v.set(0, -0.3, 10.5), q.identity(), s.set(2.6, 0.6, 11)));
  bridge.setMatrixAt(1, m.compose(v.set(0, -2.6, 9.5), q.identity(), s.set(1.6, 4, 1.4)));
  bridge.setMatrixAt(2, m.compose(v.set(0, -3.6, 13.5), q.identity(), s.set(1.6, 6, 1.4)));
  bridge.setMatrixAt(3, m.compose(v.set(0, 0.25, 10.5), q.identity(), s.set(2.7, 0.15, 11)));
  scene.add(bridge);
  // Lanterns along the bridge (cursed: green).
  const lanternMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.6, 1.3) }));
  const lanterns = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.14, 8, 6)), lanternMat, 6);
  for (let k = 0; k < 6; k++) lanterns.setMatrixAt(k, m.compose(v.set(k % 2 ? 1.25 : -1.25, 1.1, 6.5 + Math.floor(k / 2) * 3.5), q.identity(), s.set(1, 1, 1)));
  scene.add(lanterns);
  const posts = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.04, 0.05, 1, 5)), trimMat, 6);
  for (let k = 0; k < 6; k++) posts.setMatrixAt(k, m.compose(v.set(k % 2 ? 1.25 : -1.25, 0.5, 6.5 + Math.floor(k / 2) * 3.5), q.identity(), s.set(1, 1, 1)));
  scene.add(posts);

  // The windows: one instanced arch, each lit its own colour. Dim glass, cursed green or violet, or gold.
  const winMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const winMesh = new THREE.InstancedMesh(keep(archGeometry(0.42, 0.85)), winMat, windows.length);
  const DIM = new THREE.Color(0.05, 0.05, 0.12), GREEN = new THREE.Color(0.55, 2.4, 1.15), VIOLET = new THREE.Color(1.7, 0.55, 2.6), GOLD = new THREE.Color(3.2, 1.9, 0.6);
  const curse = windows.map(() => (r() < 0.5 ? (r() < 0.55 ? GREEN : VIOLET) : DIM));
  windows.forEach((w, i) => winMesh.setMatrixAt(i, m.compose(w.pos, q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.rot), s.setScalar(w.scale))));
  // The gold window: high on the great tower, facing us. The others turn gold in a fixed order as rooms are won.
  const hope = windows.findIndex((w) => w.pos.y > 14 && w.pos.y < 20 && Math.abs(w.pos.x) < 1.5 && w.pos.z > 0.5);
  const order = windows.map((_, i) => i).filter((i) => i !== hope).sort(() => r() - 0.5);
  hopeLight.position.copy(windows[hope].pos).add(new THREE.Vector3(0, 0.4, 1));
  // Frames round each window.
  const frames = new THREE.InstancedMesh(keep(archGeometry(0.58, 1.0)), trimMat, windows.length);
  windows.forEach((w, i) => {
    v.copy(w.pos).add(new THREE.Vector3(Math.sin(w.rot), 0, Math.cos(w.rot)).multiplyScalar(-0.01));
    v.y -= 0.08 * w.scale;
    frames.setMatrixAt(i, m.compose(v, q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.rot), s.setScalar(w.scale)));
  });
  scene.add(frames, winMesh);
  let restored = -1;
  function setRestored(f) {
    f = Math.max(0, Math.min(1, f));
    if (f === restored) return;
    restored = f;
    const lit = Math.round(f * order.length);
    windows.forEach((_, i) => winMesh.setColorAt(i, curse[i]));
    winMesh.setColorAt(hope, GOLD);
    for (let k = 0; k < lit; k++) winMesh.setColorAt(order[k], GOLD);
    winMesh.instanceColor.needsUpdate = true;
    curseLight.intensity = 10 * (1 - f);
    lanternMat.color.setRGB(0.6 + f * 2.4, 2.6 - f * 0.9, 1.3 - f * 0.8);
  }
  setRestored(0);

  // Flags: pennants on the tallest roofs, rippling.
  const flagGeo = keep(new THREE.PlaneGeometry(1.4, 0.5, 8, 1).translate(0.7, 0, 0));
  const flagMat = keep(new THREE.MeshStandardMaterial({ color: 0xc23a7a, side: THREE.DoubleSide, roughness: 0.7, emissive: 0x2a0418 }));
  const flags = [];
  for (const i of [0, 1, 2, 3, 4, 7, 8]) {
    const [x, z, , h, rh, y0] = TOWERS[i];
    const f = new THREE.Mesh(flagGeo.clone(), flagMat);
    disposables.push(f.geometry);
    f.position.set(x, y0 + h + rh + 1.0, z);
    f.userData.base = f.geometry.attributes.position.array.slice();
    f.userData.phase = i;
    scene.add(f);
    flags.push(f);
  }

  // --- Mist round the hill, drifting.
  const mists = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3, d = 15 + r() * 14;
    const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: puff, color: new THREE.Color(0.42, 0.36, 0.78), opacity: 0.22 + r() * 0.18, fog: false, depthWrite: false })));
    sp.position.set(Math.cos(a) * d, hillY(d) + 1.5 + r() * 2.5, Math.sin(a) * d);
    sp.scale.set(26 + r() * 14, 7 + r() * 4, 1);
    sp.userData = { a, d, speed: (0.008 + r() * 0.01) * (r() < 0.5 ? 1 : -1), y: sp.position.y };
    scene.add(sp);
    mists.push(sp);
  }

  // --- Wisps: cursed lights drifting round the walls.
  const W = 46;
  const wispPos = new Float32Array(W * 3), wispSeed = [];
  for (let i = 0; i < W; i++) wispSeed.push({ a: r() * 6.283, d: 4 + r() * 10, y: 1 + r() * 14, sp: 0.1 + r() * 0.25, ph: r() * 6.283 });
  const wispGeo = keep(new THREE.BufferGeometry());
  wispGeo.setAttribute('position', new THREE.BufferAttribute(wispPos, 3));
  const wispMat = keep(new THREE.PointsMaterial({ map: dotTexture(), color: new THREE.Color(0.7, 2.6, 1.6), size: 0.45, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(new THREE.Points(wispGeo, wispMat));

  // --- Bats: a body and two wings, circling the towers.
  const batMat = keep(new THREE.MeshBasicMaterial({ color: 0x07050c, side: THREE.DoubleSide }));
  const wingGeo = keep(new THREE.BufferGeometry());
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.12, 0, 0, -0.12, 0.55, 0.05, -0.05, 0, 0, -0.12, 0.55, 0.05, -0.05, 0.4, -0.08, 0.05]), 3));
  const bats = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    const body = new THREE.Mesh(keep(new THREE.SphereGeometry(0.1, 6, 4)), batMat);
    const L = new THREE.Mesh(wingGeo, batMat), R = new THREE.Mesh(wingGeo, batMat);
    R.scale.x = -1;
    b.add(body, L, R);
    b.userData = { L, R, a: r() * 6.283, d: 7 + r() * 9, y: 13 + r() * 10, sp: (0.25 + r() * 0.2) * (r() < 0.5 ? 1 : -1), ph: r() * 6 };
    b.scale.setScalar(1.6);
    scene.add(b);
    bats.push(b);
  }

  // --- The camera: low on the slope, looking up, swaying slowly. The UI covers the left of the screen, so the view is
  // shifted to put the château centre-right (setViewOffset; cleared again by dispose()).
  const CAM = { radius: 50, height: 5.5, az: -0.32, look: new THREE.Vector3(0, 12.5, 0), shift: 0.14 };
  let t = 0, cam = null;
  function update(dt, camera) {
    t += dt;
    cam = camera;
    starMat.uniforms.time.value = t;
    if (camera) {
      const az = CAM.az + Math.sin(t * 0.045) * 0.13;
      camera.position.set(Math.sin(az) * CAM.radius, CAM.height + Math.sin(t * 0.07) * 0.8, Math.cos(az) * CAM.radius);
      camera.lookAt(CAM.look);
      const wide = camera.aspect > 1.15;
      const W2 = 1000 * camera.aspect, H = 1000;
      if (wide) camera.setViewOffset(W2, H, -CAM.shift * W2, 0, W2, H);
      else if (camera.view?.enabled) camera.clearViewOffset();
    }
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > MOON.x + 70) c.position.x = MOON.x - 70;
    }
    for (const sp of mists) {
      const u = sp.userData;
      u.a += u.speed * dt;
      sp.position.set(Math.cos(u.a) * u.d, u.y + Math.sin(t * 0.3 + u.a * 3) * 0.4, Math.sin(u.a) * u.d);
    }
    for (let i = 0; i < W; i++) {
      const w = wispSeed[i];
      w.a += w.sp * dt * 0.3;
      wispPos.set([Math.cos(w.a) * w.d, w.y + Math.sin(t * w.sp * 3 + w.ph) * 0.8, Math.sin(w.a) * w.d + 1], i * 3);
    }
    wispGeo.attributes.position.needsUpdate = true;
    wispMat.opacity = 0.75 * (1 - (restored > 0 ? restored : 0) * 0.85);
    for (const b of bats) {
      const u = b.userData;
      u.a += u.sp * dt;
      b.position.set(Math.cos(u.a) * u.d, u.y + Math.sin(t * 1.3 + u.ph) * 0.8, Math.sin(u.a) * u.d);
      b.rotation.y = -u.a + (u.sp > 0 ? 0 : Math.PI);
      const flap = Math.sin(t * 16 + u.ph) * 0.9;
      u.L.rotation.z = flap;
      u.R.rotation.z = -flap;
    }
    for (const f of flags) {
      const p = f.geometry.attributes.position, base = f.userData.base;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.setZ(i, Math.sin(x * 3.5 - t * 4 + f.userData.phase) * 0.12 * x);
        p.setY(i, base[i * 3 + 1] * (1 - x * 0.35));
      }
      p.needsUpdate = true;
    }
    curseLight.intensity = (10 + Math.sin(t * 2.3) * 2) * (1 - Math.max(0, restored));
  }

  function dispose() {
    if (cam?.view?.enabled) cam.clearViewOffset();
    for (const d of disposables) d.dispose?.();
    scene.clear();
  }

  return { scene, update, setRestored, dispose, framing: CAM, windowCount: windows.length };
}
