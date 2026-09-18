/**
 * TPL-007 — the curriculum: every skill the game can ask about, every Teach
 * card, every word of the interface, in both languages.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## This file IS the school
 *
 * TPL-006 made a whole product out of one `Static Data` array. This template
 * does it four times over: {@link CURRICULUM} is the skills, {@link TEACH_CARDS}
 * the explainers, {@link WORDS} the interface in EN and FR, {@link WORD_LISTS}
 * the typing words. Each is one `Static Data` node in a `Data/*` component, and
 * adding a skill is adding an entry — the gate proves it by doing it.
 *
 * ## Where the content comes from
 *
 * The levels and their ceilings are the **programmes 2025** (cycle 2 in force
 * 2025, cycle 3 2026): CE2 to 10 000 and both tables both ways; CM1 to 999 999
 * and hundredths; CM2 to 999 999 999 and thousandths; 6e the milliard, ÷ by
 * numbers under 100, fraction as quotient. The research briefing beside the
 * task file cites each one.
 *
 * ## 🔴 The traps are deliberate
 *
 * Richard: *"put in as much stuff as possible that commonly trips up kids"*.
 * Every skill tagged `trap` is built to catch a documented misconception and
 * its wrong-answer options are the misconception's own answers, so a child who
 * holds it picks it, gets the correction, and gets the card:
 *
 * | misconception | skill(s) |
 * |---|---|
 * | 230 million → 200,300,000 (transcoding) | `big-*` dictation |
 * | 0.25 > 0.7 because 25 > 7 (whole-number bias) | `dec-compare-*` |
 * | 1/4 > 1/3 because 4 > 3 | `frac-compare-*` |
 * | 2.5 × 10 = 2.50 ("add a zero") | `dec-pow10` |
 * | 52 − 38 = 26 (smaller-from-larger) | `sub-borrow` |
 * | 3 + 4 × 2 = 14 (left to right) | `order-ops` |
 * | multiplying always makes bigger; dividing always smaller | `mul-small`, `div-small` |
 * | 8 + 4 = □ + 5 → 12 (equals as "the answer is") | `equals-balance` |
 * | 4 372: "the tens digit is 3" (reads position from the left) | `place-value-*` |
 * | 0.125 > 0.5 because it is longer | `dec-compare-*` |
 * | 4.96 rounds to 4.9 or 5.96 | `round-dec` |
 *
 * @module noodl-mcp/tests/tpl007Curriculum
 */

export type Lang = 'en' | 'fr';
export type Level = 'CE2' | 'CM1' | 'CM2' | '6e';
export const LEVELS: ReadonlyArray<Level> = ['CE2', 'CM1', 'CM2', '6e'];

/** A bilingual string. */
export interface Bi {
  en: string;
  fr: string;
}

/**
 * One skill. `generator` names a case in `PICK_QUESTION_SCRIPT`; `params` is
 * what that case reads. `answer` says how the child answers — `typed` (any
 * level) or `options` (four buttons; the level's default is decided per
 * profile, but a skill may insist). `diff` is the skill's difficulty on a 0..1
 * scale within its level, which becomes the item's Elo rating.
 */
export interface Skill {
  id: string;
  level: Level;
  /** `calc` (mental arithmetic), `number` (place value, decimals, fractions), `typing`. */
  strand: 'calc' | 'number' | 'typing';
  generator: string;
  params: Record<string, unknown>;
  answer: 'typed' | 'options' | 'either';
  /** Answers faster than this count as fluent (ms). */
  fluentMs: number;
  diff: number;
  name: Bi;
  /** The one-line strategy shown with a correction. */
  strategy: Bi;
  /** The Teach card this skill opens. */
  teach: string;
  /** Marks a skill built to catch a misconception. */
  trap?: boolean;
}

const s = (en: string, fr: string): Bi => ({ en, fr });

// ── The skills ──────────────────────────────────────────────────────────────

