import styled from 'styled-components';

// The travel path — a chronological route of city maps (Huangshan → Beijing → Shanghai →
// Dallas) joined by a loose dashed line, all revealed only under a lens (see lensEngine
// buildLensWorld's [data-lens-reveal] flip). Every piece lives invisibly (opacity:0),
// pointer-events:none so the invisible bases can't intercept a lens drag; z-index below the
// lenses (8), above the split-stage videos so it reads inside the clone.
//
// Dallas is the terminus and the only stop with a pin + a baked-in name — the three
// upstream stops are deliberately unlabeled miniatures. Their art is pre-cropped to the
// landmark cluster, so each renders 1:1 into its box (source is @2x) under a radial mask
// that dissolves the map lines into the cloned video. Dallas's art is NOT pre-cropped; its
// ZOOM/FOCUS dials window into the pin cluster instead (see its entry).
//
// Everything except Dallas hides below the xl breakpoint — a narrow window has no room for
// three maps around the lockup, and a partial route (dangling dashes) would read as broken,
// so the route is all-or-nothing. The gate is a CSS media query (not a mount-time check):
// the lens worlds are clones in the same document, so it applies inside them and tracks
// live window resizes for free.

interface Stop {
  img: string;
  cx: number;         // box centre, % of viewport width — shared with the path endpoints
  cy: number;         // box centre, % of viewport height
  w: number;          // box size, px (art renders 1:1 — pre-cropped @2x source)
  h: number;
}

const STOPS: Stop[] = [
  { img: '/huangshan-map@2x.webp', cx: 30, cy: 31, w: 224, h: 182 },
  { img: '/beijing-map@2x.webp', cx: 60, cy: 15, w: 192, h: 149 },
  { img: '/shanghai-map@2x.webp', cx: 72, cy: 37, w: 228, h: 192 },
];

// Fade must reach full transparency INSIDE the box so the rectangle's own edge never shows.
const STOP_MASK =
  'radial-gradient(46% 46% at 50% 50%, #000 0%, #000 55%, rgba(0,0,0,0) 100%)';

// --- Dallas (unchanged from the retired DallasPin.tsx — the route's terminus) ---
//
// The source art (800×534) is mostly empty map: the pin sits at ~57%/33% and "DALLAS" just
// below it. We zoom into that cluster with background-size (so the pin + text read at lens
// scale rather than as a few faint pixels) and centre the window between them. The radial
// mask keeps that core opaque and dissolves the surrounding map lines into the cloned video
// at the disc edge. ZOOM / FOCUS / MASK are the three dials — nudge them live if needed.
// The lens itself only magnifies ~1.15×, so ZOOM is close to 1:1 — it exists mainly to crop
// the art's own paper edges out of the box and recentre the pin + DALLAS, not to enlarge.
const DALLAS_ZOOM = '330px';   // art width inside the 300px box → ~1:1
const DALLAS_FOCUS = '83% 0%'; // sit the pin (~57/33) + DALLAS (~50/52) cluster at centre
const DALLAS_MASK =
  'radial-gradient(40% 42% at 50% 44%, #000 0%, #000 52%, rgba(0,0,0,0) 100%)';
const DALLAS_SCALE = 0.85;     // scales disc + content uniformly about the centre

// The dashed route in a 1000×562 box stretched over the viewport (preserveAspectRatio
// "none"), so path coords are viewport percentages ×10/×5.62 and stop centres line up with
// the STOPS config. vector-effect: non-scaling-stroke keeps the stroke and dash rhythm in
// screen px despite the non-uniform stretch. Drawn before the maps in DOM order, so the
// dissolved map cores paint over the line's endpoints.
//
// The route crosses the seam, and each half carries its own ink (the same rule StackReveal
// follows): one path painted twice, dark ink clipped to the light half, light ink to the
// dark half, switching hard at x=500 (the 50% seam).
// The Shanghai→Dallas leg swings its little loop through the pocket between the lockup's
// AI stack chips (ending ~x 600 / y 350) and Ollie's caption block (starting ~x 565 /
// y 410) — right of the chips, above the caption — then runs to Dallas under the chips.
// The final point stops short of the Dallas map's dissolve (Dallas is %+px positioned, so
// its exact centre isn't expressible in these viewport-relative coords — the trim plays
// the same role the mask holes (below) play for the three % stops).
const ROUTE =
  'M300,174 C380,110 490,68 600,84 C680,98 702,148 720,208 ' +
  'C740,282 706,340 662,366 C632,378 620,402 646,404 C672,406 668,376 642,378 ' +
  'C560,394 480,420 450,437';

