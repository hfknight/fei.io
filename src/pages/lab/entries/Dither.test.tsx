import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../../test/renderWithTheme';
import Dither from './Dither';

/**
 * All jsdom-safe: no 2d canvas context exists here, so these tests exercise state and DOM
 * wiring only, never the pixels ditherCanvas.ts paints (that module is untested by
 * convention — see its doc comment).
 */

const renderPage = () =>
  render(
    <MemoryRouter>
      <Dither />
    </MemoryRouter>,
  );

beforeEach(() => {
  // The sample-image fetch on mount: reject so it resolves quickly and silently, per the
  // component's own catch — no test needs the sample to actually load.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Dither', () => {
  it('renders without throwing and shows the four effect names', () => {
    renderPage();
    for (const name of ['halftone', 'dots', 'ascii', 'lattice']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
  });

  it('switching effect swaps the visible control set', () => {
    renderPage();
    expect(screen.getByLabelText('Angle')).toBeInTheDocument();
    expect(screen.queryByLabelText('Jitter')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'lattice' }));

    expect(screen.queryByLabelText('Angle')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Jitter')).toBeInTheDocument();
  });

  it('resets a tuned param to its default on a switch away and back', () => {
    renderPage();
    const angle = screen.getByLabelText('Angle') as HTMLInputElement;
    fireEvent.change(angle, { target: { value: '90' } });
    expect(angle.value).toBe('90');

    fireEvent.click(screen.getByRole('radio', { name: 'dots' }));
    fireEvent.click(screen.getByRole('radio', { name: 'halftone' }));

    expect((screen.getByLabelText('Angle') as HTMLInputElement).value).toBe('45');
  });

  it('resets the duotone and the image-colors toggle on a switch', () => {
    renderPage();
    const ink = screen.getByLabelText('Ink color') as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: 'image colors' });
    fireEvent.change(ink, { target: { value: '#4ade80' } });
    fireEvent.click(toggle);
    expect(ink.value).toBe('#4ade80');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('radio', { name: 'dots' }));

    expect((screen.getByLabelText('Ink color') as HTMLInputElement).value).toBe('#1a1408');
    expect(screen.getByRole('button', { name: 'image colors' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('fetches each effect its own bundled sample', async () => {
    renderPage();
    const fetched = () => (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.flat();
    expect(fetched()).toContain('/lab/dither/void-punk.webp'); // halftone, on mount

    fireEvent.click(screen.getByRole('radio', { name: 'ascii' }));

    await vi.waitFor(() => expect(fetched()).toContain('/lab/dither/neon-visor.webp'));
  });

  it('keeps the visitor\'s own photo when they switch effects', async () => {
    // jsdom never fires an <img> load, so the decode has to come from createImageBitmap for
    // loadSource to reach its success path and mark the source as the visitor's.
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4, height: 4, close: () => undefined })),
    );
    renderPage();
    const file = new File([new Uint8Array([1, 2, 3])], 'mine.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    await vi.waitFor(() =>
      expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0),
    );
    const before = (fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length;

    fireEvent.click(screen.getByRole('radio', { name: 'lattice' }));

    // No further sample fetch: the effect swap must not reach past their photo.
    expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(before);
  });

  describe('the description card', () => {
    const aboutButton = () => screen.getByRole('button', { name: /^about the/ });
    const cardFor = (copy: RegExp) => screen.getByText(copy).closest('[aria-hidden]');

    it('names the effect it would describe, and starts on the controls', () => {
      renderPage();
      expect(aboutButton()).toHaveAccessibleName('about the halftone effect');
      expect(aboutButton()).toHaveAttribute('aria-pressed', 'false');
      // The copy is always in the DOM — it is the card that turns, not the text that mounts —
      // so what marks it as away is aria-hidden, which is also what keeps it off the a11y tree.
      expect(cardFor(/A print screen/)).toHaveAttribute('aria-hidden', 'true');
    });

    it('turns to the description and back on the icon', () => {
      renderPage();
      fireEvent.click(aboutButton());
      expect(aboutButton()).toHaveAttribute('aria-pressed', 'true');
      expect(cardFor(/A print screen/)).toHaveAttribute('aria-hidden', 'false');

      fireEvent.click(aboutButton());
      expect(aboutButton()).toHaveAttribute('aria-pressed', 'false');
    });

    it('closes on Escape', () => {
      renderPage();
      fireEvent.click(aboutButton());
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(aboutButton()).toHaveAttribute('aria-pressed', 'false');
    });

    it('lands on the new effect\'s controls, not its prose, when the effect changes', () => {
      renderPage();
      fireEvent.click(aboutButton());
      fireEvent.click(screen.getByRole('radio', { name: 'lattice' }));

      expect(aboutButton()).toHaveAttribute('aria-pressed', 'false');
      expect(aboutButton()).toHaveAccessibleName('about the lattice effect');
      expect(cardFor(/A mesh that is the picture/)).toHaveAttribute('aria-hidden', 'true');
    });

    it('carries copy for every effect', () => {
      renderPage();
      const opening: [string, RegExp][] = [
        ['halftone', /A print screen/],
        ['dots', /An LED wall/],
        ['ascii', /The photo retyped/],
        ['lattice', /A mesh that is the picture/],
      ];
      for (const [name, copy] of opening) {
        fireEvent.click(screen.getByRole('radio', { name }));
        fireEvent.click(aboutButton());
        expect(cardFor(copy)).toHaveAttribute('aria-hidden', 'false');
      }
    });
  });

  it('reveals blend and layer opacity only once the photo is kept', () => {
    renderPage();
    expect(screen.queryByLabelText('Layer opacity')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'screen' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'keep the photo' }));

    expect(screen.getByLabelText('Layer opacity')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'screen' })).toBeInTheDocument();
  });

  it('resets the photo layer on a switch', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'keep the photo' }));
    fireEvent.click(screen.getByRole('radio', { name: 'screen' }));
    fireEvent.change(screen.getByLabelText('Layer opacity'), { target: { value: '0.5' } });
    expect(screen.getByRole('radio', { name: 'screen' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'dots' }));

    expect(screen.getByRole('button', { name: 'keep the photo' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByLabelText('Layer opacity')).not.toBeInTheDocument();
  });

  it('leaves a tuned render alone when the effect already showing is re-picked', () => {
    renderPage();
    const angle = screen.getByLabelText('Angle') as HTMLInputElement;
    fireEvent.change(angle, { target: { value: '90' } });

    fireEvent.click(screen.getByRole('radio', { name: 'halftone' }));

    expect((screen.getByLabelText('Angle') as HTMLInputElement).value).toBe('90');
  });

  it('does not render a copy control when ClipboardItem is undefined', () => {
    // jsdom has no ClipboardItem by default, which is exactly the case under test.
    expect(typeof (globalThis as { ClipboardItem?: unknown }).ClipboardItem).toBe('undefined');
    renderPage();
    expect(screen.queryByRole('button', { name: 'copy' })).not.toBeInTheDocument();
  });

  it('ignores a paste with no image file: no notice, default not prevented', () => {
    renderPage();
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: { items: [{ kind: 'string', type: 'text/plain' }] },
    });

    const notPrevented = document.dispatchEvent(event);

    expect(notPrevented).toBe(true); // dispatchEvent returns false only if preventDefault ran
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('removes the document paste listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderPage();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function));
  });

  it('surfaces a notice for a non-image file dropped in through the file input', async () => {
    renderPage();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByRole('status')).toHaveTextContent(/not an image/i);
  });
});