export const CURRICULUM: ReadonlyArray<Skill> = [
  // ═══ CE2 ═══
  {
    id: 'add-to-20', level: 'CE2', strand: 'calc', generator: 'add', params: { min: 2, max: 20, sumMax: 20 }, answer: 'typed', fluentMs: 3000, diff: 0.05,
    name: s('Adding up to 20', 'Additions jusqu’à 20'),
    strategy: s('Make 10 first: 8 + 7 is 8 + 2 + 5.', 'Passe par 10 : 8 + 7, c’est 8 + 2 + 5.'),
    teach: 'bridge-ten'
  },
  {
    id: 'bond-10', level: 'CE2', strand: 'calc', generator: 'bond', params: { target: 10 }, answer: 'typed', fluentMs: 2500, diff: 0.05,
    name: s('Pairs that make 10', 'Les compléments à 10'),
    strategy: s('There are only five pairs: 1+9, 2+8, 3+7, 4+6, 5+5.', 'Il n’y a que cinq paires : 1+9, 2+8, 3+7, 4+6, 5+5.'),
    teach: 'bonds'
  },
  {
    id: 'bond-20', level: 'CE2', strand: 'calc', generator: 'bond', params: { target: 20 }, answer: 'typed', fluentMs: 3000, diff: 0.15,
    name: s('Pairs that make 20', 'Les compléments à 20'),
    strategy: s('To 20 is to 10 with 10 more: 13 needs 7.', 'Comme pour 10, avec 10 de plus : 13 a besoin de 7.'),
    teach: 'bonds'
  },
  {
    id: 'bond-100', level: 'CE2', strand: 'calc', generator: 'bond', params: { target: 100, step: 5 }, answer: 'typed', fluentMs: 4000, diff: 0.3,
    name: s('Pairs that make 100', 'Les compléments à 100'),
    strategy: s('Go to the next ten, then to 100: 35 → 40 → 100 is 5 + 60.', 'Va à la dizaine suivante, puis à 100 : 35 → 40 → 100, c’est 5 + 60.'),
    teach: 'bonds'
  },
  {
    id: 'add-bridge', level: 'CE2', strand: 'calc', generator: 'add', params: { min: 26, max: 89, addMin: 5, addMax: 9, bridge: true }, answer: 'typed', fluentMs: 4000, diff: 0.3,
    name: s('Adding across a ten', 'Additions en passant la dizaine'),
    strategy: s('46 + 8: go to 50 first (4), then 4 more.', '46 + 8 : va d’abord à 50 (4), puis encore 4.'),
    teach: 'bridge-ten'
  },
  {
    id: 'sub-bridge', level: 'CE2', strand: 'calc', generator: 'sub', params: { min: 31, max: 99, subMin: 5, subMax: 9, bridge: true }, answer: 'typed', fluentMs: 4000, diff: 0.35,
    name: s('Taking away across a ten', 'Soustractions en passant la dizaine'),
    strategy: s('63 − 7: go down to 60 first (3), then 4 more.', '63 − 7 : descends d’abord à 60 (3), puis encore 4.'),
    teach: 'bridge-ten'
  },
  {
    id: 'compensation', level: 'CE2', strand: 'calc', generator: 'add', params: { min: 12, max: 80, addChoices: [9, 19, 29, 39], compensation: true }, answer: 'typed', fluentMs: 4000, diff: 0.35,
    name: s('Adding 9, 19, 29, 39', 'Ajouter 9, 19, 29, 39'),
    strategy: s('Add 10 and take 1 back: 46 + 9 = 56 − 1.', 'Ajoute 10 et retire 1 : 46 + 9 = 56 − 1.'),
    teach: 'compensation'
  },
  {
    id: 'sub-compensation', level: 'CE2', strand: 'calc', generator: 'sub', params: { min: 40, max: 99, subChoices: [9, 19, 29, 39], compensation: true }, answer: 'typed', fluentMs: 4000, diff: 0.4,
    name: s('Taking away 9, 19, 29, 39', 'Retirer 9, 19, 29, 39'),
    strategy: s('Take 10 and give 1 back: 73 − 9 = 63 + 1.', 'Retire 10 et rends 1 : 73 − 9 = 63 + 1.'),
    teach: 'compensation'
  },
  ...([2, 3, 4, 5, 10] as const).map((t) => ({
    id: `table-${t}`, level: 'CE2' as Level, strand: 'calc' as const, generator: 'table', params: { table: t, min: 1, max: 10, bothWays: true }, answer: 'typed' as const, fluentMs: 3000, diff: t === 10 ? 0.05 : t === 2 ? 0.1 : t === 5 ? 0.2 : 0.35,
    name: s(`${t} times table`, `Table de ${t}`),
    strategy: t === 2 ? s('Times 2 is doubling.', 'Fois 2, c’est doubler.')
      : t === 4 ? s('Times 4 is double, then double again.', 'Fois 4, c’est doubler, puis doubler encore.')
      : t === 5 ? s('Times 5 is times 10, then half.', 'Fois 5, c’est fois 10, puis la moitié.')
      : t === 10 ? s('Times 10 moves every digit one place left.', 'Fois 10 décale chaque chiffre d’un rang vers la gauche.')
      : s('Times 3 is double, plus one more.', 'Fois 3, c’est le double, plus une fois.'),
    teach: 'tables'
  })),
  ...([6, 7, 8, 9] as const).map((t) => ({
    id: `table-${t}`, level: 'CE2' as Level, strand: 'calc' as const, generator: 'table', params: { table: t, min: 1, max: 10, bothWays: true }, answer: 'typed' as const, fluentMs: 3500, diff: t === 9 ? 0.5 : t === 8 ? 0.6 : 0.7,
    name: s(`${t} times table`, `Table de ${t}`),
    strategy: t === 9 ? s('Times 9 is times 10, minus once: 9 × 7 = 70 − 7.', 'Fois 9, c’est fois 10 moins une fois : 9 × 7 = 70 − 7.')
      : t === 8 ? s('Times 8 is double, double, double.', 'Fois 8, c’est doubler trois fois.')
      : t === 6 ? s('Times 6 is times 5, plus once: 6 × 7 = 35 + 7.', 'Fois 6, c’est fois 5 plus une fois : 6 × 7 = 35 + 7.')
      : s('7 × 8 = 56: five-six-seven-eight.', '7 × 8 = 56 : cinq-six-sept-huit.'),
    teach: 'tables'
  })),
  {
    id: 'double-half', level: 'CE2', strand: 'calc', generator: 'doubleHalf', params: { max: 50 }, answer: 'typed', fluentMs: 3500, diff: 0.25,
    name: s('Doubles and halves', 'Doubles et moitiés'),
    strategy: s('Double the tens, double the ones, add: 36 → 60 + 12.', 'Double les dizaines, double les unités, ajoute : 36 → 60 + 12.'),
    teach: 'tables'
  },
  {
    id: 'pow10-int', level: 'CE2', strand: 'calc', generator: 'pow10', params: { factors: [10, 100], max: 99 }, answer: 'typed', fluentMs: 3500, diff: 0.3,
    name: s('Times 10 and 100', 'Fois 10 et fois 100'),
    strategy: s('Every digit moves one place left per zero: 23 × 100 = 2 300.', 'Chaque chiffre se décale d’un rang par zéro : 23 × 100 = 2 300.'),
    teach: 'pow10'
  },
  {
    id: 'big-10000', level: 'CE2', strand: 'number', generator: 'bigNumber', params: { max: 9999 }, answer: 'typed', fluentMs: 9000, diff: 0.4, trap: true,
    name: s('Numbers to 10 000 in words', 'Nombres jusqu’à 10 000 en lettres'),
    strategy: s('Say the thousands, then the rest: three thousand and forty is 3 040 — the zero holds the hundreds.', 'Dis les mille, puis le reste : trois mille quarante, c’est 3 040 — le zéro tient les centaines.'),
    teach: 'place-value'
  },
  {
    id: 'place-value-4', level: 'CE2', strand: 'number', generator: 'placeValue', params: { max: 9999 }, answer: 'options', fluentMs: 5000, diff: 0.35, trap: true,
    name: s('Which digit is where', 'Quel chiffre à quel rang'),
    strategy: s('Count places from the RIGHT: ones, tens, hundreds, thousands.', 'Compte les rangs depuis la DROITE : unités, dizaines, centaines, milliers.'),
    teach: 'place-value'
  },
  {
    id: 'compare-10000', level: 'CE2', strand: 'number', generator: 'compareInt', params: { max: 9999 }, answer: 'options', fluentMs: 4000, diff: 0.2,
    name: s('Which number is bigger', 'Quel nombre est le plus grand'),
    strategy: s('More digits wins; same digits, compare from the left.', 'Plus de chiffres gagne ; même longueur, compare depuis la gauche.'),
    teach: 'place-value'
  },
  {
    id: 'frac-unit', level: 'CE2', strand: 'number', generator: 'fracCompare', params: { unit: true, denoms: [2, 3, 4, 5, 6, 8, 10] }, answer: 'options', fluentMs: 5000, diff: 0.5, trap: true,
    name: s('Which fraction is bigger (1/n)', 'Quelle fraction est la plus grande (1/n)'),
    strategy: s('More slices means smaller slices: 1/4 is less than 1/3.', 'Plus de parts, des parts plus petites : 1/4 est plus petit que 1/3.'),
    teach: 'fractions'
  },

  // ═══ CM1 ═══
  {
    id: 'tables-mixed', level: 'CM1', strand: 'calc', generator: 'table', params: { table: 0, min: 2, max: 10, bothWays: true, division: true }, answer: 'typed', fluentMs: 3000, diff: 0.3,
    name: s('All the tables, both ways', 'Toutes les tables, dans les deux sens'),
    strategy: s('A division is a table backwards: 56 ÷ 7 asks "7 times what is 56?"', 'Une division, c’est une table à l’envers : 56 ÷ 7 demande « 7 fois combien font 56 ? »'),
    teach: 'tables'
  },
  {
    id: 'pow10-1000', level: 'CM1', strand: 'calc', generator: 'pow10', params: { factors: [10, 100, 1000], max: 999, divide: true }, answer: 'typed', fluentMs: 4000, diff: 0.35,
    name: s('Times and divided by 10, 100, 1000', 'Fois et divisé par 10, 100, 1000'),
    strategy: s('Dividing by 100 moves every digit two places right: 4 500 ÷ 100 = 45.', 'Diviser par 100 décale chaque chiffre de deux rangs vers la droite : 4 500 ÷ 100 = 45.'),
    teach: 'pow10'
  },
  {
    id: 'x4-x8', level: 'CM1', strand: 'calc', generator: 'mulBy', params: { by: [4, 8], min: 11, max: 60 }, answer: 'typed', fluentMs: 5000, diff: 0.45,
    name: s('Times 4 and times 8 by doubling', 'Fois 4 et fois 8 en doublant'),
    strategy: s('26 × 4: double twice — 52, 104.', '26 × 4 : double deux fois — 52, 104.'),
    teach: 'tables'
  },
  {
    id: 'x5', level: 'CM1', strand: 'calc', generator: 'mulBy', params: { by: [5], min: 12, max: 90 }, answer: 'typed', fluentMs: 5000, diff: 0.4,
    name: s('Times 5 the quick way', 'Fois 5, la méthode rapide'),
    strategy: s('Times 5 is times 10, then half: 46 × 5 = 460 ÷ 2 = 230.', 'Fois 5, c’est fois 10 puis la moitié : 46 × 5 = 460 ÷ 2 = 230.'),
    teach: 'tables'
  },
  {
    id: 'sub-borrow', level: 'CM1', strand: 'calc', generator: 'sub', params: { min: 41, max: 99, subMin: 12, subMax: 39, borrow: true }, answer: 'typed', fluentMs: 6000, diff: 0.45, trap: true,
    name: s('Taking away with a carry', 'Soustractions avec retenue'),
    strategy: s('52 − 38: you cannot do 2 − 8, so take 38 to 40 first (2), then 12 more = 14.', '52 − 38 : on ne fait pas 2 − 8 ; monte de 38 à 40 (2), puis 12 de plus = 14.'),
    teach: 'borrow'
  },
  {
    id: 'euclid-1', level: 'CM1', strand: 'calc', generator: 'euclid', params: { divisorMin: 2, divisorMax: 9, dividendMax: 99 }, answer: 'typed', fluentMs: 6000, diff: 0.5,
    name: s('Division with a remainder', 'Division avec reste'),
    strategy: s('47 ÷ 5: 5 × 9 = 45 fits, 2 is left over.', '47 ÷ 5 : 5 × 9 = 45 rentre, il reste 2.'),
    teach: 'euclid'
  },
  {
    id: 'big-999999', level: 'CM1', strand: 'number', generator: 'bigNumber', params: { max: 999999 }, answer: 'typed', fluentMs: 12000, diff: 0.5, trap: true,
    name: s('Numbers to 999 999 in words', 'Nombres jusqu’à 999 999 en lettres'),
    strategy: s('Two blocks of three: THOUSANDS | ones. "Two hundred and five thousand" fills the first block: 205 000.', 'Deux classes de trois : MILLE | unités. « Deux cent cinq mille » remplit la première classe : 205 000.'),
    teach: 'place-value'
  },
  {
    id: 'place-value-6', level: 'CM1', strand: 'number', generator: 'placeValue', params: { max: 999999 }, answer: 'options', fluentMs: 6000, diff: 0.45, trap: true,
    name: s('Which digit is where, to 999 999', 'Quel chiffre à quel rang, jusqu’à 999 999'),
    strategy: s('Read the class first (thousands), then the place inside it.', 'Lis d’abord la classe (mille), puis le rang à l’intérieur.'),
    teach: 'place-value'
  },
  {
    id: 'dec-compare-2', level: 'CM1', strand: 'number', generator: 'decCompare', params: { places: 2 }, answer: 'options', fluentMs: 5000, diff: 0.55, trap: true,
    name: s('Which decimal is bigger (hundredths)', 'Quel décimal est le plus grand (centièmes)'),
    strategy: s('Compare tenths first: 0.7 is 0.70, and 70 hundredths beats 25.', 'Compare d’abord les dixièmes : 0,7 c’est 0,70, et 70 centièmes battent 25.'),
    teach: 'decimals'
  },
  {
    id: 'frac-of', level: 'CM1', strand: 'number', generator: 'fracOf', params: { denoms: [2, 3, 4, 5, 10], max: 60 }, answer: 'typed', fluentMs: 6000, diff: 0.5,
    name: s('A fraction of a number', 'Une fraction d’un nombre'),
    strategy: s('1/4 of 24: divide by 4. 3/4 of 24: divide by 4, times 3.', '1/4 de 24 : divise par 4. 3/4 de 24 : divise par 4, fois 3.'),
    teach: 'fractions'
  },
  {
    id: 'round-int', level: 'CM1', strand: 'number', generator: 'round', params: { to: [10, 100], max: 9999 }, answer: 'typed', fluentMs: 5000, diff: 0.4,
    name: s('Rounding to the nearest 10 or 100', 'Arrondir à la dizaine ou à la centaine'),
    strategy: s('Look at the digit to the right: 5 or more goes up.', 'Regarde le chiffre juste à droite : 5 ou plus, on monte.'),
    teach: 'rounding'
  },
  {
    id: 'equals-balance', level: 'CM1', strand: 'calc', generator: 'balance', params: { max: 20 }, answer: 'typed', fluentMs: 6000, diff: 0.5, trap: true,
    name: s('Both sides of the equals sign', 'Les deux côtés du signe égal'),
    strategy: s('= means "the same as", not "the answer is". 8 + 4 = □ + 5: both sides make 12, so □ is 7.', '= veut dire « pareil que », pas « le résultat est ». 8 + 4 = □ + 5 : les deux côtés font 12, donc □ vaut 7.'),
    teach: 'equals'
  },

  // ═══ CM2 ═══
  {
    id: 'big-999999999', level: 'CM2', strand: 'number', generator: 'bigNumber', params: { max: 999999999 }, answer: 'typed', fluentMs: 15000, diff: 0.6, trap: true,
    name: s('Numbers to 999 999 999 in words', 'Nombres jusqu’à 999 999 999 en lettres'),
    strategy: s('Three blocks: MILLIONS | THOUSANDS | ones. "Two hundred and thirty million" is 230 | 000 | 000 — the empty blocks are all zeros.', 'Trois classes : MILLIONS | MILLE | unités. « Deux cent trente millions », c’est 230 | 000 | 000 — les classes vides sont des zéros.'),
    teach: 'place-value'
  },
  {
    id: 'place-value-9', level: 'CM2', strand: 'number', generator: 'placeValue', params: { max: 999999999 }, answer: 'options', fluentMs: 7000, diff: 0.55, trap: true,
    name: s('Which digit is where, to the millions', 'Quel chiffre à quel rang, jusqu’aux millions'),
    strategy: s('Split into blocks of three from the right, then name the block.', 'Découpe par trois depuis la droite, puis nomme la classe.'),
    teach: 'place-value'
  },
  {
    id: 'dec-compare-3', level: 'CM2', strand: 'number', generator: 'decCompare', params: { places: 3 }, answer: 'options', fluentMs: 5000, diff: 0.6, trap: true,
    name: s('Which decimal is bigger (thousandths)', 'Quel décimal est le plus grand (millièmes)'),
    strategy: s('Longer is not bigger: 0.125 is less than 0.5, because 1 tenth is less than 5 tenths.', 'Plus long n’est pas plus grand : 0,125 est plus petit que 0,5, car 1 dixième vaut moins que 5 dixièmes.'),
    teach: 'decimals'
  },
  {
    id: 'dec-pow10', level: 'CM2', strand: 'calc', generator: 'pow10', params: { factors: [10, 100], decimals: true, divide: true }, answer: 'typed', fluentMs: 5000, diff: 0.55, trap: true,
    name: s('Decimals times and divided by 10, 100', 'Décimaux fois et divisé par 10, 100'),
    strategy: s('Do not "add a zero": 2.5 × 10 = 25. The digits move, the point stays.', 'On n’« ajoute pas un zéro » : 2,5 × 10 = 25. Les chiffres se décalent, la virgule ne bouge pas.'),
    teach: 'pow10'
  },
  {
    id: 'div-4-8', level: 'CM2', strand: 'calc', generator: 'divBy', params: { by: [4, 8], max: 400 }, answer: 'typed', fluentMs: 5000, diff: 0.5,
    name: s('Dividing by 4 and by 8 by halving', 'Diviser par 4 et par 8 en prenant la moitié'),
    strategy: s('÷ 4 is half, then half again: 96 → 48 → 24.', '÷ 4, c’est la moitié, puis encore la moitié : 96 → 48 → 24.'),
    teach: 'tables'
  },
  {
    id: 'x50-x25', level: 'CM2', strand: 'calc', generator: 'mulBy', params: { by: [50, 25], min: 4, max: 48 }, answer: 'typed', fluentMs: 6000, diff: 0.6,
    name: s('Times 50 and times 25', 'Fois 50 et fois 25'),
    strategy: s('× 50 is × 100 then half; × 25 is × 100 then quarter.', '× 50, c’est × 100 puis la moitié ; × 25, c’est × 100 puis le quart.'),
    teach: 'tables'
  },
  {
    id: 'frac-compare', level: 'CM2', strand: 'number', generator: 'fracCompare', params: { unit: false, denoms: [2, 3, 4, 5, 6, 8, 10] }, answer: 'options', fluentMs: 6000, diff: 0.6, trap: true,
    name: s('Which fraction is bigger', 'Quelle fraction est la plus grande'),
    strategy: s('Same bottom: compare tops. Same top: the smaller bottom is bigger. Otherwise compare each to 1/2.', 'Même dénominateur : compare les numérateurs. Même numérateur : le plus petit dénominateur gagne. Sinon compare à 1/2.'),
    teach: 'fractions'
  },
  {
    id: 'frac-dec', level: 'CM2', strand: 'number', generator: 'fracDec', params: {}, answer: 'options', fluentMs: 5000, diff: 0.5,
    name: s('Fractions as decimals', 'Fractions en décimaux'),
    strategy: s('1/2 = 0.5, 1/4 = 0.25, 3/4 = 0.75, 1/10 = 0.1, 1/5 = 0.2.', '1/2 = 0,5 ; 1/4 = 0,25 ; 3/4 = 0,75 ; 1/10 = 0,1 ; 1/5 = 0,2.'),
    teach: 'fractions'
  },
  {
    id: 'percent', level: 'CM2', strand: 'calc', generator: 'percent', params: { ps: [10, 25, 50, 75], max: 200 }, answer: 'typed', fluentMs: 6000, diff: 0.55,
    name: s('Percentages of a number', 'Pourcentages d’un nombre'),
    strategy: s('10% is ÷ 10; 50% is half; 25% is half of half; 75% is three of those quarters.', '10 %, c’est ÷ 10 ; 50 %, la moitié ; 25 %, la moitié de la moitié ; 75 %, trois de ces quarts.'),
    teach: 'fractions'
  },
  {
    id: 'round-dec', level: 'CM2', strand: 'number', generator: 'round', params: { to: [1, 0.1], decimals: true }, answer: 'typed', fluentMs: 6000, diff: 0.55, trap: true,
    name: s('Rounding decimals', 'Arrondir des décimaux'),
    strategy: s('4.96 to the nearest whole: the tenths digit is 9, so up to 5.', '4,96 à l’unité : le chiffre des dixièmes est 9, donc on monte à 5.'),
    teach: 'rounding'
  },
  {
    id: 'order-ops', level: 'CM2', strand: 'calc', generator: 'orderOps', params: { max: 12 }, answer: 'typed', fluentMs: 6000, diff: 0.5, trap: true,
    name: s('Times before plus', 'Le fois avant le plus'),
    strategy: s('3 + 4 × 2: the × goes first — 3 + 8 = 11, not 14.', '3 + 4 × 2 : le × d’abord — 3 + 8 = 11, pas 14.'),
    teach: 'order-ops'
  },

  // ═══ 6e ═══
  {
    id: 'big-milliard', level: '6e', strand: 'number', generator: 'bigNumber', params: { max: 9999999999 }, answer: 'typed', fluentMs: 18000, diff: 0.65, trap: true,
    name: s('Numbers into the billions', 'Nombres jusqu’aux milliards'),
    strategy: s('Four blocks: BILLIONS | MILLIONS | THOUSANDS | ones. Each block has three digits, even when it says nothing.', 'Quatre classes : MILLIARDS | MILLIONS | MILLE | unités. Chaque classe a trois chiffres, même quand on n’en dit rien.'),
    teach: 'place-value'
  },
  {
    id: 'dec-pow10-small', level: '6e', strand: 'calc', generator: 'pow10', params: { factors: [0.1, 0.01, 0.001], decimals: true }, answer: 'typed', fluentMs: 6000, diff: 0.65, trap: true,
    name: s('Times 0.1, 0.01, 0.001', 'Fois 0,1 ; 0,01 ; 0,001'),
    strategy: s('× 0.1 is ÷ 10: multiplying can make a number smaller.', '× 0,1, c’est ÷ 10 : multiplier peut rendre un nombre plus petit.'),
    teach: 'mul-small'
  },
  {
    id: 'mul-small', level: '6e', strand: 'calc', generator: 'mulSmall', params: {}, answer: 'options', fluentMs: 5000, diff: 0.6, trap: true,
    name: s('Multiplying by less than 1', 'Multiplier par moins de 1'),
    strategy: s('8 × 0.5 is half of 8. Multiplying by a number under 1 makes it smaller.', '8 × 0,5, c’est la moitié de 8. Multiplier par un nombre plus petit que 1 rend plus petit.'),
    teach: 'mul-small'
  },
  {
    id: 'div-small', level: '6e', strand: 'calc', generator: 'divSmall', params: {}, answer: 'options', fluentMs: 5000, diff: 0.65, trap: true,
    name: s('Dividing by less than 1', 'Diviser par moins de 1'),
    strategy: s('6 ÷ 0.5 asks "how many halves in 6?" — 12. Dividing by a number under 1 makes it bigger.', '6 ÷ 0,5 demande « combien de demis dans 6 ? » — 12. Diviser par un nombre plus petit que 1 rend plus grand.'),
    teach: 'mul-small'
  },
  {
    id: 'euclid-2', level: '6e', strand: 'calc', generator: 'euclid', params: { divisorMin: 11, divisorMax: 25, dividendMax: 500 }, answer: 'typed', fluentMs: 9000, diff: 0.7,
    name: s('Division by a two-digit number', 'Division par un nombre à deux chiffres'),
    strategy: s('Estimate with tens: 250 ÷ 12 — 12 × 20 = 240, so 20 remainder 10.', 'Estime avec des dizaines : 250 ÷ 12 — 12 × 20 = 240, donc 20 reste 10.'),
    teach: 'euclid'
  },
  {
    id: 'frac-quotient', level: '6e', strand: 'number', generator: 'fracQuotient', params: {}, answer: 'options', fluentMs: 6000, diff: 0.6,
    name: s('A fraction is a division', 'Une fraction est une division'),
    strategy: s('3/4 means 3 ÷ 4 = 0.75. The line IS the division sign.', '3/4 veut dire 3 ÷ 4 = 0,75. La barre EST le signe de division.'),
    teach: 'fractions'
  },
  {
    id: 'frac-times-int', level: '6e', strand: 'calc', generator: 'fracTimesInt', params: { max: 40 }, answer: 'typed', fluentMs: 7000, diff: 0.65,
    name: s('A fraction times a number', 'Une fraction fois un nombre'),
    strategy: s('2/5 × 30: divide by 5 first (6), then × 2 = 12.', '2/5 × 30 : divise par 5 d’abord (6), puis × 2 = 12.'),
    teach: 'fractions'
  },
  {
    id: 'proportion', level: '6e', strand: 'calc', generator: 'proportion', params: { max: 12 }, answer: 'typed', fluentMs: 9000, diff: 0.7,
    name: s('Proportional reasoning', 'Proportionnalité'),
    strategy: s('3 cakes cost 6 €: find ONE first (2 €), then multiply.', '3 gâteaux coûtent 6 € : trouve d’abord UN (2 €), puis multiplie.'),
    teach: 'proportion'
  },

  // ═══ Typing — every level ═══
  {
    id: 'type-home', level: 'CE2', strand: 'typing', generator: 'typingKeys', params: { keys: 'home', length: 1 }, answer: 'typed', fluentMs: 2000, diff: 0.1,
    name: s('Home row keys', 'Les touches de la rangée du milieu'),
    strategy: s('Fingers rest on the home row; F and J have the bumps.', 'Les doigts se posent sur la rangée du milieu ; F et J ont les bosses.'),
    teach: 'typing'
  },
  {
    id: 'type-home-words', level: 'CE2', strand: 'typing', generator: 'typingKeys', params: { keys: 'home', length: 3 }, answer: 'typed', fluentMs: 4500, diff: 0.25,
    name: s('Three home-row keys in a row', 'Trois touches du milieu à la suite'),
    strategy: s('Look at the screen, not your hands. The keyboard map shows the next key.', 'Regarde l’écran, pas tes mains. Le clavier à l’écran montre la touche suivante.'),
    teach: 'typing'
  },
  {
    id: 'type-top', level: 'CE2', strand: 'typing', generator: 'typingKeys', params: { keys: 'top', length: 2 }, answer: 'typed', fluentMs: 3500, diff: 0.35,
    name: s('Top row keys', 'Les touches de la rangée du haut'),
    strategy: s('Reach up from the home row and come back.', 'Monte depuis la rangée du milieu et reviens.'),
    teach: 'typing'
  },
  {
    id: 'type-bottom', level: 'CM1', strand: 'typing', generator: 'typingKeys', params: { keys: 'bottom', length: 2 }, answer: 'typed', fluentMs: 3500, diff: 0.45,
    name: s('Bottom row keys', 'Les touches de la rangée du bas'),
    strategy: s('Reach down from the home row and come back.', 'Descends depuis la rangée du milieu et reviens.'),
    teach: 'typing'
  },
  {
    id: 'type-words-short', level: 'CE2', strand: 'typing', generator: 'typingWords', params: { minLen: 3, maxLen: 5 }, answer: 'typed', fluentMs: 5000, diff: 0.4,
    name: s('Short words', 'Mots courts'),
    strategy: s('Accuracy first. Speed comes on its own.', 'La précision d’abord. La vitesse vient toute seule.'),
    teach: 'typing'
  },
  {
    id: 'type-words-long', level: 'CM1', strand: 'typing', generator: 'typingWords', params: { minLen: 6, maxLen: 9 }, answer: 'typed', fluentMs: 8000, diff: 0.6,
    name: s('Longer words', 'Mots plus longs'),
    strategy: s('Read the whole word before you start.', 'Lis tout le mot avant de commencer.'),
    teach: 'typing'
  },
  {
    id: 'type-digits', level: 'CM1', strand: 'typing', generator: 'typingKeys', params: { keys: 'digits', length: 3 }, answer: 'typed', fluentMs: 5000, diff: 0.5,
    name: s('Digits', 'Les chiffres'),
    strategy: s('On AZERTY, digits need Shift — or the number pad.', 'Sur AZERTY, les chiffres demandent Maj — ou le pavé numérique.'),
    teach: 'typing'
  },
  {
    id: 'type-sentence', level: 'CM2', strand: 'typing', generator: 'typingWords', params: { minLen: 3, maxLen: 8, words: 3 }, answer: 'typed', fluentMs: 12000, diff: 0.7,
    name: s('Three words with spaces', 'Trois mots avec des espaces'),
    strategy: s('The thumb does the space bar.', 'Le pouce fait la barre d’espace.'),
    teach: 'typing'
  }
];

