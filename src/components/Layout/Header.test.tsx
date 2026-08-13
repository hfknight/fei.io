import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import Header from './Header';

const renderHeader = (path = '/lab') =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>
    </ThemeProvider>,
  );

const navOrder = () =>
  screen.getAllByRole('link').map((a) => a.textContent);

/** Home is an icon, so its accessible name lives on the anchor rather than in its text. */
const navNames = () =>
  screen.getAllByRole('link').map((a) => a.getAttribute('aria-label') ?? a.textContent);

describe('Header nav', () => {
  it('renders a Lab link sitting between Readme and Writing', () => {
    renderHeader();

    const order = navOrder();
    expect(order).toContain('Lab');
    expect(order.indexOf('Lab')).toBeGreaterThan(order.indexOf('Readme'));
    expect(order.indexOf('Lab')).toBeLessThan(order.indexOf('Writing'));
  });

  it('links Lab to /lab', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/lab');
  });

  it('does not link to the retired /changelog page', () => {
    renderHeader();

    expect(navOrder()).not.toContain('Changelog');
  });

  it('renders Home on every route except the landing, where it would link to itself', () => {
    for (const path of ['/lab', '/readme', '/writing/some-post']) {
      const { unmount } = renderHeader(path);
      expect(navNames(), path).toContain('Home');
      expect(navNames(), path).toHaveLength(4);
      unmount();
    }

    renderHeader('/');
    expect(navNames()).not.toContain('Home');
    expect(navNames()).toHaveLength(3);
  });

  /**
   * Home is a glyph, so it has no text to name it. The name lives on the anchor and the icon
   * is hidden from the accessibility tree — otherwise the link announces as unlabelled.
   */
  it('names the Home icon on the anchor, not in its text', () => {
    renderHeader('/lab');

    const home = screen.getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toHaveTextContent('');
    expect(home.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

/**
 * The active route is marked with the same glass pill the links wear on hover, sliding
 * between them via framer's shared layout. There must be exactly one — a second pill would
 * mean the active link is painting its own glass on top of the shared one.
 */
describe('Header active pill', () => {
  const pills = (c: HTMLElement) => c.querySelectorAll('[data-nav-pill]');

  it('marks the active route with a single pill', () => {
    const { container } = renderHeader('/lab');

    expect(pills(container)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Lab' })).toContainElement(
      pills(container)[0] as HTMLElement,
    );
  });

  it('follows the route to a different link', () => {
    const { container } = renderHeader('/readme');

    expect(screen.getByRole('link', { name: 'Readme' })).toContainElement(
      pills(container)[0] as HTMLElement,
    );
  });

  it('marks a nested route from its section link', () => {
    const { container } = renderHeader('/writing/some-post');

    expect(pills(container)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Writing' })).toContainElement(
      pills(container)[0] as HTMLElement,
    );
  });

  /**
   * Home is a way back, not a destination: it never wears the pill, so on the landing no link
   * is active. That also keeps the pill out of the three header copies the lens clones.
   */
  it('never gives Home the pill, so the landing shows none', () => {
    const { container } = renderHeader('/');
    expect(pills(container)).toHaveLength(0);

    const onLab = renderHeader('/lab');
    expect(onLab.container.querySelectorAll('[data-nav-pill]')).toHaveLength(1);
    expect(
      onLab.container.querySelector('a[aria-label="Home"] [data-nav-pill]'),
    ).toBeNull();
  });
});

/**
 * The pill draws where you are; aria-current announces it. Without this the active route is
 * conveyed by colour alone, which no screen reader can see.
 */
describe('Header active route is announced', () => {
  const current = () =>
    screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');

  it('marks exactly the active link with aria-current="page"', () => {
    renderHeader('/lab');

    expect(current().map((a) => a.textContent)).toEqual(['Lab']);
  });

  it('marks the section link for a nested route', () => {
    renderHeader('/writing/some-post');

    expect(current().map((a) => a.textContent)).toEqual(['Writing']);
  });

  it('marks nothing on the landing, where no destination is current', () => {
    renderHeader('/');

    expect(current()).toHaveLength(0);
  });

  it('never sets aria-current on an inactive link, Home included', () => {
    renderHeader('/readme');

    const inactive = screen
      .getAllByRole('link')
      .filter((a) => a.textContent !== 'Readme');
    expect(inactive).toHaveLength(3);
    for (const link of inactive) {
      expect(link, link.getAttribute('aria-label') ?? link.textContent ?? '').not.toHaveAttribute(
        'aria-current',
      );
    }
  });
});
