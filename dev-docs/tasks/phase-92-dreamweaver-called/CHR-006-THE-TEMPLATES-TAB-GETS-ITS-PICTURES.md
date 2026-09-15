# CHR-006 — The Templates tab gets its pictures

The homepage shows the five demo apps as photographs in a grid. The launcher shows the same five
as a text list, by a ruling written into a code comment. The pictures exist. This task puts the
homepage's Demos section inside the launcher.

## 1. The person sentence

**Someone who clicked "Download NodeGX" under the Todo list demo opens the Templates tab and sees
the Todo list — the same picture, the same sentence — and one click makes it their project.**

## 2. What the code says (audit, re-read at HEAD)

- `views/Templates.tsx:49-53`: *"NO THUMBNAILS. THE ROW IS A TITLE, A CATEGORY AND A SENTENCE."*
  The platform provider ships `iconURL: ''`. This is a ruling, not a constraint — and it predates
  the demos existing.
- `TemplateChoice` (`steps/TemplateStep.tsx:43-58`): `{ url, title, description, category, origin?,
  needsBackend? }`. No picture field. `useProjectTemplates` (`hooks/useProjectTemplates.ts:127`)
  fetches the shelf; `filterTemplates` (`steps/templateFilter.ts`) filters it.
- The homepage's Demos section (`nodegx-web/site/index.html:274-341, 638-748`): `.demos` is a
  6-column grid, two `.big` cards spanning 3 and three spanning 2; `.demo-shot` is `aspect-ratio
  16/10`, `object-fit: cover; object-position: top center`; a `.port` eyebrow (mono 10.5px,
  uppercase, `.06em`, with a ringed dot); `h3` 17/700; `p` 14.5/1.55; `.go` link pinned to the
  bottom. Five shots at 1200×750 in `nodegx-web/site/demos/*.webp`, 16–68 KB each, copied into
  [`audit/demos/`](./audit/demos/).
- The launcher's category labels are inconsistent on screen: `Starter`, `Data app`, `Site`,
  `game`. They come from the shelf entries as written.
- P86 (the community shelf) publishes templates with a script; P78 T3 published four. The registry
  entry is where a picture belongs (R4).

## 3. Scope

1. **Rule R4 first.** Proposal: the shelf's template entry gains `thumbnail` (a URL the shelf
   serves) and `eyebrow` (the category line as it should read: `Game · ages 8–12`, `Data app`,
   `Interactive story`, `Site · 3 pages`). P86's publishing script uploads the shot beside the
   project; the five existing entries are re-published with the `audit/demos/` files.
2. `TemplateChoice` gains `thumbnail?: string` and `eyebrow?: string`; the platform provider stops
   sending `iconURL: ''`.
3. **The grid**, in `LauncherPage` (CHR-005): `repeat(6, 1fr)`, the first two cards `span 3`, the
   rest `span 2`; at narrow widths `auto-fill`. `LauncherCard` (CHR-005) with the 16:9 picture
   slot; the eyebrow in mono with the ringed dot in `--theme-color-primary`; the title at
   `--font-size-lg`; the sentence at `--font-size-md` in `fg-muted`; the footer `Use this template →`
   and a `no backend` / `needs a backend` tag from `needsBackend`.
4. **Which two are big:** the two most recently published, or the two the shelf flags `featured`
   — ask Richard, default to the shelf order.
5. **No picture yet:** a template without `thumbnail` gets a headless render of its home page at
   the time the shelf is read, cached under `userData/template-thumbs/<hash>.png` — `render-report`
   / `render-from-disk.js` already produce this from a project directory. If that is too heavy for
   the tab, a neutral wireframe placeholder with the template's initial, on the scale, and a
   filed row against P86 to publish the shot. **Never the kitten.**
6. **Filter chips** become `Games 3 · Sites 2 · Data apps 1 · Starter 1` with the `All 7` pill
   selected, from CHR-005's chip.
