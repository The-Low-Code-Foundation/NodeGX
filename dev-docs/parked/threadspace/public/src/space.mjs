// Space round the ship: a nebula baked once per sector into a cube map (the scene's background, drawn at infinity,
// so it has no edges, corners or poles), stars as real points, a sun the light comes from, a planet or a dead star,
// space dust streaming past to show you are moving, and the tractor's beams.
//
// s1 painted the nebula and the stars into one 2048 × 1024 picture wrapped on a sphere. Up close that showed its
// texels as a faint lattice, and the sphere's poles as a fan of lines meeting at a point: the "inside a cube" look.
// Now the nebula is computed from the direction alone (noise on the unit sphere), so it has nowhere to show a seam.

import * as THREE from 'three';

const SKY_R = 4800; // stars, sun and planets: inside the camera's far plane (20 km), moved with the camera
const DUST_BOX = 700;

/** Each sector's sky: two cloud colours, a hot accent, the glow of the galaxy's band, the band's tilt, a seed. */
const SKIES = {
  haven: { a: '#3b2a8f', b: '#1e5bb5', c: '#c4508e', glow: '#3a3550', band: [0.25, 1, 0.2], seed: 3.1, gain: 1.6, sun: '#fff1dc', sunDir: [0.6, 0.8, 0.3], moon: true, cinder: false },
  drift: { a: '#145e66', b: '#6a4a1c', c: '#3aa37a', glow: '#2f3a38', band: [-0.4, 1, 0.5], seed: 7.7, gain: 1.7, sun: '#ffe6c0', sunDir: [-0.5, 0.6, -0.6], moon: true, cinder: false },
  cinder: { a: '#7a1e10', b: '#b8541a', c: '#5a1438', glow: '#3a2420', band: [0.1, 1, -0.3], seed: 12.4, gain: 1.7, sun: '#ff9a70', sunDir: [0.37, 0.25, -0.89], moon: false, cinder: true }
};

export class Space {
  constructor(scene, renderer, sun = null) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = sun;
    this.sky = new THREE.Group();
    scene.add(this.sky);
    this.stars = starfield();
    this.sky.add(this.stars);
    this.sunDisc = sunSprite();
    this.sky.add(this.sunDisc);
    this.moon = forestMoon();
    this.sky.add(this.moon);
    this.cinder = cinderStar();
    this.sky.add(this.cinder);
    this.dust = dustField();
    scene.add(this.dust);
    this.beamLines = beamPool();
    scene.add(this.beamLines);
    // Software GL (the headless drives) bakes a small sky; a real GPU bakes a sharp one.
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    this.bakeSize = /swiftshader|llvmpipe|software/i.test(name) ? 128 : 1024;
    this.cube = new THREE.WebGLCubeRenderTarget(this.bakeSize, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.cubeCam = new THREE.CubeCamera(1, 1000, this.cube);
    this.bakeScene = new THREE.Scene();
    this.nebula = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), nebulaMaterial());
    this.bakeScene.add(this.nebula);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.setSector('haven');
  }

  /** Bakes the sector's sky into the cube map, points the sun, and puts up its planet or its dead star. */
  setSector(id) {
    const S = SKIES[id] ?? SKIES.haven;
    if (this.sectorId === id) return;
    this.sectorId = id;
    const u = this.nebula.material.uniforms;
    u.uA.value.set(S.a);
    u.uB.value.set(S.b);
    u.uC.value.set(S.c);
    u.uGlow.value.set(S.glow);
    u.uBand.value.set(...S.band).normalize();
    u.uSeed.value.set(S.seed, S.seed * 1.7, S.seed * 0.6);
    u.uGain.value = S.gain;
    this.cubeCam.update(this.renderer, this.bakeScene);
    this.scene.background = this.cube.texture;
    // The ships' metal picks the nebula's colour up: a blurred copy of it is the scene's environment.
    this.env?.dispose();
    this.env = this.pmrem.fromCubemap(this.cube.texture);
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = 0.9;
    const dir = new THREE.Vector3(...S.sunDir).normalize();
    this.sunDisc.position.copy(dir).multiplyScalar(SKY_R * 0.95);
    this.sunDisc.material.color.set(S.sun);
    this.sunDisc.visible = !S.cinder;
    if (this.sun) {
      this.sun.position.copy(dir);
      this.sun.color.set(S.sun);
    }
    this.moon.visible = S.moon;
    this.cinder.visible = S.cinder;
  }

  frame(camera, dt) {
    this.follow(camera);
    // Dust in a box round the camera: a mote that leaves the box comes back at the far side.
    const pos = this.dust.geometry.attributes.position;
    const half = DUST_BOX / 2;
    const c = camera.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (z - c.z > half) z -= DUST_BOX;
      if (z - c.z < -half) z += DUST_BOX;
      if (x - c.x > half) x -= DUST_BOX;
      if (x - c.x < -half) x += DUST_BOX;
      if (y - c.y > half) y -= DUST_BOX;
      if (y - c.y < -half) y += DUST_BOX;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  /** The far things ride with the camera, so they never come nearer. Called after the camera is placed. */
  follow(camera) {
    this.sky.position.copy(camera.position);
    this.stars.material.uniforms.uScale.value = this.renderer.getPixelRatio();
  }

  /** The tractor's beams, from the Kestrel to each pod she is pulling in. */
  beams(ship, pods) {
    const pos = this.beamLines.geometry.attributes.position;
    let n = 0;
    if (ship) {
      for (const p of pods.slice(0, BEAMS)) {
        pos.setXYZ(n * 2, ship.position.x, ship.position.y - 4, ship.position.z);
        pos.setXYZ(n * 2 + 1, p.obj.position.x, p.obj.position.y, p.obj.position.z);
        n++;
      }
    }
    this.beamLines.geometry.setDrawRange(0, n * 2);
    this.beamLines.visible = n > 0;
    pos.needsUpdate = true;
    this.beamLines.geometry.computeBoundingSphere();
  }
}

