# Gate 1 — the brief, in the person's words

**Who asked:** Richard, 2026-10-12, in a conversation that began as "let's jam and brainstorm something new" for his AI
training and coaching offer and ended as this phase. **Route:** full lane, two apps (a learner-facing chat template on
the NodeGX npm packages, and a local studio that turns his screen recordings and coaching-session recordings into chat
threads). **Device:** the learner's phone first (PWA, installed), the laptop second; Richard's phone for the teacher
side. **Language:** English and French learners; the thread text in the learner's language, the clips dubbed on a
per-conversation switch.

## Who he is, verbatim

> I've been in professional training since 2009, 2009 to 2017 full time adult English training to businesses, then 2017
> to today doing part time tech training, especially AI training since beginning 2024. I'm qualified with a Cambridge
> DELTA to create training programmes. I run 'train the trainer' courses. I'm a pretty good trainer but my focus is on
> freeform, freestyle coaching, working from the learner's needs, empathy, getting them where they want to go as a
> half-life-coach half-trainer, as all good training should be if you ask me. I'm influenced by Kirpatrick and
> Brinkerhoff for tracking objectives and measuring impact and ROI, but I keep it loose.

> These days, when I train someone, most of the time it's a casual 'book me in for an hour next week please' type
> arrangement, where the learner sends me info about what they're trying to do by email or during the initial call, and
> every session we work on the most near-side need and look at what would be needed to go further as the theme for the
> next session, with imperatively assignments to complete outside the session (preferably the learner doing something
> that actually advances their project and avoiding purely theoretical work). Essentially the learner ends up doing the
> project by themselves and becoming autonomous, and I'm just there to shepherd them and get them unstuck when they need
> it, show them better ways to do things to make them faster, more efficient, more confident. By the end of the
> training, it's like the end of sessions with a therapist - if you feel like you don't need it anymore, I declare it
> done and successful.

## What was asked for, verbatim

> I want to reach out to someone and say "what are you trying to do at the moment and what's getting you stuck?" A lot
> of people I know who are vibe coding, for example, are making mistakes or not including things I know will be
> important as they go along. I can't sign them up to a whole training course to fix the problem, and it's hard to
> convince them to sign up to coaching. What might work is sending them a kind of 'quick fix' eLearning lesson to get
> them the explanation they might need, with the option to click a button to book a coaching session with me visible at
> all times. I'll just keep firing off free lessons to them until they finally give in and book and pay me.

> In the past I would have done a screen recording to explain how to do the things they need to do. That means the
> learner needs to sit and focus on a 10 - 15 min video, which is typically how long the explanations take. Nobody does
> it, or they have to really be committed to the training.

> "If Claude can hear the entire screencast and see what I'm doing, what could it do to use that knowledge to create an
> eLearning lesson like nobody has ever seen before". We're talking about something that's only possible with LLM
> intervention. A way for the learner to interact with the content of the lesson, without me having to build it, just by
> explaining in a video screen recording exactly what to do and what needs to be understood.

> So this won't be a SaaS that I'll open to other people, this will be just for me processing everything here locally
> and just pushing the learner facing stuff to the cloud.

**On who does the pedagogy (the turn that fixed the design):**

> So no more intake concept. I'll find the learners, I'll get their needs and I'll produce the pedagogic content. I think
> one of my big mistakes with Digital Bricks Training was trying to offload intake and programme development to Claude.
> I'm hoping with this video method I can be the pedagogic guide for Claude, and we don't do a programme, we do it
> session by session, only looking as far as the next session. Most people will want a fixed number per month for
> example, one a week, or maybe a package of 10 sessions but with no promises about what will come out of 10 sessions
> specifically. I need to take back the pedagogic control, even maybe by using the first part of the screencast as a
> 'Claude's eyes only' part where I explain what's going on with the learner, what I'm going to explain, why, what I
> think will happen, what the assignment will be, then say some safety phrase like 'Ok starting the screencast now
> pleas' and then after that is the bit of the video Claude is allowed to clip up for the learner. I need Claude more as
> my personal teaching assistant, and leave all the pedagogy to me please.

**On the first mockup (a page), the verdict that killed it:**

> Top: Blog post. I'm already bored […] Paste the version number and click done... huh? What will happen if I do that?
> Why does that help me? Then I keep scrolling and I see more videos and I think "I don't have time for this, I'll never
> finish, I'm overwhelmed already" which I know is nuts because there's very little content on the screen, but that's
> how I'm feeling. I hate eLearning. I'm having Vietnam flashbacks. i'm giving you the worst end of the spectrum to work
> with in terms of learner profiles to challenge you. If you can hook me, you win.

**On the second mockup (a chat thread), the yes:**

