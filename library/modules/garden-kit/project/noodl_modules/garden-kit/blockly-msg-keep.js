/* garden-kit — keeps Blockly's French messages. The manifest loads blockly-msg-fr.js, then this file, then
   blockly-msg-en.js (both write into the same Blockly.Msg, so the second would overwrite the first). The Blocks node
   switches between the two with Blockly.setLocale. Written for this kit (GPL-3.0, like index.js); not Blockly's. */
(function (root) {
  if (root && root.Blockly && root.Blockly.Msg) root.Blockly.gardenMsgFr = Object.assign({}, root.Blockly.Msg);
})(typeof window !== 'undefined' ? window : this);
