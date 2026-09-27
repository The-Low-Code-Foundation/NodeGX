# Kinds of question for 8–11-year-olds — research briefing (RKT-009)

**Asked by the play-test, Finding 8:** *"right now it's just open answer for every question, some could be multiple
choice or other question types, research requires as to what question types are more appropriate."*

**Our players are CE2–6e / Years 4–7, roughly 8 to 11.** They play on tablets (touch, the RKT-005 pad) and on laptops
(keyboard), in French and English, **inside a race that turns speed into distance**.

This briefing follows the house shape of [TPL-007's briefing](../phase-78-the-templates/tpl-007-research-briefing.md)
and [the rewards briefing](rkt-010-rewards-research.md). It does not overturn their rulings.

**Every claim carries a label:**

| label | means |
|---|---|
| **[MA]** | meta-analysis or systematic review |
| **[RCT]** | randomised experiment in or near a school setting |
| **[LAB]** | laboratory experiment, usually with adults or undergraduates |
| **[COR]** | correlational |
| **[G]** | a practice guide or expert panel (IES/WWC, EEF) |
| **[STD]** | a standard (W3C) |
| **[A]** | practitioner or advocacy writing |

*(inferred)* marks a step I reasoned out rather than read. Where I could only read a secondary summary or a search-index
abstract (the publisher page was blocked), the citation says so.

---

## 0. What the code does today (read, 2026-09-13)

| reading | where |
|---|---|
| A right answer moves the rocket `RACE_STEP × speed`. `speed` is 1 inside `fluentMs` and falls to a **floor of 0.5**. A wrong answer gains 0 and costs nothing. | `tpl007Scripts.ts:860-861` |
| **"Fill the gap" already exists as a typed prompt.** `bondQ` asks `7 + ? = 10` or `? + 7 = 10`. `tableQ` has a `missing` form when `bothWays`. `balanceQ` asks `8 + 4 = ? + 5`. | `tpl007Scripts.ts:403`, `:372`, `:549` |
| `options` is used by `place-value-*`, `compare-10000`, `frac-unit`, `dec-compare-*`, `frac-compare`, `frac-dec`, `mul-small`, `div-small` and `frac-quotient`. | `tpl007Curriculum.ts:175-367` |
| The eleven trap misconceptions and their skills are listed. | `tpl007Curriculum.ts:29-41` |

*(inferred)* The race does not punish a fast wrong guess. On a four-button question, a guess gains a quarter of a step
on average and costs only the time to tap. Check whether "Show me how" (RKT-004) holds the next question back after a
miss, because that delay is the only brake on guessing.

---

## 1. The task's sentence: confirmed, or overturned?

> *"Producing an answer (typed recall) is generally the stronger retrieval exercise than recognising one. Typed stays
> the default for fact fluency."*

**Verdict: the first sentence is overturned. The second is confirmed, but for different reasons.**

### 1.1 "Producing is generally stronger than recognising": not supported in classrooms

- **The largest classroom meta-analysis finds no difference.** It covers 222 studies and 48,478 students (Yang et al.
  2021). Recall quizzes gave g = 0.520 and recognition quizzes g = 0.518 (p = .952). With feedback, recognition gave
  0.607 and recall 0.541, again not significantly different (Table 2, p. 15; text p. 17). **[MA]**
  <https://gwern.net/doc/psychology/spaced-repetition/2021-yang.pdf>
- **Adesope et al. 2017 found multiple choice *larger*:** g = +0.70 against +0.48 for short answer, over 272 effects.
  **[MA]** Numbers from a secondary summary:
  <https://theeconomyofmeaning.com/2017/03/21/important-new-meta-analysis-on-the-testing-effect-with-some-surprises/>.
  Abstract via OpenAlex:
  <https://api.openalex.org/works?search=Rethinking%20the%20use%20of%20tests%20a%20meta-analysis%20of%20practice%20testing&per-page=2&select=title,publication_year,doi,abstract_inverted_index>
- **In real Year 8 science and Year 10–13 history classes, both formats worked equally** (McDermott et al. 2014). The
  quiz format did not need to match the exam format, and multiple-choice quizzing "is as effective as short-answer
  quizzing for this purpose". **[RCT]** <https://pdf.retrievalpractice.org/guide/McDermott_etal_2014_JEPA.pdf>
- **The lab result that production wins is conditional** (Kang, McDermott & Roediger 2007). Short answer helped more
  only *with* feedback. Without feedback, multiple choice gave the greater benefit. **[LAB]** Secondary note:
  <https://notes.andymatuschak.org/zTxLkeaWCdBHQYW73o5n6Ka>
- **Multiple choice with *competitive* wrong answers makes learners retrieve** (Little, Bjork, Bjork & Angello 2012).
  It matched cued recall on the tested facts and was better on related facts, because the learner has to work out why
  each wrong option is wrong. The subjects were 32 undergraduates, with **24 seconds per question**. **[LAB]**
  <https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Little_EBjork_RBjork_Angello_2012.pdf>
- **Children specifically need to succeed at the first retrieval** (Karpicke et al. 2016, Grade 4, N = 88). *"Unless
  retrieval activities are designed to ensure initial retrieval success, children will not benefit from retrieval
  practice."* Recognition practice still produced a clear effect in that study (77% against 66%, d = 0.64). **[RCT]**
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC4786565/>

**Honest caveat.** In Yang's table the elementary-school effect rests on fewer studies and is less precise: g = 0.328,
95% CI 0.085–0.571, k = 43. None of these studies test arithmetic-fact fluency specifically.

### 1.2 "Typed stays the default for fact fluency": confirmed, for four reasons

1. **Fluency *is* production.** The French programme asks that facts be *restitués de façon quasi instantanée* (TPL-007
   briefing §3). In Yang, quizzes in the same format as the final test beat mismatched formats: g = 0.531 against
   0.399, p < .001. **[MA]** (same PDF, p. 17)
2. **Seeing a candidate answer lets children skip retrieval.** When verifying arithmetic, people use plausibility
   checks such as odd/even instead of retrieving the fact. Elementary-school children do this too, varying with age,
   difficulty and timing (Lemaire & Fayol 1995). **[LAB]**
   <https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:7885264%20AND%20SRC:MED&resultType=core&format=json>.
   *(inferred)* A four-button `7 × 8` can be answered by eliminating odd numbers, so it does not train the fact.
3. **A clock makes buttons guessable.** Chance is 1/M with M options. Math Garden's answer is a scoring rule in which a
   fast wrong answer costs as much as a fast right one earns, "making fast guessing extremely risky" (Klinkenberg, on
   Maris & van der Maas). **[LAB/COR]**
   <https://www.surf.nl/files/2019-04/Artikel%20High%20Speed%20High%20Stakes%20Scoring%20Rule.pdf>. Our race has no
   such penalty (§0).
4. **Wrong answers on buttons can stick, most with weaker pupils.**
   - Reading more lures weakened the testing benefit and increased lure answers later (Roediger & Marsh 2005). **[LAB]**
     <https://scholars.duke.edu/publication/677292>
   - Lower-achieving **high-school** students showed *costs* from multiple-choice testing (Marsh, Agarwal & Roediger
     2009). **[LAB]** <https://scholars.duke.edu/publication/714908>
   - Feedback, immediate or delayed, reduced those intrusions (Butler & Roediger 2008). **[LAB]**
     <https://gwern.net/doc/psychology/spaced-repetition/2008-butler.pdf>

**Suggested rewrite of the task sentence:**

> *In classroom studies, recognising an answer among well-built wrong answers is about as good a retrieval exercise as
> producing it. Typed stays the default for fact fluency because fluency is production, a clock makes four buttons
> guessable, and wrong options can stick with weaker pupils unless feedback follows every miss.*

---

## 2. Format by format

### 2.1 Multiple choice with competitive lures (today's `options`)

| | |
|---|---|
| **Good for** | Trap skills while the idea is new: `place-value-*`, `dec-compare-*`, `frac-unit`, `frac-compare`, `mul-small`, `div-small`. The wrong options are the misconceptions' own answers, which is exactly Little et al.'s "competitive alternatives". |
| **Evidence** | Strong that multiple choice teaches ([MA] Yang; Adesope). Competitive lures [LAB], adults only. Feedback essential [LAB]. |
| **Failure modes** | Guessing under a clock (§1.2.3). Lure learning in weaker pupils without feedback (§1.2.4). Plausibility shortcuts on arithmetic facts (§1.2.2). Little's retrieval benefit came with 24 s to think, and our race rewards finishing inside `fluentMs`. |
| **Touch / keyboard** | Both are good already (four large buttons; keys 1–4). |
| **Under a race** | Workable for comparison and trap items. Poor for facts. |

*(inferred)* **Fade from options to typed** as a skill's rating rises. Karpicke's "ensure initial success" argues for
options early, and format matching argues for typed later. Never offer options on `table-*` fluency items.

### 2.2 Number line placement — tap where the number goes

| | |
|---|---|
| **Good for** | **Magnitude**, the point of the `number` strand: `frac-unit`, `frac-compare`, `dec-compare-2`, `dec-compare-3`, `frac-dec`, `frac-quotient`, `round-int`, `round-dec`, `compare-10000`. *(inferred)* It also suits `big-*` placed on 0–1 000 000 lines, and `mul-small` / `div-small` framed as "is 6 × 0.5 left or right of 6?". |
| **Evidence** | See the list below the table. |
| **Failure modes** | Precision on a small screen: a correct child can miss by a few pixels, so grade with a tolerance band. Fazio's game used "close enough to catch the monster". Estimation without feedback taught nothing (Fazio's control). Unlabelled ends confuse. |
| **Touch** | **Tap to place, never drag.** 83% of 7–8-year-olds could tap reliably, but only 30% could drag and drop and 40% could slide ([COR], n = 30 per age band) <https://pmc.ncbi.nlm.nih.gov/articles/PMC7303424/>. WCAG 2.5.7 requires every dragging action to have a single-pointer alternative [STD] <https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html>. |
| **Keyboard** | *(inferred)* ←/→ move a marker in tenths of the line, Shift+arrow in hundredths, Enter to lock. Slower than a tap, so give keyboard players a longer `fluentMs` for this kind, or none. |
| **Under a race** | Good. Estimating a position is quick by nature, and there is no guessable set of options. |