7. **The Templates ruling comment** at `Templates.tsx:49-53` is rewritten to record the new one and
   why it changed.

Out: the create-project wizard's `TemplateStep` list (it keeps its 320px-capped list; file a row
if it should match). The homepage itself.

## 4. Acceptance criteria

1. **(person)** Open the Templates tab with the shelf reachable. See the five demo apps as
   pictures in a 2 + 3 grid, each with an eyebrow, a title, one sentence and `Use this template →`;
   put [`audit/demos-section.png`](./audit/demos-section.png) beside the screenshot and they read
   as the same product. Screenshots into `verdicts/CHR-006/<date>/`, both themes, at 1368 and at
   900 wide (where the grid should be two columns). **Richard's verdict on this surface closes
   Track A.**
2. Click `Use this template →` on Todo list: the created project's `nodegx.project.json` name is
   the template's, and the launcher returns to Projects with the new card showing **the same
   picture** as the template card (the `thumbURI` is seeded from the thumbnail until the editor
   captures its own).
3. **Reverted arm:** point the provider at a shelf entry with no `thumbnail` — the card shows the
   fallback from §3.5, the layout does not shift, and nothing requests `placekitten`. Then a shelf
   that is unreachable: the existing "unreadable" state renders, in the new card.
4. The shelf's five entries carry `thumbnail` and `eyebrow`; `curl` each thumbnail URL → 200 and
   an image. Recorded with the URLs in the task file — [[publishing-a-template-demo-to-nodegx-io]]
  says a blank page passes every absence.
5. `filterTemplates` specs unchanged and green; the tab's four render states (not-wired, loading,
   unreadable, bare) each have a screenshot.

## 5. Traps

- 🔴 **The launcher lists what the shelf returns, and the shelf is a network call.** CHR-001
  recorded the row count it saw; if the shelf is down during the drive the tab is a different
  surface and the verdict is void. Read `partial`/`isLoading` before believing an empty grid.
- 🔴 **A demo shot is a picture of a *deployed* page, not of the template in the editor.** The
  Todo list shot shows seeded rows; the template a user installs has none. That is the homepage's
  choice too and it is the right one — but the sentence under it must not promise the rows.
- ⚠️ `object-position: top center` matters: the shots were cropped for it. `center` shows the
  middle of a page and reads as random.
- ⚠️ Category strings come from the shelf as typed (`game` vs `Site`). The `eyebrow` field is the
  fix; do not title-case in the renderer and hide the data problem.

## 6. Built — 2026-09-15, session 6

### 6.1 What §2 and §3 got wrong (re-read at HEAD `19a24dfd7` before any edit)

| said | measured |
|---|---|
| "the five demo apps" on the tab | The shelf is **7** rows: two built in (`site-builder`, `landing-pages`) and **five** community rows. Four of the homepage's five shots are community slugs (`rocket-school`, `todo-list`, `pixel-dungeon`, `story-engine`); the fifth, `business-landing-page`, is **one of the three pages of the built-in `landing-pages`**. `members-area` and `site-builder` have no shot anywhere. |
| "`thumbnail` (a URL the shelf serves)" / "the shelf serves the shot the homepage already has" | **`https://nodegx.io/demos/todo-list.webp` answers 404** (measured 2026-09-15). The homepage's Demos section is not deployed, so a URL column pointing there would be a broken image. The platform now stores the bytes (`0029`) and serves them itself. |
| "No thumbnail column exists" (the rel-013 Trap 4 test: *"there never will be"*) | Reversed by R4. The test now keeps the half that was always the point — no picture ⇒ no `<img>` — beside a known-firing control. |
| AC2: "the launcher returns to Projects with the new card showing the same picture" | **Creation opens the editor, not Projects**, and the editor captures its own `thumbURI` as soon as the project opens. Measured in §6.3. |
| AC2: "the created project's `nodegx.project.json` name is the template's" | The wizard asks for a name and writes **that** (`chr006-todo`). Not a defect of this task; the criterion misdescribes the create flow. |
| §3.4 "default to the shelf order" | Shelf order puts both built-ins first, i.e. two **big wireframe** cards on top. Built instead: cards with a picture first, each half in shelf order (display only; filter and counts untouched). **Richard's to rule.** |

