/**
 * CHR-009 slice 9 — `Advanced CSS` as the panel's footer row (Richard, 2026-09-17: "match the mockup").
 *
 * The heading is the same button; the footer modifier is what turns its count from a pill into plain muted
 * text (the CSS rule keys on it). What this cannot see is the CSS itself or that `PropertyGroups` passes the
 * modifier to the Advanced heading only — `PropertyGroups` needs real rows (a hook-calling `ControlHost`), so
 * that half is the drive's.
 */
import React from 'react';

import { GroupHeading } from '../../src/editor/src/views/panels/propertyeditor/components/PropertyGroups';
import { byClass, render, text } from '../support/renderElements';

const heading = (props: Partial<React.ComponentProps<typeof GroupHeading>> = {}) =>
  render(<GroupHeading name="Advanced CSS" isExpanded={false} activeCount={3} {...props} />);

describe('CHR-009 — the Advanced CSS footer row', () => {
  it('carries the footer modifier only when asked, beside a section heading that does not', () => {
    expect(String(heading({ isFooter: true }).props.className)).toContain('property-group-label--footer');
    expect(String(heading({ isFooter: true }).props.className)).toContain('property-group-label');
    expect(String(heading().props.className)).not.toContain('property-group-label--footer');
  });

  it('keeps the count and its rule: shown when folded, withheld when open', () => {
    const folded = byClass(heading({ isFooter: true }), 'property-group-badge');
    expect(folded.length).toBe(1);
    expect(text(folded[0])).toBe('3 set');
    expect(byClass(heading({ isFooter: true, isExpanded: true }), 'property-group-badge').length).toBe(0);
  });
});
