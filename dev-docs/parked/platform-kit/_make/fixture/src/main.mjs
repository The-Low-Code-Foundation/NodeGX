// The fixture: the kit's people in two rooms. What a game written to the canon looks like at its smallest.
import * as THREE from 'three';
import { loadPlaces, loadDesigns, loadStrings, say, expose, loadPeople, makeCrowd, registry, partOf } from '../kit/index.mjs';
import { makeView } from './engine/view.mjs';
import { R } from './room.mjs';
import { P } from '../places/two-rooms.mjs';
import { life, L } from './life.mjs';

const hud = document.getElementById('hud');
await loadStrings();
await loadPlaces();
await loadDesigns();
const people = await loadPeople();
const { renderer, scene, camera, frame } = makeView(document.body);
const level = registry.places.get('two-rooms').build();
scene.add(level);

const crowd = makeCrowd(people, P.people);
scene.add(crowd.mesh);
const lives = life(crowd, people, { rooms: [[P.margin, R.width - P.margin], [R.width + P.margin, 2 * R.width - P.margin]], z: P.plane, count: P.people });

await people.preload([L.hero]);
const hero = people.party(L.hero);
hero.object.position.set(P.heroAt, 0, P.plane + 0.5);
hero.object.rotation.y = Math.PI / 2;
hero.play('run');
scene.add(hero.object);

frame(0, -0.5, 2 * R.width, R.height + 0.5, 0);
expose({ scene, camera, renderer });

// Pointing: the crowd answers for itself; anything else is a part of a model.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), onPlane = new THREE.Vector3();
renderer.domElement.addEventListener('pointermove', (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -P.plane), onPlane);
  const who = crowd.pick(onPlane.x, onPlane.y);
  if (who) return (hud.textContent = say('pointed', { who: people.person(who.person).label, part: who.part }));
  const hit = ray.intersectObject(scene, true).find((h) => h.object !== crowd.mesh);
  const p = hit && (hit.object.isSkinnedMesh ? { model: 'person', part: hero.partAt(hit) } : partOf(hit.object));
  hud.textContent = p ? say('pointed', { who: p.model ?? '', part: p.part }) : say('nobody');
});
hud.textContent = say('title');

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1); // why: a stalled tab must not teleport everyone
  lives.update(dt);
  crowd.update(clock.elapsedTime);
  hero.update(dt);
  renderer.render(scene, camera);
});
window.__fixture = { crowd, hero, camera, lives };
