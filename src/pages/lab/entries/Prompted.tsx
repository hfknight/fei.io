import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageTransition from '../../../components/PageTransition';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { promptedByDate, thumbUrl, type PromptedItem } from './promptedData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */

const CopyButton: React.FC<{ prompt: string }> = ({ prompt }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(prompt);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }, [prompt]);

  return (
    <Copy type="button" onClick={onCopy}>
      {copied ? 'copied' : 'copy'}
    </Copy>
  );
};

const Lightbox: React.FC<{
  item: PromptedItem;
  /* Arrows and arrow keys are pointless with one piece on the shelf. */
  canStep: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}> = ({ item, canStep, onClose, onPrev, onNext }) => {
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && canStep) onPrev();
      if (e.key === 'ArrowRight' && canStep) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, canStep]);

  const duration = reduceMotion ? 0 : 0.35;

  return (
    <Scrim
      role="dialog"
      aria-modal="true"
      aria-label={item.title ?? item.model}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, ease: EASE }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Frame
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
        transition={{ duration, ease: EASE }}
      >
        <Media>
          {item.type === 'image' ? (
            <img src={item.src} alt={item.title ?? item.model} />
          ) : (
            /* key forces a remount per piece: a live video element never re-reads its
               <source> children, so arrowing video-to-video would keep playing the old
               clip. Full-size poster here; only the grid tile wants the thumb. */
            <video key={item.id} controls playsInline preload="none" poster={item.poster}>
              <source src={item.webm} type="video/webm" />
              <source src={item.mp4} type="video/mp4" />
            </video>
          )}
        </Media>

        <Info>
          <InfoHead>
            {item.title && <InfoTitle>{item.title}</InfoTitle>}
            <Close ref={closeRef} type="button" onClick={onClose} aria-label="Close">
              close
            </Close>
          </InfoHead>

          <PromptBlock>{item.prompt}</PromptBlock>
          <CopyButton prompt={item.prompt} />

          <Meta>
            {item.model} · {item.date}
          </Meta>
        </Info>

        {canStep && (
          <Nav>
            <NavButton type="button" onClick={onPrev} aria-label="Previous piece">
              ←
            </NavButton>
            <NavButton type="button" onClick={onNext} aria-label="Next piece">
              →
            </NavButton>
          </Nav>
        )}
      </Frame>
    </Scrim>
  );
};

/* ------------------------------------------------------------------ */
/* Grid                                                                 */
/* ------------------------------------------------------------------ */

const Tile: React.FC<{
  item: PromptedItem;
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ item, onOpen }) => (
  <TileButton type="button" onClick={onOpen}>
    {item.type === 'image' ? (
      <img src={thumbUrl(item.src)} loading="lazy" decoding="async" alt={item.title ?? item.model} />
    ) : (
      <>
        <img
          src={thumbUrl(item.poster)}
          loading="lazy"
          decoding="async"
          alt={item.title ?? item.model}
        />
        <PlayGlyph aria-hidden>▶</PlayGlyph>
      </>
    )}
  </TileButton>
);

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

const Prompted: React.FC = () => {
  usePageTitle('everything here was prompted — an AI gallery · Fei Hu');

  const items = promptedByDate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((i) => (i === null ? i : (i + delta + items.length) % items.length));
    },
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [openIndex]);

  const open = (index: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    openerRef.current = e.currentTarget;
    setOpenIndex(index);
  };

  return (
    <PageTransition>
      <Page>
        <Column>
          <Kicker>
            fei.hu / <Crumb to="/lab">lab</Crumb> / prompted
          </Kicker>
          <Title>everything here was prompted</Title>
          <Lede>
            Pictures and clips that came out of generative models, keeping only the ones
            I'm satisfied with. Open any piece to read exactly what was asked for.
          </Lede>

          {items.length === 0 ? (
            <Empty>Nothing on the shelf yet. First pieces are on their way.</Empty>
          ) : (
            <Grid>
              {items.map((item, index) => (
                <GridItem key={item.id}>
                  <Tile item={item} onOpen={open(index)} />
                </GridItem>
              ))}
            </Grid>
          )}
        </Column>

        <AnimatePresence>
          {openIndex !== null && items[openIndex] && (
            <Lightbox
              item={items[openIndex]}
              canStep={items.length > 1}
              onClose={close}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
            />
          )}
        </AnimatePresence>
      </Page>
    </PageTransition>
  );
};

