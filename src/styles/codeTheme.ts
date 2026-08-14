import { css } from 'styled-components';

/**
 * The highlight.js token palette, in one place.
 *
 * It previously existed twice — in `Blog/PostBody.tsx` and in the
 * `interfaces-that-feel-better` lab entry — with a comment in each pointing at the other.
 * The two were still identical, but only by hand: seven colours copied between two files
 * is a drift waiting to happen, and it already had one consequence (below).
 *
 * The selectors here are the UNION of what the two declared. PostBody grouped
 * `.hljs-type` and `.hljs-class .hljs-title` with the blues while the lab entry grouped
 * `.hljs-attribute` and `.hljs-property` there; both now get every selector. Specificity
 * still resolves `.hljs-class .hljs-title` (0,2,0) ahead of `.hljs-title` (0,1,0), so a
 * class name stays blue rather than accent, exactly as before.
 *
 * `--accent` is intentionally the one token that is not literal: it is the site's yellow
 * on a deep ground, and both call sites are deep. The rest stay literal because this is a
 * code island — a deliberately off-surface object — not page chrome.
 */

/**
 * Comments have to recede without dropping out. #6b7280 (the old value) did drop out: it
 * measured 3.33:1 on the lab entry's island and 4.03:1 on the blog's, so it failed AA in
 * both places — the one thing the duplication actually cost, since neither copy was ever
 * checked against the other's ground.
 *
 * The two islands are not the same colour (`rgba(0,0,0,0.28)` over --n-11 composites to
 * (32,33,36); the blog's is #0c0a1f), so this is tuned against the LIGHTER of them, which
 * binds. 5.20:1 there and 6.29:1 on the blog, while staying well below the 8.5–8.9:1 the
 * other tokens carry — so it still reads as the quiet one.
 */
export const HLJS_COMMENT = '#8b93a1';

/**
 * The island itself: the ground a code block sits on, as a RELATIONSHIP rather than a
 * value. 28% black over whatever the page already is.
 *
 * The two call sites disagreed. The blog declared a literal `#0c0a1f` — described as
 * "darker than any surface token", which it was: a fourth dark outside the ramp. The lab
 * entry tinted instead. They were never reconciled because nobody had a reason to compare
 * them, and the palette above was quietly being tuned against whichever one the author
 * happened to be looking at.
 *
 * They turn out to be the same idea. 28% black over the blog's deep surface composites to
 * (13,12,30) against the literal's (12,10,31) — one, two and minus one per channel, which
 * is nothing. So the literal WAS this tint, written out by hand, and unifying on the rule
 * leaves the blog looking exactly as it did while deleting the off-ramp value.
 *
 * As a rule it also travels: the lab entry's lighter --n-11 ground yields (31,33,36), and
 * a future page gets an island that suits its own surface rather than one borrowed from a
 * page it has never seen. The cost is that contrast varies by ground, which is why the
 * palette above is tuned against the LIGHTEST ground in use and the test pins it there.
 */
export const CODE_ISLAND = 'rgba(0, 0, 0, 0.28)';

/** The island's rim. Both call sites already agreed on this; only the fill had drifted. */
export const CODE_ISLAND_RIM = 'rgba(255, 255, 255, 0.08)';

export const hljsTokens = css`
  .hljs-comment,
  .hljs-quote {
    color: ${HLJS_COMMENT};
    font-style: italic;
  }

  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-selector-class,
  .hljs-selector-id,
  .hljs-selector-pseudo,
  .hljs-built_in,
  .hljs-meta {
    color: #c4b5fd;
  }

  .hljs-string,
  .hljs-attr {
    color: #86efac;
  }

  .hljs-number,
  .hljs-literal {
    color: #fca5a5;
  }

  .hljs-attribute,
  .hljs-property,
  .hljs-type,
  .hljs-class .hljs-title {
    color: #93c5fd;
  }

  .hljs-title,
  .hljs-section,
  .hljs-function .hljs-title {
    color: var(--accent);
  }

  .hljs-tag,
  .hljs-name {
    color: #f9a8d4;
  }
`;
