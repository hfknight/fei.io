import styled from 'styled-components';
import { motion } from 'framer-motion';

const Page = styled.div`
  min-height: 100vh;
  background: #12102a;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 7rem 2rem 5rem;
`;

const Column = styled.div`
  max-width: 660px;
  width: 100%;
`;

const Label = styled(motion.span)`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 3.5rem;
`;

const Graf = styled(motion.p)`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  line-height: 1.95;
  color: rgba(255, 255, 255, 0.78);
  margin: 0 0 2.5rem;
  font-weight: 200;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const Work: React.FC = () => {
  return (
    <Page>
      <Column>
        <Label
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          fei.hu / work
        </Label>

          <Graf
            initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, delay: 0.2, ease }}
          >
            Coming soon ...
          </Graf>
      </Column>
    </Page>
  );
};

export default Work;
