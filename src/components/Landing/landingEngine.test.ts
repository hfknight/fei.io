import { describe, it, expect, afterEach } from 'vitest';
import { createLandingEngine, type LandingEngine } from './landingEngine';

// The engine is imperative and rAF-driven; this covers one seam only — which pointer
// stream the head-track listens on. The lens drag calls preventDefault() on pointerdown,
// which suppresses the compatibility mouse events for the rest of the interaction, so a
// `mousemove` listener goes silent the moment a lens is grabbed and the pets freeze
// mid-drag. Frost is the observable half of onMove that needs no video decode.
const buildRoot = (): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = '<div data-frost-l></div><div data-frost-r></div>';
  document.body.appendChild(root);
  return root;
};

// jsdom has no PointerEvent constructor; the listener only reads clientX/clientY, which
// a MouseEvent carries, and dispatch is keyed on the type string either way.
const movePointer = (clientX: number, clientY: number) => {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));
};

let engine: LandingEngine | null = null;
afterEach(() => {
  engine?.destroy();
  engine = null;
  document.body.innerHTML = '';
});

describe('landing head-track', () => {
  it('follows the pointer stream, so a held lens keeps the pets tracking', () => {
    const root = buildRoot();
    engine = createLandingEngine(root, { reducedMotion: false, canHover: true, playIntro: false });
    const frostL = root.querySelector<HTMLElement>('[data-frost-l]')!;
    const frostR = root.querySelector<HTMLElement>('[data-frost-r]')!;

    // right half → Ollie is the tracked pet, so the LEFT plate frosts
    movePointer(window.innerWidth * 0.75, window.innerHeight * 0.5);
    expect(frostL.style.opacity).toBe('1');
    expect(frostR.style.opacity).toBe('0');

    // left half → the frost swaps sides
    movePointer(window.innerWidth * 0.25, window.innerHeight * 0.5);
    expect(frostL.style.opacity).toBe('0');
    expect(frostR.style.opacity).toBe('1');
  });

  it('registers no tracking listener on the non-interactive path', () => {
    const root = buildRoot();
    engine = createLandingEngine(root, { reducedMotion: true, canHover: true, playIntro: false });
    movePointer(window.innerWidth * 0.75, window.innerHeight * 0.5);
    expect(root.querySelector<HTMLElement>('[data-frost-l]')!.style.opacity).toBe('');
  });
});
