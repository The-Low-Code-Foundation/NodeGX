# Gate 3 — a picture the person said yes to, before any structure

**status: approved by Richard on the second mockup (2026-10-12).** Gate 3 closes again on the first real learner's
words at gate 5; until then this is the picture the build is held to.

**the picture:** `look/learner-thread.html`, a copy of the artifact *Seven This Morning*
(`https://claude.ai/artifact/GZFCdPyuABvWFhdMHwUxN7`, version 1). A message thread from Rick on the example "the
Scheduled tasks button on the Projects page of the Claude app, which Richard had never pressed". The first mockup, a
page with the clips laid out as steps (`https://claude.ai/artifact/Q6YUcigJDGRP3Rdmn1jpUM`), is kept only as the
thing that failed.

| who | what they said, verbatim | date | yes? |
|---|---|---|---|
| Richard, on the page | *"Top: Blog post. I'm already bored […] Paste the version number and click done... huh? What will happen if I do that? Why does that help me? Then I keep scrolling and I see more videos and I think 'I don't have time for this, I'll never finish, I'm overwhelmed already'"* | 2026-10-12 | no |
| Richard, on the thread | *"This is fucking clever. It feels like a social media feed or a whatsapp chat or something."* | 2026-10-12 | **yes** |
| Richard, on the second brainstorm | *"The same UI as every other chat app they use with some twists = happy users"* | 2026-10-12 | the rule for everything after |
| the first real learner | — | — | — |

## What the picture holds (the build is graded against these)

1. **It is a chat.** One column, bubbles, a reply bar at the bottom, a conversations list to the left (a drawer on a
   phone). Nothing that a WhatsApp user would have to learn. Every twist below is a twist on that, never a new surface.
2. **One message at a time.** The thread opens on Rick's first message and one clip. The next message does not exist
   until the learner has watched, chosen, or pressed. The learner never sees how long a conversation is.
3. **The first clip is the hook, so its thumbnail is the payoff**, never an "introduction". In the mockup: a phone
   lock screen at 06:58 with "Your Monday brief is ready". Two lines of text above it, the first about the learner.
4. **Almost no text.** Each of Rick's bubbles is one or two short sentences in his voice. The copy passes the sister
   repo's content-authoring skill and its offline `written.py` check (the mockup's did, one flag, fixed).
5. **The only input is a tap** until the one paste, which has a Copy button beside it. Nothing is asked for without
   the reason said in the same bubble ("I'll show you mine, then give you the words to paste").
6. **Choices are inconsequential and personal** ("puppy or kitten"), never branches by platform or level. Richard's
   notes on the learner tell the studio what they need; the learner is never asked to classify themselves.
7. **The capture is the payoff.** The lesson ends on "tomorrow at seven something arrives, come back and tell me which
   one happened", two real buttons, and the closing line in Richard's words: *"That's it, Rick will check your message
   and reply to you here to tell you how you did and what's next."*
8. **The reply bar says what it is.** Not "Paste what it said". A clear line that what you type here is a message sent
   to Rick (wording owed by Richard, BRIEF.md slots).
9. **Skip is a real button**, on every validation question, never a small text link.
10. **Three marks on Rick's messages:** cut from a video, typed by Rick, drafted with Claude from Rick's dictation.
    Quiet, consistent, always present.
11. **An old conversation opens on a brief summary block** ("In this conversation you learned… you said… Rick said…"),
    then the thread, with Reset. A reset keeps the old run reachable so Rick's replies are never lost.
12. **The welcome popup on first open is honest**: how the app works, which messages are cut from Rick's recordings by
    AI, which are his own, and that his voice may be replaced by a synthetic one (R11).
13. **Themes.** Font size, three type choices, a colour, and a few whole looks (fun, serious, winter, Halloween). A
    preference that follows the learner between devices.

## What the teacher side holds (no mockup yet; a sketch owed before SRK-006 builds)

- An inbox, sorted by who is waiting on Rick, with unread counts. Quick replies ("Seen it, back tonight").
- A learner page: one free-text notes field, objectives only Rick sees, sessions with the prediction and what happened.
- The conversation, as the learner sees it, with Rick's private notes in a surface that **cannot be mistaken for the
  reply bar** (his words, brainstorm #13). Claude mode on the reply: dictate or type a draft, Opus 5.5 writes the
  message, Rick edits, the message carries the "drafted" mark.
- Add a learner (email plus free text), generate a share link, see the next session date on the conversation that
  should be done before it.

## §built — the build held to the picture

⬜ filled in at gate 4: screenshots of the NodeGX build beside `look/learner-thread.html` on the same screens, phone
width and laptop width, light and dark, every item 1–13 ticked or named as not held.
