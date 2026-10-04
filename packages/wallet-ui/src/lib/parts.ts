/**
 * A sentence from a content template, split so some values can keep their
 * own case. Display type is uppercase, and an address or a site address must
 * read exactly as it is, letter by letter: "0x5b0e...e2f4", never "0X5B0E".
 */

export interface Part {
  readonly text: string;
  /** True for a value that keeps its case (and its mono face). */
  readonly keep: boolean;
}

export function fillParts(
  template: string,
  values: Readonly<Record<string, string>>,
  keep: ReadonlySet<string>,
): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const [whole, key = ""] = match;
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: template.slice(last, index), keep: false });
    parts.push({ text: values[key] ?? whole, keep: keep.has(key) });
    last = index + whole.length;
  }
  if (last < template.length) parts.push({ text: template.slice(last), keep: false });
  return parts;
}
