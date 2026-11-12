---
id: P112-OWN026-BLANKFIRSTSCREEN
title: "No render check notices a first screen with nothing on it: Watering Can signed in opens on a screen-tall blank, every page's content one viewport down, and render_report / drive_page stayed quiet"
status: open
severity: medium
area: nodegx-render-measure (RenderFinding codes; drive_page's look)
kit: observe
found: P112 OWN-026 §7, 2026-11-02 (MISTRAL-PLAN §8) and Richard, 2026-11-03 ("a large space above the main elements, about the same height as the group containing all the elements")
evidence: ~/wc/watering-can/components/App/nodes.json — `gate` Group height 100vh, visible:true; only its child `gate_inner` is hidden (`Expression isFalse → gate_inner.visible`); render-measure's codes (index.js :932–1034) have none for an empty first viewport
---

**The app's defect (Mistral's):** App holds the sign-in gate above the router. The gate is a Group of fixed height
`100vh` that is always shown; signed in, only its inner group is hidden, and with `visible`, not `mounted`, so its space
stays. Home, New plant and Plant each start one screen down (y≈1,115 at 1920×1080). The kit's port text already says
Mounted removes an element and Visible "leaves its space behind"; the agent read the page's text, which is there below the fold.

**The kit's gap:** `content-not-visible` / `clipped-page` fire only when content cannot be scrolled to. A page whose
whole first viewport holds no text, image or control while content sits below it is reported clean, and the screenshot
the model is shown is a plain background. A check such as `blank-first-screen` (nothing visible in the first viewport,
content below; name what fills the space, here the 100vh gate) would have named it at build time.
