/**
 * TPL-013 SC-4 — Star Class's text banks: English (the language of school) and Basic Science with health.
 *
 * The subjects briefing (`tpl-013-subjects-briefing.md` §7) ranks the first banks: English, Basic Science with health, Verbal
 * Reasoning, Africa and world geography. These are the first two. Text starts at P3 (§2.2.2: P1–P2 cannot read the questions).
 *
 * Every item is written fresh: curricula and past papers gave the topics (§2.2.5), nothing is copied. The content is English
 * only (TPL-013 §5.4's recommendation: the first users, Nigeria and Liberia, teach in English); the skill's name and its
 * strategy are interface words, so they are said in both languages, as every skill's are. British/Commonwealth spelling, which
 * all four Anglophone systems use (briefing §3). The names and things are West African and everyday, and none of §2.1.5's.
 *
 * ## English (`subject: 'english'`)
 *
 * | skill | class | the question |
 * |---|---|---|
 * | `sc-spell-p3`, `sc-spell-p5`, `sc-spell-jss` | P3, P5, JSS1 | a sentence with a gap; the word, among three misspellings of it |
 * | `sc-opposites` | P3 | a word; its opposite (the wrong buttons are the other items' opposites) |
 * | `sc-prepositions` | P4 | a sentence with a gap; in, on, at, into, under, of, by |
 * | `sc-punctuation` | P4 | a sentence; the mark it ends with, or the apostrophe it needs |
 * | `sc-synonyms` | P5 | a word; the one that means the same |
 * | `sc-word-class` | P5 | a word in a sentence; noun, verb, adjective or adverb |
 * | `sc-tenses` | P6 | a sentence with a gap; the verb in the tense it needs |
 * | `sc-concord` | JSS1 | a sentence with a gap; is or are, has or have (the subject decides) |
 *
 * ## Basic Science (`subject: 'science'`)
 *
 * | skill | class | the question |
 * |---|---|---|
 * | `sc-living` | P3 | living or non-living? |
 * | `sc-plant-parts` | P3 | what a part of a plant does |
 * | `sc-germs` | P3 | handwashing, clean water, malaria, teeth |
 * | `sc-animal-groups` | P4 | mammal, bird, reptile, amphibian, fish or insect? |
 * | `sc-body` | P4 | what an organ does |
 * | `sc-food-groups` | P4 | the food class a food mostly gives |
 * | `sc-matter` | P4 | solid, liquid or gas? |
 * | `sc-changes` | P5 | melting, freezing, evaporation, condensation or dissolving? |
 * | `sc-earth-sky` | P5 | the Sun, the Moon, day and night, the seasons |
 * | `sc-machines` | P6 | simple machines and magnets |
 * | `sc-cells-life` | JSS1 | cells, photosynthesis, the blood |
 *
 * 🔴 **Every science item names its source** (`src`, a key of {@link BANK_SOURCES}): a fact a child is marked on must be one a
 * reader can check. The English items carry their rule in `note` instead (said with the correction).
 *
 * 🔴 **The engine keys an item by its first 48 characters** (`itemKeyOf`), so two items of one skill must differ before
 * that; and the wrong buttons of an item without its own `opts` are the OTHER items' answers, so an answer that is also right
 * for another item's question would mark a right answer wrong. Both are gated in tpl013Edition.test.ts.
 *
 * @module noodl-mcp/tests/tpl013Banks
 */
import type { Skill } from './tpl007Curriculum';
import type { ListItem } from './tpl007Subjects';

export const s = (en: string, fr: string) => ({ en, fr });

/**
 * Where each fact comes from. A curriculum topic (the briefing's §3 list of what every country's Basic Science teaches,
 * graded there) and, for health, the fact sheet the item is checked against.
 */
export const BANK_SOURCES: Readonly<Record<string, string>> = {
  'bsc-living': 'Basic Science, "living and non-living things" (briefing §3; NERDC Basic Science and Technology, lower primary)',
  'bsc-plants': 'Basic Science, "parts of a plant and their jobs" (briefing §3)',
  'bsc-animals': 'Basic Science, "animal groups (mammals, birds, insects…)" (briefing §3)',
  'bsc-body': 'Basic Science, "human body organs and senses" (briefing §3)',
  'bsc-food': 'Basic Science, "food groups and balanced diet" (briefing §3): the six classes of food as Nigerian primary science teaches them',
  'bsc-matter': 'Basic Science, "states of matter" (briefing §3)',
  'bsc-earth': 'Basic Science, "weather, sun and moon" (briefing §3)',
  'bsc-machines': 'Basic Science, "sources of water, simple machines, magnets" (briefing §3)',
  'bsc-cells': 'NERDC Basic Science (JSS): living things — the cell, photosynthesis, the blood (topics only)',
  'who-malaria': 'WHO, Malaria fact sheet: spread by the bites of infected female Anopheles mosquitoes; insecticide-treated nets prevent it; mosquitoes breed in standing water, so removing it cuts their numbers (vector control)',
  'who-hands': 'WHO / UNICEF, hand hygiene: wash with soap and water after the toilet and before eating or handling food',
  'who-water': 'WHO, Cholera and Drinking-water fact sheets: cholera spreads through water or food dirtied by faeces; boiling makes water safe',
  'who-ors': 'WHO, Diarrhoeal disease fact sheet: oral rehydration solution (ORS) replaces the water and salts diarrhoea takes away',
  'who-teeth': 'WHO, Oral health fact sheet: brush twice a day with fluoride toothpaste; sugar causes tooth decay',
  'who-cough': 'WHO, respiratory hygiene: cover a cough or sneeze with a tissue or the bend of the elbow',
  'who-vaccines': 'WHO, Vaccines and immunization: a vaccine trains the body to fight a disease before it meets it'
};