The evidence for number lines, strongest first:

- **Placement accuracy correlates with maths competence** at r = .443, over 263 effects and 10,576 participants aged 4–14
  (Schneider et al. 2018). The correlation rises with age, mainly because it is higher for fractions. **[MA, COR]**
  <https://lirias.kuleuven.be/retrieve/db37aea3-e6bb-4172-8e7f-a09c9d76c09d>
- **Estimates become linear between 6 and 8, and linearity tracks achievement** (Siegler & Booth 2004). **[COR]**
  <http://www.cs.cmu.edu/afs/cs/Web/People/jlbooth/sieglerbooth-cd04.pdf>
- **A game of under 15 minutes improved fractions for Years 6–7 (US grades 4–5)** (Fazio, Kennedy & Siegler 2016).
  Children placed fractions on a 0–1 line and saw the correct spot after each try.
  - Study 2 (51 fifth-graders): error fell from 18% to 10%, and magnitude comparison rose from 75% to 80%.
  - The control practised the same placements *without feedback* and did not improve (17% to 16%).
  - **[RCT]** <https://pmc.ncbi.nlm.nih.gov/articles/PMC5074569/>
- **Number lines beat area models** (Hamdan & Gunderson 2017, second and third graders). Each group got better at its
  own picture, but "only the number line training led to transfer to an untrained fraction magnitude comparison task".
  **[RCT]** <https://sites.temple.edu/cognitionlearning/files/2017/05/Hamdan-Gunderson-2017.pdf>
