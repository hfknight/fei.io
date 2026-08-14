import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import PageTransition from '../../../components/PageTransition';
import { usePageTitle } from '../../../hooks/usePageTitle';
import featherUrl from '../../../assets/fei-feather.svg';
import {
  ASCII_FLAT,
  coverageAt,
  fitMark,
  rasterise,
  splitIntoChars,
} from './asciiSample';

hljs.registerLanguage('javascript', javascript);

/* ------------------------------------------------------------------ */
/* The demo                                                            */
/* ------------------------------------------------------------------ */

/**
 * Two marks that live here rather than in the assets folder: both are one path, and both
 * belong to this page rather than to the site.
 *
 * The tricorn is Destiny's, and it is here because it is the ideal shape for this — one bold
 * closed form, no interior detail finer than a row of type, near enough square. The
 * trademark is Bungie's.
 *
 * Both viewBoxes are cropped to their own ink. Padding inside the artwork is not neutral: a
 * mark is fitted by its image aspect, so a square frame around a wide shape gets fitted as a
 * square and spends the empty part of itself on rows of nothing.
 */
const TRICORN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 2 22.05 20.05"><path fill="#000" d="M 4.8222656 2.0019531 C 3.559375 2.0447266 2.346875 2.6554687 1.640625 3.7304688 C 1.050625 4.6404688 0.859375 5.7290625 1.109375 6.7890625 C 1.359375 7.8290625 2.0395313 8.7405469 3.0195312 9.3105469 L 3.0703125 9.3300781 C 6.1003125 11.070078 7.9804688 14.320547 7.9804688 17.810547 C 7.9804688 18.860547 8.3490625 19.860625 9.0390625 20.640625 C 9.7690625 21.460625 10.739062 21.940234 11.789062 21.990234 C 11.859063 22.000234 11.93 22 12 22 C 13.04 22 14.009531 21.610391 14.769531 20.900391 C 15.569531 20.140391 16.019531 19.080469 16.019531 17.980469 L 16.019531 17.810547 C 16.019531 14.320547 17.910859 11.069375 20.880859 9.359375 L 21.029297 9.2792969 C 21.959297 8.7392969 22.640625 7.8290625 22.890625 6.7890625 C 23.140625 5.7290625 22.949375 4.6404688 22.359375 3.7304688 C 21.229375 2.0104688 18.809219 1.4805469 16.949219 2.5605469 L 16 3.0996094 L 16 9 C 16 11.21 14.21 13 12 13 C 9.79 13 8 11.21 8 9 L 8 3.109375 L 7.0507812 2.5605469 C 6.3570313 2.1555469 5.58 1.9762891 4.8222656 2.0019531 z M 12 3 C 10.895 3 10 3.895 10 5 L 10 9 C 10 10.105 10.895 11 12 11 C 13.105 11 14 10.105 14 9 L 14 5 C 14 3.895 13.105 3 12 3 z"/></svg>`;

/**
 * "Hello", outlined from Georgia Italic rather than set as SVG text.
 *
 * Outlined because an SVG loaded through an <img> is its own document and cannot reach the
 * page's fonts — set as text it would render in whatever the viewer's browser calls a serif,
 * and the picture would differ from machine to machine. As a path it is the same everywhere.
 *
 * It is also the most demanding mark here by some way, for reasons the entry goes into: a
 * word is thin-stroked line art, and this medium is a coarse screen with holes in it.
 */
