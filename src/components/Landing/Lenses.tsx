interface LensProps {
  value: '1' | '2';
}

// One draggable liquid-glass lens — ported verbatim from design source lines 134-140
// (lens 2 repeats the same markup at 143-148). landingEngine (via lensEngine.ts:
// createLenses) mutates position/size/opacity/filter imperatively on these exact
// elements, so every style below is a literal inline style (matching source) rather
// than a styled-components class — inline styles win the specificity fight either way,
// but this keeps the port a 1:1 read against the source. Drag + spring land in Task 2;
// this task only wires the static refraction (filter + world clone) underneath.
const Lens: React.FC<LensProps> = ({ value }) => (
  <div
    data-lens={value}
    title="Drag me"
    style={{
      position: 'absolute',
      opacity: 0,
      width: 128,
      height: 128,
      borderRadius: '50%',
      /* Top of the landing's own ladder (later in DOM than Lockup/PetCaption's 8, so it
         still paints above them) but BELOW PageTransition's curtain (9) and the chrome
         (10): the sweep must cover the lenses when leaving home. */
      zIndex: 8,
      cursor: 'grab',
      boxShadow: '0 15px 30px rgba(0,0,0,.10)',
      touchAction: 'none',
    }}
  >
    <div
      data-lens-clip=""
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        WebkitMask: 'radial-gradient(circle closest-side,#000 98.4%,rgba(0,0,0,0) 100%)',
        mask: 'radial-gradient(circle closest-side,#000 98.4%,rgba(0,0,0,0) 100%)',
      }}
    >
      <div data-lens-fx="" style={{ position: 'absolute', inset: 0, filter: 'url(#lensRefract)' }} />
    </div>
    <div
      data-lens-rim=""
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        pointerEvents: 'none',
        boxShadow:
          'inset 0 1px 1px rgba(255,255,255,.40),inset 0 0 0 1px rgba(255,255,255,.09),inset 0 -2px 6px rgba(0,0,0,.06)',
      }}
    />
  </div>
);

// Two lenses + the container-scoped SVG filter host that lensEngine.ts injects the Snell
// refraction filter defs into (createLenses' initLens). Only mounted by index.tsx when
// `interactive` — reduced-motion / no-hover visitors never pay for this DOM or filters.
const Lenses: React.FC = () => (
  <>
    <Lens value="1" />
    <Lens value="2" />
    <svg
      data-lens-filter-host
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    />
  </>
);

export default Lenses;
