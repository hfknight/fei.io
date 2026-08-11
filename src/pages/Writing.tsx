import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import ShimmerText from '../components/ShimmerText';
import { fetchPublishedPosts } from '../lib/blogApi';
import type { BlogPostSummary } from '../types';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* The seven letters stretched to the rail's width, the way /readme and /lab stretch their
   own wordmarks — see the stencil effect below for the measurement. */
const WORDMARK = 'writing';

/* PLACEHOLDER hero fill — the one line to change once Fei picks a photograph (e.g.
   `url('/writing-hero.webp')`, sized the way /readme's and /lab's portraits are). A neutral
   gradient off the site's own oklch ramp (hue 265) stands in until then. The wordmark and
   the hero image share this exact value, sized to the same virtual canvas (see HeroBlock),
   so the cut-out letters read as a window onto the same sheet the picture below them is. */
const HERO_FILL = 'linear-gradient(165deg, var(--n-5) 0%, var(--n-7) 55%, var(--n-9) 100%)';

interface State {
  loading: boolean;
  error: boolean;
  posts: BlogPostSummary[];
}

interface DateParts {
  day: string;
  month: string;
  year: string;
}

function dateParts(epochMs: number | null): DateParts | null {
  if (!epochMs) return null;
  const d = new Date(epochMs);
  return {
    day: d.toLocaleDateString('en-US', { day: '2-digit' }),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    year: String(d.getFullYear()),
  };
}

/** "2024 — 2026" (or a single year if every post published in it) from min/max publishedAt. */
function yearSpan(posts: BlogPostSummary[]): string | null {
  const years = posts
    .map((p) => p.publishedAt)
    .filter((v): v is number => v != null)
    .map((v) => new Date(v).getFullYear());
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} — ${max}`;
}

const Writing: React.FC = () => {
  const [state, setState] = useState<State>({ loading: true, error: false, posts: [] });
  const reduced = useReducedMotion();

  useEffect(() => {
    let active = true;
    fetchPublishedPosts()
      .then((posts) => active && setState({ loading: false, error: false, posts }))
      .catch(() => active && setState({ loading: false, error: true, posts: [] }));
    return () => {
      active = false;
    };
  }, []);

  /* Anton's ink bounds, measured exactly as /readme and /lab measure their own wordmarks
     (see those files' comments on the same effect): textLength normalises the ADVANCE
     width, which keeps the glyphs' side bearings and shows as edge gaps, so the fit is
     solved against the ink instead. The painted pixels then span the rail's full width. */
  const mastRef = useRef<HTMLDivElement>(null);
  const [stencil, setStencil] = useState({ x: 0, fontSize: 90, textLength: 300 });
  useEffect(() => {
    let cancelled = false;
    // jsdom implements neither the font-loading API nor canvas 2d; the stencil simply
    // keeps its Anton-approximating defaults there, which is all a render test can
    // observe anyway.
    if (!document.fonts?.load) return;
    document.fonts.load('100px Anton').then(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      const box = mastRef.current?.clientWidth;
      if (cancelled || !ctx || !box) return;
      ctx.font = '100px Anton';
      const m = ctx.measureText(WORDMARK);
      const inkLeft = -m.actualBoundingBoxLeft;
      const inkRight = m.actualBoundingBoxRight;
      const fontSize = 100 * (48 / m.actualBoundingBoxAscent);
      const s = fontSize / 100;
      const k = box / ((inkRight - inkLeft) * s);
      setStencil({ x: -inkLeft * s * k, fontSize, textLength: m.width * s * k });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = yearSpan(state.posts);

  return (
    <PageTransition>
      <Page>
        <Block>
          <LeftCol
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Mobile-only stand-in for the cut-out mark below, which needs a rail wide
                enough to stretch seven letters across. */}
            <Heading>writing</Heading>

            <HeroBlock>
              {/* The letterforms are windows onto the hero image directly beneath them —
                  aria-hidden, purely decorative. */}
              <Masthead ref={mastRef} aria-hidden>
                <svg width="0" height="0" focusable="false">
                  <defs>
                    <clipPath id="writing-clip" clipPathUnits="userSpaceOnUse">
                      {/* userSpaceOnUse = Masthead's own pixel grid: y=48 doubled by
                          scale(1,2) puts the baseline at 96, the div's bottom edge —
                          exactly where the hero image begins. */}
                      <text
                        x={stencil.x}
                        y="48"
                        transform="scale(1,2)"
                        textLength={stencil.textLength}
                        lengthAdjust="spacingAndGlyphs"
                        fontFamily="Anton"
                        fontSize={stencil.fontSize}
                      >
                        {WORDMARK}
                      </text>
                    </clipPath>
                  </defs>
                </svg>
              </Masthead>
              <HeroImage />
            </HeroBlock>

            {/* Stub copy — Fei will supply the final line. */}
            <Intro>
              Notes on building things for the web — engineering, design, and the seams
              between them.
            </Intro>
          </LeftCol>

          <RightCol>
            <RightHeader>{years && <YearBand>{years}</YearBand>}</RightHeader>

            {state.loading && <Status><ShimmerText>Loading…</ShimmerText></Status>}
            {state.error && <Status>Couldn’t load posts.</Status>}
            {!state.loading && !state.error && state.posts.length === 0 && (
              <Status>No posts yet.</Status>
            )}

            <List>
              {state.posts.map((post, i) => {
                const parts = dateParts(post.publishedAt);
                return (
                  <Item
                    key={post.id}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: reduced ? 0.4 : 0.9, delay: 0.15 + i * 0.08, ease }}
                  >
                    <EntryLink to={`/writing/${post.slug}`}>
                      {parts && (
                        <EntryDate>
                          <span className="day">{parts.day}</span>
                          <span className="ym">
                            {parts.month} {parts.year}
                          </span>
                        </EntryDate>
                      )}
                      <EntryTitle>{post.title}</EntryTitle>
                    </EntryLink>
                  </Item>
                );
              })}
            </List>
          </RightCol>
        </Block>
      </Page>
    </PageTransition>
  );
};

export default Writing;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const Page = styled.div`
  min-height: 100dvh;
  background: ${(p) => p.theme.color.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rem 2rem 6rem;
`;

const Block = styled.div`
  /* Shared by the grid column and the hero block below, so the wordmark, the placeholder
     fill and the layout all agree on one rail width. */
  --rail: 300px;
  --word-h: 96px;

  display: grid;
  /* LeftCol's own padding-right eats into its content box, so the track has to carry that
     padding too — otherwise --rail (used below for the hero canvas's width and background
     math) would promise a wider box than HeroImage actually renders at. */
  grid-template-columns: calc(var(--rail) + 2rem) 1fr;
  column-gap: 4rem;
  max-width: 960px;
  width: 100%;

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
    row-gap: 3rem;
  }
