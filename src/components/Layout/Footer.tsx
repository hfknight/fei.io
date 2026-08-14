import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMobileNotice } from '../../hooks/useMobileNotice';
import { MOBILE_NOTICE_COPY, Pill, DismissButton } from './MobileNoticePill';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const Bar = styled.footer<{ $notice: boolean }>`
  position: fixed;
  bottom: env(safe-area-inset-bottom);
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  /* While the mobile notice is up it IS the footer line — the pill holds the centre
     alone and the copyright yields until dismissal. The 48px bar cannot seat both:
     at phone widths the pill wraps to two lines and the pair collide. */
  justify-content: ${p => (p.$notice ? 'center' : 'flex-end')};
  padding: ${p => (p.$notice ? `0.5rem ${p.theme.space[3]}` : `0 ${p.theme.space[3]}`)};
  min-height: 48px;
  background: transparent;
  pointer-events: none;
`;

const Copyright = styled.span`
  color: ${p => p.theme.chrome.inkMuted};
  font-family: ${p => p.theme.font.mono};
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: auto;
`;

const Footer: React.FC = () => {
  const { visible, dismiss } = useMobileNotice();
  const reduced = useReducedMotion();
  return (
    <Bar $notice={visible}>
      {visible ? (
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
      ) : (
        <Copyright>Copyright {new Date().getFullYear()} Fei Hu</Copyright>
      )}
    </Bar>
  );
};

export default Footer;
