import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import PageTransition from '../../../components/PageTransition';
import { usePageTitle } from '../../../hooks/usePageTitle';
import type { FontAxes, FontRole, PickerFont } from './pickAFontData';
import { PICKER_FONTS } from './pickAFontData';
import type { FontMatch } from './pickAFontMatch';
import { matchFonts } from './pickAFontMatch';
import { sanitizeSpecimenHtml } from './pickAFontSanitize';

/* ------------------------------------------------------------------ */
/* Fonts on demand                                                     */
/* ------------------------------------------------------------------ */

/**
 * The codebase's only runtime font loading. Everything else the site wears arrives through
 * static <link> tags in index.html; the picker cannot do that, because which families it
 * needs depends on where the sliders are. Stylesheets are injected once per URL and never
 * removed — a session that wanders the taste space accumulates a handful of cached
 * stylesheets, which is cheaper than churning them.
 */
const injectedCss = new Set<string>();

function ensureFontCss(urls: string[]): void {
  for (const url of urls) {
    if (injectedCss.has(url)) continue;
    injectedCss.add(url);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * True once every family has a usable 400 on hand. Readiness only — the loading is the
 * stylesheets' job. Guarded like Lab.tsx's stencil measurement, because jsdom has no
 * document.fonts.
 */
function useFontsReady(families: string[]): boolean {
  const [ready, setReady] = useState(false);
  const key = families.join('|');

  useEffect(() => {
    setReady(false);
    if (!document.fonts?.load) {
      setReady(true);
      return;
    }
    let alive = true;
    Promise.all(families.map((family) => document.fonts.load(`400 1em "${family}"`)))
      .catch(() => undefined)
      .then(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- families is keyed by content
  }, [key]);

  return ready;
}

/* ------------------------------------------------------------------ */
/* The controls                                                        */
/* ------------------------------------------------------------------ */

/**
 * The four axes, worded as felt qualities. The rule from the design session: endpoints the
 * reader feels, never type classification — "grotesque" and "humanist" live in the dataset's
 * judgments, not in the UI.
 */
const AXES: { key: keyof FontAxes; left: string; right: string }[] = [
  { key: 'tone', left: 'serious', right: 'playful' },
  { key: 'era', left: 'timeless', right: 'current' },
  { key: 'voice', left: 'quiet', right: 'loud' },
  { key: 'warmth', left: 'precise', right: 'warm' },
];

const ROLES: { key: FontRole; label: string }[] = [
  { key: 'display', label: 'display' },
  { key: 'body', label: 'body text' },
  { key: 'mono', label: 'mono' },
];

const DEFAULT_AXES: FontAxes = { tone: 0.5, era: 0.5, voice: 0.5, warmth: 0.5 };

/** How each rank introduces itself, split by how honest the distance forces it to be. */
const RANK = ['closest', 'second', 'third'];
const QUALITY_NOTE = {
  close: 'a close match',
  near: 'in the neighbourhood',
  stretch: 'a stretch',
} as const;

const SOURCE_LABEL = {
  google: 'Google Fonts',
  fontshare: 'Fontshare',
  independent: 'Independent',
} as const;

/** Hover copy for the licence chips — the labels are jargon to anyone who hasn't shipped
 *  a font, and the difference changes what you may do with the files. */
const LICENSE_TIP: Record<string, string> = {
  OFL:
    'SIL Open Font License — libre: use, embed, self-host, even modify freely; ' +
    'only selling the files themselves is off the table.',
  'ITF FFL':
    'Indian Type Foundry Free Font License — free for personal and commercial use, ' +
    'but the files may not be modified or redistributed; get them from Fontshare.',
};

/* ------------------------------------------------------------------ */
/* The specimen                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_HEADING = 'Already good.';
/** Sanitized-form HTML (see pickAFontSanitize) — <b>/<i> only, and it ships with both so
 *  the bold and italic cuts are on show before anyone touches a key. */
const DEFAULT_BODY =
  'A typeface doesn’t make the writing <i>better</i> — it decides how the writing ' +
  '<b>sounds</b> when it lands. Click into this and put your own words here; a specimen ' +
  'you didn’t write can only tell you how <i>someone else’s</i> page would look.';

/** ⌘ on a Mac, ctrl elsewhere — for the shortcut hint only, both always work. */
const MOD_LABEL =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘' : 'ctrl ';

/**
 * Whether a family really owns a style, read from its verified css URLs rather than a
 * second hand-maintained flag: Google italics arrive via the `ital` axis, Fontshare's via
 * the 401/701 slugs, and a URL with no `700` loads no bold. The shortcuts for styles a
 * font does not have are made inert instead of letting the browser synthesise a faux
 * bold/italic — on a font picker, a slanted roman is misinformation.
 */
const hasBold = (font: PickerFont): boolean => font.css.some((u) => u.includes('700'));
const hasItalic = (font: PickerFont): boolean =>
  font.css.some((u) => u.includes('ital') || u.includes('401'));

/**
 * Which family sits in which slot of the card. The match takes its natural seat —
 * display in the headline, body in the paragraph, mono in the paragraph too (setting prose
 * in a mono is exactly the test a mono-curious reader wants) — and the companion fills
 * the other one.
 */
function specimenSlots(match: PickerFont, companion: PickerFont | undefined) {
  if (match.role === 'display') {
    return { heading: match, body: companion ?? match };
  }
  return { heading: companion ?? match, body: match };
}

const familyStack = (font: PickerFont): string =>
  `'${font.family}', ${font.role === 'mono' ? 'var(--font-mono)' : 'var(--font-body)'}`;

interface CardProps {
  match: FontMatch;
  rank: number;
  heading: string;
  body: string;
  onHeading: (text: string) => void;
  onBody: (text: string) => void;
}

const SpecimenCard: React.FC<CardProps> = ({
  match,
  rank,
  heading,
  body,
  onHeading,
  onBody,
}) => {
  const { font } = match;
  const companion = PICKER_FONTS.find((f) => f.family === font.companions[0]);
  const slots = specimenSlots(font, companion);
  const others = font.companions
    .slice(1)
    .map((name) => PICKER_FONTS.find((f) => f.family === name))
    .filter((f): f is PickerFont => f !== undefined);
  const ready = useFontsReady(
    companion ? [font.family, companion.family] : [font.family],
  );

  const bodyBold = hasBold(slots.body);
  const bodyItalic = hasItalic(slots.body);
  const hint = [bodyBold && `${MOD_LABEL}B`, bodyItalic && `${MOD_LABEL}I`]
    .filter(Boolean)
    .join(' · ');

  /* The headline stays single-style: no inline emphasis, and a display face's faux bold
     is where synthesis gets ugliest. */
  const blockStyleKeys = (e: React.KeyboardEvent, allowB: boolean, allowI: boolean) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if ((k === 'b' && !allowB) || (k === 'i' && !allowI) || k === 'u') e.preventDefault();
  };

  return (
    <Card>
      <CardKicker>
        {RANK[rank]} · {QUALITY_NOTE[match.quality]}
      </CardKicker>
      <NameInFont style={{ fontFamily: familyStack(font) }} $ready={ready}>
        {font.family}
      </NameInFont>

      <BlockLabel>
        headline · <em>{slots.heading.family}</em>
      </BlockLabel>
      <Headline
        style={{ fontFamily: familyStack(slots.heading) }}
        $ready={ready}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onKeyDown={(e) => blockStyleKeys(e, false, false)}
        onBlur={(e) => onHeading(e.currentTarget.textContent ?? '')}
      >
        {heading}
      </Headline>

      <BlockLabel>
        body · <em>{slots.body.family}</em>
        {hint && <Hint>{hint}</Hint>}
      </BlockLabel>
      <BodyText
        style={{ fontFamily: familyStack(slots.body) }}
        $ready={ready}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onKeyDown={(e) => blockStyleKeys(e, bodyBold, bodyItalic)}
        onBlur={(e) => onBody(sanitizeSpecimenHtml(e.currentTarget))}
        /* Safe by construction: `body` only ever holds DEFAULT_BODY or the output of
           sanitizeSpecimenHtml, which rebuilds markup from escaped text and a b/i/br
           whitelist — nothing pasted or typed reaches this sink unserialised. */
        dangerouslySetInnerHTML={{ __html: body }}
      />

      <CardFoot>
        {others.length > 0 && (
          <PairLine>
            also pairs{' '}
            {others.map((f, i) => (
              <span key={f.family}>
                {i > 0 && ', '}
                <PairName
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontFamily: familyStack(f) }}
                >
                  {f.family}
                </PairName>
              </span>
            ))}
          </PairLine>
        )}
        <FootRow>
          <Chip title={LICENSE_TIP[font.license]}>
            {SOURCE_LABEL[font.source]} · {font.license}
          </Chip>
          <MetaLink href={font.url} target="_blank" rel="noreferrer">
            get it ↗
          </MetaLink>
        </FootRow>
      </CardFoot>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

const PickAFont: React.FC = () => {
  /* The h1 keeps the terse voice; the tab/search title carries the long-tail keywords. */
  usePageTitle('Find your font pairing by feel — a free font picker · Fei Hu');

  const [role, setRole] = useState<FontRole>('display');
  const [axes, setAxes] = useState<FontAxes>(DEFAULT_AXES);

  /**
   * Matching recomputes on a settled value, not on every drag frame. Continuous reshuffle
   * fights the network — each new match is a stylesheet fetch — so the sliders feel live
   * while the answer waits for the hand to pause.
   */
  const [target, setTarget] = useState<FontAxes>(DEFAULT_AXES);
  useEffect(() => {
    const t = setTimeout(() => setTarget(axes), 220);
    return () => clearTimeout(t);
  }, [axes]);

  const matches = useMemo(() => matchFonts(PICKER_FONTS, role, target), [role, target]);

  useEffect(() => {
    for (const { font } of matches) {
      ensureFontCss(font.css);
      /* All companions, not just the specimen's: the "also pairs" names render in their
         own faces, so their stylesheets ride along. Two small families at most per card. */
      for (const name of font.companions) {
        const companion = PICKER_FONTS.find((f) => f.family === name);
        if (companion) ensureFontCss(companion.css);
      }
    }
  }, [matches]);

  /** The reader's own words, shared by all three cards and kept across reshuffles. */
  const [heading, setHeading] = useState(DEFAULT_HEADING);
  const [body, setBody] = useState(DEFAULT_BODY);

  return (
    <PageTransition>
      <Page>
        <ControlRail>
          <RailSticky>
            <Crumb to="/lab">← lab</Crumb>
            <Kicker>2026 · Experiment</Kicker>
            <Title>
            <Wordmark>
              Font pairing<Dot>.</Dot>
            </Wordmark>
            <Byline>by feel</Byline>
          </Title>
            <Lede>
              Say what it should feel like, not what it should be called. The closest free
              webfonts appear as specimen cards — click any line and put your own words in
              it.
            </Lede>

            <RoleRow role="radiogroup" aria-label="What the font is for">
              {ROLES.map((r) => (
                <RoleButton
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={role === r.key}
                  $active={role === r.key}
                  onClick={() => setRole(r.key)}
                >
                  {r.label}
                </RoleButton>
              ))}
            </RoleRow>

            {AXES.map((axis) => (
              <AxisBlock key={axis.key}>
                <AxisLabels>
                  <span>{axis.left}</span>
                  <span>{axis.right}</span>
                </AxisLabels>
                {/* Seven detents, not a free drag: the axis values are judgments tagged to
                    about ±0.1 and the role pools are ~25 fonts, so finer input than this
                    never moves the top three — and a detent is repeatable where a pixel
                    position is not. */}
                <Slider
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={Math.round(axes[axis.key] * 6)}
                  aria-label={`${axis.left} to ${axis.right}`}
                  onChange={(e) =>
                    setAxes((prev) => ({ ...prev, [axis.key]: Number(e.target.value) / 6 }))
                  }
                />
              </AxisBlock>
            ))}

            <Note>
              Some sixty free webfonts — Google Fonts, Fontshare, a few independents — each
              placed on these axes by hand, each pairing chosen rather than computed. No API
              knows what a font feels like.
            </Note>

            <EndLink to="/lab">← more lab</EndLink>
          </RailSticky>
        </ControlRail>

        <Cards>
          {matches.map((match, i) => (
            <SpecimenCard
              key={match.font.family}
              match={match}
              rank={i}
              heading={heading}
              body={body}
              onHeading={setHeading}
              onBody={setBody}
            />
          ))}
          <LicenseNote>
            Every font here is free for the web. <abbr>OFL</abbr> is the SIL Open Font
            License — libre: use, embed, self-host, even modify. <abbr>ITF FFL</abbr> is
            Fontshare&apos;s licence — free for personal and commercial work, but the files
            stay as served: no modifying or redistributing.
          </LicenseNote>
        </Cards>
      </Page>
    </PageTransition>
  );
};

export default PickAFont;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  column-gap: clamp(2rem, 4vw, 4rem);
  padding: 0 clamp(1.5rem, 3.5vw, 3.5rem);

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

/* Sticky so the sliders stay under the hand while the cards scroll past — the page is a
   tool before it is an article, and a tool's controls do not scroll away. The grid item
   stretches to the row's full height (the default) and an inner wrapper carries the
   sticky: a start-aligned item is only as tall as its content, which leaves sticky no
   room to travel inside its own box. The rail's spacing is budgeted to FIT a ~800px
   viewport without scrolling; overflow-y stays as the fallback for shorter windows. */
const ControlRail = styled.aside``;

const RailSticky = styled.div`
  position: sticky;
  top: 0;
  max-height: 100dvh;
  overflow-y: auto;
  padding: 5rem 0 1.5rem;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    position: static;
    max-height: none;
    max-width: 560px;
    padding: 5rem 0 0;
  }
`;

const Crumb = styled(Link)`
  display: inline-block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  text-decoration: none;
  margin-bottom: 1.8rem;

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;

const Kicker = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.7rem;
`;

/* The wordmark lockup: heavy display caps with a flat grey slab behind the upper-left and
   the tagline as a byline — the one place this page spends boldness, everything after it
   stays quiet. The h1 still reads "Font pairing. by feel" to crawlers and screen readers. */
const Title = styled.h1`
  margin: 0 0 1.1rem;
`;

const Wordmark = styled.span`
  position: relative;
  display: inline-block;
  font-family: ${p => p.theme.font.display};
  font-weight: 900;
  /* One line, never broken: sized so "FONT PAIRING." fills the rail without leaving it. */
  font-size: clamp(1.7rem, 2.3vw, 2.15rem);
  white-space: nowrap;
  line-height: 1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: ${p => p.theme.color.ink};

  /* The slab — about half a cap high, riding the top of the first word. Negative z-index
     paints it behind the glyphs but still above the ancestors' backgrounds; the parent's
     position: relative anchors it without starting a stacking context that would trap it. */
  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    top: -0.12em;
    left: -0.14em;
    width: 2.75em;
    height: 0.6em;
    /* The mark, not the accent: --accent is the system's link colour, --color-mark is its
       highlight — and a highlighter swipe is exactly what this is. Washed out because the
       full-strength mark is a ~50%-lightness rust that would fight the ink above it. */
    background: color-mix(in srgb, ${p => p.theme.color.mark} 36%, transparent);
  }
`;

/* Mark, matching the slab — the lockup's decoration keeps to one hue family, and the
   accent stays reserved for things you can actually click. */
const Dot = styled.span`
  color: ${p => p.theme.color.mark};
`;

const Byline = styled.span`
  display: block;
  margin-top: 0.6rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.ink};
`;

const Lede = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 0.9rem;
  line-height: 1.6;
  color: ${p => p.theme.color.ink};
  margin: 0 0 1.7rem;
`;

const RoleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const RoleButton = styled.button<{ $active: boolean }>`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 0.45rem 0.9rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid ${p => (p.$active ? p.theme.color.ink : p.theme.color.border)};
  background: ${p => (p.$active ? p.theme.color.ink : 'transparent')};
  color: ${p => (p.$active ? p.theme.color.surface : p.theme.color.inkMuted)};
  transition: color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.18s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    color: ${p => (p.$active ? p.theme.color.surface : p.theme.color.ink)};
    border-color: ${p => p.theme.color.ink};
  }
`;

const AxisBlock = styled.div`
  margin-bottom: 1.05rem;
`;

const AxisLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.3rem;
`;

const Slider = styled.input`
  appearance: none;
  width: 100%;
  height: 20px;
  background: transparent;
  cursor: pointer;
  margin: 0;
  display: block;

  &::-webkit-slider-runnable-track {
    height: 2px;
    background: ${p => p.theme.color.border};
    border-radius: 1px;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -6px;
    border-radius: 50%;
    background: ${p => p.theme.color.ink};
    border: none;
  }

  &::-moz-range-track {
    height: 2px;
    background: ${p => p.theme.color.border};
    border-radius: 1px;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${p => p.theme.color.ink};
    border: none;
  }
`;

const Note = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 0.78rem;
  line-height: 1.6;
  color: ${p => p.theme.color.inkMuted};
  margin: 1.6rem 0 0;

`;

/* Spans the card row, sitting where the chips it decodes are in view. The chips carry the
   same explanation as a title tooltip for anyone who asks the chip directly. */
const LicenseNote = styled.p`
  grid-column: 1 / -1;
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 0.78rem;
  line-height: 1.6;
  color: ${p => p.theme.color.inkMuted};
  margin: 0.4rem 0 0;

  abbr {
    text-decoration: none;
    font-family: ${p => p.theme.font.mono};
    font-size: 0.68rem;
    letter-spacing: 0.08em;
  }
`;

const EndLink = styled(Link)`
  display: inline-block;
  margin-top: 1.6rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  text-decoration: none;

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;

/* ------------------------------------------------------------------ */
/* Card styles                                                         */
/* ------------------------------------------------------------------ */

const Cards = styled.main`
  padding: 5rem 0 3rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.3rem;
  align-items: stretch;

  @media (max-width: ${p => p.theme.breakpoints.xl}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    padding-top: 3rem;
  }

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

/* A tall specimen poster: the paper carries the type, the border only names the sheet's
   edge. Portrait proportions on purpose — a specimen reads as a page, not a banner. */
const Card = styled.article`
  display: flex;
  flex-direction: column;
  min-height: clamp(520px, 72vh, 660px);
  border: 1px solid ${p => p.theme.color.border};
  /* Square, like the slab: this page's idiom is a printed specimen sheet, not the site's
     glass — the sheets, chips, and toggle all keep hard corners together. */
  border-radius: 0;
  /* A step up the ramp from the grey paper (same hue, more light): the card reads as a
     whiter sheet laid on the desk rather than a panel of another colour. The page grain
     overlay paints across both, which keeps the two papers one material. */
  background: var(--n-1);
  padding: 1.7rem 1.6rem 1.5rem;
`;

const CardKicker = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.7rem;
`;

const NameInFont = styled.h3<{ $ready: boolean }>`
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1.2;
  color: ${p => p.theme.color.ink};
  margin: 0;
  opacity: ${p => (p.$ready ? 1 : 0.3)};
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

/**
 * The rule-and-label device from the sheet layout, moved inside the card: a short dark
 * rule over a tracked mono label naming the JOB a block of type is auditioning for, with
 * the family filling that seat. On a pairing card this is information, not decoration —
 * it is how you can tell which font you are looking at in each slot.
 */
const BlockLabel = styled.span`
  display: block;
  border-top: 1px solid color-mix(in srgb, ${p => p.theme.color.ink} 55%, transparent);
  padding-top: 0.5rem;
  margin: 1.5rem 0 0.8rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};

  em {
    font-style: normal;
    letter-spacing: 0.08em;
    color: ${p => p.theme.accent.base};
  }
