// One-off: turns reference/src/i18n.js (words + sentence functions) into rows { key, fr, en } for the NodeGX
// "Words" Static Data node. A sentence function becomes a template: {0} {1}… are its arguments, {0:s} is "s" when
// argument 0 is more than 1, {0:lower} lower-cases it. Functions with logic beyond that are written out by hand below.
// Usage: node tools/extract-words.mjs > tools/words.json
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { TXT } = await import(pathToFileURL(join(root, 'reference/src/i18n.js')));

// written by hand: [fr, en]
const HAND = {
  sound_on: ['Couper la musique', 'Turn the music off'], sound_off: ['Remettre la musique', 'Turn the music on'],
  spanFact: ['Bras ouverts, {0:lower} mesurent {1} d’une main à l’autre.', 'Arms open, {0:lower} measure {1} hand to hand.'],
  fx_postes: ['💇 {0} poste{0:s} de coiffure', '💇 {0} hair station{0:s}'],
  fx_rail: ['👗 {0} portant{0:s} : {1} costumes rangés pour {2} danseuses', '👗 {0} clothes rail{0:s}: room for {1} costumes, {2} dancers'],
  fx_seats: ['🪑 {0} place{0:s} assise{0:s} pour {1} danseuses', '🪑 {0} seat{0:s} for {1} dancers'],
  fxTag_postes: ['+{0} poste{0:s} coiffure', '+{0} hair station{0:s}'], fxTag_seats: ['+{0} place{0:s}', '+{0} seat{0:s}'],
  live_gala: ['Le soir du gala', 'Gala night'], live_rehearsal: ['Répétition générale', 'Dress rehearsal'], live_try: ['Essai sur scène', 'Try-out on stage'],
  sum_hair: ['Coiffures : {0} min de travail ÷ {1} poste{1:s} = {2} min (de 19 h 00 à {3})', 'Hair: {0} min of work ÷ {1} station{1:s} = {2} min (19:00 to {3})'],
  sum_floor_bois: ['on enroule le tapis', 'the mat is rolled up'], sum_floor_tapis: ['on déroule le tapis', 'the mat is rolled out'],
  sum_chainSum: ['{0} = {1} temps {3} {2}', '{0} = {1} counts {3} {2}'],
  sum_drift: ['Un enchaînement les déplace de {0} m vers la droite : à chaque répétition, elles vont plus loin.', 'One phrase moves them {0} m to the right: every repeat takes them further.'],
  sum_driftZ: ['Un enchaînement les déplace de {0} m vers la droite et de {1} m vers le fond : à chaque répétition, elles vont plus loin.', 'One phrase moves them {0} m to the right and {1} m back: every repeat takes them further.'],
  sum_state: ['Énergie {0} · faim {1} · trac {2} · concentration {3}', 'Energy {0} · hunger {1} · nerves {2} · focus {3}'],
  sum_juice: ['Il faut {0} cl = {1} L · {2} × 1,5 L = {3} L', 'They need {0} cl = {1} L · {2} × 1.5 L = {3} L'],
  sum_bays: ['28 m ÷ {0} m = {1} places = {3} places', '28 m ÷ {0} m = {1} bays = {3} bays'],
  sum_baysRows: ['28 m ÷ {0} m = {1} places × {2} rangées = {3} places', '28 m ÷ {0} m = {1} bays × {2} rows = {3} bays'],
  say_floorSwap_bois: ['On enroule le tapis de danse : {0} d’attente.', 'Rolling up the dance mat: {0} wait.'],
  say_floorSwap_tapis: ['On déroule le tapis de danse : {0} d’attente.', 'Rolling out the dance mat: {0} wait.'],
  say_applause: ['« {0} » : {1} ⭐', '“{0}”: {1} ⭐'], say_applauseBig: ['Bravo ! « {0} » : {1} ⭐', 'Bravo! “{0}”: {1} ⭐'],
  say_cakeOut: ['Plus rien à manger quand {0:lower} arrivent à la table.', 'No food left when {0:lower} reach the table.'],
  say_juiceOut: ['Plus de jus quand {0:lower} arrivent à la table.', 'No juice left when {0:lower} reach the table.'],
  wallWarn: ['{0} doit avoir le dos contre un mur et regarder la pièce : tourne-le ou déplace-le.', 'The {0:lower} needs its back against a wall, facing the room: turn it or move it.'],
  hairFor: ['{0}', '{0}'],
  nameRefused: ['Ce nom n’est pas possible : des lettres, des chiffres, et des mots gentils.', 'That name can’t be used: letters, numbers and kind words only.'],
  parkFacts_0: ['{0} danseuses, environ 4 sur 5 viennent avec leur famille en voiture (des sœurs partagent la même) : {1} voitures de familles.', '{0} dancers, about 4 in 5 come with their family by car (sisters share one): {1} family cars.'],
  parkFacts_1: ['Les grands-parents et amis : {0} voitures de plus.', 'Grandparents and friends: {0} more cars.'],
  parkFacts_3: ['Au portail, il passe {0} voitures par minute.', 'The gate lets {0} cars in a minute.'],
};
const SKIP = new Set(['sound', 'spanFact', 'fx.postes', 'fx.rail', 'fx.seats', 'fxTag.postes', 'fxTag.seats', 'live', 'sum.hair', 'sum.floor', 'sum.chainSum', 'sum.times', 'sum.drift', 'sum.state', 'sum.juice', 'sum.bays', 'say.floorSwap', 'say.applause', 'say.cakeOut', 'say.juiceOut', 'wallWarn', 'hairFor', 'parkFacts', 'orderFacts']);
const strip = (s) => s.replace(/<\/?b>/g, '');
const ARGS = ['{0}', '{1}', '{2}', '{3}', '{4}'];

function flat(lang) {
  const out = {};
  const walk = (o, p) => {
    for (const [k, v] of Object.entries(o)) {
      const key = p ? `${p}.${k}` : k;
      if (SKIP.has(key)) continue;
      if (typeof v === 'string') out[key] = v;
      else if (Array.isArray(v)) v.forEach((x, i) => (out[`${key}.${i}`] = x));
      else if (typeof v === 'function') { const r = v(...ARGS); if (Array.isArray(r)) r.forEach((x, i) => (out[`${key}.${i}`] = x)); else out[key] = r; }
      else walk(v, key);
    }
  };
  walk(TXT[lang], '');
  // the programme's facts: the first five every season, the last two from season 3
  TXT[lang].orderFacts(3).forEach((x, i) => (out[`orderFacts.${i}`] = x));
  const pf = TXT[lang].parkFacts({ dancers: '{0}', families: '{1}', guests: '{0}', rate: '{0}' });
  [2, 4, 5].forEach((i) => (out[`parkFacts.${i}`] = pf[i]));
  return out;
}
const fr = flat('fr'), en = flat('en'), rows = [];
for (const k of Object.keys(fr)) rows.push({ key: k.replace(/\./g, '_'), fr: strip(fr[k]), en: strip(en[k] ?? fr[k]) });
for (const [k, [f, e]] of Object.entries(HAND)) rows.push({ key: k, fr: f, en: e });
const odd = rows.filter((r) => /undefined|\[object|function/.test(r.fr + r.en));
if (odd.length) throw new Error('odd rows: ' + odd.map((r) => r.key).join(', '));
process.stdout.write(JSON.stringify(rows));
console.error(`${rows.length} words`);
