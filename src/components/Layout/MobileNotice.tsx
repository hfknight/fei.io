import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMobileNotice } from '../../hooks/useMobileNotice';
import { MOBILE_NOTICE_COPY, Pill, DismissButton } from './MobileNoticePill';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const Bar = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(0.75rem + env(safe-area-inset-bottom));
  z-index: 11;
  /* Shrink-to-fit for a fixed box at left: 50% caps at the remaining half-viewport
     and folds the pill in two; size to the content and let the pill's own
     max-width do the capping. */
  width: max-content;
`;

/**
 * Rendered by `Layout.tsx` on every route except `/`, where the same copy joins
 * `Footer.tsx`'s bar instead — one bottom line, not two stacked ones.
 */
const MobileNotice: React.FC = () => {
  const { visible, dismiss } = useMobileNotice();
  const reduced = useReducedMotion();
  if (!visible) return null;
  return (
    <Bar>
      <Pill
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.4, ease }}
      >
        {MOBILE_NOTICE_COPY}
        <DismissButton onClick={dismiss} aria-label="Dismiss">
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </DismissButton>
      </Pill>
    </Bar>
  );
};

export default MobileNotice;
