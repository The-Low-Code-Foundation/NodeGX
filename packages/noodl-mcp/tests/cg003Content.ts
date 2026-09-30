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

/**
 * Each request's own line under the Workshop title (CG-007 §7.1 item 1), in the mockup's voice ("Drive Pip yourself
 * first. Pip remembers every step as a block, and then you can tidy the steps up."). `{b}` is the robot's name. A
 * request with no line here falls back to the island's general sentence (`isSub`); the template gate names it.
 */
export const REQUEST_SUBS: Readonly<Record<string, { key: string; words: Bi }>> = {
  'path-postbox': { key: 'subPathPostbox', words: s('Drive {b} to the post box, pick up the letter, and carry it to Sami’s door. Every step you take becomes a block.', 'Conduis {b} jusqu’à la boîte aux lettres, prends la lettre, et porte-la à la porte de Sami. Chaque pas devient un bloc.') },
  'tulip-door': { key: 'subTulipDoor', words: s('The can first: pick it up and fill it at the well, then walk {b} to the tulip and water. Steps in the right order.', 'D’abord l’arrosoir : prends-le et remplis-le au puits, puis emmène {b} jusqu’à la tulipe et arrose. Des pas dans le bon ordre.') },
  'tulips-three': { key: 'subTulipsThree', words: s('Drive {b} yourself first. {b} remembers every step as a block, and then you can tidy the steps up.', 'Conduis {b} toi-même d’abord. {b} retient chaque pas comme un bloc, et ensuite tu peux ranger les pas.') },
  'path-stones': { key: 'subPathStones', words: s('To the rock, four stones in the hod, to a square, four stones down. Four squares, the same trip: fold it into a repeat.', 'Au rocher, quatre pierres dans la hotte, à une case, quatre pierres posées. Quatre cases, le même trajet : range-le dans un « répéter ».') },
  'bowl-if': { key: 'subBowlIf', words: s('Only the empty bowl gets food. Teach {b} to look first: if the bowl is empty, then fill it.', 'Seul le bol vide reçoit à manger. Apprends à {b} à regarder d’abord : si le bol est vide, alors remplis-le.') },
  'letter-say': { key: 'subLetterSay', words: s('Fetch the letter from the post box, carry it to Sami’s door, then give {b} something kind to say there.', 'Va chercher la lettre dans la boîte aux lettres, porte-la à la porte de Sami, puis donne à {b} quelque chose de gentil à dire.') },
  'wall-until': { key: 'subWallUntil', words: s('No need to count the steps. {b} can keep going until the wall, then stop by itself.', 'Pas besoin de compter les pas. {b} peut avancer jusqu’au mur, puis s’arrêter tout seul.') },
  'meow-when': { key: 'subMeowWhen', words: s('Nobody knows when Biscuit will meow. Teach {b} what to do whenever it happens.', 'Personne ne sait quand Biscuit va miauler. Apprends à {b} quoi faire chaque fois que ça arrive.') },
  'eggs-count': { key: 'subEggsCount', words: s('Count the eggs in the basket: {b} fetches eggs until it holds four, however many were in it this morning.', 'Compte les œufs du panier : {b} va chercher des œufs jusqu’à ce qu’il en tienne quatre, peu importe combien il y en avait ce matin.') },
  'rows-trick': { key: 'subRowsTrick', words: s('Two rows, the same job. Teach {b} the job once, as a trick with a name, then use it twice.', 'Deux rangées, le même travail. Apprends le travail une fois à {b}, comme une astuce avec un nom, puis utilise-la deux fois.') },
  // P106 IG-006 (lane C): Olive's three requests.
  'mamie-note': { key: 'subMamieNote', words: s('A program cannot read Mamie’s note, but Olive can. Ask her, then let “if Olive read…” choose the row.', 'Un programme ne sait pas lire le mot de Mamie, Olive si. Demande-lui, puis laisse « si Olive a lu… » choisir la rangée.') },
  'rock-flower': { key: 'subRockFlower', words: s('Fill the can at the pond first. Olive is right most of the time, not every time. Ask three times, and the count decides.', 'Remplis d’abord l’arrosoir à la mare. Olive a raison presque tout le temps, pas à chaque fois. Demande trois fois, et le compte décide.') },
  'sami-thanks': { key: 'subSamiThanks', words: s('The letter is {b}’s job; the kind words are Olive’s. Put her thank-you at the end.', 'La lettre, c’est le travail de {b} ; les mots gentils, ceux d’Olive. Mets son merci à la fin.') },
  // P108 IW-003 (lane P): the envelopes.
  envelopes: { key: 'iw3pSubEnvelopes', words: s('A program cannot read a name, but Olive can. {b} picks up a letter, Olive reads it, then “go to” what she read.', 'Un programme ne sait pas lire un nom, Olive si. {b} prend une lettre, Olive la lit, puis « aller à » ce qu’elle a lu.') },
  // P108 IW-003 (lane S): Sami's bench.
  'sami-bench': { key: 'iw3sSubBench', words: s('Nobody knows how many stones a rock has today. {b} can fill the hod until it is full, and keep going until the bench is built.', 'Personne ne sait combien de pierres a un rocher aujourd’hui. {b} peut remplir la hotte jusqu’à ce qu’elle soit pleine, et continuer jusqu’à ce que le banc soit construit.') }
};

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
  guSaveLine: s('Copy this code to move every island to another computer.', 'Copie ce code pour déplacer toutes les îles vers un autre ordinateur.'),
  // Olive's lessons on Skills (band 10–12): the section and the two marks.
  skRungsH: s('Olive’s lessons', 'Les leçons d’Olive'),
  skRungsSub: s('What a small model does well, and what a program does better.', 'Ce qu’un petit modèle fait bien, et ce qu’un programme fait mieux.'),
  rungGreen: s('Olive does this', 'Olive sait faire'),
  rungGrad: s('A program does it better', 'Un programme fait mieux'),
  // The paste box (the second restore path, beside the desktop's Restore menu): a code replaces this computer's islands.
  saveCodeUse: s('Replace the islands with this code', 'Remplacer les îles par ce code'),
  saveCodeDone: s('Done: the islands from the code are back.', 'C’est fait : les îles du code sont revenues.'),
  winThanks: s('“Thank you, {b}!”', '« Merci, {b} ! »'),
  winNew: s('New: {reward}', 'Nouveau : {reward}'),
  pickProfile: s('Tap your name to play. Nothing is timed and nothing runs out.', 'Touche ton prénom pour jouer. Rien n’est chronométré, rien ne s’épuise.'),
  familyFull: s('Six players: the family is full.', 'Six joueurs : la famille est complète.'),
  stickersNone: s('No stickers yet. Help an islander to earn one.', 'Pas encore d’autocollant. Aide un habitant pour en gagner un.'),
  hatLocked: s('a gift from {who}', 'un cadeau de {who}'),
  n7Block: s('water a row', 'arroser une rangée'),
  // IG-001 D7 (P106 s1): the picker's two Olive sensors.
  sOliveSaysYes: s('Olive says yes', 'Olive dit oui'),
  sOliveSaysNo: s('Olive says no', 'Olive dit non'),
  p1: s('CP–CE2 · moves on a grid, up to 15 instructions (programme 2025)', 'CP–CE2 · déplacements sur quadrillage, 15 instructions max (programme 2025)'),
  p2: s('6e · "repeat n times" (programme 2025); 5e · simple loop', '6e · « répéter n fois » (programme 2025) ; 5e · boucle simple'),
  p3: s('3e · conditional loop (programme 2026)', '3e · boucle conditionnelle (programme 2026)'),
  p4: s('4e · conditional instructions (programme 2026)', '4e · instructions conditionnelles (programme 2026)'),
  p5: s('Cycle 4 · events (2016 programme; not in the 2026 text)', 'Cycle 4 · événements (programme 2016 ; absent du texte 2026)'),
  p6: s('4e · handle a variable (programme 2026)', '4e · manipuler une variable (programme 2026)'),
  p7: s('Beyond the programme · procedures, as in Lightbot', 'Hors programme · procédures, comme dans Lightbot'),
  // IG-007 (P106 s2): the Grown-ups page names the renderer this computer uses, why, and offers the switch.
  guRendH: s('How the island is drawn', 'Comment l’île est dessinée'),
  guRend3d: s('3D island', 'Île en 3D'),
  guRend2d: s('Flat garden', 'Jardin à plat'),
  guRend3dLine: s('This computer draws the island in 3D. If it is too slow, the game switches to the flat garden by itself.', 'Cet ordinateur dessine l’île en 3D. Si c’est trop lent, le jeu passe tout seul au jardin à plat.'),
  guRendSlow: s('The flat garden is on: 3D was too slow on this computer.', 'Le jardin à plat est activé : la 3D était trop lente sur cet ordinateur.'),
  guRendNoGl: s('The flat garden is on: this computer cannot draw 3D.', 'Le jardin à plat est activé : cet ordinateur ne sait pas dessiner en 3D.'),
  guRendFlat: s('The flat garden is on, as chosen here.', 'Le jardin à plat est activé, comme choisi ici.'),
  // P106 IG-004 (lane E): the island as a world — the plots, the plot card, a locked plot's reason, find my robots.
  ig4Find: s('Find my robots', 'Trouve mes robots'),
  ig4Tap: s('Tap a plot to see who asks', 'Touche un jardin pour voir qui demande'),
  ig4Open: s('Go and help', 'Aller aider'),
  ig4Home: s('Bring {b} home', 'Ramène {b} à la maison'),
  ig4AtWork: s('{b} is at work on “{plot}”. Bring {b} home first, then this plot is yours.', '{b} travaille sur « {plot} ». Ramène d’abord {b} à la maison, et ce jardin est à toi.'),
  ig4WorksHere: s('{b} is working here, on the program you taught. Go in to teach it again, or bring {b} home.', '{b} travaille ici, avec le programme que tu lui as appris. Entre pour le lui réapprendre, ou ramène {b} à la maison.'),
  ig4Won: s('Done! {b} is home. Go in to play it again.', 'C’est fait ! {b} est à la maison. Entre pour le rejouer.'),
  ig4Locked: s('🔒 {who} asks this at 10–12: it needs “{trick}”.', '🔒 {who} le demande en 10–12 : il faut « {trick} ».'),
  ig4Working: s('{b} works here', '{b} travaille ici'),
  // P106 s4 lane B (IG-005): robots for the job — the lock line, the gifts on the win card, My robots.
  ig5Locked: s('🔒 This job needs {r}, who {does}. {who} lends {r} after “{q}”.', '🔒 Ce travail a besoin de {r}, qui {does}. {who} te prête {r} après « {q} ».'),
  ig5DoesPip: s('waters the flowers', 'arrose les fleurs'),
  ig5DoesCobble: s('lays stones', 'pose des pierres'),
  ig5DoesPocket: s('carries letters and food', 'porte les lettres et la nourriture'),
  ig5DoesEcho: s('talks with Olive', 'parle avec Olive'),
  ig5Lends: s('{who} lends you {r}! {r} {does}.', '{who} te prête {r} ! {r} {does}.'),
  ig5Gives: s('{who} gives you {up}.', '{who} te donne {up}.'),
  ig5UpCan: s('Bigger can · 6 waters', 'Plus grand arrosoir · 6 arrosages'),
  ig5UpBasket: s('Bigger basket · 8 things', 'Plus grand panier · 8 choses'),
  ig5UpBoots: s('Boots · faster steps', 'Bottes · des pas plus rapides'),
  ig5Title: s('The right robot for the job', 'Le bon robot pour le travail'),
  ig5Sub: s('Each robot has its own blocks, a name you can change, a colour and a hat. Islanders lend you new robots.', 'Chaque robot a ses blocs, un nom que tu peux changer, une couleur et un chapeau. Les habitants te prêtent de nouveaux robots.'),
  ig5Fleet: s('Your robots', 'Tes robots'),
  ig5Yours: s('Yours', 'À toi'),
  ig5LentBy: s('Lent by {who}', 'Prêté par {who}'),
  ig5LockedTag: s('Locked', 'Verrouillé'),
  ig5WearsCan: s('carries the can', 'porte l’arrosoir'),
  ig5WearsHod: s('carries a hod', 'porte une hotte'),
  ig5WearsSatchel: s('carries a satchel', 'porte une sacoche'),
  ig5WearsBell: s('wears a bell', 'porte une clochette'),
  ig5CanDo: s('What it can do', 'Ce qu’il sait faire'),
  ig5Upgrade: s('Upgrade', 'Amélioration'),
  ig5UpEmpty: s('Empty slot · {up} · from {who}', 'Emplacement vide · {up} · de {who}'),
  ig5UpHas: s('{up} · from {who}', '{up} · de {who}'),
  ig5Where: s('Where it works', 'Où il travaille'),
  ig5AtWork: s('At work on “{plot}”', 'Au travail sur « {plot} »'),
  ig5AtHome: s('At home', 'À la maison'),
  ig5WhenLent: s('{who} lends {r} after “{q}”.', '{who} te prête {r} après « {q} ».'),
  // P108 IW-001 (lane A): Stop on the bar while a run plays.
  iw1Stop: s('Stop', 'Arrêter'),
  // P108 IW-004 (lane B): the Blocks node's words (garden-kit reads these iw4 keys through its Words port; its own copy is
  // the fallback), the brain line, the pick line, the variable monitor.
  iw4Start: s('{b}’s steps', 'les pas de {b}'),
  iw4Times: s('times', 'fois'),
  iw4Else: s('else', 'sinon'),
  iw4Help: s('Help', 'Aide'),
  iw4Pick: s('👆 tap', '👆 touche'),
  iw4PickLine: s('Tap a thing on the island to put it in the block.', 'Touche une chose sur l’île pour la mettre dans le bloc.'),
  iw4PickCancel: s('Cancel', 'Annuler'),
  iw4Full: s('{b}’s brain holds {n} blocks. Fold some steps into a repeat to make room.', 'Le cerveau de {b} tient {n} blocs. Plie des pas dans un « répéter » pour faire de la place.'),
  iw4ZoomIn: s('Bigger', 'Plus grand'),
  iw4ZoomOut: s('Smaller', 'Plus petit'),
  iw4ZoomFit: s('See all the steps', 'Voir tous les pas'),
  iw4Is: s('is', 'est'),
  iw4CountOf: s('count of', 'nombre de'),
  iw4In: s('in', 'dans'),
  iw4LevelOf: s('level of', 'niveau de'),
  iw4Not: s('not', 'pas'),
  iw4And: s('and', 'et'),
  iw4Or: s('or', 'ou'),
  iw4Read: s('what Olive read', 'ce qu’Olive a lu'),
  iw4Set: s('set', 'mettre'),
  iw4To: s('to', 'à'),
  iw4Change: s('change', 'changer'),
  iw4By: s('by', 'de'),
  iw4GoNearest: s('go to nearest', 'aller au plus proche'),
  iw4GoTo: s('go to', 'aller à'),
  iw4Ask: s('ask Olive', 'demander à Olive'),
  iw4Sensor: s('when', 'quand'),
  iw4None: s('…', '…'),
  iw4Monitor: s('{name} = {v}', '{name} = {v}'),
  iw4S_wall: s('is a wall', 'est un mur'),
  iw4S_nothing: s('is clear', 'est libre'),
  iw4S_has: s('has', 'contient'),
  iw4S_empty: s('is empty', 'est vide'),
  iw4S_full: s('is full', 'est plein'),
  iw4S_thirsty: s('is thirsty', 'a soif'),
  iw4S_drunk: s('has had its drinks', 'a bu ses gorgées'),
  iw4S_done: s('is path', 'est un chemin'),
  iw4S_dirt: s('is not path yet', 'n’est pas encore un chemin'),
  iw4S_stones: s('has stones', 'a des pierres'),
  iw4S_used: s('is used up', 'est épuisé'),
  iw4S_front: s('is in front of me', 'est devant moi'),
  iw4C_ahead: s('👀 ahead', '👀 devant'),
  iw4C_here: s('⬇️ here', '⬇️ ici'),
  iw4C_held: s('✋ what {b} holds', '✋ ce que tient {b}'),
  iw4C_robot: s('🤖 {b}', '🤖 {b}'),
  iw4C_read: s('📜 what Olive read', '📜 ce qu’Olive a lu'),
  iw4K_can: s('🪣 can', '🪣 arrosoir'),
  iw4K_well: s('⛲ well', '⛲ puits'),
  iw4K_tulip: s('🌷 tulip', '🌷 tulipe'),
  iw4K_rock: s('🪨 rock', '🪨 rocher'),
  iw4K_site: s('🟫 square', '🟫 case'),
  iw4K_egg: s('🥚 egg', '🥚 œuf'),
  iw4K_basket: s('🧺 basket', '🧺 panier'),
  iw4K_bowl: s('🥣 bowl', '🥣 gamelle'),
  iw4K_store: s('📦 store', '📦 réserve'),
  iw4K_stone: s('🪨 stone', '🪨 pierre'),
  iw4K_letter: s('✉️ letter', '✉️ lettre'),
  iw4K_food: s('🍖 food', '🍖 nourriture'),
  iw4K_water: s('💧 water', '💧 eau'),
  iw4K_hen: s('🐔 hen', '🐔 poule'),
  iw4K_postbox: s('📮 post box', '📮 boîte aux lettres'),
  iw4K_note: s('📝 note', '📝 mot'),
  iw4K_sign: s('🪧 sign', '🪧 panneau'),
  iw4B_fwd: s('forward', 'avancer'),
  iw4B_left: s('turn left', 'tourner à gauche'),
  iw4B_right: s('turn right', 'tourner à droite'),
  iw4B_water: s('water', 'arroser'),
  iw4B_fill: s('fill', 'remplir'),
  iw4B_pick: s('pick up', 'prendre'),
  iw4B_put: s('put down', 'poser'),
  iw4B_say: s('say', 'dire'),
  iw4B_repeat: s('repeat', 'répéter'),
  iw4B_until: s('repeat until', 'répéter jusqu’à'),
  iw4B_if: s('if', 'si'),
  iw4B_when: s('when', 'quand'),
  iw4B_count_inc: s('count one', 'compter un'),
  iw4B_trick: s('trick', 'astuce'),
  iw4B_do: s('do trick', 'faire l’astuce'),
  iw4VarsH: s('What {b} remembers', 'Ce que {b} retient'),
  // ── P108 IW-003 (lane B): teach again — a pinned program its rewritten job outgrew (the island's card, the Workshop) ──
  iw3bTeachAgain: s('Teach {b} again — the job changed. {b} is waiting at home.', 'Réapprends à {b} — le travail a changé. {b} attend à la maison.'),

  // P108 IW-003 (lane S): Sami's bench in the blocks — the chip picked on it and its states say bench, not path square.
  iw3sK_bench: s('🪑 bench', '🪑 banc'),
  iw3sS_done_bench: s('is built', 'est construit'),
  iw3sS_dirt_bench: s('is not built yet', 'n’est pas encore construit'),
  ...Object.fromEntries(Object.values(REQUEST_SUBS).map((r) => [r.key, r.words])),
  // ── P108 IW-003 (lane M): what a robot says when "go to nearest" / "go to" finds nothing, by what it looked for (the
  // step says sayNone:<kind>; Draw world and the pad word it here, else the plain sayNone). One line per seekable kind.
  iw3mNoneEgg: s('No more eggs here — the hen is still laying.', 'Plus d’œufs ici — la poule est encore en train de pondre.'),
  iw3mNoneTulip: s('No more tulips to find here.', 'Plus de tulipes à trouver ici.'),
  iw3mNoneCan: s('I can’t find the watering can.', 'Je ne trouve pas l’arrosoir.'),
  iw3mNoneBasket: s('I can’t find the basket.', 'Je ne trouve pas le panier.'),
  iw3mNoneRock: s('No rocks with stones left — they grow back.', 'Plus de rochers avec des pierres — ils repoussent.'),
  iw3mNoneStone: s('No more stones here.', 'Plus de pierres ici.'),
  iw3mNoneLetter: s('No more letters here — the post comes again soon.', 'Plus de lettres ici — le facteur repasse bientôt.'),
  iw3mNoneBall: s('I can’t find the ball.', 'Je ne trouve pas la balle.'),
  iw3mNoneBowl: s('I can’t find the bowl.', 'Je ne trouve pas la gamelle.'),
  iw3mNoneDoor: s('I can’t find that door.', 'Je ne trouve pas cette porte.'),
  iw3mNoneSite: s('I can’t find where to build.', 'Je ne trouve pas où construire.'),
  iw3mNoneStore: s('I can’t find the crate.', 'Je ne trouve pas la caisse.'),
  iw3mNoneHen: s('I can’t find the hen.', 'Je ne trouve pas la poule.'),
  iw3mNonePostbox: s('I can’t find the post box.', 'Je ne trouve pas la boîte aux lettres.'),
  iw3mNoneWell: s('I can’t walk to the water from here.', 'Je ne peux pas aller jusqu’à l’eau d’ici.'),
  iw3mNoneRead: s('I don’t know where that is.', 'Je ne sais pas où c’est.'),
  // The job card (IW-000's graded look): its five labels, and each of Mamie's jobs in five lines plus how much is done.
  iw3mJcSrc: s('Source', 'D’où ça vient'),
  iw3mJcCar: s('Carrier', 'Porteur'),
  iw3mJcTgt: s('Target', 'Cible'),
  iw3mJcFin: s('Finish line', 'Ligne d’arrivée'),
  iw3mJcWr: s('Wear', 'Usure'),
  iw3mDoorSrc: s('⛲ the well, which never runs dry', '⛲ le puits, qui ne tarit jamais'),
  iw3mDoorCar: s('🪣 the can on the grass, holds 3', '🪣 l’arrosoir dans l’herbe, 3 gorgées'),
  iw3mDoorTgt: s('🌷 the tulip by the door × 3 drinks', '🌷 la tulipe près de la porte × 3 gorgées'),
  iw3mDoorFin: s('the tulip full → {b} walks home', 'la tulipe pleine → {b} rentre'),
  iw3mDoorWr: s('the tulip gets thirsty again', 'la tulipe a de nouveau soif'),
  iw3mDoorSum: s('{n}/{t} drinks', '{n}/{t} gorgées'),
  iw3mTulipsSrc: s('⛲ the pond, which never runs dry', '⛲ la mare, qui ne tarit jamais'),
  iw3mTulipsCar: s('🪣 the can in {b}’s hand, holds 3', '🪣 l’arrosoir de {b}, 3 gorgées'),
  iw3mTulipsTgt: s('🌷 3 tulips × 3 drinks', '🌷 3 tulipes × 3 gorgées'),
  iw3mTulipsFin: s('every tulip full → {b} walks home', 'toutes les tulipes pleines → {b} rentre'),
  iw3mTulipsWr: s('a tulip gets thirsty again', 'une tulipe a de nouveau soif'),
  iw3mTulipsSum: s('{n}/{t} tulips full', '{n}/{t} tulipes pleines'),
  iw3mEggsSrc: s('🐔 the hen lays in her pen, never twice in the same place', '🐔 la poule pond dans son enclos, jamais deux fois au même endroit'),
  iw3mEggsCar: s('✋ {b}’s hands, one egg at a time', '✋ les mains de {b}, un œuf à la fois'),
  iw3mEggsTgt: s('🧺 the basket by Mamie’s door, 4 eggs', '🧺 le panier devant la porte de Mamie, 4 œufs'),
  iw3mEggsFin: s('the basket full → {b} walks home', 'le panier plein → {b} rentre'),
  iw3mEggsWr: s('Mamie takes an egg for breakfast; the hen lays again', 'Mamie prend un œuf pour le petit-déjeuner ; la poule pond à nouveau'),
  iw3mEggsSum: s('{n}/{t} eggs in the basket', '{n}/{t} œufs dans le panier'),
  iw3mRowsSrc: s('⛲ two ponds, one at each end of the path', '⛲ deux mares, une à chaque bout du chemin'),
  iw3mRowsCar: s('🪣 the can in {b}’s hand, holds 3', '🪣 l’arrosoir de {b}, 3 gorgées'),
  iw3mRowsTgt: s('🌷 2 rows × 3 little tulips, one drink each', '🌷 2 rangées × 3 petites tulipes, une gorgée chacune'),
  iw3mRowsFin: s('both rows watered → {b} is home', 'les deux rangées arrosées → {b} est rentré'),
  iw3mRowsWr: s('a tulip gets thirsty again', 'une tulipe a de nouveau soif'),
  iw3mRowsSum: s('{n}/{t} tulips watered', '{n}/{t} tulipes arrosées'),
  iw3mNoteSrc: s('⛲ the well, which never runs dry', '⛲ le puits, qui ne tarit jamais'),
  iw3mNoteCar: s('🪣 the can in {b}’s hand, holds 3', '🪣 l’arrosoir de {b}, 3 gorgées'),
  iw3mNoteTgt: s('🌷 the row Mamie’s note asks for: 3 tulips, one drink each', '🌷 la rangée que demande le mot de Mamie : 3 tulipes, une gorgée chacune'),
  iw3mNoteFin: s('that row watered → {b} walks home', 'cette rangée arrosée → {b} rentre'),
  iw3mNoteWr: s('a tulip gets thirsty again', 'une tulipe a de nouveau soif'),
  iw3mNoteSum: s('{n}/{t} tulips of the note', '{n}/{t} tulipes du mot'),
  // P108 IW-006 (lane E): the shells a job earned — under the win card's thanks (smaller), and on the island after a lap.
  iw6eWinPay: s('+{n} 🐚 shells for the job', '+{n} 🐚 coquillages pour le travail'),
  iw6eIslePay: s('{r} +{n} 🐚', '{r} +{n} 🐚')
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
 * The islanders who ask, one row each: `Logic/Island pins` names each one's next request for this kid, and the island
 * (IG-004) stands her by that request's plot with its title as her bubble. The P105 sea with pins is gone (P106 s4).
 */