// ── The Teach cards ─────────────────────────────────────────────────────────

/**
 * A faded worked example: three steps, each shorter than the last. The card
 * shows step 1 the first time, step 2 the second time the skill is missed, and
 * step 3 afterwards — the fading is the graph's, driven by a counter.
 */
export interface TeachCard {
  id: string;
  title: Bi;
  steps: [Bi, Bi, Bi];
  /** A worked example, shown in a mono box. */
  example: Bi;
}

export const TEACH_CARDS: ReadonlyArray<TeachCard> = [
  {
    id: 'bonds',
    title: s('Pairs that make ten', 'Les compléments à 10'),
    steps: [
      s('Every number under 10 has a partner that takes it to 10. Learn the five pairs and you never count on your fingers again: 1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5.', 'Chaque nombre en dessous de 10 a un partenaire qui l’emmène à 10. Apprends les cinq paires et tu ne comptes plus sur tes doigts : 1 et 9, 2 et 8, 3 et 7, 4 et 6, 5 et 5.'),
      s('To 20 or 100 it is the same idea: 13 needs 7 (3 + 7 = 10). 35 needs 65: go to 40 (5), then 60 more.', 'Vers 20 ou 100, même idée : 13 a besoin de 7 (3 + 7 = 10). 35 a besoin de 65 : va à 40 (5), puis 60 de plus.'),
      s('Ask: what takes me to the next ten?', 'Demande-toi : qu’est-ce qui m’emmène à la dizaine suivante ?')
    ],
    example: s('7 + ? = 10  →  3\n13 + ? = 20  →  7\n35 + ? = 100  →  5 + 60 = 65', '7 + ? = 10  →  3\n13 + ? = 20  →  7\n35 + ? = 100  →  5 + 60 = 65')
  },
  {
    id: 'bridge-ten',
    title: s('Crossing a ten', 'Passer la dizaine'),
    steps: [
      s('8 + 7 is hard. 8 + 2 is easy — it makes 10. So break the 7 into 2 and 5: 8 + 2 = 10, then 10 + 5 = 15. Taking away is the same in reverse: 63 − 7 → 63 − 3 = 60, then 60 − 4 = 56.', '8 + 7, c’est dur. 8 + 2, c’est facile — ça fait 10. Alors coupe le 7 en 2 et 5 : 8 + 2 = 10, puis 10 + 5 = 15. Pour retirer, pareil à l’envers : 63 − 7 → 63 − 3 = 60, puis 60 − 4 = 56.'),
      s('Step 1: how far to the next ten? Step 2: how much is left to add (or take)?', 'Étape 1 : combien jusqu’à la dizaine suivante ? Étape 2 : combien reste-t-il à ajouter (ou retirer) ?'),
      s('Go to the ten, then the rest.', 'Va à la dizaine, puis le reste.')
    ],
    example: s('46 + 8 = 46 + 4 + 4 = 50 + 4 = 54\n63 − 7 = 63 − 3 − 4 = 60 − 4 = 56', '46 + 8 = 46 + 4 + 4 = 50 + 4 = 54\n63 − 7 = 63 − 3 − 4 = 60 − 4 = 56')
  },
  {
    id: 'compensation',
    title: s('Add 10, give 1 back', 'Ajoute 10, rends 1'),
    steps: [
      s('Adding 9 is annoying. Adding 10 is easy. So add 10 and take 1 back: 46 + 9 = 56 − 1 = 55. For 19, add 20 and take 1 back. For 29, add 30 and take 1 back.', 'Ajouter 9, c’est pénible. Ajouter 10, c’est facile. Alors ajoute 10 et retire 1 : 46 + 9 = 56 − 1 = 55. Pour 19, ajoute 20 et retire 1. Pour 29, ajoute 30 et retire 1.'),
      s('Taking away 9: take 10 and give 1 back. 73 − 9 = 63 + 1 = 64.', 'Retirer 9 : retire 10 et rends 1. 73 − 9 = 63 + 1 = 64.'),
      s('Round the number, then fix the difference.', 'Arrondis le nombre, puis corrige la différence.')
    ],
    example: s('46 + 9 = 46 + 10 − 1 = 55\n73 − 29 = 73 − 30 + 1 = 44', '46 + 9 = 46 + 10 − 1 = 55\n73 − 29 = 73 − 30 + 1 = 44')
  },
  {
    id: 'tables',
    title: s('Tables you can rebuild', 'Des tables qu’on peut reconstruire'),
    steps: [
      s('You do not have to memorise all 100 facts. × 2 is doubling. × 4 is double, double. × 8 is double, double, double. × 5 is × 10 then half. × 9 is × 10 minus one lot. × 6 is × 5 plus one lot. That leaves a handful to just know: 7 × 7 = 49, 7 × 8 = 56, 6 × 7 = 42.', 'Pas besoin d’apprendre les 100 résultats par cœur. × 2, c’est doubler. × 4, doubler deux fois. × 8, doubler trois fois. × 5, c’est × 10 puis la moitié. × 9, c’est × 10 moins une fois. × 6, c’est × 5 plus une fois. Il en reste une poignée à savoir : 7 × 7 = 49, 7 × 8 = 56, 6 × 7 = 42.'),
      s('A division is a table backwards: 56 ÷ 7 asks "7 × what = 56?"', 'Une division, c’est une table à l’envers : 56 ÷ 7 demande « 7 × combien = 56 ? »'),
      s('Which table trick gets you there?', 'Quelle astuce de table t’y amène ?')
    ],
    example: s('9 × 7 = 70 − 7 = 63\n8 × 6 = 6 → 12 → 24 → 48\n26 × 5 = 260 ÷ 2 = 130', '9 × 7 = 70 − 7 = 63\n8 × 6 = 6 → 12 → 24 → 48\n26 × 5 = 260 ÷ 2 = 130')
  },
  {
    id: 'pow10',
    title: s('Times and divided by 10, 100, 1000', 'Fois et divisé par 10, 100, 1000'),
    steps: [
      s('Multiplying by 10 does not "add a zero" — it moves every digit one place to the left. That is why 2.5 × 10 = 25 and not 2.50. Dividing moves them right: 4 500 ÷ 100 = 45.', 'Multiplier par 10, ce n’est pas « ajouter un zéro » — chaque chiffre se décale d’un rang vers la gauche. C’est pour ça que 2,5 × 10 = 25 et pas 2,50. Diviser les décale vers la droite : 4 500 ÷ 100 = 45.'),
      s('Count the zeros: that is how many places the digits move.', 'Compte les zéros : c’est le nombre de rangs dont les chiffres se décalent.'),
      s('The digits move; the point stays where it is.', 'Les chiffres bougent ; la virgule reste à sa place.')
    ],
    example: s('23 × 100 = 2 300\n2.5 × 10 = 25\n4 500 ÷ 100 = 45\n3.7 × 0.1 = 0.37', '23 × 100 = 2 300\n2,5 × 10 = 25\n4 500 ÷ 100 = 45\n3,7 × 0,1 = 0,37')
  },
  {
    id: 'place-value',
    title: s('Big numbers come in blocks of three', 'Les grands nombres vont par classes de trois'),
    steps: [
      s('A number is written in blocks of three digits from the right: BILLIONS | MILLIONS | THOUSANDS | ones. "Two hundred and thirty million" fills the millions block with 230 and every block after it with zeros: 230 | 000 | 000. The trap is writing what you HEAR (200, 30, ...) instead of filling the blocks.', 'Un nombre s’écrit par classes de trois chiffres depuis la droite : MILLIARDS | MILLIONS | MILLE | unités. « Deux cent trente millions » remplit la classe des millions avec 230 et toutes les classes suivantes avec des zéros : 230 | 000 | 000. Le piège, c’est d’écrire ce qu’on ENTEND (200, 30, …) au lieu de remplir les classes.'),
      s('Draw the grid first, then fill each block with three digits — even the empty ones.', 'Dessine d’abord le tableau, puis remplis chaque classe avec trois chiffres — même les vides.'),
      s('Which block does each word belong to?', 'Chaque mot va dans quelle classe ?')
    ],
    example: s('two hundred and thirty million\n  MILLIONS | THOUSANDS | ONES\n     230   |    000    | 000  →  230 000 000\n\nthree thousand and forty\n  THOUSANDS | ONES\n      3     | 040  →  3 040', 'deux cent trente millions\n  MILLIONS | MILLE | UNITÉS\n     230   |  000  |  000  →  230 000 000\n\ntrois mille quarante\n  MILLE | UNITÉS\n    3   |  040  →  3 040')
  },
  {
    id: 'decimals',
    title: s('Decimals: compare from the left', 'Décimaux : compare depuis la gauche'),
    steps: [
      s('0.25 is NOT bigger than 0.7 just because 25 is bigger than 7. Compare the tenths first: 0.7 has 7 tenths, 0.25 has 2 tenths. Same trick for length: 0.125 is not bigger than 0.5 because it is longer — 1 tenth is less than 5 tenths. If it helps, write zeros so both have the same length: 0.70 vs 0.25.', '0,25 n’est PAS plus grand que 0,7 parce que 25 est plus grand que 7. Compare d’abord les dixièmes : 0,7 a 7 dixièmes, 0,25 a 2 dixièmes. Même astuce pour la longueur : 0,125 n’est pas plus grand que 0,5 parce qu’il est plus long — 1 dixième vaut moins que 5 dixièmes. Si ça aide, écris des zéros pour avoir la même longueur : 0,70 et 0,25.'),
      s('Line the numbers up at the point, then compare digit by digit from the left.', 'Aligne les nombres sur la virgule, puis compare chiffre par chiffre depuis la gauche.'),
      s('Tenths first. Length means nothing.', 'Les dixièmes d’abord. La longueur ne dit rien.')
    ],
    example: s('0.7  = 0.70  >  0.25\n0.5  = 0.500 >  0.125\n2.45 <  2.5', '0,7  = 0,70  >  0,25\n0,5  = 0,500 >  0,125\n2,45 <  2,5')
  },
  {
    id: 'fractions',
    title: s('Fractions: more slices, smaller slices', 'Fractions : plus de parts, des parts plus petites'),
    steps: [
      s('1/4 is smaller than 1/3: cutting a cake into 4 gives smaller slices than cutting it into 3. Same bottom number? Compare the tops: 3/8 < 5/8. To find a fraction OF a number, divide by the bottom then multiply by the top: 3/4 of 24 = 24 ÷ 4 × 3 = 18. And a fraction is a division: 3/4 = 3 ÷ 4 = 0.75.', '1/4 est plus petit que 1/3 : couper un gâteau en 4 donne des parts plus petites qu’en 3. Même dénominateur ? Compare les numérateurs : 3/8 < 5/8. Pour prendre une fraction D’UN nombre, divise par le bas puis multiplie par le haut : 3/4 de 24 = 24 ÷ 4 × 3 = 18. Et une fraction est une division : 3/4 = 3 ÷ 4 = 0,75.'),
      s('Draw the bar. Cut it into the bottom number of pieces. Shade the top number.', 'Dessine la barre. Coupe-la en autant de morceaux que le bas. Colorie autant de morceaux que le haut.'),
      s('Bottom says how many pieces. Top says how many you take.', 'Le bas dit en combien de morceaux. Le haut dit combien tu en prends.')
    ],
    example: s('1/3 > 1/4      3/8 < 5/8\n3/4 of 24 = 24 ÷ 4 × 3 = 18\n3/4 = 0.75   1/5 = 0.2', '1/3 > 1/4      3/8 < 5/8\n3/4 de 24 = 24 ÷ 4 × 3 = 18\n3/4 = 0,75   1/5 = 0,2')
  },
  {
    id: 'euclid',
    title: s('Division with something left over', 'La division avec un reste'),
    steps: [
      s('47 ÷ 5: how many 5s fit in 47? 5 × 9 = 45 fits, 5 × 10 = 50 is too big. So the answer is 9, and 47 − 45 = 2 is left over. Write it 47 = 5 × 9 + 2. The remainder is always smaller than the divider.', '47 ÷ 5 : combien de 5 dans 47 ? 5 × 9 = 45 rentre, 5 × 10 = 50 est trop grand. Donc 9, et il reste 47 − 45 = 2. On écrit 47 = 5 × 9 + 2. Le reste est toujours plus petit que le diviseur.'),
      s('Find the biggest table fact that fits, then subtract.', 'Trouve le plus grand résultat de table qui rentre, puis soustrais.'),
      s('How many fit? What is left?', 'Combien rentrent ? Combien reste-t-il ?')
    ],
    example: s('47 ÷ 5  →  5 × 9 = 45  →  9 r 2\n250 ÷ 12  →  12 × 20 = 240  →  20 r 10', '47 ÷ 5  →  5 × 9 = 45  →  9 reste 2\n250 ÷ 12  →  12 × 20 = 240  →  20 reste 10')
  },
  {
    id: 'borrow',
    title: s('Taking away when the bottom digit is bigger', 'Soustraire quand le chiffre du bas est plus grand'),
    steps: [
      s('52 − 38: the trap is doing 8 − 2 because it is easier, and getting 26. Instead, count UP from 38: 38 → 40 is 2, 40 → 52 is 12, so the answer is 14. Or take 38 in two steps: 52 − 30 = 22, then 22 − 8 = 14.', '52 − 38 : le piège, c’est de faire 8 − 2 parce que c’est plus facile, et de trouver 26. Compte plutôt EN MONTANT depuis 38 : 38 → 40, c’est 2 ; 40 → 52, c’est 12 ; donc 14. Ou retire 38 en deux fois : 52 − 30 = 22, puis 22 − 8 = 14.'),
      s('Count up from the smaller number to the bigger one.', 'Compte en montant du plus petit vers le plus grand.'),
      s('Never swap the digits. Count up instead.', 'N’échange jamais les chiffres. Compte en montant.')
    ],
    example: s('52 − 38:  38 → 40 (2), 40 → 52 (12)  →  14\n81 − 47:  47 → 50 (3), 50 → 81 (31)  →  34', '52 − 38 :  38 → 40 (2), 40 → 52 (12)  →  14\n81 − 47 :  47 → 50 (3), 50 → 81 (31)  →  34')
  },
  {
    id: 'order-ops',
    title: s('Times and divide go first', 'Fois et divisé passent en premier'),
    steps: [
      s('3 + 4 × 2 is not 14. The × is done first: 4 × 2 = 8, then 3 + 8 = 11. Brackets beat everything: (3 + 4) × 2 = 14.', '3 + 4 × 2 ne fait pas 14. Le × se fait d’abord : 4 × 2 = 8, puis 3 + 8 = 11. Les parenthèses passent avant tout : (3 + 4) × 2 = 14.'),
      s('Circle the × and ÷ first. Do those. Then the + and −.', 'Entoure d’abord les × et ÷. Fais-les. Puis les + et −.'),
      s('× before +.', '× avant +.')
    ],
    example: s('3 + 4 × 2 = 3 + 8 = 11\n(3 + 4) × 2 = 7 × 2 = 14\n20 − 12 ÷ 4 = 20 − 3 = 17', '3 + 4 × 2 = 3 + 8 = 11\n(3 + 4) × 2 = 7 × 2 = 14\n20 − 12 ÷ 4 = 20 − 3 = 17')
  },
  {
    id: 'rounding',
    title: s('Rounding', 'Arrondir'),
    steps: [
      s('To round 4 372 to the nearest hundred, look at the digit just to the RIGHT of the hundreds: 7. Five or more goes up: 4 400. For decimals it is the same: 4.96 to the nearest whole — the tenths digit is 9, so up to 5 (not 4.9, not 5.96).', 'Pour arrondir 4 372 à la centaine, regarde le chiffre juste à DROITE des centaines : 7. Cinq ou plus, on monte : 4 400. Pour les décimaux, pareil : 4,96 à l’unité — le chiffre des dixièmes est 9, donc on monte à 5 (pas 4,9, pas 5,96).'),
      s('Find the place. Look one digit to its right. 5 or more: up.', 'Trouve le rang. Regarde un chiffre à sa droite. 5 ou plus : on monte.'),
      s('Look one digit to the right.', 'Regarde un chiffre à droite.')
    ],
    example: s('4 372 → nearest 100 → 4 400\n4 372 → nearest 10 → 4 370\n4.96 → nearest whole → 5\n2.43 → nearest tenth → 2.4', '4 372 → à la centaine → 4 400\n4 372 → à la dizaine → 4 370\n4,96 → à l’unité → 5\n2,43 → au dixième → 2,4')
  },
  {
    id: 'equals',
    title: s('The equals sign is a balance', 'Le signe égal est une balance'),
    steps: [
      s('= does not mean "and the answer is". It means "the same amount as". In 8 + 4 = □ + 5 the two sides must weigh the same: the left is 12, so the right must be 12 too, and □ is 7 — not 12.', '= ne veut pas dire « et le résultat est ». Il veut dire « la même quantité que ». Dans 8 + 4 = □ + 5, les deux côtés doivent peser pareil : à gauche 12, donc à droite 12 aussi, et □ vaut 7 — pas 12.'),
      s('Work out the full side first. Then make the other side match.', 'Calcule d’abord le côté complet. Puis fais correspondre l’autre côté.'),
      s('Both sides are the same amount.', 'Les deux côtés valent pareil.')
    ],
    example: s('8 + 4 = □ + 5  →  12 = □ + 5  →  □ = 7\n□ − 3 = 6 + 6  →  □ − 3 = 12  →  □ = 15', '8 + 4 = □ + 5  →  12 = □ + 5  →  □ = 7\n□ − 3 = 6 + 6  →  □ − 3 = 12  →  □ = 15')
  },
  {
    id: 'mul-small',
    title: s('Multiplying can make smaller', 'Multiplier peut rendre plus petit'),
    steps: [
      s('"Multiplying makes bigger" is only true above 1. 8 × 0.5 is half of 8 = 4. 8 × 0.1 is 8 ÷ 10 = 0.8. And dividing by less than 1 makes BIGGER: 6 ÷ 0.5 asks "how many halves in 6?" — 12.', '« Multiplier rend plus grand » n’est vrai qu’au-dessus de 1. 8 × 0,5, c’est la moitié de 8 = 4. 8 × 0,1, c’est 8 ÷ 10 = 0,8. Et diviser par moins de 1 rend PLUS GRAND : 6 ÷ 0,5 demande « combien de demis dans 6 ? » — 12.'),
      s('× 0.5 is half. × 0.1 is ÷ 10. ÷ 0.5 is double.', '× 0,5, c’est la moitié. × 0,1, c’est ÷ 10. ÷ 0,5, c’est le double.'),
      s('Under 1, × shrinks and ÷ grows.', 'En dessous de 1, × réduit et ÷ agrandit.')
    ],
    example: s('8 × 0.5 = 4\n8 × 0.1 = 0.8\n6 ÷ 0.5 = 12\n6 ÷ 0.1 = 60', '8 × 0,5 = 4\n8 × 0,1 = 0,8\n6 ÷ 0,5 = 12\n6 ÷ 0,1 = 60')
  },
  {
    id: 'proportion',
    title: s('Find one first', 'Trouve d’abord un seul'),
    steps: [
      s('3 cakes cost 6 €. What do 5 cost? Find ONE first: 6 ÷ 3 = 2 € each. Then 5 × 2 = 10 €. Whenever two things go up together, go back to one.', '3 gâteaux coûtent 6 €. Combien pour 5 ? Trouve d’abord UN : 6 ÷ 3 = 2 € chacun. Puis 5 × 2 = 10 €. Quand deux choses montent ensemble, reviens à un.'),
      s('Divide to get one. Multiply to get the number you want.', 'Divise pour avoir un. Multiplie pour avoir le nombre voulu.'),
      s('Back to one, then up.', 'Reviens à un, puis monte.')
    ],
    example: s('3 → 6 €   so   1 → 2 €   so   5 → 10 €', '3 → 6 €   donc   1 → 2 €   donc   5 → 10 €')
  },
  {
    id: 'typing',
    title: s('Where the fingers live', 'Où vivent les doigts'),
    steps: [
      s('Both hands rest on the middle row — on AZERTY that is Q S D F for the left hand and J K L M for the right. F and J have little bumps so you can find them without looking. Each finger owns a column: reach up or down for a key, then come back home. The thumb does the space bar.', 'Les deux mains se posent sur la rangée du milieu — sur AZERTY, Q S D F pour la main gauche et J K L M pour la droite. F et J ont des petites bosses pour les trouver sans regarder. Chaque doigt a sa colonne : monte ou descends pour une touche, puis reviens à la maison. Le pouce fait la barre d’espace.'),
      s('The colours on the keyboard map are the fingers. Match the colour, not the letter.', 'Les couleurs du clavier à l’écran sont les doigts. Suis la couleur, pas la lettre.'),
      s('Eyes on the screen. Fingers come home.', 'Les yeux sur l’écran. Les doigts reviennent à la maison.')
    ],
    example: s('left:  Q S D F        right: J K L M\n       little ring middle index    index middle ring little', 'gauche : Q S D F        droite : J K L M\n         auriculaire annulaire majeur index    index majeur annulaire auriculaire')
  }
];

