'use strict';
const { makeAdapter } = require('./engine');
const counter = require('./nodes/counter');
const sw = require('./nodes/switch');
const and = require('./nodes/and');
const condition = require('./nodes/condition');
const stringFormat = require('./nodes/string-format');

const REGISTRY = {};
for (const def of [counter, sw, and, condition, stringFormat]) REGISTRY[def.type] = def;

/** A FRESH target per call: its own instance table, nothing shared. */
function strangerTarget() {
  return makeAdapter(REGISTRY);
}

module.exports = { strangerTarget };