- **The WWC rates "use the number line" as Strong Evidence** for pupils struggling with maths in elementary grades.
  **[G]** <https://ies.ed.gov/ncee/wwc/practiceguide/26>. The fractions guide makes number lines the central
  representation (recommendation 2, Moderate Evidence). **[G]** <https://ies.ed.gov/ncee/wwc/practiceguide/15>
- **A linear board game closed a number-sense gap in preschoolers** (Siegler & Ramani 2008). That is younger than our
  players, so it is context only. **[RCT]** <https://eric.ed.gov/?id=EJ849743>

### 2.3 "Who is right?" — spot the error, incorrect worked examples

*Léa says 0.25 > 0.7. Tom says 0.7 > 0.25. Who is right?* One child's answer is the misconception's.

| | |
|---|---|
| **Good for** | **The eleven trap skills**: `dec-compare-*`, `frac-unit`, `frac-compare`, `dec-pow10`, `dec-pow10-small`, `sub-borrow`, `order-ops`, `mul-small`, `div-small`, `equals-balance`, `place-value-*`, `round-dec`, and the `big-*` dictation. |
| **Evidence** | See the list below the table. |
| **Failure modes** | **Two choices means a 50% guess.** Reading load in two languages: the worked line must be short. It is slow by nature, because the benefit comes from comparing. Pupils may dislike it (McLaren). |
| **Touch / keyboard** | Both are easy: two large cards; keys 1/2 or ←/→. Do not use letter keys, since the names differ between the languages. |
| **Under a race** | **Poor under a clock.** *(inferred)* Score it on correctness only (speed = 1), or follow it with the typed answer so a lucky tap does not move the rocket by itself. |