const HELLO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25.0 -1548.0 4861.0 1578.0"><path fill="#000" d="M1771 -1419 1756 -1353Q1728 -1352 1686.0 -1344.0Q1644 -1336 1622 -1329Q1583 -1316 1566.0 -1288.0Q1549 -1260 1541 -1228L1303 -195Q1301 -187 1300.0 -177.0Q1299 -167 1299 -160Q1299 -139 1308.0 -123.0Q1317 -107 1337 -94Q1352 -85 1391.5 -76.0Q1431 -67 1459 -66L1444 0H855L870 -66Q895 -68 941.0 -72.0Q987 -76 1006 -84Q1041 -97 1060.0 -122.0Q1079 -147 1087 -184L1205 -696H538L423 -195Q421 -187 420.0 -178.0Q419 -169 419 -161Q419 -141 428.5 -123.0Q438 -105 457 -94Q472 -85 511.5 -76.0Q551 -67 579 -66L564 0H-25L-10 -66Q15 -68 61.0 -72.0Q107 -76 126 -84Q161 -97 180.0 -122.0Q199 -147 207 -184L446 -1218Q448 -1226 449.0 -1234.5Q450 -1243 450 -1252Q450 -1274 441.5 -1290.0Q433 -1306 411 -1318Q387 -1331 351.0 -1341.0Q315 -1351 287 -1353L302 -1419H891L876 -1353Q848 -1352 806.0 -1344.0Q764 -1336 742 -1329Q703 -1316 686.0 -1288.0Q669 -1260 661 -1228L559 -781H1226L1326 -1218Q1328 -1226 1329.0 -1234.5Q1330 -1243 1330 -1251Q1330 -1273 1321.5 -1289.5Q1313 -1306 1291 -1318Q1267 -1331 1231.0 -1341.0Q1195 -1351 1167 -1353L1182 -1419Z M2595 -801Q2595 -695 2528.5 -619.0Q2462 -543 2335 -498Q2242 -464 2147.0 -443.0Q2052 -422 1937 -408Q1937 -250 1995.5 -166.5Q2054 -83 2167 -83Q2267 -83 2343.5 -133.0Q2420 -183 2494 -282L2551 -240Q2471 -118 2351.0 -45.0Q2231 28 2102 28Q1925 28 1831.5 -71.0Q1738 -170 1738 -352Q1738 -478 1777.5 -592.5Q1817 -707 1893 -802Q1967 -895 2074.5 -952.0Q2182 -1009 2312 -1009Q2456 -1009 2525.5 -950.5Q2595 -892 2595 -801ZM2411 -826Q2411 -865 2400.0 -887.5Q2389 -910 2372 -921Q2354 -933 2334.0 -936.0Q2314 -939 2293 -939Q2173 -939 2071.5 -807.0Q1970 -675 1943 -478Q2013 -488 2101.0 -506.5Q2189 -525 2247 -555Q2330 -598 2370.5 -665.5Q2411 -733 2411 -826Z M3235 -1533 2956 -329Q2947 -291 2939.0 -253.0Q2931 -215 2931 -191Q2931 -134 2956.5 -113.0Q2982 -92 3039 -92Q3059 -92 3098.5 -97.0Q3138 -102 3158 -109L3143 -45Q3053 -9 3004.5 6.0Q2956 21 2895 21Q2815 21 2773.5 -20.5Q2732 -62 2732 -123Q2732 -146 2736.5 -171.0Q2741 -196 2749 -234L2992 -1287Q2999 -1318 3001.5 -1330.0Q3004 -1342 3004 -1360Q3004 -1396 2992.0 -1415.5Q2980 -1435 2958 -1445Q2937 -1454 2905.0 -1457.0Q2873 -1460 2840 -1464L2854 -1525L3225 -1548Z M3819 -1533 3540 -329Q3531 -291 3523.0 -253.0Q3515 -215 3515 -191Q3515 -134 3540.5 -113.0Q3566 -92 3623 -92Q3643 -92 3682.5 -97.0Q3722 -102 3742 -109L3727 -45Q3637 -9 3588.5 6.0Q3540 21 3479 21Q3399 21 3357.5 -20.5Q3316 -62 3316 -123Q3316 -146 3320.5 -171.0Q3325 -196 3333 -234L3576 -1287Q3583 -1318 3585.5 -1330.0Q3588 -1342 3588 -1360Q3588 -1396 3576.0 -1415.5Q3564 -1435 3542 -1445Q3521 -1454 3489.0 -1457.0Q3457 -1460 3424 -1464L3438 -1525L3809 -1548Z M4836 -616Q4836 -498 4796.0 -380.0Q4756 -262 4680 -173Q4603 -81 4494.5 -25.5Q4386 30 4243 30Q4077 30 3973.5 -77.0Q3870 -184 3870 -365Q3870 -498 3914.0 -613.0Q3958 -728 4032 -815Q4107 -902 4217.5 -955.5Q4328 -1009 4457 -1009Q4635 -1009 4735.5 -900.5Q4836 -792 4836 -616ZM4632 -654Q4632 -796 4581.5 -867.0Q4531 -938 4436 -938Q4353 -938 4279.5 -887.0Q4206 -836 4153 -721Q4112 -634 4093.0 -527.5Q4074 -421 4074 -331Q4074 -188 4123.5 -114.5Q4173 -41 4273 -41Q4362 -41 4431.0 -97.0Q4500 -153 4543 -239Q4586 -323 4609.0 -431.5Q4632 -540 4632 -654Z"/></svg>`;

/** SVG source to something an Image can load. Marks are inline, so they need no network. */
const svgUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/**
 * The marks you can pick, and the resolution each one is rastered at.
 *
 * All three are silhouettes, and that is the finding rather than a shortcut — two
 * photographs were tried here first and did not survive the resolution (see the entry).
 *
 * `rasterH` — sampling is point-wise, one pixel per character, so the raster must be no
 * finer than the text can carry. A flat shape has no detail to alias, so 660 is generous and
 * all it buys is clean edges. A mark with its own fine pattern needs rastering down near the
 * character grid instead, so the browser's downscale averages it first.
 *
 * `narrow` is the measure the block condenses to, and it is per-mark because the mark is
 * CONTAINED in the block: a wide mark in a tall narrow block gets the middle third of the
 * rows and the rest go on empty paper. 240px suits the tall feather; the rounder two want
 * more like 320-340, which has fewer lines in total but gives nearly all of them to the
 * picture. Match the block's shape to the mark's, not to a number.
 */
