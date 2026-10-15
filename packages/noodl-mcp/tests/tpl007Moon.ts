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

/** What an alien can wear: bought once by a player, then any of their aliens can put it on. `slot` is the kit's place for it. */
export const MOON_WEAR: ReadonlyArray<{ id: string; slot: 'hat' | 'eyes' | 'neck'; name: Bi; cost: number }> = [
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
  { id: 'necklace', slot: 'neck', name: s('Necklace', 'Collier'), cost: 40 }
];

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
  fav: FAVOURITE_MEALS
} as const;
