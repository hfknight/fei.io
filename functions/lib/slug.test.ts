import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('My First Post')).toBe('my-first-post');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('Hello, World! -- Again')).toBe('hello-world-again');
  });

  it('strips diacritics', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('falls back to "post" for empty/symbol-only titles', () => {
    expect(slugify('   ')).toBe('post');
    expect(slugify('!!!')).toBe('post');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when free', () => {
    expect(uniqueSlug('My First Post', [])).toBe('my-first-post');
  });

  it('suffixes on collision', () => {
    expect(uniqueSlug('My First Post', ['my-first-post'])).toBe('my-first-post-2');
  });

  it('skips taken suffixes', () => {
    expect(uniqueSlug('My First Post', ['my-first-post', 'my-first-post-2'])).toBe(
      'my-first-post-3',
    );
  });
});
