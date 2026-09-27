# TPL-007 — research briefing (2026-09-12)

Delivered by a research pass for [TPL-007](TPL-007-THE-MATHS-AND-TYPING-GAME.md). Kept verbatim so
the citations survive; the design decisions drawn from it are in the task file §1.

## 1. Learning mechanics for maths fluency

**Retrieval practice and spacing (strong evidence).** Retrieval practice (flashcard-style recall) beat restudy (chanting) for multiplication-fact fluency in 2nd graders, both short- and long-term, in an authentic classroom study ([Ophuis-Cox et al. 2023](https://onlinelibrary.wiley.com/doi/10.1002/acp.4141)). Primary children who practised retrieval recalled more facts at 4 days, 1 and 5 weeks ([Karpicke et al., PMC3827082](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3827082/)). Dunlosky's review ranks practice testing and distributed practice in the top tier ([summary](https://www.structural-learning.com/post/robert-bjork-teachers-guide-desirable)). Caveat: children's optimal spacing may differ from adults' ([Vlach, "When are difficulties desirable for children?"](https://www.sciencedirect.com/science/article/abs/pii/S2211368120300607)).

**Interleaving (strong, large effect).** Preregistered cluster RCT, 787 pupils: interleaved practice 61% vs blocked 37% on a delayed test, d = 0.83; meets WWC standards without reservations ([Rohrer et al. 2020](https://gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf); [WWC](https://ies.ed.gov/ncee/wwc/Study/88770)). Note practice accuracy *drops* under interleaving (89%→60% in Rohrer & Taylor 2007) while delayed test scores rise — so don't let in-session accuracy alone drive difficulty.

**Adaptive difficulty / target success rate.** The "85% rule" (Wilson et al. 2019) is derived from gradient-descent learners and binary tasks, then argued to generalise to animals/humans — suggestive, not a classroom result ([Nature Comms](https://www.nature.com/articles/s41467-019-12552-4)). The best-validated child-maths system, Math Garden (Klinkenberg et al. 2011), uses an Elo model updating ability and item difficulty after every answer, scores on accuracy *and* response time, and samples items at ~75% success probability ([Klinkenberg 2011](https://www.sciencedirect.com/science/article/abs/pii/S0360131511000418); [Pelánek, Elo in adaptive systems](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)). Elo is preferred over BKT in practice because it's cheap, online and explainable ([survey](https://link.springer.com/article/10.1007/s11257-025-09439-z)).

**Feedback timing (mixed).** Meta-analytic average effect of timing ≈ null with high heterogeneity; lab studies favour delayed, classroom studies favour immediate ([review](https://www.researchgate.net/publication/373114533_Immediate_Versus_Delayed_Feedback_on_Learning_Do_People's_Instincts_Really_Conflict_with_Reality)). For fact fluency in young learners, immediate corrective feedback is the defensible default (XtraMath, Reflex, Math Garden all do it).

**Worked examples.** Robust for novices (cognitive load theory); fade steps as competence grows; redundant for experts ([worked-example effect](https://en.wikipedia.org/wiki/Worked-example_effect); [faded examples 2026](https://bpspsychub.onlinelibrary.wiley.com/doi/full/10.1111/bjep.12781)).

**Timed pressure — honestly mixed.** Boaler claims timed tests cause maths anxiety in ~⅓ of pupils ([Fluency Without Fear](https://www.youcubed.org/evidence/fluency-without-fear/)); critics show the "one-third" figure is her own estimate and key citations don't support the claim ([Ashman critique](https://fillingthepail.substack.com/p/timed-tests-and-maths-anxiety)). Meanwhile fluency-intervention meta-analyses (Codding et al. 2011; Methe et al. 2012) find timed/"explicit timing" drill effective for basic facts, but *speed without accuracy did less well* ([Codding 2011](https://www.researchgate.net/publication/230048534_Meta-Analysis_of_Mathematic_Basic-Fact_Fluency_Interventions_A_Component_Analysis); [Methe summary](https://www.pedagogynongrata.com/math-fact-fluency); [MD meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC13069136/)). XtraMath's compromise: a 3-second per-fact threshold (long enough to type, short enough to exclude counting), with teacher-selectable slower timers ([XtraMath](https://home.xtramath.org/support/what-are-the-timer-options-and-how-do-they-benefit-students)); Reflex uses a "fact family" model and adapts retrieval difficulty continuously ([Reflex](https://help.explorelearning.com/en/articles/9000630-reflex-overview)).

## 2. Motivation

**SDT in games.** Autonomy and competence satisfaction predict enjoyment and return-to-play; relatedness adds in multiplayer ([Ryan, Rigby & Przybylski 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)). A 2023 meta-analysis found gamification raises intrinsic motivation, autonomy and relatedness but barely competence ([Xiao et al. 2023](https://link.springer.com/article/10.1007/s11423-023-10337-7)).

**Points/badges vs meaning.** Gamification: small effects (cognitive g = 0.49, motivational 0.36, behavioural 0.25); reward-and-status mechanics alone are weaker than challenge + goals + narrative ([Sailer & Homner 2020](https://eric.ed.gov/?id=EJ1245270)).

**Streaks.** No rigorous child studies found; the case against is mechanistic/anecdotal — loss-aversion, "performative learning," abandonment after a break ([parent guide](https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids); [Duolingo's rationale](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Treat as a design risk, not settled science.

**Growth mindset / praise.** Process ("effort/strategy") praise vs person ("smart") praise is Dweck's best-replicated small finding ([Dweck/Bing](https://bingschool.stanford.edu/news/carol-dweck-praising-intelligence-costs-childrens-self-esteem-and-motivation)); but the Sisk et al. 2018 meta-analysis (138 studies) finds mindset interventions weak overall, modest for at-risk/low-SES pupils ([summary](https://www.structural-learning.com/post/growth-mindset-what-research-actually-shows)). Cheap to do, don't expect much.

**Skill estimation in products.** Khan Academy: Familiar (70–85% on exercise) → Proficient (correct on quiz) → Mastered (correct on unit test), with demotion on later misses ([Khan](https://support.khanacademy.org/hc/en-us/articles/5548760867853--How-do-Khan-Academy-s-Mastery-levels-work)). Duolingo: half-life regression, p = 2^(−Δ/h) ([Settles & Meeder 2016](https://research.duolingo.com/papers/settles.acl16.pdf)). Keybr: per-key confidence from exponentially-smoothed reaction time, new letter unlocked when all active keys reach confidence ([Keybr help](https://www.keybr.com/help)). Prodigy: claims adaptive placement; independent evidence is modest and the game is criticised for pay-walled rewards and shallow pedagogy ([Fairplay](https://fairplayforkids.org/pf/prodigy/); [Common Sense](https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game)). Mathletics matches Live opponents by skill level ([Mathletics](https://knowledgebase.mathletics.com/en_US/live-mathletics)). DragonBox: discovery-based, hides the maths at first; RCT evidence for Algebra 12+ is positive but modest ([Decker-Woodrow 2023](https://journals.sagepub.com/doi/full/10.1177/23328584231165919)).

## 3. Misconceptions and the French curriculum

**Place value / transcoding.** Syntactic errors ("one hundred twenty-three" → 10023) dominate; transcoding correlates strongly with place-value understanding ([Frontiers 2021](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2021.642153/full)); some children skip ten-/hundred-thousands entirely ([Mathnasium](https://www.mathnasium.com/math-centers/paoli/news/place-value-mistakes-elementary-school)). Diagnostic: dictate "deux cent trente millions" and inspect which class the zeros land in.

**Fractions/decimals: whole-number bias** — 1/4 > 1/3 because 4 > 3; 0.25 > 0.7 because 25 > 7 ([OISE](https://www.oise.utoronto.ca/robertson/blog/whole-number-bias-and-3-misconceptions-about-fractions-junior-math-2022-05-26)). Diagnose with response patterns + confidence ratings; strongly-held misconceptions survive brief instruction ([Durkin & Rittle-Johnson](https://www.sciencedirect.com/science/article/abs/pii/S0959475214000644)). A 78-misconception systematic review for grades 3–6 exists ([review](https://www.academia.edu/144298990/)).

**Mental strategies.** Bridging through 10 depends on fast bonds-to-10; compensation (add 9 = +10−1) for numbers near a multiple of 10 ([NCETM bridging](https://www.ncetm.org.uk/media/x51ltghh/ncetm_mm_sp1_y2_se11_teach_final-ys2.pdf); [derived facts in children](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3880841/)).

**Programmes 2025 (official texts):**
- **CE2** (cycle 2, in force 2025): whole numbers to 10 000; both addition and multiplication tables "dans les deux sens"; ×10, ×100; add 8/9/18/19…39, subtract 9/19/29/39; ×4, ×8; distributivity for 2-digit × 1-digit; unit fractions 1/2…1/10, compare/add same-denominator; columns +/−; multiplication 2–3 digit × 1–2 digit; sense of ÷ ([cycle 2 programme](https://www.education.gouv.fr/sites/default/files/document/Annexe%204%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20du%20cycle%202-403821.pdf)).
- **CM1** (2025): numbers to 999 999; decimals to hundredths; ×10/100/1000; ×4, ×8, ×5; Euclidean division, 1-digit divisor.
- **CM2** (2026): to 999 999 999; decimals to thousandths; ÷4, ÷8; decimal ×5, ×50; decimal division with 1-digit divisor.
- **6e**: milliard introduced; ×0.1/0.01/0.001; Euclidean division by < 100; rounding; fraction = quotient; fraction × integer. Facts must be "restitués de façon quasi instantanée" ([cycle 3 programme](https://www.education.gouv.fr/sites/default/files/ensel620_annexe2-v2.pdf); Eduscol examples: [CM1](https://eduscol.education.fr/document/64872/download), [CM2](https://eduscol.education.fr/document/64866/download), [6e](https://eduscol.education.fr/document/64878/download)).

**CPA / bar model.** Bruner-derived concrete→pictorial→abstract; EEF endorses visual representations, and Methe found CRA effect sizes "especially high" on limited evidence ([Third Space](https://thirdspacelearning.com/blog/teach-bar-model-method-arithmetic-maths-word-problems-ks1-ks2/); [CPA revisited 2025](https://link.springer.com/article/10.1007/s10649-025-10455-4)).

## 4. Typing

- **Products.** TypingClub/Dance Mat: home row first (F/J anchors), then E/I, R/U, T/Y, W/O, Q/P, with an on-screen finger-coloured keyboard ([Dance Mat guide](https://www.dancemattypingguide.com/dance-mat-typing-level-1/stage-1/)). Keybr: adaptive, frequency-ordered letter unlock, pseudo-words ([Keybr](https://www.keybr.com/help)). Nitro Type/TypeRacer: racing, no lessons — practice/motivation only ([Common Sense](https://commonsense.org/education/reviews/nitro-type/teacher-reviews/4135741)).
- **Colour convention.** Universal *zoning* (pinky/ring/middle/index, thumbs = space) but no universal *palette*; each product picks its own ([Wikimedia chart](https://commons.wikimedia.org/wiki/File:Typing-colour_for-finger-positions.svg); [TypingClub colouring sheet](https://static.typingclub.com/m/edclubdocs/media/pdf/jungle_junior_keyboard_coloring_handout.pdf)). Pick one, keep it consistent.
- **Norms.** Compiled benchmarks: ~15 WPM grade 3, 20 grade 4, 25 grade 5, 27 grade 6 "with high accuracy"; other sources accept 10–20 WPM in late primary ([QIAT compilation](https://qiat.org/docs/resourcebank/hwriting_kybding_rate_info.pdf)). Commercial charts say ~10–13 WPM at 9, 17–22 at 10 ([typespeedtest](https://www.typespeedtest.com/blog/kids-typing-speed-by-age/)) — weak sourcing. Ages 8–12 is the usual instruction window; accuracy first is standard guidance.
- **AZERTY.** Home row QSDF / JKLM; A↔Q, Z↔W swapped, M on the right home row; digits need Shift; accents matter ([Ratatype AZERTY](https://www.ratatype.com/courses/french/)). Zones stay the same; key labels and lesson order must change — don't reuse a QWERTY lesson sequence.

## 5. Game formats

- **2048**: sliding-merge, immediate feedback on every move, skill/chance balance, endless with a clear goal ([analysis](https://medium.com/design-for-educational-games/2048-design-for-educational-games-1a2ffa2e8195)). Merging = doubling, so it naturally drills ×2 and powers of two; other operations need a re-skin.
- **Races** (Grand Prix Multiplication, Tug Team Tractors, Math Blaster): speed of correct answers = car/tractor speed; up to 4–8 players; end-of-race error review ([Arcademics](https://www.arcademics.com/games/grand-prix); [Tug Team](https://www.mathplayground.com/ASB_TugTeamMultiplication.html); [Math Blaster](https://en.wikipedia.org/wiki/Math_Blaster!)).
- **Make-10 / grid puzzles** (Drop Sum, NumberDrop, Sumaze): number bonds under falling-block pressure; Sumaze praised for problem-solving over drill ([IXL Drop Sum](https://www.ixl.com/games/drop-sum-make-10-a); [Sumaze review](https://www.flyingcoloursmaths.co.uk/review-sumaze/)).
- **Prodigy**: wizard-battle wrapper; reviewers attribute retention to avatar/pets/world and note teens drop off; paywalled rewards resented by children ([Fairplay](https://fairplayforkids.org/pf/prodigy/)). Avatar identification raises intrinsic motivation and time-on-task in studies ([Birk et al.](https://www.semanticscholar.org/paper/16b3a4d4a65ca5a788e2d31aaed02bf73ac114ef)).

## Design implications (prioritised)

1. Model every fact/skill with per-item Elo + response time; target ~75% success — Klinkenberg 2011.
2. Schedule reviews by spaced retrieval, with a half-life per item; store locally — Settles 2016; Ophuis-Cox 2023.
3. Interleave operations and levels within a session and don't let interleaving-induced accuracy dips push difficulty down — Rohrer 2020.
4. Two modes: untimed practice (default) and opt-in timed challenge; in practice use a soft 3-second "fluent" flag rather than a visible clock — XtraMath; Codding 2011; Boaler critique.
5. Never score speed without accuracy — Methe 2012.
6. Immediate corrective feedback with the correct answer and a one-line strategy — feedback review; NCETM.
7. Faded worked examples for new skills — CLT.
8. Built-in diagnostics for known misconceptions: number dictation for large numbers, fraction/decimal comparison items engineered to trap whole-number bias — Frontiers 2021; Durkin & Rittle-Johnson.
9. Pin content to the 2025 programmes — BO PDFs above.
10. Mastery-based progression (Familiar/Proficient/Mastered with demotion), points as garnish — Sailer & Homner 2020; Khan.
11. Avoid hard-reset streaks; use forgiving "days practised this week" — SDT; streak critiques (weak evidence, asymmetric downside).
12. Give autonomy choices (which game, avatar, order of topics) and process praise — Ryan et al. 2006; Dweck (modest effect).
13. Typing: AZERTY-native lessons from home row QSDF/JKLM, one colour per finger, unlock keys Keybr-style on accuracy first, then speed; goals ~15/20/25 WPM at CE2/CM1/CM2 — Keybr; QIAT.
14. Use race/tug formats for timed challenge and 2048/make-10 for untimed number-sense play; CPU opponents matched to the child's Elo — Arcademics; Mathletics; Klinkenberg.
15. Don't gate rewards behind anything the child can't earn — Fairplay.

Where evidence is weak: the 85% rule (ML-derived), streak harms (commentary), typing WPM norms (commercial sites), Prodigy efficacy (modest, vendor-influenced), the finger colour palette (no standard).