export const ISLAND_PINS: ReadonlyArray<{ id: string; islander: string; sprite: string }> = [
  { id: 'mamie', islander: 'mamie', sprite: 'house' },
  { id: 'biscuit', islander: 'biscuit', sprite: 'cat' },
  { id: 'sami', islander: 'sami', sprite: 'postie' }
];

/**
 * The Teach pad's keys in the pad's order (the mockup's `.pad`): the op each records, its fixed place on the d-pad (the
 * motions; an action's place is given at run time: the first allowed action takes the centre, the rest a third row),
 * its icon and its word. IG-001 D10: `Logic/Pad keys` draws one key per step the request allows, from this table.
 */
export const PAD_KEYS: ReadonlyArray<{ op: string; place: string; icon: string; word: string }> = [
  { op: 'fwd', place: 'bg-key-fwd', icon: 'fwd', word: 'bFwd' },
  { op: 'left', place: 'bg-key-left', icon: 'left', word: 'bLeft' },
  { op: 'water', place: '', icon: 'water', word: 'bWater' },
  { op: 'right', place: 'bg-key-right', icon: 'right', word: 'bRight' },
  { op: 'fill', place: '', icon: 'fill', word: 'bFill' },
  { op: 'pick', place: '', icon: 'pick', word: 'bPick' },
  { op: 'put', place: '', icon: 'put', word: 'bPut' },
  // P108 IW-001 F7: the pad is the drawer's actions — say, and Olive's read (a key that asks her, as the block does).
  { op: 'say', place: '', icon: 'say', word: 'bSay' },
  { op: 'olive:read', place: '', icon: 'read', word: 'rungRead' }
];

