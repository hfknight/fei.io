import { useEffect, useState } from 'react';
import styled from 'styled-components';

// A live "Dallas day/time + mood" stamp, mirroring DallasPin in the upper-right dark (Ollie)
// half. It lives invisibly (opacity:0) and surfaces only where a lens crosses it — the lensEngine
// buildLensWorld hook flips [data-lens-reveal] to opacity:1 inside each refracted clone. Light
// text (dark surface). pointer-events:none so the invisible base can't intercept a lens drag;
// z-index below the lenses (11), above the split videos.
//
// Both lines sit on one line each and may be wider than a lens disc — that's intended: you sweep
// the lens to read across them (fragment reveal), so nothing is shrunk to force a fit.

// Phrases bucketed by time of day, echoing the site's day-journey. The one shown is picked by the
// current Dallas hour (which bucket) and the day-of-year (which phrase within it), so it is always
// time-appropriate and still rotates day to day.
const PHRASES: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: ['coffee, chaos, repeat', '1% better, every day', 'breathe, then build', 'stay curious'],
  afternoon: ['ship, learn, repeat', 'build it, break it, learn', 'one thing at a time', 'less, but better'],
  evening: ['make good things', 'leave it better', 'follow your heart', 'progress, not perfect'],
  night: ['here but not here', 'be where your feet are', 'quiet mind, sharp hands', 'enjoy life'],
};

const bucketFor = (h: number): keyof typeof PHRASES =>
  h >= 5 && h < 12 ? 'morning'
    : h >= 12 && h < 17 ? 'afternoon'
      : h >= 17 && h < 21 ? 'evening'
        : 'night';

// Dallas is America/Chicago; Intl handles the CST/CDT abbreviation across DST and gives the local
// weekday/hour.
const dallasNow = (): { line: string; hour: number } => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', weekday: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).formatToParts(now);
  const val = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const line = `${val('weekday').toUpperCase()} · ${val('hour')}:${val('minute')} ${val('dayPeriod')} · ${val('timeZoneName')}`;
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: '2-digit', hourCycle: 'h23',
  }).format(now));
  return { line, hour };
};

const phraseFor = (hour: number): string => {
  const bucket = PHRASES[bucketFor(hour)];
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return bucket[dayOfYear % bucket.length];
};

// Generous soft dissolve so the lines fade at the disc edge without hard-cutting a glyph.
const MASK = 'radial-gradient(72% 78% at 50% 50%, #000 0%, #000 62%, rgba(0,0,0,0) 100%)';

const Stamp = styled.div`
  position: absolute;
  left: 60%;
  top: 17%;
  z-index: 7;
  opacity: 0;
  pointer-events: none;
  padding: 16px 26px;
  text-align: center;
  -webkit-mask: ${MASK};
  mask: ${MASK};
`;

const TimeLine = styled.div`
  font-family: ${(p) => p.theme.font.mono};
  font-size: 12px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: oklch(0.9 0.004 265 / 0.85);
`;

// A phrase, not a word: light and unweighted so it reads as a quiet motto against the machine-time
// line. One line — long ones simply run past the disc and are read by sweeping the lens.
const Mood = styled.div`
  margin-top: 8px;
  font-family: ${(p) => p.theme.font.display};
  font-size: 14px;
  letter-spacing: 0.01em;
  white-space: nowrap;
  color: oklch(0.97 0.003 265 / 0.95);
`;

const MoodClock: React.FC = () => {
  // Time-of-day + day-of-year are read once on mount. The phrase is stable for the session, so its
  // lens-clone snapshot stays correct without syncing; only the clock ticks (below).
  const [initial] = useState(() => {
    const n = dallasNow();
    return { line: n.line, phrase: phraseFor(n.hour) };
  });

  useEffect(() => {
    // The base is invisible (opacity:0) — the lens only ever shows the refracted CLONES, which are
    // static snapshots. So drive every [data-time-reveal] node (base AND each lens-world clone)
    // here; otherwise the clock would freeze at the moment its clone was built.
    const tick = () => {
      const { line } = dallasNow();
      document.querySelectorAll('[data-time-reveal]').forEach((el) => { el.textContent = line; });
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Stamp data-lens-reveal aria-hidden="true">
      <TimeLine data-time-reveal>{initial.line}</TimeLine>
      <Mood>{initial.phrase}</Mood>
    </Stamp>
  );
};

export default MoodClock;
