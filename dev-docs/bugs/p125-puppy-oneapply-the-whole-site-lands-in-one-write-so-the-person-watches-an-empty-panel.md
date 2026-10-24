---
id: P125-PUPPY-ONEAPPLY
title: In Claude Desktop the whole site lands in one write at the end, so the person watches an empty Studio for three minutes and cannot stop it between parts
status: fixed
commit: 58f973f95 + 4b3319c60
severity: high
area: mcp / instructions + plan tools (`create_plan` / `stage_plan_operation` / `apply_plan`), seen in Studio inside Claude Desktop
found: P125, Richard's puppy run in Claude Desktop (Sonnet 5.5), 2026-10-23 17:51–17:55 CEST
evidence: "~/vscode_projects/NodeGX test projects/Puppy Adoption Landing: every file's mtime. The project was created at 17:51:44, styles at 17:52:25, then NOTHING until 17:55:03, when Home and five sections (SiteNav, Hero, FeaturedPuppies, HowItWorks, CtaBand, SiteFooter) were written in the same second; PuppyCard 17:55:20, StepItem 17:55:22. ~/Library/Logs/Claude/mcp-server-nodegx.log: tools/call ids 21–31 between 15:53:16Z and 15:55:01Z wrote nothing to disk."
---

Richard: *"The Studio editor opened inside the chat as it worked, but it said 'nothing to see yet' … none of the
components appeared in the app until it was entirely finished. Our system was supposed to … show the site under
construction appearing piece by piece and let the user stop if they need to give feedback before the entire website
is done."*

What happened: the model followed the server's own instructions for "anything bigger than a two-node fix": a plan,
one operation per component, leaves first, the page last, and **one** `apply_plan` ("nothing touches disk until the
one apply"). Studio redraws on every file, so it had nothing to redraw until the apply. Two things stack:

1. **One apply.** Staged operations are invisible (CCN-003 is the task that would show them).
2. **Leaves first, page last.** Even with an apply per part, a section shows only once a page places it, and the page
   is written last. The order that makes the screen fill up is the page shell first (a `Page` node, nothing in it),
   then each section created *and placed* in one apply.

The hold could not help either: there was nothing on screen to react to before the last write.

Fix: CCN-005 (short bursts), with the order above. While a Studio panel is open (or the client renders MCP Apps),
the instructions and `create_plan`'s description say: write the page shell first; then one apply per section, each
placing its section on the page; and the server refuses a staged plan that grows past one section without an apply.
CCN-003 (staged operations drawn in Studio) is the other half.

Built: s11 (OpenNoodl 58f973f95) `create_plan` refuses more than 3 component operations while Studio runs; s12
`create_component` is refused when it would leave 3 components this server made that nothing places (CCN-005 s12).
Open until Richard's re-run in Desktop shows the page arriving section by section.

## Fixed — seen in Desktop 2026-10-24

Richard's re-run on the 00:12 dist ('NodeGX test projects/Puppy Rerun S12', folder birth times): the project at
08:46:52, then five bursts, each a section with any leaf it needs: 08:48:52 NavBar + Hero, 08:49:39 Puppies + PuppyCard,
08:50:12 HowItWorks + StepItem, 08:50:37 AdoptCta, 08:51:07 SiteFooter + FooterColumn (one fix to SiteFooter at
08:51:44). Richard: *"it built each bit of the site one by one in Studio"*. In s11 the same request wrote everything
in one second after three empty minutes. 46 tool calls, one panel.
