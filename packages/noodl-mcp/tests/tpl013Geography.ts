/**
 * TPL-013 SC-4 — Star Class's fourth bank: Africa and world geography, under a 🌍 Geography subject, P4 to JSS3.
 *
 * The subjects briefing (`tpl-013-subjects-briefing.md` §2, §7) ranks it fourth: every system's Social Studies teaches it and
 * every exam sets it (LPSCE, BECE, NCEE, KPSEA, KJSEA), and its facts are atomic. §3 lists what to write once for every
 * country: countries, capitals, flags, the big rivers and lakes, deserts, mountains, regions, oceans and continents. Local
 * geography (states, regions, counties) is per country and waits for SC-7.
 *
 * | skill | class | the question |
 * |---|---|---|
 * | `geo-continents` | P4 | continents, oceans and the seas around Africa |
 * | `geo-regions` | P4 | a country; West, East, North, Southern or Central Africa (the UN's regions) |
 * | `geo-flags` | P4 | a flag; its country (the wrong buttons are the other flags' countries) |
 * | `geo-maps` | P4 | the compass points, a key, a scale, a globe, an atlas |
 * | `geo-capitals-west` | P5 | a West African country; its capital |
 * | `geo-rivers` | P5 | the Nile, the Niger and the Benue, the Congo, the Zambezi, the big lakes |
 * | `geo-capitals-africa` | P6 | an African country beyond the west; its capital |
 * | `geo-landforms` | P6 | deserts, mountains, the harmattan, the Sahel, the Rift Valley; plateau, delta, peninsula |
 * | `geo-capitals-world` | JSS1 | a country beyond Africa; its capital |
 * | `geo-resources` | JSS2 | what a place grows, mines or makes |
 * | `geo-latlong` | JSS3 | latitude, longitude, the Equator and the Prime Meridian, and time |
 *
 * 🔴 **§2.2.4's traps are not set.** No question asks how many countries Africa has (54 or 55 depends on who counts). The
 * capitals with a twist are asked with the twist in the note, as the briefing says: Nigeria (Abuja since 1991; Lagos before),
 * Côte d'Ivoire (Yamoussoukro; Abidjan), Benin (Porto-Novo; Cotonou), Tanzania (Dodoma; Dar es Salaam). South Africa (three
 * capitals), Burundi, Eswatini, Equatorial Guinea and Egypt (in transition) are not asked at all, and no question is about a
 * war. No superlative that goes stale (populations, "the longest river in the world"): "the Nile is Africa's longest" and
 * "the Sahara is the largest hot desert" are the safe ones. Nothing is "discovered".
 *
 * 🔴 **Every item names its source** ({@link GEO_SOURCES}): a reference a reader can open and check the fact in.
 *
 * @module noodl-mcp/tests/tpl013Geography
 */
import type { Skill } from './tpl007Curriculum';
import type { ListItem } from './tpl007Subjects';
import { bank, fact, s } from './tpl013Banks';