const MARKS = [
  { id: 'feather', label: 'feather', src: featherUrl, rasterH: 660, narrow: 261, type: 14 },
  { id: 'destiny', label: 'destiny', src: svgUrl(TRICORN), rasterH: 660, narrow: 458, type: 14 },
  { id: 'hello', label: 'hello', src: svgUrl(HELLO), rasterH: 660, narrow: 640, type: 11.5 },
] as const satisfies readonly {
  id: string;
  label: string;
  src: string;
  rasterH: number;
  narrow: number;
  type: number;
}[];

type MarkId = (typeof MARKS)[number]['id'];


/**
 * /readme's ink ladder with a quieter floor, and that one number is the only difference.
 *
 * The steps above 0 are unchanged because a silhouette never visits them — every character
 * is either outside the mark or fully inside it, and the seven between exist to soften an
 * edge. Only the floor is worth moving: this demo shows the mark several times larger than
 * /readme's finished mark, so the un-inked field is a much bigger area of the screen, and at
 * 7% it was busy enough to compete with the picture sitting in it.
 *
 * (A far steeper ladder lived here while the picker carried two photographs, which need the
 * middle of the ladder and get no help from it. They are gone — see the entry — and so is
 * the reason for the divergence.)
 */
const LEVELS = [4, 15, 25, 36, 48, 61, 75, 88, 100];

/** Where the block starts: a comfortable reading measure. */
const WIDE = 560;

/**
 * Breathing room between the finished picture and the stage's edges.
 *
 * The picture is fitted to the height the block had while it was still being READ, not to a
 * constant of its own. Condensing reflows the same words into a different shape entirely —
 * for a tall mark it gets taller, for a wide one much shorter — and fitting to a fixed target
 * let the wide ones collapse into a thin band with a third of the stage empty above and below
 * them. Holding the reading height means the box stays as full at the end as it was at the
 * start, which is what the sequence looks like it is promising.
 */
const STAGE_PAD = 34;

/** Ceiling on how far a mark may be scaled UP to hold that height. */
const MAX_FIT = 1.6;

/**
 * The block the demo morphs — the entry's own opening, not a stand-in.
 *
 * Long on purpose. The mark's resolution is this text's line count, so a two-paragraph
 * lede resolves into nothing and would quietly demonstrate the failure the entry is about.
 * At the narrow measure this comes out around thirty lines, which is roughly the floor.
 */
const BLOCK = [
  'My readme page does something I still like: as you scroll, the words shrink, and somewhere on the way down they stop being words and turn into a picture of a feather.',
  'Nothing is swapped out. The text on screen at the end is the same text you were reading at the start — the same words, in the same order. It gets smaller, it gets packed tighter, and each character is given its own shade of grey.',
  'That second part is the whole trick. If you pick the right grey for every character, a page of type stops reading as language and starts reading as an image, the way a newspaper photograph is really just dots.',
  'Getting there took two attempts that did not work, and both failed for the same reason. I had assumed the hard part was making a picture out of characters. It was not. The hard part was that I kept drawing a second block of text on top of the first one, and no two blocks of text ever quite agree.',
  'The length of this passage is not padding either, which is the part I did not see coming. The picture is made of the characters that happen to be here, so the number of rows it can have is set by how much writing there is. A short note makes a coarse picture. A long one makes a finer picture out of exactly the same machinery.',
  'That gives the whole thing an odd property. Every paragraph I add is a little more resolution, and every sentence I cut takes some away. The essay and the image are the same object, and they are competing for the same space in a way that ordinary illustration never does.',
  'It also sets a hard limit on what can be shown. A bold, closed shape survives being drawn at thirty rows. A photograph does not, and neither does a long word, because both of them carry detail finer than a line of type. The medium is a coarse screen and it is honest about it.',
  'So the marks below the slider get easier and harder in a clear order, and the order is not about how complicated they look. It is about how wide each one is against its own height, and how much of this page is left to draw it with.',
] as const;

/* Ramp helpers. clamp(0, x, 1) is the shape every beat uses: hold, run, hold. */
const ramp = (from: number, to: number) =>
  `clamp(0, calc((var(--p) - ${from}) / ${to - from}), 1)`;

/**
 * Where the paragraphs stop being paragraphs. Inside the condense beat, while the block is
 * already moving, so the reflow it causes reads as part of that rather than as a glitch.
 */
const MERGE_AT = 0.18;

/** Where the crossfade sits, and how long it takes. Both ends ramp across it, so they cross at 50/50. */
const SWAP = 0.62;
const SWAP_RUN = 0.3;

/**
 * The ticks under the slider — the reader's map of the scrub.
 *
 * Three, not four. Narrowing and shrinking were separate beats until they had to be merged
 * (see Block), and labelling a single beat twice would be inventing a distinction the
 * slider does not have.
 */
const BEATS = [
  { at: 0.0, label: 'read' },
  { at: 0.14, label: 'condense' },
  { at: SWAP - SWAP_RUN / 2, label: 'become' },
] as const;

