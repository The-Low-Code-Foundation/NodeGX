/**
 * P113 REV-005 — the moon: what a child's stars can now become.
 *
 * Richard, 2026-10-04, ruling 4 on the prizes: *"something more concrete like adopting little aliens on a moon in the game
 * and buying food and accessories for them"*. This file is the moon's catalogue — the species, their colours, the food and
 * what an alien can wear — in one place, the way `HANGAR_SHELF` is the hangar's. The scripts read it (`MOON_HELPERS`), the
 * kit draws it (`game-kit.Alien`), and the gates hold the two together: every species and every thing to wear here is one the
 * kit draws.
 *
 * 🔴 **Nothing on the moon ever gets worse.** The two children it is for were promised no negative feedback (memory
 * `kids-ellie-saoirse`: no timers, no streaks, no "you missed"). So an alien is never hungry, never sad and never leaves: a
 * meal makes it hop and brings it closer to growing, and a day away changes nothing. Food is the steady way to spend; things
 * to wear are the saved-up treats; another alien is the big one.
 *
 * Prices are in stars, from the same purse as the hangar (`stars − spent`). A race or a Monster Gate game pays about 35–45 ⭐,
 * so one game buys five or six meals, a hat is one or two games, and a crown is a few.
 *
 * @module noodl-mcp/tests/tpl007Moon
 */
import type { Bi } from './tpl007Curriculum';

const s = (en: string, fr: string): Bi => ({ en, fr });

export interface MoonSpecies {
  /** The kit's species id (`game-kit.Alien` Species). */
  id: string;
  name: Bi;
  /** Names the adopt card suggests, in turn. A child can type their own. */
  names: string[];
}

export const MOON_SPECIES: ReadonlyArray<MoonSpecies> = [
  { id: 'blob', name: s('Blob', 'Blob'), names: ['Zib', 'Plop', 'Mimo', 'Bloop'] },
  { id: 'bean', name: s('Bean', 'Haricot'), names: ['Zorp', 'Tilly', 'Nok', 'Beep'] },
  { id: 'trio', name: s('Trio', 'Trio'), names: ['Trix', 'Oko', 'Pip', 'Lumo'] },
  { id: 'squid', name: s('Squiggle', 'Gribouille'), names: ['Wiggo', 'Tako', 'Squee', 'Flo'] },
  { id: 'fuzz', name: s('Fuzz', 'Poilu'), names: ['Fizz', 'Puff', 'Koko', 'Ruff'] },
  { id: 'star', name: s('Twinkle', 'Étincelle'), names: ['Stella', 'Zing', 'Nova', 'Pix'] }
];

/**
 * The alien colours: bright, and lighter than the rocket paints on purpose (a creature, not a hull). The token is the only
 * place a colour lives (`tpl007Theme.ts` emits it); every alien is edged in ink, so the outline carries the contrast.
 */
export const ALIEN_COLOURS: ReadonlyArray<{ id: string; token: string; hex: string; name: Bi }> = [
  { id: 'lime', token: '--alien-lime', hex: '#8bc34a', name: s('Lime', 'Citron vert') },
  { id: 'mint', token: '--alien-mint', hex: '#4fd1b5', name: s('Mint', 'Menthe') },
  { id: 'sky', token: '--alien-sky', hex: '#5aa9f0', name: s('Sky', 'Ciel') },
  { id: 'lilac', token: '--alien-lilac', hex: '#b388eb', name: s('Lilac', 'Lilas') },
  { id: 'pink', token: '--alien-pink', hex: '#f48fb1', name: s('Pink', 'Rose') },
  { id: 'sunny', token: '--alien-sunny', hex: '#ffca28', name: s('Sunny', 'Soleil') }
];

/** Food: one tap feeds the alien and spends the price. Every alien has one favourite, found by feeding it. */
export const MOON_FOODS: ReadonlyArray<{ id: string; glyph: string; name: Bi; cost: number }> = [
  { id: 'strawberry', glyph: '🍓', name: s('Strawberry', 'Fraise'), cost: 3 },
  { id: 'cookie', glyph: '🍪', name: s('Cookie', 'Cookie'), cost: 4 },
  { id: 'doughnut', glyph: '🍩', name: s('Doughnut', 'Beignet'), cost: 5 },
  { id: 'pizza', glyph: '🍕', name: s('Pizza', 'Pizza'), cost: 6 },
  { id: 'cheese', glyph: '🧀', name: s('Moon cheese', 'Fromage de lune'), cost: 7 },
  { id: 'cake', glyph: '🍰', name: s('Star cake', 'Gâteau étoilé'), cost: 8 }
];

/**
 * What an alien can wear: bought once by a player, then any of their aliens can put it on. `slot` is the kit's place for it.
 * TPL-014 M5 added the last four (Richard's picture): the headphones and the flower crown, and the back (wings, a cape).
 */
