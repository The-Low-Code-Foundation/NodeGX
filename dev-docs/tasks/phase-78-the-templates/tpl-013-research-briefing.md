# Rocket School: Sub-Saharan Africa edition research brief

Date: 2026-10-14. Scope: primary maths fact fluency, number sense, big-number dictation and typing for ages 8–12. First users are expected in Nigeria and Liberia; the edition should also suit Sub-Saharan Africa (SSA) more broadly.

Confidence markers: **[strong]** means a primary or official document that I read. **[ok]** means reputable secondary reporting. **[weak]** means a commercial site, vendor claim, single news item, or my own inference. Source numbers in brackets point to the list at the end.

---

## 0. Bottom line

- **Most children are 2–3 grade levels behind their curriculum.**
  - Nigeria: only 25% of children aged 7–14 have Grade 2–3 numeracy.
  - Kenya: about 30% of Class 3 pupils can do Class 2 division.
  - Francophone West Africa: about 62% of children end primary school below PASEC's "sufficient" level in maths.
  - The edition should therefore place children by ability, using the Elo engine. The local grade name should be a label and a starting guess, not a content gate.
- **The device is a shared, low-end Android phone running Chrome.**
  - Typical specs: 2–4 GB RAM, a 6.6-inch 720p screen, Android 11–14 (often the "Go" edition). Data is intermittent.
  - Data costs about $0.39/GB in Nigeria and Ghana, $0.59/GB in Kenya and $2.50/GB in Liberia.
  - The game has to work offline, keep a first load under about 1 MB, and support several children on one device.
- **Physical-keyboard typing is a minority use case.**
  - Only about 15% of Ghana's public primary schools had working ICT facilities in 2022/23, and about 65% of Nigerian public schools lacked electricity in 2017.
  - Keep typing as an optional module for computer labs and computer-based-test readiness. Default to a large on-screen number pad.
- **Language of instruction is English in Nigeria (since November 2025) and Liberia.** It is a mother tongue to Grade 3 in Ghana and Kenya, and a bilingual model in Senegal.
  - Audio-first prompts in West African English and French will matter more than translation.
  - Local-language number words are a good add-on. Hausa and Swahili are the easiest first targets. Yoruba (base 20 with subtraction) needs its own logic.

---

## 1. Curricula by grade

**Local grade names for the level chooser**

| Country | Grades 1–6 | Notes |
|---|---|---|
| Nigeria | **Primary 1–6** (also "Basic 1–6" under UBE) | National exams: Common Entrance after P6, then BECE and WASSCE/NECO |
| Ghana | **Basic 1–6** (B1–B6), commonly called "Class 1–6" or "Primary 1–6" | Lower primary is B1–B3, upper primary B4–B6 |
| Kenya | **Grade 1–6** (CBC); older people say "Class/Standard 1–6" | Lower primary G1–3, upper primary G4–6; KPSEA exam at G6 |
| Liberia | **Grade 1–6** | WAEC's Liberia Primary School Certificate Exam (LPSCE) at G6. Maths is 1 of 4 compulsory subjects and the pass mark is 60% [ok][27] |
| Senegal | **CI, CP, CE1, CE2, CM1, CM2** (CI is year 1) | Three "étapes": CI–CP, CE1–CE2, CM1–CM2 [strong][9] |
| Côte d'Ivoire | **CP1, CP2, CE1, CE2, CM1, CM2** | Same structure as Senegal; only the first two names differ [weak] |

### Nigeria (NERDC Basic Education; Lagos and other state unified schemes)

I could not retrieve the official NERDC document. The rows below come from state schemes, Cambridge "Smart Mathematics" guides and teacher lesson notes, so they are **[weak]** overall.

| Class | Number range | ×/÷ | Fractions / decimals | Money / measurement |
|---|---|---|---|---|
| P1 | Whole numbers 1–200 [5] | Addition, subtraction | ½, ¼ (typical) | Naira coins and notes, recognition |
| P2 | 1–500, then 1–1,000 (lesson notes up to 1–5,000) [5] | Multiplication as repeated addition | Simple fractions | Shopping, change |
| P3 | Up to 999, place value H-T-U [5] | Multiplication in the first-term exam [5]; tables usually recited to 12×12 by P3–P4 [weak, practice not policy] | Fractions, equivalent fractions [5] | Length, time |
| P4 | Lagos: place value to 9,999, then to 1,000,000 [6]; Cambridge P4: to 99,999, then 1,000,000 [7] | Multiplication and division 1–1,000, LCM/HCF | Fractions, decimal fractions [6] | Money, measures, Roman numerals |
| P5 | "Whole numbers: up to millions" [7] | Long multiplication and division | Fractions, decimals | Money, area |
| P6 | **Read and write up to 1,000,000,000**; binary↔denary [8] | 3-digit × 3-digit; ÷ by 2–3 digits [8] | All four operations on fractions; fraction↔decimal; percentages; ratio [8] | Profit/loss, simple interest, discount, tax; g/kg/t; litres; speed [8] |

- A new national curriculum is being phased in from 2025/26, starting with P1, P4 and JSS1. It cuts subject load to 9–10 subjects in P1–3 and 10–12 in P4–6, and adds **Basic Digital Literacy** in P4 [ok][10][11].

### Ghana (NaCCA standards-based curriculum, 2019)

Source: the official B1–B3 and B4–B6 PDFs, which I read [strong][1][2].

