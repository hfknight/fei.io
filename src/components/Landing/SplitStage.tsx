import styled from 'styled-components';

const Stage = styled.div`position:relative;width:100%;height:100dvh;overflow:hidden;display:flex;background:#26272b;`;
const Half = styled.div`position:relative;width:50%;height:100%;overflow:hidden;`;
const Left = styled(Half)`background:linear-gradient(120deg,#e9eaeb 0%,#d4d6d8 100%);`;
const Right = styled(Half)`background:linear-gradient(120deg,#54565b 0%,#33343a 100%);`;
const Vid = styled.video`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease;`;

// Engine-controlled nodes carry their initial inline styles here and are mutated by
// landingEngine via element.style.*. Overlay divs below are ported verbatim from the
// design source (2026-07-08-landing-redesign-source.dc.html) lines 80-102.
const SplitStage: React.FC = () => (
  <Stage data-stage>
    <Left>
      <Vid data-jojo data-src="/jojo-clip-2.mp4" muted playsInline preload="auto"
           style={{ objectPosition: '14% 66%' }} />
      {/* light-side gradient (source 83) + inner shadow (84) + frost overlay (86) */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(233,234,235,0) 50%,rgba(233,234,235,.35) 84%,rgba(226,227,229,.7) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 200px rgba(70,72,76,.14)', pointerEvents: 'none' }} />
      <div data-frost-l style={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .55s ease', pointerEvents: 'none', zIndex: 4 }} />
    </Left>
    <Right>
      <Vid data-ollie data-src="/ollie-clip-3.mp4" muted playsInline preload="auto"
           style={{ objectPosition: '36% 70%', transform: 'scaleX(-1)' }} />
      {/* dark-side gradient (source 92) + inner shadow (93) + light bleed across seam (95) + frost overlay (97) */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg,rgba(40,41,45,0) 60%,rgba(36,37,41,.34) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 220px rgba(15,16,19,.34)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(255,253,248,.22) 0%,rgba(255,253,248,.08) 14%,rgba(255,253,248,0) 34%)', pointerEvents: 'none', zIndex: 1 }} />
      <div data-frost-r style={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .55s ease', pointerEvents: 'none', zIndex: 4 }} />
    </Right>
    {/* center seam — source 100-102 */}
    <div data-seam style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, transform: 'translateX(-.5px)', background: 'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.28) 30%,rgba(255,255,255,.28) 70%,rgba(255,255,255,0) 100%)', pointerEvents: 'none', zIndex: 6 }} />
  </Stage>
);
export default SplitStage;
