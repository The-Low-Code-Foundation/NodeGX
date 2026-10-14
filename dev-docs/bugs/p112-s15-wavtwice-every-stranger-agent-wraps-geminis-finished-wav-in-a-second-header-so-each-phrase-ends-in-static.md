---
id: P112-S15-WAVTWICE
title: "Both stranger agents that built the language app wrapped Gemini's finished WAV in a second WAV header, so every phrase ends in half a second of loud static — nothing in the kit shows how to play a cloud function's audio"
status: open
severity: medium
area: kit guidance / examples (no `get_example` plays audio a cloud function returns; no audio node or kit); the agents' own code (`PhraseRow` `play_audio`), not a NodeGX runtime defect
found: P112 OWN-015 s15, 2026-10-12 (2 of 2 rounds: s14's `bonjour`, s15's `french-phrases`)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §8 (s14, measured by ear and RMS) and §10 (s15, RMS)
---

`gemini-3.8-flash-tts` now returns a finished WAV file (`mimeType: audio/wav`; chunks `fmt ` 16, `data` 46,080,
`C2PA` 6,062). Older Gemini TTS returned raw PCM (`audio/L16;rate=24000`), and that's what both agents wrote for. Their
browser script reads the bytes as raw 16-bit PCM and puts a new 44-byte header around them. The inner header plays
as a click and the C2PA provenance bytes play as noise. Measured on s15's app, RMS per 50 ms at the end of "Bonjour":
`… 142 9 5 15066 17174`. The speech has ended, then the tail is louder than the speech. Richard heard it on s14's
app: *"a loud static noise for half a second."*

The app speaks, so AC1's "speaks with no repair" holds, but a viewer of the video hears the static. Two agents out
of two make this mistake from training data, so the kit has to show the right shape. It's not something the next
agent is likely to get right by luck.

**Proposed (smallest first):**
1. A catalog example, *play the audio a cloud function returns*: the function passes a `data:` URL through (or
   returns base64 plus its MIME type), and the page plays it as it is. It wraps raw PCM only when the MIME type says
   `audio/L16`.
2. A sentence in the Cloud Function / JavaScriptFunction guidance: "audio from an API is usually a finished file;
   play it as it is".
3. Larger: an audio-playback kit node (R18's note: *playback = a kit node the agent writes*).