const Demo: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  /* The block's height while it is still being read. Mark-independent, so measured once. */
  const readHeight = useRef(0);
  const [p, setP] = useState(0);
  const [markId, setMarkId] = useState<MarkId>('feather');
  const [ready, setReady] = useState(false);
  /* useMemo, not a bare find(): the sample effect below depends on this, and a fresh object
     every render made it re-run on every drag of the slider — rebuilding the copy, and
     recomputing --fit-scale from a box that the previous run had already scaled. */
  const mark = useMemo(() => MARKS.find(m => m.id === markId) ?? MARKS[0], [markId]);

  /**
   * Build the copy and sample it, once, at mount.
   *
   * Everything here happens in the state the block ENDS in, not the one it starts in — the
   * measure narrowed, the lines tight. Sampling the reading state would place every
   * character against a layout it never has when the mark is visible, which puts the
   * feather in the wrong place by about a third of the block's height.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const source = blockRef.current;
    const host = revealRef.current;
    if (!stage || !source || !host) return;
    let cancelled = false;

    const img = new Image();
    img.src = mark.src;
    img.onload = () => {
      if (cancelled || !host.isConnected) return;

      const clone = source.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      const chars = splitIntoChars(clone);
      host.replaceChildren(clone);

      /* The copy is already in its end state — Reveal pins --narrow-t and --lh-t to 1 (see
         its styles), because this layer only ever shows once the block has finished
         narrowing. So there is nothing to force here; just read.

         Every rect is read before anything is written, which keeps this to one layout
         instead of one per character. The rects are post-transform, which does not matter
         to the sampling: every one of them and the box they are measured against carry the
         same scale, and only their ratios are used. */
      const box = clone.getBoundingClientRect();
      const rects = chars.map(c => c.getBoundingClientRect());
      /* The row pitch, not a character's own height: cells have to tile vertically or a thin
         stroke can fall between two rows and disappear (see coverageAt). A span's rect is its
         content box, which is shorter than the line it sits on. */
      const pitch = parseFloat(getComputedStyle(clone).lineHeight) || rects[0]?.height || 1;

      const raster = rasterise(img, mark.rasterH);
      if (!raster) return;
      const markBox = fitMark(box.width, box.height, img.naturalWidth / img.naturalHeight);
      const top = LEVELS.length - 1;

      chars.forEach((span, i) => {
        const r = rects[i];
        span.setAttribute(
          'data-l',
          String(
            coverageAt(
              r.left + r.width / 2 - box.left,
              r.top + r.height / 2 - box.top,
              r.width,
              pitch,
              markBox,
              raster,
              top,
            ),
          ),
        );
      });

      /* Fit the condensed block back to the height it had while it was being read, bounded by
         what the stage can actually show. A wide mark hits the width bound first and stays
         short — there is no scale that makes a 3:1 picture fill a taller box without running
         off both sides — so it keeps its air, and the tall ones do not.

         offsetHeight, not the rect: the rect is post-transform, so a run at a scrubbed-away
         position would fit the block to a box a previous run had already shrunk, and the
         error would compound. Layout height has no such memory. */
      readHeight.current ||= source.offsetHeight;
      /* Bounded by the stage on both axes as well as by the reading height, because the
         reading block is itself sized to nearly fill the stage — fitting to it exactly puts
         the result a few pixels over the edge, and the overflow is clipped. */
      const fit = Math.min(
        MAX_FIT,
        readHeight.current / clone.offsetHeight,
        (stage.clientHeight - 2 * STAGE_PAD) / clone.offsetHeight,
        (stage.clientWidth - 2 * STAGE_PAD) / clone.offsetWidth,
      );
      stage.style.setProperty('--fit-scale', String(fit));

      if (!cancelled) setReady(true);
    };

    return () => {
      cancelled = true;
    };
    /* Re-runs on every pick: a different mark means a fresh sample pass over the same copy.
       The copy itself never changes, which is the point — only the greys do. */
  }, [mark]);

  const scrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setP(Number(e.target.value) / 1000);
  }, []);

  return (
    <DemoFigure>
      <Stage
        ref={stageRef}
        style={
          {
            '--p': p,
            '--narrow': `${mark.narrow}px`,
            '--type': `${mark.type}px`,
          } as React.CSSProperties
        }
        data-merged={p >= MERGE_AT ? '' : undefined}
      >
        <Unit>
          <Block ref={blockRef}>
            {BLOCK.map(para => (
              <BlockP key={para.slice(0, 24)}>{para}</BlockP>
            ))}
          </Block>
          {/* The copy lands here. Stacked exactly over the original, because it IS the
              original — anything else to line up would be a coincidence. */}
          <Reveal ref={revealRef} aria-hidden />
        </Unit>
      </Stage>

      <Picker role="group" aria-label="Which mark the text becomes">
        {MARKS.map(m => (
          <PickButton
            key={m.id}
            type="button"
            $on={m.id === markId}
            aria-pressed={m.id === markId}
            onClick={() => setMarkId(m.id)}
          >
            {m.label}
          </PickButton>
        ))}
      </Picker>

      <Scrubber>
        <ScrubInput
          type="range"
          min={0}
          max={1000}
          value={Math.round(p * 1000)}
          onChange={scrub}
          aria-label="Scrub the morph, from reading to picture"
          disabled={!ready}
        />
        <Ticks aria-hidden>
          {BEATS.map(beat => (
            <Tick key={beat.label} style={{ left: `${beat.at * 100}%` }} $on={p >= beat.at}>
              {beat.label}
            </Tick>
          ))}
        </Ticks>
      </Scrubber>
      <Caption>{ready ? 'Pick a mark, then drag. Stop anywhere.' : 'Setting up…'}</Caption>
    </DemoFigure>
  );
};