export const MOON_WEAR: ReadonlyArray<{ id: string; slot: 'hat' | 'eyes' | 'neck' | 'back'; name: Bi; cost: number }> = [
  { id: 'bow', slot: 'hat', name: s('Bow', 'Nœud'), cost: 20 },
  { id: 'party', slot: 'hat', name: s('Party hat', 'Chapeau de fête'), cost: 25 },
  { id: 'beanie', slot: 'hat', name: s('Bobble hat', 'Bonnet'), cost: 30 },
  { id: 'tophat', slot: 'hat', name: s('Top hat', 'Haut-de-forme'), cost: 45 },
  { id: 'crown', slot: 'hat', name: s('Crown', 'Couronne'), cost: 80 },
  { id: 'glasses', slot: 'eyes', name: s('Glasses', 'Lunettes'), cost: 20 },
  { id: 'sunglasses', slot: 'eyes', name: s('Sunglasses', 'Lunettes de soleil'), cost: 35 },
  { id: 'monocle', slot: 'eyes', name: s('Monocle', 'Monocle'), cost: 40 },
  { id: 'starglasses', slot: 'eyes', name: s('Star glasses', 'Lunettes étoiles'), cost: 50 },
  { id: 'scarf', slot: 'neck', name: s('Scarf', 'Écharpe'), cost: 25 },
  { id: 'bowtie', slot: 'neck', name: s('Bow tie', 'Nœud papillon'), cost: 30 },
  { id: 'necklace', slot: 'neck', name: s('Necklace', 'Collier'), cost: 40 },
  { id: 'headphones', slot: 'hat', name: s('Headphones', 'Casque'), cost: 90 },
  { id: 'flowers', slot: 'hat', name: s('Flower crown', 'Couronne de fleurs'), cost: 110 },
  { id: 'cape', slot: 'back', name: s('Cape', 'Cape'), cost: 120 },
  { id: 'wings', slot: 'back', name: s('Little wings', 'Petites ailes'), cost: 150 }
];
/** The places an alien wears things, in the order the moon reads them. */
export const WEAR_SLOTS = ['hat', 'eyes', 'neck', 'back'] as const;

/** What the next alien costs, by how many the player already has: the first is free, so the moon is never empty for long. */
export const ALIEN_COSTS: ReadonlyArray<number> = [0, 60, 90, 120, 160, 200, 240, 280, 320, 360];
/** The moon holds six aliens; each dome built makes room for more (TPL-014 M1). */
export const MAX_ALIENS = 6;

/**
 * TPL-014 M1 — the big things to save for. Richard's eldest, 2026-10-14: five aliens, every favourite found, too many stars
 * and nothing to do. A dome is the long goal (a race pays 35–45 ⭐, so the first is some 25 games) and it makes room: no child
 * ever has to give an alien up to meet a new one. The egg is the short one: it always hatches an alien the player has never
 * had (a species in a colour), drawn from a pool they can see, with no rarity and no spin (TPL-014 §4.6).
 */
export const MOON_DOMES: ReadonlyArray<{ id: string; glyph: string; name: Bi; cost: number; room: number }> = [
  { id: 'crater', glyph: '🏠', name: s('Crater Dome', 'Dôme du cratère'), cost: 1000, room: 2 },
  { id: 'ridge', glyph: '🏡', name: s('Ridge Dome', 'Dôme de la crête'), cost: 1500, room: 2 }
];
export const EGG_COST = 300;
/** The Alien Book: every species in every colour. */
export const BOOK_SIZE = MOON_SPECIES.length * ALIEN_COLOURS.length;
/** The most aliens a moon can ever hold: six, and every dome's room. Adoption has a price for each place. */
export const MOST_ALIENS = MAX_ALIENS + MOON_DOMES.reduce((n, d) => n + d.room, 0);
if (ALIEN_COSTS.length < MOST_ALIENS) throw new Error(`ALIEN_COSTS has ${ALIEN_COSTS.length} prices for ${MOST_ALIENS} places`);
/** Meals to grow: young at the first, grown up at the second. A favourite meal counts as FAVOURITE_MEALS. */
export const GROW_AT: readonly [number, number] = [6, 18];
export const FAVOURITE_MEALS = 2;

/**
 * TPL-014 M5 — the other big things: the garden grows food from the seeds a trip brings home, and the frame hangs the
 * postcards on the moon. Built once, like a dome.
 */
export const MOON_THINGS: ReadonlyArray<{ id: string; glyph: string; name: Bi; line: Bi; cost: number }> = [
  { id: 'garden', glyph: '🪴', name: s('Moon garden', 'Jardin de lune'), line: s('Plant the seeds you find; they grow food as you earn stars', 'Plante les graines trouvées : elles poussent quand tu gagnes des étoiles'), cost: 250 },
  { id: 'frame', glyph: '🖼️', name: s('Postcard frame', 'Cadre à cartes postales'), line: s('Hang your postcards on the moon', 'Accroche tes cartes postales sur la Lune'), cost: 90 }
];