> This is fucking clever. It feels like a social media feed or a whatsapp chat or something. I can imagine being able
> to open the 'conversations' on the left side with Rick and reviewing old ones. Resetting them if I want to start from
> the beginning and advance message by message. That Rick can see the messages added by the learner wherever they want
> at any moment in the lesson is genius, it shows me their understanding as it unfolds in their own heads. The branching
> thing showing multiple possible snippets depending on what they're interested in is genius. The final 'type in what
> happened' is clever, and then the message should read 'That's it, Rick will check your message and reply to you here
> to tell you how you did and what's next'

> I can share a link to each conversation with my prospects, trying to coinvince them to book time. If they do book
> time, it should be clear in the 'conversations' menu when their next lesson is, and maybe keep the conversation
> 'highlighted' which they should complete before the session. eLearning + coaching concepts, but disguised as a chat
> platform. The learner can come back to old conversations and 'reopen' them with a mesasge asking me a follow up
> question weeks later. I can go into the conversations months later and say 'Have you still been applying this skill?
> It's super important. Let me know if you need a refresher' or even 'Hey, this Google model has just been updated, I'm
> adding a new video to update you on what's changed' and Claude cuts it up and presents it as new messages in the same
> old conversation. I can keep an eye on my mobile and respond to the conversations whenever I have time, even if just
> to say 'I've seen your message and I'll get back to you tonight' or give them a quick bit of advice if it's just a
> basic question. This happens already via email with ex learners of mine.

> I need a teacher interface where I can see all learners, drill into their conversations etc. Add new learners,
> generate links to share, OTP login only using their email, PWA from the start, super easy interface for learners, a
> bit more complex for me to take notes on people, assign them objectives only I can see, make notes inside each
> conversation that they can't see. Then we'll work from a separate repo on this machine in the parent folder, where I
> can add videos and have them processed by Claude and auto deleted after they've been published and validated so I
> don't suck up space on my machine.

> The ultimate would be: When I do coaching sessions, I always record them on Google Drive. If we could set up a system
> that could auto-download the recordings from Google Meet when they drop in the Google Drive after each session, cut
> them up and make a Fathom style 'important bits from your session' conversation style thing, so the learner can
> review the lesson the same way they're interacting with my eLearning screen recordings […] Nobody ever watches my
> replays or if they do they say it's a nightmare to skip through to the bits they want to see. Give them a choice at
> the start of the conversation 'do you want to see one bit in particular? Or just review the whole thing?' the first
> part shows them the theme titles they can select, then they see that part, can go back and see the other options and
> clcik them after, etc. The second part just shows them in chronologic order each part and asks them the validation
> question and then moves on. Let them skip each validation part easily, not a tiny 'move on' text like today, a real
> option. Make a distinction between the messages of mine that are Claude generated, and the ones I've written with my
> own hand. If I need to, I can add a video to an existing conversation and it gets processed as usual and turned into
> a continuation of the conversation.

> Bonus point: If I get a message from a learner and I'm busy, but it's easy enough to answer I just don't have time to
> type up a big answer, I can switch on 'Claude mode' and Opus 5.5 drafts an answer based on my dictation on the phone,
> or a draft text I write and explain what I need Claude to explain, with the option that I'll follow up later with a
> video or the Claude answer is maybe enough. Lots of flexibility, but using Claude automation when needed. But still
> always centred around my teacher brain, my pedagogy, my empathy for each learner. I'll add lots of info about the
> learner to each new user, to help Claude have the context it might need. Probably best just a free typed text, not a
> form, I'm very freestyle.

> Let the learner customise their interface, the font size and style (a few basic style choices), the colour, the
> overall style (fun, serious, wintery, halloween, I dunno use your imagination). The chat bar at the bottom shouldn't
> say 'Paste what it said', more a clear message that shows that what the user types here will become a message sent to
> Rick.

## The second brainstorm, his answers by number (2026-10-12)

