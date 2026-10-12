'use strict';

/**
 * The lessons/phrases content lives as one JSON blob inside a Static Data node's `json`
 * parameter (shared by the Home and Lesson pages), not as separate nodes per phrase. This
 * module finds that node by shape rather than by a hardcoded path, reads it into a plain
 * array the editor's table can bind to, and writes it back through `set_parameter`.
 */
const { applyEdit } = require('@nodegx/project-contract/editor-suite');
const { validateComponentFiles } = require('./validate');

function looksLikeLessons(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (lesson) =>
        lesson &&
        typeof lesson === 'object' &&
        typeof lesson.title === 'string' &&
        Array.isArray(lesson.phrases) &&
        lesson.phrases.every(
          (phrase) => phrase && typeof phrase === 'object' && typeof phrase.french === 'string' && typeof phrase.english === 'string'
        )
    )
  );
}

function findLessonsNode(store) {
  const registry = store.readRegistry();
  for (const [key, entry] of Object.entries(registry.components)) {
    const files = store.filesOf(key, entry);
    for (const node of files.nodes.nodes) {
      if (node.type !== 'Static Data') continue;
      const raw = node.parameters && node.parameters.json;
      if (typeof raw !== 'string') continue;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (looksLikeLessons(parsed)) {
        return { key, nodeId: node.id, lessons: parsed };
      }
    }
  }
  return null;
}

function notFound() {
  const err = new Error(
    'No lessons data node found in this project (expected a Static Data node whose JSON is an array of {title, phrases:[{french, english}]}).'
  );
  err.statusCode = 404;
  return err;
}

function badPayload() {
  const err = new Error('Lessons must be a non-empty array of {id?, title, phrases:[{french, english}]}.');
  err.statusCode = 400;
  return err;
}

function readLessons(store) {
  const found = findLessonsNode(store);
  if (!found) throw notFound();
  return found;
}

function saveLessons(store, lessons) {
  if (!looksLikeLessons(lessons)) throw badPayload();
  const found = findLessonsNode(store);
  if (!found) throw notFound();

  const stored = store.readComponent(found.key);
  const { files } = applyEdit(stored.files, {
    edit: 'set_parameter',
    component: found.key,
    id: found.nodeId,
    name: 'json',
    value: JSON.stringify(lessons)
  });
  validateComponentFiles(files);
  store.writeComponent(found.key, files);
  return { key: found.key, nodeId: found.nodeId, lessons };
}

module.exports = { readLessons, saveLessons };
