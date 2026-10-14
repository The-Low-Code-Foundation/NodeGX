# 000 — Initial scope

_Recorded 2026-10-12T12:51:21.764Z, from the scoping conversation held before this project was created._

## What was asked for

> I want a tiny Duolingo-style app for learning French: three short lessons, each a handful of everyday phrases with their English meaning, where I tap a phrase and hear it read aloud by Google's Gemini text-to-speech (model gemini-3.8-flash-tts), and it remembers which lessons I've finished. I'll add my Gemini API key myself afterwards under the name GEMINI_API_KEY; it must stay on the server, never in the browser. Please just build it without waiting for me to answer questions.

## What was decided

**The app.** A tiny Duolingo-style app with 3 short French lessons. Each lesson is a handful of everyday phrases paired with their English meaning; tapping a phrase plays it read aloud via server-side Gemini TTS. Lesson completion is remembered between visits.

**Who it is for.** The user (Richard), practicing basic everyday French phrases solo, casually, in short sessions.

**Pages.**

- Home — Lists the 3 lessons with a completed/not-completed indicator for each; tapping one opens it.
- Lesson — Lists that lesson's phrases (French + English). Tapping a phrase calls the server-side TTS function and plays the returned audio. A 'Mark lesson complete' action saves Progress.

**Records.**

- Lesson — A themed group of phrases to learn. — title, order — has many Phrases; has one Progress
- Phrase — A single everyday French phrase with its English meaning, embedded under its Lesson. — french text, english meaning — belongs to a Lesson
- Progress — Whether a given lesson has been completed, so completion survives reloads. — lessonId, completed — belongs to a Lesson

**Backend.** Stores which lessons have been completed so progress survives between visits. Lesson/phrase content itself is static data in the app, not stored records.

**Rules for this project.**

- Text-to-speech always runs in a server-side function; the Gemini API key (GEMINI_API_KEY) is read only on the server via set_function_secret and never sent to or referenced from browser code.
- Use model gemini-3.8-flash-tts for all speech generation.
- Lesson and phrase content is static/hardcoded in the app — no authoring UI for content in this version.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Client-side or browser Web Speech API for the voice** — rejected: User specifically wants Google Gemini TTS (gemini-3.8-flash-tts), which requires a server-held API key.
- **Store lesson completion only in browser localStorage** — rejected: Progress should reliably survive across devices/reloads, so it's stored via the app's built-in NodeGX backend instead.

## Deliberately out of scope

- User accounts or multi-user support
- A content-authoring UI for adding/editing lessons or phrases
- Languages other than French
- Offline caching of generated audio
- Spaced repetition / scoring / streaks beyond simple lesson-complete tracking

## Still open

Nothing was left open in the conversation.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **provision `App backend`** — Give this project a built-in backend that runs on this computer. Collections: Progress. The conversation said: Stores which lessons have been completed so progress survives between visits. Lesson/phrase content itself is static data in the app, not stored records.
2. **create `Pages/Lesson`** — Lists that lesson's phrases (French + English). Tapping a phrase calls the server-side TTS function and plays the returned audio. A 'Mark lesson complete' action saves Progress. Works with the Lesson and Phrase and Progress records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **update `Pages/Home`** — Lists the 3 lessons with a completed/not-completed indicator for each; tapping one opens it. Works with the Lesson record described in docs/ARCHITECTURE.md. Sibling pages in this app: Lesson. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "I want a tiny Duolingo-style app for learning French: three short lessons, each a handful of everyday phrases with their English meaning, where I tap a phrase and hear it read aloud by Google's Gemini text-to-speech (model gemini-3.8-flash-tts), and it remembers which lessons I've finished. I'll add my Gemini API key myself afterwards under the name GEMINI_API_KEY; it must stay on the server, never in the browser. Please just build it without waiting for me to answer questions.",
    "operations": [
      {
        "id": "op-1",
        "kind": "provision",
        "target": "App backend",
        "intent": "Give this project a built-in backend that runs on this computer. Collections: Progress. The conversation said: Stores which lessons have been completed so progress survives between visits. Lesson/phrase content itself is static data in the app, not stored records.",
        "provision": {
          "name": "App backend",
          "collections": [
            {
              "name": "Progress",
              "columns": [
                {
                  "name": "lessonId",
                  "type": "String"
                },
                {
                  "name": "completed",
                  "type": "Boolean"
                }
              ]
            }
          ],
          "needsAuth": false
        }
      },
      {
        "id": "op-3",
        "kind": "create",
        "target": "Pages/Lesson",
        "intent": "Lists that lesson's phrases (French + English). Tapping a phrase calls the server-side TTS function and plays the returned audio. A 'Mark lesson complete' action saves Progress. Works with the Lesson and Phrase and Progress records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-2",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "Lists the 3 lessons with a completed/not-completed indicator for each; tapping one opens it. Works with the Lesson record described in docs/ARCHITECTURE.md. Sibling pages in this app: Lesson. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
