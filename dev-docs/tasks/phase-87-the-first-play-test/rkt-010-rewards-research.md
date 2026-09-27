# Rewards for primary-age players — research briefing (RKT-010, RKT-011)

**Asked by Richard, 2026-09-13:** *"something simple like total points per user coming from each session, that can
be used for something fun (maybe avatar stuff??) … see what kinds of easy to implement points and rewards system
kids of this age will actually like."*

**Our players are CE2–6e, roughly 8 to 11.** That matters for §1.4. Every claim carries a label:
**[E]** peer-reviewed or meta-analytic evidence · **[R]** a regulator or the law · **[P]** a product's own documentation
(what it does, not whether it works) · **[A]** anecdote, advocacy or marketing.

This briefing extends TPL-007's [research briefing](../phase-78-the-templates/tpl-007-research-briefing.md) §2 and
does not replace it. TPL-007 already ruled (task file §1, items 8–10, and §7):
- points are garnish, and mastery is the progression
- no hard-reset streak; show "days practised this week" instead
- no leaderboards
- no reward a child cannot earn by playing

Nothing below overturns those rulings.

## 1. What the evidence says

1. **Gamification works, and works most on younger pupils, but mostly through extrinsic drive.** A 2025
   meta-analysis of 31 K-12 experiments gives g = 0.65 overall: 0.71 on extrinsic motivation, 0.64 on intrinsic,
   and larger in elementary grades. [E] <https://onlinelibrary.wiley.com/doi/full/10.1002/pits.70056>. Another
   meta-analysis finds it raises autonomy and relatedness, but barely raises competence. [E]
   <https://link.springer.com/article/10.1007/s11423-023-10337-7>
2. **Overjustification is real, but only under certain conditions.**
   - Children who were *promised* an award drew less afterwards; children who got the same award as a surprise did
     not (Lepper, Greene & Nisbett 1973). [E] <https://files.eric.ed.gov/fulltext/ED084210.pdf>
   - Expected, tangible rewards for doing or finishing a task lower free-choice motivation (d ≈ −0.28 to −0.40),
     more so in children. Positive feedback raises it (d = +0.33) (Deci, Koestner & Ryan, 128 studies). [E]
     <https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf>
   - Cameron & Pierce find less harm overall. [E] <https://journals.sagepub.com/doi/10.3102/00346543064003363>
   - **Both sides agree** that informative feedback, praise and unexpected rewards are safe, and that "do X, get Y"
     contracts for merely taking part are the riskiest.
3. **Leaderboards, badges and points are the elements most often linked to harm.** One systematic mapping ties
   them most often to worse performance. [E] <https://arxiv.org/pdf/2305.08346>. A semester of badges plus a
   leaderboard lowered intrinsic motivation, in university students (Hanus & Fox 2015). [E]
   <https://www.sciencedirect.com/science/article/abs/pii/S0360131514002000>. The harm concentrates on low
   performers. [E] <https://www.sciencedirect.com/science/article/abs/pii/S0360131524002100>
4. **🔴 Social comparison starts to bite at about 7–8.** Younger children overestimate their ability and shrug off
   a rank. From about 8, the child in last place is the one a rank hurts. [E]
   <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9298085/> · <https://pubmed.ncbi.nlm.nih.gov/7956467/>.
   **Our players are exactly that age, and siblings share one browser** (`MAX_PROFILES = 6`,
   `tpl007Scripts.ts:61`). So a star count on every profile card works as a family leaderboard.
5. **Avatar customisation has some of the better evidence.** Customising raises identification with the avatar,
   which raises effort, enjoyment and time played, and lowers drop-out over three weeks (Birk & Mandryk). The
   subjects were adults, in non-educational games. [E]
   <https://www.researchgate.net/publication/261095324_Examining_the_effects_of_avatar_customization_and_narrative_on_engagement_and_learning_in_video_games>
6. **No rigorous child study compares stars, collectibles, room decoration and progress maps.** Their popularity is
   industry convergence (§2), not trial evidence.

## 2. What the apps children use actually do [P]

