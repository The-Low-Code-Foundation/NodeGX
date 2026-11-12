// The rules as numbers (SCOPE.md §6): how hard each depth hits, what each room holds, what each reward does.
// Everything here is data so a playtest can retune it without touching the battle.

export const START = { maxHp: 100, maxMp: 30, power: 10, ward: 0 };
export const SPELL_COST = 5; // a Sparkle
export const BONK = 0.4; // with no magic left, the staff hits for this share of a spell
export const BRILLIANT = 1.5; // answered in the first third of the time
export const WAKE_HP = 0.3; // what a knockout leaves you with, back in the Hall

// The clock (a setting): seconds to answer, or 0 for none.
export const TIMERS = { relaxed: 45, normal: 30, brisk: 20, off: 0 };

// A depth's creatures: how hard one hit is before ward, and how much each can take.
export const DEPTHS = { 1: { hit: 20, hp: 30 }, 2: { hit: 34, hp: 30 }, 3: { hit: 50, hp: 60 }, 4: { hit: 100, hp: 120 }, 5: { hit: 150, hp: 200 } };

export const CREATURE_NAMES = {
  moth: 'Tatter Moth', soot: 'Soot Sprite', grimoire: 'Grumpy Grimoire',
  // Round 2, the Swan Wing: the same three kinds of curse, wearing that wing's colours (creatures.mjs VARIANTS).
  offkey: 'Off-Key Sprite', nibble: 'Nibble Moth', crumb: 'Crumb Sprite', queen: 'Midnight Moth Queen'
};
// What each one was before the curse, said when it is freed.
export const FREED = {
  moth: 'The Tatter Moth was a silk butterfly all along!',
  soot: 'The Soot Sprites were the hearth’s fire fairies!',
  grimoire: 'The Grumpy Grimoire was a storybook that nobody read any more!',
  offkey: 'The Off-Key Sprites were the piano’s little hammer fairies!',
  nibble: 'The Nibble Moth and the Crumb Sprite were the tea room’s sugar fairies!',
  crumb: 'The Nibble Moth and the Crumb Sprite were the tea room’s sugar fairies!',
  queen: 'The Midnight Moth Queen was Madame Lune, the moonlight butterfly who taught the château to dance!'
};

// The rooms. `hub` is the place whose door leads in: the Grand Hall (round 1) or the Swan Gallery (round 2), which
// opens with the key the Grumpy Grimoire was keeping. `hp` (optional) is each creature's health instead of its depth's.
export const ROOMS = [
  {
    id: 'dressing', name: 'The Dressing Room', depth: 1, creatures: ['moth'],
    blurb: 'Gowns and hats, eaten to rags by something with wings.',
    reward: 'wardrobe'
  },
  {
    id: 'kitchen', name: 'The Kitchen', depth: 2, creatures: ['soot', 'soot'],
    blurb: 'The ovens are cold, and the soot is moving.',
    reward: 'chef'
  },
  {
    id: 'library', name: 'The Library', depth: 4, creatures: ['grimoire'],
    blurb: 'Deep in the château. Something in there is very, very grumpy.',
    reward: 'staff'
  },
  {
    id: 'music', hub: 'gallery', name: 'The Music Room', depth: 3, creatures: ['offkey', 'offkey'],
    blurb: 'A grand piano that plays wrong notes all by itself.',
    reward: 'fig'
  },
  {
    id: 'tearoom', hub: 'gallery', name: 'The Tea Room', depth: 4, creatures: ['nibble', 'crumb'], hp: 70,
    blurb: 'Teacups rattling, and something nibbling in the cake stands.',
    reward: 'praline'
  },
  {
    id: 'ballroom', hub: 'gallery', name: 'The Ballroom', depth: 5, creatures: ['queen'],
    blurb: 'The biggest room in the château, dark as midnight. Something huge is waltzing in there.',
    reward: 'ball'
  }
];
for (const r of ROOMS) r.hub ??= 'hall';
// The places with doors to rooms (no fight in them).
export const HUBS = { hall: 'The Grand Hall', gallery: 'The Swan Gallery' };
export const roomsIn = (hub) => ROOMS.filter((r) => r.hub === hub);
export const roomById = (id) => ROOMS.find((r) => r.id === id);

// The surprises. `gives` changes the heroine's numbers; `opens` is the room's feature once it is won.
export const REWARDS = {
  wardrobe: {
    title: 'The Enchanted Wardrobe',
    text: 'The wardrobe sighs open: gowns, capes and hats, all yours. And on the hook, the Starlight Cloak: creatures’ hits now hurt half as much.',
    gives: { ward: 1 }, item: 'Starlight Cloak', opens: 'wardrobe', icon: '👗'
  },
  chef: {
    title: 'Chef Mirabelle',
    text: '“Finally! Someone to bake with!” The castle chef is back, with her spoon-wand. Bake a Magic Cake with her: a cake heals you completely, even in a fight.',
    gives: {}, opens: 'cakes', icon: '🎂'
  },
  staff: {
    title: 'The Moonlit Staff',
    text: 'On the reading desk, glowing: the Moonlit Staff. Your spells now hit twice as hard.<br><br>Tucked in the Grimoire’s pages: a <b>silver swan key</b>. The Swan Wing is open! And Archivist Hoot the owl is back at the desk, with books to read.',
    gives: { power: 20 }, item: 'Moonlit Staff', opens: 'books', icon: '🌙'
  },
  fig: {
    title: 'Maestro Fig',
    text: 'A little frog in a tailcoat hops onto the piano. “Bravo! It is in tune again!” He teaches you the Song of Courage: <b>+50 health</b>. Play the piano with him!',
    gives: { maxHp: 50 }, opens: 'piano', icon: '🎹'
  },
  praline: {
    title: 'Chef Praline',
    text: '“Mirabelle is my big sister!” The tea room’s pastry chef is back, and she bakes biscuits. And on the cake stand, the <b>Sugar-Glass Charm</b>: creatures’ hits now hurt only a third as much.',
    gives: { ward: 1 }, item: 'Sugar-Glass Charm', opens: 'biscuits', icon: '🍪'
  },
  ball: {
    title: 'The Ball',
    text: 'The chandeliers light one by one. Madame Lune, the moonlight butterfly, gives you the <b>Dawn Staff</b>: spells hit harder than ever. Ballgowns and a moon crown wait in the Dressing Room’s wardrobe. Now: shall we dance?',
    gives: { power: 30 }, item: 'Dawn Staff', opens: 'dance', icon: '👑'
  }
};

