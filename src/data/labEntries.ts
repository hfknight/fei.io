import { lazy } from 'react';
import type { LabEntry } from '../types';

// Single source of truth for the Lab section. Add an entry here AND create its
// bespoke page; the lazy import means a missing/renamed page is a build error,
// not a runtime 404. The index lists these and one dynamic route renders them.
export const labEntries: LabEntry[] = [
  {
    slug: 'prompted',
    title: 'everything here was prompted',
    kind: 'gallery',
    date: '2026-08-13',
    Component: lazy(() => import('../pages/lab/entries/Prompted')),
  },
  {
    slug: 'pick-a-font',
    title: 'Font pairing by feel',
    kind: 'experiment',
    date: '2026-08-10',
    Component: lazy(() => import('../pages/lab/entries/PickAFont')),
  },
  {
    slug: 'text-into-picture',
    title: 'Turning a page of text into a picture',
    kind: 'case-study',
    date: '2026-08-10',
    Component: lazy(() => import('../pages/lab/entries/TextIntoPicture')),
  },
  {
    slug: 'cursor-tracked-video',
    title: 'Scrubbing video with the cursor',
    kind: 'case-study',
    date: '2026-08-07',
    Component: lazy(() => import('../pages/lab/entries/CursorTrackedVideo')),
  },
  {
    slug: 'interfaces-that-feel-better',
    title: 'Best practices that make interfaces feel better',
    kind: 'learning',
    date: '2026-06-26',
    Component: lazy(() => import('../pages/lab/entries/InterfacesThatFeelBetter')),
  },
];

// Pure, side-effect-free so ordering is unit-testable with fixtures.
export function sortByDateDesc(entries: LabEntry[]): LabEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

// The index order. Date-desc, except galleries sink below the dated work: a gallery is an
// open shelf, not a dated piece — new items keep its date fresh, so ranked by date alone
// it would squat at the top of the list indefinitely.
export function orderForIndex(entries: LabEntry[]): LabEntry[] {
  const sorted = sortByDateDesc(entries);
  return [
    ...sorted.filter((e) => e.kind !== 'gallery'),
    ...sorted.filter((e) => e.kind === 'gallery'),
  ];
}

export function labEntriesByDate(): LabEntry[] {
  return orderForIndex(labEntries);
}

export function findLabEntry(slug: string): LabEntry | undefined {
  return labEntries.find((entry) => entry.slug === slug);
}
