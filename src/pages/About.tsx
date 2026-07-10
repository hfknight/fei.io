import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
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
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 3.5rem;
`;

const Graf = styled(motion.p)`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  line-height: 1.6;
  color: ${p => p.theme.color.ink};
  margin: 0 0 2.5rem;
  font-weight: 200;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const About: React.FC = () => {
  const [content, setContent] = useState<string[]>([]);

  useEffect(() => {
    fetch('/data/portfolio.json')
      .then(r => r.json())
      .then(data => setContent(data.about?.content ?? []));
  }, []);

  return (
    <PageTransition>
    <Page>
      <Column>
        <Label
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          fei.hu / readme
        </Label>

        {content.map((para, i) => (
          <Graf
            key={i}
            initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, delay: 0.2 + i * 0.18, ease }}
          >
            {para}
          </Graf>
        ))}
      </Column>
    </Page>
    </PageTransition>
  );
};

export default About;
