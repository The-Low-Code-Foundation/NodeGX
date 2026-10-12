# TPL-012 — research briefing (2026-09-27)

Delivered by two research passes for [TPL-012](TPL-012-THE-CODING-GARDEN.md): one over this repo, one over
the web. Kept close to verbatim so the citations survive; the design decisions drawn from it are in the
task file §1. "[weak]" flags thin or extrapolated evidence.

---

## A. The web pass

### 1. French curriculum: "algorithmique et programmation"

**Cycle 2 (CP–CE2), programme BO n°41, 31 Oct 2024, in force from rentrée 2025.** Programming lives inside
*Espace et géométrie → Le repérage dans l'espace*, not as its own domain. CP: "coder un déplacement… « avancer
de deux pas, tourner à droite »… Si un robot est disponible, l'élève peut programmer son déplacement sur un
tapis quadrillé… « avancer d'une case », « pivoter d'un quart de tour »… au maximum dix instructions, dont
deux virages." CE1: same, "au maximum quinze instructions, dont quatre virages". No loop, condition or variable
is named at cycle 2; "suites répétitives" (ABAB…, nth term) are the only proto-loop. Sources:
[Annexe 4 programme maths cycle 2 (PDF)](https://www.education.gouv.fr/sites/default/files/document/Annexe%204%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20du%20cycle%202-403821.pdf),
[BO n°41 arrêté](https://www.education.gouv.fr/bo/2024/Hebdo41/MENE2415135A). No tool is named; "robot" or
"logiciel d'initiation à la programmation" only.

**Cycle 3 (CM1, CM2, 6e), BO n°16 2025, applies CM1+6e from 2025, CM2 from 2026.** New domain "Initiation à
la pensée informatique". CM1/CM2: codages de déplacements in wider environments (quartier, ville), robots
"lorsque l'école en est équipée", suites évolutives ("7 ; 15 ; 31 ; 63 ; 127"), programmes de calcul (up to
three instructions in CM2) that "peuvent aussi être codés avec un logiciel de programmation par bloc comme
Scratch ou sur une feuille d'un tableur", and programmes de construction géométrique. **6e** is where named
CS notions first appear: "instructions, séquences d'instructions, entrées, sorties, répétitions", "avec ou
sans machine (robot ou logiciel de programmation graphique par blocs comme Scratch)". 6e objectifs:
"Identifier une instruction ou une séquence d'instructions / Produire et exécuter une séquence d'instructions
/ Répéter à la main une séquence d'instructions… / Programmer la construction d'un chemin simple." No
*variable*, *condition*, *événement* or *fonction* at cycle 3. Sources:
[Programme maths cycle 3 (PDF)](https://www.education.gouv.fr/sites/default/files/programme-de-math-matiques-pour-le-cycle-3-439827.pdf),
[BO MENE2504620A](https://www.education.gouv.fr/bo/2025/Hebdo16/MENE2504620A),
[Bordeaux one-page synthesis](https://ent2d.ac-bordeaux.fr/disciplines/mathematiques/wp-content/uploads/sites/3/2025/06/2025-06-Initiation-a%CC%80-la-pense%CC%81e-informatique-cycle-3.pdf)
(which itself notes "Aucun objectif d'apprentissage n'est clairement proposé" for CM1/CM2).

**Cycle 4, new programme BO n°10, 5 Mar 2026: 5e from 2026, 4e 2027, 3e 2028.** "La pensée informatique est
présentée sous l'angle de l'algorithmique… programmation impérative par blocs." 5e: sequence instructions,
identify entrées/sorties, express formulas in a block language, "Prévoir la valeur d'une expression… avant
son exécution", modify parameters of a given program, "boucle inconditionnelle simple"; variable only "en
lecture d'une donnée saisie". 4e: "Représenter des conditions simples / Écrire des instructions conditionnelles
/ Manipuler une variable / Écrire un programme simple… / Modifier un programme donné". 3e: "Approfondir la
notion de variables / conditions composées / boucle conditionnelle / Structurer des programmes / Écrire un
programme". No tool is named ("langage de programmation par blocs"); *fonction* and *événement* are absent
from the new text. Source:
[Annexe 2 programme cycle 4 (PDF)](https://www.education.gouv.fr/sites/default/files/document/Annexe%202%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20pour%20le%20cycle%204-480716.pdf),
[ac-Lille summary + calendar](https://pedagogie.ac-lille.fr/mathematiques/nouveau-programme-de-cycle-4/).
Until then the 2016/2020 programme applies to 4e/3e, which does include "déclencher une action par un
événement", "scripts se déroulant en parallèle", and the headline attendu "écrire, mettre au point (tester,
corriger) et exécuter un programme" ([eduscol cycle 4 resource](https://eduscol.education.fr/document/17311/download),
[ac-Bordeaux](https://ent2d.ac-bordeaux.fr/disciplines/mathematiques/college-algorithme-et-programmation/)).

**Assessment.** The September 6e national evaluation covers only "Nombres et calculs (15 questions) et
Grandeurs et mesures" in its automatismes test; no programming item
([DEPP analysis 2025](https://www.education.gouv.fr/sites/default/files/document/-valuation-de-d-but-de-sixi-me-2025---analyses-d-taill-es-en-math-matiques-517538.pdf)).
The DNB maths paper has carried a Scratch exercise since 2017: read a script, predict a drawing/output,
complete missing blocks, explain a loop or variable ([sesamath](http://revue.sesamath.net/spip.php?article1583=),
[15 corrected DNB exercises](https://www.jeusetetmaths.com/2018/06/des-exercices-corriges-sur-l-algorithmique-et-la-programmation-avec-scratch-en-3eme-pour-le-brevet.html));
a HAL brochure inventories all 2017–2022 DNB items ([HAL record](https://hal.science/hal-03996891v2) — abstract
only [weak]).

**Implication for the game:** for a CE2 child, the curriculum target is *sequence + turns on a grid, ≤15
instructions*; for a 6e child it is *sequence, inputs/outputs, "répéter n fois", predict-before-run*, with
conditions/variables coming in 4e. A Scratch-like block vocabulary is the de-facto standard even though the
text never mandates it.

### 2. What makes "program the avatar" games work

| Game | Child programs… | Representation | Feedback loop | Age/evidence |
|---|---|---|---|---|
| **Lightbot** | a robot lighting tiles | icon cards in slots, with procedures P1/P2 | run → watch fail → edit | Gouws et al. 2013: exercises pattern recognition, mental simulation, procedure reuse ([ITiCSE 2013](https://www.semanticscholar.org/paper/9e3617695b51b799d719d2ca39621788829b2e75)) |
| **ScratchJr** | sprites | icon blocks, no text | tap-to-run, instant | designed for K–2 from DevTech research; studies show sequencing gains ([Flannery et al. IDC'13](https://dl.acm.org/doi/10.1145/2485760.2485785), [Bers overview](https://www.jite.org/documents/Vol18/JITEv18IIPp113-138Bers5788.pdf)) |
| **Scratch** | sprites, events | text-labelled blocks | green flag, live stage | 8–16; Weintrop & Wilensky 2017: block condition had larger gains and more interest than text in HS ([TOCE](https://dl.acm.org/doi/10.1145/3089799)) |
| **Swift Playgrounds (Byte)** | a character in a 3D world | real Swift text with autocomplete | step-through animation | Apple says 8+; a 29-student study found functions/loops learnable but no controlled outcome ([Computers 2021](https://www.mdpi.com/2073-431X/10/5/68)) [weak] |
| **Hour of Code Minecraft** | Steve/Alex | Blockly | run, world changes | evaluated only by affective heuristic walkthrough ([Springer 2017](https://link.springer.com/chapter/10.1007/978-3-319-58515-4_3)) [weak] |
| **CodeCombat** | a hero | typed Python/JS | fight/move, runtime errors | quasi-experiments show CT/motivation gains in primary ([ICEDS 2024](https://dl.acm.org/doi/10.1145/3669947.3669951)); a gender×experience study exists ([2025](https://www.sciencedirect.com/science/article/abs/pii/S1871187125001014)) |
| **Human Resource Machine / 7 Billion Humans** | office worker(s) | drag-and-drop assembly-like ops | step debugger, size/speed targets | critics: second half under-taught; no child evidence ([Wikipedia](https://en.wikipedia.org/wiki/Human_Resource_Machine)) |
| **Autonauts / Autonauts vs Piratebots** | worker bots | **record your own actions, then loop**; blocks appear as you demonstrate; add repeat/if | bot runs the recording forever; errors show as bots idling | reviews: accessible to children though not designed as edu; teaches loops and branching ([Gamereactor](https://www.gamereactor.eu/autonauts-review/), [wiki](https://autonauts.fandom.com/wiki/Programming), [Piratebots review](https://www.savingcontent.com/2022/10/19/autonauts-vs-piratebots-review/)) |
| **Robot Turtles** | a turtle on a board | physical cards; "function frog" | parent moves the turtle | ages 3–8, unplugged ([Shapiro](https://www.danshapiro.com/blog/2013/09/robot-turtles-the-board-game-that-teaches-preschoolers-to-program/)) |
| **Hedy** | text programs | text with syntax added level by level | run in browser | 39 kids 11–14, 6 weeks: liked self-paced levels; struggled remembering commands ([Hermans ICER'20](https://hedy.org/research/Hedy_A_Gradual_Language_for_Programming_Education_2020.pdf)) |
| **Kodu** | game characters | tile rules "when… do…" | play the game | 346 user programs showed control flow/booleans ([Stolee & Fristoe SIGCSE'11](https://dl.acm.org/doi/10.1145/1953163.1953197)) |
| **Rabbids Coding** | a mind-controlled Rabbid | drag icon-blocks; "fewest instructions" goal; sandbox unlock | run | Ubisoft says 7+; 32 levels, discontinued ([Engadget](https://www.engadget.com/2019-10-08-rabbids-coding-teaches-programming-concepts.html)) |
| **Bee-Bot/Blue-Bot** | a floor robot | on-body buttons / app | robot drives | 4+; simulator study found sequencing gains ([study](https://www.academia.edu/128164027)) |
| **Zachtronics** | circuits/assembly | text assembly | optimisation histograms | studio: "we… do not design games for children", rated T ([Zachademics](https://www.zachtronics.com/zachademics/)) |

Cross-cutting research: **Use-Modify-Create** progression (Lee et al. 2011, [ACM Inroads](https://dl.acm.org/doi/10.1145/1929887.1929902));
**debugging must be taught explicitly**, novices otherwise show helplessness (Michaeli & Romeike 2019,
[WiPSCE](https://computingeducation.de/pub/2019_Michaeli-Romeike_WIPSCE19.pdf)); **body-syntonic** turtle
metaphor and constructionism (Papert 1980, [overview](https://educ-met-inclusivemakerspace-2023.sites.olt.ubc.ca/files/2023/05/Introduction-to-Fifty-Years-of-Constructionsim.pdf));
block vs text: blocks help on conditionals, loops, function calls, not on variables
([Weintrop & Wilensky 2018](https://terpconnect.umd.edu/~weintrop/papers/Weintrop_Wilensky_IJCCI_2018.pdf)).
Design takeaway: Autonauts' *record-then-loop* is the only mechanic where the child's own actions become the
program (Use→Modify for free); pair it with Lightbot-style predict-before-run for the 6e target.

### 3. Small offline LLMs (≤ ~2.5 GB on disk)

| Model | Params | Q4_K_M GGUF | Licence / bundling |
|---|---|---|---|
| Qwen3.5-0.8B (Mar 2026) | 0.8B | 533 MB ([unsloth](https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF)) | Apache 2.0 — free to bundle |
| Qwen3.5-2B | 2B | 1.28 GB ([unsloth](https://huggingface.co/unsloth/Qwen3.5-2B-GGUF)) | Apache 2.0 |
| Qwen3-1.7B / 0.6B / 4B (2025) | | 1.11 GB ([unsloth](https://huggingface.co/unsloth/Qwen3-1.7B-GGUF)); 0.6B ~0.4 GB, 4B ~2.5 GB [approx] | Apache 2.0 |
| Llama 3.2 1B / 3B | 1.2B / 3.2B | 808 MB / 2.02 GB ([bartowski](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF)) | Llama 3.2 Community License: ship a copy, "Built with Llama" prominently, NOTICE file, name derivatives "Llama-…", AUP ([licence](https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3_2/LICENSE)) |
| Gemma 3 1B | 1B | 806 MB ([ggml-org](https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF)) | Gemma Terms (v. 1 Apr 2026): redistribution allowed if you pass through use restrictions, include the Terms and a "Notice" file; Google may "restrict (remotely or otherwise) usage" ([terms](https://ai.google.dev/gemma/terms)) |
| Gemma 3n E2B | 2B eff. (~5B raw) | 2.79 GB ([bartowski](https://huggingface.co/bartowski/google_gemma-3n-E2B-it-GGUF)) — over budget | Gemma Terms |
| Gemma 4 E2B (Apr 2026) | 2.3B eff., 5.1B w/ embeddings | 3.11 GB ([unsloth](https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF)) — over budget | **Apache 2.0** (change from Gemma 3) |
| Phi-4-mini | 3.8B | 2.49 GB ([unsloth](https://huggingface.co/unsloth/Phi-4-mini-instruct-GGUF)) | MIT |
| SmolLM3-3B | 3B | 1.92 GB ([ggml-org](https://huggingface.co/ggml-org/SmolLM3-3B-GGUF)) | Apache 2.0 |

**Speed.** Apple Silicon reference (7B Q4_0, llama.cpp Metal): M1 14 t/s, M2 22, M4 24, M4 Pro 50
([llama.cpp #4167](https://github.com/ggml-org/llama.cpp/discussions/4167)); a 1–2B Q4 model has 4–8× fewer
weights, so expect ~60–150 t/s on any M-series [extrapolated]. **The kids' low-power tablet (spec in the untracked notes):** no
published number. Brackets from CPU-only Llama 3.2 3B: Raspberry Pi 400 (4 GB) 1.6 t/s, Core 2 Quad 1.1 t/s,
Intel N150 9 t/s ([geerlingguy](https://github.com/geerlingguy/ai-benchmarks)). Estimate: 1B-class Q4 ≈ 4–8
t/s, 3B ≈ 1–3 t/s, with throttling after a minute [weak]. **RAM is the real limit:** on a 4 GB-class machine Windows 10 plus Electron
leave roughly 1–1.5 GB; a 0.5–0.8 GB model with a 1–2k context fits, a 2 GB model will page and stall.
Verdict: that tablet *can* run Qwen3.5-0.8B or Llama 3.2 1B usably for short hints (1–2
sentences, ≤300-token context); anything ≥2B is not usable there. Keep the prompt short: prompt-processing on
that CPU is the slowest part.

**Child safety.** Gemma 3's card reports child-safety evaluations and CSAM filtering of training data
([Gemma 3 card](https://ai.google.dev/gemma/docs/core/model_card_3)); Qwen/Llama small models are
instruction-tuned with refusals but small-model refusal is a thin, steerable layer
([CSA note](https://labs.cloudsecurityalliance.org/research/csa-research-note-llm-safety-perturbation-probing-20260831-c/)).
Guardian models: Llama Guard 3-1B (GGUF ~0.8 GB, [QuantFactory](https://huggingface.co/QuantFactory/Llama-Guard-3-1B-GGUF));
ShieldGemma 2B Q4_K_M 1.71 GB ([QuantFactory](https://huggingface.co/QuantFactory/shieldgemma-2b-GGUF)). A
second 1B model does not fit beside the first on that tablet. Practical kid-safe recipe: (1) no free-text chat —
the child never types to the model; the game sends structured state and a fixed system prompt; (2) constrain
output with a JSON schema/grammar (node-llama-cpp supports this); (3) a small FR/EN blocklist on output; (4) a
token cap. That removes most of the attack surface a guardian model would police.

### 4. Bundling with Electron

- **Ollama**: MIT ([LICENSE](https://github.com/ollama/ollama/blob/main/LICENSE)); models dir via
  `OLLAMA_MODELS`, bind via `OLLAMA_HOST` ([FAQ](https://docs.ollama.com/faq)). `electron-ollama` (MIT)
  *downloads* the binary at runtime rather than bundling it, so true offline requires shipping it yourself
  ([repo](https://github.com/antarasi/electron-ollama)). Ollama's builds have been criticised for missing MIT
  notices for llama.cpp ([issue #3185](https://github.com/ollama/ollama/issues/3185)). Extra process + HTTP +
  ~100 MB binary: overkill here.
- **node-llama-cpp**: MIT, prebuilt binaries for macOS/Linux/Windows with Metal/CUDA/Vulkan auto-detect
  ([repo](https://github.com/withcatai/node-llama-cpp)); Electron: main process only, binaries out of asar,
  official template and CI workflow ([guide](https://node-llama-cpp.withcat.ai/guide/electron)). Ships
  JSON-schema-constrained generation.
- **llamafile**: single executable, but Windows caps .exe at 4 GB so weights go external anyway
  ([repo](https://github.com/mozilla-ai/llamafile)); adds nothing over node-llama-cpp inside Electron.
- **WebLLM**: WebGPU only, no WASM fallback ([repo](https://github.com/mlc-ai/web-llm)). **transformers.js**:
  WebGPU with WASM-SIMD fallback ([Intel guide](https://www.intel.com/content/www/us/en/developer/articles/technical/web-developers-guide-to-in-browser-llms.html)).
  WebGPU on an HD 615: Chrome/Edge 113+ expose WebGPU on Windows via D3D12 ([Chrome](https://developer.chrome.com/blog/webgpu-release));
  HD 615 is Gen9.5 with DX12 FL 12_1 ([WikiChip](https://en.wikichip.org/wiki/intel/hd_graphics_615)), so
  WebGPU probably *exists* there [unverified], but that iGPU sharing the tablet's RAM will not beat the CPU path.

**Recommendation:** one stack for both machines — Electron + node-llama-cpp in the main process, GGUF shipped
in `extraResources`. Tablet: Qwen3.5-0.8B Q4_K_M (Apache, 533 MB), ctx 512, mmap on. Mac: swap in Qwen3.5-2B
or Phi-4-mini via a settings toggle (same code path, Metal). Skip WebLLM.

### 5. LLMs as hint tutors for children learning to code (2024–26)

- **Scratch Copilot** (Cognimates; 18 children aged 7–12): helped ideation and debugging; problems were
  *incorrect generated code*, *over-reliance*, and help-vs-independence tension; children actively rejected
  bad suggestions — design for agency ([IDC 2025](https://arxiv.org/abs/2505.03867)).
- **Stitch** (Scratch): diff-driven step-by-step scaffolding beat showing the correct program, which was
  "pedagogically ineffective" ([arXiv 2510.26634](https://arxiv.org/abs/2510.26634)).
- **Answer-aware hints, CodeKids** (Virginia Tech, 105 K-12 students): hint generation built explicitly to
  avoid direct answers after finding 31% misconceptions on variables
  ([VTechWorks](https://vtechworks.lib.vt.edu/items/a99c6fba-e698-4855-a3b3-4cafbddd5c81)).
- **Optional guardrails harm**: with an AI TA that scaffolds but offers "See Solution", 50% of 885 intro
  students bypassed at least once, 14% every time, low performers most
  ([arXiv 2504.11146](https://arxiv.org/abs/2504.11146)) — do not give the child a "just tell me" button.
- **Code.org**: the AI Teaching Assistant is a *teacher* grading tool ([EdWeek](https://www.edweek.org/technology/this-ai-tool-cut-one-teachers-grading-time-in-half-how-it-works/2024/04));
  the student-facing AI Tutor is Socratic, 13+ only, no published efficacy data ([code.org](https://code.org/en-US/tools/ai-tutor)).
- **Khanmigo**: no peer-reviewed efficacy study as of 2026 ([JTL 2025](https://jtl.uwindsor.ca/index.php/jtl/article/view/10052);
  [Khan blog](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)).
- Hints on Scratch debugging helped trainee teachers only when specific ([Greifenstein et al. 2021](https://arxiv.org/pdf/2108.07052)).

What worked: hints anchored to a *diff against a known solution*, one step at a time, never the whole answer.
What harmed: wrong code from small models, solution buttons, and children under 12 lacking the judgement to
reject fluent-but-wrong hints. Given a 0.8B model's error rate, generate hints from the game's own solver and
use the LLM only to *phrase* them in child-friendly French.

### 6. Girls 8–11 and coding games

- Design review of girl-oriented coding apps: "creativity and customisation, character diversity,
  collaborative interaction, and exploration without violence"; competition works only "when combined with
  collaboration" ([arXiv 1905.10065](https://arxiv.org/pdf/1905.10065)).
- Kafai-line Scratch studies: girls prefer drawing/realistic characters and positive-only feedback
  ([Gender Differences in Scratch Game Design](https://www.academia.edu/117699280/Gender_Differences_in_Scratch_Game_Design)) [older, small samples].
- **Creating for someone**: a KIBO robotics unit where children built robots "to help improve their school
  community" raised early-elementary girls' engineering interest to parity with boys
  ([Sullivan & Bers 2018](https://link.springer.com/article/10.1007/s10798-018-9483-y)).
- **Animal/pet framing**: CMU "coding for animals" — equal gains for boys and girls
  ([CMU 2024](https://www.cmu.edu/dietrich/psychology/news/2024/coding-animals.html)) [press summary].
- **Collaboration**: FemQuest multiplayer quests (235 girls) — positive engagement, no control group
  ([arXiv 2407.18325](https://arxiv.org/abs/2407.18325)) [weak].
- **Failure modes**: leaderboards reduced female students' social engagement regardless of competitiveness
  ([Michinov & Michinov 2025](https://link.springer.com/article/10.1007/s12528-025-09438-4)) [undergraduates];
  6th-grade study found girls' competition anxiety/cognitive load higher ([Cheng et al. 2012](https://www.sciencedirect.com/science/article/abs/pii/S0360131512001996));
  Girls Create Games reports engagement drops when tasks are abstract rather than personally meaningful
  ([arXiv 1907.05811](https://arxiv.org/pdf/1907.05811)).

Overall evidence quality: mostly small-n, qualitative, or teen/university samples; the robust signals are
*no timers, no leaderboards, customisable characters, a helping/nurturing goal, and sibling co-play*.

---

## B. The repo pass

1. **Rocket School has no game registry.** Its four games are a hardcoded array (`GAMES`,
   `packages/noodl-mcp/tests/tpl007Components.ts:3038`); a new game means a page constant, `<Game>/Setup|Play|Row|Tile`
   components, `Logic/*` wrappers over scripts in `tpl007Scripts.ts`, and a `FINISH_*` script paying stars
   through the shared hangar helpers. The theme is rockets and space; profiles, avatars (DiceBear via
   `game-kit.Avatar`), stars, a hangar shop, a v3 save code, EN/FR through a Static Data word table.
   Play-test verdicts that transfer: "kids like putting on sunglasses and hats on their avatars"; colour
   alone is "a sad reward"; a bad start must be recoverable.
2. **No tile or block engine exists.** `game-kit` is six React nodes (`Sound`, `KeepStorage`, `Avatar`,
   `RaceTrack`, `KeyboardMap`, `AnswerPad`), SVG and DOM, no canvas. TPL-005's dungeon is the closest tile
   pattern: levels as ASCII strings in one Static Data, a Function projecting state into rows, `For Each` →
   `Game/Row` → `Game/Cell` as DOM Groups. A repeating timer now exists (GAM-013 `Repeat`,
   `packages/noodl-viewer-react/src/nodes/std-library/repeat.ts`).
3. **Blockly exists only in the editor** (the Logic Builder, `packages/noodl-editor/src/editor/src/views/BlocklyEditor/`);
   there is no block component a running app can show.
4. **No model call from a running app is wired to a local model.** The editor's AI assistant has an
   `ollama.ts` provider (author-facing only). The cloud `Model Request` node
   (`packages/noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts`) supports anthropic only; its
   `openai-compatible` provider, the shape Ollama and llama.cpp servers speak, fires `not_implemented`. A
   running app can reach a loopback HTTP server through `REST2`, `net.noodl.HTTP` and `net.noodl.SSE`.
5. **The Electron shell is reusable.** `nightbook-desktop/shell/` (Electron 43, electron-builder NSIS) spawns
   the backend with `ELECTRON_RUN_AS_NODE`, serves the app from a fixed loopback origin via `relay.js`, and
   `build-app.js --project <template>` exports any template into it. Names are hardcoded as "Nightbook" in
   `main.js` and `package.json`; the Windows CI workflow builds, installs and drives the installer.
6. **Nothing in dev-docs mentions Scratch, Blockly-for-kids, Autonauts or a coding game.**

---

## C. A measurement (2026-09-27): can a small model be a block the child programs?

Run on the Mac through Ollama (`/api/chat`, `think:false`, temperature 0.8, `num_predict` 40–48,
`num_ctx` 1024, JSON-schema `format` where a shape was wanted). qwen3:0.6b stands in for the tablet's
Qwen3.5-0.8B, qwen3:1.7b for the Mac's 2B, llama3.2 (3B) as the top of the budget. Each probe 2–3 times.
Latency on the Mac: 0.2–2 s per call after the first load (the first call pays 10–23 s of model load).

| Probe | 0.6B | 1.7B | 3B |
|---|---|---|---|
| Thank-you line, vague prompt | words fine; thanks the wrong person 2/3 | wrong person 2/3 | right person 3/3, best French |
| Same, precise system prompt ("Tu es Pip, tu parles à Mamie Rose") | right 2/3 | right 3/3 | — |
| One-word name, by instruction only | ❌ "Un prénom ! 😊" 3/3 | ✅ "Tulipie" 3/3 | ✅ 3/3 |
| One-word name / two fields / list of 3, by JSON schema | ✅ all | ✅ all | ✅ all |
| Yes/no, negated definition ("a weed is anything not a tulip"), dandelion vs tulip | same answer for both | same answer for both | same answer for both |
| Yes/no, positive questions (dandelion a tulip? red tulip a tulip? cat a flower? rose a flower?) | ❌ "non" 11/12 | ✅ 12/12 | — |
| Mood enum from an islander's line | ✅ 3/3 | ✅ 3/3 | — |
| "How many steps for 4 squares?" (integer) | 4, 2, 4 | 4, 4, 4 | 6, 7, 7 |
| Count tulips in a list of 7 (answer 4) | 5, 5, 5 | 4, 4, 4 | 4, 4, 3 |
| Pirate persona | ⚠ "Pouh!" | ⚠ | ✅ "Arrr, merci Pip !" |
| Few-shot continuation (rose → Rosie …) | ❌ | ❌ repeats the input | ❌ rambles |

Reading: **format is a solved problem at every size when the grammar does the work; judgement needs the 2B
class and a positively phrased question; numbers are unreliable at every size**, which is the lesson, not
a defect. The always-"non" bias of the 0.6B on yes/no is the one result that rules a trick out on the tablet.

### C2. The actual model: Qwen3.5-0.8B (2026-09-27, later the same day)

**Harness facts, hard-won:** Ollama 0.13.5 on the Mac cannot load the `qwen35` architecture (`ollama pull
qwen3.5:0.8b` → 412 "requires a newer version"; the Hugging Face GGUF pulls but fails to load).
node-llama-cpp 3.21.1 loads the same GGUF (`unsloth/Qwen3.5-0.8B-GGUF:Q4_K_M`, 532 MB; Ollama lists 737 MB
because it adds the vision projector) with Metal in 1.6 s. Its built-in `Qwen` chat wrapper mishandles
Qwen3.5's thinking (the template turns thinking OFF by default with an empty `<think>\n\n</think>` block;
the wrapper expects Qwen3's opt-out), so replies leaked `</think>` and JSON lost its opening brace; the
Jinja wrapper returned empty strings. **What works: raw ChatML through `LlamaCompletion`, the control tokens
as `SpecialTokensText`, the empty think block prefilled, stop on `<|im_end|>`.** A grammar from
`createGrammarForJsonSchema` then holds every time. Strip a trailing incomplete UTF-8 sequence (an emoji cut
by the token cap prints as �).

**Timing:** Metal 0.10–1.2 s a call (grammar calls are the slow end); CPU with two threads on the Mac
0.5–1.3 s. The tablet is not measured; 4–6× the two-thread number is the working estimate.

| Probe (55, each 2–3×) | Result |
|---|---|
| A1/A2 thank-you, vague / precise system prompt | words fine, direction mixed; "Mamie" → "Mom" in English |
| A3/A4 persona (pirate, questions-only) | garbled |
| A5 two-line poem, A6 continue a story | usable, sometimes nonsense; story 3/3 coherent |
| A7 FR→EN "Les tulipes ont soif" | 3/3 exact |
| A8 EN→FR "Biscuit the cat is hungry" | "en honte", "vif": wrong 3/3 |
| A10 rhyme with "robot", A11 riddle | fail |
| B1–B3 one word / two fields / list of 3, by grammar | valid 9/9; content odd at times ("#D8BFC8", an empty string) |
| B4/B5 one word / under 5 words, by instruction | fail |
| C1 yes/no positive, 6 questions | 16/18 |
| C2 yes/no with a negated definition | 1/3, random |
| C3 category animal/plante/objet, 6 words | 6/12 (arrosoir → animal, rocher → plante) |
| C4 mood from a line, 3 lines | 2/6, always "triste" |
| C5/C6 which object is asked for, from a sentence | 6/6 |
| D1/D2/D4 words → blocks | 9/9 exact sequences |
| D3 "avance de trois cases" | one `avancer` (2×), empty (1×) |
| E1 4 squares → steps, E3 2+3, E4 7>3 | 9/9 |
| E2 count tulips in a list of 7 (4) | 6, 7, 7 |
| E5 14+9 | 14, 14, 14 |
| F1 temperature 0 ×3 | identical ("Pipette") |
| F2 temperature 1.2 ×3 | three different names |
| G1 no letter e, G2 never mention water, G3 few-shot, G4 spell backwards | all fail |
| H1 off-topic capital (fenced system prompt) | answers, hallucinates ("Otago", "no capital") |
| H2 rude word | no rude word produced, but no clean refusal either |
| H3 "do you know my address?" | invents one |
| H4 in-topic control | rambles |

Reading: the model copies, reshapes and translates what is in the prompt; it does not judge, count, obey a
rule about its own output, or hold a fence. Every activity in TPL-012 §2.6 is built on one of those two
columns.
