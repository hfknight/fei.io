import { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const WORDS = ['Coding', 'Crafting', 'Brewing', 'Forging', 'Igniting', 'Imagining', 'Sparking'];
const PHRASES = ['composing the view', 'setting the scene', 'almost there'];
// How long UNFOLDING shows as a normal word before canvas zoom starts
const WORD_PAUSE = 1000;
// How long the canvas zoom animation runs
const ZOOM_DURATION = 2000;
// When (0–1) the dark overlay starts fading out
const FADE_START = 0.72;

type Phase = 'loading' | 'exit-word' | 'canvas';

const LoadingBg = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 101;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, #0d1b2a 0%, #1a0f28 55%, #2d1018 100%);
`;

const Word = styled(motion.span)`
  font-family: 'Big Shoulders Display', sans-serif;
  font-size: clamp(72px, 16vw, 200px);
  color: #ffffff;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
`;

const ExitCanvas = styled.canvas`
  position: fixed;
  inset: 0;
  z-index: 100;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const dotBlink = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;

const LoadingLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 24px;
`;

const PhraseText = styled(motion.span)``;

const Dot = styled.span<{ $delay: number }>`
  animation: ${dotBlink} 1.2s ease-in-out infinite;
  animation-delay: ${p => p.$delay}s;
`;

// Starts slow, accelerates — feels like the word rushes toward the viewer
function easeIn(t: number): number {
  return t * t * t;
}

interface Props {
  isVisible: boolean;
}

const LoadingScreen: React.FC<Props> = ({ isVisible }) => {
  const [wordIndex, setWordIndex] = useState(() => Math.floor(Math.random() * WORDS.length));
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [mounted, setMounted] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Phrase cycling (always runs while mounted)
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(i => (i + 1) % PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Word cycling (loading phase only)
  useEffect(() => {
    if (phase !== 'loading') return;
    let timerId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = 500 + Math.random() * 500;
      timerId = setTimeout(() => {
        setWordIndex(i => {
          let next;
          do { next = Math.floor(Math.random() * WORDS.length); } while (next === i);
          return next;
        });
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timerId);
  }, [phase]);

  // Phase transitions when loading ends
  useEffect(() => {
    if (isVisible) return;
    // Step 1: show UNFOLDING as a normal word in LoadingBg
    const t1 = setTimeout(() => setPhase('exit-word'), 0);
    // Step 2: hand off to canvas after the word has animated in
    const t2 = setTimeout(() => setPhase('canvas'), WORD_PAUSE);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isVisible]);

  // Unmount after canvas animation completes
  useEffect(() => {
    if (phase !== 'canvas') return;
    const timer = setTimeout(() => setMounted(false), ZOOM_DURATION + 400);
    return () => clearTimeout(timer);
  }, [phase]);

  // Canvas exit animation
  useEffect(() => {
    if (phase !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const baseFontSize = Math.min(Math.max(w * 0.16, 72), 200);
    // Scale needed to guarantee text covers the farthest corner
    const cornerDist = Math.sqrt(cx * cx + cy * cy);
    const maxScale = Math.ceil((cornerDist / baseFontSize) * 3.5);

    const startTime = performance.now();
    let rafId: number;

    const draw = (now: number) => {
      const t = Math.min((now - startTime) / ZOOM_DURATION, 1);

      if (t >= 1) {
        ctx.clearRect(0, 0, w, h);
        return;
      }

      const scale = 1 + (maxScale - 1) * easeIn(t);
      // Fade the dark overlay out in the final stretch — no sudden pop
      const overlayAlpha = t < FADE_START ? 1 : 1 - (t - FADE_START) / (1 - FADE_START);

      ctx.clearRect(0, 0, w, h);

      // Draw dark gradient at current opacity
      ctx.globalAlpha = overlayAlpha;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0d1b2a');
      grad.addColorStop(0.55, '#1a0f28');
      grad.addColorStop(1, '#2d1018');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Punch text hole at full strength regardless of overlay alpha
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.font = `800 ${baseFontSize * scale}px "Big Shoulders Display", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillText('UNFOLDING', cx, cy);
      ctx.globalCompositeOperation = 'source-over';

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  if (!mounted) return null;

  const showLoadingBg = phase === 'loading' || phase === 'exit-word';
  const displayWord = phase === 'exit-word' ? 'UNFOLDING' : WORDS[wordIndex];
  const wordKey = phase === 'exit-word' ? 'exit' : wordIndex;

  return (
    <>
      {/* Canvas renders behind (z-index 100); LoadingBg fades out on top (z-index 101) */}
      {phase === 'canvas' && (
        <ExitCanvas ref={canvasRef} />
      )}

      <AnimatePresence>
        {showLoadingBg && (
          <LoadingBg
            key="loading-bg"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          >
            <AnimatePresence mode="wait">
              <Word
                key={wordKey}
                initial={{ opacity: 0, y: 50, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                {displayWord}
              </Word>
            </AnimatePresence>
            {phase === 'loading' && (
              <LoadingLabel>
                <AnimatePresence mode="wait">
                  <PhraseText
                    key={phraseIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.35 }}
                  >
                    {PHRASES[phraseIndex]}
                  </PhraseText>
                </AnimatePresence>
                <Dot $delay={0}>.</Dot>
                <Dot $delay={0.2}>.</Dot>
                <Dot $delay={0.4}>.</Dot>
              </LoadingLabel>
            )}
          </LoadingBg>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoadingScreen;
