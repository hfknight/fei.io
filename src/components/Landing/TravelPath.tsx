import styled, { keyframes } from 'styled-components';

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

// Animated WebP loops (from the map videos, cropped to the landmark cluster at encode
// time — the same pre-crop the old stills baked in, so 1:1 rendering still holds).
// Boxes run ~15% larger than the still era: the lockup recedes during a drag, so the
// route has more room. Animated WebP (not <video>) is load-bearing: browsers animate an
// image resource in every element painting it, so the lens-world clones stay in frame
// sync with zero engine involvement.
const STOPS: Stop[] = [
  { img: '/huangshan-map-loop@2x.webp', cx: 30, cy: 31, w: 258, h: 210 },
  { img: '/beijing-map-loop@2x.webp', cx: 60, cy: 15, w: 248, h: 193 },
  { img: '/shanghai-map-loop@2x.webp', cx: 72, cy: 37, w: 262, h: 221 },
];

// Fade must reach full transparency INSIDE the box so the rectangle's own edge never shows.
const STOP_MASK =
  'radial-gradient(46% 46% at 50% 50%, #000 0%, #000 55%, rgba(0,0,0,0) 100%)';

// --- Dallas (the route's terminus) ---
//
// The art is an animated loop (840×630 @2x): the skyline landmarks morph into the map
// pin and back, so the terminus keeps its pin half the time. Unlike the three upstream
// stops it is NOT pre-cropped — the cluster + "DALLAS" sit centred in a wide map field —
// so we window into it with background-size/position. The radial mask keeps that core
// opaque and dissolves the surrounding map lines into the cloned video at the disc edge.
// ZOOM / FOCUS / MASK are the three dials — nudge them live if needed. The lens itself
// only magnifies ~1.15×, so ZOOM is close to 1:1 — it crops the art's margins out of the
// box and centres the cluster, not enlarges it.
const DALLAS_ZOOM = '420px';   // art width inside the 300px box (cluster ≈ 40% of art)
const DALLAS_FOCUS = '53% 44%'; // centre the skyline (~51/45) + DALLAS (~51/55) cluster
const DALLAS_MASK =
  'radial-gradient(42% 44% at 50% 48%, #000 0%, #000 52%, rgba(0,0,0,0) 100%)';
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
// Beijing + Shanghai hug the visible-art edge with no breath: their connecting leg is
// the route's shortest, and half-box + clearance radii left it only a dash or two.
const HOLES: Array<{ cx: number; cy: number; rx: number; ry: number }> = [
  { cx: 300, cy: 174, rx: 101, ry: 77 },  // huangshan
  { cx: 600, cy: 84, rx: 86, ry: 60 },    // beijing
  { cx: 720, cy: 208, rx: 90, ry: 68 },   // shanghai
  { cx: 698, cy: 334, rx: 18, ry: 15 },   // the plane (22px glyph + clearance)
];

// The dashes march toward Dallas — one dash cycle (7 dash + 9 gap) per loop, so the
// drift is seamless. LINEAR is load-bearing: any easing makes the march pulse. Declared
// in CSS (not JS) so the lens-world clones animate too; direction follows the path's
// authored order, which is the journey's chronology.
const march = keyframes`
  to { stroke-dashoffset: -16; }
`;

// All-or-nothing gate for the three upstream stops + the route. display:contents so the
// absolutely-positioned children keep resolving against the hero root, not this wrapper.
const RouteGate = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.xl}) {
    display: contents;
  }

  [data-route] path {
    animation: ${march} 1.6s linear infinite;
  }
`;

const TravelPath: React.FC = () => (
  <>
    <RouteGate aria-hidden="true">
      <svg
        data-route
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
          dependent), anchored to the leg's cubic at t=0.7 — (698,334) in route units, i.e.
          69.8%/59.4% — far enough from Shanghai's dissolve that dashes show on both sides
          of it, and rotated to the curve's local heading there (down-left, ~218° from the
          glyph's nose-up rest). Dark half → light ink, like the dashes. */}
      <svg
        data-lens-reveal
        data-reveal-opacity="0.9"
        viewBox="0 0 24 24"
        width={22}
        height={22}
        style={{
          position: 'absolute',
          left: '69.8%',
          top: '59.4%',
          transform: 'translate(-50%, -50%) rotate(218deg)',
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
      {/* The two dark-half stops (Beijing, Shanghai) use night-version art — dark ground,
          lit landmarks — so each map natively echoes its plate, the same surface rule the
          route's ink follows. No dimming filter needed. */}
      {STOPS.map((s) => (
        <div
          key={s.img}
          data-lens-reveal
          data-reveal-opacity="0.8"
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
            WebkitMask: STOP_MASK,
            mask: STOP_MASK,
          }}
        />
      ))}
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
        backgroundImage: 'url(/dallas-map-pin-loop@2x.webp)',
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