### 6.2 What was built

**The platform (`~/vscode_projects/nodegx-community`, separate repo, no remote):**
- `src/db/sql/0029_chr006_template_picture_and_eyebrow.sql` — `eyebrow text`, `thumbnail bytea`, `thumbnail_type text` on `project_templates`; four CHECKs (eyebrow 2–60, the pair both-or-neither, type ∈ webp/png/jpeg, 1 B–512 KiB), each mapped to a refusal code in `refusals.ts`. Not on the submissions queue (a promoter decides the picture).
- `publishProjectTemplate` takes `eyebrow` / `thumbnail` with **`publishedAt`'s KEY rule**: omitted keeps the card as it was (P88's republishes do not wipe it), `null` clears it.
- Listing and detail carry `eyebrow` and `thumbnail` — a **path** (`/api/v1/community/templates/<slug>/thumbnail?v=<version>`), never bytes. `?v=` moves on every republish.
- `GET …/{slug}/thumbnail` — bytes, `content-type` from the row, `nosniff`, a day's cache; D15 gate first; a draft and a picture-less template are the same 404 as a missing row.
- `scripts/publish-project-template.ts` — `--eyebrow "…"`, `--thumbnail shot.webp`, `--no-eyebrow`, `--no-thumbnail`.
- `tests/chr006-template-picture.test.ts` — 12 specs, every absence beside a presence.

**The editor:**
- `communityapi.readTemplateSummary(raw, origin)` — exported; `thumbnail` is believed **only** when it matches the platform's own thumbnail route, then made absolute on the client's `baseUrl`. Any other origin, route or scheme reads as `null` (the wireframe).
- `TemplateItem.eyebrow`; `PlatformTemplateProvider` maps `thumbnail → iconURL`; `EmbeddedTemplateProvider` maps `ProjectTemplate.eyebrow`. `landing-pages` carries `../assets/images/templates/landing-pages.webp` (the homepage shot, 68 KB, page-relative like `style.css`) and `Site · 3 pages`.
- `TemplateChoice` gains `thumbnail`, `eyebrow`, and **`backendLabel`** — words, not the flag, because `rel-013` forbids `Templates.tsx` from naming `needsBackend` (§6.5 of CHR-005). A community row cannot say, so it gets no tag.
- `LauncherCardGrid layout="feature"` — six tracks, the first two span 3, rest span 2, **a last row of two halves the row** (7 cards ⇒ 2 + 3 + 2, no hole); 2 columns ≤ 1000px, 1 ≤ 640px. `LauncherCardShot` — wireframe under the `<img>`, `onError` hides a broken image, `object-position: top center`, hook-free. `LauncherCardTags`.
- **AC2:** `models/template/seedTemplateThumbnail.ts`, called once from `handleCreateProjectConfirm`. It **fetches the picture once and stores a `data:` URI** — never the URL, which `hasUsableCapture` would accept and which would put a community request on every launcher cold start. Never over a real capture (checked before and after the fetch).

### 6.3 The drives — `verdicts/CHR-006/2026-09-15/` (dev stack, local platform, 2026-09-15)

Rig: `next dev -p 3399` on a scratch DB with `0029`; the five community templates published from `OpenNoodl/templates` with the **live** summaries; four with the homepage shots and the homepage's eyebrows (`Game · ages 8–12`, `Productivity`, `Game`, `Interactive story`), `members-area` deliberately with neither. `COMMUNITY_URL` pointed at it for the drive only — **reverted, `git diff` 0 lines**. Over HTTP first: listing 200 with four versioned paths and one `null`; the Todo list thumbnail 200 `image/webp`, **byte-identical** to `audit/demos/todo-list.webp` (`cmp`); `members-area/thumbnail` 404.

