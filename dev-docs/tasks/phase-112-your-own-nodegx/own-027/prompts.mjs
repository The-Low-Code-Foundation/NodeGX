// OWN-027 — every prompt the harness sends, in one place. `node harness.mjs --questions` writes questions.md from
// this file, so the document and the run cannot drift apart. Each template is a function of the brief card (and the
// stage's own inputs); none sees another call's output except through the card and the ledger (§3 rule 3).

export const SYSTEM =
  'You answer one question about building a web page. Reply with JSON only, matching the schema. Be brief.';

// The card, rendered the same way into every call after stage 0 (§3 rule 3: verbatim).
export const cardText = (card) =>
  `BRIEF CARD: ${JSON.stringify(card)}`;

export const REQUEST = 'Make me a puppy adoption landing page please, blue colour theme, modern style.';

// ─── Stage 0 — the brief card ─────────────────────────────────────────────────────────────────────────────────────
export const stage0 = {
  kindTone: (req) => ({
    user: `Request: "${req}"\nWhat kind of thing is this (landing page, internal tool, game, other), and what tone should it have (modern, playful, classic, minimal, bold)?`,
    schema: { type: 'object', required: ['kind', 'tone'], properties: {
      kind: { type: 'string', enum: ['landing page', 'internal tool', 'game', 'other'] },
      tone: { type: 'string', enum: ['modern', 'playful', 'classic', 'minimal', 'bold'] } } }
  }),
  audience: (req) => ({
    user: `Request: "${req}"\nWho is the page for (one line, max 20 words)? What is the ONE action the page wants a visitor to take (max 20 words)? What is the site or organisation called (max 4 words; invent a short name if none is given)?`,
    schema: { type: 'object', required: ['action', 'audience', 'name'], properties: {
      action: { type: 'string', maxLength: 140 }, audience: { type: 'string', maxLength: 140 }, name: { type: 'string', maxLength: 40 } } }
  }),
  palette: (req, presets) => ({
    user: `Request: "${req}"\nPick the style preset and the primary colour (blue, green, warm, neutral, purple).\nPresets:\n${presets.map((p) => `- ${p.id}: ${p.description}`).join('\n')}`,
    schema: { type: 'object', required: ['hue', 'preset'], properties: {
      hue: { type: 'string', enum: ['blue', 'green', 'warm', 'neutral', 'purple'] },
      preset: { type: 'string', enum: presets.map((p) => p.id) } } }
  }),
  typeDensity: (req, pairings) => ({
    user: `Request: "${req}"\nPick the type pairing (headings / body), the density and the corner radius.\nPairings:\n${pairings.map((p) => `- ${p.id}: ${p.label}`).join('\n')}`,
    schema: { type: 'object', required: ['density', 'pairing', 'radius'], properties: {
      density: { type: 'string', enum: ['airy', 'regular', 'compact'] },
      pairing: { type: 'string', enum: pairings.map((p) => p.id) },
      radius: { type: 'string', enum: ['sharp', 'soft', 'round'] } } }
  }),
  photo: (req, files) => ({
    user: `Request: "${req}"\nThe page will use ONE stock photograph wherever it shows a picture. Which file fits the request best?\nFiles: ${files.join(', ')}`,
    schema: { type: 'object', required: ['photo'], properties: { photo: { type: 'string', enum: files } } }
  })
};

// ─── Stage 1 — the parts ──────────────────────────────────────────────────────────────────────────────────────────
export const SECTION_KINDS = ['hero', 'feature cards', 'how it works', 'gallery', 'testimonials', 'pricing', 'faq', 'call to action', 'footer'];
export const stage1 = (card) => ({
  user: `${cardText(card)}\nA ${card.kind} for: ${card.audience}. Tone: ${card.tone}. Which sections, top to bottom? Give 3 to 7, each with a one-line purpose.\nSection kinds: ${SECTION_KINDS.join(', ')}`,
  schema: { type: 'object', required: ['sections'], properties: { sections: { type: 'array', minItems: 3, maxItems: 7, items: {
    type: 'object', required: ['kind', 'purpose'], properties: {
      kind: { type: 'string', enum: SECTION_KINDS }, purpose: { type: 'string', maxLength: 120 } } } } } }
});

