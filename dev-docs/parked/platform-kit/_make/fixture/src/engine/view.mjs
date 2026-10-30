// The view: a renderer, the fixed side camera and its light. Nothing moves the camera but the person.
import * as THREE from 'three';
import { knobs, num, colour } from '../../kit/index.mjs';

export const V = knobs('view', {
  fov: num(20, [10, 45], '°', 'Field of view', 'Narrow reads as a dollhouse; wide shows the rooms in depth.'),
  sky: colour('#a9bcc4', 'Sky'),
  sun: num(2.2, [0, 5], '', 'Key light'),
  sunColour: colour('#fff2e0', 'Key light colour'),
  sunHeight: num(4, [-2, 10], 'm', 'Key light height', 'Above the rooms lights the floors; below lights the ceilings.'),
  fill: num(1.6, [0, 4], '', 'Fill light'),
  fillSky: colour('#dfe8ff', 'Fill from above'),
  fillGround: colour('#3a3430', 'Fill from below')
});
const FAR = 900; // why: past the whole tower and the bay behind it at the widest zoom

export function makeView(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // why: the tablet's 2× is the most worth paying for
  renderer.setSize(innerWidth, innerHeight);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(V.sky);
  const camera = new THREE.PerspectiveCamera(V.fov, innerWidth / innerHeight, 0.5, FAR);
  const fill = new THREE.HemisphereLight(V.fillSky, V.fillGround, V.fill);
  const sun = new THREE.DirectionalLight(V.sunColour, V.sun);
  sun.position.set(-V.sunHeight / 2, V.sunHeight, V.sunHeight); // why: the bake's key light came from up, left and in front
  scene.add(fill, sun);
  V.$.onChange(() => {
    scene.background.set(V.sky);
    fill.intensity = V.fill;
    fill.color.set(V.fillSky);
    fill.groundColor.set(V.fillGround);
    sun.intensity = V.sun;
    sun.color.set(V.sunColour);
    sun.position.set(-V.sunHeight / 2, V.sunHeight, V.sunHeight);
    camera.fov = V.fov;
    camera.updateProjectionMatrix();
  });
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });
  // Looks at a box (x0, y0, x1, y1 on the plane z = at) so it fills the screen.
  const frame = (x0, y0, x1, y1, at) => {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max((y1 - y0) / 2 / t, (x1 - x0) / 2 / (t * camera.aspect));
    camera.position.set((x0 + x1) / 2, (y0 + y1) / 2, at + d);
    camera.lookAt((x0 + x1) / 2, (y0 + y1) / 2, at);
  };
  return { renderer, scene, camera, frame };
}