/** Where each fact can be checked. Public-domain and CC0 sources first (briefing §6), then an encyclopaedia's named entries. */
export const GEO_SOURCES: Readonly<Record<string, string>> = {
  'geo-world': 'National Geographic Education, encyclopedic entries "Continent" and "Ocean": seven continents as English-speaking schools count them (some count five or six), the Pacific the largest ocean, Asia the largest continent and Africa the second',
  'geo-m49': 'UN Statistics Division, "Standard country or area codes for statistical use (M49)": the sub-regions Western, Eastern, Northern, Southern and Middle Africa ("Central Africa" in school books)',
  'geo-flags': 'Unicode CLDR: a flag emoji is its country\'s ISO 3166-1 code (🇳🇬 = NG, Nigeria); each flag as Encyclopaedia Britannica\'s "flag of …" entry describes it',
  'geo-maps': 'Map skills as primary Social Studies teaches them (briefing §3: maps): the compass points, a key (legend), a scale; the Sun rises in the east and sets in the west',
  'geo-capitals': 'Wikidata property P36 "capital" (CC0) and each country\'s Encyclopaedia Britannica entry; the notes on the twists from the briefing §4. (The CIA World Factbook closed on 4 February 2026, so it is not cited.)',
  'geo-rivers': 'Encyclopaedia Britannica, entries "Nile River", "Niger River", "Benue River", "Congo River", "Zambezi River", "Victoria Falls", "Lake Victoria", "Lake Chad", "Lake Volta"',
  'geo-landforms': 'Encyclopaedia Britannica, entries "Sahara", "Kalahari", "Kilimanjaro", "Great Rift Valley", "harmattan", "Sahel", "savanna", "Atlas Mountains", "Madagascar"; plateau, delta and peninsula as school geography defines them',
  'geo-resources': 'Encyclopaedia Britannica, the "Economy" sections of Nigeria, Côte d\'Ivoire, Ghana, Zambia, DR Congo, Botswana, Kenya, Liberia, Egypt and Senegal, and the entries "Gold Coast", "Jos Plateau", "Harbel", "Copperbelt", "Aswan High Dam"',
  'geo-latlong': 'Encyclopaedia Britannica, entries "latitude and longitude", "Equator", "prime meridian" (0°: Greenwich, and in Africa Algeria, Mali, Burkina Faso, Togo and Ghana), "Tropic of Cancer", "time zone" (360° in 24 hours: 15° an hour); Ghana is on GMT and Nigeria one hour ahead (West Africa Time)'
};

const OCEANS = ['the Atlantic Ocean', 'the Indian Ocean', 'the Pacific Ocean', 'the Arctic Ocean'];
const CONTINENTS: ListItem[] = [
  fact('Nigeria is in the continent of…', 'Africa', 'geo-world', ['Africa', 'Asia', 'Europe', 'South America']),
  fact('The ocean along Africa’s west coast is…', 'the Atlantic Ocean', 'geo-world', OCEANS),
  fact('The ocean along Africa’s east coast is…', 'the Indian Ocean', 'geo-world', OCEANS),
  fact('The biggest ocean in the world is…', 'the Pacific Ocean', 'geo-world', OCEANS),
  fact('The biggest continent is…', 'Asia', 'geo-world', ['Asia', 'Africa', 'Europe', 'Australia']),
  fact('The second biggest continent is…', 'Africa', 'geo-world', ['Africa', 'Europe', 'Australia', 'South America']),
  fact('The sea between Africa and Europe is…', 'the Mediterranean Sea', 'geo-world', ['the Mediterranean Sea', 'the Red Sea', 'the Caribbean Sea', 'the North Sea']),
  fact('The sea between Africa and Arabia is…', 'the Red Sea', 'geo-world', ['the Red Sea', 'the Mediterranean Sea', 'the Caribbean Sea', 'the North Sea']),
  fact('The icy continent around the South Pole is…', 'Antarctica', 'geo-world', ['Antarctica', 'Europe', 'Asia', 'Australia']),
  fact('In English-speaking schools, the number of continents is…', '7', 'geo-world', ['7', '4', '9', '12'], 'Some countries count 5 or 6: the Americas as one, or Europe and Asia as one.'),
  fact('Brazil is in…', 'South America', 'geo-world', ['South America', 'Africa', 'Asia', 'Europe']),
  fact('Japan is in…', 'Asia', 'geo-world', ['Asia', 'Europe', 'Africa', 'South America'])
];

const REGIONS = ['West Africa', 'East Africa', 'North Africa', 'Southern Africa', 'Central Africa'];
const region = (country: string, a: string) => fact(country, a, 'geo-m49', REGIONS);
const AFRICA_REGIONS: ListItem[] = [
  region('Nigeria', 'West Africa'),
  region('Ghana', 'West Africa'),
  region('Liberia', 'West Africa'),
  region('Senegal', 'West Africa'),
  region('Mali', 'West Africa'),
  region('Kenya', 'East Africa'),
  region('Uganda', 'East Africa'),
  region('Ethiopia', 'East Africa'),
  region('Rwanda', 'East Africa'),
  region('Egypt', 'North Africa'),
  region('Morocco', 'North Africa'),
  region('Algeria', 'North Africa'),
  region('Botswana', 'Southern Africa'),
  region('Namibia', 'Southern Africa'),
  region('Lesotho', 'Southern Africa'),
  region('DR Congo', 'Central Africa'),
  region('Gabon', 'Central Africa')
];