**AC1 (`drive.js`, 8 shots):** shelf state settled with rows (not loading, no notice). At 1368: `grid-template-columns` = six 173px tracks; cards **552 + 552 / 363 + 363 + 363 / 552 + 552**; at 900: two 406px columns. **Pictures: 5 loaded `<img>` (1200×750, `50% 0%`), 2 wireframes; 0 `placekitten` requests; no sideways scroll** — all 8 shots, both themes. The renderer requested the four thumbnails from `localhost:3399` (the swap was live). Lowest card text contrast: the eyebrow, **5.6 dark / 4.57 light**. ⚠️ The drive's row grouping printed the first two cards as two rows — an instrument artefact: Todo list sat at y=232 beside Landing Pages at y=233, lifted 1px by the hover the CDP pointer left on it.
**The look beside `audit/demos-section.png`:** the same shots cropped the same way, the mono eyebrow with the ringed dot, title, one sentence, an action word — reads as the same product. Differences: the launcher's primary blue for the homepage's teal (the theme, not this task); title 15 vs 17; Landing Pages + Todo list big where the homepage has Rocket School + Todo list (§6.1 ordering); the two picture-less cards are **big wireframes at the bottom** and look like placeholders.

**AC2 (`ac2.js`):** Templates → Todo list card (its `<img>` loaded) → wizard (Next, Next, Create Project; the location was the profile's remembered scratch folder — no native dialog) → the profile's `recently_opened_project.json` row `chr006-todo` holds `thumbURI` = `data:image/webp;base64,UklGR…`, **exactly equal** to the shot's bytes as a data URI (`thumbEqualsShot: true`).
**AC2, second half (`ac2-projects.js`) — NOT met:** back on Projects the card draws a **1263×400 PNG**: the editor's own capture of the sign-in page, taken when the project opened, replaced the seed within the same minute. The seed works and is invisible in the ordinary flow. Whether the template's picture should outlive the first capture (e.g. until the first edit) is **Richard's**.

**AC3:** arm 1 is `members-area` and `site-builder` on the same page: wireframe, no layout shift (same slot), 0 kitten requests. Arm 2 (`arm-unreachable-*`, platform stopped): the **partial** state — `Some templates could not be loaded (Community), so this list may be short. Try again` beside the two built-in cards, Landing Pages still pictured, chips `All 2 · Site 2`, both themes. ⚠️ The drive's `unreadable: true` there is its regex matching "could not be loaded" inside the partial notice; the screen is partial, because the built-ins still answer. The zero-row "could not be loaded" screen is unreachable while embedded templates exist.

**AC4 — NOT done, and not this session's to do:** the production shelf has no `0029`, so no live entry carries a picture. Deploying the platform (`ops/deploy.sh`) and republishing the five with `--thumbnail`/`--eyebrow` are outward-facing and **Richard's**. The exact commands are in the handoff.

**AC5:** `filterTemplates` specs unchanged and green (`fb-005/template-search`). Screenshots of rows and partial are here; not-wired / loading / bare were not re-shot (their markup is CHR-005's, unchanged).

### 6.4 Tests and readings (2026-09-15, tree = `19a24dfd7` + CHR-006)

- Platform: `tsc --noEmit` **EXIT=0**; vitest on a scratch DB — `chr006-template-picture` + `fb005-project-templates` + `fb005-template-submissions` + `fb005-binary-template-files` + `db-schema-drift`: **5 files, 193 / 193, EXIT=0** (the pg_constraint → refusal-map completeness spec now covers `0029`'s four).
- Editor: `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; jest over the 44 specs importing a changed module **44 / 44 suites, 1036 / 1036, EXIT=0**; `tests-unit/chr-006/seed-template-thumbnail` **7 / 7** (first run failed to compile — `Buffer` is not a `BodyInit` in the spec; fixed).
- Specs changed: `rel-013/templates-tab` (Trap 4 reversed with a control; eyebrow, backend tag, feature layout added), `fb-005/template-shelf` (fixtures gain the two fields; picture mapping; `readTemplateSummary` refuses hostile values).
- Ratchets, unpiped: `type` 0, `colors` 0, `tokens:css` 0, `icons:css` 0.
- `test:ci`: see §6.6.

### 6.5 Owed, and filed

- **Richard:** the look (this section's shots); which two cards are big (§6.1); AC2's capture-vs-seed question (§6.3); deploy `0029` + republish (AC4).
- **Data (P86/P78):** `members-area`'s live summary is lowercase and fragmentary (*"members only site for a club, charity or church"*); `site-builder` and `members-area` have no shot — the §3.5 headless render is unbuilt, the wireframe is the fallback.
- `Todo list` is `data-app` on the shelf and `Productivity` on the homepage; the eyebrow carries the homepage's word.
- Filter chip labels are still singular (`Game 3`), not §3.6's plurals.

### 6.6 `test:ci`

`19a24dfd7` + the CHR-006 tree, `.webpack-cache` cleared, run alone after teardown, seed 76339: **`2984 specs, 8
failures`**, EXIT=1, `tests/test-results.json` written 19:25:58 (the same second the run ended — fresh). **The same
eight by name as s4 and s5:** `SUB-011` ×3 (expression parameters stay silent), `SUB-006` ×3 (false-positive corpus,
v2 loader), `NDA-017` ×2 (family table vs shipped catalog). None touch the launcher or the shelf. **At the floor.**

### 6.7 Richard's rulings and AC4 live — 2026-09-15, after s6

**Rulings (Richard, on the §6.3 shots):**
1. **CHR-006: WORTHY.** Track A's surface closes. (CHR-005 and CHR-003: "fine". The Community tab "still looks like shit" — a new task, CHR-012. "The font change is nice.")
2. **Which two are big:** pictured cards first, as built — "fine for now".
3. **AC2:** **the editor's screenshot wins.** The seed stays as built (it fills the thumbnail until the first capture), and the card showing the editor's capture after creation is the ruled behaviour, not a defect. AC2 closes.
4. **AC4:** deploy and publish approved.

**AC4, done and read back over real TLS:**
- `ops/deploy.sh 49.12.102.195` from `nodegx-community` clean at `f39d20f`: **DEPLOY_EXIT=0**; live stamp before `ade0d28`, after `f39d20f`; `already applied: 28`, `applied: 0029_chr006_template_picture_and_eyebrow.sql`; neighbours `nodegx.io`, `nexus.digitalbricks.io`, `digitalbricks.io` **200 → 200**; off-site backup 577,076 bytes / 57 tables encrypted; outbox 0 queued.
- **Not a republish** — `set-live-template-cards.sh` (this directory) sets only `eyebrow`, `thumbnail`, `thumbnail_type` on the four published rows over the ssh tunnel. Reason: `templates/rocket-school` held another session's uncommitted edits, and `publish-project-template.ts` would have shipped them as the payload. **CARDS_EXIT=0.**
- Control before: `https://community.nodegx.io/api/v1/community/templates` listed all five with `eyebrow: null, thumbnail: null` (the new build answering, no card yet).
- After: `rocket-school` `Game · ages 8–12`, `todo-list` `Productivity`, `pixel-dungeon` `Game`, `story-engine` `Interactive story`, each with `…/thumbnail?v=2`; `members-area` `null`/`null`. **Versions (v2) and file counts (112 / 30 / 34 / 274 / 100) unchanged** — no payload moved.
- Each thumbnail: **HTTP 200 `image/webp`** — 15,844 / 36,308 / 18,054 / 24,224 bytes; the live Todo list bytes **`cmp`-identical** to `audit/demos/todo-list.webp`; `members-area/thumbnail` **404** (the control).
- ⚠️ A released 0.2.4 editor ignores the two new fields; the pictures reach people with the next editor build that carries `c4fbcde10`.
