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
  guSaveLine: s('Copy this code to move the whole garden to another computer.', 'Copie ce code pour déplacer tout le jardin vers un autre ordinateur.'),
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
  p7: s('Beyond the programme · procedures, as in Lightbot', 'Hors programme · procédures, comme dans Lightbot')
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
 * The island in overview: a 12 × 7 tile island in the sea, drawn by the kit's `Garden` (CG-003 §2's "the map in overview
 * mode"). The islanders stand by their homes as labels; every profile's robot stands on the path (D2).
 */
export const ISLAND_MAP: ReadonlyArray<string> = ['WWWWWWWWWWWW', 'WGGTGGGGTHGW', 'WGGGGFGFGGGW', 'WPPPPPPPPPPW', 'WGRGGGGGGTGW', 'WGGTGGGGGGGW', 'WWWWWWWWWWWW'];

/** Where the islanders stand on the island map, and the bowl and the letter that name their requests. */
export const ISLAND_THINGS: ReadonlyArray<{ kind: string; x: number; y: number; who?: string; full?: boolean }> = [
  { kind: 'label', x: 9, y: 1, who: 'islMamie' },
  { kind: 'bowl', x: 8, y: 4, full: false },
  { kind: 'label', x: 8, y: 4, who: 'islBiscuit' },
  { kind: 'letter', x: 3, y: 4 },
  { kind: 'label', x: 3, y: 4, who: 'islSami' }
];

/** The path tiles the family's robots stand on, in profile order (six at most). */
export const ISLAND_SPOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 2, y: 3 },
  { x: 4, y: 3 },
  { x: 6, y: 3 },
  { x: 8, y: 3 },
  { x: 10, y: 3 },
  { x: 1, y: 3 }
];

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