/**
 * P108 IW-003 (lane M, IW-001 F7 "the pad is the drawer's actions"): where the drawer has `go to nearest` / `go to`, the
 * pad has one key per kind lying on the plot when the request opens — a thing to fetch (`nearest`: go to the nearest egg)
 * or a place to take it (`to`: go to the basket; the key records a chip of the first one on the plot). Kinds nobody
 * fetches or visits (a tulip is watered where it stands) are not keys, so free play's pad is as it was.
 */
export const PAD_GO: { nearest: ReadonlyArray<string>; to: ReadonlyArray<string>; emoji: Readonly<Record<string, string>> } = {
  nearest: ['egg', 'letter', 'stone', 'food', 'ball', 'rock', 'can'],
  to: ['basket', 'bowl', 'store', 'door', 'site', 'postbox'],
  emoji: { egg: '🥚', letter: '✉️', stone: '🪨', food: '🍖', ball: '⚽', rock: '⛰️', can: '🪣', basket: '🧺', bowl: '🥣', store: '📦', door: '🚪', site: '🟫', postbox: '📮' }
};

/**
 * P108 IW-003 (lane M): the job card under the Workshop's world (IW-000's graded look: SOURCE · CARRIER · TARGET · FINISH
 * LINE · WEAR, README §4.1), one row per request that has one, by its word keys in PAGE_WORDS; `sum` says how much is done
 * with `{n}` of `{t}` (one target: its meter — drinks, eggs in the basket; more: how many are full). A request with no
 * row shows no card. Another lane adds its missions' rows at the END.
 */
