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

describe('Header nav', () => {
  it('renders a Lab link sitting between Readme and Work', () => {
    renderHeader();

    const order = navOrder();
    expect(order).toContain('Lab');
    expect(order.indexOf('Lab')).toBeGreaterThan(order.indexOf('Readme'));
    expect(order.indexOf('Lab')).toBeLessThan(order.indexOf('Work'));
  });

  it('links Lab to /lab', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/lab');
  });

  it('does not link to the retired /changelog page', () => {
    renderHeader();

    expect(navOrder()).not.toContain('Changelog');
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
    const { container } = renderHeader('/connect');

    expect(screen.getByRole('link', { name: 'Connect' })).toContainElement(
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

  it('shows no pill on the landing, where no nav link is active', () => {
    const { container } = renderHeader('/');

    expect(pills(container)).toHaveLength(0);
  });
});
