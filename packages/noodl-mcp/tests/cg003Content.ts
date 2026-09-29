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
  'rows-trick': { key: 'subRowsTrick', words: s('Two rows, the same job. Teach {b} the job once, as a trick with a name, then use it twice.', 'Deux rangées, le même travail. Apprends le travail une fois à {b}, comme une astuce avec un nom, puis utilise-la deux fois.') },
  // P106 IG-006 (lane C): Olive's three requests.
  'mamie-note': { key: 'subMamieNote', words: s('A program cannot read Mamie’s note, but Olive can. Ask her, then let “if Olive read…” choose the row.', 'Un programme ne sait pas lire le mot de Mamie, Olive si. Demande-lui, puis laisse « si Olive a lu… » choisir la rangée.') },
  'rock-flower': { key: 'subRockFlower', words: s('Olive is right most of the time, not every time. Ask three times, and the count decides.', 'Olive a raison presque tout le temps, pas à chaque fois. Demande trois fois, et le compte décide.') },
  'sami-thanks': { key: 'subSamiThanks', words: s('The letter is {b}’s job; the kind words are Olive’s. Put her thank-you at the end.', 'La lettre, c’est le travail de {b} ; les mots gentils, ceux d’Olive. Mets son merci à la fin.') }
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
  // Olive's lessons on Skills (band 10–12): the section and the two marks.
  skRungsH: s('Olive’s lessons', 'Les leçons d’Olive'),
  skRungsSub: s('What a small model does well, and what a program does better.', 'Ce qu’un petit modèle fait bien, et ce qu’un programme fait mieux.'),
  rungGreen: s('Olive does this', 'Olive sait faire'),
  rungGrad: s('A program does it better', 'Un programme fait mieux'),
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
  // IG-001 D7 (P106 s1): the picker's two Olive sensors.
  sOliveSaysYes: s('Olive says yes', 'Olive dit oui'),
  sOliveSaysNo: s('Olive says no', 'Olive dit non'),
  p1: s('CP–CE2 · moves on a grid, up to 15 instructions (programme 2025)', 'CP–CE2 · déplacements sur quadrillage, 15 instructions max (programme 2025)'),
  p2: s('6e · "repeat n times" (programme 2025); 5e · simple loop', '6e · « répéter n fois » (programme 2025) ; 5e · boucle simple'),
  p3: s('3e · conditional loop (programme 2026)', '3e · boucle conditionnelle (programme 2026)'),
  p4: s('4e · conditional instructions (programme 2026)', '4e · instructions conditionnelles (programme 2026)'),
  p5: s('Cycle 4 · events (2016 programme; not in the 2026 text)', 'Cycle 4 · événements (programme 2016 ; absent du texte 2026)'),
  p6: s('4e · handle a variable (programme 2026)', '4e · manipuler une variable (programme 2026)'),
  p7: s('Beyond the programme · procedures, as in Lightbot', 'Hors programme · procédures, comme dans Lightbot'),
  // IG-007 (P106 s2): the Grown-ups page names the renderer this computer uses, why, and offers the switch.
  guRendH: s('How the island is drawn', 'Comment l’île est dessinée'),
  guRend3d: s('3D island', 'Île en 3D'),
  guRend2d: s('Flat garden', 'Jardin à plat'),
  guRend3dLine: s('This computer draws the island in 3D. If it is too slow, the game switches to the flat garden by itself.', 'Cet ordinateur dessine l’île en 3D. Si c’est trop lent, le jeu passe tout seul au jardin à plat.'),
  guRendSlow: s('The flat garden is on: 3D was too slow on this computer.', 'Le jardin à plat est activé : la 3D était trop lente sur cet ordinateur.'),
  guRendNoGl: s('The flat garden is on: this computer cannot draw 3D.', 'Le jardin à plat est activé : cet ordinateur ne sait pas dessiner en 3D.'),
  guRendFlat: s('The flat garden is on, as chosen here.', 'Le jardin à plat est activé, comme choisi ici.'),
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

/**
 * The Teach pad's keys in the pad's order (the mockup's `.pad`): the op each records, its fixed place on the d-pad (the
 * motions; an action's place is given at run time: the first allowed action takes the centre, the rest a third row),
 * its icon and its word. IG-001 D10: `Logic/Pad keys` draws one key per step the request allows, from this table.
 */