`;

/* The how-to, sitting quietly at the label's right edge. Lists only the styles the slot's
   font really has — a font with no italic shows no ⌘I, because the shortcut is inert. */
const Hint = styled.span`
  float: right;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, ${p => p.theme.color.inkMuted} 75%, transparent);
`;

const Headline = styled.div<{ $ready: boolean }>`
  outline: none;
  border-radius: 2px;
  font-size: clamp(1.8rem, 2.3vw, 2.5rem);
  font-weight: 400;
  line-height: 1.08;
  color: ${p => p.theme.color.ink};
  opacity: ${p => (p.$ready ? 1 : 0.3)};
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover:not(:focus) {
    outline: 1px dashed color-mix(in srgb, ${p => p.theme.color.ink} 20%, transparent);
    outline-offset: 6px;
  }

  &:focus {
    outline: 1px dashed color-mix(in srgb, ${p => p.theme.color.ink} 40%, transparent);
    outline-offset: 6px;
  }
`;

const BodyText = styled.div<{ $ready: boolean }>`
  outline: none;
  border-radius: 2px;
  font-size: 0.92rem;
  line-height: 1.7;
  color: ${p => p.theme.color.ink};
  opacity: ${p => (p.$ready ? 1 : 0.3)};
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover:not(:focus) {
    outline: 1px dashed color-mix(in srgb, ${p => p.theme.color.ink} 20%, transparent);
    outline-offset: 6px;
  }

  &:focus {
    outline: 1px dashed color-mix(in srgb, ${p => p.theme.color.ink} 40%, transparent);
    outline-offset: 6px;
  }
`;

/* Pinned to the poster's foot; whatever height the type above doesn't use becomes the
   quiet paper the references trade on. */
const CardFoot = styled.div`
  margin-top: auto;
  padding-top: 1.6rem;
  display: grid;
  gap: 0.8rem;
`;

const PairLine = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin: 0;
`;

/* Set in its own face — the name IS a specimen — so it sheds the label's mono tracking
   and uppercase, which would erase exactly what it is there to show. */
const PairName = styled.a`
  font-size: 0.95rem;
  letter-spacing: 0;
  text-transform: none;
  color: ${p => p.theme.accent.base};
  text-decoration: none;

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;

const FootRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
`;

const Chip = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  border: 1px solid ${p => p.theme.color.border};
  border-radius: 2px;
  padding: 0.25rem 0.7rem;
`;

const MetaLink = styled.a`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${p => p.theme.accent.base};
  text-decoration: none;

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;
