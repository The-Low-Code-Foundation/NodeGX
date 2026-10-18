// OWN-017 AC3 (s5 rebuild): s16's four edits re-made through the stranger's editor's own save endpoints.
const E = 'http://localhost:4871';
const j = async (p, body) => { const r = await fetch(E + p, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}); const t = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(t)); return t; };
// 1. WAVTWICE: a finished WAV plays as it is; only raw PCM is wrapped.
const row = await j('/api/component?key=' + encodeURIComponent('Components/PhraseRow'));
const play = row.nodes.find((n) => n.id === 'play_audio');
const field = (play.fields || play.parameters || []);
const old = Array.isArray(field) ? field.find((f) => f.name === 'functionScript')?.value : field.functionScript;
if (!old || !old.includes('const binary = atob(base64);')) throw new Error('script not as expected: ' + JSON.stringify(Object.keys(play)));
const guard = `const binary = atob(base64);
const isWav = binary.slice(0, 4) === "RIFF" || /wav/i.test(mimeType || "");
if (isWav) {
  const audio = new Audio("data:audio/wav;base64," + base64);
  audio.play().catch((e) => console.log("Playback failed:", e));
  return;
}`;
const script = old.replace('const binary = atob(base64);', guard);
console.log('script', (await j('/api/component/save', { key: 'Components/PhraseRow', nodeEdits: [{ id: 'play_audio', setFields: { functionScript: script } }] })).revision);
// 2. A phrase.
const { lessons } = await j('/api/lessons');
const m = lessons[0].phrases.find((p) => p.french === 'Merci'); m.french = 'Merci beaucoup'; m.english = 'Thank you very much';
console.log('lessons', (await j('/api/lessons/save', { lessons })).lessons[0].phrases.map((p) => p.french).join('|'));
// 3. The voice.
console.log('voice', (await j('/api/voice/save', { model: 'gemini-3.8-flash-tts', voiceName: 'Charon' })).voiceName);
// 4. Richard's s16 edit: a top border on Group Actions.
console.log('border', (await j('/api/component/save', { key: 'Pages/Lesson', nodeEdits: [{ id: 'actions_row', setFields: { borderTopStyle: 'solid' } }] })).revision);
