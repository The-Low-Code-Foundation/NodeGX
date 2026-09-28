/**
 * CG-003 — the words and the small tables the PAGES need that the engine's content does not carry.
 *
 * `cg002Content.ts` (lane B's this session) owns the requests, the hints and every word the engine and the blocks
 * speak. The pages need a few more lines — eyebrows, the grown-ups' panels, the win card's thank-you, the Skills
 * page's programme notes — and those live here, EN and FR, and are appended to the same `Data/Words` table, so one
 * `Logic/Translate words` publishes them all. A key here must never shadow a key there (the template gate checks).
 *
 * The programme notes are the mockup's `p1`–`p7`, verbatim.
 *
 * @module noodl-mcp/tests/cg003Content
 */
import type { Bi } from './cg002Content';

const s = (en: string, fr: string): Bi => ({ en, fr });

/**
 * Each request's own line under the Workshop title (CG-007 §7.1 item 1), in the mockup's voice ("Drive Pip yourself
 * first. Pip remembers every step as a block, and then you can tidy the steps up."). `{b}` is the robot's name. A
 * request with no line here falls back to the island's general sentence (`isSub`); the template gate names it.
 */
export const REQUEST_SUBS: Readonly<Record<string, { key: string; words: Bi }>> = {
  'path-postbox': { key: 'subPathPostbox', words: s('Drive {b} along the path, one step at a time. Every step you take becomes a block.', 'Conduis {b} sur le chemin, un pas à la fois. Chaque pas devient un bloc.') },
  'tulip-door': { key: 'subTulipDoor', words: s('One thirsty tulip. Walk {b} to her, turn, and water: three kinds of step, in the right order.', 'Une tulipe qui a soif. Emmène {b} jusqu’à elle, tourne, et arrose : trois sortes de pas, dans le bon ordre.') },
  'tulips-three': { key: 'subTulipsThree', words: s('Drive {b} yourself first. {b} remembers every step as a block, and then you can tidy the steps up.', 'Conduis {b} toi-même d’abord. {b} retient chaque pas comme un bloc, et ensuite tu peux ranger les pas.') },
  'path-stones': { key: 'subPathStones', words: s('Put a stone down, step, and again. When the same steps come back, fold them into a repeat.', 'Pose une pierre, avance, et encore. Quand les mêmes pas reviennent, range-les dans un « répéter ».') },
  'bowl-if': { key: 'subBowlIf', words: s('Only the empty bowl gets food. Teach {b} to look first: if the bowl is empty, then fill it.', 'Seul le bol vide reçoit à manger. Apprends à {b} à regarder d’abord : si le bol est vide, alors remplis-le.') },
  'letter-say': { key: 'subLetterSay', words: s('Carry the letter to the post box, then give {b} something kind to say when it gets there.', 'Porte la lettre jusqu’à la boîte aux lettres, puis donne à {b} quelque chose de gentil à dire en arrivant.') },
  'wall-until': { key: 'subWallUntil', words: s('No need to count the steps. {b} can keep going until the wall, then stop by itself.', 'Pas besoin de compter les pas. {b} peut avancer jusqu’au mur, puis s’arrêter tout seul.') },
  'meow-when': { key: 'subMeowWhen', words: s('Nobody knows when Biscuit will meow. Teach {b} what to do whenever it happens.', 'Personne ne sait quand Biscuit va miauler. Apprends à {b} quoi faire chaque fois que ça arrive.') },
  'eggs-count': { key: 'subEggsCount', words: s('Four eggs, not five. {b} can count while picking, and stop when the count is right.', 'Quatre œufs, pas cinq. {b} peut compter en ramassant, et s’arrêter quand le compte est bon.') },
  'rows-trick': { key: 'subRowsTrick', words: s('Two rows, the same job. Teach {b} the job once, as a trick with a name, then use it twice.', 'Deux rangées, le même travail. Apprends le travail une fois à {b}, comme une astuce avec un nom, puis utilise-la deux fois.') }
};

