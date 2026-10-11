# The runnable census — how much of each template a home-made editor could run in a page

**GENERATED** by `scripts/own/census.js` (phase 112, OWN-000). Do not edit; re-run. `--check` fails when this is stale.

Vocabulary at run time: catalog format 1.1.0, **180** node types, **147** in the P107 population, **108** specs, of which **37** run in a page on clock, randomness and time zone alone. Specs that do not mount with no parameters: `Open File Picker`.

The rule, in order (the first that fits wins): **component** (an instance of the project's own component) · **not in picker** (a type outside the P107 population) · **visual** (catalog `isVisual`) · **script** (P107 tier T6) · **page** (specced, mounts with no parameters, needs ⊆ {clock, random, timezone}) · **world** (specced, needs a registry, backend, router, popup, viewport, stack, network, socket, digest, location, project or picker) · **unspecced** (in the population, no spec yet).

| template | components | nodes | page | world | visual | script | component | not in picker | unspecced |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `bot-garden` | 135 | 1111 | 90 | 99 | 366 | 92 | 196 | 19 | 249 |
| `digital-bricks-training` | 82 | 955 | 19 | 78 | 319 | 149 | 60 | 168 | 162 |
| `digital-bricks-training-demo` | 37 | 455 | 1 | 34 | 191 | 78 | 29 | 73 | 49 |
| `landing-pages` | 28 | 494 | 15 | 15 | 341 | 19 | 75 | 3 | 26 |
| `members-area` | 32 | 573 | 25 | 67 | 344 | 50 | 32 | 13 | 42 |
| `nightbook` | 52 | 1528 | 0 | 328 | 272 | 373 | 429 | 46 | 80 |
| `pixel-game` | 9 | 97 | 14 | 14 | 29 | 11 | 17 | 5 | 7 |
| `planning` | 75 | 972 | 16 | 141 | 521 | 93 | 67 | 2 | 132 |
| `planning-demo` | 74 | 939 | 14 | 83 | 513 | 130 | 66 | 1 | 132 |
| `rocket-school` | 102 | 1146 | 91 | 144 | 322 | 191 | 192 | 30 | 176 |
| `story-engine` | 9 | 88 | 9 | 12 | 45 | 7 | 5 | 2 | 8 |
| `todo-list` | 80 | 883 | 29 | 116 | 398 | 92 | 100 | 2 | 146 |
| `todo-list-demo` | 79 | 852 | 24 | 81 | 388 | 113 | 99 | 1 | 146 |
| **all** | | **10093** | 347 | 1212 | 4049 | 1398 | 1367 | 365 | 1355 |

## On the real engine (OWN-003 AC4)

R1 ruled the runner is the real engine, opened up (`@noodl/preview`'s `noodl-graph-target.js`). The same nodes, counted against the **130** node types that engine registers in a page (`dev-docs/tasks/phase-112-your-own-nodegx/engine-types.json`, written by `graph-target-check --types`): **engine** (registered: it runs headless in a page, a spec or not, the escape hatches too) · **visual** (runs in a page through the real app, R4) · **component** · **not in picker** · **unregistered** (in the population, not visual, and the engine does not register it).

| template | nodes | engine | visual | component | not in picker | unregistered |
|---|---:|---:|---:|---:|---:|---:|
| `bot-garden` | 1111 | 529 | 366 | 196 | 19 | 1 |
| `digital-bricks-training` | 955 | 316 | 319 | 60 | 168 | 92 |
| `digital-bricks-training-demo` | 455 | 161 | 191 | 29 | 73 | 1 |
| `landing-pages` | 494 | 74 | 341 | 75 | 3 | 1 |
| `members-area` | 573 | 153 | 344 | 32 | 13 | 31 |
| `nightbook` | 1528 | 756 | 272 | 429 | 46 | 25 |
| `pixel-game` | 97 | 45 | 29 | 17 | 5 | 1 |
| `planning` | 972 | 381 | 521 | 67 | 2 | 1 |
| `planning-demo` | 939 | 358 | 513 | 66 | 1 | 1 |
| `rocket-school` | 1146 | 601 | 322 | 192 | 30 | 1 |
| `story-engine` | 88 | 35 | 45 | 5 | 2 | 1 |
| `todo-list` | 883 | 382 | 398 | 100 | 2 | 1 |
| `todo-list-demo` | 852 | 363 | 388 | 99 | 1 | 1 |
| **all** | **10093** | 4154 | 4049 | 1367 | 365 | 158 |

README §1 reading 6 counted **19 of 531** todo-list nodes as runnable in a page (the prototype's own runner). On the engine it is **382 of 883** headless, and **398** more through the real app.

Unregistered types, by name: `noodl.cloud.response` ×91, `noodl.cloud.request` ×41, `CSS Definition` ×12, `noodl.cloud.secret` ×4, `noodl.cloud.createuser` ×3, `noodl.cloud.addusertorole` ×2, `noodl.cloud.getuserroles` ×2, `noodl.cloud.hmac` ×1, `noodl.cloud.listusersinrole` ×1, `noodl.cloud.sendemail` ×1.

## What the specced-but-world nodes need

One count per need per node (a node that needs two things is counted under both). Across every template:

| need | nodes |
|---|---:|
| `registry` | 1020 |
| `backend` | 147 |
| `router` | 144 |
| `network` | 42 |
| `project` | 42 |
| `viewport` | 3 |
| `popup` | 2 |
| `location` | 1 |

## The unspecced types, by name

In the P107 population, not visual, not an escape hatch, and without a spec at run time. This is what the real engine would have to run for OWN-003 (R1).

| type | nodes across every template |
|---|---:|
| `Component Inputs` | 642 |
| `Component Outputs` | 555 |
| `noodl.cloud.response` | 91 |
| `noodl.cloud.request` | 41 |
| `net.noodl.GlobalStore.Set` | 5 |
| `net.noodl.GlobalStore.Subscribe` | 5 |
| `noodl.cloud.secret` | 4 |
| `noodl.cloud.createuser` | 3 |
| `net.noodl.GlobalStore` | 2 |
| `noodl.cloud.addusertorole` | 2 |
| `noodl.cloud.getuserroles` | 2 |
| `noodl.cloud.hmac` | 1 |
| `noodl.cloud.listusersinrole` | 1 |
| `noodl.cloud.sendemail` | 1 |

## Types outside the P107 population

| type | nodes across every template |
|---|---:|
| `Translation` | 196 |
| `Page` | 68 |
| `Language Bundle` | 18 |
| `Variable` | 16 |
| `keyboard-shortcuts.KeyboardShortcut` | 8 |
| `game-kit.Sound` | 7 |
| `i18next` | 6 |
| `garden-kit.Garden` | 5 |
| `dbt-lesson.PaceTracker` | 4 |
| `game-kit.Avatar` | 4 |
| `game-kit.Alien` | 3 |
| `game-kit.KeyboardMap` | 3 |
| `game-kit.RaceTrack` | 3 |
| `nightbook-kit.Page` | 3 |
| `dbt-lesson.ConversationPanel` | 2 |
| `dbt-lesson.DossierReveal` | 2 |
| `dbt-lesson.DossierSegment` | 2 |
| `dbt-lesson.RatingGauge` | 2 |
| `dbt-lesson.Section` | 2 |
| `dbt-lesson.TimelineRow` | 2 |
| `game-kit.KeepStorage` | 2 |
| `garden-3d-kit.Garden3D` | 2 |
| `game-kit.AnswerPad` | 1 |
| `garden-kit.BlockList` | 1 |
| `garden-kit.Blocks` | 1 |
| `garden-kit.Divider` | 1 |
| `nightbook-kit.Warmup` | 1 |

## README §1 reading 6, compared

The rough count the phase was scoped from, then this script's (the README's "other" is this script's not-in-picker plus unspecced). A ✗ marks a cell that moved.

- `todo-list`: total 531 → **883** ✗ · page 19 → **29** ✗ · world 92 → **116** ✗ · visual 201 → **398** ✗ · script 52 → **92** ✗ · component 71 → **100** ✗ · other 96 → **148** ✗
- `planning`: total 972 → **972** · page 16 → **16** · world 141 → **141** · visual 523 → **521** ✗ · script 92 → **93** ✗ · component 67 → **67** · other 133 → **134** ✗

## Per template

### `bot-garden`

- page (90): Condition ×57, States ×25, Timer ×5, Repeat ×2, Counter ×1
- world (99): Set Variable ×55, Variable2 ×33, RouterNavigate ×8, Static Data ×3 — needs: registry 91, router 8
- unspecced (249): Component Inputs ×125, Component Outputs ×115, net.noodl.GlobalStore.Set ×4, net.noodl.GlobalStore.Subscribe ×4, net.noodl.GlobalStore ×1
- not in picker (19): Page ×6, garden-kit.Garden ×5, game-kit.Avatar ×2, garden-3d-kit.Garden3D ×2, game-kit.KeepStorage ×1, garden-kit.BlockList ×1, garden-kit.Blocks ×1, garden-kit.Divider ×1

### `digital-bricks-training`

- page (19): Switch ×19
- world (78): RouterNavigate ×21, CloudFunction2 ×20, Variable2 ×12, PageInputs ×7, Set Variable ×7, Static Data ×5, net.noodl.user.LogOut ×2, net.noodl.user.RequestMagicLink ×2, net.noodl.user.User ×2 — needs: registry 30, router 28, network 20, project 20, backend 6
- unspecced (162): noodl.cloud.response ×57, Component Inputs ×40, Component Outputs ×31, noodl.cloud.request ×27, noodl.cloud.secret ×3, noodl.cloud.createuser ×1, noodl.cloud.getuserroles ×1, noodl.cloud.hmac ×1, noodl.cloud.listusersinrole ×1
- not in picker (168): Translation ×131, Page ×11, Variable ×9, Language Bundle ×8, dbt-lesson.PaceTracker ×2, dbt-lesson.ConversationPanel ×1, dbt-lesson.DossierReveal ×1, dbt-lesson.DossierSegment ×1, dbt-lesson.RatingGauge ×1, dbt-lesson.Section ×1, dbt-lesson.TimelineRow ×1, i18next ×1

### `digital-bricks-training-demo`

- page (1): Switch ×1
- world (34): RouterNavigate ×11, Variable2 ×10, Set Variable ×5, Static Data ×5, PageInputs ×3 — needs: registry 20, router 14
- unspecced (49): Component Inputs ×29, Component Outputs ×20
- not in picker (73): Translation ×43, Language Bundle ×8, Variable ×7, Page ×6, dbt-lesson.PaceTracker ×2, dbt-lesson.ConversationPanel ×1, dbt-lesson.DossierReveal ×1, dbt-lesson.DossierSegment ×1, dbt-lesson.RatingGauge ×1, dbt-lesson.Section ×1, dbt-lesson.TimelineRow ×1, i18next ×1

### `landing-pages`

- page (15): States ×5, Condition ×4, String Format ×3, And ×1, Counter ×1, String ×1
- world (15): RouterNavigate ×3, Static Data ×3, Filter Collection ×2, Set Variable ×2, Variable2 ×2, NavigationClosePopup ×1, NavigationShowPopup ×1, net.noodl.externallink ×1 — needs: registry 9, router 3, popup 2, location 1
- unspecced (26): Component Inputs ×22, Component Outputs ×4
- not in picker (3): Page ×3

### `members-area`

- page (25): Condition ×24, States ×1
- world (67): RouterNavigate ×26, DbCollection2 ×11, CloudFunction2 ×9, NewDbModelProperties ×6, DbModel2 ×4, DeleteDbModelProperties ×3, PageInputs ×3, SetDbModelProperties ×2, net.noodl.user.LogIn ×1, net.noodl.user.LogOut ×1, Screen Resolution ×1 — needs: router 29, backend 28, registry 28, network 9, project 9, viewport 1
- unspecced (42): noodl.cloud.response ×16, noodl.cloud.request ×8, Component Inputs ×7, Component Outputs ×4, noodl.cloud.addusertorole ×2, noodl.cloud.createuser ×2, noodl.cloud.getuserroles ×1, noodl.cloud.secret ×1, noodl.cloud.sendemail ×1
- not in picker (13): Page ×13

### `nightbook`

- page (0): none
- world (328): Set Variable ×194, Variable2 ×68, RouterNavigate ×26, DbCollection2 ×16, CloudFunction2 ×13, NewDbModelProperties ×5, SetDbModelProperties ×5, DeleteDbModelProperties ×1 — needs: registry 289, backend 27, router 26, network 13, project 13
- unspecced (80): Component Inputs ×31, Component Outputs ×25, noodl.cloud.response ×18, noodl.cloud.request ×6
- not in picker (46): Translation ×22, Page ×11, i18next ×4, nightbook-kit.Page ×3, game-kit.KeyboardMap ×2, Language Bundle ×2, game-kit.Avatar ×1, nightbook-kit.Warmup ×1

### `pixel-game`

- page (14): Condition ×6, Counter ×4, States ×2, String Format ×2
- world (14): Set Variable ×8, Variable2 ×4, Static Data ×2 — needs: registry 14
- unspecced (7): Component Inputs ×6, Component Outputs ×1
- not in picker (5): keyboard-shortcuts.KeyboardShortcut ×4, Page ×1

### `planning`

- page (16): Condition ×12, Counter ×4
- world (141): Set Variable ×69, NewDbModelProperties ×24, Variable2 ×17, DbCollection2 ×12, SetDbModelProperties ×11, net.noodl.user.User ×2, RouterNavigate ×2, DeleteDbModelProperties ×1, net.noodl.user.LogIn ×1, net.noodl.user.LogOut ×1, net.noodl.user.SignUp ×1 — needs: registry 139, backend 53, router 2
- unspecced (132): Component Inputs ×71, Component Outputs ×61
- not in picker (2): Page ×2

### `planning-demo`

- page (14): Condition ×10, Counter ×4
- world (83): Set Variable ×67, Variable2 ×16 — needs: registry 83
- unspecced (132): Component Inputs ×71, Component Outputs ×61
- not in picker (1): Page ×1

### `rocket-school`

- page (91): States ×43, Condition ×38, Counter ×4, net.noodl.animatetovalue ×3, Timer ×3
- world (144): Set Variable ×68, Variable2 ×37, RouterNavigate ×30, Static Data ×9 — needs: registry 114, router 30
- unspecced (176): Component Inputs ×87, Component Outputs ×86, net.noodl.GlobalStore ×1, net.noodl.GlobalStore.Set ×1, net.noodl.GlobalStore.Subscribe ×1
- not in picker (30): Page ×9, game-kit.Sound ×7, keyboard-shortcuts.KeyboardShortcut ×4, game-kit.Alien ×3, game-kit.RaceTrack ×3, game-kit.AnswerPad ×1, game-kit.Avatar ×1, game-kit.KeepStorage ×1, game-kit.KeyboardMap ×1

### `story-engine`

- page (9): Condition ×5, States ×2, Inverter ×1, String Format ×1
- world (12): Set Variable ×5, Variable2 ×3, RouterNavigate ×2, Static Data ×2 — needs: registry 10, router 2
- unspecced (8): Component Inputs ×5, Component Outputs ×3
- not in picker (2): Page ×2

### `todo-list`

- page (29): Condition ×15, States ×14
- world (116): Set Variable ×67, SetDbModelProperties ×17, Variable2 ×13, DbCollection2 ×6, NewDbModelProperties ×5, net.noodl.user.User ×2, RouterNavigate ×2, net.noodl.user.LogIn ×1, net.noodl.user.LogOut ×1, net.noodl.user.SignUp ×1, Screen Resolution ×1 — needs: registry 113, backend 33, router 2, viewport 1
- unspecced (146): Component Inputs ×74, Component Outputs ×72
- not in picker (2): Page ×2

### `todo-list-demo`

- page (24): States ×14, Condition ×10
- world (81): Set Variable ×67, Variable2 ×13, Screen Resolution ×1 — needs: registry 80, viewport 1
- unspecced (146): Component Inputs ×74, Component Outputs ×72
- not in picker (1): Page ×1