/** A gap-fill: the sentence with ___, the right word, and the buttons (the right one among them). */
export const gap = (q: string, a: string, opts: string[], note?: string): ListItem => ({ q, a, opts, ...(note ? { note: s(note, note) } : {}) });
/** A spelling: the sentence with ___, the right spelling first, then three wrong ones a child really writes. */
const spell = (q: string, right: string, wrong: [string, string, string]): ListItem => ({ q, a: right, opts: [right, ...wrong] });
/** A pair: the word and its answer; the wrong buttons are the other items' answers. */
export const pair = (q: string, a: string, note?: string): ListItem => ({ q, a, ...(note ? { note: s(note, note) } : {}) });
/** A science fact: its question, its answer, its buttons (or none: the other items' answers), its source, and a note. */
export const fact = (q: string, a: string, src: string, opts?: string[], note?: string): ListItem & { src: string } => ({
  q,
  a,
  ...(opts ? { opts } : {}),
  ...(note ? { note: s(note, note) } : {}),
  src
});

// ── English ─────────────────────────────────────────────────────────────────

const SPELL_P3: ListItem[] = [
  spell('I stayed at home ___ I was sick.', 'because', ['becos', 'becuase', 'beacause']),
  spell('We are going to the market ___.', 'tomorrow', ['tomorow', 'tommorow', 'tumorrow']),
  spell('My ___ is a teacher.', 'friend', ['freind', 'frend', 'friand']),
  spell('Please ___ me with this bag.', 'help', ['halp', 'hepl', 'helpe']),
  spell('The ___ is shining today.', 'sun', ['son', 'sunn', 'san']),
  spell('Ada ___ her book under the bed.', 'found', ['faund', 'fownd', 'foud']),
  spell('We play football after ___.', 'school', ['scool', 'skool', 'shool']),
  spell('___ is your name?', 'What', ['Wat', 'Whot', 'Waht']),
  spell('I can see ___ birds in the tree.', 'three', ['tree', 'thre', 'threee']),
  spell('Musa drank a cup of ___.', 'water', ['warter', 'watar', 'wather']),
  spell('The baby is ___ now.', 'sleeping', ['sleping', 'sleepin', 'slepping']),
  spell('Kofi is my ___ brother.', 'little', ['litle', 'littel', 'lettle'])
];

const SPELL_P5: ListItem[] = [
  spell('It is ___ to drink clean water.', 'necessary', ['neccessary', 'necesary', 'neccesary']),
  spell('Put the books in two ___ piles.', 'separate', ['seperate', 'separete', 'seprate']),
  spell('The ___ built a new road.', 'government', ['goverment', 'governmant', 'govenment']),
  spell('Keep your ___ clean.', 'environment', ['enviroment', 'environmant', 'envirnoment']),
  spell('The second month of the year is ___.', 'February', ['Febuary', 'Febraury', 'Februry']),
  spell('We go to the clinic on ___.', 'Wednesday', ['Wensday', 'Wednsday', 'Wendesday']),
  spell('The flowers are ___.', 'beautiful', ['beautifull', 'beutiful', 'beatiful']),
  spell('My mother runs a small ___.', 'business', ['buisness', 'bussiness', 'busness']),
  spell('Did you ___ my letter?', 'receive', ['recieve', 'receeve', 'resieve']),
  spell('I ___ you are telling the truth.', 'believe', ['beleive', 'belive', 'beleave']),
  spell('These two shirts are ___.', 'different', ['diffrent', 'diferent', 'differant']),
  spell('We borrow books from the ___.', 'library', ['libary', 'librery', 'liberary'])
];

const SPELL_JSS: ListItem[] = [
  spell('The hotel has ___ for forty guests.', 'accommodation', ['accomodation', 'acommodation', 'accommadation']),
  spell('Do not ___ your friend in front of the class.', 'embarrass', ['embarass', 'embarras', 'embbarrass']),
  spell('A wedding is a happy ___.', 'occasion', ['ocassion', 'occassion', 'ocasion']),
  spell('The school ___ meets on Friday.', 'committee', ['commitee', 'comittee', 'committe']),
  spell('I will ___ come to your party.', 'definitely', ['definately', 'definitly', 'defenitely']),
  spell('It is a ___ to serve your country.', 'privilege', ['priviledge', 'privelege', 'privilage']),
  spell('Clap your hands to the ___ of the drum.', 'rhythm', ['rythm', 'rhythem', 'rhytm']),
  spell('His ___ told him to return the money.', 'conscience', ['concience', 'conscence', 'consciense']),
  spell('Her ___ of the word was perfect.', 'pronunciation', ['pronounciation', 'pronunciasion', 'pronuntiation']),
  spell('The car needs regular ___.', 'maintenance', ['maintainance', 'maintenence', 'maintanance']),
  spell('The accident ___ at night.', 'occurred', ['occured', 'ocurred', 'occurrd']),
  spell('Nigeria became ___ in 1960.', 'independent', ['independant', 'indipendent', 'independint'])
];

const OPPOSITES: ListItem[] = [
  pair('hot', 'cold'),
  pair('wet', 'dry'),
  pair('early', 'late'),
  pair('rich', 'poor'),
  pair('strong', 'weak'),
  pair('full', 'empty'),
  pair('heavy', 'light'),
  pair('clean', 'dirty'),
  pair('push', 'pull'),
  pair('buy', 'sell'),
  pair('inside', 'outside'),
  pair('ask', 'answer'),
  pair('day', 'night'),
  pair('remember', 'forget')
];

const SYNONYMS: ListItem[] = [
  pair('big', 'large'),
  pair('begin', 'start'),
  pair('quick', 'fast'),
  pair('quiet', 'silent'),
  pair('shut', 'close'),
  pair('gather', 'collect'),
  pair('brave', 'courageous'),
  pair('tiny', 'small'),
  pair('centre', 'middle'),
  pair('choose', 'select'),
  pair('glad', 'happy'),
  pair('difficult', 'hard'),
  pair('reply', 'answer'),
  pair('wealthy', 'rich')
];

