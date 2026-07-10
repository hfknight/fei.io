// Dallas map, revealed only under a lens (see lensEngine buildLensWorld's [data-lens-reveal]
// flip). Lives invisibly (opacity:0) in the lower-left light-half pocket, below the lockup and
// clear of Jojo in the bottom-left corner. pointer-events:none so the invisible base can't
// intercept a lens drag; z-index below the lenses (11), above the split-stage videos so it reads
// inside the clone.
//
// The source art (800×534) is mostly empty map: the pin sits at ~57%/33% and "DALLAS" just
// below it. We zoom into that cluster with background-size (so the pin + text read at lens scale
// rather than as a few faint pixels) and centre the window between them. The radial mask keeps
// that core opaque and dissolves the surrounding map lines into the cloned video at the disc
// edge. ZOOM / FOCUS / MASK are the three dials — nudge them live if the framing needs it.

// The lens itself only magnifies ~1.15×, so ZOOM is close to 1:1 — it exists mainly to crop the
// art's own paper edges out of the box (the pin sits high in the source) and to recentre the
// pin + DALLAS into the middle, not to enlarge.
const ZOOM = '330px';      // art width inside the 300px box → ~1:1; the lens does the magnifying
const FOCUS = '83% 0%';    // sit the pin (~57/33) + DALLAS (~50/52) cluster at the box centre
// Fade must reach full transparency INSIDE the box so the rectangle's own edge never shows —
// radii stay short of the box edges, leaving a transparent margin all around.
const MASK =
  'radial-gradient(40% 42% at 50% 44%, #000 0%, #000 52%, rgba(0,0,0,0) 100%)';

const DallasPin: React.FC = () => (
  <div
    data-lens-reveal
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
      backgroundSize: `${ZOOM} auto`,
      backgroundPosition: FOCUS,
      WebkitMask: MASK,
      mask: MASK,
    }}
  />
);

export default DallasPin;
