// Tuning constants ported from the design's data-props defaults (source line 164)
// and the per-clip gaze windows (source line 936-943).
export interface ClipCfg { src: string; T0: number; T1: number; rest: number; dur: number; }

const mk = (src: string, T0: number, T1: number, rest: number): ClipCfg => ({ src, T0, T1, rest, dur: T1 - T0 });

export const JOJO = mk('/jojo-clip-2.mp4', 0.15, 6.0, 0.015);
// Ollie's file is trimmed (source 1.0–6.0s) to the clip's monotonic up→down sweep — the
// source's back half was a mirrored return to up, which a scrub range cannot use: mapped
// end to end, the bottom half of the screen would walk the head back UP. Within the trim,
// the head holds still until ~0.2 and is at its lowest at ~4.85; the window ends there so
// the bottom of the screen reaches the true bottom of the nod.
export const OLLIE = mk('/ollie-clip-4.mp4', 0.2, 4.85, 0.01);

// Both clips are 24fps, all-intra. The scrub engine quantizes seeks to these frame
// boundaries; a new clip at a different rate must update this alongside its ClipCfg.
export const CLIP_FPS = 24;

export const TRACKING_SPEED = 0.14; // active-side ease-in rate
export const SCOPE_INSET_Y = 0;     // % vertical dead-zone at top/bottom
// The frost blur is a design token now, since the chrome's nav track wears the same glass.
export { FROST_BLUR } from '../../styles/tokens';
export const FROST_STYLE: 'Liquid glass' | 'Frosted' | 'Dim only' = 'Liquid glass';
export const SEAM_SHEEN = true;
export const LOGO_GLOW = true;

// Lens tuning — ported from the design's data-props defaults (source line 164).
export const LENS = {
  surfaceProfile: 'Convex circle' as 'Convex circle' | 'Convex squircle' | 'Concave' | 'Lip',
  refractiveIndex: 1.5,
  glassThickness: 10,
  bezelWidth: 45,
  magnify: 0.08,
  lensSize: 128,        // base; lens 1 renders 1.45×, lens 2 1.18× (see setupLens)
  magnifyScale: 1.15,
  liquidEnabled: true,
  liquidStretch: 0.16,
  chromaticAberration: true,
  chromaticStrength: 0.4,
};
