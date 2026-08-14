/**
 * Rewrite a static HTML response's head for one route: <title>, meta description, Open
 * Graph, Twitter, and the canonical link. The client sets document.title per route too
 * (src/hooks/usePageTitle.ts), but unfurlers and slow crawlers read only the static head —
 * this is the copy they see. Non-HTML responses pass through untouched.
 */

export interface PageMeta {
  title: string;
  description: string;
}

export function stampMeta(asset: Response, meta: PageMeta, canonical: string): Response {
  if (!asset.headers.get('content-type')?.includes('text/html')) return asset;

  const setContent = (value: string) => ({
    element(el: Element) {
      el.setAttribute('content', value);
    },
  });

  return new HTMLRewriter()
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
    .on('meta[name="twitter:description"]', setContent(meta.description))
    .transform(asset);
}
