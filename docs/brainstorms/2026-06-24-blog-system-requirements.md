---
date: 2026-06-24
topic: blog-system
---

# Blog System — Requirements

## Summary

Add a dynamic blog to the existing portfolio. The single author writes posts in
markdown through a Cloudflare Access–protected admin inside the React app, picks
one of a few preset layouts, and uploads images and short videos. Posts live in
Cloudflare D1, media in R2, served by a thin Pages Functions API. The public
site renders markdown with `react-markdown` and stays on Cloudflare Pages.

---

## Problem Frame

The site (`src/`) is a fully static React + Vite SPA. All content is either
hardcoded or fetched at runtime from a static file (`public/data/portfolio.json`);
there is no database and no backend. Publishing anything new today means editing
code or JSON and redeploying.

The author wants to write regularly and publish from any device without a code
edit or rebuild per post — which rules out the simplest "markdown files in the
repo" approach and justifies a real (if small) backend. The decision this
brainstorm settles is how much to build versus adopt, and what shape the
Cloudflare-native backend takes.

---

## Key Decisions

- **Use libraries for the commodity parts, build the glue.** Markdown rendering
  and the editor are solved problems and get libraries; the CMS layer (API +
  admin + templates) is small and specific, so it is built thin and custom. No
  heavyweight CMS.

- **Build a thin Cloudflare-native backend, not a headless CMS.** A CMS
  (Payload/Directus/Strapi) would need non-Cloudflare hosting and fight the D1/R2
  goal for a single-author blog. A small API over D1 and R2 fits the existing
  stack and stays near-free.

- **Render with `react-markdown` at runtime, not MDX.** Posts are stored in the
  database and rendered on the client; MDX-at-runtime would mean evaluating code
  the editor wrote — extra build complexity and a security surface. `react-markdown`
  renders content without executing it.

- **Templates are React layout wrappers selected by a post field.** "Layout
  management" is a small fixed set of presets (standard article, photo-essay,
  video-forward), each a React wrapper around the rendered markdown body. This
  decouples templates from the rendering engine and avoids MDX entirely.

- **Media uploads go browser→R2 directly via presigned URLs.** The backend issues
  a presigned PUT URL; the browser uploads straight to R2. This avoids piping
  large video files through the Worker and keeps credentials server-side.

- **Verify the Access identity server-side.** The backend validates the
  Cloudflare Access JWT assertion on every write request rather than assuming
  Access enforcement is always in front of it.

- **Self-host video as raw R2 files for v1.** Cheapest path (R2 has no egress
  fees), served via a standard `<video>` element. No adaptive bitrate, so clips
  stay short; Cloudflare Stream is a later upgrade that doesn't change the post
  model much.

---

## Requirements

**Authoring & Admin**

- R1. A single author can create, edit, and delete posts through an admin UI
  served within the existing React app.
- R2. The admin lives at a dedicated route and is not linked from the public
  site navigation (`src/components/Layout/Header.tsx`).
- R3. The editor accepts markdown and shows a live preview, using an editor
  library rather than a hand-built editor.
- R4. Each post carries metadata: title, slug, cover image, publish date,
  template selection, and a draft/published state.
- R5. Saving a post persists it with no site rebuild or redeploy.

**Content & Rendering**

- R6. Post bodies are authored and stored as markdown and rendered to HTML at
  runtime with `react-markdown` — GitHub-flavored markdown, syntax-highlighted
  code blocks, and sanitized output.
- R7. Each post selects one of a small fixed set of layout templates (standard
  article, photo-essay, video-forward); the template is a React wrapper around
  the rendered markdown.
- R8. MDX is not used; stored content never executes code.

**Media**

- R9. The author can upload images and short videos from the admin; uploads go
  directly from the browser to R2 via a presigned URL, with the backend only
  issuing the signed URL.
- R10. Uploaded media is referenced by stable public URLs usable inside markdown
  bodies and in template fields such as the cover image.
