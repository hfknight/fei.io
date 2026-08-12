import styled, { keyframes } from 'styled-components';
import StackReveal from './StackReveal';

// the recede's anticipation beat: the bracket frame puffs outward before the box dives.
const brkPop = keyframes`
  0% { transform: scale(1); }
  45% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// Center-top lockup — ported from design source lines 113-126. [data-brk-frame] /
// [data-hair] start hidden (opacity:0); [data-logo] is the feather mark. Both are
// engine-controlled hooks wired by later tasks (Task 3/4/5), so their initial inline
// styles are kept verbatim here rather than folded into the styled-components below.
const Wrapper = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(var(--lockup-scale, 1));
  z-index: 8;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 22px 38px;
  /* never let the lockup push past the viewport (no horizontal page scroll) */
  max-width: 100vw;

  /* The recede (see CONTEXT.md): while a lens is dragged, lensEngine sets
     data-lockup-recede on <html> and the lockup steps back to make room for the travel
     path. Expressed as a CSS var + attribute rule ABOVE the clone boundary so the live
     lockup and every [data-lens-world] copy animate in lockstep — no per-frame JS sync.
     Release path (this base rule): plain ease-out, no anticipation. */
  transition: transform 0.4s ${p => p.theme.ease.expo};

  html[data-lockup-recede] & {
    --lockup-scale: 0.7;
    /* delayed past the bracket pop; y > 1 = one damped overshoot (lens dialect, not
       the page language — the entrance-easing "never bounce" rule doesn't govern the
       lens apparatus, which is springy throughout) */
    transition: transform 0.5s 0.12s cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  html[data-lockup-recede] & [data-brk-frame] {
    animation: ${brkPop} 0.26s ${p => p.theme.ease.expo};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 16px 20px;
  }
`;

const Tagline = styled.div`
  font-family: ${p => p.theme.font.display};
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  margin-bottom: 13px;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    font-size: 9px;
    letter-spacing: 0.28em;
    margin-bottom: 10px;
  }
`;

const Title = styled.h1`
  font-family: ${p => p.theme.font.display};
  font-weight: 700;
  font-size: clamp(52px, 6vw, 104px);
  line-height: 0.92;
  letter-spacing: -0.045em;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  column-gap: 0.22em;

  /* scale the hero down on phones so "I'm [logo] Fei" fits without overflowing */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    font-size: clamp(34px, 11vw, 56px);
  }
`;

const Roles = styled.div`
  font-family: ${p => p.theme.font.display};
  margin-top: 18px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;
  align-items: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    margin-top: 12px;
    font-size: 11px;
    column-gap: 12px;
  }
`;

// shared corner-bracket geometry (source 116-119); each corner overrides the two
// border sides that face outward.
const hairBase: React.CSSProperties = {
  position: 'absolute',
  width: 22,
  height: 22,
  transition: 'border-color .5s ease,filter .5s ease',
};

// gradient text-fill spans (source 122-124) — oklch stops kept verbatim.
const gradientText = (background: string): React.CSSProperties => ({
  background,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
});

const Lockup: React.FC<{ interactive?: boolean }> = ({ interactive = false }) => (
  <Wrapper>
    <div data-brk-frame style={{ position: 'absolute', inset: 0, opacity: 0 }}>
      {/* DOM order is load-bearing: landingEngine.ts indexes these four [data-hair]
          elements by position (i === 0 || i === 2 are the two LEFT-side brackets) to
          tint them for glow — reordering these divs would mis-tint the brackets. */}
      <div
        data-hair
        style={{ ...hairBase, top: 0, left: 0, borderTop: '1.5px solid rgba(255,255,255,.28)', borderLeft: '1.5px solid rgba(255,255,255,.28)' }}
      />
      <div
        data-hair
        style={{ ...hairBase, top: 0, right: 0, borderTop: '1.5px solid rgba(255,255,255,.28)', borderRight: '1.5px solid rgba(255,255,255,.28)' }}
      />
      <div
        data-hair
        style={{ ...hairBase, bottom: 0, left: 0, borderBottom: '1.5px solid rgba(255,255,255,.28)', borderLeft: '1.5px solid rgba(255,255,255,.28)' }}
      />
      <div
        data-hair
        style={{ ...hairBase, bottom: 0, right: 0, borderBottom: '1.5px solid rgba(255,255,255,.28)', borderRight: '1.5px solid rgba(255,255,255,.28)' }}
      />
    </div>

    <Tagline
      style={gradientText(
        'linear-gradient(90deg,oklch(0.26 0.010 265) 0%,oklch(0.40 0.009 265) 30%,oklch(0.56 0.008 265) 49.6%,oklch(0.88 0.004 265) 50.4%,oklch(0.985 0.002 265) 100%)'
      )}
    >
      Elegance. Precision. Intuition
    </Tagline>

    <Title>
      <span style={{ textAlign: 'right', ...gradientText('linear-gradient(90deg,oklch(0.28 0.010 265 / 0.9) 0%,oklch(0.55 0.008 265 / 0.8) 100%)') }}>
        I'm
      </span>
      <svg
        data-logo
        data-logo-variant="split"
        viewBox="0 0 140 390"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: '1.02em', width: 'auto', display: 'block', transform: 'translate(0px, 2px)', transition: 'filter .5s ease' }}
      >
        <path d="M60 195.588V322.076L0 278.791V151.996L60 195.588ZM60 170.867L0 127.274V69.291C0 34.0263 26.0771 4.8523 60 0V170.867Z" fill="oklch(0.55 0.008 265)" />
        <path
          d="M140 278.791L80 322.076V267.188L140 223.596V278.791ZM140 198.874L80 242.468V195.188L140 151.596V198.874ZM80 0C113.923 4.8523 140 34.0263 140 69.291V126.874L80 170.468V0Z"
          fill="oklch(0.99 0.002 265)"
        />
        <path
          d="M80 343.291L80 333.291L60 333.291L60 343.291L70 343.291L80 343.291ZM60 379.291C60 384.814 64.4772 389.291 70 389.291C75.5228 389.291 80 384.814 80 379.291L70 379.291L60 379.291ZM70 343.291L60 343.291L60 379.291L70 379.291L80 379.291L80 343.291L70 343.291Z"
          fill="oklch(0.99 0.002 265)"
        />
      </svg>
      <span style={{ textAlign: 'left', ...gradientText('linear-gradient(90deg,oklch(0.92 0.004 265 / 0.72) 0%,oklch(0.99 0.002 265 / 0.78) 100%)') }}>
        Fei
      </span>
    </Title>

    <Roles>
      <span
        style={{ position: 'relative', textAlign: 'right', whiteSpace: 'nowrap', ...gradientText('linear-gradient(90deg,oklch(0.26 0.010 265) 0%,oklch(0.54 0.008 265) 100%)') }}
      >
        Full-Stack Engineer
        {/* Hidden stacks, revealed only under a lens centred on each role (see StackReveal) */}
        {interactive && <StackReveal role="frontend" />}
      </span>
      <span
        style={{ position: 'relative', textAlign: 'left', whiteSpace: 'nowrap', ...gradientText('linear-gradient(90deg,oklch(0.90 0.004 265) 0%,oklch(0.985 0.002 265) 100%)') }}
      >
        AI Product Engineer
        {interactive && <StackReveal role="ai" />}
      </span>
    </Roles>
  </Wrapper>
);

export default Lockup;