// ─── Stage 2 — each section's tree ────────────────────────────────────────────────────────────────────────────────
// A flat list: item 0 is the root (parent -1); every other item names an EARLIER item as its parent. Flat because a
// recursive schema is not something Ollama's grammar takes, and a flat list is checkable by a script.
export const stage2 = (card, section, types, diagnostic, tuning) => ({
  user: `${cardText(card)}\nBuild the "${section.kind}" section. Purpose: ${section.purpose}\nVisual node types you may use:\n${types.map((t) => `- ${t.typeName}: ${t.short}`).join('\n')}\nGive the node tree as a flat list. Item 0 is the root (parent -1) and must be a Group. Every other item's parent is the index of an EARLIER item, and only Group or Columns can be a parent. Max depth 3 below the root, max 6 children per node, max 14 nodes. Each item: type, and a one-line role saying what it is FOR on this page (e.g. "the headline", "a photo of a puppy", "card for one step"), never the type name.${tuning?.stage2 ? `\n${tuning.stage2}` : ''}${diagnostic ? `\nYour last answer was rejected: ${diagnostic}` : ''}`,
  schema: { type: 'object', required: ['nodes'], properties: { nodes: { type: 'array', minItems: 2, maxItems: 14, items: {
    type: 'object', required: ['parent', 'role', 'type'], properties: {
      parent: { type: 'integer', minimum: -1, maximum: 13 }, role: { type: 'string', maxLength: 80 },
      type: { type: 'string', enum: types.map((t) => t.typeName) } } } } } }
});

// ─── Stage 3 — each node's ports ──────────────────────────────────────────────────────────────────────────────────
// The look: the vocabulary's own compositions for this node type (get_style_vocabulary → compositions), verbatim
// descriptions cut to their first sentence, plus "none". Asked only when there are two or more real choices.
export const look = (card, section, node, looks, diagnostic) => ({
  user: `${cardText(card)}\nSection "${section.kind}" (${section.purpose}). A ${node.type} node whose role is: ${node.role}.${node.parentLook ? ` It sits inside a "${node.parentLook}".` : ''}\nWhich look should it take?\n${looks.map((l) => `- ${l.id}: ${l.short}`).join('\n')}\n- none: no preset look${diagnostic ? `\nYour last answer was rejected: ${diagnostic}` : ''}`,
  schema: { type: 'object', required: ['look'], properties: { look: { type: 'string', enum: [...looks.map((l) => l.id), 'none'] } } }
});

// One enum port, its enum verbatim from get_node_type.
export const enumPort = (card, section, node, port, values, diagnostic) => ({
  user: `${cardText(card)}\nSection "${section.kind}". A ${node.type} node, role: ${node.role}${node.look && node.look !== 'none' ? `, look: ${node.look}` : ''}. Children: ${node.childSummary || 'none'}.\nPort "${port}" of ${node.type}. Which value: ${values.join(', ')}?${diagnostic ? `\nYour last answer was rejected: ${diagnostic}` : ''}`,
  schema: { type: 'object', required: ['value'], properties: { value: { type: 'string', enum: values } } }
});

// The words. Temperature 0.8.
export const copy = (card, section, node, maxLength, kindWord, diagnostic) => ({
  user: `${cardText(card)}\nSection "${section.kind}" (${section.purpose}). Write the ${kindWord} for a ${node.typeLabel || node.type} whose role is: ${node.role}${node.look && node.look !== 'none' ? ` (style: ${node.look})` : ''}. ${node.siblingNote || ''}Max ${maxLength} characters. Plain words, no markdown, no quotes around it.${diagnostic ? `\nYour last answer was rejected: ${diagnostic}` : ''}`,
  schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', maxLength } } }
});

export const glyph = (card, section, node, glyphs) => ({
  user: `${cardText(card)}\nSection "${section.kind}". An icon whose role is: ${node.role}. Which glyph?\nGlyphs: ${glyphs.join(', ')}`,
  schema: { type: 'object', required: ['glyph'], properties: { glyph: { type: 'string', enum: glyphs } } }
});

// ─── v2 stage 2 — the section as decisions (Richard, 2026-10-28) ─────────────────────────────────────────────────
// "For the hero section, what bits are needed" — chosen from a list — then one small decision per follow-up, and the
// script builds one node per bit from the node specs and the vocabulary's compositions. No premade sections: the bits
// are words for parts, and no node structure comes with the answer.
export const BITS = {
  eyebrow: 'a small uppercase line above the headline',
  badge: 'a small pill holding a few words',
  headline: 'the main heading',
  'sub-line': 'one sentence under the headline',
  'body text': 'a short paragraph',
  button: 'the main action button',
  'second button': 'a quieter second action',
  photo: 'one photograph',
  'list of items': 'several similar items: cards, steps, features or people',
  quote: 'a quotation from a person',
  'name line': 'who said it: a name and a role',
  'email field': 'a box to type an email address',
  'small print': 'a line of fine print (copyright, terms)'
};
export const ITEM_BITS = { photo: 'a photograph', icon: 'a small icon', number: 'a step number', title: 'a short title', text: 'a sentence or two', button: 'a button', 'name line': 'a name and a role' };