/**
 * What a phone gets instead: the two ends, captured from the demo above.
 *
 * Not the demo at a smaller size. The effect needs about thirty lines on screen at a size
 * where thirty lines still read as a block, and a narrow screen has neither — a slider here
 * would hand the reader a control that only produces mush. Two pictures of it working are
 * more honest than a broken version of it.
 */
const StillPair: React.FC = () => (
  <StillFigure>
    <Still src="/text-into-picture-read@2x.webp" alt="The block at reading size, plain text." />
    <Still src="/text-into-picture-mark@2x.webp" alt="The same block condensed, its characters shaded into the shape of a feather." />
    <Caption>The two ends. The words are identical.</Caption>
  </StillFigure>
);

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

const SAMPLE_CODE = `// How dark one character should be. Average the mark over the whole
// cell the character sits in. Sampling the one point at its centre
// loses any stroke thinner than the gap between characters.
let sum = 0;
for (let y = top; y < bottom; y++) {
  for (let x = left; x < right; x++) {
    // Outside the mark counts as empty. That is what softens the edge.
    if (inside(x, y)) sum += raster.alpha[y * raster.w + x];
  }
}
return Math.round((sum / (cells * 255)) * steps);`;

const TextIntoPicture: React.FC = () => {
  usePageTitle('Turn text into a picture — an ASCII halftone scroll effect in React · Fei Hu');

  return (
  <PageTransition>
    <Page>
      <Column>
        <Crumb to="/lab">← lab</Crumb>
        <Kicker>2026 · Case study</Kicker>
        <Title>Turning a page of text into a picture</Title>

        <Lede>
          This runs on <InlineLink to="/readme">my readme</InlineLink>. Scroll it and the
          writing shrinks away into a feather. Here it is on a slider, so you can stop halfway
          and see what happens.
        </Lede>

        <Demo />
        <StillPair />

        <H2>What you are looking at</H2>
        <P>
          The words never change. Same sentences, same order, first frame to last.
        </P>
        <P>
          What changes is how they are set. The block gets smaller and much tighter, and every
          character gets its own shade of grey. Characters where the feather is go dark; the
          rest go almost invisible. Step back far enough and you stop seeing letters and start
          seeing the shape they make.
        </P>
        <P>
          It is halftone, more or less. A newspaper photo is dots of one ink at different
          sizes. This is characters of one ink at different weights.
        </P>

        <H2>First try: draw a grid</H2>
        <P>
          The obvious way is to generate the picture. Work out how many rows and columns fit,
          pick a character for each cell by brightness, and crossfade the grid over the words.
        </P>
        <P>
          It looked wrong straight away. Both blocks were there, same place, same size, and the
          result was a smeared double image like a badly registered print. So I measured the
          first block&apos;s exact rectangle and built the grid to match it to the pixel. Same
          result.
        </P>
        <P>
          Matching the box cannot work. The writing is set in letters of different widths, with
          word spaces and lines that end wherever they end. A grid is monospaced and every row
          is the same length. Two blocks of the same words in different rhythms read as two
          blocks however well their outlines agree.
        </P>

        <H2>The fix: copy the page instead of drawing it</H2>
        <P>
          So stop drawing a second block. Copy the first one.
        </P>
        <P>
          The picture layer is a literal <Mono>cloneNode</Mono> of the writing. Same typeface,
          same spacing, same line breaks, same ragged edge, because it is the same markup.
          There is no second rhythm left to notice.
        </P>
        <P>
          A copy can also be taken apart. Every character becomes its own span, which is what
          makes them paintable one at a time. Doing that to the live page would put a span
          between every letter of every link on it. On a copy nobody can click, it costs
          nothing.
        </P>

        <H2>How much picture a page of text can hold</H2>
        <P>
          The resolution is not something you choose. It is however many lines the words take
          up — at a comfortable width, about thirty, and a tall narrow mark can use maybe half
          of them.
        </P>
        <P>
          So the block narrows before it shrinks. A tighter column reflows the same words into
          fifty shorter lines and the feather gets 43. Watch the slider between{' '}
          <Mono>read</Mono> and <Mono>condense</Mono>: that beat is not decoration, it is what
          doubles the resolution.
        </P>
        <P>
          Then the block gives up the rest of its typesetting. Paragraphs run together into one
          continuous stretch, and words break mid-word. Both do the same job — get more ink into
          the frame. A short last line is a half-empty row across the picture; a ragged right
          edge is a chewed strip down one side. By this point nobody is reading, so there is
          nothing left to protect.
        </P>
        <P>
          If it ends up a solid packed slab, why not just draw one? Because the letters still
          have different widths, so the positions stay irregular, and a monospaced grid is
          perfectly regular. Same two rhythms, same double image.
        </P>
        <P>
          Trying three marks made the rule obvious. Rows go up with the square root of how much
          text there is, and down with the square root of how wide the mark is against its
          height. Here that is 43 rows for the feather, 25 for the tricorn and 15 for{' '}
          <Mono>Hello</Mono>. The full <Mono>DESTINY 2</Mono> logo is nearly eight times wider
          than it is tall, which works out at nine — not a picture of anything. That is why the
          tricorn is here on its own.
        </P>
        <P>
          Shrinking the type looks like the fix and cuts both ways at once. Smaller characters
          give the mark a bigger share of the block, but the same words set smaller need fewer
          lines, so there is less block to take a share of. Where the two cross is the ceiling.
          On a wordmark at a fixed width: 22px gave seven rows, 15px gave ten, 10px gave eight.
          That is why the three marks are set at different sizes — <Mono>Hello</Mono> is wide,
          so its crossing point is 11.5px against the feather&apos;s 14.
        </P>
        <P>
          The only thing that moves the ceiling is more text. The passage above is twice the
          length it started at, bought purely for resolution. Every extra paragraph is a finer
          picture.
        </P>

        <H2>Why the H had no crossbar</H2>
        <P>
          <Mono>Hello</Mono> broke something worth showing. The first version drew its H as two
          separate stems with nothing between them. The crossbar was not faint. It was missing.
        </P>
        <P>
          At ten rows, an italic H&apos;s crossbar is about one row thick. Each character was
          asking the mark a single question, at the point in its own middle, so whether the bar
          existed came down to whether a row of those points landed inside it. It did not.
          Anything thinner than the gap between samples does not come out faint; it comes out or
          it does not.
        </P>
        <P>
          Now each character averages the mark across the whole cell it sits in. A stroke
          crossing a cell always counts for something, so the bar arrives as a row of mid-greys
          and the H closes. Edges got better too: a cell straddling the mark&apos;s outline
          comes back at half weight instead of picking a side.
        </P>
        <Pre>
          <code
            dangerouslySetInnerHTML={{
              __html: hljs.highlight(SAMPLE_CODE, { language: 'javascript' }).value,
            }}
          />
        </Pre>
        <P>
          A word is still the hardest thing here. It is thin strokes with holes inside them, and
          this screen has holes of its own — word spaces are never sampled, because wrapping them
          in anything would move the line breaks, and those gaps are about the width of a letter
          stroke. A feather does not mind losing a few cells. An <Mono>e</Mono> does.
        </P>
        <P>
          Photographs lost outright. I tried two halftone engravings of my pets. Their
          transparency is a plain cutout, so read like the feather they came out as pet-shaped
          blobs — fixable, by reading how dark the picture is instead. What was not fixable is
          that a flat shape only ever uses the two ends of the nine shades, and those are as far
          apart as this page can make them, while a photograph lives in the middle. The middle
          is where light paper is weakest: a character at 36% ink is a pale grey letter, which is
          what the surrounding writing already looks like. I spread the tones by rank, curved
          them toward the ends, laid a base weight under the whole animal. Each helped. None was
          enough.
        </P>
        <P>
          Which is the limit of the whole idea. A page of text is a coarse screen with few greys
          and gaps in it. Give it something that reads at a glance in black and white and it does
          that well. Give it a face, or a sentence, and it will not.
        </P>

        <H2>What it costs</H2>
        <P>
          It does not run on a phone. It needs fifty lines on screen at a size where fifty lines
          still read as a block, and a narrow screen has neither. On{' '}
          <InlineLink to="/readme">the readme</InlineLink> the layer is switched off below
          tablet width.
        </P>
        <P>
          Copying the page also copies its styling, including the parts you did not want. The
          copy inherits the original&apos;s fade-out, so left alone it dies exactly as it should
          be appearing. It inherits the original&apos;s clickability, so it sits invisibly on
          top and swallows every hover. Both have to be taken back by hand — still cheaper than
          two blocks that never line up.
        </P>

        <EndLink to="/lab">← more lab</EndLink>
      </Column>
    </Page>
  </PageTransition>
  );
};

