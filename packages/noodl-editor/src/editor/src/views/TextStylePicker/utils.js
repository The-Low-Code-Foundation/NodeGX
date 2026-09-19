/**
 * P94 STY-005: this file used to hold its own walk over every component and every Look, asking
 * "does anything name this one style?". `StylesModel.usage` now answers the same question for every
 * style at once, because the Styles panel lists thirty rows and needs all thirty counts.
 *
 * 🔴 Both readings had to stay identical or the delete-confirm modals here and the usage column in
 * the panel would have disagreed about the same project, so there is now ONE implementation and
 * this delegates to it. `styleUsageIn` preserves the two properties the modals depend on: a node is
 * counted once however many of its ports name the style, and nodes and Looks are counted separately.
 */
const { ProjectModel } = require('../../models/projectmodel');
const { styleUsageIn } = require('../../models/StylesModel.usage');

function getStyleUsage(portType, styleName) {
  const usage = styleUsageIn(ProjectModel.instance, portType)[styleName];
  return usage ?? { nodeCount: 0, variantCount: 0 };
}

module.exports = {
  getStyleUsage
};