export const bits = (card, section) => ({
  user: `${cardText(card)}\nFor the "${section.kind}" section (${section.purpose}), which bits does it need, top to bottom? Choose 1 to 6:\n${Object.entries(BITS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`,
  schema: { type: 'object', required: ['bits'], properties: { bits: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', enum: Object.keys(BITS) } } } }
});
export const itemBits = (card, section, count) => ({
  user: `${cardText(card)}\nThe "${section.kind}" section (${section.purpose}) has a list of ${count} items. Which bits does EACH item have, top to bottom? Choose 1 to 4:\n${Object.entries(ITEM_BITS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`,
  schema: { type: 'object', required: ['bits'], properties: { bits: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: Object.keys(ITEM_BITS) } } } }
});
// One decision, its options in the words.
export const choice = (card, section, question, options) => ({
  user: `${cardText(card)}\nThe "${section.kind}" section (${section.purpose}). ${question} Answer one of: ${options.join(', ')}.`,
  schema: { type: 'object', required: ['answer'], properties: { answer: { type: 'string', enum: options } } }
});

export const RULES_V2 = [
  'V1 a section is: root band (look asked among the spine compositions) → one shell (the band composition: "a band always holds exactly one shell") → the bits.',
  'V2 bit → node: eyebrow → Text (look eyebrow); badge → Group (badge) holding a Text; headline → Text (looks displayHeadline | sectionHeading, R19 applies); sub-line → Text (lead | body); body text → Text (body); button / second button → Button (primaryButton | outlineButton), placed together in one actionRow at the first button\'s place; photo → Image (cardImage); list of items → see V4; quote → Text (lead | body); name line → Text (meta); email field → Text Input (textField); small print → Text (meta).',
  'V3 words and photo: when a section has a photo and at least one word bit, one question: "photo beside the words, above them, or below them?" Beside → a Columns (columnsTwoUp) holding a words Group and the photo. The words Group: flexDirection column, rowGap --space-4.',
  'V4 a list: three questions (how many items: 2 | 3 | 4 | 6; which bits each item has; grid or one column) and one look question for the FIRST item (card | featureItem | testimonialCard | statTile | none), shared by every item. Grid → Columns (gridAutoFit); one column → Group column, rowGap --space-6.',
  'V5 inside an item: look card → a photo first, then a cardBody Group with the other bits; featureItem → the icon / number / photo first, then a column Group (rowGap --space-1) with the other bits; otherwise the bits stacked. Item bit → node: photo → Image, icon → Icon, number → Text (look sectionHeading, words = the item\'s number, colour --primary: the script answers it), title → Text (cardTitle), text → Text (body), button → Button (look asked once, shared), name line → Text (meta).',
  'V6 alignment: when a section has word bits, one question: "centred or left-aligned?". It sets textAlignX on every Text in the section, alignItems on the words Group, and justifyContent on the actionRow. No per-Text alignment question.',
  'V7 no Group gets an enum-port question in v2: every Group is built by V1–V5, which state its direction and alignment.',
  'V8 copy: one call per Text / Button / Text Input, as v1, with the role naming the bit and the item ("item 2 of 3: its title").'
];
RULES_V2.push('V9 (from the v2 runs) a list\'s items become ONE item component: Component Inputs carry every parameter that differs between items (words, glyph); the section places it N times. The MCP refuses three identical sibling subtrees, and its own instructions say this is how a repeated part is built.');
RULES_V2.push('V10 (from v2b-e4b, v2b-lfm3) an imageGround root takes sizeMode contentHeight + minHeight 520 px instead of its fixed 520 px height: filled with more than a headline, the fixed box spilled upward over the band above (P112-OWN027-IMAGEGROUNDSPILL).');
RULES_V2.push('V11 (from v2b-e2b) a displayHeadline in the words column beside a photo takes fontSize --display-md: at --display-lg it wrapped to five lines in a half-width column.');

// A/B (--list-copy): the words of ONE bit across a list's items in one short call, so step 1, 2 and 3 are written
// knowing each other. Still a short output: n strings of a title's or a sentence's length.
export const listCopy = (card, section, count, what, maxLength) => ({
  user: `${cardText(card)}\nSection "${section.kind}" (${section.purpose}) has a list of ${count} items. Write ${what} for EACH item, in order, each different from the others. Max ${maxLength} characters each. Plain words, no numbering, no quotes.`,
  schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', minItems: count, maxItems: count, items: { type: 'string', maxLength } } } }
});

// A/B (--list-rows): ONE call per list writes every item's words as a row — title and sentence together — so a
// step's title and its sentence cannot disagree. Rows of short strings; still no long output.
export const listRows = (card, section, count, fields, maxLens) => ({
  user: `${cardText(card)}\nSection "${section.kind}" (${section.purpose}) has a list of ${count} items. For EACH item, in order, write: ${fields.map((f) => `${f} (max ${maxLens[f]} characters)`).join(', ')}. Each item different from the others; an item's ${fields.join(' and ')} must agree. Plain words, no numbering.`,
  schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: count, maxItems: count, items: {
    type: 'object', required: fields, properties: Object.fromEntries(fields.map((f) => [f, { type: 'string', maxLength: maxLens[f] }])) } } } }
});