/** A flag and its country; the wrong buttons are the other flags' countries. */
const flag = (emoji: string, country: string, note?: string) => fact(emoji, country, 'geo-flags', undefined, note);
const FLAGS: ListItem[] = [
  flag('🇳🇬', 'Nigeria', 'Green, white, green.'),
  flag('🇬🇭', 'Ghana', 'Red, gold and green, with a black star.'),
  flag('🇱🇷', 'Liberia', 'Red and white stripes, and one white star on blue.'),
  flag('🇸🇱', 'Sierra Leone', 'Green, white and blue.'),
  flag('🇸🇳', 'Senegal', 'Green, yellow and red, with a green star.'),
  flag('🇨🇮', 'Côte d’Ivoire', 'Orange, white, green.'),
  flag('🇰🇪', 'Kenya', 'Black, red and green, with a shield and two spears.'),
  flag('🇿🇦', 'South Africa', 'A Y shape in green.'),
  flag('🇪🇬', 'Egypt', 'Red, white and black, with a golden eagle.'),
  flag('🇨🇲', 'Cameroon', 'Green, red and yellow, with a yellow star.'),
  flag('🇲🇱', 'Mali', 'Green, yellow, red. Guinea has the same colours the other way round.'),
  flag('🇬🇳', 'Guinea', 'Red, yellow, green. Mali has the same colours the other way round.'),
  flag('🇪🇹', 'Ethiopia', 'Green, yellow and red, with a blue circle and a star.'),
  flag('🇹🇬', 'Togo', 'Green and yellow stripes, and a white star on red.')
];

const POINTS = ['north', 'south', 'east', 'west'];
const MAPS: ListItem[] = [
  fact('The Sun rises in the…', 'east', 'geo-maps', POINTS),
  fact('The Sun sets in the…', 'west', 'geo-maps', POINTS),
  fact('Face north. Your right hand points…', 'east', 'geo-maps', POINTS),
  fact('On most maps, the top of the map is…', 'north', 'geo-maps', POINTS),
  fact('The opposite of north-east is…', 'south-west', 'geo-maps', ['south-west', 'south-east', 'north-west', 'west']),
  fact('Halfway between north and west is…', 'north-west', 'geo-maps', ['north-west', 'north-east', 'south-west', 'south-east']),
  fact('The box that says what a map’s signs mean is the…', 'key', 'geo-maps', ['key', 'scale', 'title', 'compass'], 'Some books call it the legend.'),
  fact('The part of a map that says how far 1 cm is on the ground is the…', 'scale', 'geo-maps', ['scale', 'key', 'title', 'border']),
  fact('A drawing of a small place, like your school, seen from above, is a…', 'plan', 'geo-maps', ['plan', 'globe', 'atlas', 'compass']),
  fact('We call a round model of the Earth…', 'globe', 'geo-maps', ['globe', 'atlas', 'plan', 'compass']),
  fact('The name for a book of maps is…', 'atlas', 'geo-maps', ['atlas', 'globe', 'diary', 'dictionary']),
  fact('The tool that shows which way is north is a…', 'compass', 'geo-maps', ['compass', 'ruler', 'scale', 'globe'])
];

/** A country and its capital; the wrong buttons are the other items' capitals. */
const capital = (country: string, city: string, note?: string) => fact(country, city, 'geo-capitals', undefined, note);
const CAPITALS_WEST: ListItem[] = [
  capital('Nigeria', 'Abuja', 'Abuja since 1991. Lagos was the capital before, and is still the biggest city.'),
  capital('Ghana', 'Accra'),
  capital('Liberia', 'Monrovia'),
  capital('Sierra Leone', 'Freetown'),
  capital('Senegal', 'Dakar'),
  capital('Mali', 'Bamako'),
  capital('Niger', 'Niamey'),
  capital('Burkina Faso', 'Ouagadougou'),
  capital('Togo', 'Lomé'),
  capital('Guinea', 'Conakry'),
  capital('The Gambia', 'Banjul'),
  capital('Côte d’Ivoire', 'Yamoussoukro', 'Yamoussoukro is the official capital. Abidjan is the biggest city, and much of the government works there.'),
  capital('Benin', 'Porto-Novo', 'Porto-Novo is the official capital. Much of the government works in Cotonou.'),
  capital('Mauritania', 'Nouakchott'),
  capital('Cabo Verde', 'Praia', 'Cabo Verde is also called Cape Verde.')
];

