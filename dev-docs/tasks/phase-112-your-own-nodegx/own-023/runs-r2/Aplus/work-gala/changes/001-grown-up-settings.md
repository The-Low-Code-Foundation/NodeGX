# 001 · The grown-ups' settings

## What was asked (word for word)

> This is a dance-school game my kids play: you run a dance school's gala night, plan the running order, the formations, the dances, the costumes and the snacks, then watch the evening play out. I want the grown-ups at home to be able to change the game themselves, without asking anyone and without touching code: rename a dance step, change how hard a step is, change what a costume costs, start a new school with more stars, add a new costume or a new step. Their changes must be theirs for good: still there after clearing the browser, on another computer, and after I install the next version of the game. Kids use this game too, so a child who finds the settings mustn't be able to break the game, put rude words on the screen, or make it do something it was never meant to do.
>
> The game is in this folder (plain JavaScript and three.js; `npm start` serves it, `npm test` runs the rules' tests). Add the grown-ups' settings to it. The game's rules are in src/engine.js, src/data.js, src/plan.js and src/tunes.js, with their tests: keep them as they are (src/data.js's applyRows is there for changed rows).
>
> Please just build it without waiting for me to answer questions.

## What you'll be able to see and do

1. When I tap the ⚙️ button quickly, the settings don't open. I only see a short note saying it's for grown-ups.
2. When I hold ⚙️ down for two seconds, I'm asked a sum. With the right answer typed in, the settings screen opens. With a wrong answer, it stays shut.
3. When I rename a dance step in Settings (in French and in English), I see the new name in the Formation tab, in the step by step of a try-out, and in the other language too.
4. When I change how hard a step is in Settings, I see its difficulty dots change in the Formation tab, and the slip risk changes for a dance that uses it.
5. When I change what a costume costs, I see the new price in the Costumes tab and in the Shop, and buying it takes exactly that many stars.
6. When I set the starting stars and press "Start a new school", the new school starts with that many stars. My settings stay as they are.
7. When I add a new costume (names, icon, price, minutes to put on, the dances it suits, what it looks like), I see it in the Costumes tab and the Shop, I can buy it, and the dancers wear it on stage.
8. When I add a new step (names, icon, counts, difficulty, styles, where it starts and ends, how it moves), I see it in the Formation tab, I can put it in a block, and the dancers dance it in a try-out.
9. When I press "back to default" beside a field, it goes back to the game's own value. "Everything back to default" does that for every field, after asking first.
10. When I clear the browser's data, or open the game in another browser on this computer, my settings are still there.
11. When I install a new version of the game (a fresh copy of the folder), my settings and the school's progress are still there.
12. When I press "Save to a file", I get a file. On another computer, "Load from a file" with that file brings back the same settings.
13. When someone types a rude word as a name (a step, a costume, a dancer, the school, a block), it never shows up. The game's own name stays and a kind message says why.
14. When someone types a number that's too big, below zero or not a number, the settings screen refuses it with a kind message, and the game keeps working.
15. When someone loads a broken or made-up file, the game keeps working: whatever is valid is kept, the rest is left out, and a message says so.
16. When a child clicks, drags, types and presses keys at random on every screen for a minute (the settings included), nothing breaks: no errors, the school still draws, and the save still loads.
17. When a name contains web code or a link, it shows as plain text, and nothing it says is run or opened.
18. When I change a setting, the running order, formations, dances, costumes and snacks I had planned are still there.
19. When I run the rule tests, all the old ones still pass, unchanged.
20. When I switch the language, everything on the settings screen switches between French and English.

## What I decided for you

- **The gate.** You hold ⚙️ (top right) for two seconds, then type the answer to a times-table sum (like 17 × 6). A
  quick tap only shows a note saying it's for grown-ups. To change: not a setting. It's the lock on the settings, so a
  child mustn't be able to switch it off.
- **When changes take effect.** Each change is stored at once. The game reloads when you press "Close and play", and
  your changes are in it from then on. The settings can't be opened during a rehearsal or the gala.
- **What can be changed.** Dance steps: names in French and English, and difficulty. Costumes: names, price, minutes
  to put on. Shop items (hairdos, shoes, accessories, furniture, snacks, hall and car park): names and price, plus
  minutes for hairdos. Also the class names, the dance names, the dancers' first names, and the stars a new school
  starts with. Things that are free in the game (the leotard, for example) stay free.