// ── TPL-014 M2 and M3 — the Expedition ──────────────────────────────────────

/**
 * The Expedition: a fogged planet of TRIP_SIZE × TRIP_SIZE tiles, walked one tile per right answer. Plain ground is always
 * joined up, so every find on it can be reached; water needs a swimmer (a Squiggle, the species with a job) and a crater needs
 * the jetpack, and each holds a find only they can fetch. A wrong answer moves nothing and loses nothing.
 */
export const TRIP_SIZE = 6;
export const TRIP_SWIMMER = 'squid';
/** What a bag holds without the big boots, and how many more they carry. */
export const TRIP_BAG = 6;
export const TRIP_BOOTS_MORE = 2;
/** A trip: how many water tiles and craters, and the finds on plain ground (the egg clue only while an alien is unmet). */
export const TRIP_LAYOUT = { water: 5, craters: 3, plain: ['crystal', 'crystal', 'fossil', 'fossil', 'seed', 'seed', 'postcard', 'postcard'], egg: 1 } as const;

/** What a trip can find. `where` is the ground it lies on. */
export const TRIP_FINDS: ReadonlyArray<{ id: string; glyph: string; name: Bi; where: 'plain' | 'water' | 'crater' }> = [
  { id: 'crystal', glyph: '💎', name: s('Crystal', 'Cristal'), where: 'plain' },
  { id: 'fossil', glyph: '🦴', name: s('Fossil', 'Fossile'), where: 'plain' },
  { id: 'seed', glyph: '🌱', name: s('Seed', 'Graine'), where: 'plain' },
  { id: 'postcard', glyph: '📮', name: s('Postcard', 'Carte postale'), where: 'plain' },
  { id: 'egg', glyph: '🥚', name: s('Egg clue', 'Indice d’œuf'), where: 'plain' },
  { id: 'shell', glyph: '🐚', name: s('Sea shell', 'Coquillage'), where: 'water' },
  { id: 'meteor', glyph: '☄️', name: s('Meteorite', 'Météorite'), where: 'crater' }
];

/** Gear for the walk, bought once. It changes what a right answer does, and never answers a question. */
export const MOON_GEAR: ReadonlyArray<{ id: string; glyph: string; name: Bi; line: Bi; cost: number }> = [
  { id: 'lantern', glyph: '🔦', name: s('Lantern', 'Lanterne'), line: s('Each right answer clears the fog on all four sides', 'Chaque bonne réponse chasse le brouillard tout autour'), cost: 120 },
  { id: 'jetpack', glyph: '🎒', name: s('Jetpack', 'Jetpack'), line: s('Hop into one crater a trip', 'Saute dans un cratère par voyage'), cost: 60 },
  { id: 'map', glyph: '🗺️', name: s('Old map', 'Vieille carte'), line: s('Shows where the egg clue is hidden', 'Montre où se cache l’indice d’œuf'), cost: 40 },
  { id: 'boots', glyph: '🥾', name: s('Big boots', 'Grosses bottes'), line: s('Carry two more finds home', 'Rapporte deux trouvailles de plus'), cost: 80 }
];

/** The planets a trip lands on, in turn. */
export const PLANETS: ReadonlyArray<string> = ['Zuma', 'Pobo', 'Kiri', 'Wuzz', 'Mira', 'Tolo', 'Fenn', 'Nixo', 'Quill', 'Orra', 'Bimble', 'Sorra'];