export interface JobCard {
  src: string;
  car: string;
  tgt: string;
  fin: string;
  wr: string;
  sum: string;
}
const card = (k: string): JobCard => ({ src: `iw3m${k}Src`, car: `iw3m${k}Car`, tgt: `iw3m${k}Tgt`, fin: `iw3m${k}Fin`, wr: `iw3m${k}Wr`, sum: `iw3m${k}Sum` });
export const JOB_CARDS: Readonly<Record<string, JobCard>> = {
  'tulip-door': card('Door'),
  'tulips-three': card('Tulips'),
  'eggs-count': card('Eggs'),
  'rows-trick': card('Rows'),
  'mamie-note': card('Note')
};

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

/**
 * P106 IG-006 (lane C) — the page words Olive's three blocks, their cards, the three requests and Olive's lessons need.
 * 🔴 The FR lines are Richard's to read before the kids see them (IG-006 AC5).
 */
export const IG006_WORDS: Readonly<Record<string, Bi>> = {
  // The three requests (cg002Content.ts IG006_REQUESTS): title, blurb, the islander's line, the reward, the gift.
  rqNoteTitle: s('Water the flowers my note asks for', 'Arrose les fleurs que demande mon mot'),
  rqNoteBlurb: s('Olive reads', 'Olive lit'),
  rqNoteLine: s('"I left a note by the well. Ask Olive to read it: it says which tulips want water today, the red ones or the yellow ones."', '« J’ai laissé un mot près du puits. Demande à Olive de le lire : il dit quelles tulipes veulent de l’eau aujourd’hui, les rouges ou les jaunes. »'),
  stickerNote: s('Note sticker', 'Autocollant petit mot'),
  giftNote: s('A note sticker, from Mamie Rose', 'Un autocollant petit mot, offert par Mamie Rose'),
  rqFlowerTitle: s('Water the flowers, not the rocks', 'Arrose les fleurs, pas les rochers'),
  rqFlowerBlurb: s('Is it a…?', 'Est-ce un… ?'),
  rqFlowerLine: s('"Flowers and rocks, side by side. Fill the can at the pond, then ask Olive if each one is a flower before {b} waters it: rocks don’t drink. If she gets one wrong, ask three times."', '« Des fleurs et des rochers, côte à côte. Remplis l’arrosoir à la mare, puis demande à Olive si chacun est une fleur avant que {b} l’arrose : les rochers ne boivent pas. Si elle se trompe, demande trois fois. »'),
  stickerFlower: s('Rose sticker', 'Autocollant rose'),
  giftFlower: s('A rose sticker, from Sami', 'Un autocollant rose, offert par Sami'),
  rqThanksTitle: s('Carry the letter, then say thank you', 'Porte la lettre, puis dis merci'),
  rqThanksBlurb: s('Olive says it', 'Olive le dit'),
  rqThanksLine: s('"There is a letter for Mamie Rose in the post box. Take it to her door, then let Olive find the words to thank her."', '« Il y a une lettre pour Mamie Rose dans la boîte aux lettres. Porte-la à sa porte, puis laisse Olive trouver les mots pour la remercier. »'),
  stickerThanks: s('Bouquet sticker', 'Autocollant bouquet'),
  giftThanks: s('A bouquet sticker, from Sami', 'Un autocollant bouquet, offert par Sami'),
  // The cards (AC5): what every palette block does, in one line. {b} is the robot's name.
  cardGotIt: s('Got it', 'Compris'),
  cardExample: s('For example:', 'Par exemple :'),
  cdFwd: s('{b} takes one step forward, to the next square.', '{b} avance d’une case.'),
  cdLeft: s('{b} turns a quarter turn to the left, without moving.', '{b} tourne d’un quart de tour à gauche, sans avancer.'),
  cdRight: s('{b} turns a quarter turn to the right, without moving.', '{b} tourne d’un quart de tour à droite, sans avancer.'),
  cdWater: s('{b} waters the square in front. A tulip drinks; anywhere else, a puddle.', '{b} arrose la case devant lui. Une tulipe boit ; ailleurs, c’est une flaque.'),
  cdFill: s('{b} fills the can at the water in front. The can holds three; each water uses one.', '{b} remplit l’arrosoir à l’eau devant lui. L’arrosoir en contient trois ; chaque arrosage en prend un.'),
  cdPick: s('{b} picks up the thing in front and keeps it in the basket.', '{b} ramasse ce qu’il y a devant lui et le garde dans son panier.'),
  cdPut: s('{b} puts down the last thing it picked up, on the square in front.', '{b} pose la dernière chose ramassée sur la case devant lui.'),
  cdSay: s('{b} says a line out loud, in a bubble.', '{b} dit une phrase à voix haute, dans une bulle.'),
  cdRepeat: s('The blocks inside run again and again, as many times as the number says.', 'Les blocs à l’intérieur recommencent, autant de fois que le dit le nombre.'),
  cdUntil: s('The blocks inside run again and again, until what you chose is true.', 'Les blocs à l’intérieur recommencent, jusqu’à ce que ce que tu as choisi soit vrai.'),
  cdIf: s('The blocks inside run only if what you chose is true right now.', 'Les blocs à l’intérieur ne se font que si ce que tu as choisi est vrai à ce moment-là.'),
  cdWhen: s('The blocks inside run each time something happens, like Biscuit meowing.', 'Les blocs à l’intérieur se font chaque fois que quelque chose arrive, comme Biscuit qui miaule.'),
  cdCountInc: s('{b} adds one to the number it keeps in mind.', '{b} ajoute un au nombre qu’il garde en tête.'),
  cdTrick: s('Give some blocks a name. Then one “do” block runs them all.', 'Donne un nom à des blocs. Ensuite, un seul bloc « faire » les fait tous.'),
  cdDo: s('Runs the trick with that name, all its blocks.', 'Fait l’astuce qui porte ce nom, avec tous ses blocs.'),
  cdAsk: s('Olive answers a question, and her answer can steer the program.', 'Olive répond à une question, et sa réponse peut guider le programme.'),
  // P108 IW-003 (s3 base): the four statements IW-005 built, now in the drawer.
  cdGoNearest: s('{b} walks to the nearest one of that thing, the short way round, and stops facing it.', '{b} marche jusqu’au plus proche de ces objets, par le chemin le plus court, et s’arrête devant.'),
  cdGoTo: s('{b} walks to the thing you picked on the island, and stops facing it.', '{b} marche jusqu’à l’objet que tu as choisi sur l’île, et s’arrête devant.'),
  cdSet: s('{b} writes a number under a name, to remember it.', '{b} écrit un nombre sous un nom, pour s’en souvenir.'),
  cdChange: s('{b} adds to the number kept under that name.', '{b} ajoute au nombre gardé sous ce nom.'),
  cdOliveSay: s('Olive writes a thank-you in her own words, and {b} says it. Run it twice: it is never the same.', 'Olive écrit un merci avec ses mots, et {b} le dit. Lance-le deux fois : ce n’est jamais pareil.'),
  cdOliveRead: s('Olive reads the note on the plot and says which thing it means. Then “if Olive read…” chooses what {b} does.', 'Olive lit le mot posé dans le jardin et dit de quelle chose il parle. Ensuite, « si Olive a lu… » choisit ce que fait {b}.'),
  lsRead: s('Only Olive can read what an islander wrote, and her answer is always one of the things on the plot.', 'Seule Olive sait lire ce qu’un habitant a écrit, et sa réponse est toujours une des choses du jardin.'),
  // Olive's lessons on Skills (R7): the canned question each card asks, and the check the page does underneath.
  lsAsk: s('Ask Olive', 'Demander à Olive'),
  lsQ7: s('Mamie’s flowers: {list}. How many tulips?', 'Les fleurs de Mamie : {list}. Combien de tulipes ?'),
  lsCheck7: s('The program counts the word “tulip”: {n}.', 'Le programme compte le mot « tulipe » : {n}.'),
  lsQ8: s('What is 14 + 9?', 'Combien font 14 + 9 ?'),
  lsCheck8: s('The rule adds them: 14 + 9 = {n}.', 'La règle les additionne : 14 + 9 = {n}.'),
  lsQ9: s('Describe a tulip without the letter e.', 'Décris une tulipe sans la lettre e.'),
  lsCheck9: s('The page checked every letter: {n} × e.', 'La page a vérifié chaque lettre : {n} × e.'),
  lsCheck9None: s('The page checked every letter: no e at all. She kept the rule this time.', 'La page a vérifié chaque lettre : aucun e. Cette fois, elle a tenu la règle.'),
  lsQ10: s('Three questions about the world.', 'Trois questions sur le monde.'),
  lsBook: s('In a book: {x}', 'Dans un livre : {x}'),
  lsTrue1: s('the capital of Australia is Canberra.', 'la capitale de l’Australie est Canberra.'),
  lsTrue2: s('the Moon weighs about 73 billion billion tonnes, far more than a mountain.', 'la Lune pèse environ 73 milliards de milliards de tonnes, bien plus qu’une montagne.'),
  lsTrue3: s('the first bicycle was made in Germany, by Karl Drais, in 1817.', 'le premier vélo a été fait en Allemagne, par Karl Drais, en 1817.'),
  lsQ11: s('French → English, then English → French.', 'Du français vers l’anglais, puis de l’anglais vers le français.'),
  lsFrEn: s('French → English: “{q}”', 'Du français vers l’anglais : « {q} »'),
  lsEnFr: s('English → French: “{q}”', 'De l’anglais vers le français : « {q} »'),
  lsWobbly: s('Olive is better one way than the other.', 'Olive est meilleure dans un sens que dans l’autre.'),
  // P106 s3 lane B (IG-003): Drive · Teach · Play, and the islander's Predict challenge (R4, R5).
  ig3Drive: s('Drive', 'Conduire'),
  ig3Teach: s('Teach', 'Apprendre'),
  ig3DrivingTag: s('Just driving', 'Juste conduire'),
  ig3Driving: s('Just driving: nothing is remembered.', 'Juste conduire : rien n’est retenu.'),
  ig3TeachOn: s('Back to the start. Now show {b} the moves.', 'Retour au départ. Maintenant, montre les gestes à {b}.'),
  ig3TeachGoOn: s('{b} is where your steps end. Show {b} what comes next.', '{b} est là où tes pas finissent. Montre-lui la suite.'),
  ig3StepsDriving: s('Just driving: nothing here changes. Press Teach and every move becomes a block.', 'Tu conduis : rien ne change ici. Appuie sur Apprendre et chaque geste devient un bloc.'),
  ig3PredictAsk: s('Before you press Play, tap where {b} will stop.', 'Avant d’appuyer sur Jouer, touche la case où {b} va s’arrêter.'),
  ig3PredictRight: s('You were right!', 'Tu avais raison !')
};
export const IG006_WORD_KEYS: ReadonlyArray<string> = Object.keys(IG006_WORDS);

