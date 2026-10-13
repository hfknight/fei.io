import { beforeAll, describe, expect, it } from 'vitest';
import { render } from '../test/renderWithTheme';
import { MemoryRouter } from 'react-router-dom';
import About from './About';
import { ALL_PROJECTS } from '../data/projects';

/* jsdom has none of the browser APIs the page's imperative layers reach for. Stubbed just
   enough to mount; nothing here is asserted on. */
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.ResizeObserver = Observer as unknown as typeof ResizeObserver;
  window.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
});

describe('/readme projects', () => {
  it('has a link to every project in the DOM at rest, with no click', () => {
    const { container } = render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    );

    for (const p of ALL_PROJECTS) {
      expect(container.querySelector(`a[href="${p.url}"]`), p.name).not.toBeNull();
    }
  });
});