// ── The typing word lists ───────────────────────────────────────────────────

/** Common words a child of 8-12 can spell, by language. Kept short on purpose; add your own. */
export const WORD_LISTS: Readonly<Record<Lang, ReadonlyArray<string>>> = {
  en: [
    'cat', 'dog', 'sun', 'red', 'run', 'big', 'hat', 'map', 'cup', 'bed', 'fox', 'jam', 'kit', 'log', 'pen',
    'tree', 'book', 'star', 'fish', 'ship', 'milk', 'moon', 'frog', 'bird', 'cake', 'door', 'jump', 'rock',
    'house', 'water', 'apple', 'green', 'happy', 'plant', 'chair', 'music', 'table', 'bread', 'cloud', 'horse',
    'rocket', 'planet', 'garden', 'school', 'yellow', 'orange', 'friend', 'window', 'pencil', 'monkey',
    'morning', 'picture', 'teacher', 'balloon', 'weekend', 'kitchen', 'chicken', 'holiday',
    'elephant', 'sandwich', 'birthday', 'computer', 'mountain', 'football', 'dinosaur'
  ],
  fr: [
    'chat', 'lune', 'pain', 'lait', 'jour', 'nuit', 'mer', 'roi', 'fil', 'sac', 'bol', 'riz', 'vol', 'toit', 'main',
    'pomme', 'table', 'porte', 'livre', 'rouge', 'bleu', 'vert', 'arbre', 'fleur', 'école', 'jardin', 'maison',
    'chien', 'oiseau', 'soleil', 'fusée', 'cheval', 'gâteau', 'papier', 'crayon', 'fenêtre', 'cuisine', 'musique',
    'planète', 'chocolat', 'bonjour', 'samedi', 'dimanche', 'copain', 'copine', 'voiture', 'bateau', 'jouet',
    'ordinateur', 'montagne', 'éléphant', 'dinosaure', 'anniversaire', 'vacances', 'poisson', 'fromage'
  ]
};

