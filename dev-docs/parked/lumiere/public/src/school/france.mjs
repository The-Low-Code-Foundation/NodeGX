// Geography for a child at school in France (round 9). Star Class's geography (rocket.mjs) is about Africa, written for
// Nigerian classrooms; these banks are France, Europe and the world, in the same shape (Rocket School's list items:
// { q, a, opts? , note? }) so Rocket School's own list engine asks them. Years are when the French programme has the
// child meet them; only facts that don't change and nobody argues about.
const item = (q, a, opts, note) => ({ q, a, opts: [a, ...opts], note });

const FRANCE = [
  item('The capital of France is…', 'Paris', ['Lyon', 'Marseille', 'Bordeaux'], 'Paris is the capital and the biggest city of France.'),
  item('The river that flows through Paris is…', 'the Seine', ['the Loire', 'the Rhône', 'the Garonne'], 'The Seine flows through Paris to the sea at Le Havre.'),
  item('The longest river in France is…', 'the Loire', ['the Seine', 'the Rhône', 'the Garonne'], 'The Loire is about 1,000 km long.'),
  item('The mountains between France and Spain are…', 'the Pyrenees', ['the Alps', 'the Vosges', 'the Jura'], 'The Pyrenees run from the Atlantic to the Mediterranean.'),
  item('The highest mountain in France is…', 'Mont Blanc', ['the Puy de Dôme', 'Mont Ventoux', 'the Pic du Midi'], 'Mont Blanc, in the Alps, is about 4,800 m high.'),
  item('The sea on France’s south coast is…', 'the Mediterranean Sea', ['the North Sea', 'the Baltic Sea', 'the Black Sea'], 'Marseille and Nice are on the Mediterranean.'),
  item('The ocean on France’s west coast is…', 'the Atlantic Ocean', ['the Pacific Ocean', 'the Indian Ocean', 'the Arctic Ocean'], 'Brittany and Bordeaux face the Atlantic.'),
  item('France is often called “l’Hexagone” because of its…', 'shape', ['colour', 'flag', 'size'], 'On a map, mainland France has six sides, like a hexagon.'),
  item('The sea between France and England is…', 'the Channel', ['the Mediterranean', 'the Red Sea', 'the Baltic Sea'], 'La Manche: a tunnel runs under it.')
];
const NEIGHBOURS = [
  item('Which country is a neighbour of France?', 'Spain', ['Portugal', 'Poland', 'Greece'], 'France’s neighbours: Belgium, Luxembourg, Germany, Switzerland, Italy, Monaco, Spain and Andorra.'),
  item('Which country is a neighbour of France?', 'Germany', ['Austria', 'Denmark', 'Ireland'], 'France’s neighbours: Belgium, Luxembourg, Germany, Switzerland, Italy, Monaco, Spain and Andorra.'),
  item('Which country is a neighbour of France?', 'Italy', ['Croatia', 'Sweden', 'Hungary'], 'France’s neighbours: Belgium, Luxembourg, Germany, Switzerland, Italy, Monaco, Spain and Andorra.'),
  item('Which country is a neighbour of France?', 'Belgium', ['the Netherlands', 'Norway', 'Czechia'], 'France’s neighbours: Belgium, Luxembourg, Germany, Switzerland, Italy, Monaco, Spain and Andorra.'),
  item('Which country is a neighbour of France?', 'Switzerland', ['Slovenia', 'Finland', 'Romania'], 'France’s neighbours: Belgium, Luxembourg, Germany, Switzerland, Italy, Monaco, Spain and Andorra.'),
  item('Which tiny country is on France’s Mediterranean coast?', 'Monaco', ['Andorra', 'Malta', 'San Marino'], 'Monaco is next to Nice. Andorra is in the Pyrenees.'),
  item('Which tiny country is in the Pyrenees?', 'Andorra', ['Monaco', 'Liechtenstein', 'Luxembourg'], 'Andorra sits between France and Spain, in the mountains.')
];
const CAPITALS = [
  ['Spain', 'Madrid'], ['Italy', 'Rome'], ['Germany', 'Berlin'], ['the United Kingdom', 'London'], ['Belgium', 'Brussels'],
  ['Portugal', 'Lisbon'], ['the Netherlands', 'Amsterdam'], ['Ireland', 'Dublin'], ['Greece', 'Athens'], ['Poland', 'Warsaw'],
  ['Austria', 'Vienna'], ['Sweden', 'Stockholm'], ['Denmark', 'Copenhagen'], ['Norway', 'Oslo']
].map(([country, city]) => ({ q: country, a: city }));
const WORLD = [
  item('The biggest ocean in the world is…', 'the Pacific Ocean', ['the Atlantic Ocean', 'the Indian Ocean', 'the Arctic Ocean'], 'The Pacific is bigger than all the land on Earth put together.'),
  item('The highest mountain in the world is…', 'Mount Everest', ['Mont Blanc', 'Kilimanjaro', 'Mount Fuji'], 'Everest, in the Himalayas, is about 8,850 m high.'),
  item('The imaginary line round the middle of the Earth is…', 'the Equator', ['the Greenwich line', 'the North Pole', 'the horizon'], 'The Equator cuts the Earth into a northern and a southern half.'),
  item('The biggest hot desert in the world is…', 'the Sahara', ['the Gobi', 'the Kalahari', 'the Atacama'], 'The Sahara covers much of North Africa.'),
  item('Martinique and Guadeloupe are French islands in…', 'the Caribbean Sea', ['the Indian Ocean', 'the Pacific Ocean', 'the North Sea'], 'They are in the Antilles, in the Caribbean.'),
  item('La Réunion is a French island in…', 'the Indian Ocean', ['the Caribbean Sea', 'the Mediterranean Sea', 'the Pacific Ocean'], 'La Réunion is east of Madagascar.'),
  item('French Guiana is in…', 'South America', ['Africa', 'Asia', 'Oceania'], 'French Guiana is next to Brazil, in South America.'),
  item('Which continent is France in?', 'Europe', ['Asia', 'Africa', 'America'], 'Mainland France is in western Europe.'),
  item('The coldest continent, around the South Pole, is…', 'Antarctica', ['the Arctic', 'Greenland', 'Siberia'], 'Antarctica is covered in ice. The Arctic, in the north, is mostly frozen sea.')
];

