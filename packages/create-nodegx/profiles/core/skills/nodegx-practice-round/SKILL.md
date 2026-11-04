---
name: nodegx-practice-round
description: "A practice round of about twenty minutes, offered and never required: you and the person build one small game, you stop at six moments to show them how to get the best out of you, and at the end you write a short sheet about how they like to work, saved where their next project finds it. LOAD when the person says yes to the practice round, or asks to practise, for a tutorial, or how to work well with you."
---

# The practice round

Most first builds that disappoint go wrong on the person's side of the chat. The usual causes are a vague first
message, "just do it" in answer to a question, and feedback like "it's not quite right". The person usually doesn't
know what to ask for. In this round they learn it on a small game, in about twenty minutes, before they start their
real project.

It's an offer. When they say no, build what they asked for and don't offer it again in this conversation.

## The offer

Make the offer in these words:

> Before your real project, would you like a practice round? We build a small game together in about twenty
> minutes. As we go, I show you how to get the best out of me. Twenty minutes and you'll go Super Saiyan level 2.
> Or just tell me what to build.

Offer it at most twice in a conversation. The first time is at the start, for someone new. The second is later, if
wording their requests is where they struggle. Never offer it to someone who's said no.

## How the round runs

The person picks the game. Offer two small ideas: a quiz about something they know well, or a game where they tap
the right answer before the clock runs out. Leave room for an idea of their own. Keep it to screens and taps, so it's
a NodeGX app that's quick to build.

At each of the six stops, tell them one thing they can use, in two or three sentences, then ask them to try it.
Don't lecture or test them. They can skip a stop, or end the round and start their real project at any point. Keep
the game small, because the stops are the point of the round.

### 1. The first message

Ask them to write the request for the game themselves, as if you'd never met. Before you build anything, tell them
what you'd have to guess from it. A good first message says who the app is for and what they do with it. It can
also say what the first screen should make them feel and what the app won't do. A vague message is fine to start
with, because you ask questions about it. A clearer one saves a round of questions.

### 2. Answering your questions

Ask the questions from `nodegx-first-project` in one message. After each one, say in a few words what changes
depending on the answer. Tell them that "you decide" is a fine answer to a question they don't care about. If they
say "just do it" to all of them, you'll guess every answer. They'll see your guesses on the first screen. When a
question loses them, they can send this:

> I didn't follow that question. Ask it again in plain words, and tell me what changes depending on my answer.

### 3. Looking, then giving feedback in rounds

Build the first version and tell them how to open it. Ask them to play it and write one list of what they saw and
what they wanted instead. Show them a note you can't act on beside one you can:

- "It's not quite right."
- "The score is too small to read on my phone. The timer starts before I've read the question."

Build the whole list in one pass. Then list the small choices you made alone, one line each, so they can overturn any
of them.

### 4. Pushing it further

Ask what they'd add next, and build one thing from their answer. Then offer them a part they can change themselves,
such as the list of quiz questions or the time limit. Show them where it lives in the app, and change it once
together. In NodeGX the pages, settings and data stay open to them after you've finished.

### 5. What happens when an app goes online

Tell them in plain words what going online means. While they build, the app runs only on their computer. To let
other people use it, a copy has to run on a computer that's on the internet. There are two common ways to do that:

- **A rented server** is a computer in a data centre that's on all the time. It costs about $4–7 a month and keeps
  charging until they delete it. It can store the app's data and accounts. Someone has to keep it up to date, which
  can be them with your help.
- **Cloudflare Workers** means they don't have a computer of their own online. The app's pages and small functions
  are copied to Cloudflare, which runs a function only when a visitor's request arrives. A free Cloudflare account
  is never billed: past the free limit, requests are refused rather than charged. NodeGX apps on Workers are still
  being tested. Storing data there doesn't work yet.

Today, an app that only shows pages can go on a free host. An app that saves data goes on a rented server.
`npx nodegx-deploy` writes the folder to upload. The guide for the whole step is
https://learn.nodegx.io/online/putting-it-online. Don't put the practice game online unless they ask.

### 6. Asking about security

Never tell them an app has no holes, and never call it secure. Teach them the questions that make you show evidence.
Have them send this, about the practice game:

> Before anyone else uses this app, check it with me. Where is each kind of data stored? Who can read it? What
> happens if someone opens the backend's address directly, without signing in? Show me how you checked each answer.

Answer it for the game, saying how you checked each answer. Then show them what a real answer looks like next to a
vague one:

- Real: "The best score is saved in this browser on your phone. Nobody else can read it. There's no backend, so
  there's no address to open."
- Vague: "Everything is stored safely."

Tell them to send the same message about their real app before real people use it. Its answers will be longer.

## The sheet: "my way of building"

At the end, write a short sheet with them about how they like to work. It's about them, not about NodeGX. What
NodeGX needs is in the kit's own guides. Those get better with each release.

Ask a few questions in one message. What do they care about most in an app? How do they like questions asked? What
does "done" mean to them? How do they like to give feedback? What do they want checked before anything goes live?
Add what you saw during the round, and mark those lines as your own observations.

Write it as a skill, so their next project finds it:

```markdown
---
name: my-way-of-building
description: "How this person likes to build with an AI: what they care about, how they like questions, what done means to them, and their checks before going live. LOAD at the start of any new app or game with them."
---

# My way of building

## What I care about
## How I like to be asked questions
## What "done" means to me
## How I give feedback
## Before anything goes live
```

Show them the whole sheet. Save it only after they say yes, and change anything they ask first. Save it in their
own skills folder, not in this project:

- **Claude Code** reads `~/.claude/skills/my-way-of-building/SKILL.md`.
- **Cline** and **Mistral Vibe** both read `~/.agents/skills/my-way-of-building/SKILL.md`.

If they use more than one of these, offer to save it in both places. If a sheet is there already, show what would
change and ask before you replace it. If you can't write outside this folder, save it as
`docs/my-way-of-building/SKILL.md` and give them the one command that copies it into their skills folder.

Then tell them in one line that their next project will read it, and that it's a text file they can change any time.

## When they're stuck

Point them to https://nodegx.io/help. It lists free guides by problem, each one page long, and two messages to copy.
Name the guide that fits their problem. If you can fetch web pages, read the page first to pick it.
