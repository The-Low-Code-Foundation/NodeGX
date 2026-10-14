'use strict';

/**
 * A lookup from a node's `type` string (as it appears in nodes.json) to what
 * @nodegx/node-spec knows about that node: its input/output ports, their value
 * types (color, string, boolean, number, signal, enum), display names and
 * descriptions. Drives the editor's generic parameter form so field labels and
 * widget choices come from the official catalog instead of being hand-guessed.
 */
const nodeSpec = require('@nodegx/node-spec');
const { DEFAULT_TOKENS } = require('@nodegx/project-contract/tokens');
const { decodeColour } = require('@nodegx/project-contract/token-codecs');

const BY_TYPE = new Map();
for (const key of Object.keys(nodeSpec)) {
  const value = nodeSpec[key];
  if (value && typeof value === 'object' && typeof value.type === 'string' && (value.inputs || value.outputs)) {
    BY_TYPE.set(value.type, value);
  }
}

function specFor(nodeType) {
  return BY_TYPE.get(nodeType);
}

/** Field names whose string value is code or another multi-line format, not a one-line label. */
const MULTILINE_FIELDS = new Set(['functionScript', 'expression', 'json', 'csv', 'styleCss', 'headCode']);

function kindOf(fieldName, inputDef, rawValue) {
  if (inputDef) {
    switch (inputDef.type) {
      case 'color':
        return 'color';
      case 'boolean':
        return 'boolean';
      case 'number':
        return 'number';
      case 'enum':
        return 'enum';
      case 'signal':
        return 'signal';
      case 'string':
      default:
        return MULTILINE_FIELDS.has(fieldName) || (typeof rawValue === 'string' && /\n/.test(rawValue)) ? 'text' : 'string';
    }
  }
  // No catalog entry (editor-only scaffolding nodes like Page, PageInputs, Component Inputs/Outputs,
  // the cloud request/response/secret nodes): infer from the value actually stored.
  if (typeof rawValue === 'boolean') return 'boolean';
  if (typeof rawValue === 'number') return 'number';
  if (typeof rawValue === 'string') {
    return MULTILINE_FIELDS.has(fieldName) || /\n/.test(rawValue) ? 'text' : 'string';
  }
  if (rawValue && typeof rawValue === 'object') return 'json';
  return 'string';
}

/** The official default colour tokens, for the colour field's suggestion list. */
function colorTokenOptions() {
  return DEFAULT_TOKENS.filter((t) => t.category === 'color-semantic' || t.category === 'color-palette').map(
    (t) => ({ name: t.name, value: t.value, description: t.description })
  );
}

/** Soft validation only: null means the text is not colour-shaped at all (typo, stray word, …). */
function looksLikeColour(value) {
  if (typeof value !== 'string' || value.trim() === '') return true;
  return decodeColour(value) !== null;
}

module.exports = { specFor, kindOf, colorTokenOptions, looksLikeColour, MULTILINE_FIELDS };
