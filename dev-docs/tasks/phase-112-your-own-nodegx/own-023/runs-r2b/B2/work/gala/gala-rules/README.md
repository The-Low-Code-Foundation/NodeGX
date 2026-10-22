# gala-rules

The rules of the dance-school gala game, as plain ES modules with no DOM and no dependencies. `npm test` runs their tests.

- `src/engine.js`: `simulate({ plan, school, season, mode: 'rehearsal' | 'try' | 'gala', seed })` returns the whole evening
  as data: every verdict, each dancer's schedule, the points, a trace. Also `danceOf`, `routineInfo`, `judgeSpacing`,
  `judgeMusic`, `analyseLoge`, `stageOf`, `fits`, `againstWall`, `footprint`, `seatsOf`.
- `src/data.js`: every table the game knows (classes, numbers, moves, outfits, hairdos, shoes, accessories, furniture,
  snacks, upgrades, parking, rules, the starting stars) and `applyRows(over)`, which lays changed rows over the defaults
  in place (`EDITABLE` lists the tables).
- `src/plan.js`: `defaultPlan()`, `defaultSchool()`, `addSeasonNumbers()`, `migrateNumber()`.
- `src/tunes.js`: `score(id)`, every note of a number's music on the dance's counts.

The game in `reference/` shows how a page uses them: `reference/README.md` maps its files and states every rule.