| # | the idea put to him | his answer, verbatim |
|---|---|---|
| 1 | six kinds of message as the whole palette | *"Careful, you're skewing back towards the complex view from the Digital Bricks Training app, too much visual information = confusion. The same UI as every other chat app they use with some twists = happy users"* |
| 2 | voice both ways | *"Yep I agree, we'll use either Google transcription or Groq STT because it's fast and cheap (but I might be teaching French people so need to be careful it works multi lingual)"* |
| 3 | three marks on his messages (cut, typed, drafted) | *"Sure"* |
| 4 | the teacher view is an inbox | *"Sure"* |
| 5 | branches named while recording | *"I'll know if they're on Windows, don't need branches for that. People don't like choices in general, so save that for maybe more thematic choices, 'do you want to make a puppy or kitty cat app?' for example, inconsequential choices that just let the learner personalise. Otherwise my info provided to the app that Claude can access will give everything needed"* |
| 6 | a recap line when an old conversation reopens | *"Hmm not sure about this one. Maybe a summary block at the top like 'In this conversation you learner... you said... Rick said...' very brief just to refresh them, then they can scroll the conversation or reset (but if they reset they should be able to go back to the old version, so my replies aren't lost)"* |
| 7 | the session review in two modes, ending on "before next time" | *"The what to do before next time should link to a new conversation, so we keep them linked but separate"* |
| 8 | his prediction kept beside what happened | *"What I think will happen, and I'll type what actually happened, and the system will compare the two and give some advice on the next session to me, and how well the learner is progressing towards their goal or not and if a stop and check might be needed, then I decide how to action that in the next conversation"* |
| 9 | the check-in is his, the reminder is the system's | *"Sounds good, optional to turn on in case the conversation doesn't require follow up"* |
| 10 | forward to a colleague | *"Yeah why not, a blank copy that's not interactive, just all the Claude generated messages in a list"* |
| 11 | French text from an English screencast | *"Yep that would be a great option to switch on at the conversation level, dubbing or not. I don't like making videos in French. ACTUALLY, I don't like making videos in English. I'd like even my voice to be dubbed into... English. Basically replace my voice, it's boring and puts people to sleep. Be honest about this when they enter the app for the first time, little welcome popup that explains how the app works and what to expect in terms of AI content and teacher made content"* |
| 12 | one push notification: Rick replied | *"Yep in the PWA using native push"* |
| 13 | notes on a learner as one free-text field | *"Yep, as long as making those notes is VERY clearly separate from the learner reply bit, so I don't accidentally reveal to someone that I think they're a bit of a pain"* |
| 14 | delete-after-verify | *"Ok. We'll need some good storage here, probably a Hetzner S3 bucket."* |
| 15 | "off the record" and other spoken code words | *"Yep, code words should be like the keyboard shortcuts for my voice. Make a whole library of them. That's absolutely genius. All sorts of automated handy Claude things I can trigger for the conversation and video cuts."* |
| 16 | themes with a season | *"Yes please"* |

## The rulings (2026-10-12)

| # | question | ruling, verbatim |
|---|---|---|
| R1 | the name | **Learn with Simple Rick** |
| R2 | replace the DBT template on training.digitalbricks.io | *"Fuck yeah"* |
| R3 | learner context sent to Anthropic for Claude mode | *"We anonymise any data sent to Anthropic. Names are changed, no other personal details, so we can say anything we want about them. The learner's details are stored as variables and each text that goes out gets a find and replace treatment to sanitise any texts programmatically. If the odd detail slips through, it's life. We can state so in the privacy policy."* |
| R4 | where clips live | *"Yep same Hetzner box and I think we already had S3 storage for Digital Bricks Training, use that"* |
| R5 | sign-in | *"six digit code yes"* |
| R6 | the learners on training.digitalbricks.io today (s1) | *"Zero, we can delete it"*. Nothing to migrate and nobody to tell. The DBT deployment is deleted when SRK-013 puts this app on the name, not before, so the address never serves nothing. |
| R7 | where clips live (s1, refines R4) | *"You should have one for training.digitalbricks.io you can reuse, nothing in there"*. So no second bucket: the `training-digitalbricks` bucket, under a `clips/` prefix, each clip public-read. It is not empty, though: the nightly encrypted backup writes to `dbtraining/` in it, and that stays private. The backup's 156 h prune is scoped to `dbtraining/` (`offsite-backup.sh:156`), so it never deletes a clip. |

## Slots still owed

- The first real learner's own sentences, when gate 5 runs (PLAYTEST.md).
- Richard's welcome-popup wording, in his words, before SRK-004 ships it. **s1: he asked for a pitch** (*"pitch me
  something. Run it through the 'claude content authoring' repo"*). The pitch below passed the offline checks
  (`written`, `closer`, `contract`, `opener`, `figures`, `rollercoaster`) clean, awaiting his ruling:

  > **How this app works**
  >
  > I show you things by recording my screen. AI cuts each recording into short messages. You get them one at a time.
  >
  > A mark on each message says where it came from.
  > ✂ Made by AI from my video. · ✎ Typed by me. · ✦ Written by AI from what I told it, checked by me.
  >
  > Some videos have an AI voice saying my words.
  >
  > The box at the bottom sends me a message. I read it and reply.
  >
  > [ OK ]

  The reply bar: placeholder **"Message Rick"**, the WhatsApp pattern; an optional line under it, *"Rick reads your
  message and replies."* The mockup's *"Replies reach Rick the same day"* is out: it promises a time nobody confirmed.
