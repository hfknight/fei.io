import { describe, it, expect } from 'vitest';
import { HLJS_COMMENT, hljsTokens, CODE_ISLAND, CODE_ISLAND_RIM } from './codeTheme';

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const luminance = ([r, g, b]: [number, number, number]): number => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a: [number, number, number], b: [number, number, number]): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
};

/** Composite `rgba(0, 0, 0, a)` over a ground, the way the island tint does. */
const tint = (ground: [number, number, number], a: number): [number, number, number] =>
  ground.map(c => Math.round(c * (1 - a))) as [number, number, number];

const ISLAND_ALPHA = Number(CODE_ISLAND.match(/([\d.]+)\)$/)![1]);

/**
 * The island is one rule over two different page grounds, so it lands on two different
 * colours — which is exactly why the palette is pinned to the LIGHTER of them.
 *
 *  - lab entries sit on --n-11 (44,46,50) → island (32,33,36)   ← lighter, so it binds
 *  - the blog sits on the deep surface (18,16,42) → island (13,12,30)
 */
const LAB_GROUND: [number, number, number] = [44, 46, 50];
const BLOG_GROUND: [number, number, number] = [18, 16, 42];
const LAB_ISLAND = tint(LAB_GROUND, ISLAND_ALPHA);
const BLOG_ISLAND = tint(BLOG_GROUND, ISLAND_ALPHA);

describe('code theme: the shared highlight palette', () => {
  it('keeps comments readable on both islands', () => {
    expect(contrast(hex(HLJS_COMMENT), LAB_ISLAND)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(HLJS_COMMENT), BLOG_ISLAND)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The value this replaced. It read as "quiet" and was simply unreadable — 3.33:1 on the
   * lab island. If this ever passes, the islands got darker and the old grey would do.
   */
  it('proves the previous comment grey could not have stayed', () => {
    expect(contrast(hex('#6b7280'), LAB_ISLAND)).toBeLessThan(4.5);
  });

  /** Comments should recede: quieter than the loudest token, but still over the bar. */
  it('keeps comments the quietest token without dropping out', () => {
    const loudest = hex('#93c5fd');
    expect(contrast(hex(HLJS_COMMENT), LAB_ISLAND)).toBeLessThan(
      contrast(loudest, LAB_ISLAND),
    );
  });

  /**
   * The blog's old hardcoded island. The tint has to reproduce it, or unifying on the rule
   * would have silently restyled every post — that equivalence is the entire argument for
   * deleting the literal, so it is worth pinning rather than trusting.
   */
  it('reproduces the literal the blog used to hardcode', () => {
    const wasHardcoded = hex('#0c0a1f');
    BLOG_ISLAND.forEach((c, i) => {
      expect(Math.abs(c - wasHardcoded[i])).toBeLessThanOrEqual(2);
    });
  });

  it('keeps the island a tint, so it travels to a ground it has not met', () => {
    expect(CODE_ISLAND).toMatch(/^rgba\(0, 0, 0, [\d.]+\)$/);
    expect(CODE_ISLAND_RIM).toMatch(/^rgba\(255, 255, 255, [\d.]+\)$/);
    // a lighter page would yield a lighter island, not the same one borrowed
    expect(tint([90, 90, 90], ISLAND_ALPHA)[0]).toBeGreaterThan(LAB_ISLAND[0]);
  });

  it('declares one palette for both call sites', () => {
    const css = hljsTokens.join('');
    for (const sel of ['.hljs-comment', '.hljs-keyword', '.hljs-string', '.hljs-number',
      '.hljs-attribute', '.hljs-title', '.hljs-tag']) {
      expect(css).toContain(sel);
    }
    // the accent stays a token; everything else on a code island is deliberately literal
    expect(css).toContain('var(--accent)');
  });
});
