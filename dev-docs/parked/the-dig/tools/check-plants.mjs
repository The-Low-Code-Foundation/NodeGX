// Checks a day's plants file before the game is allowed to read it (the nightly run calls this on what it wrote).
//   node tools/check-plants.mjs data/plants/2026-11-01.json [--trophies data/trophies.json]
// Exit 0 and "ok" when the file is usable; exit 1 with one line per problem otherwise.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const KINDS = ['task', 'learn', 'reflect', 'body', 'people'];
export const THEMES = ['forest', 'field', 'desert', 'tundra', 'jungle', 'cavern', 'station', 'ruins'];
export const ENEMIES = ['none', 'bugs', 'robots', 'beasts'];
const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{1,60}$/;

export function checkPlants(day, { trophyIds = [] } = {}) {
  const problems = [];
  const say = (where, what) => problems.push(`${where}: ${what}`);
  const text = (where, v, max) => {
    if (typeof v !== 'string' || !v.trim()) say(where, 'missing');
    else if (v.length > max) say(where, `longer than ${max} characters (${v.length})`);
  };
  if (!day || typeof day !== 'object') return ['the file is not a JSON object'];
  if (day.note !== undefined) text('note', day.note, 400);
  if (!Array.isArray(day.plants) || day.plants.length < 1 || day.plants.length > 6) say('plants', 'needs 1 to 6 plants');
  const ids = new Set();
  const treasureIds = new Set(trophyIds);
  for (const [i, p] of (day.plants ?? []).entries()) {
    const at = `plants[${i}]`;
    if (!SLUG.test(p.id ?? '')) say(`${at}.id`, 'a lower-case slug (a-z, 0-9, -)');
    else if (ids.has(p.id)) say(`${at}.id`, `"${p.id}" is used twice`);
    ids.add(p.id);
    if (!KINDS.includes(p.kind)) say(`${at}.kind`, `one of ${KINDS.join(', ')}`);
    text(`${at}.title`, p.title, 70);
    text(`${at}.instructions`, p.instructions, 700);
    text(`${at}.ask`, p.ask, 300);
    const w = p.world;
    if (!w || typeof w !== 'object') {
      say(`${at}.world`, 'missing');
      continue;
    }
    text(`${at}.world.name`, w.name, 50);
    if (!THEMES.includes(w.theme)) say(`${at}.world.theme`, `one of ${THEMES.join(', ')}`);
    if (w.enemies !== undefined && !ENEMIES.includes(w.enemies)) say(`${at}.world.enemies`, `one of ${ENEMIES.join(', ')}`);
    for (const k of ['sky', 'ground', 'accent', 'foliage']) if (w[k] !== undefined && !HEX.test(w[k])) say(`${at}.world.${k}`, 'a #rrggbb colour');
    if (!Array.isArray(w.treasure) || w.treasure.length < 1 || w.treasure.length > 4) say(`${at}.world.treasure`, 'needs 1 to 4 treasures');
    for (const [j, t] of (w.treasure ?? []).entries()) {
      if (!SLUG.test(t.id ?? '')) say(`${at}.world.treasure[${j}].id`, 'a lower-case slug');
      else if (treasureIds.has(t.id)) say(`${at}.world.treasure[${j}].id`, `"${t.id}" is already used (today, or in the trophy case)`);
      treasureIds.add(t.id);
      text(`${at}.world.treasure[${j}].name`, t.name, 40);
      text(`${at}.world.treasure[${j}].description`, t.description, 200);
    }
    if (w.notes !== undefined && (!Array.isArray(w.notes) || w.notes.length > 3)) say(`${at}.world.notes`, 'at most 3 notes');
    for (const [j, n] of (w.notes ?? []).entries()) {
      text(`${at}.world.notes[${j}].title`, n.title, 60);
      text(`${at}.world.notes[${j}].text`, n.text, 900);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file] = process.argv.slice(2);
  const ti = process.argv.indexOf('--trophies');
  let trophyIds = [];
  if (ti > 0 && fs.existsSync(process.argv[ti + 1])) trophyIds = JSON.parse(fs.readFileSync(process.argv[ti + 1], 'utf8')).map((t) => t.id);
  let day;
  try {
    day = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`${file}: ${e.message}`);
    process.exit(1);
  }
  const problems = checkPlants(day, { trophyIds });
  if (problems.length) {
    for (const p of problems) console.log(p);
    process.exit(1);
  }
  console.log('ok');
}