const CAPITALS_AFRICA: ListItem[] = [
  capital('Kenya', 'Nairobi'),
  capital('Ethiopia', 'Addis Ababa'),
  capital('Uganda', 'Kampala'),
  capital('Rwanda', 'Kigali'),
  capital('Tanzania', 'Dodoma', 'Dodoma is the capital. Dar es Salaam, the biggest city, was the capital before.'),
  capital('Cameroon', 'Yaoundé', 'Not Douala, the big port city.'),
  capital('DR Congo', 'Kinshasa'),
  capital('Morocco', 'Rabat', 'Not Casablanca, the biggest city.'),
  capital('Algeria', 'Algiers'),
  capital('Zambia', 'Lusaka'),
  capital('Zimbabwe', 'Harare'),
  capital('Botswana', 'Gaborone'),
  capital('Angola', 'Luanda'),
  capital('Namibia', 'Windhoek'),
  capital('Mozambique', 'Maputo'),
  capital('Malawi', 'Lilongwe')
];

const CAPITALS_WORLD: ListItem[] = [
  capital('the United Kingdom', 'London'),
  capital('France', 'Paris'),
  capital('the United States', 'Washington, D.C.', 'Not New York, the biggest city.'),
  capital('China', 'Beijing'),
  capital('India', 'New Delhi'),
  capital('Brazil', 'Brasília', 'Not Rio de Janeiro, the capital until 1960.'),
  capital('Japan', 'Tokyo'),
  capital('Saudi Arabia', 'Riyadh'),
  capital('Canada', 'Ottawa', 'Not Toronto, the biggest city.'),
  capital('Australia', 'Canberra', 'Not Sydney or Melbourne, the two biggest cities.'),
  capital('Germany', 'Berlin'),
  capital('Jamaica', 'Kingston'),
  capital('Argentina', 'Buenos Aires'),
  capital('Russia', 'Moscow')
];

const RIVERS: ListItem[] = [
  fact('Africa’s longest river is the…', 'Nile', 'geo-rivers', ['Nile', 'Niger', 'Congo', 'Zambezi']),
  fact('The River Niger begins in the hills of…', 'Guinea', 'geo-rivers', ['Guinea', 'Nigeria', 'Egypt', 'Kenya'], 'It flows through Guinea, Mali and Niger, along Benin’s border, and through Nigeria to the sea.'),
  fact('The River Niger reaches the sea in the…', 'Atlantic Ocean', 'geo-rivers', ['Atlantic Ocean', 'Indian Ocean', 'Mediterranean Sea', 'Red Sea'], 'Through the Niger Delta, into the Gulf of Guinea.'),
  fact('The Nile reaches the sea in the…', 'Mediterranean Sea', 'geo-rivers', ['Mediterranean Sea', 'Atlantic Ocean', 'Red Sea', 'Indian Ocean']),
  fact('The Niger and the Benue meet at…', 'Lokoja', 'geo-rivers', ['Lokoja', 'Lagos', 'Kano', 'Onitsha']),
  fact('The White Nile and the Blue Nile meet at…', 'Khartoum', 'geo-rivers', ['Khartoum', 'Cairo', 'Kampala', 'Addis Ababa']),
  fact('Africa’s largest lake, by area, is Lake…', 'Victoria', 'geo-rivers', ['Victoria', 'Chad', 'Volta', 'Tanganyika']),
  fact('Lake Chad is shared by Chad, Niger, Cameroon and…', 'Nigeria', 'geo-rivers', ['Nigeria', 'Ghana', 'Kenya', 'Mali']),
  fact('Since the 1960s, Lake Chad has…', 'become much smaller', 'geo-rivers', ['become much smaller', 'become much bigger', 'stayed the same', 'turned salty']),
  fact('Victoria Falls (Mosi-oa-Tunya) is on the River…', 'Zambezi', 'geo-rivers', ['Zambezi', 'Nile', 'Niger', 'Congo'], 'Between Zambia and Zimbabwe.'),
  fact('Lake Volta in Ghana was made by…', 'the Akosombo Dam', 'geo-rivers', ['the Akosombo Dam', 'a volcano', 'the sea', 'the Kainji Dam']),
  fact('The River Congo crosses the Equator…', 'twice', 'geo-rivers', ['twice', 'once', 'never', 'four times'])
];