/** 🔴 Each item has its own buttons, with every other preposition that is ALSO right left out (by the gate, cut in two). */
const PREPOSITIONS: ListItem[] = [
  gap('The cup is ___ the table.', 'on', ['on', 'of', 'into', 'at'], 'On a surface: on the table.'),
  gap('Tunde was born ___ 2015.', 'in', ['in', 'on', 'at', 'of'], 'Years and months take in: in 2015, in May.'),
  gap('We will meet ___ Monday.', 'on', ['on', 'in', 'at', 'of'], 'Days take on: on Monday.'),
  gap('School starts ___ eight o’clock.', 'at', ['at', 'in', 'on', 'of'], 'A clock time takes at: at eight o’clock.'),
  gap('The boy jumped ___ the river.', 'into', ['into', 'of', 'at', 'under'], 'Moving to the inside: into.'),
  gap('The cat is hiding ___ the bed.', 'under', ['under', 'of', 'at', 'into']),
  gap('My aunt lives ___ Kano.', 'in', ['in', 'on', 'of', 'into'], 'Towns and countries take in: in Kano.'),
  gap('Wait for me ___ the gate.', 'at', ['at', 'of', 'into', 'on'], 'A meeting point takes at: at the gate.'),
  gap('Ngozi is good ___ drawing.', 'at', ['at', 'of', 'on', 'into'], 'good at, bad at.'),
  gap('He is afraid ___ dogs.', 'of', ['of', 'at', 'on', 'into'], 'afraid of.'),
  gap('Cut the mango ___ two pieces.', 'into', ['into', 'of', 'at', 'on'], 'Divide or cut into parts.'),
  gap('Things Fall Apart was written ___ Chinua Achebe.', 'by', ['by', 'of', 'at', 'on'], 'Who did it, after "was written": by.')
];

const END_MARKS = ['.', '?', '!'];
const PUNCTUATION: ListItem[] = [
  gap('Where are you going ___', '?', END_MARKS, 'A question ends with ?'),
  gap('I am going to the farm ___', '.', END_MARKS, 'A statement ends with a full stop.'),
  gap('What a big snake ___', '!', END_MARKS, 'A sentence said with strong feeling ends with !'),
  gap('Can I borrow your pencil ___', '?', END_MARKS, 'A question ends with ?'),
  gap('My sister likes rice and beans ___', '.', END_MARKS, 'A statement ends with a full stop.'),
  gap('How old are you ___', '?', END_MARKS, 'A question ends with ?'),
  gap('How beautiful this cloth is ___', '!', END_MARKS, 'A sentence said with strong feeling ends with !'),
  gap('The ___ bag is red. (one girl)', 'girl’s', ['girl’s', 'girls’', 'girls', 'girl’'], 'One owner: ’s after the word.'),
  gap('The ___ bags are red. (two girls)', 'girls’', ['girl’s', 'girls’', 'girls', 'girl’'], 'Plural owners ending in s: the apostrophe after the s.'),
  gap('The ___ shoes are by the door. (the children)', 'children’s', ['children’s', 'childrens’', 'childrens', 'children’'], 'A plural without s takes ’s: children’s.'),
  gap('___ raining, so take an umbrella.', 'It’s', ['It’s', 'Its', 'Its’', 'It’'], 'It’s = it is.'),
  gap('The dog wagged ___ tail.', 'its', ['its', 'it’s', 'its’', 'it is'], 'its (no apostrophe) = belonging to it.')
];

const CLASS4 = ['a noun', 'a verb', 'an adjective', 'an adverb'];
const WORD_CLASS: ListItem[] = [
  gap('Kofi ran QUICKLY to school.', 'an adverb', CLASS4, 'It says how he ran: an adverb.'),
  gap('The TALL girl is my sister.', 'an adjective', CLASS4, 'It describes the girl: an adjective.'),
  gap('The GOAT ate the grass.', 'a noun', CLASS4, 'It names a thing: a noun.'),
  gap('We SING in the morning.', 'a verb', CLASS4, 'It is the action: a verb.'),
  gap('Fatu has a RED dress.', 'an adjective', CLASS4, 'It describes the dress: an adjective.'),
  gap('The bus arrived LATE.', 'an adverb', CLASS4, 'It says when it arrived: an adverb.'),
  gap('Lagos is a big CITY.', 'a noun', CLASS4, 'It names a place: a noun.'),
  gap('The children PLAYED football.', 'a verb', CLASS4, 'It is the action: a verb.'),
  gap('She spoke SOFTLY.', 'an adverb', CLASS4, 'It says how she spoke: an adverb.'),
  gap('Her HAPPINESS made us smile.', 'a noun', CLASS4, 'It names a feeling: a noun (happy is the adjective).'),
  gap('The soup is HOT.', 'an adjective', CLASS4, 'It describes the soup: an adjective.'),
  gap('Birds FLY.', 'a verb', CLASS4, 'It is the action: a verb.')
];

