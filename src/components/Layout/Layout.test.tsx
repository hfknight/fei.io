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

  it('puts the migrated content pages on the light surface', () => {
    for (const path of ['/readme', '/writing', '/lab']) {
      renderAt(path);
      expect(document.documentElement.dataset.surface, path).toBe('default');
    }
  });

  it('resolves a post slug to light via the /writing/ prefix', () => {
    renderAt('/writing/some-post');
    expect(document.documentElement.dataset.surface).toBe('default');
  });

  /** The ordering guard. Admin is matched by the /writing/ prefix and must lose to it. */
  it('keeps the admin dark even though /writing/ would match it', () => {
    for (const path of ['/writing/admin', '/writing/admin/new', '/writing/admin/42']) {
      renderAt(path);
      expect(document.documentElement.dataset.surface, path).toBe('inverted');
    }
  });

  it('keeps bespoke lab entries dark while the lab index goes light', () => {
    renderAt('/lab');
    expect(document.documentElement.dataset.surface).toBe('default');
    renderAt('/lab/interfaces-that-feel-better');
    expect(document.documentElement.dataset.surface).toBe('inverted');
  });

  it('bridges unmigrated routes to inverted, since their pages are still dark', () => {
    for (const path of ['/changelog', '/loading', '/nonexistent']) {
      renderAt(path);
      expect(document.documentElement.dataset.surface, path).toBe('inverted');
    }
  });
});