| App | Earns for | Spends on |
|---|---|---|
| Times Tables Rock Stars | coins per right answer | avatar items in a shop; a separate speed title ("Rock God" → "Busker") <https://www.internetmatters.org/advice/apps-and-platforms/skills-building/times-tables-rock-stars/> |
| DoodleMaths | a star per right answer | building a robot avatar part by part; a streak with savers and holiday freezes <https://help.doodlelearning.com/en/articles/5353093-what-is-a-streak> |
| Sumdog | a coin per right answer, weekly effort bonuses | avatar, pets, house, garden <https://support.sumdog.com/knowledge/coins> |
| Mathletics | points per right answer; a widget fills every 100 | weekly points reset, but convert to coins that are kept, for an avatar store <https://knowledgebase.mathletics.com/en_US/student-center-overview/how-do-students-earn-m-coins-in-mathletics> |
| Reading Eggs / Mathseeds | eggs or acorns per lesson | avatar clothes, house items, a pet hatched per lesson <https://kb.readingeggs.com/en_GB/3-rewards-systems> |
| Khan Academy Kids | finishing lessons | hats, toys and clothes for the characters; **no currency, no shop** <https://khankids.zendesk.com/hc/en-us/articles/360049358751> |
| Prodigy | winning battles | pets and gear, the best of it behind a paid membership |
| Blooket | tokens | **random** packs; the rarest items drop at 0.01% [A] <https://blooket.fandom.com/wiki/Chromas> |

**The common pattern:** a small currency for each right answer, spent on how your avatar looks.

## 3. Pitfalls

- **Speed.** Timed tests have been linked to maths anxiety, but that link is contested: no well-designed experiment
  shows timed tests cause it. [A/E] <https://hechingerreport.org/proof-points-do-math-drills-help-children-learn/>.
  TTRS added a hidden timer and a no-timer mode after parents complained. [P] <https://ttrockstars.com/parents/>
  **Our race already turns speed into distance** (`gain = RACE_STEP × speed`, `tpl007Scripts.ts:776`), so stars
  must not reward speed a second time.
- **Streaks.** Snapchat streaks are linked to problematic use in early adolescents. [E]
  <https://www.sciencedirect.com/science/article/pii/S2772503023000476>. The often-quoted "63% quit after a missed
  day" figure is unverified. [A]
- **Random rewards.** The UK government found an *association* between loot boxes and problem gambling, but not
  proof that one causes the other. [R]
  <https://www.gov.uk/government/calls-for-evidence/loot-boxes-in-video-games-call-for-evidence/outcome/government-response-to-the-call-for-evidence-on-loot-boxes-in-video-games>.
  The ICO's Children's Code guidance flags randomised rewards and time-limited offers. [R]
  <https://www.rpclegal.com/snapshots/data-protection/spring-2023/ico-publishes-guidance-on-compliance-of-game-design-with-the-childrens-code/>
- **Paywalls and upsell.** In one 19-minute session, Fairplay counted 16 membership ads against 4 maths problems in
  Prodigy. [A] <https://fairplayforkids.org/pf/prodigy/>. The FTC's $520M settlement with Epic is the US regulator's
  line. [R] <https://www.bakerbotts.com/thought-leadership/publications/2023/january/ftcs-520-million-settlement-with-epic-games>

## 4. What this means for Rocket School

1. **Earn for learning actions:** each right answer, finishing a race, and a skill's mastery going up. Never for
   speed, and never for minutes played. (§1.2, §3)
2. **Never take anything away:** no decay, no penalty, no reset. (Mathletics keeps its coins, [P])
3. **Unlocks are deterministic, with a visible target.** Some items are free from the start, so no child owns
   nothing. (§3; Mathseeds [P])
4. **Customisation is the thing to buy:** the avatar, and the rocket. (§1.5, §2)
5. **Stars are private to the active player.** They never appear on a sibling's card, and there is no speed title.
   (§1.3, §1.4)
6. **Keep a visible "next thing" on Home, and celebrate the unexpected** (a new personal best), since praise and
   surprise are the safe rewards. (§1.2)

### Ranked shortlist

| # | Mechanic | Why | Cost here |
|---|---|---|---|
| 1 | **Stars per right answer, spent in a hangar of avatar and rocket cosmetics** | what TTRS, Doodle, Sumdog, Mathletics and Mathseeds converge on; customisation has the best identification evidence [E+P] | DiceBear already bundles the parts (RKT-011 §2) |
| 2 | **A visible bar to the next unlock** | constant competence feedback with no comparison [P] | one number and a threshold |
| 3 | **Personal-best celebrations** | the reward both sides of the overjustification debate agree is safe [E] | one stored value per mode |

### Don'ts

- no leaderboard or sibling comparison; no speed titles
- no stars for speed; no required timer
- no random packs or mystery eggs
- no punishing streak
- no real money or "members get…"
- no time-limited items
- never remove what was earned
- no stars for minutes played
- nothing social, and no data collected to unlock anything