// ── The interface, in both languages ────────────────────────────────────────

/**
 * Every word the interface shows. One row per key; the `Logic/Translate words`
 * component publishes every key as an output in the active language, so a page
 * wires `title` rather than a literal.
 *
 * 🔴 Keys are output port names, so they must be valid identifiers.
 */
export const WORDS: Readonly<Record<string, Bi>> = {
  appName: s('Rocket School', 'Rocket School'),
  tagline: s('Maths and typing practice that flies.', 'Des maths et de la frappe qui décollent.'),
  whoIsPlaying: s('Who is playing?', 'Qui joue ?'),
  newProfile: s('New player', 'Nouveau joueur'),
  yourName: s('Your name', 'Ton prénom'),
  pickAvatar: s('Pick your face', 'Choisis ta tête'),
  rollAvatar: s('Roll again', 'Une autre'),
  yourLevel: s('Your class', 'Ta classe'),
  language: s('Language', 'Langue'),
  keyboard: s('Keyboard', 'Clavier'),
  create: s('Let’s go!', 'C’est parti !'),
  cancel: s('Cancel', 'Annuler'),
  deleteProfile: s('Delete this player', 'Supprimer ce joueur'),
  switchPlayer: s('Switch player', 'Changer de joueur'),
  // RKT-008: the player menu, opened from the face and name.
  editPlayer: s('Edit player', 'Modifier le joueur'),
  saveChanges: s('Save', 'Enregistrer'),
  // (The label is `soundOn`, "Sound", further down.)
  soundYes: s('On', 'Activé'),
  soundNo: s('Off', 'Coupé'),
  answersLabel: s('Answers', 'Réponses'),
  answersTyped: s('Type them', 'Je tape'),
  answersOptions: s('Buttons', 'Des boutons'),
  answersAuto: s('Auto', 'Auto'),
  closeMenu: s('Close', 'Fermer'),
  deleteAsk: s('Delete {name}? Their stars and progress go too.', 'Supprimer {name} ? Ses étoiles et ses progrès partent aussi.'),
  deleteYes: s('Yes, delete', 'Oui, supprimer'),
  deleteNo: s('No, keep', 'Non, garder'),
  home: s('Home', 'Accueil'),
  play: s('Play', 'Jouer'),
  practice: s('Practice', 'Entraînement'),
  challenge: s('Challenge', 'Défi'),
  // RKT-007: each mode says, in one line on the setup, what it rewards and what happens at zero.
  practiceRule: s('No clock. Right and quick sends your rocket further.', 'Pas de chrono. Juste et rapide, ta fusée va plus loin.'),
  challengeRule: s('Answer before time runs out. Out of time, your rocket stays put.', 'Réponds avant la fin du temps. Temps écoulé : ta fusée ne bouge pas.'),
  dueToday: s('to review today', 'à revoir aujourd’hui'),
  daysThisWeek: s('days practised this week', 'jours d’entraînement cette semaine'),
  gameRace: s('Rocket Race', 'Course de fusées'),
  gameRaceBlurb: s('Answer fast, fly far. Against the computer or a friend.', 'Réponds vite, vole loin. Contre l’ordinateur ou un copain.'),
  gameMerge: s('Make Ten Merge', 'Fusion des dizaines'),
  gameMergeBlurb: s('Slide the tiles. Two that make a ten join up.', 'Fais glisser les tuiles. Deux qui font une dizaine fusionnent.'),
  // TPL-007 §12.1: Make Ten Merge's own words. The end of a board says its numbers from Logic/Finish merge.
  mergeRule: s('Slide with the arrows. Two tiles join when they make 10, 20, 30…', 'Fais glisser avec les flèches. Deux tuiles fusionnent si elles font 10, 20, 30…'),
  newGame: s('New game', 'Nouvelle partie'),
  // Richard, 2026-09-14: "can we make an easy and hard mode?", and a full board that "doesn't say anything".
  mergeModeLabel: s('Difficulty', 'Difficulté'),
  mergeEasy: s('Easy', 'Facile'),
  mergeHard: s('Hard', 'Difficile'),
  mergeFull: s('Full! Two tiles side by side still make 10, 20, 30… Slide to join them.', 'C’est plein ! Deux tuiles côte à côte font encore 10, 20, 30… Fais-les glisser.'),
  // The hangar's way in from the player menu, now that it is not a card among the games.
  menuHangar: s('🎁 Hangar', '🎁 Hangar'),
  gameHunt: s('Number Hunt', 'Chasse aux nombres'),
  gameHuntBlurb: s('Find the numbers that make the target.', 'Trouve les nombres qui font la cible.'),
  // TPL-007 §12.2: Number Hunt's own words. The instruction, the progress and the note on each pick come from Logic/Draw hunt.
  huntNextGrid: s('Next grid', 'Grille suivante'),
  huntShowWay: s('Show me one', 'Montre-m’en une'),
  gameMonster: s('Monster Gate', 'La porte du monstre'),
  gameMonsterBlurb: s('Answer before it reaches the gate. Three hearts.', 'Réponds avant qu’il n’atteigne la porte. Trois cœurs.'),
  // TPL-007 §16: Monster Gate's two ways to play (ruling 1), each pace's rule in one line (RKT-007's setup), and its way back to the setup.
  monsterGate: s('Beat it to the gate', 'Plus rapide que le monstre'),
  monsterPush: s('Push it back', 'Repousse-le'),
  monsterGatePractice: s('Every wrong answer brings it closer. A quick answer ⚡ pushes it back; a slow one only holds it.', 'Chaque erreur le rapproche. Une réponse rapide ⚡ le repousse ; une réponse lente ne fait que le retenir.'),
  monsterGateChallenge: s('It walks while you think. Answer before it reaches the gate, or a heart is gone.', 'Il marche pendant que tu réfléchis. Réponds avant qu’il n’atteigne la porte, sinon tu perds un cœur.'),
  monsterPushPractice: s('Right answers push it back into its cave. Every answer, it takes a step.', 'Les bonnes réponses le repoussent dans sa grotte. À chaque réponse, il fait un pas.'),
  monsterPushChallenge: s('Push it back into its cave before time runs out. Out of time, it takes a step.', 'Repousse-le dans sa grotte avant la fin du temps. Temps écoulé : il fait un pas.'),
  monsterChange: s('Change the game', 'Changer de partie'),
  typingMode: s('Typing', 'Frappe'),
  mathsMode: s('Maths', 'Maths'),
  customMode: s('My questions', 'Mes questions'),
  onePlayer: s('Me vs the computer', 'Moi contre l’ordinateur'),
  twoPlayers: s('Two players, taking turns', 'Deux joueurs, chacun son tour'),
  start: s('Start', 'Commencer'),
  again: s('Play again', 'Rejouer'),
  otherRace: s('Change the race', 'Changer de course'),
  restart: s('Restart', 'Recommencer'),
  rightAnswers: s('right answers', 'bonnes réponses'),
  stars: s('stars earned ⭐', 'étoiles gagnées ⭐'),
  // RKT-011: the hangar, where a milestone's 🎁 pick becomes something to wear.
  hangar: s('Hangar', 'Hangar'),
  // P95 PLY-002: the confirmation. Richard's three lines, and nothing else on the card.
  buyTitle: s('Buy {item}?', 'Acheter {item} ?'),
  youHave: s('You have', 'Tu as'),
  itCosts: s('This costs', 'Ça coûte'),
  youllHave: s('You’ll have', 'Il te restera'),
  yesBuy: s('Yes, buy it', 'Oui, achète'),
  noThanks: s('No', 'Non'),
  ownedElsewhere: s('for other faces', 'pour d’autres têtes'),
  hangarBlurb: s('Dress up your face and paint your rocket.', 'Habille ta tête et peins ta fusée.'),
  faceTab: s('Face', 'Visage'),
  rocketTab: s('Rocket', 'Fusée'),
  earnedPick: s('🎁 You earned a pick!', '🎁 Tu as gagné un choix !'),
  toHangar: s('To the hangar', 'Au hangar'),
  next: s('Next', 'Suivant'),
  check: s('Check', 'Vérifier'),
  typeAnswer: s('Type your answer', 'Écris ta réponse'),
  correct: s('Correct!', 'Bravo !'),
  fluent: s('Fast and correct!', 'Rapide et juste !'),
  wrong: s('Not quite.', 'Pas tout à fait.'),
  timeUp: s('Time’s up.', 'Temps écoulé.'),
  theAnswerWas: s('The answer was', 'La réponse était'),
  showMe: s('Show me how', 'Montre-moi comment'),
  gotIt: s('Got it', 'Compris'),
  anExample: s('An example', 'Un exemple'),
  youWin: s('You reached the planet!', 'Tu as atteint la planète !'),
  computerWins: s('The computer got there first. Again?', 'L’ordinateur est arrivé avant. On recommence ?'),
  playerWins: s('wins!', 'gagne !'),
  yourTurn: s('Your turn', 'À toi'),
  score: s('Score', 'Score'),
  biggest: s('Biggest tile', 'Plus grande tuile'),
  moves: s('Moves', 'Coups'),
  gameOver: s('No moves left!', 'Plus de coups possibles !'),
  hearts: s('Hearts', 'Cœurs'),
  target: s('Target', 'Cible'),
  found: s('found', 'trouvés'),
  progress: s('Progress', 'Progrès'),
  mastered: s('Mastered', 'Maîtrisé'),
  proficient: s('Solid', 'Solide'),
  familiar: s('Getting there', 'En route'),
  newSkill: s('New', 'Nouveau'),
  saveCode: s('Save code', 'Code de sauvegarde'),
  saveCodeHelp: s('Copy this code to keep your progress safe, or to carry it to another computer.', 'Copie ce code pour garder tes progrès, ou pour les emmener sur un autre ordinateur.'),
  loadCode: s('Load a save code', 'Charger un code'),
  loaded: s('Loaded!', 'Chargé !'),
  badCode: s('That code did not work.', 'Ce code ne fonctionne pas.'),
  mySets: s('My question sets', 'Mes séries de questions'),
  newSet: s('New set', 'Nouvelle série'),
  setName: s('Set name', 'Nom de la série'),
  question: s('Question', 'Question'),
  answer: s('Answer', 'Réponse'),
  addRow: s('Add a question', 'Ajouter une question'),
  remove: s('Remove', 'Retirer'),
  save: s('Save', 'Enregistrer'),
  pasteJson: s('Or paste JSON', 'Ou colle du JSON'),
  teach: s('How it works', 'Comment ça marche'),
  lessOnNext: s('Next time this card will say less. That is on purpose.', 'La prochaine fois, cette fiche en dira moins. C’est voulu.'),
  soundOn: s('Sound', 'Son'),
  credits: s('Faces by DiceBear (MIT / CC BY 4.0). Built with NodeGX.', 'Têtes par DiceBear (MIT / CC BY 4.0). Fait avec NodeGX.')
};

