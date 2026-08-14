import styled from 'styled-components';
import { motion } from 'framer-motion';

export const MOBILE_NOTICE_COPY =
  "You're seeing the quiet version. The full site lives on desktop.";

/**
 * The one dark chrome plate the site otherwise reserves for `/lab`'s mobile
 * `[data-nav-track]` treatment (`Lab.tsx`) — not Header's `glassPill`, which
 * degenerates on the light surface. This plate reads on any ground, so it does
 * double duty here: `MobileNotice.tsx` (every route but `/`) and `Footer.tsx`
 * (which folds the same copy into its bar on `/`) both wear it. Split into its own
 * module, not exported from either of those, so neither file mixes a component
 * export with plain values (breaks Fast Refresh).
 */
export const Pill = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(12, 13, 16, 0.58);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${(p) => p.theme.radius.pill};
  padding: 0.5rem 0.4rem 0.5rem 0.9rem;
  /* Never wider than a phone: the sentence wraps inside the pill instead of the
     pill escaping the viewport (the copy is ~62 mono uppercase characters). */
  max-width: min(calc(100vw - 2rem), 30rem);
  color: #fff;
  font-family: ${(p) => p.theme.font.mono};
  font-size: 0.62rem;
  line-height: 1.6;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: auto;
`;

export const DismissButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  color: inherit;
  cursor: pointer;
`;
