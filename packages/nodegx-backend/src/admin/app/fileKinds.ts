/**
 * The kinds of file a backend can refuse, as categories a person ticks
 * (BMG-011 §3.1, AC2) — instead of the old *Denied content types
 * (comma-separated)* field.
 *
 * 🔴 The vocabulary is the backend's SNIFFER's, not the internet's. An upload
 * is refused when `storage/sniff.ts` reads its BYTES as a type on the deny
 * list; the client's declared type is never consulted. So a category can only
 * name types the sniffer can produce — a *Video* box would store `video/mp4`,
 * and nothing would ever match it (an inert control teaches a lie). Every
 * type here is one the sniffer returns, and the spec holds the two lists
 * equal (`bmg-011` spec: *every sniffed type belongs to exactly one category*).
 * A person who wants to refuse a type the sniffer cannot see has the custom
 * chips, and the page says what they match.
 */
export interface FileKindCategory {
  id: string;
  label: string;
  /** What the box covers, in a person's words. */
  line: string;
  types: string[];
}

export const FILE_KINDS: FileKindCategory[] = [
  {
    id: 'images',
    label: 'Images',
    line: 'PNG, JPEG, GIF, WebP, BMP, icons and SVG',
    types: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/svg+xml']
  },
  {
    id: 'documents',
    label: 'Documents and data',
    line: 'PDF, plain text, CSV and JSON',
    types: ['application/pdf', 'text/plain', 'text/csv', 'application/json']
  },
  { id: 'audio', label: 'Audio', line: 'MP3', types: ['audio/mpeg'] },
  { id: 'archives', label: 'Archives', line: 'ZIP', types: ['application/zip'] },
  {
    id: 'web',
    label: 'Web pages and scripts',
    line: 'HTML, CSS and JavaScript — a page a browser would run',
    types: ['text/html', 'text/css', 'text/javascript']
  },
  {
    id: 'unknown',
    label: 'Executables and anything unrecognised',
    line: 'Programs, installers and every other binary the backend cannot identify',
    types: ['application/octet-stream']
  }
];

/** Every type a category names, once. */
export const KNOWN_TYPES: string[] = FILE_KINDS.reduce<string[]>((all, k) => all.concat(k.types), []);

/** A refused kind on the page: which categories are ticked, plus the custom types. */
export interface RefusedKinds {
  categories: string[];
  custom: string[];
}

/** The deny list the backend stores for a page state — a category's types, then the custom ones, no repeats. */
export function denyListFrom(kinds: RefusedKinds): string[] {
  const out: string[] = [];
  for (const k of FILE_KINDS) {
    if (kinds.categories.indexOf(k.id) === -1) continue;
    for (const t of k.types) if (out.indexOf(t) === -1) out.push(t);
  }
  for (const t of kinds.custom) {
    const v = t.trim().toLowerCase();
    if (v && out.indexOf(v) === -1) out.push(v);
  }
  return out;
}

/**
 * The page state for a stored deny list. A category is ticked when EVERY one
 * of its types is denied; a denied type outside a ticked category is a custom
 * chip, so a list written by hand or by an agent shows and keeps everything.
 */
export function kindsFrom(denyList: string[]): RefusedKinds {
  const denied = new Set(denyList.map((t) => t.trim().toLowerCase()).filter(Boolean));
  const categories: string[] = [];
  const covered = new Set<string>();
  for (const k of FILE_KINDS) {
    if (k.types.every((t) => denied.has(t))) {
      categories.push(k.id);
      for (const t of k.types) covered.add(t);
    }
  }
  const custom: string[] = [];
  denied.forEach((t) => {
    if (!covered.has(t)) custom.push(t);
  });
  return { categories, custom };
}

/** A custom type must look like `type/subtype`; the sentence says so. */
export function mimeProblem(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return 'Type a content type.';
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(t)) return 'A content type looks like image/png or application/pdf.';
  return null;
}

/** What a custom chip says beside a type the sniffer never produces. */
export function sniffable(type: string): boolean {
  return KNOWN_TYPES.indexOf(type.trim().toLowerCase()) !== -1;
}
