// The one filter for free text (change 001, line 13 and 17): rude words in French and English, whatever the case, the
// accents or the look-alike digits; links and web code; and never a false alarm on the game's own names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { clean, isRude, isUnsafe } from '../src/words.js';
import { MOVES, OUTFITS, HAIRS, SHOES, ACCS, PIECES, SNACKS, UPGRADES, CLASSES, NUMBERS, NAMES } from '../src/data.js';

test('13. When someone types a rude word, in French or English, it is caught whatever the case, accents or look-alike digits', () => {
  for (const w of ['merde', 'MERDE', 'Putain', 'pütaîn', 'c0nnard', 'connasse', 'enculé', 'sh1t', 'F*U*C*K', 'f u c k', 's.h.i.t', 'fuuuuck',
    'Lou est nulle', 'idiot', 'B1TCH', 'p u t a i n', 'salope', 'ta gueule', 'caca', 'Ass', 'a$$', 'stupid girl', 'you are ugly'])
    assert.ok(isRude(w), w);
});
test('13. The game\'s own names, and ordinary names and steps, are never taken for rude words', () => {
  const names = [];
  for (const T of [MOVES, OUTFITS, HAIRS, SHOES, ACCS, PIECES, SNACKS, UPGRADES, NUMBERS]) for (const r of Object.values(T)) names.push(r.fr, r.en);
  for (const c of CLASSES) names.push(c.fr, c.en);
  for (const list of Object.values(NAMES)) names.push(...list);
  names.push('Constance', 'Assemblé', 'Pas de bourrée', 'Battement', 'Cou-de-pied', 'Sissonne', 'Glissade', 'Class of 2026', 'Culotte', 'Passé', 'Grand écart', 'Les 4 saisons', 'Classic', 'As de pique');
  for (const n of names) assert.equal(isRude(n), false, n);
});
test('13. clean() gives the default name back for rude or empty text, and tidies the rest', () => {
  assert.equal(clean('merde', 'Plié'), 'Plié');
  assert.equal(clean('   ', 'Plié'), 'Plié');
  assert.equal(clean(42, 'Plié'), 'Plié');
  assert.equal(clean('  Le   grand  saut ', 'x'), 'Le grand saut');
  assert.equal(clean('a'.repeat(60), 'x', 24), 'a'.repeat(24));
  assert.equal(clean('Lou‮eugolb', 'x'), 'Loueugolb', 'the right-to-left trick is stripped');
});
test('17. When a name contains web code or a link, it is refused', () => {
  for (const w of ['<img src=x onerror=alert(1)>', '<script>', 'http://example.com', 'go to www.site.fr', 'javascript:alert(1)', 'abc.com', '{{x}}'])
    assert.ok(isUnsafe(w) && clean(w, 'ok') === 'ok', w);
  assert.equal(clean('Rock & roll', 'x'), 'Rock & roll', 'an ampersand is fine: esc() shows it as text');
});