const TENSES: ListItem[] = [
  gap('Yesterday we ___ to the market.', 'went', ['went', 'go', 'goes', 'have gone'], 'Yesterday: the past simple, went.'),
  gap('Look! It ___ now.', 'is raining', ['is raining', 'rains', 'rained', 'has rained'], 'Now, happening: the present continuous.'),
  gap('She ___ to school every day.', 'goes', ['goes', 'go', 'going', 'gone'], 'Every day, a habit: the present simple, goes.'),
  gap('I ___ my homework already.', 'have done', ['have done', 'did', 'do', 'am doing'], 'already: the present perfect, have done.'),
  gap('When we arrived, the bus ___ left.', 'had', ['had', 'has', 'have', 'did'], 'Earlier than another past action: the past perfect, had left.'),
  gap('Tomorrow I ___ my grandmother.', 'will visit', ['will visit', 'visited', 'visits', 'have visited'], 'Tomorrow: will.'),
  gap('While Ada was cooking, the light ___ off.', 'went', ['went', 'goes', 'was going', 'has gone'], 'A short action that broke into a longer one: the past simple.'),
  gap('He ___ in Accra since 2020.', 'has lived', ['has lived', 'lives', 'lived', 'is living'], 'since: the present perfect, has lived.'),
  gap('Last week Musa ___ a fish.', 'caught', ['caught', 'catched', 'catches', 'has caught'], 'catch, caught: an irregular past.'),
  gap('Water ___ at 100 °C.', 'boils', ['boils', 'is boiling', 'boiled', 'will boiled'], 'A fact that is always true: the present simple.'),
  gap('We ___ football when it started to rain.', 'were playing', ['were playing', 'played', 'are playing', 'play'], 'The longer action that was going on: the past continuous.'),
  gap('By next year, she ___ school.', 'will have finished', ['will have finished', 'finished', 'has finished', 'finishes'], 'Done before a time in the future: the future perfect.')
];

const IS_ARE = ['is', 'are'];
const HAS_HAVE = ['has', 'have'];
const CONCORD: ListItem[] = [
  gap('The news ___ good.', 'is', IS_ARE, 'news is singular, though it ends in s.'),
  gap('Mathematics ___ my best subject.', 'is', IS_ARE, 'The name of a subject is singular.'),
  gap('One of the girls ___ singing.', 'is', IS_ARE, 'The subject is one, not girls.'),
  gap('Everybody ___ here.', 'is', IS_ARE, 'everybody, everyone, each: singular.'),
  gap('The children ___ playing.', 'are', IS_ARE, 'children is plural.'),
  gap('My trousers ___ torn.', 'are', IS_ARE, 'trousers is always plural.'),
  gap('The scissors ___ sharp.', 'are', IS_ARE, 'scissors is always plural.'),
  gap('A number of pupils ___ absent.', 'are', IS_ARE, 'a number of = many: plural.'),
  gap('The number of pupils ___ forty.', 'is', IS_ARE, 'the number is one number: singular.'),
  gap('Each of the boys ___ a pencil.', 'has', HAS_HAVE, 'each is singular: has.'),
  gap('Ada and Musa ___ a goat.', 'have', HAS_HAVE, 'Two people joined by and: plural.'),
  gap('The furniture ___ new.', 'is', IS_ARE, 'furniture is uncountable: singular.')
];

// ── Basic Science ──────────────────────────────────────────────────────────

const LIVE = ['living', 'non-living'];
const LIVING: ListItem[] = [
  fact('A goat: living or non-living?', 'living', 'bsc-living', LIVE),
  fact('A stone: living or non-living?', 'non-living', 'bsc-living', LIVE),
  fact('A mango tree: living or non-living?', 'living', 'bsc-living', LIVE, 'Plants are living: they feed, grow and make new plants.'),
  fact('Water: living or non-living?', 'non-living', 'bsc-living', LIVE),
  fact('A mushroom: living or non-living?', 'living', 'bsc-living', LIVE),
  fact('A car: living or non-living?', 'non-living', 'bsc-living', LIVE, 'A car moves, but it does not feed, grow or make young.'),
  fact('Fire: living or non-living?', 'non-living', 'bsc-living', LIVE, 'Fire grows and moves, but it does not feed, breathe or reproduce like a living thing.'),
  fact('A cloud: living or non-living?', 'non-living', 'bsc-living', LIVE),
  fact('A chicken: living or non-living?', 'living', 'bsc-living', LIVE),
  fact('A chair: living or non-living?', 'non-living', 'bsc-living', LIVE, 'It was made from wood, but the chair itself does not grow or feed.'),
  fact('Grass: living or non-living?', 'living', 'bsc-living', LIVE),
  fact('An ant: living or non-living?', 'living', 'bsc-living', LIVE)
];

const PLANT_PARTS: ListItem[] = [
  fact('Which part of a plant takes in water from the soil?', 'the roots', 'bsc-plants'),
  fact('Which part of a plant makes its food?', 'the leaves', 'bsc-plants', undefined, 'Leaves use sunlight to make food.'),
  fact('Which part of a plant carries water up from the roots?', 'the stem', 'bsc-plants'),
  fact('Which part of a plant makes the seeds?', 'the flower', 'bsc-plants'),
  fact('Which part of a plant, found inside the fruit, grows into a new plant?', 'the seed', 'bsc-plants', ['the seed', 'the flower', 'the skin of the fruit', 'the juice'], 'Some plants also grow from a piece of stem (cassava) or root (sweet potato).'),
  fact('Which part of a plant holds the seeds inside it?', 'the fruit', 'bsc-plants', undefined, 'An orange, a tomato, a groundnut pod: each is a fruit holding seeds.'),
  fact('Which part of a plant holds it firmly in the ground?', 'the roots', 'bsc-plants'),
  fact('Which part of a plant holds the leaves up to the light?', 'the stem', 'bsc-plants')
];