/** A block of a card's example (ids are given when the card is drawn). */
export interface CardBlock {
  t: string;
  n?: number;
  slots?: Record<string, string>;
  body?: ReadonlyArray<CardBlock>;
}

/**
 * P106 IG-006 AC5 — a card for EVERY palette block (not only Olive's): its label (the palette's own word), one line of
 * what it does, and an example drawn as blocks. The first tap on a palette block opens its card (and places nothing);
 * the `?` beside a placed block's kind opens it again. The unrendered `or6Line` ("Is the thing in front of {b} a
 * flower?") is `is it a…?`'s line; the other rungs' lines did not fit a block and stay unrendered.
 */
export const BLOCK_CARDS: Readonly<Record<string, { label: string; line: string; example: ReadonlyArray<CardBlock> }>> = {
  fwd: { label: 'bFwd', line: 'cdFwd', example: [{ t: 'fwd' }, { t: 'fwd' }] },
  left: { label: 'bLeft', line: 'cdLeft', example: [{ t: 'left' }, { t: 'fwd' }] },
  right: { label: 'bRight', line: 'cdRight', example: [{ t: 'right' }, { t: 'fwd' }] },
  water: { label: 'bWater', line: 'cdWater', example: [{ t: 'fwd' }, { t: 'water' }] },
  fill: { label: 'bFill', line: 'cdFill', example: [{ t: 'fill' }, { t: 'left' }, { t: 'left' }, { t: 'fwd' }, { t: 'water' }] },
  pick: { label: 'bPick', line: 'cdPick', example: [{ t: 'pick' }, { t: 'fwd' }, { t: 'put' }] },
  put: { label: 'bPut', line: 'cdPut', example: [{ t: 'pick' }, { t: 'fwd' }, { t: 'put' }] },
  say: { label: 'bSay', line: 'cdSay', example: [{ t: 'say', slots: { text: 'thanksMamie' } }] },
  repeat: { label: 'bRepeat', line: 'cdRepeat', example: [{ t: 'repeat', n: 3, body: [{ t: 'fwd' }] }] },
  until: { label: 'bUntil', line: 'cdUntil', example: [{ t: 'until', slots: { sensor: 'wall_ahead' }, body: [{ t: 'fwd' }] }] },
  if: { label: 'bIf', line: 'cdIf', example: [{ t: 'if', slots: { sensor: 'tulip_ahead' }, body: [{ t: 'water' }] }] },
  when: { label: 'bWhen', line: 'cdWhen', example: [{ t: 'when', slots: { event: 'meow' }, body: [{ t: 'fwd' }] }] },
  count_inc: { label: 'bCountInc', line: 'cdCountInc', example: [{ t: 'pick' }, { t: 'count_inc' }] },
  trick: { label: 'bTrick', line: 'cdTrick', example: [{ t: 'trick', slots: { name: 'row' }, body: [{ t: 'fwd' }, { t: 'water' }] }, { t: 'do', slots: { name: 'row' } }] },
  do: { label: 'bDo', line: 'cdDo', example: [{ t: 'do', slots: { name: 'row' } }] },
  ask: { label: 'bAsk', line: 'cdAsk', example: [{ t: 'ask' }] },
  go_nearest: { label: 'bGoNearest', line: 'cdGoNearest', example: [{ t: 'go_nearest' }, { t: 'pick' }] },
  go_to: { label: 'bGoTo', line: 'cdGoTo', example: [{ t: 'go_to' }, { t: 'put' }] },
  set: { label: 'bSet', line: 'cdSet', example: [{ t: 'set' }] },
  change: { label: 'bChange', line: 'cdChange', example: [{ t: 'change' }] },
  'olive:say-thanks': { label: 'rungSayThanks', line: 'cdOliveSay', example: [{ t: 'olive:say-thanks', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' } }] },
  'olive:read': { label: 'rungRead', line: 'cdOliveRead', example: [{ t: 'olive:read' }, { t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ t: 'water' }] }] },
  'olive:is-it-a': { label: 'rungIsItA', line: 'or6Line', example: [{ t: 'olive:is-it-a', slots: { kind: 'a flower', times: '3' } }, { t: 'if', slots: { sensor: 'olive_says:yes' }, body: [{ t: 'water' }] }] }
};
