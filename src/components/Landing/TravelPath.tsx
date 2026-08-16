import styled, { keyframes } from 'styled-components';

// The travel path — a chronological route of city maps (Huangshan → Beijing → Shanghai →
// Dallas) joined by a loose dashed line, all revealed only under a lens (see lensEngine
// buildLensWorld's [data-lens-reveal] flip). Every piece lives invisibly (opacity:0),
// pointer-events:none so the invisible bases can't intercept a lens drag; z-index below the
// lenses (8), above the split-stage videos so it reads inside the clone.
//
// Dallas is the terminus and the only stop with a pin + a baked-in name — the three
// upstream stops are deliberately unlabeled miniatures. Each is framed as a perforated
// postage stamp (see the STAMP_* dials): a neutral-paper card die-cut with semicircular
// perforation notches, the animated map hard-cropped inside it. The three memories are
// mailed artifacts; Dallas is NOT one — its art dissolves into the living video via a
// radial mask, because home is the present, not a memory. Dallas's art is also not
// pre-cropped; its ZOOM/FOCUS dials window into the pin cluster instead (see its entry).
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
  w: number;          // ART size, px (renders 1:1 — pre-cropped @2x source); the stamp
  h: number;          // card is STAMP_INSET larger on every side
  rot: number;        // scatter rotation, deg — prints laid on a table, not a UI grid
}

// Animated WebP loops (from the map videos, cropped to the landmark cluster at encode
// time — the same pre-crop the old stills baked in, so 1:1 rendering still holds).
// Boxes sat ~15% larger than the still era (the lockup recedes during a drag, so the
// route has more room), then came back down ~10% for the stamp frame: the hard crop
// shows the whole rectangle where the dissolve faded its outer third, so the same art
// reads bigger at a smaller box. Animated WebP (not <video>) is load-bearing: browsers animate an
// image resource in every element painting it, so the lens-world clones stay in frame
// sync with zero engine involvement.
const STOPS: Stop[] = [
  { img: '/huangshan-map-loop@2x.webp', cx: 30, cy: 31, w: 232, h: 189, rot: -4.5 },
  { img: '/beijing-map-loop@2x.webp', cx: 60, cy: 15, w: 223, h: 174, rot: 3 },
  { img: '/shanghai-map-loop@2x.webp', cx: 70.5, cy: 35, w: 190, h: 160, rot: -2 },
];

// --- The stamp frame ---
//
// Paper border between the perforation line and the art. Must exceed STAMP_HOLE_R so the
// notches never bite into the map.
const STAMP_INSET = 10;
// Perforation dials: notch radius + target pitch. The pitch is rounded per edge so a
// whole number of notches lands on each side and the corners always get one (real
// perforation tears through the corner hole).
const STAMP_HOLE_R = 3.5;
const STAMP_PITCH = 12;
// The stamps are printed on the house paper stock: this is the light surface's literal
// value (--color-surface on light pages — the token itself can't be used here, because
// the landing is permanently inverted and the var resolves dark). Same paper on both
// halves — a print doesn't theme with its surface; the pale card glowing on Ollie's dark
// half is how photo prints look at night. Deliberately opaque AND deliberately grey, not
// white: the lens's chromatic-aberration screen-blend washes fills toward light (the
// StackReveal lesson), so grey paper reads as clean white under the glass where a true
// white would bloom.
const STAMP_PAPER = 'oklch(0.913 0.0013 106.4)';