// Dash gaps around the three % stops: holes punched in the route's mask, sized to each
// map's dissolve extent (~half the box) plus a breath of clearance. Ellipse radii are
// viewBox units calibrated at the 1280px gate (units grow with the viewport, so wider
// windows only get more clearance, never a touch).
const HOLES: Array<{ cx: number; cy: number; rx: number; ry: number }> = [
  { cx: 300, cy: 174, rx: 88, ry: 67 },   // huangshan
  { cx: 600, cy: 84, rx: 75, ry: 55 },    // beijing
  { cx: 720, cy: 208, rx: 89, ry: 71 },   // shanghai
  { cx: 715, cy: 305, rx: 18, ry: 15 },   // the plane (22px glyph + clearance)
];

// All-or-nothing gate for the three upstream stops + the route. display:contents so the
// absolutely-positioned children keep resolving against the hero root, not this wrapper.
const RouteGate = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.xl}) {
    display: contents;
  }
`;

const TravelPath: React.FC = () => (
  <>
    <RouteGate aria-hidden="true">
      <svg
        data-lens-reveal
        data-reveal-opacity="0.9"
        viewBox="0 0 1000 562"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 7,
        }}
      >
        <defs>
          <clipPath id="route-light-half"><rect x="0" y="0" width="500" height="562" /></clipPath>
          <clipPath id="route-dark-half"><rect x="500" y="0" width="500" height="562" /></clipPath>
          <mask id="route-gaps">
            <rect width="1000" height="562" fill="#fff" />
            {HOLES.map((h) => (
              <ellipse key={h.cx} cx={h.cx} cy={h.cy} rx={h.rx} ry={h.ry} fill="#000" />
            ))}
          </mask>
        </defs>
        <g mask="url(#route-gaps)">
          {(
            [
              ['route-light-half', 'oklch(0.35 0.004 265 / 0.65)'],
              ['route-dark-half', 'oklch(0.95 0.003 265 / 0.6)'],
            ] as const
          ).map(([clip, ink]) => (
            <path
              key={clip}
              clipPath={`url(#${clip})`}
              d={ROUTE}
              fill="none"
              stroke={ink}
              strokeWidth="1.5"
              strokeDasharray="7 9"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
      {/* A plane in flight on the Shanghai→Dallas leg. Its own fixed-px svg (the route's
          stretched viewBox would distort a glyph; a ✈ text glyph would be font/emoji-
          dependent), anchored to the leg's cubic at t=0.5 — (715,305) in route units, i.e.
          exactly 71.5%/54.3% — and rotated to the curve's local heading there (down-left,
          ~204° from the glyph's nose-up rest). Dark half → light ink, like the dashes. */}
      <svg
        data-lens-reveal
        data-reveal-opacity="0.9"
        viewBox="0 0 24 24"
        width={22}
        height={22}
        style={{
          position: 'absolute',
          left: '71.5%',
          top: '54.3%',
          transform: 'translate(-50%, -50%) rotate(204deg)',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 7,
        }}
      >
        <path
          d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"
          fill="oklch(0.95 0.003 265 / 0.75)"
        />
      </svg>
      {STOPS.map((s) => {
        // Stops on the dark half get sunk toward the plate: the art's light paper reads as
        // a bright ellipse against the dark video even under the dissolve, so darken it and
        // let more of the ground through (the same surface-awareness rule the route's ink
        // follows). The seam at 50% decides, like the route's clip.
        const onDark = s.cx >= 50;
        return (
          <div
            key={s.img}
            data-lens-reveal
            data-reveal-opacity={onDark ? '0.65' : '0.8'}
            style={{
              position: 'absolute',
              left: `${s.cx}%`,
              top: `${s.cy}%`,
              width: s.w,
              height: s.h,
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: 7,
              backgroundImage: `url(${s.img})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
              filter: onDark ? 'brightness(0.72) contrast(1.06)' : undefined,
              WebkitMask: STOP_MASK,
              mask: STOP_MASK,
            }}
          />
        );
      })}
    </RouteGate>
    <div
      data-lens-reveal
      data-reveal-opacity="0.8"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '27%',
        bottom: '5%',
        width: 300,
        height: 210,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 7,
        backgroundImage: 'url(/dallas-map-pin@2x.webp)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${DALLAS_ZOOM} auto`,
        backgroundPosition: DALLAS_FOCUS,
        WebkitMask: DALLAS_MASK,
        mask: DALLAS_MASK,
        transform: `scale(${DALLAS_SCALE})`,
      }}
    />
  </>
);

export default TravelPath;