| Class | Number range | ×/÷ | Fractions / decimals | Money / measurement |
|---|---|---|---|---|
| B1 | Count and compare to **100** (B1.1.1.1) | Addition and subtraction facts | Half (B1.1.3.1) | Recognise coins: 1p, 5p, 10p, 20p, 50p, GH₵1 (B1.1.4.1) |
| B2 | **0–1,000**; skip-count 2s, 5s, 10s (B2.1.1.1) | Add and subtract to 100; mental facts | Half and quarter (B2.1.3.1) | Notes GH₵1–50; collections up to GH₵50; calendar; hour on the clock |
| B3 | **0–10,000** (B3.1.1.1) | **Multiplication up to 5×5** (B3.1.2.5), chart to 9×9 as an exemplar; division as the inverse | Unit fractions; compare like denominators (B3.1.3.1) | Buy and give change with GH₵1–50 notes (B3.1.4.1); m/cm; mass; calendar |
| B4 | **To 100,000**; rounding; Roman numerals to 30 (B4.1.1.1) | **Recall basic multiplication facts to 81 / up to 10×10** (B4.1.2.1); division facts to 81 | **Decimals: tenths and hundredths**; introduction to percent | — |
| B5 | **To 1,000,000** (B5.1.1.1) | Multi-digit × 2-digit | Decimals to thousandths; percent of a quantity | — |
| B6 | **Read and write to 1,000,000,000** (B6.1.1.1.2) | — | — | — |

### Kenya (CBC, KICD designs revised 2024)

The KICD PDFs now return 404, so I used publisher kit tables of contents and summaries **[weak–ok]**.

| Grade | Number range | ×/÷ | Fractions / decimals | Money / measurement |
|---|---|---|---|---|
| G1 | To 100 [weak, inferred] | — | — | Kenyan coins |
| G2 | To 1,000 [weak] | Introductory multiplication | — | — |
| G3 | Count, read and write to 500, then **1,000**; ones, tens, hundreds [12] | Four operations "within range" | — | Kenyan currency: buying and change; time to the hour; cm [12] |
| G4 | Place value to tens of thousands; **read and write to 10,000** [13] | 2-digit × 2-digit; 2-digit ÷ 1-digit with remainder [13] | Proper, improper and mixed fractions; **decimals: tenths and hundredths** [13] | Money: change, balance, savings [13] |
| G5 | Place value **to hundreds of thousands** [14] | — | Decimal operations | — |
| G6 | Place value and total value **to millions** [15] | — | — | KPSEA exam |

- Kenyan textbooks group digits with a space ("10 000"). Nigeria, Ghana and Liberia use commas.

### Liberia (Ministry of Education primary curriculum)

- **I could not obtain the official grade-by-grade maths syllabus online.** It is not on moe.gov.lr in searchable form, and the searches returned only reading materials from the USAID LTTP/Read Liberia programmes.
- Assume an Anglophone West African progression close to Nigeria and Ghana (to 1,000 by G3, to 1,000,000 by G5–6) **[weak, inference]**.
- Grade 6 sits the WAEC LPSCE (Mathematics paper 310) [ok][27].
- Liberia should get its own track in the level chooser once the syllabus is obtained from the Ministry or a partner NGO.

### Senegal (Curriculum de l'Éducation de Base, CEB 2016)

| Class | Number range | Other |
|---|---|---|
| CI–CP (étape 1) | **0–100** (CEB étape 1 competency) [strong][9] | Simple operations, measurement |
| CE1–CE2 (étape 2) | CE1 about 1,000; CE2 about 10,000 or more [weak, French-system heritage] | **CE2 introduces decimals and fractions** late in the year, decimals before fractions [strong][9b] |
| CM1–CM2 (étape 3) | Millions [weak] | Decimals and fractions extended. The cycle goal is "numération décimale, nombres décimaux et fractionnaires…" [strong][9] |

- Times tables in the French tradition: ×2 from CE1, all tables by end of CE2 [weak][9c].
- Money is the CFA franc.

---

## 2. What children can actually do

| Measure | Finding |
|---|---|
| World Bank learning poverty (reading at age 10), SSA | **89%** in 2022, up from 86% in 2019 [ok][16] |
| PASEC 2019, 14 Francophone countries, end of primary, maths | About **62% below "sufficient"** [ok][17]. In the 10 countries tested in both 2014 and 2019, the share at "sufficient" fell from 41% to 39% [ok][18] |
| PASEC 2019, Senegal | Early grades: 79.1% above sufficient. CM2: **35% below** [strong][9][19] |
| PASEC 2019, Côte d'Ivoire | **82.8% below sufficient** at end of primary [ok][19] |
| Senegal, Jàngandoo 2019 (21,500 children aged 9–16) | **22.3% pass a CE1-level maths test**. In school: number knowledge 54.5%, operations 44.1%, problem solving 35.9% [strong][9] |
| Nigeria, MICS6 2021 (ages 7–14, Grade 2–3 standard) | **25.3% have foundational numeracy**. Lagos 82.3%, Jigawa 0.8% [ok][20] |
| Kenya, Uwezo (2013 data) | **3 in 10 Class 3 pupils can do a Class 2 division**; 9 in 10 Class 8 pupils can. Across East Africa, about 1 in 5 Standard 3 pupils pass both literacy and numeracy at Standard 2 level [ok][21][22] |
| Tanzania, Uwezo | 31% of Standard 3 pupils can do a Standard 2 multiplication [ok][22] |
| Ghana, NEA 2016 | **24.9% of P6 pupils proficient in maths** [ok][23] |
| Liberia | At the World Bank EXCEL launch (Dec 2025), officials said **4 in 5 Grade 3 pupils struggle with basic numeracy** [weak: a statement, not a published report][24] |
| Nigeria, Enugu State baseline (2023) | About half of pupils cannot do simple subtraction [weak][25] |

- I found no clean SSA-wide figure for "share of Grade 3–5 pupils who can do 2-digit subtraction".
- The nearest SSA-wide proxy is EGMA/ASER-style measures: typically **a third to a half of Grade 3 pupils fail 2-digit subtraction with borrowing**, and **about 70% fail simple division** (Uwezo). Treat these as indicative **[weak synthesis]**.

**Implication: levels should be set by ability, not by grade.**

