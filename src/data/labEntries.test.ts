import { describe, it, expect } from 'vitest';
import { lazy } from 'react';
import type { LabEntry } from '../types';
import { labEntries, sortByDateDesc, findLabEntry } from './labEntries';

const stubComponent = (): LabEntry['Component'] =>
  lazy(async () => ({ default: () => null }));

const entry = (over: Partial<LabEntry>): LabEntry => ({
  slug: 'x',
  title: 'X',
  kind: 'experiment',
  date: '2026-01-01',
  Component: stubComponent(),
  ...over,
});

describe('sortByDateDesc', () => {
  it('orders entries newest-first by date', () => {
    const sorted = sortByDateDesc([
      entry({ slug: 'old', date: '2025-01-01' }),
      entry({ slug: 'new', date: '2026-06-01' }),
      entry({ slug: 'mid', date: '2025-09-01' }),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['new', 'mid', 'old']);
  });

  it('does not mutate the input array', () => {
    const input = [
      entry({ slug: 'a', date: '2025-01-01' }),
      entry({ slug: 'b', date: '2026-01-01' }),
    ];
    sortByDateDesc(input);
    expect(input.map((e) => e.slug)).toEqual(['a', 'b']);
  });
});

describe('findLabEntry', () => {
  it('returns the entry for a known slug', () => {
    expect(findLabEntry('interfaces-that-feel-better')?.title).toBe(
      'Best practices that make interfaces feel better',
    );
  });

  it('returns undefined for an unknown slug', () => {
    expect(findLabEntry('does-not-exist')).toBeUndefined();
  });
});

describe('labEntries registry', () => {
  it('has unique slugs', () => {
    const slugs = labEntries.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
