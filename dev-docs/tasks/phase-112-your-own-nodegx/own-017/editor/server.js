'use strict';

const path = require('path');
const express = require('express');

const { FormatRefusal } = require('@nodegx/project-contract/format');
const { EditRefusal } = require('@nodegx/project-contract/editor-suite');

const { PROJECT_DIR, openStore } = require('./lib/project');
const { listRegistry, buildComponentView, saveComponentEdits } = require('./lib/components');
const lessons = require('./lib/lessons');
const voice = require('./lib/voice');
const { colorTokenOptions } = require('./lib/catalog');
const { ValidationFailed } = require('./lib/validate');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Every handler below reads the project files fresh and writes back through the official
// store, so two requests never race on a stale in-memory copy.
function handle(fn) {
  return (req, res) => {
    try {
      const store = openStore();
      const result = fn(req, store);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };
}

function sendError(res, err) {
  if (err instanceof FormatRefusal) {
    const status = err.code === 'conflict' ? 409 : err.code === 'not-found' ? 404 : err.code === 'already-exists' ? 409 : 400;
    res.status(status).json({ error: err.message, reason: err.reason, details: err.details || null });
    return;
  }
  if (err instanceof EditRefusal) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ValidationFailed || err.statusCode) {
    res.status(err.statusCode || 400).json({ error: err.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal error: ' + err.message });
}

app.get('/api/project', handle((req, store) => {
  const project = store.readProjectFile();
  return { name: project?.name || null, projectDir: PROJECT_DIR };
}));

app.get('/api/registry', handle((req, store) => listRegistry(store)));

app.get('/api/component', handle((req, store) => {
  const key = req.query.key;
  if (!key || typeof key !== 'string') {
    const err = new Error('Query param "key" is required.');
    err.statusCode = 400;
    throw err;
  }
  return buildComponentView(store, key);
}));

app.post('/api/component/save', handle((req, store) => {
  const { key, nodeEdits, wireEdits } = req.body || {};
  if (!key || typeof key !== 'string') {
    const err = new Error('Body field "key" is required.');
    err.statusCode = 400;
    throw err;
  }
  return saveComponentEdits(store, key, { nodeEdits, wireEdits });
}));

app.get('/api/lessons', handle((req, store) => lessons.readLessons(store)));

app.post('/api/lessons/save', handle((req, store) => lessons.saveLessons(store, (req.body || {}).lessons)));

app.get('/api/voice', handle((req, store) => voice.readVoice(store)));

app.post('/api/voice/save', handle((req, store) => voice.saveVoice(store, req.body || {})));

app.get('/api/color-tokens', (req, res) => res.json(colorTokenOptions()));

const PORT = Number(process.env.PORT) || 4870;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`French Phrases editor running at http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Editing project at: ${PROJECT_DIR}`);
});