export default TextIntoPicture;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  padding: 7rem 2rem 6rem;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    padding: 4rem 1.5rem 4rem;
  }
`;

const Column = styled.div`
  max-width: 680px;
  margin: 0 auto;
`;

const Crumb = styled(Link)`
  display: inline-block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  text-decoration: none;
  margin-bottom: 3rem;

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
  margin-bottom: 0.9rem;
`;

const Title = styled.h1`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(2rem, 4.4vw, 3rem);
  font-weight: 300;
  line-height: 1.1;
  color: ${p => p.theme.color.ink};
  margin: 0 0 1.6rem;
`;

const Lede = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 1.18rem;
  line-height: 1.65;
  color: ${p => p.theme.color.ink};
  margin: 0 0 3rem;
`;

const H2 = styled.h2`
  font-family: ${p => p.theme.font.body};
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.2;
  color: ${p => p.theme.color.ink};
  margin: 3.5rem 0 1.1rem;
`;

const P = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 1.02rem;
  line-height: 1.75;
  color: ${p => p.theme.color.ink};
  margin: 0 0 1.2rem;
`;

const Mono = styled.code`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.86em;
  color: ${p => p.theme.color.ink};
`;

const InlineLink = styled(Link)`
  color: ${p => p.theme.accent.base};
  text-decoration: none;
  border-bottom: 1px solid currentColor;

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;

