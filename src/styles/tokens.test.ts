import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { staticVars, lightVars, invertedVars, GLASS, GLASS_K, SURFACE_DEEP, FROST_BLUR } from './tokens';
import { FROST_BLUR as LANDING_FROST_BLUR } from '../components/Landing/landingConfig';
import { theme } from './theme';

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

describe('tokens: the system faces have exactly one definition', () => {
  /**
   * The colour system has always been a single source of truth; the type system was not —
   * 76 components hardcoded their own font stack, so `--font-body` had one consumer and
   * changing the body face meant a 28-file sweep. This guard keeps them wired.
   *
   * Big Shoulders Display is exempt: LoadingScreen paints it into a canvas via `ctx.font`,
   * and a canvas cannot read a CSS custom property.
   */
  const FACES = ["'Inter'", "'Archivo'", "'JetBrains Mono'"];

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path, out);
      else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)) out.push(path);
    }
    return out;
  };

  it('no component hardcodes a system font stack', () => {
    // jsdom's import.meta.url is not a file: URL, so resolve from the vitest root instead.
    const src = join(process.cwd(), 'src') + '/';
    const offenders = walk(src)
      .filter(file => !file.endsWith(join('styles', 'tokens.ts')))
      .flatMap(file => {
        const text = readFileSync(file, 'utf8');
        return FACES.filter(face => text.includes(face)).map(face => `${file.slice(src.length)} → ${face}`);
      });
    expect(offenders, 'author ${p => p.theme.font.x}, never a raw stack').toEqual([]);
  });
});

/**
 * Frost is the landing's inactive-half skin, now also worn by the chrome's nav track. It is a
 * thicker, textured material than the pill's glass, and it must stay one material: the two
 * consumers reading different blurs, or different grain, is exactly the drift this prevents.
 */
describe('tokens: the frost material has one definition', () => {
  it('shares its blur with the landing, which re-exports rather than redeclares', () => {
    expect(staticVars['--frost-blur']).toBe(`${FROST_BLUR}px`);
    expect(LANDING_FROST_BLUR).toBe(FROST_BLUR);
  });

  it('carries the grain as a texture token, not a colour', () => {
    expect(staticVars['--frost-noise']).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(staticVars['--frost-noise']).toContain('feTurbulence');
  });
});

