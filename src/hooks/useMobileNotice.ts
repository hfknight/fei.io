import { useState } from 'react';

export const MOBILE_NOTICE_DISMISS_KEY = 'mobile-notice-dismissed';

/** Touch means the negation of the landing's own `canHover` gate. */
const readTouch = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const readDismissed = (): boolean => {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;
  try {
    return window.sessionStorage.getItem(MOBILE_NOTICE_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Shared gate for the mobile notice: `MobileNotice.tsx` (every route but `/`) and
 * `Footer.tsx` (which folds the same copy into its bar on `/`) both call this rather
 * than duplicating the matchMedia + sessionStorage logic. Both read once at mount —
 * capabilities don't change per render, the same assumption `Landing/index.tsx`
 * makes for `canHover` — and each mount re-reads sessionStorage fresh, which is how a
 * dismissal on one route stays dismissed after navigating to another.
 */
export function useMobileNotice() {
  const [touch] = useState(readTouch);
  const [dismissed, setDismissed] = useState(readDismissed);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.setItem(MOBILE_NOTICE_DISMISS_KEY, '1');
    } catch {
      // sessionStorage unavailable (private mode, disabled) — the dismissal still
      // holds for this mount via `dismissed` above, it just won't persist further.
    }
  };

  return { visible: touch && !dismissed, dismiss };
}