/**
 * P87 RKT-011, reshaped by P95 PLY-001 and PLY-002 — the hangar shelf.
 *
 * A face item is a DiceBear part per face it fits (`faces`), so "Sunglasses" is ONE id, ONE price and ONE purchase
 * that draws each face's own sunglasses. **PLY-001: an item the chosen face cannot wear is no longer offered at all**
 * (RKT-011 §3.2 greyed it instead, and Richard's second play test found that is what "doesn't correspond to the type
 * of avatar they picked" means). So every kept style carries a range of its own, ≥ MIN_FACE_ITEMS_PER_LOOK.
 *
 * **PLY-002, R1: every item carries a star `cost`, and buying spends it.** Richard's ruling, 2026-09-18:
 * *"the colour would be a basic thing, and the reward would be stripes or polkadots"*. So a paint is 15 ⭐ (about one
 * race) and a pattern is 120–220 ⭐ (six to eleven). `free` items cost 0 and are everyone's from the start.
 *
 * 🔴 **`prob` is not decoration.** A DiceBear part that is OPTIONAL only draws when the seed says so, unless its
 * `<part>Probability` is forced to 100 (RKT-011 §3.3). `prob: true` marks exactly those parts, and the template gate
 * asserts `prob === (the installed schema has <part>Probability)` — read from the schema, never from this comment.
 *
 * 🔴 **Nothing here is named from a value's spelling.** Every face value below was rendered to a contact sheet and
 * looked at (2026-09-18, seed "Zoe", `scratchpad/sheets/*.png`). Two things that reading found, and that a green
 * "the SVG differs" gate would NOT have found:
 *   - **pixel-art `beard`** is invisible at avatar size — a reward whose picture does not change. Left off the shelf.
 *   - **adventurer `earrings`** are hidden under the hair on most seeds. Left off the shelf.
 * Values chosen by looking, prices chosen against RKT-010's earn rate (≈20 ⭐ a race).
 */