`;

const LeftCol = styled(motion.div)`
  position: sticky;
  top: calc(${(p) => p.theme.barHeight} + 3rem);
  align-self: start;
  padding-right: 2rem;
  border-right: 1px solid ${(p) => p.theme.color.border};

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    position: static;
    padding-right: 0;
    border-right: none;
  }
`;

/* The cut-out mark below is aria-hidden and the removed breadcrumb was the page's only
   other text naming it, so this stays in the accessibility tree everywhere — visually
   hidden above the wordmark's breakpoint (clipped, not display:none) rather than only
   existing on mobile. */
const Heading = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    position: static;
    width: auto;
    height: auto;
    margin: 0 0 1.5rem;
    padding: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;

    font-family: ${(p) => p.theme.font.display};
    font-weight: 700;
    font-size: clamp(2rem, 8vw, 2.6rem);
    color: ${(p) => p.theme.color.ink};
  }
`;

/* The wordmark and the hero image share one virtual canvas — --word-h tall for the
   letters, then --hero-h more for the picture — so a single background-position offset
   per layer is enough to make the two read as one continuous sheet. */
const HeroBlock = styled.div`
  position: relative;
  --hero-h: calc(var(--rail) * 5 / 4);
`;

/* writing as cut-out type: a box filled with the shared hero fill, clipped to the
   letterforms, so the word is a window onto the image rather than ink laid over it. */
const Masthead = styled.div`
  position: relative;
  height: var(--word-h);
  pointer-events: none;

  background-image: ${HERO_FILL};
  background-size: 100% calc(var(--word-h) + var(--hero-h));
  background-position: 0 0;
  clip-path: url(#writing-clip);
  -webkit-clip-path: url(#writing-clip);

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    display: none;
  }
`;

/* The picture, 4:5, filling the rail. Its background continues the wordmark's fill: same
   image, same canvas size, offset up by --word-h so the two rows meet at the seam. */
const HeroImage = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;

  background-image: ${HERO_FILL};
  background-size: 100% calc(var(--word-h) + var(--hero-h));
  background-position: 0 calc(-1 * var(--word-h));

  /* Subtle grain, reusing the landing's frost texture at low opacity, so the placeholder
     reads as paper rather than a flat swatch. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--frost-noise);
    mix-blend-mode: soft-light;
    opacity: 0.4;
    pointer-events: none;
  }

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    aspect-ratio: 2 / 1;
    /* No wordmark to align to below the wordmark breakpoint, so the shared canvas sizing
       is dropped in favour of the box's own fit. */
    background-size: 100% 100%;
    background-position: 0 0;
  }
`;

const Intro = styled.p`
  font-family: ${(p) => p.theme.font.body};
  font-weight: 200;
  line-height: 1.6;
  color: ${(p) => p.theme.color.inkMuted};
  margin-top: 1.5rem;

  @media (max-width: ${(p) => p.theme.breakpoints.sm}) {
    display: none;
  }
`;

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

const RightCol = styled.div`
  min-width: 0;
`;

const RightHeader = styled.div`
  /* Kept even while the band's text is absent (loading/empty), so the list still opens
     under a rule rather than the header vanishing and reappearing once posts arrive. */
  min-height: 0.68rem;
  padding-bottom: 1.1rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
`;

const YearBand = styled.span`
  display: block;
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.68rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${(p) => p.theme.color.inkMuted};
`;

const Status = styled.p`
  font-family: ${(p) => p.theme.font.body};
  font-weight: 200;
  color: ${(p) => p.theme.color.inkMuted};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled(motion.li)`
  & + & {
    border-top: 1px solid ${(p) => p.theme.color.border};
  }
`;

const EntryLink = styled(Link)`
  display: grid;
  grid-template-columns: 64px 1fr;
  align-items: baseline;
  column-gap: 1.5rem;
  text-decoration: none;
  padding: 1.6rem 0;

  &:hover h2 {
    color: var(--accent);
  }
`;

const EntryDate = styled.span`
  display: flex;
  flex-direction: column;
  font-family: ${(p) => p.theme.font.mono};

  .day {
    font-size: 1.8rem;
    line-height: 1;
    color: ${(p) => p.theme.color.ink};
  }

  .ym {
    margin-top: 0.4rem;
    font-size: 0.55rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: ${(p) => p.theme.color.inkMuted};
  }
`;

const EntryTitle = styled.h2`
  grid-column: 2;
  font-family: ${(p) => p.theme.font.body};
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 300;
  line-height: 1.2;
  color: ${(p) => p.theme.color.ink};
  margin: 0;
  transition: color 0.3s ease;
`;
