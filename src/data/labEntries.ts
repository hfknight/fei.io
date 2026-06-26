import { lazy } from 'react';
import type { LabEntry } from '../types';

// Single source of truth for the Lab section. Add an entry here AND create its
// bespoke page; the lazy import means a missing/renamed page is a build error,
// not a runtime 404. The index lists these and one dynamic route renders them.
export const labEntries: LabEntry[] = [
  {
    slug: 'building-the-lab',
    title: 'Building the Lab',
    kind: 'case-study',
    date: '2026-06-26',
    Component: lazy(() => import('../pages/lab/entries/BuildingTheLab')),
  },
];

// Pure, side-effect-free so ordering is unit-testable with fixtures.
export function sortByDateDesc(entries: LabEntry[]): LabEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export function labEntriesByDate(): LabEntry[] {
  return sortByDateDesc(labEntries);
}

export function findLabEntry(slug: string): LabEntry | undefined {
  return labEntries.find((entry) => entry.slug === slug);
}
