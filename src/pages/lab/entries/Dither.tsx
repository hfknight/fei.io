/**
 * The dither lab entry's page: effect switcher, per-effect sliders, duotone pickers, image
 * input (file/drop/paste), and PNG export — wired to the pure math in `ditherCore.ts` and the
 * canvas edge in `ditherCanvas.ts`. See the plan's Product Contract (R1-R11) for the settled
 * shape; nothing here decides behaviour that wasn't already decided there.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import PageTransition from '../../../components/PageTransition';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { staticVars } from '../../../styles/tokens';
import type {
  AsciiParams,
  BlendId,
  Duotone,
  DotsParams,
  EffectId,
  HalftoneParams,
  LatticeParams,
} from './ditherCore';
import { ASCII_RAMPS } from './ditherCore';
import type { RenderSpec } from './ditherCanvas';
import {
  PREVIEW_DRAG_MAX_COLS,
  PREVIEW_MAX_COLS,
  renderEffect,
  renderExport,
} from './ditherCanvas';

/* ------------------------------------------------------------------ */
/* Defaults                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_HALFTONE: HalftoneParams = { cellSize: 8, angle: 45, contrast: 0, invert: false };
const DEFAULT_DOTS: DotsParams = { cellSize: 8, fillCutoff: 0.08, contrast: 0 };
/* Ascii opens coarser than the other three on purpose: its mark is a glyph, and a glyph has to
 * be big enough to read as one. At the cell size the others default to, a wide photo puts ~4px
 * between characters and the picture turns into a grey wash. The slider still reaches down
 * there for anyone who wants that texture. */
const DEFAULT_ASCII: AsciiParams = { cellSize: 16, contrast: 0, charset: ASCII_RAMPS.classic };
/* `density` reaches the canvas edge as the mesh's column count (see ditherCanvas.ts). */
/* Threshold defaults near zero: the mesh's luminance-alpha already fades shadows out, so the
 * hard cull is a stylistic extra, not the primary tone control (the reference app defaults it
 * off entirely). */
const DEFAULT_LATTICE: LatticeParams = { density: 36, threshold: 0.05, jitter: 0.6 };
const DEFAULT_DUOTONE: Duotone = { paper: '#f4ead5', ink: '#1a1408' };
const DEFAULT_SOURCE_COLOR = true;
/* The photo layer is opt-in: the page opens on the flat duotone ground it always had. */
const DEFAULT_PHOTO_UNDER = false;
const DEFAULT_BLEND: BlendId = 'normal';
const DEFAULT_LAYER_OPACITY = 1;
const DEFAULT_JITTER_SEED = 42;

const BLENDS: BlendId[] = ['normal', 'overlay', 'screen', 'multiply', 'dodge'];

/**
 * Each effect opens on whichever bundled photo it flatters, because what a photo needs differs
 * per effect. The city is wide, and its paper-white sky against a black silhouette gives
 * halftone a full tonal ramp and dots a bright field to light up. The portrait's mid-tones and
 * neon carry the two effects the city starves: its face reads as glyphs where the city's sky
 * left ascii a grey wash, and its lit background draws lattice into a dense mesh with the
 * figure cut out of it.
 *
 * Only ever swapped under a bundled sample — a photo the visitor brought is theirs, and
 * switching effects must never take it away.
 */
const SAMPLES: Record<EffectId, string> = {
  halftone: '/lab/dither/void-punk.webp',
  dots: '/lab/dither/void-punk.webp',
  ascii: '/lab/dither/neon-visor.webp',
  lattice: '/lab/dither/neon-visor.webp',
};
const NOTICE_MS = 4000;
/* Two spec changes closer together than this are a drag, not two decisions — a slider fires
   every few milliseconds while the thumb moves. */
const DRAG_GAP_MS = 220;
/* How long after the last change the fine render lands. Long enough to sit out the gaps in a
   slow drag, short enough that it feels like the same gesture. */
const REFINE_DELAY_MS = 200;
/* The page's own padding above and below the canvas, in px — `Page`'s 5rem top and 3rem bottom
   plus a rem of slack. Both the canvas's CSS ceiling and the preview's sizing read it, so a
   portrait is drawn at the size it is displayed rather than at the column's full width, where
   CSS would then shrink it and every cell with it. */
