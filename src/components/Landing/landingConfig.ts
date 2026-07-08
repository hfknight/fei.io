// Tuning constants ported from the design's data-props defaults (source line 164)
// and the per-clip gaze windows (source line 936-943).
export interface ClipCfg { src: string; T0: number; T1: number; rest: number; dur: number; }

const mk = (src: string, T0: number, T1: number, rest: number): ClipCfg => ({ src, T0, T1, rest, dur: T1 - T0 });

export const JOJO = mk('/jojo-clip-2.mp4', 0.15, 6.0, 0.015);
export const OLLIE = mk('/ollie-clip-3.mp4', 0.2, 6.2, 0.01);

export const TRACKING_SPEED = 0.14; // active-side ease-in rate
export const SCOPE_INSET_Y = 0;     // % vertical dead-zone at top/bottom
export const FROST_BLUR = 11;       // px
export const FROST_STYLE: 'Liquid glass' | 'Frosted' | 'Dim only' = 'Liquid glass';
export const SEAM_SHEEN = true;
export const LOGO_GLOW = true;

// Lens tuning — ported from the design's data-props defaults (source line 164).
export const LENS = {
  surfaceProfile: 'Convex circle' as 'Convex circle' | 'Convex squircle' | 'Concave' | 'Lip',
  refractiveIndex: 1.5,
  glassThickness: 10,
  bezelWidth: 45,
  magnify: 0.05,
  lensSize: 128,        // base; lens 1 is rendered 1.45× larger (see setupLens)
  magnifyScale: 1,
  liquidEnabled: true,
  liquidStretch: 0.16,
  chromaticAberration: true,
  chromaticStrength: 0.2,
};