- **Things I didn't open up**, because changing them would break dances you have already made or put the game's own
  explanations out of step: a class's number of dancers, the length of a step that comes with the game, the music,
  and the evening's clock (the hall closing at 21:00, bedtime at 20:45).
- **New costumes and new steps.** Up to 12 of each. A new costume is drawn on stage like an existing costume you
  choose ("Looks like"), in the colour picked in the Costumes tab. A new step dances like an existing step you choose
  ("Moves like"). Settings → Costumes / Dance steps.
- **Removing a costume or step you added** (✕ Remove, after asking). A dance that used the step loses it. Dancers
  wearing the costume go back to their dance's usual costume. Nothing breaks.
- **More starting stars** only apply to a new school. That's what "start a new school" means, so the stars your
  children have already earned are never touched. Settings → School: set the number, then press "Start a new school"
  (it asks first). "Start again" in the Notebook uses the same number.
- **Limits:** names up to 24 letters (dancers' names up to 16), prices 0 to 500 stars, minutes 1 to 15, difficulty
  1 to 3, starting stars 0 to 9999. Each field has ↺ to go back to the game's value. "Put everything back as it was"
  is in Settings → File.
- **Rude words** are refused in French and in English, even with capitals, accents, spaces or digits for letters
  ("m3rde", "f u c k"). Mocking words like "idiot", "nulle" and "moche" are refused too, as are links and web code.
  The same filter now also covers the school's name and the block names, which already existed. A refused name is
  never stored: the game's own name stays.
- **The children's progress** (stars, purchases, the plan, the notebook) is now also kept beside the settings,
  outside the game folder. So it survives a new version too, as asked for the settings.
- **Something I fixed on the way.** On a phone, the camera buttons covered the stars, the sound and the language
  buttons at the top. The camera buttons now sit below them.
- I couldn't ask you, so I made every choice above myself, as asked.

## Report

| # | What you'll see | ✅/❌ | How I checked it | Screenshot |
|---|---|---|---|---|
| 1 | A quick tap on ⚙️ doesn't open the settings, only a note | ✅ | I tapped ⚙️ once. Nothing opened, and the note "Réglages des grands : reste appuyé deux secondes" appeared. | changes/001-shots/1.png |
| 2 | Holding ⚙️ asks a sum; only the right answer opens | ✅ | A hold of under a second did nothing. A two-second hold showed "Combien font … ?". A wrong answer said "Ce n'est pas ça" and gave a new sum. The right answer opened the settings. | changes/001-shots/2-wrong.png, 2.png |
| 3 | A renamed step shows everywhere, in both languages | ✅ | I renamed Plié to "Plié royal" / "Royal plié" and closed. The Formation tab listed "Plié royal" in the steps and in the little ones' block. A try-out of "Les lucioles" showed it step by step. After switching to English, it read "Royal plié". | 3-settings.png, 3.png, 3-en.png |
| 4 | A harder step shows more dots and raises the risk | ✅ | Plié showed ●○○ and the little ones' fireflies dance had a low slip risk. I set Plié to ●●● in the settings. After closing, the step showed ●●● and the risk was "élevé 🔴". | 4.png |
| 5 | A new costume price shows everywhere, and buying takes it | ✅ | I set the Fairy costume to 12 stars. The Costumes tab and the Shop both showed 12 ⭐, and buying it took the school from 30 to 18 stars. | 5.png |
| 6 | A new school starts with the stars I set | ✅ | I typed 120 in Settings → School and pressed "Start a new school" (it asked first). The game reloaded on season 1 with 120 ⭐, and the setting was still 120. | 6-settings.png, 6.png |
| 7 | A new costume can be bought and worn | ✅ | I added "Licorne / Unicorn": 🦄, 25 stars, 3 minutes, suits "Les lucioles", looks like the fairy. It appeared in Costumes as "25 ⭐ ✨". I bought it (30 → 5 stars), and the little ones wore it on stage. It is in the Shop too. | 7-settings.png, 7.png |
| 8 | A new step can go in a block and be danced | ✅ | I added "Papillon / Butterfly": 🦋, 8 counts, difficulty 2, ballet, moves like the arm sweep. In the seniors' Formation tab it showed "8 t · ●●○". I added it to block A and tried the dance: "Papillon" lit up step by step and the dancers raised their arms. | 8-settings.png, 8.png |
| 9 | ↺ and "everything back" restore the game's values | ✅ | After renaming Plié, ↺ put "Plié" back and the "changé" mark went away. "Put everything back" asked first: "no" kept my changes, "yes" cleared them all. | 9.png |
| 10 | Settings survive clearing the browser, and appear in another browser | ✅ | I renamed Plié, then reloaded, cleared the browser's storage and reloaded, then opened a brand-new browser: the name was there each time. With the server cut off, the game still opened, using this browser's copy. | 10.png |
| 11 | Settings and progress survive a new version | ✅ | I set a price and bought the costume (19 stars left), then stopped the game. I copied the game folder somewhere new, started it from there with a browser that had never seen it, and the price, the 19 stars and the costume were all there. | 11.png |
| 12 | Save to a file, load it on another computer | ✅ | I saved a file holding a renamed Plié and 55 starting stars. A second game, with its own settings folder and its own browser (standing in for the other computer), loaded it: "Fichier chargé", and the same settings applied. | 12.png |
| 13 | Rude words never show; the game's name stays | ✅ | "m3rde" as a step name, "P U T A I N" as a dancer's name, "École de m3rde" as the school name and "Fuuuck" as a block name were all refused with a kind message. Nothing was stored. The sign kept "École de danse Étoile", and the word left the box once I clicked away. | 13-settings.png, 13-school.png |
| 14 | Bad numbers are refused kindly; the game keeps working | ✅ | For a price, I typed −5 and 99999 ("Entre 0 et 500"), and "abc" and "2,5" ("Il faut un nombre"). The price stayed 35 each time. The − button stopped the starting stars at 0. The game then worked normally. | 14.png |
| 15 | A broken or made-up file changes nothing harmful | ✅ | A file that isn't settings and a shopping list got "Ce fichier n'est pas un fichier de réglages". A file over 100 KB got "trop gros". A mixed file kept the one good rename and said "3 réglages non valables laissés de côté". | 15.png |
| 16 | A minute of random play breaks nothing | ✅ | A one-minute random run of clicks, drags, typing and keys on every tab, a rehearsal and the settings, done twice: about 166 and 236 actions. No error in the console, the school kept drawing, every number stayed sane, and the save reopened in the same browser and in a new one. | 16.png |
| 17 | Web code or a link is shown as text at most, never run | ✅ | A step named with a hidden picture trick and one named "www.example.com" were refused. A settings file sent behind the game's back with code in a name was cleaned before it was stored. Requests from another website, for another file, or over 100 KB were refused, and nothing ran. | — |
| 18 | My plan is still there after changing a setting | ✅ | I moved a dance in the running order, chose fruit as the snack, changed a costume colour and added a step, then renamed a step in Settings. After the reload, the plan was exactly the same. | — |
| 19 | The old rule tests still pass, unchanged | ✅ | I ran the rule tests: all 39 pass, including the 19 that were there before, none of them edited. The four rule files are untouched. | — |
| 20 | The settings screen switches language | ✅ | In French it read "Réglages des grands", "Nom en français", and so on. After pressing EN, every tab ("Dance steps", "Costumes", "Shop", "School", "File") and every label was in English. | 20-en.png |

I also checked the settings on a phone-sized screen. It fills the screen, the "Close and play" button is visible, and
a rename made there showed up in the game (changes/001-shots/phone.png). The checks above were run at the MacBook's
size (1426×690). The run took about five minutes and the browser console stayed empty throughout.

**Not done, or worth knowing:**
- The sum keeps out younger children. A child who knows their times tables and holds the button could get in. A
  child who does can still only change things within the limits and through the word filter.
- "Another computer" was checked with a second copy of the game on this machine, with its own settings folder and its
  own browser. I didn't try a second real computer.
- No word list catches everything. The filter knows a few hundred French and English rude and mocking words, but a
  determined child could invent a spelling it doesn't know.
- I wrote the word filter a little before its tests, rather than after them. Every other part had its tests written
  first and seen failing first.

**How to try it yourself:** run `npm start`, open http://localhost:5173, then hold ⚙️ (top right) for two seconds,
type the answer to the sum, and change something: rename a step under "💃 Pas de danse", for example. Press "Fermer et
jouer" and look in the Formation tab. Your settings are kept in `~/.gala-de-danse/settings.json`, outside the game
folder. To run the checks: `npm test`, then `npm run check` (about 5 minutes).
