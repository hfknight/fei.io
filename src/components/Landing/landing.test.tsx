import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import Landing from './index';
import type { EngineOpts } from './landingEngine';

// The engine is imperative/rAF-driven and not meaningfully unit-testable frame by
// frame; these tests cover the seams instead — the branch selection index.tsx feeds
// the engine (reduced-motion / no-hover / one-shot loader) and teardown.

// Capture every opts object the engine is constructed with, and hand back a destroy
// spy so the unmount-teardown path is observable.
const engineMock = vi.hoisted(() => ({
  calls: [] as EngineOpts[],
  destroy: vi.fn(),
}));

vi.mock('./landingEngine', () => ({
  createLandingEngine: vi.fn((_root: HTMLElement, opts: EngineOpts) => {
    engineMock.calls.push(opts);
    return { destroy: engineMock.destroy };
  }),
}));

const motionHolder = vi.hoisted(() => ({ reduced: false as boolean | null }));
vi.mock('framer-motion', () => ({
  useReducedMotion: () => motionHolder.reduced,
}));

const setHover = (canHover: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: canHover,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

const renderLanding = () =>
  render(
    <ThemeProvider theme={theme}>
      <Landing />
    </ThemeProvider>,
  );

const lastOpts = () => engineMock.calls[engineMock.calls.length - 1];

beforeEach(() => {
  engineMock.calls.length = 0;
  engineMock.destroy.mockClear();
  motionHolder.reduced = false;
  setHover(true);
});

describe('Landing intro gating', () => {
  it('plays the loader once on a fresh load and skips it on SPA re-navigation', () => {
    // fresh page load: fine-hover pointer, motion allowed → intro plays
    const first = renderLanding();
    expect(document.querySelector('[data-loader]')).toBeInTheDocument();
    expect(lastOpts().playIntro).toBe(true);

    // engine signals the reveal finished → the module-scope flag latches
    lastOpts().onRevealed?.();
    first.unmount();

    // re-navigating back to "/" in the same session skips the intro
    renderLanding();
    expect(document.querySelector('[data-loader]')).not.toBeInTheDocument();
    expect(lastOpts().playIntro).toBe(false);
  });

  it('passes reducedMotion:true and forces playIntro:false when reduced motion is preferred', () => {
    motionHolder.reduced = true;
    renderLanding();
    expect(lastOpts().reducedMotion).toBe(true);
    expect(lastOpts().playIntro).toBe(false);
    expect(document.querySelector('[data-loader]')).not.toBeInTheDocument();
  });

  it('passes canHover:false and forces playIntro:false on a no-hover / touch device', () => {
    setHover(false);
    renderLanding();
    expect(lastOpts().canHover).toBe(false);
    expect(lastOpts().playIntro).toBe(false);
    expect(document.querySelector('[data-loader]')).not.toBeInTheDocument();
  });

  it('destroys the engine on unmount', () => {
    const { unmount } = renderLanding();
    expect(engineMock.destroy).not.toHaveBeenCalled();
    unmount();
    expect(engineMock.destroy).toHaveBeenCalledTimes(1);
  });
});

describe('Landing lens gating', () => {
  // `interactive` (!reducedMotion && canHover) gates <Lenses/> in index.tsx — the same
  // condition the (mocked) engine uses internally to decide whether to construct the
  // draggable lenses at all. These assert the DOM seam only; the imperative lens engine
  // itself is out of scope (fully mocked via createLandingEngine above).
  it('renders both lenses and the filter host when interactive (hover + no reduced motion)', () => {
    renderLanding();
    expect(document.querySelector('[data-lens="1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-lens="2"]')).toBeInTheDocument();
    expect(document.querySelector('[data-lens-filter-host]')).toBeInTheDocument();
  });

  it('renders no lenses when reduced motion is preferred', () => {
    motionHolder.reduced = true;
    renderLanding();
    expect(document.querySelectorAll('[data-lens]')).toHaveLength(0);
    expect(document.querySelector('[data-lens-filter-host]')).not.toBeInTheDocument();
  });

  it('renders no lenses without a fine-hover pointer', () => {
    setHover(false);
    renderLanding();
    expect(document.querySelectorAll('[data-lens]')).toHaveLength(0);
    expect(document.querySelector('[data-lens-filter-host]')).not.toBeInTheDocument();
  });

  it('tears down cleanly on unmount: destroy fires and the filter host leaves no trace', () => {
    const { unmount } = renderLanding();
    expect(document.querySelector('[data-lens-filter-host]')).toBeInTheDocument();
    unmount();
    expect(engineMock.destroy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-lens-filter-host]')).not.toBeInTheDocument();
  });
});