const BEAMS = 12;

function beamPool() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BEAMS * 6), 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.frustumCulled = false;
  l.visible = false;
  return l;
}

/** The nebula, as a function of direction: domain-warped noise, brightest along the galaxy's band, cut by dark lanes. */
function nebulaMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uA: { value: new THREE.Color() },
      uB: { value: new THREE.Color() },
      uC: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uBand: { value: new THREE.Vector3(0, 1, 0) },
      uSeed: { value: new THREE.Vector3() },
      uGain: { value: 1 }
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uA, uB, uC, uGlow, uBand, uSeed;
      uniform float uGain;
      float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
          f.z);
      }
      float fbm(vec3 p) {
        // A rotation between octaves, so the lattice of the value noise never lines up into a visible grid.
        mat3 R = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
        float s = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          s += a * noise(p);
          p = R * p * 2.03;
          a *= 0.5;
        }
        return s;
      }
      void main() {
        vec3 d = normalize(vDir);
        float lat = dot(d, uBand);
        float band = exp(-lat * lat / 0.06);
        vec3 q = d * 1.7 + uSeed;
        vec3 w = vec3(fbm(q), fbm(q + vec3(5.2, 1.3, 2.8)), fbm(q + vec3(1.7, 9.2, 4.1)));
        float n = fbm(d * 2.6 + w * 1.8 + uSeed);
        float cloud = smoothstep(0.40, 0.82, n) * (0.15 + 0.85 * band);
        float hue = smoothstep(0.30, 0.72, fbm(d * 1.9 + w + uSeed.zxy));
        vec3 col = mix(uA, uB, hue) * cloud * 0.09;
        col += uC * pow(smoothstep(0.62, 0.92, n), 2.0) * band * 0.05;
        float lanes = smoothstep(0.48, 0.66, fbm(d * 5.5 + w * 0.9 + uSeed.yzx));
        col *= 1.0 - 0.8 * lanes * band;
        // The band's own glow: the stars too far and too many to see one by one.
        col += uGlow * band * (0.35 + 0.65 * fbm(d * 11.0 + uSeed)) * 0.05 * (1.0 - 0.6 * lanes);
        gl_FragColor = vec4(col * uGain, 1.0);
      }`
  });
}

/** Stars: many faint, a few bright, crowding toward the galaxy's band; round, soft, sized in screen pixels. */
function starfield() {
  const rand = mulberry(11);
  const n = 7000;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const tints = [[1, 1, 1], [0.78, 0.86, 1], [1, 0.93, 0.78], [1, 0.82, 0.74], [0.85, 0.9, 1]];
  const band = new THREE.Vector3(0.25, 1, 0.2).normalize();
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    // Half of them anywhere, half pulled toward the band's plane.
    const u = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    v.set(s * Math.cos(t), u, s * Math.sin(t));
    if (i % 2) v.addScaledVector(band, -v.dot(band) * (0.75 + rand() * 0.25)).normalize();
    pos.set([v.x * SKY_R, v.y * SKY_R, v.z * SKY_R], i * 3);
    const tint = tints[Math.floor(rand() * tints.length)];
    const m = Math.pow(rand(), 6); // the magnitude: mostly faint
    const b = 0.18 + 0.82 * m;
    col.set([tint[0] * b, tint[1] * b, tint[2] * b], i * 3);
    size[i] = 1.6 + 4.2 * Math.pow(m, 1.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const p = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        attribute float size;
        attribute vec3 color;
        uniform float uScale;
        varying vec3 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <logdepthbuf_pars_fragment>
        varying vec3 vColor;
        void main() {
          #include <logdepthbuf_fragment>
          vec2 c = gl_PointCoord - 0.5;
          float r2 = dot(c, c) * 4.0;
          float a = exp(-r2 * 5.0);
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor * a, 1.0);
        }`
    })
  );
  p.frustumCulled = false;
  p.renderOrder = -9;
  return p;
}

