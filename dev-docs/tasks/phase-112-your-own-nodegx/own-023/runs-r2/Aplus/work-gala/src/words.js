// The one filter every free text goes through (school name, block names, everything typed in the settings): no rude
// words, no mockery, no links, no web code. Pure: no DOM, so the tests and the server use it too.

// whole words: short ones that sit inside harmless words ("con" in "Constance", "cul" in "culotte"), matched word by word
const WORDS = `
con cons conne connes connard connards connasse connasses pute putes putain putains merde merdes merdique cul culs bite bites
chier chiant chiante nique niquer niquez niktamer zob pd pede pedes tapette salope salopes salaud salauds encule enculer
encules enculee batard batards batarde enfoire enfoires enfoiree foutre couille couilles branleur branleuse branler
nichon nichons gueule bordel cretin cretine cretins debile debiles idiot idiote idiots imbecile imbeciles abruti abrutie
abrutis stupide stupides nul nulle nuls nulles moche moches grosse grosses boloss bouffon bouffonne pouffiasse grognasse
petasse negre negres bougnoule youpin mongol gogol triso attarde attardee caca kaka pipi prout zizi zezette fesse fesses
pisse pisser crotte chiotte chiottes
fuck fucks fucking fucker fuckers shit shits shitty bullshit ass asses arse asshole arsehole bitch bitches bastard bastards
damn crap crappy dick dicks cock cocks cunt cunts twat prick pricks piss pissed slut sluts whore whores wanker wank bollocks
bugger tits titties boobs porn porno sex sexy nazi nazis retard retarded stupid dumb dummy moron morons loser losers ugly
fatso fatty poo poop poopy pee willy butt butts fart farts jerk freak spastic spaz nigger nigga niggas fag fags faggot dyke
kill kys hitler
`.split(/\s+/).filter(Boolean);
// stems: long enough to be rude wherever they appear, even spelt out "f u c k" or "s.h.i.t"
const STEMS = ['fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'asshole', 'arsehole', 'wanker', 'nigg', 'faggot', 'porn',
  'connard', 'connass', 'encule', 'salope', 'putain', 'enfoire', 'pouffias', 'batard', 'niquer', 'couille', 'branle', 'nichon',
  'merde', 'penis', 'vagin', 'bougnoul', 'hitler'];

const LOOKALIKE = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'i', '€': 'e', '£': 'l' };
// lower case, no accents, look-alike digits and signs turned back into letters
export function norm(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[0-9@$!|€£]/g, (c) => LOOKALIKE[c]);
}
const once = (s) => s.replace(/(.)\1+/g, '$1');        // "fuuuck" → "fuck" (and "connard" → "conard")
const twice = (s) => s.replace(/(.)\1{2,}/g, '$1$1');  // "asss" → "ass", without turning "ass" into "as"
const WSET = new Set(WORDS), WONCE = new Set(WORDS.map(once).filter((w) => w.length >= 4));
const SONCE = STEMS.map(once);

export function isRude(text) {
  const n = norm(text), words = n.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) if (WSET.has(w) || WSET.has(twice(w)) || WONCE.has(once(w))) return true;
  // the letters alone, all run together: "f.u.c.k", "s h i t", "pu-tain"
  const run = words.join('');
  return STEMS.some((s) => run.includes(s)) || SONCE.some((s) => once(run).includes(s));
}
// web code or a link has no place in a name: it would never be run (esc() shows it as text) but it is refused all the same
export const isUnsafe = (text) => /[<>{}\\`]|https?:|www\.|:\/\/|\.(com|fr|net|org|io)\b|javascript:/i.test(String(text));
// control characters and the ones that flip text direction: invisible, and a way to hide a word
const strip = (s) => s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, '').replace(/\s+/g, ' ').trim();

// the text, tidied and cut to `max`, or `fallback` if it is empty, rude, or carries a link or code
export function clean(text, fallback = '', max = 40) {
  if (typeof text !== 'string') return fallback;
  const s = [...strip(text)].slice(0, max).join('').trim();
  if (!s || isRude(s) || isUnsafe(s)) return fallback;
  return s;
}