export const PAD_KEYS: ReadonlyArray<{ op: string; place: string; icon: string; word: string }> = [
  { op: 'fwd', place: 'bg-key-fwd', icon: 'fwd', word: 'bFwd' },
  { op: 'left', place: 'bg-key-left', icon: 'left', word: 'bLeft' },
  { op: 'water', place: '', icon: 'water', word: 'bWater' },
  { op: 'right', place: 'bg-key-right', icon: 'right', word: 'bRight' },
  { op: 'fill', place: '', icon: 'fill', word: 'bFill' },
  { op: 'pick', place: '', icon: 'pick', word: 'bPick' },
  { op: 'put', place: '', icon: 'put', word: 'bPut' }
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

/**
 * P106 IG-006 (lane C) — the page words Olive's three blocks, their cards, the three requests and Olive's lessons need.
 * 🔴 The FR lines are Richard's to read before the kids see them (IG-006 AC5).
 */
export const IG006_WORDS: Readonly<Record<string, Bi>> = {
  // The three requests (cg002Content.ts IG006_REQUESTS): title, blurb, the islander's line, the reward, the gift.
  rqNoteTitle: s('Water the flowers my note asks for', 'Arrose les fleurs que demande mon mot'),
  rqNoteBlurb: s('Olive reads', 'Olive lit'),
  rqNoteLine: s('"I left a note by the tulips. Ask Olive to read it: it says which row wants water today."', '« J’ai laissé un mot près des tulipes. Demande à Olive de le lire : il dit quelle rangée veut de l’eau aujourd’hui. »'),
  stickerNote: s('Note sticker', 'Autocollant petit mot'),
  giftNote: s('A note sticker, from Mamie Rose', 'Un autocollant petit mot, offert par Mamie Rose'),
  rqFlowerTitle: s('Water the flowers, not the rocks', 'Arrose les fleurs, pas les rochers'),
  rqFlowerBlurb: s('Is it a…?', 'Est-ce un… ?'),
  rqFlowerLine: s('"Flowers and rocks, side by side. Ask Olive if each one is a flower before {b} waters it. If she gets one wrong, ask three times."', '« Des fleurs et des rochers, côte à côte. Demande à Olive si chacun est une fleur avant que {b} l’arrose. Si elle se trompe, demande trois fois. »'),
  stickerFlower: s('Rose sticker', 'Autocollant rose'),
  giftFlower: s('A rose sticker, from Sami', 'Un autocollant rose, offert par Sami'),
  rqThanksTitle: s('Carry my letter, then say thank you', 'Porte ma lettre, puis dis merci'),
  rqThanksBlurb: s('Olive says it', 'Olive le dit'),
  rqThanksLine: s('"Take my letter to the post box, then let Olive find the words to thank Mamie Rose."', '« Porte ma lettre jusqu’à la boîte aux lettres, puis laisse Olive trouver les mots pour remercier Mamie Rose. »'),
  stickerThanks: s('Bouquet sticker', 'Autocollant bouquet'),
  giftThanks: s('A bouquet sticker, from Sami', 'Un autocollant bouquet, offert par Sami'),
  // The cards (AC5): what every palette block does, in one line. {b} is the robot's name.
  cardGotIt: s('Got it', 'Compris'),
  cardExample: s('For example:', 'Par exemple :'),
  cardHelpsH: s('What does a block do? Tap its ?', 'Que fait un bloc ? Touche son ?'),
  cdFwd: s('{b} takes one step forward, to the next square.', '{b} avance d’une case.'),
  cdLeft: s('{b} turns a quarter turn to the left, without moving.', '{b} tourne d’un quart de tour à gauche, sans avancer.'),
  cdRight: s('{b} turns a quarter turn to the right, without moving.', '{b} tourne d’un quart de tour à droite, sans avancer.'),
  cdWater: s('{b} waters the square in front. A tulip drinks; anywhere else, a puddle.', '{b} arrose la case devant lui. Une tulipe boit ; ailleurs, c’est une flaque.'),
  cdFill: s('{b} fills the can at the water in front. The can holds three; each water uses one.', '{b} remplit l’arrosoir à l’eau devant lui. L’arrosoir en contient trois ; chaque arrosage en prend un.'),
  cdPick: s('{b} picks up the thing in front and keeps it in the basket.', '{b} ramasse ce qu’il y a devant lui et le garde dans son panier.'),
  cdPut: s('{b} puts down the last thing it picked up, on the square in front.', '{b} pose la dernière chose ramassée sur la case devant lui.'),
  cdSay: s('{b} says a line out loud, in a bubble.', '{b} dit une phrase à voix haute, dans une bulle.'),
  cdRepeat: s('The blocks inside run again and again, as many times as the number says.', 'Les blocs à l’intérieur recommencent, autant de fois que le dit le nombre.'),
  cdUntil: s('The blocks inside run again and again, until what you chose is true.', 'Les blocs à l’intérieur recommencent, jusqu’à ce que ce que tu as choisi soit vrai.'),
  cdIf: s('The blocks inside run only if what you chose is true right now.', 'Les blocs à l’intérieur ne se font que si ce que tu as choisi est vrai à ce moment-là.'),
  cdWhen: s('The blocks inside run each time something happens, like Biscuit meowing.', 'Les blocs à l’intérieur se font chaque fois que quelque chose arrive, comme Biscuit qui miaule.'),
  cdCountInc: s('{b} adds one to the number it keeps in mind.', '{b} ajoute un au nombre qu’il garde en tête.'),
  cdTrick: s('Give some blocks a name. Then one “do” block runs them all.', 'Donne un nom à des blocs. Ensuite, un seul bloc « faire » les fait tous.'),
  cdDo: s('Runs the trick with that name, all its blocks.', 'Fait l’astuce qui porte ce nom, avec tous ses blocs.'),
  cdAsk: s('Olive answers a question, and her answer can steer the program.', 'Olive répond à une question, et sa réponse peut guider le programme.'),
  cdOliveSay: s('Olive writes a thank-you in her own words, and {b} says it. Run it twice: it is never the same.', 'Olive écrit un merci avec ses mots, et {b} le dit. Lance-le deux fois : ce n’est jamais pareil.'),
  cdOliveRead: s('Olive reads the note on the plot and says which thing it means. Then “if Olive read…” chooses what {b} does.', 'Olive lit le mot posé dans le jardin et dit de quelle chose il parle. Ensuite, « si Olive a lu… » choisit ce que fait {b}.'),
  lsRead: s('Only Olive can read what an islander wrote, and her answer is always one of the things on the plot.', 'Seule Olive sait lire ce qu’un habitant a écrit, et sa réponse est toujours une des choses du jardin.'),
  // Olive's lessons on Skills (R7): the canned question each card asks, and the check the page does underneath.
  lsAsk: s('Ask Olive', 'Demander à Olive'),
  lsQ7: s('Mamie’s flowers: {list}. How many tulips?', 'Les fleurs de Mamie : {list}. Combien de tulipes ?'),
  lsCheck7: s('The program counts the word “tulip”: {n}.', 'Le programme compte le mot « tulipe » : {n}.'),
  lsQ8: s('What is 14 + 9?', 'Combien font 14 + 9 ?'),
  lsCheck8: s('The rule adds them: 14 + 9 = {n}.', 'La règle les additionne : 14 + 9 = {n}.'),
  lsQ9: s('Describe a tulip without the letter e.', 'Décris une tulipe sans la lettre e.'),
  lsCheck9: s('The page checked every letter: {n} × e.', 'La page a vérifié chaque lettre : {n} × e.'),
  lsCheck9None: s('The page checked every letter: no e at all. She kept the rule this time.', 'La page a vérifié chaque lettre : aucun e. Cette fois, elle a tenu la règle.'),
  lsQ10: s('Three questions about the world.', 'Trois questions sur le monde.'),
  lsBook: s('In a book: {x}', 'Dans un livre : {x}'),
  lsTrue1: s('the capital of Australia is Canberra.', 'la capitale de l’Australie est Canberra.'),
  lsTrue2: s('the Moon weighs about 73 billion billion tonnes, far more than a mountain.', 'la Lune pèse environ 73 milliards de milliards de tonnes, bien plus qu’une montagne.'),
  lsTrue3: s('the first bicycle was made in Germany, by Karl Drais, in 1817.', 'le premier vélo a été fait en Allemagne, par Karl Drais, en 1817.'),
  lsQ11: s('French → English, then English → French.', 'Du français vers l’anglais, puis de l’anglais vers le français.'),
  lsFrEn: s('French → English: “{q}”', 'Du français vers l’anglais : « {q} »'),
  lsEnFr: s('English → French: “{q}”', 'De l’anglais vers le français : « {q} »'),
  lsWobbly: s('Olive is better one way than the other.', 'Olive est meilleure dans un sens que dans l’autre.'),
  // P106 s3 lane B (IG-003): Drive · Teach · Play, and the islander's Predict challenge (R4, R5).
  ig3Drive: s('Drive', 'Conduire'),
  ig3Teach: s('Teach', 'Apprendre'),
  ig3Driving: s('Just driving: nothing is remembered.', 'Juste conduire : rien n’est retenu.'),
  ig3TeachOn: s('Back to the start. Now show {b} the moves.', 'Retour au départ. Maintenant, montre les gestes à {b}.'),
  ig3TeachGoOn: s('{b} is where your steps end. Show {b} what comes next.', '{b} est là où tes pas finissent. Montre-lui la suite.'),
  ig3StepsDriving: s('Just driving: nothing here changes. Press Teach and every move becomes a block.', 'Tu conduis : rien ne change ici. Appuie sur Apprendre et chaque geste devient un bloc.'),
  ig3PredictAsk: s('Before you press Play, tap where {b} will stop.', 'Avant d’appuyer sur Jouer, touche la case où {b} va s’arrêter.'),
  ig3PredictRight: s('You were right!', 'Tu avais raison !')
};
export const IG006_WORD_KEYS: ReadonlyArray<string> = Object.keys(IG006_WORDS);

/** A block of a card's example (ids are given when the card is drawn). */
export interface CardBlock {
  t: string;
  n?: number;
  slots?: Record<string, string>;
  body?: ReadonlyArray<CardBlock>;
}

/**
 * P106 IG-006 AC5 — a card for EVERY palette block (not only Olive's): its label (the palette's own word), one line of
 * what it does, and an example drawn as blocks. The first tap on a palette block opens its card (and places nothing);
 * the `?` beside a placed block's kind opens it again. The unrendered `or6Line` ("Is the thing in front of {b} a
 * flower?") is `is it a…?`'s line; the other rungs' lines did not fit a block and stay unrendered.
 */
export const BLOCK_CARDS: Readonly<Record<string, { label: string; line: string; example: ReadonlyArray<CardBlock> }>> = {
  fwd: { label: 'bFwd', line: 'cdFwd', example: [{ t: 'fwd' }, { t: 'fwd' }] },
  left: { label: 'bLeft', line: 'cdLeft', example: [{ t: 'left' }, { t: 'fwd' }] },
  right: { label: 'bRight', line: 'cdRight', example: [{ t: 'right' }, { t: 'fwd' }] },
  water: { label: 'bWater', line: 'cdWater', example: [{ t: 'fwd' }, { t: 'water' }] },
  fill: { label: 'bFill', line: 'cdFill', example: [{ t: 'fill' }, { t: 'left' }, { t: 'left' }, { t: 'fwd' }, { t: 'water' }] },
  pick: { label: 'bPick', line: 'cdPick', example: [{ t: 'pick' }, { t: 'fwd' }, { t: 'put' }] },
  put: { label: 'bPut', line: 'cdPut', example: [{ t: 'pick' }, { t: 'fwd' }, { t: 'put' }] },
  say: { label: 'bSay', line: 'cdSay', example: [{ t: 'say', slots: { text: 'thanksMamie' } }] },
  repeat: { label: 'bRepeat', line: 'cdRepeat', example: [{ t: 'repeat', n: 3, body: [{ t: 'fwd' }] }] },
  until: { label: 'bUntil', line: 'cdUntil', example: [{ t: 'until', slots: { sensor: 'wall_ahead' }, body: [{ t: 'fwd' }] }] },
  if: { label: 'bIf', line: 'cdIf', example: [{ t: 'if', slots: { sensor: 'tulip_ahead' }, body: [{ t: 'water' }] }] },
  when: { label: 'bWhen', line: 'cdWhen', example: [{ t: 'when', slots: { event: 'meow' }, body: [{ t: 'fwd' }] }] },
  count_inc: { label: 'bCountInc', line: 'cdCountInc', example: [{ t: 'pick' }, { t: 'count_inc' }] },
  trick: { label: 'bTrick', line: 'cdTrick', example: [{ t: 'trick', slots: { name: 'row' }, body: [{ t: 'fwd' }, { t: 'water' }] }, { t: 'do', slots: { name: 'row' } }] },
  do: { label: 'bDo', line: 'cdDo', example: [{ t: 'do', slots: { name: 'row' } }] },
  ask: { label: 'bAsk', line: 'cdAsk', example: [{ t: 'ask' }] },
  'olive:say-thanks': { label: 'rungSayThanks', line: 'cdOliveSay', example: [{ t: 'olive:say-thanks', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' } }] },
  'olive:read': { label: 'rungRead', line: 'cdOliveRead', example: [{ t: 'olive:read' }, { t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ t: 'water' }] }] },
  'olive:is-it-a': { label: 'rungIsItA', line: 'or6Line', example: [{ t: 'olive:is-it-a', slots: { kind: 'a flower', times: '3' } }, { t: 'if', slots: { sensor: 'olive_says:yes' }, body: [{ t: 'water' }] }] }
};
