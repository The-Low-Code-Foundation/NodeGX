# The gram — its world, in plain words

This is what the app holds and who may do what, before any screen is drawn. The files in `world/` say the same thing in
a form the backend is made from: change the world there and the backend follows. This page is for reading.

## The things in it

| thing | what it is | named in a list by |
|---|---|---|
| **Member** | a person in the community. They sign up and wait until an admin lets them in. Their name, a short bio, a photo. | their name |
| **Post** | what a member shares: one or more photos and a caption. A post is one of four kinds: a post, a **prayer request**, a **testimony** or an **event** (an event has a date). A prayer request also carries **how many people prayed**, because only the person who asked may see who did. | its caption |
| **Comment** | a few words under a post. | its text |
| **Devotional** | the reading for one day: a title, the scripture it's on, the text. Old ones come from the blog's files; new ones are written in the app. | its title |
| **Note** | a member's own note, private to them. It can be on a Bible verse or on a devotional. | its text |
| **The community** | there is one: its name, its rules, and when each morning the day's devotional is released. | its name |

And three things that **happen** and are kept as a record: a member **hearts** a post, a member presses **I prayed**
on a prayer request, a member **reports** a post or a comment to the admins, saying why.

The Bible itself isn't stored here. It lives on each phone, so it can be read with no connection (TWO-010).

## Who can do what

- **An admin** lets members in, makes other members admins, hides posts and comments, blocks members, writes
  devotionals and changes the community's rules. The builder is the first admin.
- **A member who's been let in** sees the feed, every member's profile, posts, comments, hearts and prayers.
  They post, comment, heart, pray and report. They can take down their own posts and comments.
- **A member who's waiting** sees nothing but a "waiting to be let in" page.
- **Anyone, with no account**, can open a devotional from its link once its day has come, so it can be shared
  outside. Nothing else is public: no profile, no post, no comment.

## The rules

1. **No member, post or comment is deleted. It's hidden or blocked, and can be brought back.** A hidden post keeps its photos,
   comments, hearts and reports. Members stop seeing it; admins still see it, with the reason.
2. **A blocked member can't sign in.** Their posts and comments are hidden from members until an admin lets them
   back. Blocking always records why.
3. **A note is its writer's alone.** Admins can't read it either.
4. **A report is kept, and it is never shown to the member who was reported.** Only admins see who reported what.
5. **A heart or an "I prayed" can be taken back.** It is then removed, not kept.
6. **Who changed what is kept** for members (who let them in, who blocked them, who made them an admin), for
   devotionals (the leader's writing) and for the community's rules.
7. **A comment stays under the post it was written on, and with the member who wrote it.** Nothing moves.

## Children

A church community has young members. The rule (Richard, 2026-10-14):

- **Members are 13 or older.** Signing up asks people to confirm it; the admin who lets them in is the check.
- **Nothing a member posts is public.** Profiles and posts are seen only by members who've been let in.
- **The community rules say: no photo of a child without their parent's yes.** "A child shown without a parent's
  yes" is a report reason of its own, so admins see those first.

## Notes written offline

A note written with no connection is kept on the phone and saved to the member's account when the phone is back
online. **Proposed:** if the same note was changed on two phones before either was saved, **both versions are kept**,
the later one as the note and the earlier one beside it as a copy, so no words are lost. The member deletes the one
they don't want. (TWO-010 builds and tests it.)

## Not in this world yet

Following people, stories, direct messages, video, open sign-up. Those come later, if the builder asks for them.
