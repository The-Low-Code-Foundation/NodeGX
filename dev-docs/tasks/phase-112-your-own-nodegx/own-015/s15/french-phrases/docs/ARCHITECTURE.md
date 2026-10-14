# Architecture

## Page map

- **Home** (`Pages/Home`) — Lists the 3 lessons with a completed/not-completed indicator for each; tapping one opens it.
- **Lesson** (`Pages/Lesson`) — Lists that lesson's phrases (French + English). Tapping a phrase calls the server-side TTS function and plays the returned audio. A 'Mark lesson complete' action saves Progress.

## Data model

### Lesson

A themed group of phrases to learn.

Fields:
- title
- order

Relationships:
- has many Phrases
- has one Progress

### Phrase

A single everyday French phrase with its English meaning, embedded under its Lesson.

Fields:
- french text
- english meaning

Relationships:
- belongs to a Lesson

### Progress

Whether a given lesson has been completed, so completion survives reloads.

Fields:
- lessonId
- completed

Relationships:
- belongs to a Lesson

## Backend contracts

Stores which lessons have been completed so progress survives between visits. Lesson/phrase content itself is static data in the app, not stored records.

## Decisions

Considered during scoping and deliberately not done:

- **Client-side or browser Web Speech API for the voice** — User specifically wants Google Gemini TTS (gemini-3.8-flash-tts), which requires a server-held API key.
- **Store lesson completion only in browser localStorage** — Progress should reliably survive across devices/reloads, so it's stored via the app's built-in NodeGX backend instead.

_Scoping record: `docs/decisions/000-initial-scope.md`._