- **Within-grade spread is large.**
  - Nigeria's state range runs from 0.8% to 82.3%.
  - Grouping pupils by level raised scores by **0.14 SD in Kenya**, at every level of the distribution [ok][26].
  - In Zambia, Catch Up (TaRL) gave **+0.15 SD** on foundational numeracy and **+0.40 SD on the targeted skills** [strong][28].
- **Recommended use of the local grade:**
  - Use it only as a label and an Elo prior. Start each grade about 2 levels below nominal.
  - Run a 2–3 minute placement probe.
  - Let content float freely.
  - Report progress to teachers as "working at P2 level", which mirrors TaRL's level groups (beginner, number recognition, 2-digit operations, division).

---

## 3. Pedagogy evidence specific to SSA

| Programme | Design | Effect | Credited features |
|---|---|---|---|
| **TaRL / Catch Up, Zambia** (J-PAL RCT, 1,115 schools, G3–5, national scale) | Daily remedial class grouped by level; government teachers | Numeracy **+0.15 SD**; targeted skills **+0.40 SD**; G7 exam **+0.11 SD** long-run; near zero on non-targeted skills [strong][28] | Group by level, not grade; narrow focus on number recognition and procedural arithmetic; simple oral assessment |
| **TaRL / PEC, Côte d'Ivoire** | Teacher-delivered, 50 schools (pilot) | Modest ASER gains; **no EGMA effect** [ok, secondary][29] | Fidelity drops when teachers run it inside the timetable |
| **TaRL, Kano, Nigeria (KaLMA)** | P4–6, more than 30,000 pupils | "Improved outcomes" [weak: no effect size][30] | Hausa and English; government-led |
| **Tracking, Kenya** (Duflo, Dupas, Kremer) | Grade 1 classes split by prior score | **+0.14 SD**, persisting [ok][26] | Teaching to level |
| **onebillion (Malawi RCTs)** | Offline tablet maths in Chichewa; solar charging; about 5 pupils per tablet, 30–60 min/day; about $8 per child per year | 8-week pilot (283 pupils): curriculum knowledge **d=0.75**, conceptual **d=0.23** [ok][31]. 8-month RCT: maths **0.15–0.29**. 2-year RCT: maths **0.54** [ok, vendor summary][32][33] | Offline, local-language audio instruction, self-paced, adaptive sequence, short daily sessions, no reading needed |
| **Can't Wait to Learn (War Child; Sudan, Uganda, Chad…)** | Tablet mini-games tied to the national curriculum; solar | Sudan: about **2× the maths gains** of the government's alternative programme [weak: self-reported][34][35] | Co-designed with local artists and children; self-paced; facilitator present |
| **Ubongo (Akili and Me), Tanzania** | Broadcast cartoons in Swahili | RCT (n=568, ages 4–6): number recognition **+11.7%**, counting **+24%** vs control [ok, vendor summary][36] | Free broadcast TV and radio; edutainment; home language |
| **Eneza Education, Kenya / Côte d'Ivoire** | SMS/USSD quizzes on feature phones | No rigorous evaluation. Pupils chose subjects they were already good at [ok][37] | Works on 2G; very low cost. Caution: self-selection weakens remediation |
| **M-Shule, Kenya** | SMS adaptive learning (IRT) | RCT positive on literacy; numeracy gains of 7–20% are vendor claims [ok / weak][38] | Adaptive, SMS, parent channel |
| **ConnectEd / phone tutoring** (Botswana; 5-country replication including Kenya and Uganda) | 20-minute weekly phone calls plus SMS, by level | Botswana **+0.12 SD**; replication **+0.30–0.35 SD**, Uganda +0.89 [ok][39] | Level-targeted, low-tech, involves a caregiver |
| **Siyavula, South Africa** | Online maths practice; data zero-rated by networks | Light users (under 50 questions) +6% mastery [weak][40] | Zero-rated data; mastery practice |
| **Kytabu / eKitabu, Kenya** | Digital textbook subscription / offline e-library | No outcome evaluation found [weak][41] | Offline library |
| **Khan Academy Kids in Africa** | — | **No Africa-specific evaluation found.** KA Lite offline pilot in Cameroon only [weak][41] | — |
| **Meta-analysis**, tech-supported personalised learning in LMICs (16 RCTs, 53,029 learners) | — | Pooled **0.18 SD**; **adaptive to learner level 0.35 SD** [ok][42] | Adapting to level matters more than personalising to interests |

**Features the strongest SSA programmes credit:**
1. Targeting the child's level.
2. Working offline on solar or shared devices.
3. Audio instruction in a language the child understands, with no reading prerequisite.
4. Short daily sessions of 15–30 minutes.
5. Narrow foundational focus on place value, the four operations and facts.
6. A facilitator or caregiver loop.
7. Content co-designed locally.

Rocket School's Elo engine already covers point 1. Points 2–7 are the work.

---

## 4. Devices and connectivity

**Handsets**

- In Nigeria, Transsion brands lead web traffic share (Feb 2025): Tecno 23.6%, Infinix 21.7%, Itel 5.4%, Samsung 12.4%, Apple 9.4% [ok][43].
- A typical entry phone is the itel A50 (about ₦91,500): **6.6-inch 720×1612 IPS, Android 14 Go, 2–4 GB RAM, Unisoc T603** [ok][44].
- Android versions in Nigeria (StatCounter, June 2026): A13 17.6%, A12 16.5%, A11 13.0%, A14 12.5%, A15 11.7%, A10 9.6%. That is about 81% on Android 10–15, and Chrome is evergreen on these [ok][45]. Older devices (≤ A9) remain a tail of perhaps 10–15% **[weak]**.

**Access**

- GSMA 2025: mobile internet **use is only 25% of the SSA population**. The usage gap is 65% against a coverage gap of 10%.
- Handset cost is the largest barrier: an entry smartphone costs up to 87% of monthly income for the poorest [ok][46].
- Liberia: about **30% of people used the internet at the end of 2025**, and mobile connections equal 96% of the population [ok][47].
- **Children use a parent's phone.** In Nigeria, 64% of children used smartphones for remote learning during COVID (Kaspersky, not representative) [weak][48]. Access depends strongly on household wealth [ok][48].
- Implication: **one device, several children, intermittent use, and a parent who can take the phone back**.

