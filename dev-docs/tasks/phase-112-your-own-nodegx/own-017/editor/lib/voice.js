'use strict';

/**
 * The TTS model and voice name are two literals inside the Speak Phrase cloud function's
 * JavaScript, not separate node parameters. This finds that script by shape, exposes the two
 * values as a plain form, and rewrites just those two literals back into the script on save —
 * the rest of the script (including the GEMINI_API_KEY handling) is left untouched.
 */
const { applyEdit } = require('@nodegx/project-contract/editor-suite');
const { validateComponentFiles } = require('./validate');

const MODEL_RE = /(const\s+model\s*=\s*")([^"]*)(")/;
const VOICE_RE = /(voiceName\s*:\s*")([^"]*)(")/;

// Gemini's documented prebuilt TTS voice names, offered as suggestions (not a closed list).
const SUGGESTED_VOICES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
];

function findVoiceNode(store) {
  const registry = store.readRegistry();
  for (const [key, entry] of Object.entries(registry.components)) {
    const files = store.filesOf(key, entry);
    for (const node of files.nodes.nodes) {
      if (node.type !== 'JavaScriptFunction') continue;
      const script = node.parameters && node.parameters.functionScript;
      if (typeof script !== 'string') continue;
      const modelMatch = MODEL_RE.exec(script);
      const voiceMatch = VOICE_RE.exec(script);
      if (modelMatch && voiceMatch) {
        return { key, nodeId: node.id, model: modelMatch[2], voiceName: voiceMatch[2] };
      }
    }
  }
  return null;
}

function notFound() {
  const err = new Error(
    'No text-to-speech script node found (expected a JavaScriptFunction whose script sets `model` and a Gemini `voiceName`).'
  );
  err.statusCode = 404;
  return err;
}

function badInput(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function readVoice(store) {
  const found = findVoiceNode(store);
  if (!found) throw notFound();
  return { ...found, suggestedVoices: SUGGESTED_VOICES };
}

function saveVoice(store, { model, voiceName }) {
  if (typeof model !== 'string' || model.trim() === '' || /["\n]/.test(model)) {
    throw badInput('Model must be a non-empty single-line string with no quotes.');
  }
  if (typeof voiceName !== 'string' || voiceName.trim() === '' || /["\n]/.test(voiceName)) {
    throw badInput('Voice must be a non-empty single-line string with no quotes.');
  }

  const found = findVoiceNode(store);
  if (!found) throw notFound();

  const stored = store.readComponent(found.key);
  const node = stored.files.nodes.nodes.find((n) => n.id === found.nodeId);
  const script = node.parameters.functionScript;
  const updated = script.replace(MODEL_RE, `$1${model}$3`).replace(VOICE_RE, `$1${voiceName}$3`);

  const { files } = applyEdit(stored.files, {
    edit: 'set_parameter',
    component: found.key,
    id: found.nodeId,
    name: 'functionScript',
    value: updated
  });
  validateComponentFiles(files);
  store.writeComponent(found.key, files);
  return { key: found.key, nodeId: found.nodeId, model, voiceName, suggestedVoices: SUGGESTED_VOICES };
}

module.exports = { readVoice, saveVoice };
