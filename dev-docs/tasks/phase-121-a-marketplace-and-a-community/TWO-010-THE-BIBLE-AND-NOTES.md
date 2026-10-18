# TWO-010 — The Bible and notes, offline

**Opened 2026-10-14** from the builder's answer asking for an offline Bible and a notes section. **Depends on TWO-005 slice 1, P119 SRK-005 (the PWA), R9.** **Status: 📋 not started.** Kind: build.
**Model:** Fable for the offline and sync design (what lives on the phone, how notes written offline reach the account
without being lost); Opus to build it.

## 1. The person sentence

> **A member with no data left opens the community app, reads Psalm 23, writes a note under verse 4, and the next time their
> phone is online the note is saved to their account, where it's still there on a new phone.**

## 2. What exists

- **Nothing offline in the repo yet.** P119 SRK-005 is building the manifest, service worker and install prompt for its
  own template; P110 (the app in your pocket) has 0 of 14 built.
- R9, answered 2026-10-14: **the King James Bible** (public domain outside the UK; Crown copyright in the UK). Take
  the text from a public-domain source and record it here.
- Backend records and policy for private notes (TWO-001's world).

## 3. What to do

1. **The text:** the chosen translation as structured data (book, chapter, verse), its size measured, compressed for
   the phone. Source and licence written in this file.
2. **On the phone:** stored once after install (IndexedDB or the cache), with a progress bar; books, chapters, a verse
   view; search over the text, offline.
3. **Notes:** a member's private notes (text, optionally a verse or a devotional), written offline into storage on the
   phone, queued, and sent to the account when online; conflicts (the same note edited on two phones) resolved by a
   rule written in TWO-001's world and tested.
4. **Shared storage:** the devotionals' offline copy (TWO-006) uses the same mechanism.
5. **If SRK-005 is late:** build the minimum service worker here and hand it to P119, not a second copy.

## 4. Acceptance criteria

1. The Bible's size on the phone written down; it installs over a slow connection (throttled to 3G in Chrome) with
   progress shown.
2. In airplane mode: open a book, a chapter, search a word, all within a second on a mid-range phone (or the Surface).
3. A note written offline appears in the account after reconnecting; the same note edited on two devices follows the
   written rule (tested both ways).
4. No member can read another member's notes (the policy, tested by trying).

## 5. Not this task

Several translations. Audio Bibles. Sharing notes with others. Reading plans.