const GERMS: ListItem[] = [
  fact('When must you wash your hands with soap?', 'after the toilet and before eating', 'who-hands', ['after the toilet and before eating', 'only when they look dirty', 'once a week', 'only after eating']),
  fact('Which insect spreads malaria?', 'the mosquito', 'who-malaria', ['the mosquito', 'the housefly', 'the cockroach', 'the bee']),
  fact('What is the best way to stop mosquitoes biting at night?', 'sleep under a treated net', 'who-malaria', ['sleep under a treated net', 'leave the window open', 'eat more fruit', 'drink cold water']),
  fact('Where do mosquitoes lay their eggs?', 'in standing water', 'who-malaria', ['in standing water', 'in dry sand', 'on tree bark', 'in the clouds'], 'Empty old tins and tyres so water cannot stand in them.'),
  fact('How can you kill the germs in water before you drink it?', 'boil it', 'who-water', ['boil it', 'add sugar', 'leave it in the sun for an hour', 'put it in a cup']),
  fact('Cholera spreads mostly through…', 'dirty water and food', 'who-water', ['dirty water and food', 'mosquito bites', 'sunlight', 'cold weather']),
  fact('How often should you brush your teeth?', 'twice a day', 'who-teeth', ['twice a day', 'once a week', 'only on Sunday', 'never']),
  fact('What causes tooth decay most?', 'too much sugar', 'who-teeth', ['too much sugar', 'drinking water', 'eating vegetables', 'sleeping']),
  fact('How should you cover a cough?', 'with a tissue or your elbow', 'who-cough', ['with a tissue or your elbow', 'with your open hand', 'you do not need to', 'with your friend’s shirt']),
  fact('What does a vaccine do?', 'it helps the body fight a disease', 'who-vaccines', ['it helps the body fight a disease', 'it makes you taller', 'it cleans your teeth', 'it stops you feeling hungry']),
  fact('A child with diarrhoea should be given…', 'ORS (oral rehydration solution)', 'who-ors', ['ORS (oral rehydration solution)', 'nothing to drink', 'only bread', 'sweets'], 'Diarrhoea takes water and salts out of the body; ORS puts them back.')
];

const GROUPS = ['a mammal', 'a bird', 'a reptile', 'an amphibian', 'a fish', 'an insect'];
const ANIMAL_GROUPS: ListItem[] = [
  fact('A bat is…', 'a mammal', 'bsc-animals', GROUPS, 'A bat flies, but it has fur and feeds its young on milk: a mammal.'),
  fact('A whale is…', 'a mammal', 'bsc-animals', GROUPS, 'A whale lives in the sea, but it breathes air and feeds its young on milk: a mammal.'),
  fact('A crocodile is…', 'a reptile', 'bsc-animals', GROUPS),
  fact('A frog is…', 'an amphibian', 'bsc-animals', GROUPS, 'It starts life in water (a tadpole) and lives on land too: an amphibian.'),
  fact('An ostrich is…', 'a bird', 'bsc-animals', GROUPS, 'An ostrich cannot fly, but it has feathers and lays eggs: a bird.'),
  fact('A tilapia is…', 'a fish', 'bsc-animals', GROUPS),
  fact('A snake is…', 'a reptile', 'bsc-animals', GROUPS),
  fact('A housefly is…', 'an insect', 'bsc-animals', GROUPS, 'Six legs and three body parts: an insect.'),
  fact('A goat is…', 'a mammal', 'bsc-animals', GROUPS),
  fact('A butterfly is…', 'an insect', 'bsc-animals', GROUPS),
  fact('A toad is…', 'an amphibian', 'bsc-animals', GROUPS),
  fact('An eagle is…', 'a bird', 'bsc-animals', GROUPS),
  fact('A catfish is…', 'a fish', 'bsc-animals', GROUPS),
  fact('A lizard is…', 'a reptile', 'bsc-animals', GROUPS)
];

const BODY: ListItem[] = [
  fact('Which organ pumps blood round the body?', 'the heart', 'bsc-body'),
  fact('Which organs fill with air when we breathe in?', 'the lungs', 'bsc-body'),
  fact('Which organ controls the whole body?', 'the brain', 'bsc-body'),
  fact('Which organs clean the blood and make urine?', 'the kidneys', 'bsc-body'),
  fact('In which organ is food mixed and broken down after we swallow it?', 'the stomach', 'bsc-body', undefined, 'Down the food pipe (the gullet) into the stomach, then on to the intestines.'),
  fact('Which organ covers the whole body?', 'the skin', 'bsc-body'),
  fact('Which part of the body holds it up and protects the organs?', 'the skeleton', 'bsc-body'),
  fact('Which sense organ do we smell with?', 'the nose', 'bsc-body'),
  fact('Which sense organ do we taste with?', 'the tongue', 'bsc-body'),
  fact('Which sense organ do we hear with?', 'the ears', 'bsc-body')
];

const CLASSES_OF_FOOD = ['carbohydrates', 'proteins', 'fats and oils', 'vitamins'];
const FOOD_GROUPS: ListItem[] = [
  fact('Rice is rich in…', 'carbohydrates', 'bsc-food', CLASSES_OF_FOOD, 'Carbohydrates give us energy.'),
  fact('Beans are rich in…', 'proteins', 'bsc-food', CLASSES_OF_FOOD, 'Proteins build the body.'),
  fact('Palm oil mostly gives us…', 'fats and oils', 'bsc-food', CLASSES_OF_FOOD),
  fact('Oranges are rich in…', 'vitamins', 'bsc-food', CLASSES_OF_FOOD, 'Vitamins keep us healthy.'),
  fact('Yam is rich in…', 'carbohydrates', 'bsc-food', CLASSES_OF_FOOD),
  fact('Fish is rich in…', 'proteins', 'bsc-food', CLASSES_OF_FOOD),
  fact('Eggs are rich in…', 'proteins', 'bsc-food', CLASSES_OF_FOOD),
  fact('Garri is rich in…', 'carbohydrates', 'bsc-food', CLASSES_OF_FOOD),
  fact('Groundnut oil mostly gives us…', 'fats and oils', 'bsc-food', CLASSES_OF_FOOD),
  fact('Carrots and green vegetables are rich in…', 'vitamins', 'bsc-food', CLASSES_OF_FOOD),
  fact('Meat is rich in…', 'proteins', 'bsc-food', CLASSES_OF_FOOD),
  fact('Bread is rich in…', 'carbohydrates', 'bsc-food', CLASSES_OF_FOOD)
];

