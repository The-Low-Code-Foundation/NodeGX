---
id: P107-C93
title: An Image in an app served from a sub-path adds the Base URL to its source again at every render — /x/a.png becomes /x/x/x/a.png in the first frame, and the picture breaks
status: fixed
commit: fe5ebfab5
phase: P109
task: ISL-038
severity: high
area: runtime / Image (noodl-viewer-react/src/components/visual/Image/Image.tsx :57-62)
found: P107 NSP-016 s53, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.14; measured on the runtime target with `Noodl.Env.BaseUrl` set and Source "a.png", reading the element's `src` through Error after a failure in each frame (Alternate text written between them to re-render): Base URL "/x/" — "/x/x/x/a.png", then "/x/x/x/x/x/a.png", then seven copies; no Base URL — "/a.png" each time; Base URL "https://cdn.example/" — "https://cdn.example/a.png" each time
kit: node-spec
regression: packages/noodl-viewer-react/tests/c93-image-base-url.test.tsx "under a sub-path Base URL: \"/x/a.png\" at the first render and at the second (the defect)"
---

**What a person sees.** An app is deployed under a sub-path (`nodegx deploy --base-url /x/`, the templates on nodegx.io). Its pictures
point at the wrong address as soon as the Image draws a second time: a hover state, any input that changes, the parent re-rendering.
The request goes to `/x/x/a.png`, then `/x/x/x/a.png`, and the picture is a broken image.

**Where.** Image.tsx :57-62 puts the Base URL in front of a source that starts with `/` by writing back into the node's own props:
`props.dom.src = baseUrl + props.dom.src.substring(1)`. The result still starts with `/` when the Base URL is a path, so the next render
adds it again. `props.dom.src` is the node's stored value, not a copy, so it grows by one prefix at every render. A Base URL that is a
full URL (`https://…`) stops after one, because the result no longer starts with `/`. Video.tsx :90-95 does the same thing in a local
variable and does not grow. node-shared-port-definitions.ts :1982-2000 (the background image) already notes that "Image.tsx has no
such guard and doubles", but only for a source that already carries the base. The render loop makes it grow with every source.

**How to reproduce.** On the runtime target, set `Noodl.Env = { BaseUrl: '/x/' }` before the viewer nodes register, place an Image with
Source "a.png", then play a failure (`fetched` "error") in two frames with an Alternate text write between them. Error names the
element's `src` each time. (The probe, `zz-baseurl.test.ts`, was deleted after the measurement. The node-spec face has no project Base
URL, so the Image spec does not reach it.)

**Proposed fix.** Compute the based URL into a local, as Video.tsx does, and add the guard the background image port has (`!src.startsWith(baseUrl)`):
`let src = props.dom?.src; if (src?.startsWith('/') && baseUrl && !src.startsWith(baseUrl)) src = baseUrl + src.substring(1);` and render
`src={src}` after the `props.dom` spread. Ship a regression that renders twice under a sub-path Base URL. A world setting for the project Base
URL in the node-spec face would let the Image spec grade it.

**Fixed fe5ebfab5 (P109 ISL-038, 2026-10-07), as proposed (R16: "Hand all to P109, C93 first").** Image.tsx computes the based source into a local and renders `src={src}` after the `props.dom` spread; it never writes back into the node's props, and a source that already starts with the Base URL keeps it once (the background image port's guard). Error names the source the element was given. Regression: `tests/c93-image-base-url.test.tsx` renders one node twice per base (sub-path, none, full URL, already based, absolute source, no source). Control: HEAD's Image.tsx red on exactly the sub-path, write-back and already-based arms (3 of 7). Viewer 1784 / 1784; the Image spec conforms on the runtime. Not a known row (the node-spec face has no project Base URL).