**Schools**

- Ghana: **15% of public primary schools had functional ICT facilities** (2022/23); 2% in deprived districts.
- Ghana: **44% of primary schools were grid-connected** (2020).
- About half of Ghana's schools teach Computing without equipment [ok][49].
- Nigeria: about **65% of public primary and junior secondary schools lacked electricity** in 2017 [ok][50]. In a 2021 survey of primary teachers, 52.7% had no computer lab at their school [weak][50].
- Labs exist mainly in private and urban schools.

**Data cost, 1 GB (Cable.co.uk latest, via a 2026 ranking)** [ok][51]

| Country | Price per GB |
|---|---|
| Nigeria | **$0.39** |
| Ghana | **$0.40** (NCA measured $0.49 in Apr 2024 [52]) |
| Kenya | **$0.59** |
| Liberia | **$2.50** |
| Senegal | $1.63 |
| Côte d'Ivoire | $1.18 |

- Nigeria raised tariffs by 50% in February 2025: MTN 1 GB went from ₦200 to ₦350, and the NCC cap is ₦431 [ok][53].
- Kenya: Safaricom offers personalised 1 GB/24h bundles at about KES 100 [ok][54].

**Page weight implications**

- **Cost per load** of a 3–5 MB bundle is about 0.15–0.3 US cents in Nigeria, Ghana and Kenya, and about 1–1.25 cents in Liberia. That is cheap once, but costly if the game re-downloads on every session.
- **Load time and memory are the bigger problems.** These are 3G/4G-variable networks and 2 GB Android Go phones, where Chrome kills background tabs.
- **Targets:**
  - First load **≤ 1 MB compressed**, interactive in under 5 seconds on slow 3G.
  - Language and audio packs lazy-loaded per locale.
  - A **service worker precaches everything**, so the game works fully offline from the second visit.
  - Installable PWA, so the parent's home-screen icon survives.
  - No WebGL requirement; 60 fps is not needed.
  - Peak RAM under about 150 MB **[weak, engineering judgement]**.
- **Sharing:**
  - Teachers will want to "share" the game. Device-to-device APK sharing apps are culturally common in Nigeria **[weak]**.
  - A Trusted Web Activity (TWA) APK wrapper is a cheap second channel.
- **Storage:** localStorage is fine. Key it **per child profile** on a shared phone, and offer an export/QR code so a child's progress survives a phone change.

**Is typing practice meaningful?**

- **Policy says yes:**
  - Ghana has Computing as a B4–B6 subject and the maths curriculum mandates ICT use [strong][2][49].
  - Nigeria's new curriculum adds Basic Digital Literacy in P4 [weak][11].
  - WAEC is moving the WASSCE to computer-based tests: 2025 for school candidates, about 1.96 million candidates in 2026, most still on paper [ok][55]. This is secondary school, though, so it is a horizon motivation only.
- **Reality says few primary children have regular access to a physical keyboard.**
- **Recommendation:**
  - Keep keyboard typing as an **optional "Computer Lab" mode**.
  - Make the default input a **large on-screen number pad**, with phone-keypad layout and thumb-sized keys.
  - Make number-entry speed, not QWERTY, the fluency measure on phones.

---

## 5. Language

**Language of instruction (LoI) in primary maths**

| Country | Policy | Reality / notes |
|---|---|---|
| Nigeria | The 2022 National Language Policy (mother tongue P1–P6) was **cancelled in Nov 2025**; **English is now the LoI** at all levels [ok][56][57] | Even before, English dominated in practice [ok][57]. A Nigerian language remains a subject [ok][11] |
| Ghana | Ghanaian language is the main medium from KG to P3; P4–P6 use the Ghanaian language and English; one of 11 approved languages [ok][58] | The Ministry restated this in Aug 2026; parents often push for English |
| Kenya | Language of the catchment area in G1–3; English from G4; Kiswahili is a compulsory subject [ok][59] | English is widely used even in G1 [ok][59] |
| Liberia | **English only from kindergarten**; no official mother-tongue policy [ok][60] | Small mother-tongue pilot (LLEME, 32 schools); some parents opposed [ok][60] |
| Senegal | **Harmonised bilingual model (MOHEBS)**: national language about 80% of time in CI–CP, equal time in CE1–CE2; 6–8 languages; deployed in 12 regions and piloted in Dakar [ok][61] | Funding hit by the USAID freeze [ok][61] |
| Côte d'Ivoire | French; bilingual pilots (PEI) [weak: not researched in depth] | — |

**Would local-language number words help, and which first?**

