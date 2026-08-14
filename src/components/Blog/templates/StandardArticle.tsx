import styled from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate, isVideoUrl } from './types';

/* The hero glyph: the title's first letterform, blown up past its frame the way an
   editorial spread crops a numeral — form first, letter second. First alphanumeric
   so quotes/emoji don't become the monument; a title with none falls back to its
   first character. Always uppercased: the monument is a display form, not a
   quotation — lowercase letters like f or l reduce to a bare stem once the rule
   shears their right side, and read as a 1. */
function heroGlyph(title: string): string {
  const m = title.match(/[A-Za-z0-9]/);
  return (m ? m[0] : title.trim().charAt(0) || 'f').toUpperCase();
}

// Standard article: the writing index's split, carried into the post — the title's
// first letter set huge in Anton owns the left rail, and everything readable (date,
// title, body) hangs right of a full-height rule, like the reference spreads.
export default function StandardArticle({ title, coverImageUrl, publishedAt, children }: TemplateProps) {
  // An image cover becomes the glyph's fill (a window onto it, like the index
  // masthead); it is not repeated below. Video covers keep the old inline render.
  const coverFill = coverImageUrl && !isVideoUrl(coverImageUrl) ? coverImageUrl : null;

  return (
    <Article>
      <GlyphCol aria-hidden>
        <GlyphWell>
          <Glyph
            $cover={coverFill != null}
            style={coverFill ? { backgroundImage: `url(${coverFill})` } : undefined}
          >
            {heroGlyph(title)}
          </Glyph>
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
const GlyphWell = styled.div`
  position: relative;
  overflow: hidden;
  height: clamp(14rem, 40vh, 20rem);

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    height: 8.5rem;
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
  /* Set well past the frame: taller than GlyphWell, so the letterform sheds its
     extremes top and bottom, and wide glyphs shed their left side — the crop is
     what makes it a form instead of a drop cap. */
  font-size: clamp(20rem, 44vh, 27rem);
  line-height: 0.85;
  color: ${p => p.theme.color.ink};
  user-select: none;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    /* No rule to press against below the split — anchor left and crop right. */
    left: 0;
    right: auto;
    font-size: 12rem;
  }

  /* With a cover, the letter is a window onto it — background-clip: text, the CSS
     twin of the index masthead's SVG stencil. The ink background-color stays
     underneath so a cover that fails to load degrades to the solid-ink glyph
     instead of an invisible one. */
  ${p =>
    p.$cover &&
    `
    background-color: currentColor;
    background-size: cover;
    background-position: center;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  `}
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