/* A dark island on a light page, the same call PostBody's <pre> makes — so the highlighter's
   accent stays the bright yellow rather than the light surface's bronze. */
const Pre = styled.pre`
  background: var(--n-11);
  border-radius: 10px;
  padding: 1.1rem 1.3rem;
  overflow-x: auto;
  margin: 1.6rem 0;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.78rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.86);

  .hljs-comment {
    color: rgba(255, 255, 255, 0.4);
  }
  .hljs-keyword,
  .hljs-built_in {
    color: #a5b4fc;
  }
  .hljs-title,
  .hljs-function {
    color: #fcd34d;
  }
  .hljs-number {
    color: #fca5a5;
  }
`;

const EndLink = styled(Link)`
  display: inline-block;
  margin-top: 4rem;
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
/* Demo styles                                                         */
/* ------------------------------------------------------------------ */

const DemoFigure = styled.figure`
  margin: 0 0 1rem;

  /* Below md the demo is not shown at all — see the note in "What it costs". A slider that
     produces mush is worse than not offering one, and the same width limit that kills the
     effect on /readme kills it here. */
  @media (max-width: ${p => p.theme.breakpoints.md}) {
    display: none;
  }
`;

/* The mirror of DemoFigure's gate: exactly one of the two is ever shown. */
const StillFigure = styled.figure`
  margin: 0 0 1rem;
  display: none;

  /* Stacked, not side by side. Two stills across a 375px screen give each about 170px, and
     at 170px the condensed block is the mush the demo is withheld to avoid. Full width also
     lets each still keep its own framing — the reading state is landscape, the finished mark
     is a tall narrow column, and forcing them into matching boxes shrinks the one that
     needs the room. */
  @media (max-width: ${p => p.theme.breakpoints.md}) {
    display: grid;
    gap: 0.8rem;
    justify-items: center;
  }
`;

const Still = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  border: 1px solid ${p => p.theme.color.border};
  background: color-mix(in srgb, ${p => p.theme.color.ink} 4%, ${p => p.theme.color.surface});
`;

const Stage = styled.div`
  --p: 0;
  --fit-scale: 0.42;
  position: relative;
  height: 760px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, ${p => p.theme.color.ink} 4%, ${p => p.theme.color.surface});
  border: 1px solid ${p => p.theme.color.border};
`;

/**
 * The one thing that scales. Both layers ride it together, so they are the same size at
 * every point of the scrub by construction rather than by two matching calculations.
 */
const Unit = styled.div`
  /* The shrink finishes WITH the condensing, not at the end of the scrub. Two reasons, one
     forced and one chosen. Forced: the block reaches its full height by 0.32 and holds it,
     so a scale still at 0.93 there pushes it out through the top and bottom of the stage.
     Chosen: it leaves the crossfade to happen at a dead-still size, which is when it is
     easiest to see that the two layers are the same block rather than two. */
  --shrink-t: ${ramp(0, 0.35)};

  /* Taken out of flow and centred by transform rather than by the grid, which matters more
     than it looks. A scale is a VISUAL change only: the box still occupies its unscaled size
     in layout, and the condensed block is taller than the stage before it is scaled down. As
     a grid item that overflow made the browser clamp centring to the top, and the transform
     then pushed the result down past the bottom edge — the picture was both off-centre and
     clipped. Absolute centring reads the same at every scale because layout is not consulted. */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(calc(1 + var(--shrink-t) * (var(--fit-scale) - 1)));
  will-change: transform;
`;

/* The ink ladder, applied to whichever layer is carrying data-l. Written once and reused by
   both Block (never sampled, so always flat) and Reveal (sampled). */
const ladder = css`
  ${LEVELS.map((mix, i) => {
    const d = mix - ASCII_FLAT;
    return css`
      span[data-l='${i}'] {
        color: color-mix(
          in srgb,
          ${p => p.theme.color.ink}
            calc(${ASCII_FLAT}% ${d < 0 ? '-' : '+'} ${Math.abs(d)}%),
          transparent
        );
      }
    `;
  })}
`;

/**
 * What "condensed" actually means, and it is more violent than it sounds.
 *
 * The paragraphs go INLINE — one continuous run, where the next sentence starts on the line
 * the last one ended. And words break mid-word. Both exist for the same reason: the picture
 * is made of ink, and every short last line and every notch of ragged right edge is a hole
 * in it. Four paragraphs at a ragged measure cost four half-empty rows and a chewed edge
 * down one whole side, which is a lot of feather to lose.
 *
 * `break-all` rather than `overflow-wrap: anywhere`, which only breaks to avoid overflow and
 * still prefers spaces — it would leave most of the raggedness in place. `text-wrap: auto`
 * because `pretty` spends its effort balancing the last lines of a paragraph, which is
 * exactly the balancing being undone.
 *
 * Legitimate here and nowhere else: by this point the words are being looked at, not read.
 */
