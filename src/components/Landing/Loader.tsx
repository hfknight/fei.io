import styled from 'styled-components';

// Liquid-glass loading overlay — ported verbatim from design source lines 30-79.
// Curtains part from the center on reveal; the split-logo <h1> fills bottom->top by
// real download progress via [data-fill-rect]'s SVG clip, then 3D-flips (no fade) to
// its final colored form while [data-brk-box] frames the lockup and
// [data-load-lockup]'s [data-lk-fade] children slide in. Every node below is mutated
// imperatively by landingEngine.ts (Task 4: streaming load + loaderTick + finishLoader),
// so inline styles/transitions are kept verbatim rather than folded into styled-components.
const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: opacity 0.4s ease;
`;

// shared curtain-panel gradient (source 34, 37) — identical on both halves.
const CURTAIN_GRADIENT =
  'radial-gradient(120% 110% at 50% 40%,rgba(70,72,78,.68) 0%,rgba(40,41,45,.90) 60%,rgba(26,27,31,.96) 100%)';

// gradient text-fill spans (source 52,54,71,74,75) — oklch stops kept verbatim.
const gradientText = (background: string): React.CSSProperties => ({
  background,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
});

const Loader: React.FC = () => (
  <Root data-loader aria-hidden="true">
    {/* two frosted halves that part from the center like curtains on reveal (33-38) */}
    <div
      data-curtain="l"
      style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', overflow: 'hidden',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        transition: 'transform .38s cubic-bezier(.85,0,.15,1)',
        willChange: 'transform',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: CURTAIN_GRADIENT }} />
    </div>
    <div
      data-curtain="r"
      style={{
        position: 'absolute', top: 0, left: '50%', width: '50%', height: '100%', overflow: 'hidden',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        transition: 'transform .38s cubic-bezier(.85,0,.15,1)',
        willChange: 'transform',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: '-50vw', width: '100vw', height: '100vh', background: CURTAIN_GRADIENT }} />
    </div>

    <div
      data-loader-fx
      style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0) 32%)',
        pointerEvents: 'none',
        transition: 'opacity .3s ease',
      }}
    />

    {/* corner-bracket box: expands to frame the revealed lockup (42-47) */}
    <div
      data-brk-box
      style={{
        position: 'absolute', left: '50%', top: '50%', width: 134, height: 172,
        transform: 'translate(-50%,-50%)',
        transition: 'width .78s cubic-bezier(.22,1,.36,1),height .78s cubic-bezier(.22,1,.36,1)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 22, height: 22, borderTop: '1.5px solid rgba(255,255,255,.55)', borderLeft: '1.5px solid rgba(255,255,255,.55)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderTop: '1.5px solid rgba(255,255,255,.55)', borderRight: '1.5px solid rgba(255,255,255,.55)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 22, height: 22, borderBottom: '1.5px solid rgba(255,255,255,.55)', borderLeft: '1.5px solid rgba(255,255,255,.55)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderBottom: '1.5px solid rgba(255,255,255,.55)', borderRight: '1.5px solid rgba(255,255,255,.55)' }} />
    </div>

    {/* reveal: the hero lockup, identical geometry to the landing. The logo is one
        3D-flip element: front = the filling silhouette (loading), back = the final
        colored logo — it flips (no fade) to reveal itself uncut (51-77) */}
    <div
      data-load-lockup
      style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        padding: '22px 38px', pointerEvents: 'none',
      }}
    >
      <div
        data-lk-fade
        style={{
          opacity: 0, transform: 'translateY(18px)',
          transition: 'opacity .3s ease,transform .38s cubic-bezier(.2,.7,.2,1)',
          fontFamily: 'var(--font-display)',
          fontSize: 10.5, fontWeight: 600, letterSpacing: '.34em', textTransform: 'uppercase', marginBottom: 13,
          ...gradientText('linear-gradient(90deg,oklch(0.60 0.008 265) 0%,oklch(0.74 0.006 265) 30%,oklch(0.88 0.004 265) 49.6%,oklch(0.94 0.003 265) 50.4%,oklch(0.985 0.002 265) 100%)'),
        }}
      >
        Elegance. Precision. Intuition
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(52px,6vw,104px)',
          lineHeight: 0.92, letterSpacing: '-.045em', display: 'grid',
          gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: '.22em',
          margin: 0, perspective: 1000,
        }}
      >
        <span
          data-lk-fade
          style={{
            opacity: 0, transform: 'translateX(0.5em)',
            transition: 'opacity .3s ease,transform .38s cubic-bezier(.2,.7,.2,1)',
            textAlign: 'right',
            ...gradientText('linear-gradient(90deg,oklch(0.80 0.006 265 / 0.95) 0%,oklch(0.99 0.002 265 / 0.95) 100%)'),
          }}
        >
          I'm
        </span>

        <div
          data-flip
          style={{
            display: 'grid', transformStyle: 'preserve-3d',
            transition: 'transform .32s cubic-bezier(.3,.9,.25,1)', transform: 'rotateY(0deg)',
          }}
        >
          <svg
            data-flip-front
            viewBox="0 0 140 390"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              gridArea: '1 / 1', height: '1.02em', width: 'auto', display: 'block',
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'translate(0px,2px)',
            }}
          >
            <defs>
              <clipPath id="loadFillClip">
                <rect data-fill-rect x={0} y={390} width={140} height={0} />
              </clipPath>
            </defs>
            <path d="M60 195.588V322.076L0 278.791V151.996L60 195.588ZM60 170.867L0 127.274V69.291C0 34.0263 26.0771 4.8523 60 0V170.867Z" fill="rgba(255,255,255,.9)" />
            <path d="M140 278.791L80 322.076V267.188L140 223.596V278.791ZM140 198.874L80 242.468V195.188L140 151.596V198.874ZM80 0C113.923 4.8523 140 34.0263 140 69.291V126.874L80 170.468V0Z" fill="rgba(255,255,255,.9)" />
            <path d="M80 343.291L80 333.291L60 333.291L60 343.291L70 343.291L80 343.291ZM60 379.291C60 384.814 64.4772 389.291 70 389.291C75.5228 389.291 80 384.814 80 379.291L70 379.291L60 379.291ZM70 343.291L60 343.291L60 379.291L70 379.291L80 379.291L80 343.291L70 343.291Z" fill="rgba(255,255,255,.9)" />
            <path d="M60 195.588V322.076L0 278.791V151.996L60 195.588ZM60 170.867L0 127.274V69.291C0 34.0263 26.0771 4.8523 60 0V170.867Z" fill="oklch(0.30 0.008 265)" clipPath="url(#loadFillClip)" />
            <path d="M140 278.791L80 322.076V267.188L140 223.596V278.791ZM140 198.874L80 242.468V195.188L140 151.596V198.874ZM80 0C113.923 4.8523 140 34.0263 140 69.291V126.874L80 170.468V0Z" fill="oklch(0.30 0.008 265)" clipPath="url(#loadFillClip)" />
            <path d="M80 343.291L80 333.291L60 333.291L60 343.291L70 343.291L80 343.291ZM60 379.291C60 384.814 64.4772 389.291 70 389.291C75.5228 389.291 80 384.814 80 379.291L70 379.291L60 379.291ZM70 343.291L60 343.291L60 379.291L70 379.291L80 379.291L80 343.291L70 343.291Z" fill="oklch(0.30 0.008 265)" clipPath="url(#loadFillClip)" />
          </svg>
          <svg
            data-flip-back
            viewBox="0 0 140 390"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              gridArea: '1 / 1', height: '1.02em', width: 'auto', display: 'block',
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translate(0px,2px)',
            }}
          >
            <path d="M60 195.588V322.076L0 278.791V151.996L60 195.588ZM60 170.867L0 127.274V69.291C0 34.0263 26.0771 4.8523 60 0V170.867Z" fill="oklch(0.55 0.008 265)" />
            <path d="M140 278.791L80 322.076V267.188L140 223.596V278.791ZM140 198.874L80 242.468V195.188L140 151.596V198.874ZM80 0C113.923 4.8523 140 34.0263 140 69.291V126.874L80 170.468V0Z" fill="oklch(0.99 0.002 265)" />
            <path d="M80 343.291L80 333.291L60 333.291L60 343.291L70 343.291L80 343.291ZM60 379.291C60 384.814 64.4772 389.291 70 389.291C75.5228 389.291 80 384.814 80 379.291L70 379.291L60 379.291ZM70 343.291L60 343.291L60 379.291L70 379.291L80 379.291L80 343.291L70 343.291Z" fill="oklch(0.99 0.002 265)" />
          </svg>
        </div>

        <span
          data-lk-fade
          style={{
            opacity: 0, transform: 'translateX(-0.5em)',
            transition: 'opacity .3s ease,transform .38s cubic-bezier(.2,.7,.2,1)',
            textAlign: 'left',
            ...gradientText('linear-gradient(90deg,oklch(0.92 0.004 265 / 0.9) 0%,oklch(0.99 0.002 265 / 0.95) 100%)'),
          }}
        >
          Fei
        </span>
      </h1>

      <div
        data-lk-fade
        style={{
          opacity: 0, transform: 'translateY(-18px)',
          transition: 'opacity .3s ease,transform .38s cubic-bezier(.2,.7,.2,1)',
          fontFamily: 'var(--font-display)',
          marginTop: 18, fontSize: 14, fontWeight: 600, letterSpacing: '.05em',
          display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, alignItems: 'center',
        }}
      >
        <span style={{ textAlign: 'right', whiteSpace: 'nowrap', ...gradientText('linear-gradient(90deg,oklch(0.70 0.006 265) 0%,oklch(0.88 0.004 265) 100%)') }}>
          Sr. Frontend Engineer
        </span>
        <span style={{ textAlign: 'left', whiteSpace: 'nowrap', ...gradientText('linear-gradient(90deg,oklch(0.90 0.004 265) 0%,oklch(0.985 0.002 265) 100%)') }}>
          AI Product Engineer
        </span>
      </div>
    </div>
  </Root>
);

export default Loader;
