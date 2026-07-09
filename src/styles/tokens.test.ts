import { describe, it, expect } from 'vitest';
import { staticVars, lightVars, invertedVars, GLASS, GLASS_K, SURFACE_DEEP } from './tokens';

// --- oklch -> sRGB -> relative luminance. No colour library is installed. ---
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** OKLCh -> sRGB channels in 0..255 (unrounded, to keep precision through compositing). */
function oklchToSrgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const encode = (v: number) => {
    const c = clamp01(v);
    return (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255;
  };
  return [encode(linear[0]), encode(linear[1]), encode(linear[2])];
}

const srgbLin = (channel: number): number => {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgbY = ([r, g, b]: number[]) => 0.2126 * srgbLin(r) + 0.7152 * srgbLin(g) + 0.0722 * srgbLin(b);
const contrast = (y1: number, y2: number) => { const [hi, lo] = y1 > y2 ? [y1, y2] : [y2, y1]; return (hi + 0.05) / (lo + 0.05); };

/** Parse `oklch(L C H)` or `oklch(L C H / A)`, following `var(--x)` into staticVars. */
function parse(value: string): { rgb: [number, number, number]; alpha: number } {
  const v = value.match(/^var\((--[\w-]+)\)$/);
  if (v) return parse(staticVars[v[1]]);
  const m = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
  if (!m) throw new Error(`not an oklch colour: ${value}`);
  return { rgb: oklchToSrgb(+m[1], +m[2], +m[3]), alpha: m[4] === undefined ? 1 : +m[4] };
}

/** Luminance of `value`, composited over `bg` when it carries alpha. Browsers blend in sRGB. */
function luminance(value: string, bg?: [number, number, number]): number {
  const { rgb, alpha } = parse(value);
  if (alpha === 1) return rgbY(rgb);
  if (!bg) throw new Error(`${value} has alpha and needs a background`);
  return rgbY([0, 1, 2].map((i) => alpha * rgb[i] + (1 - alpha) * bg[i]));
}

/** The landing's right plate, from SplitStage.tsx. #54565b / #33343a, exact. */
const PLATES = ['oklch(0.453 0.008 268.5)', 'oklch(0.326 0.011 278.3)'];

describe('tokens: no hex or rgb anywhere', () => {
  it('every token colour is oklch', () => {
    for (const map of [staticVars, lightVars, invertedVars]) {
      for (const [name, value] of Object.entries(map)) {
        if (!/^(--n-|--color|--chrome|--glass-(top|bot|hi|rim|sheen|shadow|tint)|--accent)/.test(name)) continue;
        expect(value, `${name} = ${value}`).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
        expect(value, `${name} = ${value}`).toMatch(/^(oklch\(|var\(--n-)/);
      }
    }
  });
});

describe('tokens: drift guard', () => {
  it('inverted overrides only names that light defines', () => {
    for (const name of Object.keys(invertedVars)) {
      expect(lightVars, `${name} overrides a name light never defines`).toHaveProperty(name);
    }
  });

  it('light semantic values reference only vars that staticVars defines', () => {
    for (const [name, value] of Object.entries(lightVars)) {
      const m = value.match(/^var\((--[\w-]+)\)$/);
      if (m) expect(staticVars, `${name} -> ${m[1]} is not a primitive`).toHaveProperty(m[1]);
    }
  });

  it('derives the glass recipe from GLASS_K', () => {
    expect(GLASS_K).toBe(0.2);
    expect(GLASS).toEqual({ top: 0.148, bot: 0.042, blur: 5.6, hi: 0.304, rim: 0.096, shadow: 0.1 });
  });

  it('keeps the deep surface an exact conversion of the legacy #12102a', () => {
    const { rgb } = parse(SURFACE_DEEP);
    expect(rgb.map(Math.round)).toEqual([18, 16, 42]);
  });
});

describe('tokens: contrast', () => {
  it('light ink and muted ink clear AA on the light surface', () => {
    const bg = parse(lightVars['--color-surface']).rgb;
    const surface = rgbY(bg);
    expect(contrast(surface, luminance(lightVars['--color-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(lightVars['--color-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(lightVars['--chrome-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    // 4.72:1 — passes, but the tightest pair in the system.
    expect(contrast(surface, luminance(lightVars['--chrome-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('inverted ink and muted ink clear AA on the deep surface', () => {
    const bg = parse(SURFACE_DEEP).rgb;
    const surface = rgbY(bg);
    expect(contrast(surface, luminance(invertedVars['--color-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(invertedVars['--color-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
    // The 0.45 -> 0.5 bump. At 0.45 this is 4.49:1 and fails.
    expect(contrast(surface, luminance(invertedVars['--chrome-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('chrome ink clears AA on the landing right plate', () => {
    for (const plate of PLATES) {
      const bg = parse(plate).rgb;
      expect(contrast(rgbY(bg), luminance(invertedVars['--chrome-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    }
  });

  // --color-border is decorative (1.22:1 on the deep surface) and is deliberately not asserted.
});
