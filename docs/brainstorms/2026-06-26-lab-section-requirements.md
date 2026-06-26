---
date: 2026-06-26
topic: lab-section
---

# Lab section — requirements

## Summary

A new top-level `/lab` section: a quiet, `/writing`-style index that lists hand-built learning / case-study / experiment pages. Entries come from a small in-code registry; each detail page is bespoke React with no shared template and no CMS.

---

## Problem Frame

The portfolio has hand-built, technically distinctive pieces — an SVG constellation, a scroll-driven day journey, a Cloudflare-backed blog — but nowhere that presents them as learnings or case studies. They exist as ambient site features or are buried inside `/changelog`, so a visitor can't browse "things I built and what I learned" as a set.

`/writing` can't host them. It's a templated, CMS-backed blog for prose; these pieces are bespoke coded pages, not articles. Forcing them through a markdown template would erase the thing that makes each one worth showing.

---

## Key Decisions

- **New top-level section, not `/work` or `/writing`.** `/lab` sits alongside both. These are code artifacts distinct from templated blog prose, and `/work` stays reserved for a future work showcase rather than absorbing this.
- **In-code registry over CMS.** The source of truth is a version-controlled typed array, not D1 or the admin UI that backs `/writing`. Trade-off accepted: no editing without a deploy, in exchange for full version control and zero backend for this section.
- **No shared template — bespoke per page.** The defining constraint. Each entry page is hand-built and may look nothing like the others; the index is the only shared surface.
- **Reuse the `/writing` list layout, not a showcase grid.** Quiet editorial consistency won over louder case-study cards (the grid option was considered and rejected).
- **Nav placement between Changelog and Work** is the proposed default, adjustable during planning.

---

## Requirements

### Index page

- R1. `/lab` is a new top-level route with a matching link in the global header nav.
- R2. The index renders entries as a single vertical stack matching the `/writing` pattern — a monospace meta line (year + kind) above each title, thin dividers between rows, gold hover on the title — in the dark indigo palette used by `/writing` and `/work`.
- R3. Each row links to its entry's page; entries appear newest-first by date.
- R4. With no entries registered, the index shows a quiet empty state consistent with `/writing`'s "No posts yet."

### Entry registry

- R5. Entries are defined in a single typed in-code registry — no CMS, database, or admin UI. Adding or removing an entry is a code change.
- R6. Each registry record provides the title, the entry's route/slug, a kind label (Learning / Case study / Experiment, extensible), and a date.

### Entry pages

- R7. Each entry is a bespoke React page with no shared template; pages may differ entirely in structure, layout, and interactivity.
- R8. Entry pages live under the `/lab/<slug>` namespace and are routed per entry.
- R9. Entry pages must not add to the landing/initial bundle — they load only when their route is visited.

---

## Scope Boundaries

- No CMS, database, admin UI, or shared rendering template for lab pages — bespoke-per-page is the point.
- No index filtering, tags, or search — a plain stack suffices at low entry counts; revisit if the list grows.
- No blurb/excerpt or thumbnails on index rows — the chosen minimal layout shows meta line + title only.
- Not reshaping `/writing` or building out `/work` — both stay as they are today.

---

## Dependencies / Assumptions

- Entry pages inherit the global `Layout` (Header + Footer) like every other route; no per-page shell work.
- Reuses the existing dark indigo aesthetic and shared motion conventions (`cubic-bezier(0.16, 1, 0.3, 1)` easing, reduced-motion handling); no new design system.
- Manual coupling between registry and pages is accepted: adding an entry is two coordinated edits — a registry record plus its own page + route.

---

## Outstanding Questions

**Deferred to Planning**

- Routing shape: a single dynamic `/lab/:slug` route that resolves a component from the registry, vs. an explicit route per entry. Both satisfy R8; pick during planning.
- Dead-link safety: whether to colocate each page's component reference in its registry record so a missing/renamed page is a build/type error rather than a runtime 404. Coupling is accepted (above); this is about making it safe, not removing it.
- Confirm nav placement (proposed: between Changelog and Work).
- Final registry field set — e.g., whether to reserve an optional blurb field for future layout variants even though the v1 layout doesn't show it.

---

## Sources / Research

- `src/pages/Writing.tsx` — the list pattern to mirror: meta line + title stack, thin dividers, gold hover, loading/empty states.
- `src/AppRoutes.tsx` — route registration and the `lazy()` pattern already used to keep blog routes off the landing bundle (model for R9).
- `src/components/Layout/Header.tsx` — global nav and the shared-layout active-underline; where the Lab link is added (R1).
- `src/pages/Work.tsx` — current `"Coming soon…"` placeholder; confirms `/work` is unbuilt and reserved.