The evidence, strongest first:

- **Comparing incorrect with correct examples beat comparing correct examples only** (Durkin & Rittle-Johnson 2012).
  - 74 pupils in US grades 4–5 learned about decimal magnitude.
  - The incorrect-examples group learned more correct procedures and concepts and **held fewer misconceptions**.
  - Prior knowledge did not change that.
  - **[RCT]**, small. Abstract read via a search index; the publisher page
    <https://www.sciencedirect.com/science/article/abs/pii/S0959475211000880> was blocked (403). The paper is listed on
    the IES grant page
    <https://ies.ed.gov/use-work/awards/using-contrasting-examples-support-procedural-flexibility-and-conceptual-understanding-mathematics>.
- **A larger replication found a delayed benefit** (McLaren, Adams & Mayer 2015).
  - 390 middle-school pupils found, explained and fixed errors in decimal problems.
  - There was no difference immediately, but a week later they were better (d = .33).
  - They also *liked* it less (d = .21).
  - **[RCT]** Abstract via OpenAlex:
    <https://api.openalex.org/works?search=delayed%20learning%20effects%20with%20erroneous%20examples%20decimals%20web-based%20tutor&per-page=2&select=title,publication_year,doi,abstract_inverted_index>
- **A boundary condition** (Große & Renkl 2007): mixing correct and incorrect solutions helped only learners with good
  prior knowledge, and weak learners did better with correct solutions alone. The task was probability and the learners
  were not children. **[LAB]** <https://eric.ed.gov/?id=EJ780439>. *(inferred)* Offer "Who is right?" once a trap
  skill has been met, not as a child's first sight of it.
- **The EEF's KS2–3 guidance** asks teachers to know common misconceptions (recommendation 1), to "use tasks to address
  pupil misconceptions" and to "provide examples and non-examples" (recommendation 6). **[G]**
  <https://d2tic4wvo1iusb.cloudfront.net/production/eef-guidance-reports/maths-ks-2-3/EEF-Improving-Mathematics-in-Key-Stages-2-and-3-2022-Update.pdf>
  (pp. 6–7)
- **Comparing and explaining formats was one part of an equivalence intervention** for 142 second-graders (McNeil et al.
  2019). The package beat practice alone (g = 1.87), but the package had three parts, so this effect cannot be credited
  to comparison alone. **[RCT]**
  <https://cladlab.nd.edu/assets/384440/mcneilhornburgbrletic_shipleymatthews_inpress.pdf>

### 2.4 Fill the gap / missing number — `7 + ? = 15`, `? × 6 = 42`

| | |
|---|---|
| **Good for** | **The `calc` strand, and the equals trap.** It already runs in `bond-*`, `table-*` (`bothWays`) and `equals-balance` (§0). *(inferred)* It could extend to `pow10-*` (`? × 100 = 3400`), `x4-x8`, `div-4-8`, `frac-of`, `percent` and `proportion`. |
| **Evidence** | See the list below the table. |
| **Failure modes** | "8 + 4 = ? + 5" answered 12 or 17: the equals-sign misconception is the classic error (which is why `balanceQ` offers 12 and 17). A `?` in running text is easy to miss. *(inferred)* An inline box in the equation shows where the answer goes. |
| **Touch / keyboard** | Identical to typed: the pad and the keys. No new interaction. |
| **Under a race** | Good, the same as typed. |

The evidence:

- **It is still production**, so everything in §1.2 applies. In Yang, fill-in-the-blank quizzes gave g = 0.773 (k = 22),
  across subjects and not specific to maths. **[MA]**
- **Practising non-standard layouts helps.** Children aged 7–11 "struggle to understand mathematical equivalence".
  Well-structured non-traditional practice, such as `? = 9 + 8`, improves understanding, but only modestly on its own
  (McNeil et al. 2019). **[RCT]** (URL in §2.3)

**Honest note:** as a *kind* this is mostly built already. The new work is rendering the gap inside the equation and
putting it on more skills.

