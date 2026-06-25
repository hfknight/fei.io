// Slug generation for post URLs (/writing/<slug>).

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
  return base || 'post';
}

// Returns a slug not present in `taken`, suffixing -2, -3, … on collision.
export function uniqueSlug(title: string, taken: Iterable<string>): string {
  const seen = new Set(taken);
  const base = slugify(title);
  if (!seen.has(base)) return base;
  let n = 2;
  while (seen.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