const CANVAS_VIEWPORT_MARGIN = 144;

/** The seam a test can assert without touching canvas: what a download would be named/typed. */
export const EXPORT_FILENAME = 'dither.png';
export const EXPORT_MIME = 'image/png';

const EFFECTS: { id: EffectId; label: string }[] = [
  { id: 'halftone', label: 'halftone' },
  { id: 'dots', label: 'dots' },
  { id: 'ascii', label: 'ascii' },
  { id: 'lattice', label: 'lattice' },
];

/**
 * Ordered dark-ground first, light-ground second, neutrals last. The chromatic ones are spread
 * around the wheel on purpose — 41, 100, 142, 174, 218, 272, 338, 3 — because a duotone is
 * chosen by hue, and two presets a few degrees apart are one preset with two names. The pairs
 * also keep a wide luminance gap, which is what lets `duotoneRoles` tell ground from mark.
 */
const DUOTONE_PRESETS: { name: string; ink: string; paper: string }[] = [
  { name: 'crt', paper: '#0a0f0a', ink: '#4ade80' },
  { name: 'amber', paper: '#140d02', ink: '#ffb000' },
  { name: 'teal', paper: '#04191d', ink: '#2dd4bf' },
  { name: 'violet', paper: '#100a1d', ink: '#c084fc' },
  { name: 'blueprint', paper: '#0b2c66', ink: '#e8eefc' },
  { name: 'riso red', paper: '#f3ede2', ink: '#ff3b30' },
  { name: 'riso pink', paper: '#f6efe6', ink: '#ff4d8f' },
  { name: 'moss', paper: '#eef0e6', ink: '#3f5d2f' },
  { name: 'newsprint', paper: '#e9e4d7', ink: '#3a352c' },
  { name: 'classic', paper: '#ffffff', ink: '#000000' },
  { name: 'inverse', paper: '#0d0d0d', ink: '#f2f2f2' },
];

const CHARSET_PRESETS: { name: string; charset: string }[] = [
  { name: 'classic', charset: ASCII_RAMPS.classic },
  { name: 'blocky', charset: ASCII_RAMPS.blocky },
  { name: 'thin', charset: ASCII_RAMPS.thin },
  { name: 'symbols', charset: ASCII_RAMPS.symbols },
  { name: 'numeric', charset: ASCII_RAMPS.numeric },
];

/** Either decode path — createImageBitmap or the HTMLImageElement fallback — hands back
 *  something with pixel dimensions the canvas edge can draw from. */
type ImgSource = ImageBitmap | HTMLImageElement;

interface HeldSource {
  img: ImgSource;
  bitmap?: ImageBitmap;
  objectUrl?: string;
}

/* ------------------------------------------------------------------ */
/* The page                                                             */
/* ------------------------------------------------------------------ */