const LANDFORMS: ListItem[] = [
  fact('The largest hot desert in the world is the…', 'Sahara', 'geo-landforms', ['Sahara', 'Kalahari', 'Namib', 'Gobi']),
  fact('The Kalahari Desert is mostly in…', 'Botswana', 'geo-landforms', ['Botswana', 'Nigeria', 'Egypt', 'Ghana'], 'It reaches into Namibia and South Africa too.'),
  fact('Africa’s highest mountain is…', 'Kilimanjaro', 'geo-landforms', ['Kilimanjaro', 'Mount Kenya', 'Mount Cameroon', 'Mount Elgon']),
  fact('Mount Kilimanjaro stands in…', 'Tanzania', 'geo-landforms', ['Tanzania', 'Kenya', 'Uganda', 'Ethiopia'], 'You can see it from Kenya, but it stands in Tanzania.'),
  fact('The dry, dusty wind that blows from the Sahara in December and January is the…', 'harmattan', 'geo-landforms', ['harmattan', 'monsoon', 'hurricane', 'sea breeze']),
  fact('The belt of dry land just south of the Sahara is the…', 'Sahel', 'geo-landforms', ['Sahel', 'Rift Valley', 'Niger Delta', 'Jos Plateau']),
  fact('Grassland with trees here and there is…', 'savanna', 'geo-landforms', ['savanna', 'rainforest', 'desert', 'swamp']),
  fact('Thick forest where it rains in most months is…', 'rainforest', 'geo-landforms', ['rainforest', 'savanna', 'desert', 'Sahel']),
  fact('The long valley where the land is splitting, through East Africa, is the…', 'Great Rift Valley', 'geo-landforms', ['Great Rift Valley', 'Sahel', 'Niger Delta', 'Atlas Mountains']),
  fact('The Atlas Mountains are in…', 'North Africa', 'geo-landforms', ['North Africa', 'West Africa', 'East Africa', 'Southern Africa']),
  fact('Africa’s biggest island is…', 'Madagascar', 'geo-landforms', ['Madagascar', 'Zanzibar', 'Mauritius', 'Bioko']),
  fact('Land with water on three sides is a…', 'peninsula', 'geo-landforms', ['peninsula', 'island', 'plateau', 'delta']),
  fact('High, flat land is a…', 'plateau', 'geo-landforms', ['plateau', 'valley', 'delta', 'coast'], 'Like the Jos Plateau.'),
  fact('Where a river splits into many channels before the sea, it makes a…', 'delta', 'geo-landforms', ['delta', 'plateau', 'valley', 'peninsula'], 'Like the Niger Delta.')
];

