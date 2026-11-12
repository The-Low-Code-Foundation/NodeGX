// The magic you can see: spell bolts with a trail, sparkle bursts, healing rings, floating numbers and a camera shake;
// the shock ring where a spell lands, the rune ring where you tap the floor, and the magic circle under her feet while
// she gathers a spell (`channel`). One `Fx` per scene; call `update(dt)` every frame. Bursts reuse a pool of
// particles, so nothing is allocated mid-fight.
import * as THREE from 'three';
import { dotTexture, runeTexture, glow, canvasTexture } from './look.mjs';

// A thin bright ring with soft edges, for shock waves.
let ringTex;
function ringTexture() {
  return (ringTex ??= canvasTexture(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.8, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  }));
}
const additive = (map, colour, extra = {}) => new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, ...extra });

const POOL = 900;

export class Fx {
  constructor(scene, camera, overlay) {
    this.scene = scene;
    this.camera = camera;
    this.overlay = overlay; // a DOM layer over the canvas for the numbers
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(POOL * 3);
    this.col = new Float32Array(POOL * 3);
    this.vel = new Float32Array(POOL * 3);
    this.life = new Float32Array(POOL);
    this.max = new Float32Array(POOL).fill(1);
    this.size = new Float32Array(POOL);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    // Points with a size per particle (sizes shrink as they fade).
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: dotTexture() }, scale: { value: 300 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor;
        void main() { vColor = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vColor;
        void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vColor * 2.2, t.a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.next = 0;
    this.live = [];
    this.light = new THREE.PointLight(0xffffff, 0, 8, 1.6);
    scene.add(this.light);
    this.lightLeft = 0;
    this.shakeLeft = 0;
    this.shakeAmp = 0;
    // The magic circle under her feet, and the rune ring where a tap sends her.
    this.circle = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), additive(runeTexture(), new THREE.Color(0xc9a6ff).multiplyScalar(2)));
    this.circle.renderOrder = 3;
    this.circle.visible = false;
    scene.add(this.circle);
    this.circleLevel = 0;
    this.mark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), additive(runeTexture(), new THREE.Color(0xffe28a).multiplyScalar(1.8)));
    this.mark.renderOrder = 3;
    this.mark.visible = false;
    scene.add(this.mark);
    this.markAge = 9;
  }

  // Where a tap sends her: a rune ring that springs open on the floor and fades.
  marker(p) {
    this.mark.position.set(p.x, 0.04, p.z);
    this.mark.visible = true;
    this.markAge = 0;
    this.spray(p.clone().setY(0.05), { n: 14, colour: [0xffe28a, 0xffffff], speed: 0.9, life: 0.5, size: 0.08, up: 0.5 });
  }

  // The magic circle under her while she gathers a spell: `level` 0 (none) to 1 (casting). Call every frame.
  channel(p, level, dt) {
    this.circleLevel += (level - this.circleLevel) * Math.min(1, dt * 6);
    const l = this.circleLevel;
    this.circle.visible = l > 0.01;
    if (!this.circle.visible) return;
    this.circle.position.set(p.x, 0.035, p.z);
    this.circle.rotation.y += dt * (0.6 + l * 2.4);
    this.circle.scale.setScalar(1.5 + l * 0.6);
    this.circle.material.opacity = Math.min(1, l * 1.4);
    // Motes rising from its rim, more as the spell gathers.
    if (Math.random() < l * 0.9) {
      const a = Math.random() * Math.PI * 2, r = 0.75 + l * 0.3;
      this.spray(new THREE.Vector3(p.x + Math.cos(a) * r, 0.08, p.z + Math.sin(a) * r), { n: 1, colour: [0xc9a6ff, 0xffffff, 0xffd6f6], speed: 0.1, life: 1.1, size: 0.08, up: 1.2 });
    }
  }

  // A ring of light bursting out from p, facing the camera (where a spell lands).
  shock(p, colour = 0xffffff, size = 2.2, time = 0.45) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), color: new THREE.Color(colour).multiplyScalar(2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    m.position.copy(p);
    this.scene.add(m);
    const halo = glow(colour, size * 0.9, 2);
    halo.position.copy(p);
    this.scene.add(halo);
    let t = 0;
    this.live.push((dt) => {
      t += dt / time;
      const k = 1 - Math.pow(1 - Math.min(1, t), 3);
      m.scale.setScalar(0.2 + k * size);
      m.material.opacity = Math.max(0, 1 - t);
      halo.material.opacity = Math.max(0, 1 - t * 1.6);
      if (t >= 1) {
        m.removeFromParent();
        m.material.dispose();
        halo.removeFromParent();
        halo.material.dispose();
        return false;
      }
      return true;
    });
  }

  // n particles at p, flying out at `speed`, of `colour` (or a list to pick from), lasting `life` seconds.
  spray(p, { n = 40, colour = 0xffffff, speed = 2, life = 0.9, size = 0.12, up = 0.5, gravity = 0, spread = 1 } = {}) {
    const cols = [colour].flat().map((c) => new THREE.Color(c));
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % POOL;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const sp = speed * (0.4 + Math.random() * 0.6);
      this.pos.set([p.x + (Math.random() - 0.5) * 0.1 * spread, p.y + (Math.random() - 0.5) * 0.1 * spread, p.z + (Math.random() - 0.5) * 0.1 * spread], i * 3);
      this.vel.set([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp + up, Math.sin(ph) * Math.sin(th) * sp], i * 3);
      const c = cols[k % cols.length];
      this.col.set([c.r, c.g, c.b], i * 3);
      this.life[i] = this.max[i] = life * (0.6 + Math.random() * 0.6);
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.gravity = gravity;
    }
  }

  flash(p, colour, intensity = 12, time = 0.35) {
    this.light.position.copy(p);
    this.light.color.set(colour);
    this.light.intensity = intensity;
    this.lightMax = intensity;
    this.lightLeft = this.lightTime = time;
  }

  shake(amount = 0.08, time = 0.35) {
    this.shakeAmp = amount;
    this.shakeLeft = this.shakeTime = time;
  }

  // A bolt of light from `from` to a target (a Vector3, or an Object3D read each frame), arcing a little, leaving a
  // trail. Resolves when it arrives, after its burst.
  bolt(from, to, { colour = 0xc9a6ff, trail = [0xffffff, 0xffd6f6, 0xb9a3ff], time = 0.55, size = 0.16, arc = 0.6 } = {}) {
    const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.5, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(3), toneMapped: false }));
    // Its light and its head grow as it leaves her hand: at full size by her face, they washed her face out white.
    const light = new THREE.PointLight(colour, 0, 5, 1.6);
    core.add(light);
    // A comet's head: a big soft glow and a star that spins.
    core.add(glow(colour, size * 6, 1.3));
    const star = glow(0xffffff, size * 3.2, 2.4);
    core.add(star);
    this.scene.add(core);
    const start = from.clone();
    const target = () => (to.isObject3D ? to.getWorldPosition(new THREE.Vector3()) : to);
    return new Promise((resolve) => {
      let t = 0;
      this.live.push((dt) => {
        t = Math.min(1, t + dt / time);
        const end = target();
        const p = start.clone().lerp(end, t);
        p.y += Math.sin(t * Math.PI) * arc;
        core.position.copy(p);
        const away = THREE.MathUtils.smoothstep(t, 0.05, 0.35);
        light.intensity = 6 * away;
        core.scale.setScalar((0.25 + 0.75 * away) * (1 + Math.sin(t * 30) * 0.15));
        star.material.rotation += dt * 9;
        this.spray(p, { n: away > 0.5 ? 7 : 2, colour: trail, speed: 0.5, life: 0.6, size: size * 0.75, up: 0.1 });
        if (t >= 1) {
          core.removeFromParent();
          core.geometry.dispose();
          core.material.dispose();
          core.traverse((o) => o.isSprite && o.material.dispose());
          this.spray(end, { n: 90, colour: trail, speed: 3.4, life: 0.9, size: size * 0.9, up: 0.6 });
          this.shock(end, colour, size * 14);
          this.flash(end, colour, 18, 0.4);
          resolve();
          return false;
        }
        return true;
      });
    });
  }

  // A ring of rising sparkles round her feet (healing, drinking a potion, a new item).
  rise(p, colour = [0xffb3d9, 0xffffff, 0xffe28a], n = 60) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      this.spray(new THREE.Vector3(p.x + Math.cos(a) * 0.5, p.y + 0.1, p.z + Math.sin(a) * 0.5), { n: 1, colour, speed: 0.2, life: 1.4, size: 0.1, up: 1.4 });
    }
  }

  // A number (or a word) that pops up at a world position and floats away. `kind`: hit, heal, miss, word.
  number(p, text, kind = 'hit') {
    if (!this.overlay) return;
    const el = document.createElement('div');
    el.className = `pop pop-${kind}`;
    el.textContent = text;
    this.overlay.appendChild(el);
    const at = p.clone();
    let t = 0;
    this.live.push((dt) => {
      t += dt;
      const v = at.clone().add(new THREE.Vector3(0, t * 0.5, 0)).project(this.camera);
      const w = this.overlay.clientWidth, h = this.overlay.clientHeight;
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%) scale(${t < 0.15 ? 0.6 + t * 4 : 1.2 - Math.min(0.2, t * 0.1)})`;
      el.style.opacity = String(t < 1.1 ? 1 : Math.max(0, 1 - (t - 1.1) * 2.5));
      if (t > 1.5) {
        el.remove();
        return false;
      }
      return true;
    });
  }

  update(dt, camera = this.camera) {
    const g = this.gravity ?? 0;
    for (let i = 0; i < POOL; i++) {
      if (this.life[i] <= 0) {
        if (this.size[i] !== 0) this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k + 1] -= g * dt;
      this.vel[k] *= 0.96;
      this.vel[k + 1] *= 0.96;
      this.vel[k + 2] *= 0.96;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const f = Math.max(0, this.life[i] / this.max[i]);
      this.size[i] *= f > 0.01 ? 0.985 : 0;
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = true;
    // A callback may start another (a bolt's landing starts its shock ring): those land in a fresh list, so they are
    // kept. Filtering `this.live` in place dropped them, and the ring and its glow stayed in the room for good.
    const running = this.live;
    this.live = [];
    this.live = running.filter((fn) => fn(dt) !== false).concat(this.live);
    if (this.mark.visible) {
      this.markAge += dt;
      const k = Math.min(1, this.markAge / 0.6);
      this.mark.scale.setScalar(0.3 + (1 - Math.pow(1 - k, 3)) * 0.9);
      this.mark.rotation.y += dt * 2;
      this.mark.material.opacity = 1 - k;
      this.mark.visible = k < 1;
    }
    if (this.lightLeft > 0) {
      this.lightLeft -= dt;
      this.light.intensity = this.lightMax * Math.max(0, this.lightLeft / this.lightTime);
    } else this.light.intensity = 0;
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      const s = this.shakeAmp * (this.shakeLeft / this.shakeTime);
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
  }

  dispose() {
    this.circle.removeFromParent();
    this.mark.removeFromParent();
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.light.removeFromParent();
    this.live = [];
    if (this.overlay) this.overlay.querySelectorAll('.pop').forEach((e) => e.remove());
  }
}