const merged = css`
  p {
    display: inline;
    word-break: break-all;
    text-wrap: auto;
  }

  /* Or the last word of one paragraph fuses onto the first word of the next. */
  p::after {
    content: ' ';
  }
`;

const blockType = css`
  --narrow-t: 0;
  --lh-t: 0;
  width: calc(${WIDE}px + var(--narrow-t) * (var(--narrow) - ${WIDE}px));
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: calc(14px + var(--lh-t) * (var(--type) - 14px));
  line-height: calc(1.6 + var(--lh-t) * -0.4);
  text-align: left;
`;

const Block = styled.div`
  ${blockType}
  /* The two condensing beats run TOGETHER, not one after the other, and that is a fix
     rather than a preference. Narrowing 560px of measure to 265 reflows the same words into
     half again as many lines, so the block gets a third TALLER before it gets smaller — and
     a staggered tighten let it peak at 610px inside a 458px stage, where the top and bottom
     of it were simply cut off. Tightening on the same ramp cancels the growth as it happens.
     The reader still sees two beats, because the measure moving is what they notice. */
  --narrow-t: ${ramp(0, 0.32)};
  --lh-t: ${ramp(0, 0.32)};
  color: ${p => p.theme.color.ink};
  /* The mirror of Reveal's ramp, centred on the same point so the two cross at 50/50
     rather than both passing through zero and showing the stage's ground between them. */
  opacity: clamp(0, calc((${SWAP + SWAP_RUN / 2} - var(--p)) / ${SWAP_RUN}), 1);

  [data-merged] & {
    ${merged}
  }
`;

/* The gaps close on the tightening ramp, ahead of MERGE_AT taking the paragraphs inline
   entirely. Only the space between them: closing the gap is not the same as closing the
   HOLE, which is what the merge above is for. */
const BlockP = styled.p`
  margin: 0 0 calc(0.9em * (1 - var(--lh-t)));

  &:last-child {
    margin-bottom: 0;
  }
`;

const Reveal = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: clamp(0, calc((var(--p) - ${SWAP - SWAP_RUN / 2}) / ${SWAP_RUN}), 1);

  /* The copy carries Block's class, which is what makes it lay out identically — and also
     means it inherits Block's fade-OUT. Left alone it would die exactly as this layer brings
     it in, and the picture would never appear. Same specificity, so !important is the only
     thing that decides it. */
  > * {
    opacity: 1 !important;
    /* It also inherits the ramps as live values; here they are pinned to the end state,
       because this layer only exists once the block has finished narrowing. */
    --narrow-t: 1 !important;
    --lh-t: 1 !important;

    /* Merged unconditionally, not on the stage's attribute: this layer is sampled at mount,
       when --p is 0 and the stage is not merged yet. Sampling an unmerged copy would place
       every character against a layout it never has once it is visible. */
    ${merged}
  }

  /* Everything flattens to the flat field first; the ladder then lifts the mark out of it. */
  * {
    color: color-mix(in srgb, ${p => p.theme.color.ink} ${ASCII_FLAT}%, transparent);
  }

  ${ladder}
`;

const Picker = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-top: 0.9rem;
`;

/* Deliberately quiet — the mark is a thing to try, not the page's main control, and three
   loud buttons above a slider would read as the more important of the two. */
const PickButton = styled.button<{ $on: boolean }>`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease;
  border: 1px solid
    ${p => (p.$on ? 'transparent' : p.theme.color.border)};
  background: ${p => (p.$on ? p.theme.color.ink : 'transparent')};
  color: ${p => (p.$on ? p.theme.color.surface : p.theme.color.inkMuted)};

  &:hover {
    color: ${p => (p.$on ? p.theme.color.surface : p.theme.color.ink)};
  }
`;

const Scrubber = styled.div`
  position: relative;
  margin: 1.2rem 0 0;
`;

const ScrubInput = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 2px;
  background: ${p => p.theme.color.border};
  border-radius: 2px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: ${p => p.theme.color.ink};
    cursor: inherit;
  }

  &::-moz-range-thumb {
    width: 15px;
    height: 15px;
    border: 0;
    border-radius: 50%;
    background: ${p => p.theme.color.ink};
    cursor: inherit;
  }
`;

const Ticks = styled.div`
  position: relative;
  height: 1.6rem;
  margin-top: 0.5rem;
`;

/* Left-anchored rather than centred on the tick: the first label sits at 0% and the last at
   62%, so nothing needs to hang off either end of the track. */
const Tick = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 0;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  color: ${p => (p.$on ? p.theme.color.ink : p.theme.color.inkMuted)};
  opacity: ${p => (p.$on ? 1 : 0.55)};
  transition:
    color 0.25s ease,
    opacity 0.25s ease;

  &::before {
    content: '';
    position: absolute;
    top: -0.85rem;
    left: 0;
    width: 1px;
    height: 5px;
    background: currentColor;
  }
`;

const Caption = styled.figcaption`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-top: 0.4rem;
`;