export interface HangarFacePart {
  part: string;
  value: string;
  /** 🔴 True only where the installed DiceBear schema has `<part>Probability` — the part is optional and the seed would otherwise decide. */
  prob?: boolean;
}

export interface HangarItem {
  id: string;
  kind: 'face' | 'rocket';
  en: string;
  fr: string;
  /** Everyone's from the start. A free item costs 0 and is never bought, so it can never be un-bought. */
  free?: boolean;
  /** PLY-002 R1: what it costs in ⭐. 0 for a free item; the gate refuses any other pairing. */
  cost: number;
  /**
   * 🔴 Not `on`. The runtime hands a Static Data row to a Function as a Model, whose proxy answers a member's name with the member
   * (session 10: `row.on` was the Model's event method, the shelf script threw, and no tile drew). The template gate refuses any row
   * field the runtime Model answers for itself (D64).
   */
  faces?: Readonly<Record<string, HangarFacePart>>;
  /** A rocket item is EITHER a paint (a `--rocket-paint-*` token) or a pattern (a decal the kit draws over the hull). */
  paint?: string;
  pattern?: string;
}

/**
 * PLY-001 R3 — the faces Rocket School offers. `fun-emoji` and `thumbs` are NOT here: DiceBear 9.4.2 gives them
 * `eyes`, `mouth`, `face` and `shape` and nothing wearable, so a child who picked one had a hangar that fitted
 * nothing. The KIT still draws all five (`kit.js`, a library node other projects use), so a profile already on one
 * keeps its face — see `LOOK_ITEMS` in the components, which adds the player's own look when it is not one of these.
 */
export const HANGAR_LOOKS = ['pixel-art', 'big-smile', 'adventurer'] as const;

/** PLY-001 AC3: no kept style may offer fewer than this. The gate reads it, never a literal. */
export const MIN_FACE_ITEMS_PER_LOOK = 12;

/** PLY-002: what a paint costs, and what a pattern costs. One place, so Richard's feedback is a one-line change. */
export const PAINT_COST = 15;
export const PATTERN_COSTS = { stripes: 120, dots: 120, checker: 150, chevron: 150, flames: 180, stars: 180, bolt: 220 } as const;

