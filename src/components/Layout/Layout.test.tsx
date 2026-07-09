import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import Layout from './Layout';

const renderAt = (path: string) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <main>content</main>
        </Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

afterEach(() => {
  delete document.documentElement.dataset.surface;
});

describe('Layout surface bridge', () => {
  it('marks the landing as an inverted surface (chrome over video)', () => {
    renderAt('/');
    expect(document.documentElement.dataset.surface).toBe('inverted');
  });

  it('bridges every unmigrated route to inverted, since all pages are still dark', () => {
    for (const path of ['/readme', '/work', '/writing', '/lab', '/connect']) {
      renderAt(path);
      expect(document.documentElement.dataset.surface, path).toBe('inverted');
    }
  });
});
