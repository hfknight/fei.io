import { describe, it, expect } from 'vitest';
import type { PromptedItem } from './promptedData';
import { promptedItems, sortNewestFirst, thumbUrl } from './promptedData';

describe('thumbUrl', () => {
  it('inserts the transform segment into a typical URL', () => {
    expect(thumbUrl('https://media.fei.io/foo/bar.webp')).toBe(
      'https://media.fei.io/cdn-cgi/image/width=640,quality=80,format=auto/foo/bar.webp',
    );
  });

  it('preserves a nested path', () => {
    expect(thumbUrl('https://media.fei.io/lab/prompted/foxfire-lantern.webp')).toBe(
      'https://media.fei.io/cdn-cgi/image/width=640,quality=80,format=auto/lab/prompted/foxfire-lantern.webp',
    );
  });

  it('honors a custom width', () => {
    expect(thumbUrl('https://media.fei.io/foo/bar.webp', 320)).toBe(
      'https://media.fei.io/cdn-cgi/image/width=320,quality=80,format=auto/foo/bar.webp',
    );
  });

  it('returns garbage input unchanged', () => {
    expect(thumbUrl('not a url')).toBe('not a url');
  });
});

describe('sortNewestFirst', () => {
  const item = (over: Partial<PromptedItem> & { id: string; date: string }): PromptedItem =>
    ({
      title: 'x',
      prompt: 'a prompt',
      model: 'Midjourney v7',
      type: 'image',
      src: 'https://media.fei.io/lab/prompted/x.webp',
      ...over,
    }) as PromptedItem;

  it('orders items newest-first by date', () => {
    const sorted = sortNewestFirst([
      item({ id: 'old', date: '2025-01-01' }),
      item({ id: 'new', date: '2026-06-01' }),
      item({ id: 'mid', date: '2025-09-01' }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['new', 'mid', 'old']);
  });

  it('does not mutate the input array', () => {
    const input = [item({ id: 'a', date: '2025-01-01' }), item({ id: 'b', date: '2026-01-01' })];
    sortNewestFirst(input);
    expect(input.map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('promptedItems', () => {
  it('has a non-empty prompt, model, and a YYYY-MM-DD date for every item', () => {
    for (const item of promptedItems) {
      expect(item.prompt.length).toBeGreaterThan(0);
      expect(item.model.length).toBeGreaterThan(0);
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
