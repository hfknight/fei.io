import { useState } from 'react';
import styled, { css } from 'styled-components';

interface SplitStageProps {
  /** True when `index.tsx`'s `interactive` is false — see landingEngine's matching
   *  gate. Renders still frames instead of the head-tracked clips, and skips the
   *  fetch/decode entirely. */
  stills?: boolean;
}

// Touch's own capability gate (the landing's `canHover` negated): no fine-hover
// pointer to drive the head-track, so the halves stack top/bottom instead of
// left/right and read top-to-bottom like the rest of the mobile page. Exported for
// Lockup, whose seam-split ink gradients assume the seam is vertical and re-aim
// under the same gate.
export const TOUCH = '@media (hover: none), (pointer: coarse)';

const Stage = styled.div`
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  background: #26272b;

  ${TOUCH} {
    flex-direction: column;

    [data-seam-fx] {
      display: none;
    }
  }
`;
const Half = styled.div`
  position: relative;
  width: 50%;
  height: 100%;
  overflow: hidden;

  ${TOUCH} {
    width: 100%;
    height: 50dvh;
  }
`;
const Left = styled(Half)`background:linear-gradient(120deg,#e9eaeb 0%,#d4d6d8 100%);`;
const Right = styled(Half)`background:linear-gradient(120deg,#54565b 0%,#33343a 100%);`;

// Both the video and the still share one crop/fade recipe. Object-position is a prop
// (not inline, as it used to be for Vid) so the touch override below can win over it —
// a media query cannot outrank an inline style. Stacked mode reframes to the left
// third of the source frame: both pets sit there, and a full-width 50dvh cover crop
// centred on the pair would cut them off.
const media = css<{ $objectPosition: string }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: ${p => p.$objectPosition};
  opacity: 0;
  transition: opacity .9s ease;

  ${TOUCH} {
    object-position: left center;
  }
`;
const Vid = styled.video<{ $objectPosition: string }>`${media}`;
const Img = styled.img<{ $objectPosition: string }>`${media}`;

/**
 * `Vid` fades in via the engine flipping `style.opacity` once the clip can play.
 * Stills have no engine driving them, so the fade is handled here: `onLoad`, plus
 * the cached-image case where the browser never fires it because the image was
 * already complete by the time this mounted.
 */
const Still: React.FC<{ src: string; objectPosition: string; mirror?: boolean }> = ({ src, objectPosition, mirror }) => {
  const [loaded, setLoaded] = useState(false);
  // A callback ref, not useRef + useEffect: this runs synchronously at commit, when
  // the node (possibly already `complete` — the cached-image case) first attaches,
  // rather than deferred to an effect that would need its own setState-on-mount.
  const setRef = (node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  };
  return (
    <Img
      ref={setRef}
      src={src}
      alt=""
      $objectPosition={objectPosition}
      onLoad={() => setLoaded(true)}
      style={{
        ...(mirror ? { transform: 'scaleX(-1)' } : undefined),
        ...(loaded ? { opacity: 1 } : undefined),
      }}
    />
  );
};

// Engine-controlled nodes carry their initial inline styles here and are mutated by
// landingEngine via element.style.*. Overlay divs below are ported verbatim from the
// design source (2026-07-08-landing-redesign-source.dc.html) lines 80-102, except the
// two marked `data-seam-fx`: both model light meeting at the vertical seam (a
// directional fade toward the middle, a light bleed across it) and read wrong once
// the seam runs horizontal, so they hide in stacked/touch mode along with the seam
// hairline itself. Hiding a seam-specific ornament is simpler than re-deriving it for
// the other axis.
const SplitStage: React.FC<SplitStageProps> = ({ stills = false }) => (
  <Stage data-stage>
    <Left>
      {stills ? (
        <Still src="/jojo-still@2x.webp" objectPosition="14% 66%" />
      ) : (
        <Vid data-jojo data-src="/jojo-clip-2.mp4" muted playsInline preload="auto"
             $objectPosition="14% 66%" />
      )}
      {/* light-side gradient (source 83) + inner shadow (84) + frost overlay (86) */}
      <div data-seam-fx style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(233,234,235,0) 50%,rgba(233,234,235,.35) 84%,rgba(226,227,229,.7) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 200px rgba(70,72,76,.14)', pointerEvents: 'none' }} />
      <div data-frost-l style={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .55s ease', pointerEvents: 'none', zIndex: 4 }} />
    </Left>
    <Right>
      {stills ? (
        // Mirrored like the clip, so the reduced-motion desktop framing is unchanged
        // and, stacked on touch, the two pets face inward toward the lockup.
        <Still src="/ollie-still@2x.webp" objectPosition="36% 70%" mirror />
      ) : (
        <Vid data-ollie data-src="/ollie-clip-4.mp4" muted playsInline preload="auto"
             $objectPosition="36% 70%" style={{ transform: 'scaleX(-1)' }} />
      )}
      {/* dark-side gradient (source 92) + inner shadow (93) + light bleed across seam (95) + frost overlay (97) */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg,rgba(40,41,45,0) 60%,rgba(36,37,41,.34) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 220px rgba(15,16,19,.34)', pointerEvents: 'none' }} />
      <div data-seam-fx style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(255,253,248,.22) 0%,rgba(255,253,248,.08) 14%,rgba(255,253,248,0) 34%)', pointerEvents: 'none', zIndex: 1 }} />
      <div data-frost-r style={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .55s ease', pointerEvents: 'none', zIndex: 4 }} />
    </Right>
    {/* center seam — source 100-102 */}
    <div data-seam data-seam-fx style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, transform: 'translateX(-.5px)', background: 'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.28) 30%,rgba(255,255,255,.28) 70%,rgba(255,255,255,0) 100%)', pointerEvents: 'none', zIndex: 6 }} />
  </Stage>
);
export default SplitStage;
