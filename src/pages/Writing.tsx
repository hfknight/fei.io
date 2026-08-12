import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import ShimmerText from '../components/ShimmerText';
import { fetchPublishedPosts } from '../lib/blogApi';
import { WRITING_GROUND } from '../styles/surface';
import type { BlogPostSummary } from '../types';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* Seconds of flat paper before the entrance choreography begins. The page mounts only
   after the curtain has fully swept (AnimatePresence mode="wait"), then PageTransition
   fades it in over 0.3s — starting the rules at t=0 buries the stroke's start in that
   fade. A beat of stillness first, the way /readme holds ~0.95s before its own cascade. */
const LEAD = 0.35;

/* The seven letters stretched to the rail's width, the way /readme and /lab stretch their
   own wordmarks — see the stencil effect below for the measurement. */
const WORDMARK = 'writing';

/* The hero: Ollie and a tabby in a rose window, pre-cropped to the shared canvas's exact
   300:471 ratio so neither layer stretches it. The wordmark and the hero image share this
   value, sized to the same virtual canvas (see HeroBlock), so the cut-out letters read as
   a window onto the same sheet the picture below them is. */
const HERO_SRC = '/writing-hero.webp';
const HERO_FILL = `url('${HERO_SRC}')`;

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

  /* The hero (and the wordmark windowing onto it) holds off until its pixels exist —
     otherwise the entrance plays over a blank rectangle and the picture pops in after.
     Both layers ride one motion wrapper so the seam never shears mid-animation. In jsdom
     Image never fires load; the block simply stays at its initial state there. */
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHeroReady(true);
    img.src = HERO_SRC;
    return () => {
      img.onload = null;
    };
  }, []);

  const years = yearSpan(state.posts);

  return (
    <PageTransition>
      <Page>
        <Block>
          <LeftCol>
            {/* The column rule, drawn top-to-bottom a beat after the header rule starts —
                the two borders it replaces can't animate directionally. */}
            <ColRule
              initial={reduced ? { opacity: 0 } : { scaleY: 0 }}
              animate={reduced ? { opacity: 1 } : { scaleY: 1 }}
              transition={{ duration: reduced ? 0.4 : 0.55, delay: reduced ? 0 : LEAD + 0.18, ease }}
            />

            {/* Mobile-only stand-in for the cut-out mark below, which needs a rail wide
                enough to stretch seven letters across. */}
            <Heading>writing</Heading>

            {/* The whole sheet — wordmark and picture — slides out of the column rule as
                one, so the seam between the two layers never shears mid-entrance. */}
            <HeroClip>
              <HeroBlock
                initial={reduced ? { opacity: 0 } : { x: '100%' }}
                animate={heroReady ? (reduced ? { opacity: 1 } : { x: 0 }) : undefined}
                transition={{ duration: reduced ? 0.4 : 0.85, delay: reduced ? 0 : LEAD + 0.35, ease }}
              >
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
            </HeroClip>

            {/* Stub copy — Fei will supply the final line. */}
            <Intro
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: reduced ? 0 : LEAD + 0.45, ease: 'easeOut' }}
            >
              Notes on building things for the web — engineering, design, and the seams
              between them.
            </Intro>
          </LeftCol>

          <RightCol>
            <RightHeader>
              {years && <YearBand>{years}</YearBand>}
              {/* Drawn right-to-left first; the column rule follows. */}
              <HeaderRule
                initial={reduced ? { opacity: 0 } : { scaleX: 0 }}
                animate={reduced ? { opacity: 1 } : { scaleX: 1 }}
                transition={{ duration: reduced ? 0.4 : 0.55, delay: reduced ? 0 : LEAD, ease }}
              />
            </RightHeader>

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
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduced ? 0.4 : 0.45,
                      delay: reduced ? 0 : LEAD + 0.5 + i * 0.06,
                      ease,
                    }}
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
  /* The writing pages' sunlit paper — shared with WritingPost and the transition curtain
     via surface.ts, so the curtain hand-off stays pixel-identical. */
  background: ${WRITING_GROUND};
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

const LeftCol = styled.div`
  position: sticky;
  top: calc(${(p) => p.theme.barHeight} + 3rem);
  align-self: start;
  padding-right: 2rem;

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    position: static;
    padding-right: 0;
  }
`;

/* LeftCol's old border-right as a drawable element: scaleY 0→1 from the top. */
const ColRule = styled(motion.span)`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 1px;
  background: ${(p) => p.theme.color.border};
  transform-origin: top center;

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    display: none;
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
/* Overflow gate for the hero's entrance: the block starts translated fully to the right
   (at the column rule) and slides left into view, clipped so it emerges from the line. */
const HeroClip = styled.div`
  overflow: hidden;
`;

const HeroBlock = styled(motion.div)`
  position: relative;
  --hero-h: calc(var(--rail) * 5 / 4);
`;

/* writing as cut-out type: a box filled with the shared hero fill, clipped to the
   letterforms, so the word is a window onto the image rather than ink laid over it. */
const Masthead = styled.div`
  position: relative;
  height: var(--word-h);
  pointer-events: none;

  /* An accent scrim over the letters, heaviest at the cap line and gone by the baseline:
     the image's top strip is pale wall and paler roses, near the paper's own value, so
     unshaded letterforms barely read. The accent (the light surface's olive-bronze, the
     link colour everywhere on light pages) multiplied over the watercolor deepens it the
     way pigment would — the roses' own yellow, darkened — and fading it out toward the
     seam keeps the word growing out of the picture instead of sitting on a tinted pane. */
  background-image:
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--accent) 85%, transparent),
      color-mix(in srgb, var(--accent) 40%, transparent) 70%,
      transparent
    ),
    ${HERO_FILL};
  background-size:
    100% 100%,
    100% calc(var(--word-h) + var(--hero-h));
  background-position: 0 0;
  background-blend-mode: multiply, normal;
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

  /* Subtle grain, reusing the landing's frost texture at low opacity — the same finish
     /readme's and /lab's pictures wear. */
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
       is dropped; cover keeps the portrait image undistorted in the wide banner, centred
       on the window and its occupants. */
    background-size: cover;
    background-position: center;
  }
`;

const Intro = styled(motion.p)`
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
  position: relative;
  min-height: 0.68rem;
  padding-bottom: 1.1rem;
  margin-bottom: 0.5rem;
`;

/* RightHeader's old border-bottom as a drawable element: scaleX 0→1 from the right. */
const HeaderRule = styled(motion.span)`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: ${(p) => p.theme.color.border};
  transform-origin: right center;
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