const STATES = ['a solid', 'a liquid', 'a gas'];
const MATTER: ListItem[] = [
  fact('Water is…', 'a liquid', 'bsc-matter', STATES),
  fact('Ice is…', 'a solid', 'bsc-matter', STATES),
  fact('Steam is…', 'a gas', 'bsc-matter', STATES),
  fact('A stone is…', 'a solid', 'bsc-matter', STATES),
  fact('The air is…', 'a gas', 'bsc-matter', STATES),
  fact('Milk is…', 'a liquid', 'bsc-matter', STATES),
  fact('Salt is…', 'a solid', 'bsc-matter', STATES, 'Each grain keeps its shape: a solid, even when it pours.'),
  fact('Oxygen is…', 'a gas', 'bsc-matter', STATES),
  fact('Honey is…', 'a liquid', 'bsc-matter', STATES, 'It flows slowly, but it takes the shape of its jar: a liquid.'),
  fact('A spoon is…', 'a solid', 'bsc-matter', STATES),
  fact('Kerosene is…', 'a liquid', 'bsc-matter', STATES),
  fact('The bubbles in a fizzy drink are…', 'a gas', 'bsc-matter', STATES)
];

const CHANGE = ['melting', 'freezing', 'evaporation', 'condensation', 'dissolving'];
const CHANGES: ListItem[] = [
  fact('Ice turns into water. This is…', 'melting', 'bsc-matter', CHANGE),
  fact('Water turns into ice. This is…', 'freezing', 'bsc-matter', CHANGE),
  fact('Wet clothes dry in the sun. This is…', 'evaporation', 'bsc-matter', CHANGE, 'The water goes into the air as a gas.'),
  fact('Drops of water form on a cold bottle. This is…', 'condensation', 'bsc-matter', CHANGE, 'Water in the air turns back into a liquid on the cold glass.'),
  fact('Sugar disappears when it is stirred into tea. This is…', 'dissolving', 'bsc-matter', CHANGE, 'The sugar is still there: taste the tea.'),
  fact('Shea butter goes soft and runny in the hot sun. This is…', 'melting', 'bsc-matter', CHANGE),
  fact('Dew forms on the grass early in the morning. This is…', 'condensation', 'bsc-matter', CHANGE),
  fact('A puddle gets smaller on a hot day. This is…', 'evaporation', 'bsc-matter', CHANGE),
  fact('Salt is stirred into water and cannot be seen. This is…', 'dissolving', 'bsc-matter', CHANGE),
  fact('Water put in a freezer becomes hard. This is…', 'freezing', 'bsc-matter', CHANGE)
];

const EARTH_SKY: ListItem[] = [
  fact('The Earth travels round…', 'the Sun', 'bsc-earth', ['the Sun', 'the Moon', 'Mars', 'nothing']),
  fact('How long does the Earth take to go once round the Sun?', 'about a year', 'bsc-earth', ['about a year', 'one day', 'one week', 'one month'], 'About 365¼ days: that is why a leap year adds a day every four years.'),
  fact('Day and night happen because the Earth…', 'spins round', 'bsc-earth', ['spins round', 'goes behind the Moon', 'stops at night', 'moves away from the Sun'], 'The side of the Earth facing the Sun has day.'),
  fact('The Moon shines because…', 'it reflects light from the Sun', 'bsc-earth', ['it reflects light from the Sun', 'it is on fire', 'it is a star', 'it makes its own light']),
  fact('The star closest to the Earth is…', 'the Sun', 'bsc-earth', ['the Sun', 'the Moon', 'the North Star', 'Venus']),
  fact('The Sun rises in the…', 'east', 'bsc-earth', ['east', 'west', 'north', 'south']),
  fact('The dry, dusty wind that blows from the Sahara over West Africa is the…', 'Harmattan', 'bsc-earth', ['Harmattan', 'monsoon', 'hurricane', 'tornado'], 'It blows roughly from November to March.'),
  fact('The planet we live on is…', 'the Earth', 'bsc-earth', ['the Earth', 'the Sun', 'the Moon', 'Mars']),
  fact('The two seasons in most of West Africa are…', 'the rainy season and the dry season', 'bsc-earth', ['the rainy season and the dry season', 'summer and winter', 'spring and autumn', 'the snow season and the hot season']),
  fact('What do we use to measure how hot or cold it is?', 'a thermometer', 'bsc-earth', ['a thermometer', 'a ruler', 'a clock', 'a compass'])
];

const MACHINES: ListItem[] = [
  fact('A see-saw is a…', 'lever', 'bsc-machines', ['lever', 'pulley', 'wedge', 'screw']),
  fact('A ramp for pushing a heavy drum onto a lorry is a kind of…', 'inclined plane', 'bsc-machines', ['inclined plane', 'lever', 'pulley', 'screw']),
  fact('The handle you turn to wind a bucket up a well is a…', 'wheel and axle', 'bsc-machines', ['wheel and axle', 'wedge', 'screw', 'inclined plane']),
  fact('A wheel at the top of a well, with a rope over it for the bucket, is a…', 'pulley', 'bsc-machines', ['pulley', 'lever', 'wedge', 'inclined plane']),
  fact('The blade of an axe is a…', 'wedge', 'bsc-machines', ['wedge', 'pulley', 'lever', 'screw']),
  fact('A bottle top that you twist on and off uses a…', 'screw', 'bsc-machines', ['screw', 'pulley', 'wedge', 'lever']),
  fact('A wheelbarrow is a kind of…', 'lever', 'bsc-machines', ['lever', 'pulley', 'wedge', 'screw'], 'The wheel is the turning point; the load sits between it and your hands.'),
  fact('A magnet pulls (attracts)…', 'an iron nail', 'bsc-machines', ['an iron nail', 'a plastic spoon', 'a piece of wood', 'a rubber band']),
  fact('Two north poles of magnets brought together…', 'push apart', 'bsc-machines', ['push apart', 'pull together', 'do nothing', 'get hot'], 'Like poles repel.'),
  fact('A north pole and a south pole brought together…', 'pull together', 'bsc-machines', ['pull together', 'push apart', 'do nothing', 'get hot'], 'Unlike poles attract.'),
  fact('A simple machine makes work…', 'easier', 'bsc-machines', ['easier', 'harder', 'impossible', 'slower to start'])
];

