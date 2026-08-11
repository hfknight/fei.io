import type { FontAxes, FontRole, PickerFont } from './pickAFontData';

/**
 * Nearest-match search in axis space (see CONTEXT.md, "Font picker").
 *
 * Pure and DOM-free so the ranking is unit-testable. The picker never returns an empty
 * result for a non-empty role pool — it returns the closest fonts there are and is honest
 * about the distance instead, via `quality`.
 */

/** How honest a match is about its distance. Thresholds are on euclidean distance
 *  over four 0–1 axes (max possible: 2). */
export type MatchQuality = 'close' | 'near' | 'stretch';

export interface FontMatch {
  font: PickerFont;
  distance: number;
  quality: MatchQuality;
}

const CLOSE = 0.35;
const NEAR = 0.7;

export const qualityFor = (distance: number): MatchQuality =>
  distance < CLOSE ? 'close' : distance < NEAR ? 'near' : 'stretch';

export const axisDistance = (a: FontAxes, b: FontAxes): number =>
  Math.hypot(a.tone - b.tone, a.era - b.era, a.voice - b.voice, a.warmth - b.warmth);

export function matchFonts(
  fonts: PickerFont[],
  role: FontRole,
  target: FontAxes,
  limit = 3,
): FontMatch[] {
  return fonts
    .filter((font) => font.role === role)
    .map((font) => {
      const distance = axisDistance(font.axes, target);
      return { font, distance, quality: qualityFor(distance) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