// The heroine's numbers from what she has won.
export function stats(save) {
  const s = { ...START };
  for (const id of save.won) {
    const g = REWARDS[roomById(id)?.reward]?.gives ?? {};
    if (g.ward) s.ward += g.ward;
    if (g.power) s.power = Math.max(s.power, g.power);
    if (g.maxHp) s.maxHp += g.maxHp;
    if (g.maxMp) s.maxMp += g.maxMp;
  }
  // Hoot's Owl Quill, for a star in every book (the Library's reading nook).
  if (save.quill) s.maxMp += 10;
  return s;
}

// What one hit from a creature of this depth costs her now.
export const hitFor = (depth, st) => Math.round(DEPTHS[depth].hit / (1 + st.ward));
// How many hits from full health knock her out in there.
export const hitsToKnockOut = (depth, st) => Math.ceil(st.maxHp / hitFor(depth, st));

// The bag: potions found in the Hall, cakes from the kitchen.
export const ITEMS = {
  heart: { name: 'Heart Potion', icon: '💗', text: 'Gives back 50 health.', hp: 50, mp: 0, max: 3 },
  star: { name: 'Star Potion', icon: '💙', text: 'Gives back 15 magic.', hp: 0, mp: 15, max: 3 },
  cake: { name: 'Magic Cake', icon: '🍰', text: 'Fills your health and magic right up.', hp: 999, mp: 999, max: 2 },
  biscuit: { name: 'Biscuit', icon: '🍪', text: 'Gives back 40 health and 10 magic.', hp: 40, mp: 10, max: 4 }
};
// Which room's reward puts an item in the bag (until then it is not shown).
export const ITEM_FROM = { cake: 'kitchen', biscuit: 'tearoom' };
export const POTION_RESPAWN = 45; // seconds

// The wardrobe: what she can wear. `from` = the room that gives it (null = from the start).
export const WARDROBE = {
  hat: [
    { id: 'none', name: 'No hat', from: null },
    { id: 'witch', name: 'Sorceress hat', from: null },
    { id: 'tiara', name: 'Star tiara', from: 'dressing' },
    { id: 'bow', name: 'Big bow', from: 'dressing' },
    { id: 'crown', name: 'Moon crown', from: 'ballroom' }
  ],
  cape: [
    { id: 'none', name: 'No cape', from: null },
    { id: 'starlight', name: 'Starlight Cloak', from: 'dressing' },
    { id: 'rose', name: 'Rose cape', from: 'dressing' },
    { id: 'midnight', name: 'Midnight cape', from: 'ballroom' }
  ],
  dress: [
    { id: 'violet', name: 'Violet', top: '#b9a3ff', skirt: '#6b4bc9', from: null },
    { id: 'rose', name: 'Rose', top: '#ffd0e4', skirt: '#e0558f', from: 'dressing' },
    { id: 'mint', name: 'Mint', top: '#d6fff0', skirt: '#3fb59a', from: 'dressing' },
    { id: 'midnight', name: 'Midnight', top: '#9fb4ff', skirt: '#232a6b', from: 'dressing' },
    { id: 'sunny', name: 'Sunshine', top: '#fff2b8', skirt: '#f0a92e', from: 'dressing' },
    { id: 'moonlight', name: 'Moonlight ballgown', top: '#eef2ff', skirt: '#9aa8e8', from: 'ballroom' },
    { id: 'royal', name: 'Royal blue ballgown', top: '#c9d6ff', skirt: '#2f4bc4', from: 'ballroom' },
    { id: 'rosegold', name: 'Rose-gold ballgown', top: '#ffe2d0', skirt: '#e08a78', from: 'ballroom' },
    { id: 'starry', name: 'Starry-night ballgown', top: '#8f80e0', skirt: '#1a1450', from: 'ballroom' }
  ],
  hair: [
    { id: 'chestnut', name: 'Chestnut', color: '#ffffff', from: null },
    { id: 'gold', name: 'Golden', color: '#ffe08a', from: 'dressing' },
    { id: 'pink', name: 'Candy pink', color: '#ffb3d1', from: 'dressing' },
    { id: 'silver', name: 'Moon silver', color: '#e6ecff', from: 'dressing' },
    { id: 'blue', name: 'Night blue', color: '#8fa8ff', from: 'dressing' },
    { id: 'lilac', name: 'Lilac', color: '#d9b8ff', from: 'music' },
    { id: 'caramel', name: 'Caramel', color: '#ffd2a0', from: 'tearoom' }
  ]
};
export const DEFAULT_LOOK = { hat: 'witch', cape: 'none', dress: 'violet', hair: 'chestnut' };
