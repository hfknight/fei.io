/**
 * Rewrite a static HTML response's head for one route: <title>, meta description, Open
 * Graph, Twitter, and the canonical link. The client sets document.title per route too
 * (src/hooks/usePageTitle.ts), but unfurlers and slow crawlers read only the static head —
 * this is the copy they see. Non-HTML responses pass through untouched.
 */

export interface PageMeta {
  title: string;
  description: string;
  /**
   * The page's schema.org object, minus what can be derived: `@context`, `url` and
   * `description` are filled in from the meta and the canonical, and any of them can still be
   * overridden by naming it here. Omit for pages that no schema type describes honestly —
   * structured data that misrepresents a page is worse than none.
   */
  jsonLd?: Record<string, unknown>;
}

/**
 * One page's schema.org object as the string that goes inside a ld+json script.
 *
 * `<` is escaped: a literal `</script>` anywhere in the data — inside a description, a name,
 * a feature — would close the block early and spill the rest of the JSON into the document.
 * JSON.stringify does not escape it, since it is legal JSON; it is only dangerous in HTML.
 */
export function serializeJsonLd(meta: PageMeta, canonical: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    url: canonical,
    description: meta.description,
    ...meta.jsonLd,
  }).replace(/</g, '\\u003c');
}

export function stampMeta(asset: Response, meta: PageMeta, canonical: string): Response {
  if (!asset.headers.get('content-type')?.includes('text/html')) return asset;

  const setContent = (value: string) => ({
    element(el: Element) {
      el.setAttribute('content', value);
    },
  });

  const rewriter = new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', canonical);
      },
    })
    .on('meta[name="description"]', setContent(meta.description))
    .on('meta[property="og:title"]', setContent(meta.title))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('meta[property="og:url"]', setContent(canonical))
    .on('meta[name="twitter:title"]', setContent(meta.title))
    .on('meta[name="twitter:description"]', setContent(meta.description));

  /* Appended rather than rewritten: the site-wide head already carries a Person block, and a
     page describing what it *is* sits alongside that rather than replacing it. */
  if (meta.jsonLd) {
    const script = `<script type="application/ld+json">${serializeJsonLd(meta, canonical)}</script>`;
    rewriter.on('head', {
      element(el) {
        el.append(script, { html: true });
      },
    });
  }

  return rewriter.transform(asset);
}