const RESOURCES: ListItem[] = [
  fact('Most of Nigeria’s crude oil comes from the…', 'Niger Delta', 'geo-resources', ['Niger Delta', 'Jos Plateau', 'Sahel', 'Lake Chad basin']),
  fact('Côte d’Ivoire and Ghana are known for growing…', 'cocoa', 'geo-resources', ['cocoa', 'wheat', 'tea', 'apples']),
  fact('Zambia and DR Congo mine a lot of…', 'copper', 'geo-resources', ['copper', 'cocoa', 'tea', 'rubber']),
  fact('Botswana is known for mining…', 'diamonds', 'geo-resources', ['diamonds', 'cocoa', 'rubber', 'tea']),
  fact('The highlands of Kenya grow a lot of…', 'tea', 'geo-resources', ['tea', 'cocoa', 'rubber', 'dates']),
  fact('Ghana was once called the Gold Coast because of its…', 'gold', 'geo-resources', ['gold', 'cocoa', 'fish', 'oil']),
  fact('The Jos Plateau in Nigeria is known for mining…', 'tin', 'geo-resources', ['tin', 'gold', 'diamonds', 'copper']),
  fact('At Harbel in Liberia, a huge plantation grows…', 'rubber', 'geo-resources', ['rubber', 'cocoa', 'tea', 'cotton']),
  fact('The Aswan High Dam on the Nile makes electricity for…', 'Egypt', 'geo-resources', ['Egypt', 'Kenya', 'Ghana', 'Mali']),
  fact('Senegal grows a lot of…', 'groundnuts', 'geo-resources', ['groundnuts', 'tea', 'apples', 'coffee']),
  fact('A cash crop is grown mainly to…', 'be sold', 'geo-resources', ['be sold', 'feed the family', 'feed animals', 'make shade'])
];

const LATLONG: ListItem[] = [
  fact('Lines that run east–west round the Earth, saying how far north or south a place is, are lines of…', 'latitude', 'geo-latlong', ['latitude', 'longitude', 'contour', 'scale']),
  fact('Lines that run from the North Pole to the South Pole are lines of…', 'longitude', 'geo-latlong', ['longitude', 'latitude', 'contour', 'scale']),
  fact('The Equator is at latitude…', '0°', 'geo-latlong', ['0°', '90°', '180°', '23½°']),
  fact('The North Pole is at latitude…', '90° N', 'geo-latlong', ['90° N', '0°', '180°', '45° N']),
  fact('The Prime Meridian (0° longitude) passes through Greenwich in London and, in Africa, through…', 'Ghana', 'geo-latlong', ['Ghana', 'Nigeria', 'Kenya', 'Egypt'], 'It passes close to Tema. It also crosses Algeria, Mali, Burkina Faso and Togo.'),
  fact('The Earth turns 360° in 24 hours, so 15° of longitude is…', '1 hour', 'geo-latlong', ['1 hour', '15 hours', '15 minutes', '24 hours']),
  fact('At 0° the Sun’s time is noon. At 15° east it is…', '1 p.m.', 'geo-latlong', ['1 p.m.', '11 a.m.', 'noon', '3 p.m.'], 'East is ahead: the Sun gets there first.'),
  fact('The Equator crosses…', 'Kenya', 'geo-latlong', ['Kenya', 'Nigeria', 'Egypt', 'South Africa']),
  fact('The Tropic of Cancer is about 23½° north of the…', 'Equator', 'geo-latlong', ['Equator', 'North Pole', 'Prime Meridian', 'Tropic of Capricorn']),
  fact('Lagos is at about 6°\u00a0N, 3°\u00a0E. Its latitude is…', '6° N', 'geo-latlong', ['6° N', '3° E', '6° E', '3° N']),
  fact('Nigeria’s clocks are 1 hour ahead of Ghana’s. At 9 a.m. in Accra, in Abuja it is…', '10 a.m.', 'geo-latlong', ['10 a.m.', '8 a.m.', '9 a.m.', '11 a.m.']),
  fact('Places near the Equator are hot all year because the Sun’s rays…', 'come almost straight down', 'geo-latlong', ['come almost straight down', 'are closer to the Moon', 'come from the north', 'are weaker there'])
];

const ASK_REGION = s('Which part of Africa?', 'Quelle partie de l’Afrique ?');
const ASK_FLAG = s('Whose flag is this?', 'À quel pays est ce drapeau ?');
const ASK_CAPITAL = s('The capital of', 'La capitale de');

export const GEO_TOPICS = [
  { id: 'sc-geo-africa', subject: 'geography', name: { en: 'Countries, capitals and flags', fr: 'Pays, capitales et drapeaux' } },
  { id: 'sc-geo-land', subject: 'geography', name: { en: 'Rivers, land and resources', fr: 'Fleuves, reliefs et ressources' } },
  { id: 'sc-geo-maps', subject: 'geography', name: { en: 'Maps and the world', fr: 'Les cartes et le monde' } }
] as const;

