import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import Header from './Header';

const renderHeader = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/lab']}>
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