const CELLS_LIFE: ListItem[] = [
  fact('The smallest unit of life is the…', 'cell', 'bsc-cells', ['cell', 'organ', 'atom', 'tissue']),
  fact('The part of a cell that controls it is the…', 'nucleus', 'bsc-cells', ['nucleus', 'cell wall', 'cytoplasm', 'membrane']),
  fact('Plant cells have something that animal cells do not:', 'a cell wall', 'bsc-cells', ['a cell wall', 'a nucleus', 'cytoplasm', 'a membrane'], 'Plant cells also have chloroplasts.'),
  fact('Plants make food from sunlight, water and carbon dioxide. This is…', 'photosynthesis', 'bsc-cells', ['photosynthesis', 'respiration', 'digestion', 'evaporation']),
  fact('The green substance in leaves that traps sunlight is…', 'chlorophyll', 'bsc-cells', ['chlorophyll', 'starch', 'oxygen', 'sap']),
  fact('In daylight, green plants give out more of this gas than they take in:', 'oxygen', 'bsc-cells', ['oxygen', 'carbon dioxide', 'smoke', 'nitrogen']),
  fact('We breathe out more of this gas than we breathe in:', 'carbon dioxide', 'bsc-cells', ['carbon dioxide', 'oxygen', 'hydrogen', 'helium']),
  fact('Blood vessels that carry blood away from the heart are…', 'arteries', 'bsc-cells', ['arteries', 'veins', 'nerves', 'muscles']),
  fact('Blood vessels that carry blood back to the heart are…', 'veins', 'bsc-cells', ['veins', 'arteries', 'nerves', 'bones']),
  fact('Red blood cells carry…', 'oxygen', 'bsc-cells', ['oxygen', 'food only', 'urine', 'germs']),
  fact('White blood cells…', 'fight germs', 'bsc-cells', ['fight germs', 'carry oxygen', 'make bones', 'digest food'])
];

// ── The skills ──────────────────────────────────────────────────────────────

export type Level = 'P3' | 'P4' | 'P5' | 'P6' | 'JSS1' | 'JSS2' | 'JSS3';

/** A `generator: "list"` skill: its items, and the words it asks them with. Also used by tpl013Reasoning.ts and tpl013Geography.ts. */
export function bank(
  id: string,
  level: Level,
  subject: 'english' | 'science' | 'reasoning' | 'geography',
  topic: string,
  diff: number,
  name: { en: string; fr: string },
  strategy: { en: string; fr: string },
  items: ReadonlyArray<ListItem>,
  ask?: { en: string; fr: string }
): Skill {
  return {
    id,
    level: level as unknown as Skill['level'],
    strand: 'facts',
    subject: subject as unknown as Skill['subject'],
    topic,
    generator: 'list',
    params: { items, ...(ask ? { ask } : {}) } as unknown as Record<string, unknown>,
    answer: 'options',
    fluentMs: 10000,
    diff,
    name,
    strategy,
    teach: ''
  };
}

const ASK_GAP = s('Fill the gap:', 'Complète :');
const ASK_SPELL = s('Which spelling is right?', 'Quelle orthographe est juste ?');
const ASK_OPPOSITE = s('The opposite of', 'Le contraire de');
const ASK_SAME = s('A word that means the same as', 'Un mot qui veut dire la même chose que');
const ASK_CLASS = s('In this sentence, the word in capitals is…', 'Dans cette phrase, le mot en majuscules est…');
const ASK_END = s('Which mark, or which word, fills the gap?', 'Quel signe, ou quel mot, va dans le trou ?');

export const BANK_TOPICS = [
  { id: 'sc-spelling', subject: 'english', name: { en: 'Spelling', fr: 'Orthographe' } },
  { id: 'sc-words', subject: 'english', name: { en: 'Opposites and meanings', fr: 'Contraires et sens' } },
  { id: 'sc-grammar', subject: 'english', name: { en: 'Grammar and punctuation', fr: 'Grammaire et ponctuation' } },
  { id: 'sc-life', subject: 'science', name: { en: 'Living things', fr: 'Les êtres vivants' } },
  { id: 'sc-health', subject: 'science', name: { en: 'The body and health', fr: 'Le corps et la santé' } },
  { id: 'sc-matter-energy', subject: 'science', name: { en: 'Matter, machines and magnets', fr: 'Matière, machines et aimants' } },
  { id: 'sc-earth', subject: 'science', name: { en: 'The Earth and the sky', fr: 'La Terre et le ciel' } }
] as const;