// The die-cut, as a CSS mask-image. A data-URI SVG rather than gradient layers: union
// compositing can't punch holes, mask-composite support is uneven, and an SVG gives
// exact corner handling at each card's aspect. The <mask> id is private to the image's
// own document, so this sidesteps the url(#id) first-in-document-order trap that the
// route's in-page defs have to work around.
const stampMask = (w: number, h: number): string => {
  const holes: string[] = [];
  const nx = Math.round(w / STAMP_PITCH);
  const ny = Math.round(h / STAMP_PITCH);
  for (let i = 0; i <= nx; i++) {
    const x = (w / nx) * i;
    holes.push(`<circle cx="${x}" cy="0" r="${STAMP_HOLE_R}"/>`);
    holes.push(`<circle cx="${x}" cy="${h}" r="${STAMP_HOLE_R}"/>`);
  }
  for (let j = 1; j < ny; j++) {
    const y = (h / ny) * j;
    holes.push(`<circle cx="0" cy="${y}" r="${STAMP_HOLE_R}"/>`);
    holes.push(`<circle cx="${w}" cy="${y}" r="${STAMP_HOLE_R}"/>`);
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
    `<mask id="m"><rect width="${w}" height="${h}" fill="#fff"/>` +
    `<g fill="#000">${holes.join('')}</g></mask>` +
    `<rect width="${w}" height="${h}" fill="#fff" mask="url(#m)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

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

// Dash gaps punched in the route's mask. The dissolve era needed one per map (a dashed
// line marching through a half-transparent smudge read as a glitch); the stamps are
// opaque cards painted AFTER the route in DOM order, so their legs simply tuck under the
// card edge — the line goes under the print, no hole required. Ellipse radii are viewBox
// units calibrated at the 1280px gate (units grow with the viewport, so wider windows
// only get more clearance, never a touch).
const HOLES: Array<{ cx: number; cy: number; rx: number; ry: number }> = [
  { cx: 698, cy: 334, rx: 18, ry: 15 },   // the plane (22px glyph + clearance)
  // The whole Beijing→Shanghai leg: their cards stack corner-to-corner, and the two or
  // three dashes surviving in that sliver read as leftover, not route — the adjacency
  // itself says "next stop". The ellipse spans the gap between the card centres; its
  // overshoot lands under the opaque cards, so it can't eat any other leg.
  { cx: 660, cy: 146, rx: 75, ry: 75 },
];

// The dashes march toward Dallas — one dash cycle (7 dash + 9 gap) per loop, so the
// drift is seamless. LINEAR is load-bearing: any easing makes the march pulse. Declared
// in CSS (not JS) so the lens-world clones animate too; direction follows the path's
// authored order, which is the journey's chronology.
//
// The march runs ONLY while a lens is held (html[data-lens-drag], set by lensEngine's
// drag handlers — above the clone boundary, so all worlds gate in lockstep, the same
// channel data-lockup-recede rides). stroke-dashoffset is a paint-invalidating animation
// on a viewport-wide svg, repainted every frame in all three lens worlds at device DPR —
// measured as a video-scrub hitch (the flash) whenever it ran. The march is only ever
// VISIBLE under a held lens, so pausing it at rest costs nothing but a frozen dash.
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
    animation-play-state: paused;
  }

  html[data-lens-drag] & [data-route] path {
    animation-play-state: running;
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
        {/* visibility:visible is load-bearing. url(#route-gaps) resolves to the FIRST id in
            document order — this base copy's — from every lens-world clone. The base svg is
            visibility:hidden (the [data-lens-reveal] depaint), and mask CONTENT inherits
            that: a hidden white rect admits no paint, the mask goes empty, and the route
            vanishes in every world. Re-declaring visible on the defs subtree keeps the
            resources functional; defs never render directly, so nothing shows on the page. */}
        <defs style={{ visibility: 'visible' }}>
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
          lit landmarks — inside the shared neutral paper, so each print echoes its plate
          while the card stays a card.
          Structure is two nested layers, and the split is load-bearing: filters apply
          BEFORE mask in the paint order, so a drop-shadow on the masked element would be
          clipped by its own die-cut. The wrapper carries the shadow (drop-shadow, not
          box-shadow, so it traces the perforated silhouette); the paper layer carries the
          mask. The shadow stays black on both halves — cast, not reflected. Full reveal
          opacity (no data-reveal-opacity): a translucent print breaks the object, and it
          is what lets the route legs hide under the card. */}
      {STOPS.map((s) => {
        const bw = s.w + 2 * STAMP_INSET;
        const bh = s.h + 2 * STAMP_INSET;
        const mask = stampMask(bw, bh);
        return (
          <div
            key={s.img}
            data-lens-reveal
            style={{
              position: 'absolute',
              left: `${s.cx}%`,
              top: `${s.cy}%`,
              width: bw,
              height: bh,
              transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
              opacity: 0,
              pointerEvents: 'none',
              zIndex: 7,
              filter: 'drop-shadow(0 8px 16px oklch(0 0 0 / 0.35))',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: STAMP_PAPER,
                WebkitMaskImage: mask,
                maskImage: mask,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: STAMP_INSET,
                backgroundImage: `url(${s.img})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%',
              }}
            />
          </div>
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
