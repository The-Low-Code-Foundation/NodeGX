'use strict';

const { SchemaValidator, formatValidationErrors } = require('@nodegx/project-contract/format/validator');

class ValidationFailed extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationFailed';
    this.statusCode = 400;
  }
}

/** Structurally validates a component's three files against the official schemas before any write. */
function validateComponentFiles(files) {
  const v = SchemaValidator.instance;
  const checks = [
    ['component.json', v.validateComponent(files.component)],
    ['nodes.json', v.validateNodes(files.nodes)],
    ['connections.json', v.validateConnections(files.connections)]
  ];
  const problems = checks
    .filter(([, result]) => !result.valid)
    .map(([name, result]) => `${name}: ${formatValidationErrors(result.errors)}`);
  if (problems.length > 0) {
    throw new ValidationFailed(problems.join('\n'));
  }
}

module.exports = { validateComponentFiles, ValidationFailed };