### 2.5 Estimate — "closest to" (as buttons, not a slider)

| | |
|---|---|
| **Good for** | `x50-x25`, `euclid-2`, `percent`, `proportion`, `mul-small` and `div-small` ("6 × 0.5 is closest to 3, 6 or 12?"), `round-int`, and `big-*` ("closest to 200 000 or 2 000 000?"). |
| **Evidence** | Thin for *computational* estimation as a practice format. Estimation of position correlates with achievement ([COR] Siegler & Booth 2004; Schneider 2018, §2.2). I found no classroom experiment on "closest to" items for this age; a 2019 systematic review exists (<https://doi.org/10.1016/j.edurev.2019.01.002>), but I could not open its abstract. |
| **Failure modes** | A child may calculate exactly and pick the nearest. That still gets the item right, but it defeats the purpose *(inferred)*. Guessing, as in §2.1. |
| **Touch / keyboard** | Both are good (buttons). |
| **Under a race** | **Good.** *(inferred)* A clock rewards estimating over computing, which is what estimation practice wants. Keep `fluentMs` short. |

### 2.6 Slider

A slider for estimating a value is **not recommended**:

- Only 40% of 7–8-year-olds could slide reliably ([COR] PMC7303424, §2.2).
- It needs a no-drag alternative [STD] WCAG 2.5.7.
- The target must be at least 24 × 24 CSS px [STD] <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>.
  A slider thumb near that size on a phone-width tablet makes precision a test of fingers, not of number sense
  *(inferred)*.
- A tap-to-place number line (§2.2) gives the same magnitude practice without the drag.

### 2.7 True or false (with a reason)

| | |
|---|---|
| **Good for** | Trap claims ("Multiplying always makes a number bigger — true or false?"): `mul-small`, `div-small`, `dec-compare-*`, `order-ops`. |
| **Evidence** | See the list below the table. |
| **Failure modes** | 50% guessing. Plausibility shortcuts (Lemaire & Fayol, §1.2.2). "With a reason" turns it into a second question: *(inferred)* in practice that is §2.3 "Who is right?" with one claim instead of two. |
| **Touch / keyboard** | Both are easy, but do not map to T/F keys: French is V/F. Use ←/→ or 1/2. |
| **Under a race** | **Bare true/false is poor under a clock** (a coin flip earns distance). |

The evidence is thin for children:

- **True/false beat rereading for college students** (Üner, Tekin & Roediger 2021). **[LAB]** Via OpenAlex:
  <https://api.openalex.org/works?search=True-false%20tests%20enhance%20retention%20relative%20to%20rereading&per-page=2&select=title,publication_year,doi,authorships,abstract_inverted_index>
- **Multiple choice beat true/false** on later short-answer tests (Hildenbrand & Wiley 2025). **[LAB]** Via OpenAlex:
  <https://api.openalex.org/works?search=Brabec%20true-false%20testing%20retention%20related%20information&per-page=4&select=title,publication_year,doi,authorships,abstract_inverted_index>
- **Yang had a single true/false effect** (k = 1, filed under "Others"). **[MA]**

**Recommendation:** fold it into "Who is right?" rather than building it separately.

### 2.8 Order / sort — decimals smallest to largest

| | |
|---|---|
| **Good for** | `dec-compare-3`, `frac-compare`, `compare-10000`. |
| **Evidence** | See the list below the table. |
| **Failure modes** | One slip spoils the whole order, so partial credit is hard to define. Drag-and-drop is hard for this age (30% of 7–8-year-olds, §2.2). Four items make a long question for a race. |
| **Touch / keyboard** | Only as **tap in order** (tap the smallest, then the next) or keys 1–4 in order. Never as drag. |
| **Under a race** | Poor: many taps per question, and a speed score over several taps is unclear *(inferred)*. |

The evidence is diagnostic, not about learning:

- **Ordering decimals is an old test of decimal misconceptions.** Sackur-Grisvard & Leonard (1985) had students order
  three decimals; later work moved to **pairs**.
- **Among 2,517 students in grades 5–10**, 13.1% showed "longer is larger" and 13.1% "shorter is larger" on a 30-pair
  comparison test (Steinle & Stacey). **[COR]**
  <https://extranet.education.unimelb.edu.au/SME/TNMY/Decimals/Decimals/backinfo/refs/merga98stst.pdf>

*(inferred)* Pairs, which we already ask, diagnose the same thinking at one tap each.

### 2.9 Tap the digit — "tap the thousands digit in 4 372"

| | |
|---|---|
| **Good for** | `place-value-4`, `place-value-6`, `place-value-9`. It meets the trap directly: the child who counts positions from the left taps the wrong digit, and that digit *is* the lure. |
| **Evidence** | **None found on the format itself.** Place-value understanding correlates with transcoding (r = .638 in Grade 2, .585 in Grade 3; 266 German pupils), and syntactic errors dominate ([COR] <https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2021.642153/full>). |
| **Failure modes** | **Repeated digits** (4 404): the answer must be graded by *position*, not by digit value, or the generator must avoid repeats. Digits inside a 9-digit number are small targets; each needs at least 24 × 24 CSS px [STD]. Chance is 1 in the number of digits. |
| **Touch / keyboard** | Touch: tap. Keyboard *(inferred)*: ←/→ move a highlight, Enter to choose. |
| **Under a race** | Good: one tap. |

### 2.10 Match pairs — fraction ↔ decimal ↔ picture

| | |
|---|---|
| **Good for** | `frac-dec`, `percent`, `frac-quotient`. |
| **Evidence** | See the list below the table. |
| **Failure modes** | A memory grid tests visual memory, not the idea *(inferred)*. Many taps make one "question". Hard to grade for speed. |
| **Touch / keyboard** | Touch is fine. Keyboard grid navigation is clumsy *(inferred)*. |
| **Under a race** | Poor. |

The evidence is weak and indirect:

- **Matching quizzes had the largest classroom effect in Yang** (g = 0.913), but from only 6 effects, across subjects,
  and not about representations. **[MA]**
- **Several fraction pictures helped Year 7 pupils only when prompted to explain the link** (Rau, Aleven & Rummel 2009).
  112 sixth-graders learned more with multiple graphical representations "but only when prompted to self-explain how the
  graphics relate to the symbolic fraction representations". **[RCT]**
  <http://www.cs.cmu.edu/~marau/RauAlevenRummel_AIED2009.pdf>

*(inferred)* One pair per question ("which decimal equals 3/4?") is simply §2.1 options.

### 2.11 Bar models and fraction pictures

| | |
|---|---|
| **Good for** | Word-problem structure in `proportion`, `frac-of` and `percent`. As a *picture in the stem* or in "Show me how", not as a way of answering. |
| **Evidence** | See the list below the table. |
| **Failure modes** | **Area and pie models did not transfer to magnitude comparison; number lines did** (Hamdan & Gunderson, §2.2). A picture can become the thing the child counts instead of reasoning about. We have no word problems yet. |
| **Touch / keyboard** | Not an input kind: the answer stays typed or options. |
| **Under a race** | *(inferred)* Neutral as a stem picture. Poor if the child has to draw or shade. |

The evidence, strongest first:

- **The WWC rates concrete and semi-concrete representations, including strip diagrams, as Strong Evidence** for
  intervention settings. **[G]** <https://ies.ed.gov/ncee/wwc/practiceguide/26>
- **The EEF adds that representations "should be temporary; they should act as a 'scaffold'".** **[G]** (EEF PDF, p. 6)
- **Schema-based instruction with diagrams beat control for Grade 3 pupils with difficulties**, though gains were not
  sustained (Jitendra et al. 2013). **[RCT]** Read via the ERIC API, record EJ1015539:
  <https://api.ies.ed.gov/eric/?search=Jitendra%20schema-based%20instruction%20third-grade%20randomized&format=json&rows=5&fields=id,title,author,publicationdateyear,description>
- **It also worked for 806 Grade 7 pupils on proportion** (Jitendra et al.). **[RCT]**
  <https://files.eric.ed.gov/fulltext/ED572879.pdf>

In both trials a teacher delivered the instruction; an app picture is a much lighter version *(inferred)*.

---

## 3. Time pressure, across all formats

- **Time pressure tends to push pupils to worse strategies** (Caviola et al. 2017, 19 studies). The authors say the
  evidence is sparse and "there is not much evidence of clear associations"; some children adapt their strategies to
  the time limit. **[MA, narrative]** <https://pmc.ncbi.nlm.nih.gov/articles/PMC5585192/>
- **Timed activities to build fluency are rated Strong Evidence** by the WWC. **[G]**
  <https://ies.ed.gov/ncee/wwc/practiceguide/26>

*(inferred)* Keep the clock on production and one-tap formats: typed, fill the gap, number line, closest to, tap the
digit. Take it off formats whose benefit comes from comparing: "Who is right?" and any explain step.

---

## 4. Ranked shortlist

### Build first

| # | Kind | Strand / skills | Evidence strength | Why first |
|---|---|---|---|---|
| **1** | **Number line: tap to place** (tolerance band; arrow keys on a laptop) | `number`: `frac-unit`, `frac-compare`, `dec-compare-2/3`, `frac-dec`, `frac-quotient`, `round-int`, `round-dec`, `compare-10000`; later `big-*` | **Strongest here:** [MA, COR] Schneider r = .443; [RCT] Fazio, Hamdan & Gunderson; [G] WWC Strong | Teaches magnitude, which recall cannot. There are no buttons to guess. Race-safe. One tap on touch. |
| **2** | **"Who is right?"** (two short worked answers, one the misconception's; scored on correctness, not speed) | All 11 traps: `dec-compare-*`, `frac-*compare`, `dec-pow10*`, `sub-borrow`, `order-ops`, `mul-small`, `div-small`, `equals-balance`, `place-value-*`, `round-dec`, `big-*` | **Moderate:** [RCT] Durkin (age-matched, small), McLaren (large, delayed d = .33); boundary [LAB] Große & Renkl; [G] EEF | The trap's natural home. The one format aimed at the misconception itself. |
| **3** | **Fill the gap as an inline box**, across more `calc` skills | `calc`: `bond-*`, `table-*` (`bothWays`), `equals-balance`; extend to `pow10-*`, `x4-x8`, `div-4-8`, `frac-of`, `percent`, `proportion` | **Moderate:** it stays production (§1); [RCT] McNeil for equivalence; [MA] Yang fill-in-the-blank g = 0.773 (k = 22, all subjects) | The cheapest: pad and keyboard unchanged. Race-safe. Adds variety to `calc` without leaving production. |

### Then

| # | Kind | Strand / skills | Evidence |
|---|---|---|---|
| 4 | Estimate: "closest to" (buttons) | `x50-x25`, `mul-small`, `div-small`, `percent`, `euclid-2`, `big-*` | Thin for the format; [COR] for estimation generally |
| 5 | Tap the digit (graded by position) | `place-value-*` | None on the format; [COR] place value ↔ transcoding |
| 6 | Keep and tune `options` | Traps while new; fade to typed as mastery rises; never on `table-*` | [MA] strong; lure risk [LAB] → feedback on every miss |
| 7 | Order: tap in order | `dec-compare-3` | Diagnostic only [COR]; pairs already cover it |
| 8 | Match one pair | `frac-dec`, `percent` | Weak; it is options under another name |

## 5. Do not build

| Format | Reason |
|---|---|
| **Slider** | Only 40% of 7–8-year-olds slide reliably; needs a no-drag alternative (WCAG 2.5.7); precision tests fingers. The tap number line does the same job. |
| **Drag-to-sort** | 30% of 7–8-year-olds could drag and drop; WCAG 2.5.7; many actions per question under a clock. |
| **Match-pairs memory grid** | Tests visual memory, not the idea *(inferred)*; many taps; no evidence for this age. |
| **Area or pie pictures as a magnitude question** | Did not transfer to fraction comparison, where the number line did (Hamdan & Gunderson). Keep pictures for "Show me how". |
| **Bare true/false in the race** | A coin flip earns distance; plausibility shortcuts; weakest format in the adult comparisons. |
| **Options on `table-*` / fact fluency** | Fluency is production; parity elimination; guessing under the clock. |
| **Speed-scored "Who is right?"** | Its benefit comes from comparing, which a clock cuts short. |

## 6. Where the evidence is thin

- **Most multiple-choice and lure studies use undergraduates.** Only Karpicke 2016 (Grade 4) and McDermott 2014 (Grade 7+)
  are near our age.
- **The classroom testing effect is smaller and less precise in elementary school** (g = 0.328, k = 43).
- **No study found compares these formats *inside a speed race*.** Every race interaction above is *(inferred)*.
- **Estimate / "closest to", tap the digit, order and match pairs** have no format-specific evidence at this age.
- **Durkin & Rittle-Johnson 2012 and Kang 2007** were read through a search-index abstract and a secondary note, not the
  papers. Adesope's format effect sizes came from a secondary summary.
