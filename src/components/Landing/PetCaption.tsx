import styled from 'styled-components';

import { TOUCH } from './SplitStage';

interface Props {
  pet: 'j' | 'o';
}

// Per-pet caption — ported from design source lines 127-138 (Jojo, light side) and
// 150-156 (Ollie, dark side). [data-pet-cap] starts hidden (opacity:0, offset by
// translateX); the loader (Task 4) reveals it by animating those same inline styles,
// so they're kept verbatim here rather than folded into the styled-components below.
const Cap = styled.div`
  position: absolute;
  max-width: 230px;
  z-index: 8;
  pointer-events: none;
  text-align: left;

  /* The captions sit in the video halves flanking the centered lockup; below the
     lg breakpoint they'd collide with it, so drop them (the spec allows
     simplifying/hiding captions on narrow screens). Keeps the 50/50 split clean. */
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }

  /* Desktop position: flanks the lockup at its natural width. */
  &[data-pet-cap='j'] {
    left: 11.5rem;
    top: 88px;
  }
  &[data-pet-cap='o'] {
    left: calc(50% + 6rem);
    bottom: 88px;
  }

  /* Between the lg hide-gate and xl, the cover-cropped pet videos fill most of
     each pane and the desktop offsets land on the pets' faces. Pull both
     captions in to hug the centre seam, near the top, the emptiest region of
     the composition at these widths. */
  @media (max-width: ${({ theme }) => theme.breakpoints.xl}) {
    &[data-pet-cap='j'] {
      left: auto;
      right: calc(50% + 1.5rem);
      top: 88px;
    }
    &[data-pet-cap='o'] {
      left: calc(50% + 1.5rem);
      top: 88px;
      bottom: auto;
    }
  }

  /* Touch stacks the halves top/bottom at ANY width (see SplitStage), so the seam is
     horizontal and "50% + x" no longer means a pane edge — the xl rule above would park
     Ollie's white ink on the light half. Both captions share ONE column just left of the
     centre line, mirrored about the seam: Jojo top 88 beside the cat, Ollie bottom 88
     beside the dog — the region both pets leave free at every stacked width. After the
     xl block so it wins where both apply. */
  ${TOUCH} {
    &[data-pet-cap='j'] {
      left: auto;
      right: calc(50% + 1.5rem);
      top: 88px;
      bottom: auto;
    }
    &[data-pet-cap='o'] {
      left: auto;
      right: calc(50% + 1.5rem);
      top: auto;
      bottom: 88px;
    }
  }
`;

const Name = styled.div`
  font-family: ${p => p.theme.font.display};
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: 8px;
`;

const Blurb = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
`;

const PetCaption: React.FC<Props> = ({ pet }) =>
  pet === 'j' ? (
    <Cap
      data-pet-cap="j"
      style={{
        opacity: 0,
        transform: 'translateX(-26px)',
        transition: 'opacity .26s ease, transform .32s cubic-bezier(.2, .8, .2, 1)',
      }}
    >
      <Name style={{ color: 'oklch(0.42 0.008 265 / 0.85)' }}>Jojo</Name>
      <Blurb style={{ color: 'oklch(0.45 0.006 265 / 0.8)' }}>
        Remarkably patient, endlessly tolerant, zen enough to sunbathe belly-up while the whole stack reloads.
        A sharp eye, refined taste, and a quiet command of the craft.
      </Blurb>
      <svg
        viewBox="0 0 34 34"
        width="19"
        height="19"
        fill="none"
        style={{ position: 'absolute', bottom: -30, left: '-2rem', overflow: 'visible' }}
        stroke="oklch(0.45 0.008 265 / 0.82)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 11 L3 31" />
        <path d="M3 31 L24 31 M3 31 L3 10" />
      </svg>
    </Cap>
  ) : (
    <Cap
      data-pet-cap="o"
      style={{
        opacity: 0,
        transform: 'translateX(26px)',
        transition: 'opacity .26s ease, transform .32s cubic-bezier(.2, .8, .2, 1)',
      }}
    >
      <Name style={{ color: 'oklch(0.96 0.004 265 / 0.85)' }}>Ollie</Name>
      <Blurb style={{ color: 'oklch(0.94 0.004 265 / 0.8)' }}>
        All warmth and soul, happiest bounding after whatever moves, be it a rabbit or the next idea worth building.
        Loyal company, headstrong when it counts, with instincts she trusts enough to ship.
      </Blurb>
      <svg
        viewBox="0 0 34 34"
        width="19"
        height="19"
        fill="none"
        style={{ position: 'absolute', top: -30, right: '-2rem', overflow: 'visible' }}
        stroke="oklch(0.94 0.004 265 / 0.85)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 23 L31 3" />
        <path d="M31 3 L10 3 M31 3 L31 24" />
      </svg>
    </Cap>
  );

export default PetCaption;