- R11. Video is served as raw R2 files via a standard `<video>` element, with no
  adaptive streaming in v1.

**Public Blog**

- R12. A public blog index at `/writing` lists published posts, most-recent
  first, and links to each post.
- R13. Individual posts are reachable at a stable, slug-based URL under
  `/writing/<slug>`.
- R14. Draft posts never appear on the public index and are not viewable by
  guessing a URL.

**Security & Auth**

- R15. The admin route and all write API endpoints are protected by Cloudflare
  Access; only the owner can reach them.
- R16. The backend verifies the Cloudflare Access JWT assertion on every write
  request rather than trusting that Access enforcement is present.

**Hosting**

- R17. The site stays on Cloudflare Pages; the backend is added as Pages Functions
  (or an equivalent Worker) bound to D1 for post content and R2 for media.

---

## Key Flows

- F1. Author writes and publishes a post
  - **Trigger:** Author opens the Access-protected admin and creates a post.
  - **Steps:** Write markdown with live preview; set metadata and pick a
    template; save as draft; later toggle to published.
  - **Outcome:** Published post appears on the public index and at its slug URL
    with no redeploy.
  - **Covered by:** R1, R3, R4, R5, R7, R12, R13

- F2. Author uploads media
  - **Trigger:** Author adds an image or video while editing.
  - **Steps:** Admin requests a presigned URL from the backend; the browser PUTs
    the file directly to R2; the returned public URL is inserted into the
    markdown or set as the cover image.
  - **Outcome:** Media is hosted on R2 and referenced by a stable URL.
  - **Covered by:** R9, R10, R11

- F3. Visitor reads the blog
  - **Trigger:** Visitor opens the blog index or a post URL.
  - **Steps:** The public site fetches published post(s) from the API and renders
    the markdown body inside the selected template wrapper.
  - **Outcome:** Visitor sees the rendered post; drafts are never served.
  - **Covered by:** R6, R7, R12, R13, R14

---

## Acceptance Examples

- AE1. Draft stays private
  - **Covers R14.**
  - **Given** a post in draft state, **when** a visitor loads the blog index or
    guesses its slug URL, **then** the post is not shown and the URL does not
    resolve to it.

- AE2. Publishing is immediate
  - **Covers R5, R12.**
  - **Given** a saved draft, **when** the author toggles it to published, **then**
    it appears on the public index without any rebuild or redeploy.

- AE3. Template changes presentation, not content
  - **Covers R7.**
  - **Given** the same post body, **when** the author switches its template from
    standard to photo-essay, **then** the rendered presentation changes while the
    markdown content is unchanged.

---

## Scope Boundaries

**Deferred for later (v2)**

- Tags, series, and search/filtering on the index. Posts may still gain tag
  metadata later; the browsing UI is the deferred part.
- RSS / Atom feed.
- Adaptive video streaming via Cloudflare Stream.

**Outside this feature's identity**

- Comments.
- Multi-author accounts, roles, or permissions beyond the single owner.
- A full block / page-builder. Preset templates were chosen deliberately instead.

---

## Dependencies / Assumptions

- Cloudflare account with the existing Pages project, plus D1, R2, and Zero
  Trust / Access enabled.
- R2 credentials available to the backend as secrets for presigned-URL signing.
- Draft → published is the desired flow (confirmed in dialogue), not
  publish-immediately-only.
- Video clips are kept short and compressed because raw R2 serving has no
  adaptive bitrate.
- Sanitization is applied during rendering even though the single author is
  trusted — defensive default for stored HTML in markdown.
- Cloudflare Access free tier covers a single owner; confirm current seat limits
  when configuring.

---

## Outstanding Questions

**Deferred to planning**

- D1 schema and API endpoint shape.
- Whether public reads hit the API live or go through a cached/static layer for
  performance.
- Editor library choice and the syntax-highlighting plugin for `react-markdown`.
- Slug generation and collision handling.
- Image handling specifics (raw R2 vs Cloudflare Images for resizing/variants).
