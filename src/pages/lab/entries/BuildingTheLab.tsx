import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../../../components/PageTransition';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

// First Lab entry — intentionally bespoke, no shared template. Replace freely;
// it exists to prove the registry → route → page wiring end to end.
const BuildingTheLab: React.FC = () => {
  const reduced = useReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay } }
      : {
          initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 1.1, delay, ease },
        };

  return (
    <PageTransition>
      <Page>
        <Column>
          <BackLink to="/lab">← lab</BackLink>

          <Label
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            fei.hu / lab / building the lab
          </Label>

          <Title {...rise(0.15)}>Building the Lab</Title>

          <Graf {...rise(0.3)}>
            This section has no CMS and no shared template. Each entry is a hand-coded
            React page, free to look and behave however it wants — this one included.
          </Graf>

          <Graf {...rise(0.42)}>
            The only thing they share is a small in-code registry. Each record carries an
            entry's title, kind, date, and its lazy-loaded page component, so the index can
            list it and a single dynamic route can render it. A missing page is a build
            error, not a broken link.
          </Graf>
        </Column>
      </Page>
    </PageTransition>
  );
};

export default BuildingTheLab;

const Page = styled.div`
  min-height: 100dvh;
  background: #12102a;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6.5rem 2rem 5rem;
`;

const Column = styled.div`
  max-width: 660px;
  width: 100%;
`;

const BackLink = styled(Link)`
  display: inline-block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  margin-bottom: 3rem;

  &:hover {
    color: rgba(255, 255, 255, 0.85);
  }
`;

const Label = styled(motion.span)`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2.5rem;
`;

const Title = styled(motion.h1)`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 300;
  line-height: 1.1;
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 2.5rem;
`;

const Graf = styled(motion.p)`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.1rem, 2.2vw, 1.35rem);
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 2rem;
  font-weight: 200;

  &:last-child {
    margin-bottom: 0;
  }
`;