export const FRANCE_TOPICS = [
  { id: 'geo-france', subject: 'geography', name: 'France' },
  { id: 'geo-europe', subject: 'geography', name: 'Europe' },
  { id: 'geo-world', subject: 'geography', name: 'The world' }
];
const bank = (id, year, topic, diff, name, strategy, items, ask) => ({ id, year, subject: 'geography', topic, generator: 'list', params: { items: items.map((it, i) => ({ ...it, id: `${id}-${i}` })), ...(ask ? { ask } : {}) }, diff, name, strategy });
export const FRANCE_SKILLS = [
  bank('fr-geo-france', 'CE2', 'geo-france', 0.3, 'Rivers, seas and mountains of France', 'Picture the map of France: the sea at the bottom, the ocean on the left.', FRANCE),
  bank('fr-geo-neighbours', 'CM1', 'geo-europe', 0.4, 'France’s neighbours', 'Go round the map: Belgium at the top, then Germany, Switzerland, Italy, Spain.', NEIGHBOURS),
  bank('fr-geo-capitals', 'CM2', 'geo-europe', 0.5, 'Capitals of Europe', 'Say the pair out loud: Spain, Madrid.', CAPITALS, 'The capital of'),
  bank('fr-geo-world', '6e', 'geo-world', 0.5, 'Oceans, mountains and the world', 'Picture the globe: the big blue Pacific, the Equator round the middle.', WORLD)
];