/** Hair colour, the one reward every kept face can wear: a big area, certain to be visible, and named by the hex WE choose. */
const HAIR_COLOURS: ReadonlyArray<{ id: string; en: string; fr: string; hex: string }> = [
  { id: 'hair-pink', en: 'Pink hair', fr: 'Cheveux roses', hex: 'ff77c8' },
  { id: 'hair-blue', en: 'Blue hair', fr: 'Cheveux bleus', hex: '3aa7ff' },
  { id: 'hair-green', en: 'Green hair', fr: 'Cheveux verts', hex: '2fbf71' },
  { id: 'hair-purple', en: 'Purple hair', fr: 'Cheveux violets', hex: '9b5de5' },
  { id: 'hair-orange', en: 'Orange hair', fr: 'Cheveux orange', hex: 'ff8c42' },
  { id: 'hair-silver', en: 'Silver hair', fr: 'Cheveux argentés', hex: 'c7ccd4' },
  { id: 'hair-red', en: 'Red hair', fr: 'Cheveux rouges', hex: 'e63946' },
  { id: 'hair-gold', en: 'Golden hair', fr: 'Cheveux dorés', hex: 'f2c14e' }
];

/** A hair colour is one purchase that works on all three faces. `hairColor` is not an optional part, so it takes no probability. */
const HAIR_COLOUR_ITEMS: ReadonlyArray<HangarItem> = HAIR_COLOURS.map((c) => ({
  id: c.id,
  kind: 'face' as const,
  en: c.en,
  fr: c.fr,
  cost: 25,
  faces: {
    'pixel-art': { part: 'hairColor', value: c.hex },
    'big-smile': { part: 'hairColor', value: c.hex },
    adventurer: { part: 'hairColor', value: c.hex }
  }
}));

export const HANGAR_SHELF: ReadonlyArray<HangarItem> = [
  // ── Fits all three faces ──────────────────────────────────────────────────
  { id: 'glasses', kind: 'face', en: 'Glasses', fr: 'Lunettes', free: true, cost: 0, faces: { 'pixel-art': { part: 'glasses', value: 'light01', prob: true }, 'big-smile': { part: 'accessories', value: 'glasses', prob: true }, adventurer: { part: 'glasses', value: 'variant05', prob: true } } },
  { id: 'sunglasses', kind: 'face', en: 'Sunglasses', fr: 'Lunettes de soleil', cost: 40, faces: { 'pixel-art': { part: 'glasses', value: 'dark01', prob: true }, 'big-smile': { part: 'accessories', value: 'sunglasses', prob: true }, adventurer: { part: 'glasses', value: 'variant01', prob: true } } },
  { id: 'moustache', kind: 'face', en: 'Moustache', fr: 'Moustache', cost: 50, faces: { 'big-smile': { part: 'accessories', value: 'mustache', prob: true }, adventurer: { part: 'features', value: 'mustache', prob: true } } },

  // ── Pixel ─────────────────────────────────────────────────────────────────
  { id: 'visor', kind: 'face', en: 'Visor', fr: 'Visière', cost: 55, faces: { 'pixel-art': { part: 'glasses', value: 'dark03', prob: true } } },
  { id: 'goggles', kind: 'face', en: 'Goggles', fr: 'Lunettes de plongée', cost: 60, faces: { 'pixel-art': { part: 'glasses', value: 'dark07', prob: true } } },
  { id: 'thick-glasses', kind: 'face', en: 'Thick glasses', fr: 'Grosses lunettes', cost: 45, faces: { 'pixel-art': { part: 'glasses', value: 'light07', prob: true } } },
  { id: 'cap', kind: 'face', en: 'Cap', fr: 'Casquette', cost: 45, faces: { 'pixel-art': { part: 'hat', value: 'variant01', prob: true } } },
  { id: 'headband-cap', kind: 'face', en: 'Headband cap', fr: 'Casquette à bandeau', cost: 55, faces: { 'pixel-art': { part: 'hat', value: 'variant03', prob: true } } },
  { id: 'striped-cap', kind: 'face', en: 'Striped cap', fr: 'Casquette à rayures', cost: 60, faces: { 'pixel-art': { part: 'hat', value: 'variant04', prob: true } } },
  { id: 'twin-stripe-cap', kind: 'face', en: 'Twin-stripe cap', fr: 'Casquette deux bandes', cost: 70, faces: { 'pixel-art': { part: 'hat', value: 'variant09', prob: true } } },
  { id: 'studs', kind: 'face', en: 'Ear studs', fr: 'Boucles d’oreilles', cost: 35, faces: { 'pixel-art': { part: 'accessories', value: 'variant01', prob: true } } },

  // ── Smile ─────────────────────────────────────────────────────────────────
  { id: 'crown', kind: 'face', en: 'Crown', fr: 'Couronne', cost: 70, faces: { 'big-smile': { part: 'accessories', value: 'sailormoonCrown', prob: true } } },
  { id: 'cat-ears', kind: 'face', en: 'Cat ears', fr: 'Oreilles de chat', cost: 55, faces: { 'big-smile': { part: 'accessories', value: 'catEars', prob: true } } },
  { id: 'clown-nose', kind: 'face', en: 'Clown nose', fr: 'Nez de clown', cost: 45, faces: { 'big-smile': { part: 'accessories', value: 'clownNose', prob: true } } },
  { id: 'sleep-mask', kind: 'face', en: 'Sleep mask', fr: 'Masque de nuit', cost: 45, faces: { 'big-smile': { part: 'accessories', value: 'sleepMask', prob: true } } },
  { id: 'face-mask', kind: 'face', en: 'Face mask', fr: 'Masque', cost: 40, faces: { 'big-smile': { part: 'accessories', value: 'faceMask', prob: true } } },
  { id: 'mohawk', kind: 'face', en: 'Mohawk', fr: 'Crête', cost: 65, faces: { 'big-smile': { part: 'hair', value: 'mohawk' } } },
  { id: 'braids', kind: 'face', en: 'Braids', fr: 'Tresses', cost: 65, faces: { 'big-smile': { part: 'hair', value: 'braids' } } },
  { id: 'bun', kind: 'face', en: 'Top bun', fr: 'Chignon', cost: 60, faces: { 'big-smile': { part: 'hair', value: 'bunHair' } } },
  { id: 'afro-bun', kind: 'face', en: 'Afro bun', fr: 'Chignon afro', cost: 60, faces: { 'big-smile': { part: 'hair', value: 'froBun' } } },

  // ── Adventurer ────────────────────────────────────────────────────────────
  { id: 'round-glasses', kind: 'face', en: 'Round glasses', fr: 'Lunettes rondes', cost: 55, faces: { adventurer: { part: 'glasses', value: 'variant03', prob: true } } },
  { id: 'reading-glasses', kind: 'face', en: 'Reading glasses', fr: 'Lunettes de lecture', cost: 45, faces: { adventurer: { part: 'glasses', value: 'variant04', prob: true } } },
  { id: 'oval-glasses', kind: 'face', en: 'Oval glasses', fr: 'Lunettes ovales', cost: 45, faces: { adventurer: { part: 'glasses', value: 'variant02', prob: true } } },
  { id: 'freckles', kind: 'face', en: 'Freckles', fr: 'Taches de rousseur', cost: 40, faces: { adventurer: { part: 'features', value: 'freckles', prob: true } } },
  { id: 'rosy-cheeks', kind: 'face', en: 'Rosy cheeks', fr: 'Joues roses', cost: 40, faces: { adventurer: { part: 'features', value: 'blush', prob: true } } },
  { id: 'birthmark', kind: 'face', en: 'Birthmark', fr: 'Grain de beauté', cost: 40, faces: { adventurer: { part: 'features', value: 'birthmark', prob: true } } },

  // ── Hair colour: one purchase, all three faces ────────────────────────────
  ...HAIR_COLOUR_ITEMS,

  // ── The rocket: paint is basic (PLY-002) ──────────────────────────────────
  { id: 'paint-green', kind: 'rocket', en: 'Forest green', fr: 'Vert forêt', free: true, cost: 0, paint: 'var(--rocket-paint-green)' },
  { id: 'paint-blue', kind: 'rocket', en: 'Sky blue', fr: 'Bleu ciel', free: true, cost: 0, paint: 'var(--rocket-paint-blue)' },
  { id: 'paint-purple', kind: 'rocket', en: 'Purple', fr: 'Violet', cost: PAINT_COST, paint: 'var(--rocket-paint-purple)' },
  { id: 'paint-berry', kind: 'rocket', en: 'Berry', fr: 'Framboise', cost: PAINT_COST, paint: 'var(--rocket-paint-berry)' },
  { id: 'paint-orange', kind: 'rocket', en: 'Orange', fr: 'Orange', cost: PAINT_COST, paint: 'var(--rocket-paint-orange)' },
  { id: 'paint-midnight', kind: 'rocket', en: 'Midnight', fr: 'Nuit', cost: PAINT_COST, paint: 'var(--rocket-paint-midnight)' },

  // ── The rocket: the pattern IS the prize (PLY-002, Richard 2026-09-18) ─────
  { id: 'dots', kind: 'rocket', en: 'Polka dots', fr: 'Pois', cost: PATTERN_COSTS.dots, pattern: 'dots' },
  { id: 'stripes', kind: 'rocket', en: 'Racing stripes', fr: 'Bandes de course', cost: PATTERN_COSTS.stripes, pattern: 'stripes' },
  { id: 'checker', kind: 'rocket', en: 'Checkerboard', fr: 'Damier', cost: PATTERN_COSTS.checker, pattern: 'checker' },
  { id: 'chevron', kind: 'rocket', en: 'Chevrons', fr: 'Chevrons', cost: PATTERN_COSTS.chevron, pattern: 'chevron' },
  { id: 'flames', kind: 'rocket', en: 'Flames', fr: 'Flammes', cost: PATTERN_COSTS.flames, pattern: 'flames' },
  { id: 'stars', kind: 'rocket', en: 'Stars', fr: 'Étoiles', cost: PATTERN_COSTS.stars, pattern: 'stars' },
  { id: 'bolt', kind: 'rocket', en: 'Lightning', fr: 'Éclair', cost: PATTERN_COSTS.bolt, pattern: 'bolt' }
];

export const HANGAR_SHELF_JSON = JSON.stringify(HANGAR_SHELF, null, 2);

/** The word keys, for the generated translate script and the gate. */
export const WORD_KEYS: ReadonlyArray<string> = Object.keys(WORDS);

export const CURRICULUM_JSON = JSON.stringify(CURRICULUM, null, 2);
export const TEACH_CARDS_JSON = JSON.stringify(TEACH_CARDS, null, 2);
export const WORDS_JSON = JSON.stringify(
  WORD_KEYS.map((key) => ({ key, en: WORDS[key].en, fr: WORDS[key].fr })),
  null,
  2
);
export const WORD_LISTS_JSON = JSON.stringify([{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: WORD_LISTS.fr }], null, 2);