describe('tokens: no hex or rgb anywhere', () => {
  it('every token colour is oklch', () => {
    for (const map of [staticVars, lightVars, invertedVars]) {
      for (const [name, value] of Object.entries(map)) {
        if (!/^(--n-|--color|--chrome|--glass-(top|bot|hi|rim|sheen|shadow)|--accent)/.test(name)) continue;
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

  it('keeps the well an exact conversion of the legacy #0c0a1f', () => {
    const { rgb } = parse(lightVars['--color-well']);
    expect(rgb.map(Math.round)).toEqual([12, 10, 31]);
  });

  /**
   * The well is a void, so it must NOT follow the surface: a letterbox behind a post's
   * hero has to stay dark on a light page. Declaring it once means inverted inherits it —
   * if someone ever adds an override, this fails and they have to justify it.
   */
  it('gives the well one value on both surfaces', () => {
    expect(invertedVars).not.toHaveProperty('--color-well');
    expect(parse(lightVars['--color-well']).rgb.map(Math.round)).not.toEqual(
      parse(lightVars['--color-surface']).rgb.map(Math.round),
    );
  });
});

describe('tokens: contrast', () => {
  it('light ink and muted ink clear AA on the light surface', () => {
    const bg = parse(lightVars['--color-surface']).rgb;
    const surface = rgbY(bg);
    expect(contrast(surface, luminance(lightVars['--color-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(lightVars['--color-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(lightVars['--chrome-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    // 5.87:1 — identical to --color-ink-muted, as on the inverted surface. The accent is now
    // the tightest pair in the system, at 4.73:1.
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

describe('theme accessor', () => {
  /** Every var() the accessor hands out must be a name the CSS actually declares. */
  const declared = new Set([...Object.keys(staticVars), ...Object.keys(lightVars)]);

  const collectVars = (node: unknown, acc: string[] = []): string[] => {
    if (typeof node === 'string') {
      const m = node.match(/^var\((--[\w-]+)\)$/);
      if (m) acc.push(m[1]);
      return acc;
    }
    if (node && typeof node === 'object') {
      for (const value of Object.values(node as Record<string, unknown>)) collectVars(value, acc);
    }
    return acc;
  };

  it('references only declared custom properties', () => {
    const used = collectVars(theme);
    expect(used.length).toBeGreaterThan(10);
    for (const name of used) expect(declared, `${name} is used but never declared`).toContain(name);
  });

  it('keeps breakpoints as literal strings — var() is illegal in @media', () => {
    expect(theme.breakpoints).toEqual({ sm: '640px', md: '768px', lg: '1024px', xl: '1280px' });
    expect(JSON.stringify(theme.breakpoints)).not.toContain('var(');
  });
});

describe('tokens: the accent is surface-aware', () => {
  /** The legacy #fcd34d that every dark page already renders. 3dp of chroma yields #fcd34e. */
  it('keeps the inverted accent an exact conversion of #fcd34d', () => {
    const { rgb } = parse(invertedVars['--accent']);
    expect(rgb.map(Math.round)).toEqual([252, 211, 77]);
  });

  it('clears AA on the surface it sits on, both ways', () => {
    const lightBg = parse(lightVars['--color-surface']).rgb;
    const darkBg = parse(SURFACE_DEEP).rgb;
    expect(contrast(rgbY(lightBg), luminance(lightVars['--accent'], lightBg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgbY(darkBg), luminance(invertedVars['--accent'], darkBg))).toBeGreaterThanOrEqual(4.5);
  });

  it('clears AA for text placed ON an accent fill, both ways', () => {
    for (const map of [lightVars, invertedVars]) {
      const fill = parse(map['--accent']).rgb;
      expect(contrast(rgbY(fill), luminance(map['--accent-ink'], fill))).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * The mark is text, so 4.5 is the bar on every ground it can land on. On the deep side
   * that means --n-11 as well as the deep surface: lab entries ground themselves on the
   * plate grey, and it is the lighter of the two, so it binds.
   */
  it('the mark clears AA on every ground it can sit on', () => {
    const lightBg = parse(lightVars['--color-surface']).rgb;
    const deepBg = parse(SURFACE_DEEP).rgb;
    const plateBg = parse(staticVars['--n-11']).rgb;
    expect(contrast(rgbY(lightBg), luminance(lightVars['--color-mark'], lightBg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgbY(deepBg), luminance(invertedVars['--color-mark'], deepBg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgbY(plateBg), luminance(invertedVars['--color-mark'], plateBg))).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The raw #f04d22 the mark descends from — /readme's Aesthetic shimmer, sampled from the
   * portrait — is why the token exists rather than the hex being reused. If this ever
   * fails, the source orange became usable as chrome and the derivation can be revisited.
   */
  it('proves the source orange could not have been used directly', () => {
    const lightBg = parse(lightVars['--color-surface']).rgb;
    // #f04d22 as oklch, for the parser: same colour, ~[240,77,34]
    const raw = 'oklch(0.6266 0.2178 33.16)';
    expect(contrast(rgbY(lightBg), luminance(raw, lightBg))).toBeLessThan(4.5);
  });

  /**
   * The reason the accent cannot be one value: the dark accent is unreadable on the light
   * surface. If this ever passes, someone has flattened the accent and broken light pages.
   */
  it('proves a single accent value could not serve both surfaces', () => {
    const lightBg = parse(lightVars['--color-surface']).rgb;
    expect(contrast(rgbY(lightBg), luminance(invertedVars['--accent'], lightBg))).toBeLessThan(2);
  });
});

describe('tokens: ui-scheme drives the UA colour-scheme', () => {
  it('names the scheme per surface so native controls match', () => {
    expect(lightVars['--ui-scheme']).toBe('light');
    expect(invertedVars['--ui-scheme']).toBe('dark');
  });
});

describe('tokens: glass has two tints', () => {
  /**
   * Regression guard. The dark theme is what the whole site renders today, so every glass
   * value on the inverted surface must stay byte-for-byte identical to the single-tint recipe.
   * If this fails, the live nav pill changed.
   */
  it('leaves the inverted glass byte-for-byte unchanged', () => {
    expect(invertedVars['--glass-top']).toBe('oklch(1 0 0 / 0.148)');
    expect(invertedVars['--glass-bot']).toBe('oklch(1 0 0 / 0.042)');
    expect(invertedVars['--glass-rim']).toBe('oklch(1 0 0 / 0.096)');
    expect(invertedVars['--glass-hi']).toBe('oklch(1 0 0 / 0.304)');
    expect(invertedVars['--glass-sheen']).toBe('oklch(1 0 0 / 0.14)');
    expect(staticVars['--glass-shadow']).toBe('oklch(0 0 0 / 0.1)');
    expect(staticVars['--glass-blur']).toBe('5.6px');
  });

  it('tints the light fill and rim with ink', () => {
    for (const name of ['--glass-top', '--glass-bot', '--glass-rim']) {
      expect(lightVars[name], name).toMatch(/^oklch\(0\.30 0\.008 265 \/ /);
    }
  });

  /**
   * Highlights model reflected light, not pigment. Tinting them with ink turns the top
   * highlight into a hard dark line — measured rgb(187,189,190) on a rgb(251,252,253)
   * ground, which reads as a pressed inset rather than glass.
   */
  it('keeps the light highlight and sheen white, not ink', () => {
    expect(lightVars['--glass-hi']).toBe('oklch(1 0 0 / 0.304)');
    expect(lightVars['--glass-sheen']).toBe('oklch(1 0 0 / 0.14)');
  });

  it('keeps the drop shadow black on both surfaces — it is cast, not reflected', () => {
    expect(staticVars['--glass-shadow']).toMatch(/^oklch\(0 0 0 \//);
    expect(lightVars['--glass-shadow']).toBeUndefined();
    expect(invertedVars['--glass-shadow']).toBeUndefined();
  });

  /**
   * Components read the composed values, never a bare tint. A `--glass-tint` token would
   * imply glass has one tint, which is the bug this recipe fixes — so it must not come back.
   */
  it('exposes exactly the composed glass values, and no bare tint', () => {
    const glassKeys = (m: Record<string, string>) => Object.keys(m).filter(k => k.startsWith('--glass-')).sort();
    expect(glassKeys(lightVars)).toEqual(['--glass-bot', '--glass-hi', '--glass-rim', '--glass-sheen', '--glass-top']);
    expect(glassKeys(invertedVars)).toEqual(['--glass-bot', '--glass-hi', '--glass-rim', '--glass-sheen', '--glass-top']);
    expect(glassKeys(staticVars)).toEqual(['--glass-blur', '--glass-shadow']);
  });
});
