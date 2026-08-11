import { describe, it, expect } from 'vitest';
import type { FontAxes, PickerFont } from './pickAFontData';
import { PICKER_FONTS } from './pickAFontData';
import { axisDistance, matchFonts, qualityFor } from './pickAFontMatch';

const axes = (over: Partial<FontAxes> = {}): FontAxes => ({
  tone: 0.5,
  era: 0.5,
  voice: 0.5,
  warmth: 0.5,
  ...over,
});

const font = (over: Partial<PickerFont>): PickerFont => ({
  family: 'X',
  role: 'display',
  axes: axes(),
  source: 'google',
  license: 'OFL',
  url: 'https://example.com',
  css: ['https://example.com/x.css'],
  companions: [],
  ...over,
});

describe('matchFonts', () => {
  it('returns only fonts of the requested role', () => {
    const pool = [
      font({ family: 'D', role: 'display' }),
      font({ family: 'B', role: 'body' }),
      font({ family: 'M', role: 'mono' }),
    ];
    const matches = matchFonts(pool, 'body', axes());
    expect(matches.map((m) => m.font.family)).toEqual(['B']);
  });

  it('ranks by distance, nearest first, capped at the limit', () => {
    const pool = [
      font({ family: 'far', axes: axes({ tone: 1, era: 1 }) }),
      font({ family: 'exact', axes: axes() }),
      font({ family: 'near', axes: axes({ tone: 0.6 }) }),
      font({ family: 'mid', axes: axes({ tone: 0.9 }) }),
    ];
    const matches = matchFonts(pool, 'display', axes());
    expect(matches.map((m) => m.font.family)).toEqual(['exact', 'near', 'mid']);
  });

  it('never returns empty for a non-empty role pool, however far the target', () => {
    const pool = [font({ family: 'lonely', axes: axes({ tone: 0, era: 0, voice: 0, warmth: 0 }) })];
    const matches = matchFonts(pool, 'display', axes({ tone: 1, era: 1, voice: 1, warmth: 1 }));
    expect(matches).toHaveLength(1);
    expect(matches[0].quality).toBe('stretch');
  });

  it('labels distance honestly', () => {
    expect(qualityFor(0.1)).toBe('close');
    expect(qualityFor(0.5)).toBe('near');
    expect(qualityFor(1.2)).toBe('stretch');
  });

  it('measures euclidean distance over the four axes', () => {
    expect(axisDistance(axes(), axes())).toBe(0);
    expect(
      axisDistance(
        { tone: 0, era: 0, voice: 0, warmth: 0 },
        { tone: 1, era: 1, voice: 1, warmth: 1 },
      ),
    ).toBe(2);
  });
});

describe('PICKER_FONTS dataset integrity', () => {
  const byFamily = new Map(PICKER_FONTS.map((f) => [f.family, f]));

  it('has unique family names', () => {
    expect(byFamily.size).toBe(PICKER_FONTS.length);
  });

  it('keeps every axis value in 0..1', () => {
    for (const f of PICKER_FONTS) {
      for (const v of Object.values(f.axes)) {
        expect(v, `${f.family} axis out of range`).toBeGreaterThanOrEqual(0);
        expect(v, `${f.family} axis out of range`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('only names companions that exist in the dataset, cross-role', () => {
    for (const f of PICKER_FONTS) {
      for (const name of f.companions) {
        const companion = byFamily.get(name);
        expect(companion, `${f.family} names unknown companion "${name}"`).toBeDefined();
        expect(companion?.role, `${f.family} pairs within its own role`).not.toBe(f.role);
      }
    }
  });

  it('gives every display and body font at least one companion', () => {
    for (const f of PICKER_FONTS) {
      if (f.role === 'mono') continue;
      expect(f.companions.length, `${f.family} has no companion`).toBeGreaterThan(0);
    }
  });

  it('covers all three roles', () => {
    const roles = new Set(PICKER_FONTS.map((f) => f.role));
    expect(roles).toEqual(new Set(['display', 'body', 'mono']));
  });
});
