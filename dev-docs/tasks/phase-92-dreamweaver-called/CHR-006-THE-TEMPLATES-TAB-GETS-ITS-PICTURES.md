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