/** Twenty postcards to collect. A postcard found is the next one not had yet; after twenty, any. */
export const POSTCARDS: ReadonlyArray<{ id: string; glyph: string; name: Bi }> = [
  { id: 'volcano', glyph: '🌋', name: s('A fizzy volcano', 'Un volcan pétillant') },
  { id: 'rings', glyph: '🪐', name: s('Rainbow rings', 'Des anneaux arc-en-ciel') },
  { id: 'desert', glyph: '🏜️', name: s('The purple desert', 'Le désert violet') },
  { id: 'sea', glyph: '🌊', name: s('The jelly sea', 'La mer en gelée') },
  { id: 'moons', glyph: '🌌', name: s('Two moons at night', 'Deux lunes la nuit') },
  { id: 'ice', glyph: '🗻', name: s('Ice mountain', 'La montagne de glace') },
  { id: 'cactus', glyph: '🌵', name: s('A sky cactus', 'Un cactus du ciel') },
  { id: 'mushrooms', glyph: '🍄', name: s('Giant mushrooms', 'Des champignons géants') },
  { id: 'sunset', glyph: '🌅', name: s('A green sunset', 'Un coucher de soleil vert') },
  { id: 'fountain', glyph: '⛲', name: s('The fizzy fountain', 'La fontaine pétillante') },
  { id: 'island', glyph: '🏝️', name: s('A floating island', 'Une île qui flotte') },
  { id: 'shooting', glyph: '🌠', name: s('Shooting stars', 'Des étoiles filantes') },
  { id: 'rocks', glyph: '🪨', name: s('The singing rocks', 'Les rochers qui chantent') },
  { id: 'storm', glyph: '🌪️', name: s('A glitter storm', 'Une tempête de paillettes') },
  { id: 'caves', glyph: '🧊', name: s('Ice caves', 'Les grottes de glace') },
  { id: 'flowers', glyph: '🌺', name: s('Moon flowers', 'Des fleurs de lune') },
  { id: 'saucer', glyph: '🛸', name: s('An old flying saucer', 'Une vieille soucoupe volante') },
  { id: 'rainbow', glyph: '🌈', name: s('A double rainbow', 'Un double arc-en-ciel') },
  { id: 'castle', glyph: '🏰', name: s('A sand castle on Mars', 'Un château de sable sur Mars') },
  { id: 'comet', glyph: '☄️', name: s('A comet going by', 'Une comète qui passe') }
];

// ── TPL-014 M4 — Alien school, and the fourth form ──────────────────────────

/** Right answers that fill one topic of an alien's. A topic never empties. */
export const TOPIC_FULL = 5;
/**
 * The fourth form, by what the alien does most with the child (the picture's three). `need` is how many of `what`: topics
 * taught to full, finds it brought home, or its favourite food. A form waits until the alien is grown up, and is kept.
 */
export const MOON_FORMS: ReadonlyArray<{ id: string; name: Bi; as: Bi; how: Bi; what: 'topics' | 'finds' | 'favs'; need: number }> = [
  { id: 'scholar', name: s('Scholar', 'Savant'), as: s('a Scholar', 'un savant'), how: s('teach it 3 topics', 'apprends-lui 3 chapitres'), what: 'topics', need: 3 },
  { id: 'explorer', name: s('Explorer', 'Explorateur'), as: s('an Explorer', 'un explorateur'), how: s('bring home 20 finds with it', 'rapporte 20 trouvailles avec lui'), what: 'finds', need: 20 },
  { id: 'superstar', name: s('Superstar', 'Superstar'), as: s('a Superstar', 'une superstar'), how: s('its favourite food, 10 times', 'son plat préféré, 10 fois'), what: 'favs', need: 10 }
];

// ── TPL-014 M5 — the moon garden ────────────────────────────────────────────

/** Plots in the garden; a seed planted is ripe after GARDEN_RIPE stars more have been earned (right answers water it). */
export const GARDEN_PLOTS = 6;
export const GARDEN_RIPE = 15;
/** A ripe plant picks as this many free meals. */
export const GARDEN_MEALS = 3;
/** What the garden grows, in turn: food that is free to feed, and only grows on the moon. */
export const GARDEN_FOODS: ReadonlyArray<{ id: string; glyph: string; name: Bi }> = [
  { id: 'moonberry', glyph: '🫐', name: s('Moonberries', 'Baies de lune') },
  { id: 'melon', glyph: '🍈', name: s('Moon melon', 'Melon de lune') },
  { id: 'carrot', glyph: '🥕', name: s('Space carrot', 'Carotte de l’espace') },
  { id: 'corn', glyph: '🌽', name: s('Rocket corn', 'Maïs fusée') },
  { id: 'peach', glyph: '🍑', name: s('Star peach', 'Pêche étoilée') }
];

/** The whole catalogue, as the scripts take it. */
export const MOON = {
  species: MOON_SPECIES,
  colours: ALIEN_COLOURS.map((c) => ({ id: c.id, token: c.token, name: c.name })),
  foods: MOON_FOODS,
  wear: MOON_WEAR,
  cost: ALIEN_COSTS,
  max: MAX_ALIENS,
  domes: MOON_DOMES,
  egg: EGG_COST,
  grow: GROW_AT,
  fav: FAVOURITE_MEALS,
  slots: WEAR_SLOTS,
  things: MOON_THINGS,
  gear: MOON_GEAR,
  finds: TRIP_FINDS,
  trip: { size: TRIP_SIZE, swimmer: TRIP_SWIMMER, bag: TRIP_BAG, boots: TRIP_BOOTS_MORE, layout: TRIP_LAYOUT },
  planets: PLANETS,
  postcards: POSTCARDS,
  topicFull: TOPIC_FULL,
  forms: MOON_FORMS,
  garden: { plots: GARDEN_PLOTS, ripe: GARDEN_RIPE, meals: GARDEN_MEALS, foods: GARDEN_FOODS }
} as const;