export const GEO_SKILLS: ReadonlyArray<Skill> = [
  bank('geo-continents', 'P4', 'geography', 'sc-geo-maps', 0.3, s('Continents and oceans', 'Continents et océans'), s('Africa: the Atlantic to the west, the Indian Ocean to the east.', 'L’Afrique : l’Atlantique à l’ouest, l’océan Indien à l’est.'), CONTINENTS),
  bank('geo-regions', 'P4', 'geography', 'sc-geo-africa', 0.4, s('The regions of Africa', 'Les régions de l’Afrique'), s('Picture the map: the bulge is West, the Horn is East.', 'Pense à la carte : le renflement, c’est l’Ouest ; la Corne, c’est l’Est.'), AFRICA_REGIONS, ASK_REGION),
  bank('geo-flags', 'P4', 'geography', 'sc-geo-africa', 0.3, s('Flags of Africa', 'Drapeaux d’Afrique'), s('Look at the colours in order, then the star or the sign.', 'Regarde les couleurs dans l’ordre, puis l’étoile ou le signe.'), FLAGS, ASK_FLAG),
  bank('geo-maps', 'P4', 'geography', 'sc-geo-maps', 0.3, s('Reading a map', 'Lire une carte'), s('Clockwise from the top: north, east, south, west.', 'Dans le sens des aiguilles d’une montre, depuis le haut : nord, est, sud, ouest.'), MAPS),
  bank('geo-capitals-west', 'P5', 'geography', 'sc-geo-africa', 0.4, s('Capitals of West Africa', 'Capitales d’Afrique de l’Ouest'), s('Say the pair out loud: Ghana, Accra.', 'Dis la paire à voix haute : Ghana, Accra.'), CAPITALS_WEST, ASK_CAPITAL),
  bank('geo-rivers', 'P5', 'geography', 'sc-geo-land', 0.5, s('Rivers and lakes of Africa', 'Fleuves et lacs d’Afrique'), s('The Nile goes north to the Mediterranean; the Niger curves through the west to the Atlantic.', 'Le Nil va au nord vers la Méditerranée ; le Niger fait une courbe à l’ouest jusqu’à l’Atlantique.'), RIVERS),
  bank('geo-capitals-africa', 'P6', 'geography', 'sc-geo-africa', 0.5, s('Capitals of Africa', 'Capitales d’Afrique'), s('The capital is not always the biggest city.', 'La capitale n’est pas toujours la plus grande ville.'), CAPITALS_AFRICA, ASK_CAPITAL),
  bank('geo-landforms', 'P6', 'geography', 'sc-geo-land', 0.5, s('Deserts, mountains and the land', 'Déserts, montagnes et reliefs'), s('In West Africa, from north to south: desert, Sahel, savanna, then forest by the coast.', 'En Afrique de l’Ouest, du nord au sud : désert, Sahel, savane, puis la forêt près de la côte.'), LANDFORMS),
  bank('geo-capitals-world', 'JSS1', 'geography', 'sc-geo-africa', 0.5, s('Capitals of the world', 'Capitales du monde'), s('The capital is not always the biggest city.', 'La capitale n’est pas toujours la plus grande ville.'), CAPITALS_WORLD, ASK_CAPITAL),
  bank('geo-resources', 'JSS2', 'geography', 'sc-geo-land', 0.6, s('What the land gives', 'Ce que la terre donne'), s('Think of the place: the coast, the highlands, the plateau, the delta.', 'Pense au lieu : la côte, les hauts plateaux, le plateau, le delta.'), RESOURCES),
  bank('geo-latlong', 'JSS3', 'geography', 'sc-geo-maps', 0.7, s('Latitude, longitude and time', 'Latitude, longitude et heure'), s('Latitude: north or south of the Equator. Longitude: east or west of Greenwich. 15° = 1 hour.', 'Latitude : au nord ou au sud de l’équateur. Longitude : à l’est ou à l’ouest de Greenwich. 15° = 1 heure.'), LATLONG)
];