/** Page words, EN and FR. `{b}` is the robot's name; `{who}`, `{k}`, `{reward}` are filled by the script that shows them. */
export const PAGE_WORDS: Readonly<Record<string, Bi>> = {
  wsEyebrowReq: s('{who}’s request', 'La demande de {who}'),
  wsFreeTitle: s('Teach {b} anything', 'Apprends n’importe quoi à {b}'),
  ntEyebrow: s('{b}’s tricks', 'Les astuces de {b}'),
  guEyebrow: s('For grown-ups', 'Pour les parents'),
  guHere: s('This computer · small model (0.5 GB)', 'Cet ordinateur · petit modèle (0,5 Go)'),
  guHereOn: s('Installed and awake. Slow but private: a line takes a few seconds here.', 'Installé et réveillé. Lent mais privé : une phrase prend quelques secondes ici.'),
  guHereOff: s('Not running right now. The game still works: Olive uses her written lines.', 'Pas lancé pour l’instant. Le jeu marche quand même : Olive utilise ses phrases écrites.'),
  guExam: s('Olive’s exam on this computer: {p} of {t} passed.', 'L’examen d’Olive sur cet ordinateur : {p} sur {t} réussis.'),
  guExamNone: s('Olive’s exam has not run on this computer yet.', 'L’examen d’Olive n’a pas encore eu lieu sur cet ordinateur.'),
  guTryPrompt: s('A thank-you for Mamie Rose, from {b}', 'Un merci pour Mamie Rose, de la part de {b}'),
  guTryNote: s('A reply from the small offline model', 'Une réponse du petit modèle hors ligne'),
  guSaveLine: s('Copy this code to move every island to another computer.', 'Copie ce code pour déplacer toutes les îles vers un autre ordinateur.'),
  // The paste box (the second restore path, beside the desktop's Restore menu): a code replaces this computer's islands.
  saveCodeUse: s('Replace the islands with this code', 'Remplacer les îles par ce code'),
  saveCodeDone: s('Done: the islands from the code are back.', 'C’est fait : les îles du code sont revenues.'),
  winThanks: s('“Thank you, {b}!”', '« Merci, {b} ! »'),
  winNew: s('New: {reward}', 'Nouveau : {reward}'),
  pickProfile: s('Tap your name to play. Nothing is timed and nothing runs out.', 'Touche ton prénom pour jouer. Rien n’est chronométré, rien ne s’épuise.'),
  familyFull: s('Six players: the family is full.', 'Six joueurs : la famille est complète.'),
  stickersNone: s('No stickers yet. Help an islander to earn one.', 'Pas encore d’autocollant. Aide un habitant pour en gagner un.'),
  hatLocked: s('a gift from {who}', 'un cadeau de {who}'),
  n7Block: s('water a row', 'arroser une rangée'),
  p1: s('CP–CE2 · moves on a grid, up to 15 instructions (programme 2025)', 'CP–CE2 · déplacements sur quadrillage, 15 instructions max (programme 2025)'),
  p2: s('6e · "repeat n times" (programme 2025); 5e · simple loop', '6e · « répéter n fois » (programme 2025) ; 5e · boucle simple'),
  p3: s('3e · conditional loop (programme 2026)', '3e · boucle conditionnelle (programme 2026)'),
  p4: s('4e · conditional instructions (programme 2026)', '4e · instructions conditionnelles (programme 2026)'),
  p5: s('Cycle 4 · events (2016 programme; not in the 2026 text)', 'Cycle 4 · événements (programme 2016 ; absent du texte 2026)'),
  p6: s('4e · handle a variable (programme 2026)', '4e · manipuler une variable (programme 2026)'),
  p7: s('Beyond the programme · procedures, as in Lightbot', 'Hors programme · procédures, comme dans Lightbot'),
  ...Object.fromEntries(Object.values(REQUEST_SUBS).map((r) => [r.key, r.words]))
};

export const PAGE_WORD_KEYS: ReadonlyArray<string> = Object.keys(PAGE_WORDS);