/** The sun the light comes from: a white-hot disc with a soft glow round it. */
function sunSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.07, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,245,225,0.55)');
  grad.addColorStop(0.35, 'rgba(255,220,180,0.12)');
  grad.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.setScalar(1400);
  s.renderOrder = -8;
  return s;
}

/** A canvas texture of w × h painted by `paint(g, rand)`. */
function painted(w, h, seed, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), mulberry(seed), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A forest moon: deep greens, a few lakes, swirls of white cloud, and a thin blue atmosphere. */
function forestMoon() {
  const group = new THREE.Group();
  const tex = painted(1024, 512, 21, (g, rand, w, h) => {
    g.fillStyle = '#2c5530';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = rand() * w, y = rand() * h, r = 4 + rand() * 40;
      const shade = rand();
      g.fillStyle = shade < 0.45 ? 'rgba(24,62,30,0.5)' : shade < 0.85 ? 'rgba(70,110,52,0.45)' : 'rgba(40,80,110,0.55)';
      g.beginPath();
      g.ellipse(x, y, r * 1.6, r, rand() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 160; i++) {
      const x = rand() * w, y = h * 0.1 + rand() * h * 0.8;
      g.fillStyle = `rgba(255,255,255,${0.12 + rand() * 0.3})`;
      g.beginPath();
      g.ellipse(x, y, 20 + rand() * 90, 4 + rand() * 12, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
      g.fill();
    }
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(820, 64, 32), new THREE.MeshLambertMaterial({ map: tex, fog: false }));
  group.add(moon);
  const air = new THREE.Mesh(
    new THREE.SphereGeometry(860, 64, 32),
    new THREE.MeshBasicMaterial({ color: '#7fb6ff', transparent: true, opacity: 0.12, side: THREE.BackSide, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  group.add(air);
  group.position.set(-2100, -640, -3200);
  group.rotation.set(0.3, 0.5, 0.2);
  return group;
}

/** A cinder star: a dead red dwarf, dim and huge, with a glow round it. */
function cinderStar() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.MeshBasicMaterial({ color: '#8a2a1a', fog: false, toneMapped: false }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.18, side: THREE.BackSide, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(halo);
  g.position.set(1550, 870, -3560);
  return g;
}

function dustField() {
  const rand = mulberry(5);
  const n = 1400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = (rand() - 0.5) * DUST_BOX;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, color: '#a9b8ff', transparent: true, opacity: 0.5, depthWrite: false }));
  p.frustumCulled = false;
  return p;
}

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