const Dither: React.FC = () => {
  usePageTitle('Dither');

  const [effect, setEffect] = useState<EffectId>('halftone');
  const [halftone, setHalftone] = useState<HalftoneParams>(DEFAULT_HALFTONE);
  const [dots, setDots] = useState<DotsParams>(DEFAULT_DOTS);
  const [ascii, setAscii] = useState<AsciiParams>(DEFAULT_ASCII);
  const [lattice, setLattice] = useState<LatticeParams>(DEFAULT_LATTICE);
  const [duotone, setDuotone] = useState<Duotone>(DEFAULT_DUOTONE);
  const [sourceColor, setSourceColor] = useState(DEFAULT_SOURCE_COLOR);
  const [photoUnder, setPhotoUnder] = useState(DEFAULT_PHOTO_UNDER);
  const [blend, setBlend] = useState<BlendId>(DEFAULT_BLEND);
  const [layerOpacity, setLayerOpacity] = useState(DEFAULT_LAYER_OPACITY);
  const [jitterSeed, setJitterSeed] = useState(DEFAULT_JITTER_SEED);

  const [source, setSource] = useState<ImgSource | null>(null);
  /* Set once the visitor brings a photo of their own, which retires the bundled samples for
     the rest of the visit. */
  const [ownPhoto, setOwnPhoto] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exporting, setExporting] = useState(false);

  const heldRef = useRef<HeldSource | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const asciiFontGatedRef = useRef(false);
  /* When the last spec change landed, so a drag can be told from a single click. */
  const lastRenderRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spec: RenderSpec = useMemo(
    () => ({
      effect,
      halftone,
      dots,
      ascii,
      lattice,
      duotone,
      sourceColor,
      photoUnder,
      blend,
      layerOpacity,
      jitterSeed,
    }),
    [
      effect,
      halftone,
      dots,
      ascii,
      lattice,
      duotone,
      sourceColor,
      photoUnder,
      blend,
      layerOpacity,
      jitterSeed,
    ],
  );

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  useEffect(() => () => clearTimeout(noticeTimeoutRef.current), []);

  /* Leaving the route releases the held decode — replacement already releases the previous
     one, this covers the last. */
  useEffect(
    () => () => {
      heldRef.current?.bitmap?.close();
      if (heldRef.current?.objectUrl) URL.revokeObjectURL(heldRef.current.objectUrl);
      heldRef.current = null;
    },
    [],
  );

  /**
   * Every replacement funnels through here (sample fetch, file picker, drop, paste). A
   * non-image blob or a decode failure keeps the current source in place — the visitor never
   * loses their work to a bad drop — and surfaces the same inline notice either way. The
   * previous bitmap/URL is released only once the new one has successfully decoded.
   */
  const loadSource = useCallback(
    async (blob: Blob, own = true) => {
      if (!blob.type.startsWith('image/')) {
        showNotice('that file is not an image');
        return;
      }
      try {
        let next: HeldSource;
        if (typeof createImageBitmap === 'function') {
          const bitmap = await createImageBitmap(blob);
          next = { img: bitmap, bitmap };
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('image decode failed'));
            img.src = objectUrl;
          });
          next = { img, objectUrl };
        }
        const prev = heldRef.current;
        heldRef.current = next;
        setSource(next.img);
        setOwnPhoto(own);
        prev?.bitmap?.close();
        if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      } catch {
        showNotice('could not read that image');
      }
    },
    [showNotice],
  );

  /* R6: the bundled sample renders before anyone touches the page — never an empty dropzone.
     The same effect carries the per-effect swap: picking an effect whose sample differs fetches
     it, and once the visitor has brought their own photo this bows out entirely. A failed fetch
     (offline, blocked) is swallowed: the page just shows an empty canvas. */
  useEffect(() => {
    if (ownPhoto) return;
    let cancelled = false;
    fetch(SAMPLES[effect])
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) return loadSource(blob, false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [effect, ownPhoto, loadSource]);

  /* R7 (paste): only a clipboard payload carrying an image file counts as image input — a
     paste into the custom-charset text field must pass through untouched. */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) void loadSource(file);
          return;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [loadSource]);

  /* Preview render: fires on every spec/source change, i.e. every slider drag. Sized to the
     container's width, height following the source's aspect so cells stay square.

     The full grid costs more than a frame to paint, so a change arriving on the heels of
     another — which is what a drag is — paints the coarse grid instead, and a fine render lands
     once the changes stop. A visitor scrubbing a slider sees coarse frames follow their thumb;
     a visitor who stops sees the full detail a beat later. Every render the picture actually
     rests on is the fine one, and export never uses the coarse cap at all. */
  useEffect(() => {
    if (!source) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!canvas.getContext('2d')) return; // jsdom has no 2d context; nothing to draw

    const columnWidth = canvasWrapRef.current?.clientWidth || 600;
    const maxHeight = Math.max(200, window.innerHeight - CANVAS_VIEWPORT_MARGIN);
    const width = Math.max(
      1,
      Math.round(Math.min(columnWidth, maxHeight * (source.width / source.height))),
    );
    const height = Math.max(1, Math.round(width * (source.height / source.width)));
    canvas.width = width;
    canvas.height = height;

    const now = performance.now();
    const dragging = now - lastRenderRef.current < DRAG_GAP_MS;
    lastRenderRef.current = now;

    renderEffect(canvas, source, spec, dragging ? PREVIEW_DRAG_MAX_COLS : PREVIEW_MAX_COLS);

    if (dragging) {
      const refine = setTimeout(
        () => renderEffect(canvas, source, spec, PREVIEW_MAX_COLS),
        REFINE_DELAY_MS,
      );
      return () => clearTimeout(refine);
    }

    /* Font gate (U2 edit): before the FIRST ascii render only, wait for JetBrains Mono to be
       usable and re-render once — a cold load should never freeze fallback glyphs. Later
       ascii renders (slider drags) don't re-gate. */
    if (spec.effect === 'ascii' && !asciiFontGatedRef.current) {
      asciiFontGatedRef.current = true;
      // Family name read from the token, not hardcoded here — same face ditherCanvas.ts's
      // ctx.font paints with, kept as one source of truth (tokens.ts's --font-mono).
      const load = document.fonts?.load
        ? document.fonts.load(`16px ${staticVars['--font-mono']}`)
        : Promise.resolve();
      let cancelled = false;
      Promise.resolve(load)
        .catch(() => undefined)
        .then(() => {
          if (!cancelled) renderEffect(canvas, source, spec, PREVIEW_MAX_COLS);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [source, spec]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void loadSource(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadSource(file);
  };

  /**
   * Switching effects opens a clean slate: every effect's params, the duotone and the
   * image-colors toggle all return to their defaults. Nothing tuned for one effect follows the
   * visitor into the next — which matters most for the colours, since the same pick means
   * different things per effect (halftone inks on paper; dots and lattice ground the frame in
   * whichever colour is darker). Re-picking the effect already showing is a no-op, so a stray
   * click on the active button never wipes a tuned render.
   */
  const selectEffect = (id: EffectId) => {
    if (id === effect) return;
    setEffect(id);
    setHalftone(DEFAULT_HALFTONE);
    setDots(DEFAULT_DOTS);
    setAscii(DEFAULT_ASCII);
    setLattice(DEFAULT_LATTICE);
    setDuotone(DEFAULT_DUOTONE);
    setSourceColor(DEFAULT_SOURCE_COLOR);
    setPhotoUnder(DEFAULT_PHOTO_UNDER);
    setBlend(DEFAULT_BLEND);
    setLayerOpacity(DEFAULT_LAYER_OPACITY);
    setJitterSeed(DEFAULT_JITTER_SEED);
  };

  /* Jitter takes a fresh seed only when jitter itself moves (KTD4) — density/threshold, and
     every other slider, leave the scatter alone. */
  const onJitterChange = (value: number) => {
    setLattice((prev) => ({ ...prev, jitter: value }));
    setJitterSeed(Math.floor(Math.random() * 1_000_000));
  };

  const download = useCallback(async () => {
    if (!source || exporting) return;
    setExporting(true);
    try {
      const result = await renderExport(source, spec);
      if (!result) {
        showNotice('export failed');
        return;
      }
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = EXPORT_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [source, spec, exporting, showNotice]);

  const canCopy = typeof ClipboardItem !== 'undefined';

  const copy = useCallback(async () => {
    if (!source || exporting || !canCopy) return;
    setExporting(true);
    try {
      const blobPromise = renderExport(source, spec).then((result) => {
        if (!result) throw new Error('export failed');
        return result.blob;
      });
      // Pass the promise directly to ClipboardItem, not an awaited blob — Safari requires it.
      await navigator.clipboard.write([new ClipboardItem({ [EXPORT_MIME]: blobPromise })]);
    } catch {
      showNotice('copy failed');
    } finally {
      setExporting(false);
    }
  }, [source, spec, exporting, canCopy, showNotice]);

  return (
    <PageTransition>
      <Page>
        <Layout>
          <CanvasCol>
            <CanvasWrap
              ref={canvasWrapRef}
              $dragOver={dragOver}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {/* The canvas is the whole of this page's content, and to anything that cannot
                  see pixels it is a blank element. The label says which effect is showing, and
                  the child text is the canvas fallback, which is what a crawler reads. */}
              <Canvas ref={canvasRef} role="img" aria-label={`${effect} render of the photo`}>
                A photo rendered as {effect} marks.
              </Canvas>
              {dragOver && <DropHint>drop to replace the photo</DropHint>}
            </CanvasWrap>
          </CanvasCol>

          <Controls>
            <TitleBlock>
              <Crumb to="/lab">← lab</Crumb>
              <Title>dither</Title>
              <Lede>drop a photo anywhere, pick a look, take home the full-resolution png.</Lede>
            </TitleBlock>

            <EffectRow role="radiogroup" aria-label="Effect">
              {EFFECTS.map((e) => (
                <EffectButton
                  key={e.id}
                  type="button"
                  role="radio"
                  aria-checked={effect === e.id}
                  $active={effect === e.id}
                  onClick={() => selectEffect(e.id)}
                >
                  {e.label}
                </EffectButton>
              ))}
            </EffectRow>

            {effect === 'halftone' && (
              <ParamSet>
                <SliderField
                  label="Cell size"
                  min={6}
                  max={48}
                  step={1}
                  value={halftone.cellSize}
                  onChange={(v) => setHalftone((p) => ({ ...p, cellSize: v }))}
                />
                <SliderField
                  label="Angle"
                  min={0}
                  max={180}
                  step={1}
                  value={halftone.angle}
                  onChange={(v) => setHalftone((p) => ({ ...p, angle: v }))}
                />
                <SliderField
                  label="Contrast"
                  min={-0.5}
                  max={1.5}
                  step={0.05}
                  value={halftone.contrast}
                  onChange={(v) => setHalftone((p) => ({ ...p, contrast: v }))}
                />
                <ToggleButton
                  type="button"
                  aria-pressed={halftone.invert}
                  $active={halftone.invert}
                  onClick={() => setHalftone((p) => ({ ...p, invert: !p.invert }))}
                >
                  invert
                </ToggleButton>
              </ParamSet>
            )}

            {effect === 'dots' && (
              <ParamSet>
                <SliderField
                  label="Cell size"
                  min={6}
                  max={48}
                  step={1}
                  value={dots.cellSize}
                  onChange={(v) => setDots((p) => ({ ...p, cellSize: v }))}
                />
                <SliderField
                  label="Fill cutoff"
                  min={0}
                  max={0.6}
                  step={0.01}
                  value={dots.fillCutoff}
                  onChange={(v) => setDots((p) => ({ ...p, fillCutoff: v }))}
                />
                <SliderField
                  label="Contrast"
                  min={-0.5}
                  max={1.5}
                  step={0.05}
                  value={dots.contrast}
                  onChange={(v) => setDots((p) => ({ ...p, contrast: v }))}
                />
              </ParamSet>
            )}

            {effect === 'ascii' && (
              <ParamSet>
                <SliderField
                  label="Cell size"
                  min={6}
                  max={48}
                  step={1}
                  value={ascii.cellSize}
                  onChange={(v) => setAscii((p) => ({ ...p, cellSize: v }))}
                />
                <SliderField
                  label="Contrast"
                  min={-0.5}
                  max={1.5}
                  step={0.05}
                  value={ascii.contrast}
                  onChange={(v) => setAscii((p) => ({ ...p, contrast: v }))}
                />
                <FieldLabel>charset</FieldLabel>
                <PresetRow>
                  {CHARSET_PRESETS.map((preset) => (
                    <PresetButton
                      key={preset.name}
                      type="button"
                      $active={ascii.charset === preset.charset}
                      onClick={() => setAscii((p) => ({ ...p, charset: preset.charset }))}
                    >
                      {preset.name}
                    </PresetButton>
                  ))}
                </PresetRow>
                <TextInput
                  type="text"
                  aria-label="Custom characters"
                  value={ascii.charset}
                  onChange={(e) => setAscii((p) => ({ ...p, charset: e.target.value }))}
                />
              </ParamSet>
            )}

            {effect === 'lattice' && (
              <ParamSet>
                <SliderField
                  label="Detail"
                  min={14}
                  max={72}
                  step={2}
                  value={lattice.density}
                  onChange={(v) => setLattice((p) => ({ ...p, density: v }))}
                />
                <SliderField
                  label="Threshold"
                  min={0}
                  max={0.6}
                  step={0.01}
                  value={lattice.threshold}
                  onChange={(v) => setLattice((p) => ({ ...p, threshold: v }))}
                />
                <SliderField
                  label="Jitter"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={lattice.jitter}
                  onChange={onJitterChange}
                />
              </ParamSet>
            )}

            <FieldLabel>ink &amp; paper</FieldLabel>
            <ToggleButton
              type="button"
              aria-pressed={sourceColor}
              $active={sourceColor}
              onClick={() => setSourceColor((v) => !v)}
            >
              image colors
            </ToggleButton>
            <DuotoneRow $muted={sourceColor}>
              <ColorInput
                type="color"
                aria-label="Ink color"
                value={duotone.ink}
                onChange={(e) => setDuotone((p) => ({ ...p, ink: e.target.value }))}
              />
              <ColorInput
                type="color"
                aria-label="Paper color"
                value={duotone.paper}
                onChange={(e) => setDuotone((p) => ({ ...p, paper: e.target.value }))}
              />
              {DUOTONE_PRESETS.map((preset) => (
                <SwatchButton
                  key={preset.name}
                  type="button"
                  aria-label={`${preset.name} preset`}
                  style={{ background: preset.paper, borderColor: preset.ink }}
                  onClick={() => setDuotone({ ink: preset.ink, paper: preset.paper })}
                />
              ))}
            </DuotoneRow>

            <FieldLabel>photo layer</FieldLabel>
            <ToggleButton
              type="button"
              aria-pressed={photoUnder}
              $active={photoUnder}
              onClick={() => setPhotoUnder((v) => !v)}
            >
              keep the photo
            </ToggleButton>
            {/* Blend and opacity describe how the marks meet the photograph, so they only exist
                while there is one to meet — over a flat ground they have nothing to say. */}
            {photoUnder && (
              <ParamSet>
                <PresetRow role="radiogroup" aria-label="Blend">
                  {BLENDS.map((id) => (
                    <PresetButton
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={blend === id}
                      $active={blend === id}
                      onClick={() => setBlend(id)}
                    >
                      {id}
                    </PresetButton>
                  ))}
                </PresetRow>
                <SliderField
                  label="Layer opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layerOpacity}
                  onChange={setLayerOpacity}
                />
              </ParamSet>
            )}

            <InputRow>
              <ChooseButton type="button" onClick={() => fileInputRef.current?.click()}>
                choose a photo
              </ChooseButton>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
              />
              <ActionButton
                type="button"
                disabled={!source || exporting}
                onClick={() => void download()}
              >
                download png
              </ActionButton>
              {canCopy && (
                <ActionButton type="button" disabled={!source || exporting} onClick={() => void copy()}>
                  copy
                </ActionButton>
              )}
            </InputRow>

            {notice && <Notice role="status">{notice}</Notice>}
          </Controls>
        </Layout>
      </Page>
    </PageTransition>
  );
};

export default Dither;

/* ------------------------------------------------------------------ */
/* A slider with a visible mono label AND an aria-label — same value,   */
/* the label reads for sighted use and assistive tech both.             */
/* ------------------------------------------------------------------ */

const SliderField: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, min, max, step, value, onChange }) => (
  <Field>
    <FieldLabel>
      {label} <FieldValue>{value}</FieldValue>
    </FieldLabel>
    <Slider
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </Field>
);

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const Page = styled.div`
  min-height: 100dvh;
  background: var(--n-11);
  padding: 5rem clamp(1.5rem, 3.5vw, 3.5rem) 3rem;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
`;

const Crumb = styled(Link)`
  display: inline-block;
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--n-6);
  text-decoration: none;

  &:hover {
    color: var(--n-1);
  }
`;

const Title = styled.h1`
  font-family: ${(p) => p.theme.font.display};
  font-weight: 700;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  color: var(--n-1);
  margin: 0;
  text-transform: lowercase;
`;

const Lede = styled.p`
  font-family: ${(p) => p.theme.font.body};
  font-weight: 200;
  font-size: 0.9rem;
  color: var(--n-6);
  margin: 0;
  max-width: 40ch;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2.5rem;
  align-items: start;

  @media (max-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: 1fr;

    /* Stacked, the title block leads the page — so the controls column comes first. */
    & > :last-child {
      order: -1;
    }
  }
`;

const CanvasCol = styled.div`
  min-width: 0;
`;

const CanvasWrap = styled.div<{ $dragOver: boolean }>`
  position: relative;
  width: 100%;
  border: 1px dashed ${(p) => (p.$dragOver ? 'var(--n-3)' : 'transparent')};
  border-radius: 4px;

  ${(p) =>
    p.$dragOver &&
    css`
      canvas {
        opacity: 0.5;
      }
    `}
`;

const Canvas = styled.canvas`
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  /* The whole picture fits the viewport without scrolling; portrait sources scale down.
     Only the page's own padding sits above and below it — the buttons live in the controls
     column, so nothing else eats the height. The preview sizes its backing store against the
     same number, so a portrait is never drawn larger than it is shown. */
  max-height: calc(100dvh - ${CANVAS_VIEWPORT_MARGIN}px);
  margin-inline: auto;
  background: var(--n-9);
  border-radius: 4px;
`;

const DropHint = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: lowercase;
  color: var(--n-1);
  pointer-events: none;
`;

const Notice = styled.p`
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--n-4);
  margin: 0;
`;

const InputRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;

const buttonSkin = css`
  font-family: ${(p) => p.theme.font.mono};
  /* Sized like the effect row above it: the three actions have to share the 320px column
     on one line, and matching that chrome is what makes them fit. */
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  white-space: nowrap;
  text-transform: lowercase;
  padding: 0.5rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid var(--n-6);
  background: transparent;
  color: var(--n-3);

  &:hover:not(:disabled) {
    border-color: var(--n-1);
    color: var(--n-1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const ChooseButton = styled.button`
  ${buttonSkin}
`;

const ActionButton = styled.button`
  ${buttonSkin}
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const EffectRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 0.4rem;
`;

const EffectButton = styled.button<{ $active: boolean }>`
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  white-space: nowrap;
  text-transform: lowercase;
  padding: 0.45rem 0.7rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid ${(p) => (p.$active ? 'var(--n-1)' : 'var(--n-6)')};
  background: ${(p) => (p.$active ? 'var(--n-1)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--n-11)' : 'var(--n-4)')};
`;

const ParamSet = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const FieldLabel = styled.span`
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: lowercase;
  color: var(--n-5);
`;

const FieldValue = styled.span`
  color: var(--n-3);
`;

const Slider = styled.input`
  appearance: none;
  width: 100%;
  height: 20px;
  background: transparent;
  cursor: pointer;
  margin: 0;

  &::-webkit-slider-runnable-track {
    height: 2px;
    background: var(--n-7);
    border-radius: 1px;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -6px;
    border-radius: 50%;
    background: var(--n-1);
    border: none;
  }

  &::-moz-range-track {
    height: 2px;
    background: var(--n-7);
    border-radius: 1px;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--n-1);
    border: none;
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  align-self: flex-start;
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: lowercase;
  padding: 0.4rem 0.8rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid ${(p) => (p.$active ? 'var(--n-1)' : 'var(--n-6)')};
  background: ${(p) => (p.$active ? 'var(--n-1)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--n-11)' : 'var(--n-4)')};
`;

const PresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const PresetButton = styled.button<{ $active: boolean }>`
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  text-transform: lowercase;
  /* Tight enough that the five blend names share the 320px column on one line. */
  padding: 0.35rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid ${(p) => (p.$active ? 'var(--n-1)' : 'var(--n-7)')};
  background: transparent;
  color: ${(p) => (p.$active ? 'var(--n-1)' : 'var(--n-5)')};
`;

const TextInput = styled.input`
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.75rem;
  padding: 0.5rem 0.6rem;
  border-radius: 2px;
  border: 1px solid var(--n-7);
  background: var(--n-10);
  color: var(--n-2);
`;

const DuotoneRow = styled.div<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  /* With image colors on, the ink picker only paints the ground; the row quiets down but
     stays usable, since paper still matters. */
  opacity: ${(p) => (p.$muted ? 0.45 : 1)};
`;

const ColorInput = styled.input`
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--n-6);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
`;

const SwatchButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid;
  cursor: pointer;
`;