- **Help:**
  - The strongest SSA programmes (onebillion, Ubongo, Can't Wait to Learn) all teach in a language the child understands.
  - Bilingual number knowledge supports transfer, and it is a hook for parents.
  - In English-medium Nigeria and Liberia, local-language audio is **home support, not the main channel**.
- **Number-word systems:**
  - **Hausa**: decimal and regular (goma sha takwas = 18). It has optional subtractive forms: 18 = "ashirin biyu babu" (20−2), 19 = "ashirin ɗaya babu" [ok][62]. Easy.
  - **Swahili**: decimal and regular (kumi na moja = 11, ishirini = 20). Watch **Swahili time**: saa moja asubuhi = 7 a.m. Clock items need care [weak, standard knowledge].
  - **Yoruba**: **base 20 with subtraction**. 11–14 = 10+n; **15–19 = 20−5 … 20−1** (ẹ̀ẹ́dógún = 15, ẹ̀rìndínlógún = 16); 25 = 30−5; 35 = 40−5; 40 = 20×2; **50 = 60−10**; 100 = 20×5; 200 = 20×10 [ok][63][64]. A word-for-digit dictation engine will not work. Yoruba needs its own generator, and it makes a rich "cultural maths" mode.
  - **Igbo**: also base 20 (ọgụ = 20, nnụ = 400) [weak, not verified].
  - **Twi**: decimal [weak].
- **Realistic first languages:**
  1. **Hausa**: largest Nigerian language and regular.
  2. **Swahili**: Kenya, Tanzania and East Africa; regular.
  3. **Yoruba**: high demand in the southwest Nigerian market, but needs a special generator.
  4. Twi.
  5. Igbo.
  6. Wolof, for Senegal under MOHEBS.
  - Liberia: English plus Liberian-English voice; Kpelle and Bassa later at most.
- **English and French audio:**
  - Record prompts with **West African English** voices.
  - Big-number reading follows the British convention ("three hundred **and** twenty"), with comma grouping. Kenya uses space grouping.
  - French uses space grouping and a decimal comma, and Senegalese French voices.

---

## 6. Cultural and contextual content

**Currencies for money problems**

| Currency | Subunit | Notes | Coins | Notes for problem design |
|---|---|---|---|---|
| Nigerian naira (₦) | 100 kobo | ₦5, 10, 20, 50, 100, 200, 500, 1,000 | 50k, ₦1, ₦2, rarely used [weak][65] | Small notes are scarce; everyday prices are now hundreds to thousands of naira (a loaf of bread was ₦50 in 2021 and costs much more now) [ok][65]. Avoid kobo arithmetic. Use whole naira and ₦50–₦5,000 prices |
| Ghana cedi (GH₵) | 100 pesewas | GH₵1, 2, 5, 10, 20, 50, 100, 200 | 10p, 20p, 50p, GH₵1, GH₵2 (1p and 5p rare) [ok][66] | The curriculum itself uses 1–50 cedi notes and pesewa coins [strong][1]. Decimals with pesewas suit B4+ |
| Liberian dollar (L$) | 100 cents | 2022 series: L$20, 50, 100, 500, 1,000 | L$5 and L$10 coins (2022), reportedly reverting to notes (Jul 2026); a L$2,000 note was proposed [ok][67] | **US dollars co-circulate widely** [weak, general knowledge]. Consider L$ and US$ problems and conversion for upper grades |
| Kenyan shilling (KSh) | 100 cents | KSh50, 100, 200, 500, 1,000 | KSh1, 5, 10, 20 [weak][68] | M-Pesa mobile money is everyday life. "Send KSh 250" is a natural context |
| CFA franc BCEAO (Senegal, Côte d'Ivoire) | (no subunit used) | 500, 1,000, 2,000, 5,000, 10,000 FCFA | 5, 10, 25, 50, 100, 200, 250, 500 [ok/weak][69] | Large face values suit big-number work; no decimals |

**Word problems, names and settings**

- **Names**: use names that span the country's main groups.
  - Nigeria: Hausa (Aminu, Zainab), Yoruba (Tunde, Funmi), Igbo (Chidi, Ngozi).
  - Ghana: Akan day names (Kofi, Ama, Kwame, Akosua) plus northern names (Abdul, Fuseina).
  - Liberia: Musu, Korto, Flomo, Kollie.
  - Kenya: Wanjiru, Otieno, Achieng, Kiprono.
  - Senegal: Awa, Moussa, Fatou, Ousmane.
  - Rotate Muslim and Christian names. **[weak: practice recommendation, no single authoritative source]**
- **Settings**: market stalls, provisions shops, keke/okada/boda-boda/matatu fares, farms (cassava, maize, cocoa, rice), school uniforms, football, rainy and dry seasons, mobile money, water containers, jollof rice, plantain/kelewele, mandazi, attiéké.
  - Can't Wait to Learn credits co-creation with local artists and children [ok][35]. Budget a review by 2–3 teachers per country.
- **Gender**: Nigerian maths and STEM textbooks over-represent males and stereotype roles. The DIGISTEM review covered 2,116 references in 25 recommended books [ok][70]. Balance protagonists, and show girls doing the calculating, building and selling.
- **Avatars**: a range of dark skin tones as the default, not as an option. Natural hair, braids, cornrows, short cuts and a headscarf/hijab option. School-uniform outfits. Wheelchair or glasses options. Avoid "tribal" costume as the default look.

**Avoid**

- Pork or alcohol in problems (Muslim north Nigeria, Senegal).
- **Betting or lottery contexts**: sports betting is pervasive among youth in Nigeria and Kenya.
- Poverty or charity framing ("Ada has no shoes").
- Safari-animal clichés and "Africa is a country" (no single generic African flag or map).
- Ethnic or political jokes, and naming real politicians.
- Overly specific prices that date quickly. Use a price table per locale that can be updated without a code change.
- Sterling or euro contexts left over from the French edition.

---

## 7. Recommendation: changes from the French-school edition, ranked by expected impact

1. **Make the game offline-first and lightweight.**
   - First load ≤ 1 MB compressed; service worker precache; installable PWA plus an optional TWA APK.
   - Runs on a 2 GB Android Go phone in Chrome; lazy per-language audio packs.
   - If it does not load, nothing else matters. Liberia data is $2.50/GB and use is intermittent everywhere.
2. **Place by ability, label by local grade.**
   - Run a 2–3 minute placement probe. Seed Elo about 2 grade levels below nominal.
   - Let content float across grades. Show progress as "working at Primary 2 level".
   - This is TaRL logic: Zambia +0.15 to +0.40 SD, Kenya tracking +0.14 SD, adaptive EdTech 0.35 SD vs 0.18 SD.
3. **Rebuild the content ladder around foundational gaps.**
   - Place value to 1,000, then 10,000.
   - 2-digit addition and subtraction with regrouping.
   - Multiplication facts: to 5×5 (B3), then to 10×10 (B4), then 12×12 for the Nigerian market.
   - Division as the inverse.
   - Keep big-number dictation as the top rung: to 1,000,000 for P4–5/B5 and to 1,000,000,000 for P6/B6.
4. **Make it audio-first with a minimal reading load.**
   - Every instruction and number is spoken in West African English or Senegalese/Ivorian French.
   - Use icon-led UI. With 89% learning poverty, text-heavy prompts measure reading, not maths.
5. **Support a shared device with short sessions.**
   - Several child profiles on one phone, chosen by picture avatar with no PIN, with progress keyed per profile.
   - 10–15 minute sessions with natural stopping points.
   - QR or code export of progress. A simple parent/teacher summary screen.
6. **Use the local level chooser and curriculum tracks.**
   - Labels: Primary 1–6 (Nigeria), Basic 1–6 (Ghana), Grade 1–6 (Kenya, Liberia), CI–CM2 (Senegal), CP1–CM2 (Côte d'Ivoire).
   - Map each label to the tables in §1, with a separate Liberia track once the syllabus is obtained.
7. **Localise money and contexts.**
   - Naira, cedi/pesewa, L$ (and US$), KSh and M-Pesa, CFA.
   - A locale price table, names and settings per §6, and an avoid list.
   - Local teacher review of every word problem.
8. **Change the input model.**
   - Default to a big on-screen number pad and measure entry fluency.
   - Move QWERTY typing to an optional "Computer Lab / CBT ready" mode for schools with labs; Ghana B4–B6 Computing and Nigeria P4 Digital Literacy give it a curricular hook.
   - Respect locale number formatting: commas in Anglophone West Africa, spaces in Kenya and Francophone countries, decimal comma in French.
9. **Add local-language number-word audio as an add-on.**
   - Hausa and Swahili first (regular decimal systems), then Yoruba with its own base-20 subtractive generator (a "cultural maths" challenge), then Twi, Igbo and Wolof.
   - Record with native-speaker voices. Do not machine-translate.
10. **Use representative avatars and characters.**
    - Dark skin tones by default, natural hair, headscarf option, school uniforms, gender-balanced protagonists.
    - Co-design 1–2 rounds with children and teachers in Nigeria and Liberia, as Can't Wait to Learn does.

---

## Sources

1. NaCCA, Mathematics Curriculum for Primary Schools B1–B3 (2019). https://curriculumresources.edu.gh/basic/wp-content/uploads/2026/05/MATHEMATICS-BASIC-B1-B3-2.pdf
2. NaCCA, Mathematics Curriculum B4–B6 (2019). https://curriculumresources.edu.gh/basic/wp-content/uploads/2026/05/MATHEMATICS-BASIC-B4-B6-1.pdf
5. HeadTeacher.ng lesson notes (P1 1–200, P2 1–1000, P3 to 999, P3 exam). https://www.headteacher.ng/lesson-on-whole-numbers-1-200-primary-1 ; https://www.headteacher.ng/lesson-note-on-whole-numbers-1-1000-for-primary-2/ ; https://www.headteacher.ng/lesson-note-on-whole-numbers-up-to-999-counting-of-numbers-up-to-999-for-primary-3/ ; https://www.headteacher.ng/first-term-general-mathematics-examination-for-primary-3/
6. Syllabus.ng, Lagos Primary 4 Mathematics scheme. https://syllabus.ng/?p=7875
7. Cambridge Smart Mathematics Primary 4 and 5 Teacher's Guides (Nigeria). https://www.cambridge.org/ng/files/8515/5723/4225/Smart_Mathematics_Primary_4_Teachers_Guide_9781108578882.pdf ; https://www.cambridge.org/ng/files/9315/5723/4831/Smart_Mathematics_Primary_5_Teachers_Guide_9781108560948.pdf
8. Syllabus.ng, Primary 6 Mathematics scheme. https://syllabus.ng/primary6-scheme-of-work/mathematics/
9. Sène & Fall (2024), Confemen–Cnesco note on Senegal primary maths. https://cnesco.fr/wp-content/uploads/2024/05/Confemen-Cnesco_CC-maths-primaire_Note_SENE-FALL.pdf
9b. Grapin, Mounier, Priolet (2024), Confemen–Cnesco synthesis on Senegal maths textbooks. https://cnesco.fr/wp-content/uploads/2024/05/Confemen-Cnesco_CC-maths-primaire_GRAPIN-MOUNIER-PRIOLET_synthese.pdf
9c. Académie Nancy-Metz, CE1 number and calculation progression (French reference). https://sites.ac-nancy-metz.fr/ia57sciences/IMG/doc/progression_ce1_numeration_calcul.doc
10. AllAfrica, "Federal Govt Unveils New Curricula" (Sep 2025). https://allafrica.com/stories/202509010037.html
11. HeadTeacher.ng, Primary 4 New National Curriculum 2026/27. https://www.headteacher.ng/primary-4-new-national-curriculum-2026-subjects-guide-download/
12. Elimupepe, Kenya Grade 3 Mathematics Term 2. https://elimupepe.loholearning.co.ke/courses-details/mathematics-grade-3-term-2
13. KLB Mathematics Grade 4 study kit (opiq). https://opiq.co.ke/Kit/Details/94
14. Longhorn Mathematics Grade 5 study kit (opiq). https://opiq.co.ke/Kit/Details/47
15. Mathematics Grade 6 study kit (opiq). https://opiq.co.ke/Kit/Details/74
16. World Bank/UNICEF, State of Global Learning Poverty 2022. https://www.unicef.org/press-releases/70-cent-10-year-olds-learning-poverty-unable-read-and-understand-simple-text ; https://UNICEF.org/media/122921/file/StateofLearningPoverty2022.pdf
17. IIEP Learning Portal, latest large-scale assessments. https://learningportal.iiep.unesco.org/en/blog/whats-new-in-student-performance-insights-from-the-latest-large-scale-learning-assessments
18. CGDev on PASEC 2014–2019. https://www.cgdev.org/node/3129417
19. AIP Côte d'Ivoire on PASEC. https://www.aip.ci/cote-divoire-examen-blanc-du-programme-danalyse-des-systemes-educatifs-une-evaluation-optimiste-pour-la-cote-divoire-drena/ ; Confemen–Cnesco presentation (Dia). https://www.cnesco.fr/wp-content/uploads/2024/05/Confemen-Cnesco_CC-maths-primaire_Presentation_DIA.pdf
20. Intelpoint, Nigeria MICS 2021 foundational numeracy. https://intelpoint.co/?p=9140 ; UNICEF Nigeria FLN. https://www.unicef.org/nigeria/reports/foundational-literacy-and-numeracy-nigeria
21. Uwezo Kenya press release / summary. https://twaweza.org//wp-content/uploads/2021/02/Uwezo-KE-PressRelease_FINAL.pdf ; https://twaweza.org/wp-content/uploads/2021/02/KenyaSummary29072015-FINAL.pdf
22. Uwezo East Africa release (2015); Uwezo Tanzania release. https://twaweza.org//wp-content/uploads/2021/02/UwezoEAPressRelease12052015-FINAL-EN.pdf ; https://twaweza.org/wp-content/uploads/2021/05/Uwezo-TZ-PressRelease-EN-FINAL.pdf
23. Fact-Check Ghana on NEA 2016. https://www.fact-checkghana.com/napos-presentation-in-parliament-these-four-claims-are-false/ ; NEA 2016 report. https://sapghana.com/data/documents/2016-NEA-Findings-Report_17Nov2016_Public-FINAL.pdf
24. AllAfrica, World Bank EXCEL project Liberia (Dec 2025). https://allafrica.com/stories/202512170673.html
25. TechEconomy, Enugu baseline. https://www.techeconomy.ng/50-of-pupils-in-enugu-state-cannot-read-ssg-hints
26. Duflo, Dupas, Kremer, Tracking in Kenya (NBER w14475). https://nber.org/papers/w14475.pdf
27. Open Exam Prep, LPSCE overview; MoE Liberia WAEC 2025. https://open-exam-prep.com/practice/lr-lpsce ; https://moe.gov.lr/waec-liberia-releases-2025-exam-results-introduces-new-subjects-for-2026/
28. J-PAL, Targeting Foundational Skills at Scale in Zambia. https://www.povertyactionlab.org/evaluation/targeting-foundational-skills-improve-learning-scale-zambia?lang=en
29. AFLEARN TaRL review (UCT DataFirst). https://www.datafirst.uct.ac.za/sites/default/files/media/documents/dfru_uct_ac_za/2872/aflearn-report-tarl.pdf ; TRECC PEC. https://treccprogram.org/en/project/pec/
30. British Council KaLMA policy brief 3. https://www.britishcouncil.org.ng/sites/default/files/kalma_policy_brief_3_improving_foundational_literacy_and_numeracy.pdf
31. Pitchford (2015), Frontiers in Psychology. https://pmc.ncbi.nlm.nih.gov/articles/PMC4893577
32. Imagine Worldwide 2-year Malawi RCT brief. https://www.imagineworldwide.org/wp-content/uploads/2-Year-Malawi-RCT-Formatted-Research-Brief_Updated_10_6_22.pdf
33. Imagine Worldwide research summary; GuideStar profile. https://www.imagineworldwide.org/wp-content/uploads/Imagine-Worldwide_Research-Summary_Sept-2023.pdf ; https://www.guidestar.org/profile/82-0990106
34. War Child, CWTL academic improvements, Sudan. https://warchild.net/cwtl-academic-improvements
35. CWTL information sheet (2020). https://blogs.shu.ac.uk/c3riimpact/files/2020/02/2020-02-20-CWTL-Cant-Wait-to-Learn-War-Child-Holland-Information-sheet-.pdf
36. Ubongo, Akili and Me effectiveness study. https://www.ubongo.org/akili-and-me-effectiveness-study-in-rural-tanzania
37. GSMA, Eneza evaluation in Côte d'Ivoire. https://www.gsma.com/mobilefordevelopment/blog/five-key-insights-from-evaluating-a-gsma-edtech-grantee-in-cote-divoire/
38. M-Shule SMS literacy RCT (Cambridge repository); EdTech Hub. https://www.repository.cam.ac.uk/handle/1810/375827 ; https://docs.edtechhub.org/lib/JQREWVZC
39. J-PAL "The tutor is calling"; Youth Impact brief. https://www.povertyactionlab.org/fr/node/8131252 ; https://www.youth-impact.org/_files/ugd/41ddfd_51f5f220bf414a8a8ae9730e60ae9999.pdf
40. Siyavula GDE project. https://help.siyavula.com/en/article/siyavula-gde-project-qaa9a0/
41. GSMA Kytabu; KA Lite Cameroon. https://www.gsma.com/mobilefordevelopment/innovation_fund_map/kytabu-company-limited/ ; https://schools.khanacademy.org/tagged/bsf
42. Major, Francis, Tsapali (2021), BJET meta-analysis. https://docs.edtechhub.org/lib/5U948655 ; https://eprints.whiterose.ac.uk/176999/1/bjet.13116.pdf
43. Intelpoint, Nigeria phone brand share (Feb 2025). https://intelpoint.co/insights/tecno-has-the-highest-share-among-phone-brands-in-nigeria-at-23-55-as-of-february-2025/
44. Mobility.ng / NaijaTechGuide, itel A50. https://mobility.com.ng/itel-a50-price-specs/ ; https://www.naijatechguide.com/itel-a50.html
45. StatCounter, Android version share in Nigeria. https://gs.statcounter.com/android-version-market-share/mobile/nigeria
46. GSMA State of Mobile Internet Connectivity 2025. https://www.gsma.com/somic/ ; https://businessday.ng/technology/article/rising-smartphone-taxes-data-costs-threaten-300bn-opportunity/
47. DataReportal, Digital 2026 Liberia. https://datareportal.com/reports/digital-2026-liberia
48. ITEdgeNews (Kaspersky); World Bank COVID learning six-country study. https://itedgenews.africa/covid-19-58-nigerian-families-bought-or-rented-extra-devices-for-remote-learning-kaspersky-findings ; https://documents1.worldbank.org/curated/en/656051621919132722/pdf/Impact-of-COVID-19-on-Learning-Evidence-from-Six-Sub-Saharan-African-Countries.pdf
49. Starr FM / EduWatch (ICT facilities); WATHI / EduWatch infrastructure (Apr 2025). https://starrfm.com.gh/2024/05/2022-2023-academic-year-15-of-public-primary-schools-had-functioning-ict-facilities-eduwatch ; https://www.wathi.org/wathinotes-systemes-educatifs/ghanas-basic-education-infrastructure-progress-gaps-and-strategies-towards-2030-africa-education-watch-april-2025/
50. Guardian Nigeria, 65% of schools lack electricity; Richtmann teacher survey. https://guardian.ng/features/65-of-nigerian-schools-lack-electricity-says-un-chief/ ; https://richtmann.org/journal/index.php/mjss/article/download/11025/10638/41908
51. Les Afriques, "The real price of data in Africa" (Oct 2026, from Cable.co.uk). https://lesafriques.com/en/2026/10/the-real-price-of-data-in-africa-ranking-of-53-countries-0-38-to-43-75-per-gb/
52. NCA Ghana, The Cost of 1GB of Data in Ghana. https://www.nca.org.gh/wp-content/uploads/2024/07/The-Cost-of-1GB-of-Data-in-Ghana.pdf
53. TechCabal / BusinessDay on the Nigerian tariff hike. https://techcabal.com/2025/02/11/mtn-nigeria-raises-internet-prices/ ; https://businessday.ng/technology/article/nigerias-internet-usage-dips-slightly-after-50-tariff-hike/
54. TechCabal, best data plans in Kenya (Aug 2025). https://techcabal.com/?p=165500
55. BusinessDay, 2026 CBT WASSCE. https://businessday.ng/news/article/1-96-million-candidates-participate-as-fg-commends-2026-cbt-wassce-conduct/
56. Al Jazeera, Nigeria mother-tongue policy (Dec 2022). https://www.aljazeera.com/news/2022/12/1/nigeria-junior-schools-to-teach-in-mother-tongues-not-english
57. AllAfrica, "Govt drops mother tongue policy" (Nov 2025); Inside Education. https://allafrica.com/stories/202511130044.html ; https://insideeducation.co.za/nigeria-cancels-mother-tongue-teaching-in-primary-schools-and-reverts-to-english/
58. Ghanaian Times, MoE clarifies mother-tongue policy (2026); The Conversation. https://ghanaiantimes.com.gh/education-ministry-clarifies-mother-tongue-policy-in-basic-schools ; https://theconversation.com/why-ghana-is-struggling-to-get-its-language-policy-right-in-schools-120814
59. MMUST repository; UNICEF Language and Learning Kenya (2016). https://ir-library.mmust.ac.ke/xmlui/handle/123456789/3304 ; https://www.unicef.org/esa/sites/unicef.org.esa/files/2018-09/UNICEF-2016-Language-and-Learning-Kenya.pdf
60. UW–Madison LCTL, About Kpelle; LBT on LLEME. https://wisc.pb.unizin.org/lctlresources/chapter/about-kpelle/ ; https://lbt.org/stories-from-the-field-lleme-monitoring-visits-based-on-an-article-by-samuel-cooper-linguistics-director-at-libtralo/
61. Le360 / SenePlus / Dakaractu on MOHEBS. https://afrique.le360.ma/societe/senegal-ici-on-apprend-langlais-sans-oublier-de-dire-jerejef_DZ4NKYNFN5HLXLGU3C5AXETYQY/ ; https://www.seneplus.com/article/le-senegal-veut-son-ecole-mais-avec-largent-des-autres ; https://www.dakaractu.com/Thies-Enseignement-bilingue-au-Senegal-8-langues-introduites-les-agents-des-IA-et-IEF-outilles_a266914.amp.html
62. Omniglot, Hausa numbers. https://omniglot.com/language/numbers/hausa.htm
63. Wikipedia, Yoruba numerals. https://en.wikipedia.org/wiki/Yoruba_numerals
64. University at Buffalo, Yoruba Numerals. https://www.math.buffalo.edu/mad/Ancient-Africa/mad_nigeria_pre-colonial.html
65. Daily Trust, "N20, N50, N100: nothing to buy"; Leftover Currency, naira coins. https://dailytrust.com/n20-n50-n100-nothing-to-buy/ ; https://www.leftovercurrency.com/exchange/nigerian-naira/nigerian-naira-coins/
66. Citi Newsroom, GH₵100/200 notes (2019); Wikipedia, Ghanaian cedi. https://www.citinewsroom.com/2019/11/this-is-how-the-new-gh%c2%a2100-gh%c2%a2200-notes-look-like-photos/ ; https://en.wikipedia.com/wiki/Cedi
67. Coin World / Currency News, Liberian notes. https://www.coinworld.com/news/paper-money/liberia-issues-four-new-bank-notes-to-complete-series ; https://currency-news.com/news/2026/jul/27/liberia-to-revert-to-banknotes-for-lowest-denominations/
68. Wikipedia, Kenyan shilling. https://en.wikipedia.org/wiki/Kenyan_shilling
69. BCEAO, Billets et pièces. https://bceao.int/index.php/en/content/billets-et-pieces
70. Dele-Ajayi et al. (2020), gender in Nigerian STEM textbooks (Northumbria). https://nrl.northumbria.ac.uk/id/eprint/44855
