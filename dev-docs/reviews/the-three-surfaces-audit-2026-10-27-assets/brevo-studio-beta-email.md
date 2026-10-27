# Brevo email: NodeGX Studio Beta, and the editor out of alpha

Draft 2, 2026-10-27, rebuilt on Richard's note (the P.S. of the same day): Claude builds the whole app; what NodeGX
solves is being sidelined while it does, and being dependent afterwards. For the nodegx.io mailing list (Bubble
builders, people who have never built an app, people who already build with an AI coder). To send on the day the Beta
is cut (audit §8, B13). Every **[confirm]** is a fact this draft could not check; it comes out or gets confirmed before
sending. Two subject lines and two openings; pick, don't let me.

## Subject

- A. Claude builds your app. NodeGX Studio makes sure it's still yours.
- B. NodeGX Studio Beta: the editor Claude builds in, and you keep.

## Preheader

Build a full app in a Claude chat, have a say while it's built, and keep an editor for it on your own computer.

## Body

**Opening, version 1**

Last week I built a dog shelter's website in a Claude chat. Visitors browse the dogs and book a thirty-minute visit.
Staff confirm or decline. It has accounts, a database and privacy rules. Claude built all of it. The difference from
any other AI build is what I could do while it worked and what I kept at the end.

**Opening, version 2**

Claude can already build you a whole app. The part that goes wrong is everything around that. During the build you
either answer questions you don't understand or get left out of the decisions. Afterwards you get a folder of code you
can't change, so every small edit means going back to the AI. NodeGX Studio is built to fix both. It's in Beta today.

**While Claude builds**

Someone who runs a dog shelter doesn't need to know what a backend is. Nor should they have to answer questions about
padding and shadows. So Claude makes those calls and carries on. When a decision is really yours, it shows you the one
part in the message, a button, a hero, a card, with its settings, and you press Approve or say no. Studio itself opens
inside the conversation. You watch the pages arrive. If you don't like where it's going, press Hold. Claude stops at its
next change and asks what you saw.

**When it's finished**

Claude hands you the project. It's a folder of files on your computer. The install put NodeGX Studio on the same computer.
Studio is an open-source no-code editor. Change a headline, the site's font, a button colour or a translation
yourself. Nobody can take it away or charge you for it. If you never open Claude again, your editor still works.

**When you want more**

Come back any time. Ask Claude for a contact form, or for a members' area with payments. The project files are a
blueprint Claude reads cleanly. The build is documented as it goes. So Claude picks up where it left off, however big
the app has grown.

**How deep you go is up to you**

The part in the message is for a decision. Studio is for the day-to-day: pages, elements, workflows, data and who can
see what. The NodeGX editor, a free download, opens the same folder and lets you change every node and wire. If Studio is more
than you want, ask Claude for an editor that matches how you think about your app.

NodeGX works inside the AI coder you already use. Claude Desktop is the first that shows Studio inside the chat, and
Claude Code and Cline open it in a browser window beside the chat.

**Putting it online**

From the chat, Claude ships the app and its database to a Linux server you rent, over SSH **[confirm: say "sign up to
a provider, paste a key" only when lane 5 lands it]**. The NodeGX editor leaves alpha with this release
**[confirm: the version number and the day]**. What changed is at nodegx.io/changelog.

**Start**

nodegx.io/start has the install, a first message to copy and the editor download. The dog shelter build is on
YouTube at **[confirm: the link]**.

Richard

## Before you show anyone (rule checks)

- Nouns that promise something: "a whole app" (shown once: the dog shelter in opening 1; opening 2 relies on the
  reader's own idea); "a decision that is really yours" (what it is: a button, a hero, a card, said in the same
  sentence); "members' area with payments" (an illustration, no figures).
- Least sure a stranger follows: "Nothing in the app is hidden from you at that level" (which level: the last one named,
  the editor).
- Facts assumed, not confirmed: the three **[confirm]** marks. "Studio is on your computer with it" is true of the
  one-file install (the `.mcpb` bundles Studio, CCN-006) and of the npm route once `@nodegx/studio` is published; say it
  only after B9/B13. "The build is documented as it goes" is the seed (BRIEF, decisions, CONVENTIONS), true today.
  "Claude makes those calls and carries on" is true today; "shows you the one part" is the mini editor, true today;
  "when a decision is really yours" as the rule for *which* questions become mini editors is B6, not yet measured.
- Not claimed on purpose: option sets (B1), the chip card (B3), Preview (B4), "nothing closed off" at the Studio rung,
  the quality comparison from the video, any year or version of Studio a reader might still be running later.
- Richard's own words kept out of the body because a stranger has no context for them: "the new WordPress admin
  panel" (a stranger coming from Bubble or from nothing may not know what that panel is; worth testing as a line for
  the Bubble segment), "CI/CD", "DNS", "the agency's GitHub repo".