/** Who each islander is on screen: the sprite class and the word that names them. */
export const ISLANDERS: Readonly<Record<string, { sprite: string; nameKey: string }>> = {
  mamie: { sprite: 'granny', nameKey: 'islMamie' },
  sami: { sprite: 'postie', nameKey: 'islSami' },
  biscuit: { sprite: 'cat', nameKey: 'islBiscuit' }
};

/** The block drawn on each Skills card (the mockup's `NOTION_BLK`): its colour kind and the word it shows. */
export const SKILL_BLOCKS: ReadonlyArray<{ key: string; kind: string; word: string }> = [
  { key: 'n1', kind: 'motion', word: 'bFwd' },
  { key: 'n2', kind: 'control', word: 'bRepeat' },
  { key: 'n3', kind: 'control', word: 'bUntil' },
  { key: 'n4', kind: 'control', word: 'bIf' },
  { key: 'n5', kind: 'control', word: 'bWhen' },
  { key: 'n6', kind: 'control', word: 'bCountInc' },
  { key: 'n7', kind: 'ask', word: 'n7Block' }
];

/**
 * The island (ruling 6): the MOCKUP's sea with pins, not a tile world (`bot-garden.html` lines 302–330). Each islander
 * who can ask is a pin, where the mockup puts it (Sami, whom the mockup's map leaves out, on the free east shore); the
 * scenery pins and the robot's and Olive's are drawn by `Island/Map` itself. The place of every pin is its class in the
 * look (`.bg-pin-<id>`), so the numbers live in one sheet with the mockup's. Only the playing kid's robot is on it
 * (ruling 8): one island per kid.
 */
export const ISLAND_PINS: ReadonlyArray<{ id: string; islander: string; sprite: string }> = [
  { id: 'mamie', islander: 'mamie', sprite: 'house' },
  { id: 'biscuit', islander: 'biscuit', sprite: 'cat' },
  { id: 'sami', islander: 'sami', sprite: 'postie' }
];

/** Where the mockup puts each pin on the map: left, top (its centre), width, height, in % of the map. */
export const PIN_PLACES: Readonly<Record<string, [number, number, number, number]>> = {
  mamie: [24, 30, 11, 19],
  tree1: [62, 26, 9, 16],
  tree2: [72, 34, 9, 16],
  tulip1: [40, 56, 7, 12],
  tulip2: [46, 60, 7, 12],
  tulip3: [52, 56, 7, 12],
  biscuit: [78, 66, 10, 17],
  rock: [20, 70, 11, 19],
  bot: [34, 40, 10, 17],
  olive: [60, 76, 8, 14],
  sami: [85, 40, 10, 17]
};

/** The Teach pad, one row per key (the mockup's `.pad`): the op it records, its icon class, its word for a screen reader. */
export const PAD_KEYS: ReadonlyArray<{ op: string; cls: string; word: string }> = [
  { op: 'fwd', cls: 'bg-key bg-key-fwd bg-i-fwd bg-press', word: 'bFwd' },
  { op: 'left', cls: 'bg-key bg-key-left bg-i-left bg-press', word: 'bLeft' },
  { op: 'water', cls: 'bg-key bg-key-water bg-i-water bg-press', word: 'bWater' },
  { op: 'right', cls: 'bg-key bg-key-right bg-i-right bg-press', word: 'bRight' }
];

/** The eyes and hats the robot can wear (the mockup's `#eyes` and `#hats`). A hat other than none/cap is a gift. */
export const EYES: ReadonlyArray<{ id: string; word: string }> = [
  { id: 'round', word: 'eyeRound' },
  { id: 'happy', word: 'eyeHappy' },
  { id: 'wink', word: 'eyeWink' }
];
export const HATS: ReadonlyArray<{ id: string; word: string; free: boolean; from: string }> = [
  { id: 'none', word: 'hatNone', free: true, from: '' },
  { id: 'cap', word: 'hatCap', free: false, from: 'islSami' },
  { id: 'sun', word: 'hatSun', free: false, from: 'islMamie' },
  { id: 'crown', word: 'hatCrown', free: false, from: 'islBiscuit' }
];
