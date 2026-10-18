---
id: P121-TWO008-UPLOADSHRINK
title: Upload File sends a phone photo at full size; it cannot shrink it in the browser first
status: fixed
severity: medium
area: viewer / Upload File
found: P121 TWO-008 s1, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-008-WHAT-WAPPLER-DOES.md §6
regression: packages/noodl-viewer-react/tests/shrinkphoto.test.ts
---

A member posting a photo from a phone on mobile data uploads the whole camera file (often 3 to 8 MB) before the
backend makes a thumbnail of it. The backend's `?thumb=` transforms (BAK-006, `sharp`) shrink what is served, not
what is sent. Upload File's inputs are the file, `private` and the File Location inputs
(`packages/noodl-viewer-react/src/nodes/std-library/uploadfile.ts:69`); nothing resizes or recompresses before the
upload, and Open File Picker (`openfilepicker.ts`) hands the file over as picked.

Both P121 templates are for people on slow, paid connections (README §2: "built for slow connections"), and the
community app is photo posts. Wappler offers resizing in the browser before upload (community.wappler.io/t/3112,
read 2026-10-14).

Reproduce: pick a 4000×3000 JPEG in any template with Upload File and watch the request size in the network panel.

Fix, proposed: an option on Upload File (largest side in pixels, JPEG quality) that draws the image to a canvas and
uploads the smaller blob; the original's orientation honoured. Small (one node, a canvas step). Owner: NONE yet;
TWO-005 slice 2 needs it and takes it if nobody has.

**Built in P121 TWO-003 s4 (2026-10-14), not committed yet.** Upload File has a `Shrink Photos` group: **Shrink To**
(`shrinkTo`, the longer side in px; 0, the default, sends every file as picked, so existing graphs are unchanged) and
**Photo Quality** (`photoQuality`, 1–100, default 80). The canvas step is
`packages/noodl-viewer-react/src/nodes/std-library/shrinkphoto.ts`: `createImageBitmap(file, { imageOrientation:
'from-image' })` (the EXIF turn honoured), never enlarges, never re-encodes a photo already within the size, keeps
PNG and WebP as themselves (a logo keeps its transparency), leaves GIF and SVG alone, sends the original if the result
is bigger or the browser can't decode it (the upload is never lost to the shrink). Specs:
`packages/noodl-viewer-react/tests/{shrinkphoto,uploadfile}.test.ts` 28/28, 13 mutants 13 red; driven in the
marketplace (`packages/nodegx-backend/tests/two-003-drive.test.ts`). The code export does not carry it yet:
P121-TWO003-EXPORTSHRINK. Status goes to `fixed` with the commit.
