import styled from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate, isVideoUrl } from './types';

/* The hero glyph: the title's first letterform, blown up past its frame the way an
   editorial spread crops a numeral — form first, letter second. First alphanumeric
   so quotes/emoji don't become the monument; a title with none falls back to its
   first character. The case is the title's own — the glyph quotes the title rather
   than displaying it, so "fanmatchday…" cuts an f, not an F. */
function heroGlyph(title: string): string {
  const m = title.match(/[A-Za-z0-9]/);
  return m ? m[0] : title.trim().charAt(0) || 'f';
}

// Standard article: the writing index's split, carried into the post — the title's
// first letter set huge in Anton owns the left rail, and everything readable (date,
// title, body) hangs right of a full-height rule, like the reference spreads.
export default function StandardArticle({ title, coverImageUrl, publishedAt, children }: TemplateProps) {
  // An image cover becomes the well's ground with the glyph die-cut out of it
  // (figure and ground swapped from the old letter-window); it is not repeated
  // below. Video covers keep the old inline render.
  const coverFill = coverImageUrl && !isVideoUrl(coverImageUrl) ? coverImageUrl : null;

  return (
    <Article>
      <GlyphCol aria-hidden>
        <GlyphWell
          $cover={coverFill != null}
          style={coverFill ? { backgroundImage: `url(${coverFill})` } : undefined}
        >
          <Glyph $cover={coverFill != null}>{heroGlyph(title)}</Glyph>
        </GlyphWell>
      </GlyphCol>

      <TextCol>
        {publishedAt ? <DateLabel>{formatDate(publishedAt)}</DateLabel> : null}
        <Title>{title}</Title>
        {coverImageUrl && !coverFill ? <Cover src={coverImageUrl} alt="" loading="lazy" /> : null}
        {children}
      </TextCol>
    </Article>
  );
}

const Article = styled.article`
  display: grid;
  /* The index's split, mirrored in miniature: rail left, reading column right. No
     column gap — the rule is TextCol's own left border, and the glyph must be able
     to press against it. */
  grid-template-columns: minmax(150px, 220px) 1fr;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

/* Sticky like the index's picture: the monument holds while the text scrolls past. */
const GlyphCol = styled.div`
  position: sticky;
  top: calc(${p => p.theme.barHeight} + 3rem);
  align-self: start;
  min-width: 0;
  /* Drop the monument so its mass sits at the title/body boundary rather than
     hanging off the date line. Padding, not margin: it's inside the sticky box,
     so the pinned position keeps the same drop. */
  padding-top: 3.5rem;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    position: static;
    padding-top: 0;
  }
`;

/* The glyph's frame. Overflow-hidden is what turns a drop cap into a crop: the
   letterform is set larger than this box and anchored to its right edge, so it sheds
   its left side past the rail and its extremes past the top and bottom. */
const GlyphWell = styled.div<{ $cover: boolean }>`
  position: relative;
  overflow: hidden;
  /* A custom property so the glyph can size itself against the well (see Glyph's
     font-size) — the two must not drift apart. */
  --well-h: clamp(14rem, 40vh, 20rem);
  height: var(--well-h);

  /* With a cover the well shows the picture itself, anchored left so the overflow
     sheds past the right rule — the same blade that shears the glyph. The ink
     underlay is the degradation path: a cover that fails to load leaves the paper
     letter on solid ink (the monument inverted) rather than paper on paper, i.e.
     an empty header. */
  ${p =>
    p.$cover &&
    `
    background-color: ${p.theme.color.ink};
    background-size: cover;
    background-position: left center;
  `}

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    --well-h: 8.5rem;
    margin-bottom: 2rem;
  }
`;

const Glyph = styled.span<{ $cover: boolean }>`
  position: absolute;
  top: 50%;
  /* Pushed past the well's edge so the rule shears the letterform's right side —
     the well's overflow clip IS the rule's position, so the line reads as the
     blade that cut the glyph. */
  right: -0.05em;
  transform: translateY(-50%);
  /* Anton, like the wordmark stencils on /readme, /lab, and the index masthead —
     deliberately outside the token system (see CLAUDE.md on the stencil faces). */
  font-family: Anton, sans-serif;
  /* Solved for the well like the lab stencil solves for cap height: Anton's caps and
     ascenders ink 0.86em (canvas-measured), so this fills the well flush top and
     bottom. Wide glyphs still shed their left side past the rail; descenders shed
     past the bottom. */
  font-size: calc(var(--well-h) / 0.86);
  /* Load-bearing beyond taste: at Anton's 0.86em ink height a 0.85 line box hugs the
     letterform, so centering the box centers the ink. */
  line-height: 0.85;
  color: ${p => p.theme.color.ink};
  user-select: none;

  /* With a cover, figure and ground swap: the picture (on GlyphWell) is the ground
     and the letter is die-cut out of it. Painted in the surface colour rather than
     masked out — the hole shows flat paper, so an overlay in paper's own token is
     pixel-identical to a true knockout and needs none of the mask plumbing. Scaled
     down from the monument (~60% of the well) and dropped to the bottom edge: a
     printer's mark stamped in the corner, still sheared by the rule, its descenders
     shed past the bottom. Stretched wide the way the index masthead stretches its
     stencil letters tall — Anton's lowercase forms are condensed stems, and unstretched
     the sheared f reads as a bare bar rather than a letter. */
  ${p =>
    p.$cover &&
    `
    top: auto;
    bottom: -0.12em;
    transform: scaleX(1.25);
    transform-origin: bottom right;
    font-size: clamp(11rem, 33vh, 16rem);
    color: ${p.theme.color.surface};
  `}

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    ${p =>
      p.$cover
        ? /* The die-cut is an edge mark, so it keeps the right anchor even without
             the rule to press against. */
          `font-size: 7rem;`
        : /* No rule to press against below the split — anchor left and crop right.
             The base font-size tracks --well-h, so the fit carries down unstated. */
          `left: 0;
           right: auto;`}
  }
`;

/* Everything readable hangs off the rule, which runs the article's full height. */
const TextCol = styled.div`
  min-width: 0;
  border-left: 1px solid ${p => p.theme.color.border};
  padding-left: clamp(1.8rem, 4.5vw, 3rem);

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    border-left: none;
    padding-left: 0;
  }
`;

const DateLabel = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 1.2rem;
`;

const Title = styled.h1`
  color: ${p => p.theme.color.ink};
  font-family: ${p => p.theme.font.display};
  font-size: clamp(1.7rem, 4.2vw, 2.6rem);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin: 0 0 2.6rem;
`;

const Cover = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 0 0 2.4rem;
`;