export const BANK_SKILLS: ReadonlyArray<Skill> = [
  // English
  bank('sc-spell-p3', 'P3', 'english', 'sc-spelling', 0.2, s('Spelling: everyday words', 'Orthographe : mots de tous les jours'), s('Say the word slowly and hear every sound.', 'Dis le mot lentement et écoute chaque son.'), SPELL_P3, ASK_SPELL),
  bank('sc-opposites', 'P3', 'english', 'sc-words', 0.2, s('Opposites', 'Les contraires'), s('An opposite means the other end: hot ↔ cold.', 'Un contraire, c’est l’autre bout : hot ↔ cold.'), OPPOSITES, ASK_OPPOSITE),
  bank('sc-prepositions', 'P4', 'english', 'sc-grammar', 0.4, s('in, on, at and other little words', 'in, on, at et les autres petits mots'), s('Times: at 8 o’clock, on Monday, in May.', 'Le temps : at 8 o’clock, on Monday, in May.'), PREPOSITIONS, ASK_GAP),
  bank('sc-punctuation', 'P4', 'english', 'sc-grammar', 0.4, s('Punctuation and apostrophes', 'Ponctuation et apostrophes'), s('A question ends with a question mark. One owner: girl’s. Many ending in s: girls’.', 'Une question finit par un point d’interrogation. Un possesseur : girl’s. Plusieurs, finissant par s : girls’.'), PUNCTUATION, ASK_END),
  bank('sc-spell-p5', 'P5', 'english', 'sc-spelling', 0.4, s('Spelling: harder words', 'Orthographe : mots plus difficiles'), s('Find the tricky part: separate has “a rat” in it.', 'Trouve le piège : separate contient « a rat ».'), SPELL_P5, ASK_SPELL),
  bank('sc-synonyms', 'P5', 'english', 'sc-words', 0.4, s('Words that mean the same', 'Les synonymes'), s('Try the new word in the sentence: does it still mean the same?', 'Essaie le mot dans la phrase : le sens est-il le même ?'), SYNONYMS, ASK_SAME),
  bank('sc-word-class', 'P5', 'english', 'sc-grammar', 0.5, s('Nouns, verbs, adjectives, adverbs', 'Noms, verbes, adjectifs, adverbes'), s('Noun: a name. Verb: an action. Adjective: describes a noun. Adverb: how, when or where.', 'Nom : un nom. Verbe : une action. Adjectif : décrit un nom. Adverbe : comment, quand ou où.'), WORD_CLASS, ASK_CLASS),
  bank('sc-tenses', 'P6', 'english', 'sc-grammar', 0.5, s('Tenses', 'Les temps'), s('Look for the time word: yesterday, now, every day, already, since, tomorrow.', 'Cherche le mot de temps : yesterday, now, every day, already, since, tomorrow.'), TENSES, ASK_GAP),
  bank('sc-spell-jss', 'JSS1', 'english', 'sc-spelling', 0.5, s('Spelling: words people get wrong', 'Orthographe : les mots souvent mal écrits'), s('Double letters: accommodation has two c’s and two m’s.', 'Les lettres doubles : accommodation a deux c et deux m.'), SPELL_JSS, ASK_SPELL),
  bank('sc-concord', 'JSS1', 'english', 'sc-grammar', 0.6, s('Subject and verb agree', 'L’accord sujet-verbe'), s('Find the real subject first: one of the girls IS.', 'Trouve d’abord le vrai sujet : one of the girls IS.'), CONCORD, ASK_GAP),
  // Basic Science
  bank('sc-living', 'P3', 'science', 'sc-life', 0.2, s('Living and non-living', 'Vivant ou non vivant'), s('Living things feed, breathe, grow and make young.', 'Les êtres vivants se nourrissent, respirent, grandissent et se reproduisent.'), LIVING),
  bank('sc-plant-parts', 'P3', 'science', 'sc-life', 0.3, s('Parts of a plant', 'Les parties d’une plante'), s('Roots drink, the stem carries, leaves make food, flowers make seeds.', 'Les racines boivent, la tige transporte, les feuilles font la nourriture, les fleurs font les graines.'), PLANT_PARTS),
  bank('sc-germs', 'P3', 'science', 'sc-health', 0.3, s('Staying healthy', 'Rester en bonne santé'), s('Soap, clean water, a net at night, and a brush twice a day.', 'Du savon, de l’eau propre, une moustiquaire la nuit et une brosse deux fois par jour.'), GERMS),
  bank('sc-animal-groups', 'P4', 'science', 'sc-life', 0.4, s('Animal groups', 'Les groupes d’animaux'), s('Fur and milk: mammal. Feathers: bird. Dry scales: reptile. Six legs: insect.', 'Poils et lait : mammifère. Plumes : oiseau. Écailles sèches : reptile. Six pattes : insecte.'), ANIMAL_GROUPS),
  bank('sc-body', 'P4', 'science', 'sc-health', 0.4, s('The body’s organs', 'Les organes du corps'), s('Heart pumps, lungs breathe, brain controls, kidneys clean.', 'Le cœur pompe, les poumons respirent, le cerveau commande, les reins nettoient.'), BODY),
  bank('sc-food-groups', 'P4', 'science', 'sc-health', 0.4, s('Classes of food', 'Les groupes d’aliments'), s('Energy: carbohydrates. Building: proteins. Protection: vitamins.', 'L’énergie : les glucides. La croissance : les protéines. La protection : les vitamines.'), FOOD_GROUPS),
  bank('sc-matter', 'P4', 'science', 'sc-matter-energy', 0.3, s('Solids, liquids and gases', 'Solides, liquides et gaz'), s('A solid keeps its shape, a liquid takes its container’s, a gas fills it.', 'Un solide garde sa forme, un liquide prend celle du récipient, un gaz le remplit.'), MATTER),
  bank('sc-changes', 'P5', 'science', 'sc-matter-energy', 0.5, s('Melting, freezing, evaporation…', 'Fusion, solidification, évaporation…'), s('Heat melts and evaporates; cold freezes and condenses.', 'La chaleur fait fondre et évaporer ; le froid solidifie et condense.'), CHANGES),
  bank('sc-earth-sky', 'P5', 'science', 'sc-earth', 0.4, s('The Sun, the Moon and the seasons', 'Le Soleil, la Lune et les saisons'), s('The Earth spins once a day and goes round the Sun once a year.', 'La Terre tourne sur elle-même en un jour et autour du Soleil en un an.'), EARTH_SKY),
  bank('sc-machines', 'P6', 'science', 'sc-matter-energy', 0.5, s('Simple machines and magnets', 'Machines simples et aimants'), s('Lever, pulley, wedge, screw, inclined plane, wheel and axle. Like poles repel.', 'Levier, poulie, coin, vis, plan incliné, treuil. Les pôles de même nom se repoussent.'), MACHINES),
  bank('sc-cells-life', 'JSS1', 'science', 'sc-life', 0.6, s('Cells, photosynthesis and the blood', 'Cellules, photosynthèse et sang'), s('Arteries Away from the heart; veins back to it.', 'Les artères partent du cœur ; les veines y reviennent.'), CELLS_LIFE)
];