export default Prompted;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const Page = styled.div`
  min-height: 100dvh;
  background: var(--n-11);
  padding: 7rem 2rem 6rem;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    padding: 4rem 1.5rem 4rem;
  }
`;

const Column = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Kicker = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2.5rem;
`;

const Crumb = styled(Link)`
  color: inherit;
  text-decoration: none;
  transition: color 0.25s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 3px;
    border-radius: 3px;
  }
`;

const Title = styled.h1`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(2rem, 4.4vw, 3rem);
  font-weight: 300;
  line-height: 1.1;
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 1.6rem;
`;

const Lede = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 1.1rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.72);
  margin: 0 0 3rem;
  max-width: 640px;
`;

const Empty = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.5);
`;

/* CSS multi-column masonry: tiles flow down each column at their own aspect ratio, no
   measured layout pass needed. break-inside guards against a tile splitting across
   two columns. */
const Grid = styled.div`
  columns: 3;
  column-gap: 0.9rem;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    columns: 2;
  }
  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    columns: 1;
  }
`;

const GridItem = styled.div`
  break-inside: avoid;
  margin-bottom: 0.9rem;
`;

const TileButton = styled.button`
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  line-height: 0;

  img {
    display: block;
    width: 100%;
    height: auto;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover img {
      transform: scale(1.03) translateY(-2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    img {
      transition: none;
    }
    &:hover img {
      transform: none;
    }
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 2px;
  }
`;

const PlayGlyph = styled.span`
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  background: rgba(12, 13, 16, 0.55);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.6rem;
  line-height: 1;
`;

/* ------------------------------------------------------------------ */
/* Lightbox styles                                                     */
/* ------------------------------------------------------------------ */

const Scrim = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 200;
  /* 0.98, not 0.94: a bright tile at 6% bleed-through still reads on a black ground and
     crowded the close button with ghosted nav links. */
  background: rgba(6, 7, 9, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

/* The frame never scrolls; a definite height (100% of the scrim's padded box, capped at
   90vh) is what lets minmax(0, 1fr) actually shrink the rows, so the media sizes to its
   pane and ONLY the prompt panel scrolls. With overflow on the frame instead, a long
   prompt scrolled the whole modal and took the picture with it. */
const Frame = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 1100px;
  height: 100%;
  max-height: 90vh;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 1.5rem;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    /* Stacked: the picture takes a bit over half, the prompt scrolls in the rest. */
    grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr);
  }
`;

const Media = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;

  img,
  video {
    max-width: 100%;
    /* Bounded by the pane, not the viewport: the row is already viewport-capped. */
    max-height: 100%;
    border-radius: 8px;
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  /* The one scrolling region of the lightbox (see Frame). min-height lets the grid
     shrink it below its content. */
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.4rem;
`;

const InfoHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const InfoTitle = styled.h2`
  font-family: ${p => p.theme.font.body};
  font-weight: 300;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.92);
  margin: 0;
`;

const Close = styled.button`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  background: none;
  border: 0;
  cursor: pointer;
  padding: 0.2rem;
  flex-shrink: 0;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 2px;
    border-radius: 3px;
  }
`;

const PromptBlock = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.82rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: rgba(255, 255, 255, 0.78);
  margin: 0;
`;

const Copy = styled.button`
  align-self: flex-start;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 2px;
  }
`;

const Meta = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
`;

const Nav = styled.div`
  position: absolute;
  top: 50%;
  left: -3.5rem;
  right: -3.5rem;
  display: flex;
  justify-content: space-between;
  transform: translateY(-50%);
  pointer-events: none;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    left: 0;
    right: 0;
  }
`;

const NavButton = styled.button`
  pointer-events: auto;
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: rgba(12, 13, 16, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background: rgba(12, 13, 16, 0.75);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 2px;
  }
`;
