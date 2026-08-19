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

  it('persists per-effect param state across a switch away and back', () => {
    renderPage();
    const angle = screen.getByLabelText('Angle') as HTMLInputElement;
    fireEvent.change(angle, { target: { value: '90' } });
    expect(angle.value).toBe('90');

    fireEvent.click(screen.getByRole('radio', { name: 'dots' }));
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
