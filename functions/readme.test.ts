import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './lib/stampMeta';
import { README_META } from './readme';
import { ALL_PROJECTS } from '../src/data/projects';

/**
 * As in lib/stampMeta.test.ts, the rewrite itself is HTMLRewriter, which vitest's runtime
 * lacks; what is checked here is the meta /readme gets and the JSON that goes into its head.
 */

const CANONICAL = 'https://fei.io/readme';
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('/readme meta', () => {
  it('differs from the home page head, which is the duplicate signal it exists to break', () => {
    const homeTitle = indexHtml.match(/<title>(.*?)<\/title>/)?.[1];
    const homeDescription = indexHtml.match(/<meta name="description" content="(.*?)"/)?.[1];

    expect(homeTitle).toBeTruthy();
    expect(homeDescription).toBeTruthy();
    expect(README_META.title).not.toBe(homeTitle);
    expect(README_META.description).not.toBe(homeDescription);
  });

  it('describes the page as a ProfilePage of the site-wide Person', () => {
    const parsed = JSON.parse(serializeJsonLd(README_META, CANONICAL));

    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('ProfilePage');
    expect(parsed.url).toBe(CANONICAL);
    expect(parsed.mainEntity['@type']).toBe('Person');
    // The same @id as index.html's Person, so the two blocks merge into one entity.
    expect(indexHtml).toContain(`"@id": "${parsed.mainEntity['@id']}"`);
    expect(parsed.mainEntity.sameAs).toEqual([
      'https://github.com/hfknight',
      'https://www.linkedin.com/in/feihu/',
      'https://x.com/Parn_Fe',
    ]);
  });
});

describe('/readme project list', () => {
  it('declares every project the page renders, as an ItemList on the ProfilePage', () => {
    const parsed = JSON.parse(serializeJsonLd(README_META, CANONICAL));
    const list = parsed.hasPart[0];

    expect(list['@type']).toBe('ItemList');
    expect(list.itemListElement.map((e: { item: { url: string } }) => e.item.url)).toEqual(
      ALL_PROJECTS.map(p => p.url),
    );
    list.itemListElement.forEach(
      (e: { position: number; item: Record<string, unknown> }, i: number) => {
        expect(e.position).toBe(i + 1);
        expect(e.item['@type']).toBe(ALL_PROJECTS[i].schemaType);
        expect(e.item.creator).toEqual({ '@id': 'https://fei.io/#person' });
      },
    );
  });
});
