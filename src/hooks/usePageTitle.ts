import { useEffect } from 'react';

/**
 * Route-scoped document.title. The SPA ships one global title from index.html, which is
 * what every route shows in the tab and in search results; a route that wants its own —
 * for SEO or just an honest tab label — declares it with this and the global one is
 * restored when the route unmounts.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
