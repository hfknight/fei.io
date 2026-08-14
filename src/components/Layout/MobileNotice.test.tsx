import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import MobileNotice from './MobileNotice';
import { MOBILE_NOTICE_DISMISS_KEY } from '../../hooks/useMobileNotice';

const setTouch = (touch: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query === '(hover: hover) and (pointer: fine)' ? !touch : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const renderNotice = () =>
  render(
    <ThemeProvider theme={theme}>
      <MobileNotice />
    </ThemeProvider>,
  );

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('MobileNotice', () => {
  it('renders nothing without a touch (no fine-hover) pointer', () => {
    setTouch(false);
    const { container } = renderNotice();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the quiet-version copy on touch', () => {
    setTouch(true);
    renderNotice();
    expect(screen.getByText(/quiet version/i)).toBeInTheDocument();
  });

  it('dismissing writes sessionStorage and hides the notice on the next mount', () => {
    setTouch(true);
    const { unmount } = renderNotice();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(window.sessionStorage.getItem(MOBILE_NOTICE_DISMISS_KEY)).toBe('1');
    unmount();

    const { container } = renderNotice();
    expect(container).toBeEmptyDOMElement();
  });

  it('initializes hidden if the session already carries the dismiss key', () => {
    setTouch(true);
    window.sessionStorage.setItem(MOBILE_NOTICE_DISMISS_KEY, '1');
    const { container } = renderNotice();
    expect(container).toBeEmptyDOMElement();
  });
});
