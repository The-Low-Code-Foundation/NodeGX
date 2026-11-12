// The look every scene shares: one renderer, ACES tone mapping, and a bloom that makes magic, candles and creatures'
// eyes glow. Anything meant to glow uses an emissive colour at intensity 2 or more (the bloom starts at 1.3, so a white
// dress or a cream tablecloth under the won rooms' sun and chandelier stays matt).
// `quality` is 'high' (bloom, shadows, full sharpness) or 'low' (neither, sharpness 1): the family's tablets are slow.
// Every place shares one environment map (a soft studio room), so gold, marble and glass have something to reflect;
// a place sets how strong it is (`scene.environmentIntensity`), dim in the dark and brighter once won. On 'high' the
// picture is finished with a vignette and a gentle lift of the colours (the grade pass).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// The last pass: a vignette that pulls the eye to the middle, a touch more saturation, and a warm/cool split (shadows
// a little blue, highlights a little gold) that makes the candles feel warm and the dark feel cold.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.38 }, saturation: { value: 1.12 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturation);
      c.rgb += mix(vec3(-0.012, -0.004, 0.02), vec3(0.03, 0.012, -0.02), smoothstep(0.15, 0.85, l));
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = c;
    }`
};

let sharedEnv = null;
// The environment map every place uses (made by `makeView`; null before it).
export const envMap = () => sharedEnv;
export let QUALITY = 'high';

export function makeView(container, { quality = 'high' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality === 'high';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio, 1.75) : 1);
  container.appendChild(renderer.domElement);
  QUALITY = quality;
  if (!sharedEnv) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    sharedEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
  let scene = new THREE.Scene();
  let composer = null, renderPass = null, bloom = null;
  if (quality === 'high') {
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.45, 1.3);
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass(GradeShader));
  }

  function resize() {
    const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer, camera, bloom,
    get scene() {
      return scene;
    },
    // Swap the scene being drawn (the title, the hall, a room).
    setScene(s) {
      scene = s;
      if (renderPass) renderPass.scene = s;
    },
    render() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    resize
  };
}

// A canvas texture drawn by `draw(ctx, w, h)`, repeating. For walls, floors and fabrics made in code.
export function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A glow: a soft dot that always faces the camera and adds light (a flame's halo, a lamp, a potion's aura). `colour`
// may be brighter than white (`strength` > 1) so the bloom catches it.
export function glow(colour, size = 0.4, strength = 1.6) {
  const m = new THREE.SpriteMaterial({ map: dotTexture(), color: new THREE.Color(colour).multiplyScalar(strength), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

// A shaft of light (a window's sun or moon, a lamp's beam): a cone whose sides fade where you see them edge-on and
// whose length fades towards the floor, with slow dust drifting in it. `uniforms.colour` and `uniforms.strength`
// are what a place's mood moves.
export function shaftMaterial(colour = 0xffe0a0, strength = 0.5) {
  return new THREE.ShaderMaterial({
    uniforms: { colour: { value: new THREE.Color(colour) }, strength: { value: strength }, time: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP;
      void main() { vUv = uv; vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 colour; uniform float strength; uniform float time; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float along = smoothstep(0.0, 0.75, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        float dust = 0.75 + 0.5 * n(vec2(vUv.x * 9.0 + time * 0.05, vUv.y * 5.0 - time * 0.12));
        gl_FragColor = vec4(colour * strength * edge * along * dust, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false
  });
}

// A magic circle: rings, a seven-pointed star and little glyphs round the rim, white lines on clear (tint it with the
// material's colour). The curse on a door, and the circle under her feet when she casts.
let rune;
export function runeTexture() {
  if (rune) return rune;
  rune = canvasTexture(512, 512, (g, w) => {
    const c = w / 2;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.lineCap = 'round';
    const ring = (r, lw) => {
      g.lineWidth = lw;
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.stroke();
    };
    ring(c * 0.96, 7);
    ring(c * 0.86, 3);
    ring(c * 0.62, 4);
    ring(c * 0.2, 3);
    // The star: every third point of seven, joined.
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i <= 7; i++) {
      const a = ((i * 3) % 7) / 7 * Math.PI * 2 - Math.PI / 2;
      const x = c + Math.cos(a) * c * 0.62, y = c + Math.sin(a) * c * 0.62;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    // Glyphs between the outer rings: small made-up letters of strokes and dots.
    let seed = 11;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.save();
      g.translate(c + Math.cos(a) * c * 0.91, c + Math.sin(a) * c * 0.91);
      g.rotate(a + Math.PI / 2);
      g.lineWidth = 3;
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        g.moveTo((r() - 0.5) * 18, (r() - 0.5) * 14);
        g.lineTo((r() - 0.5) * 18, (r() - 0.5) * 14);
      }
      g.stroke();
      if (r() < 0.5) {
        g.beginPath();
        g.arc(0, -8, 2.5, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    // Dots at the star's points.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.arc(c + Math.cos(a) * c * 0.62, c + Math.sin(a) * c * 0.62, 9, 0, Math.PI * 2);
      g.fill();
    }
  });
  rune.wrapS = rune.wrapT = THREE.ClampToEdgeWrapping;
  return rune;
}

// A soft round dot, for particles and glows.
let dot;
export function dotTexture() {
  if (dot) return dot;
  dot = canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
  return dot;
}

export const params = new URLSearchParams(location.search);
