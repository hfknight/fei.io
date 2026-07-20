import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { labEntriesByDate } from '../data/labEntries';
import type { LabKind } from '../types';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const KIND_LABEL: Record<LabKind, string> = {
  learning: 'Learning',
  'case-study': 'Case study',
  experiment: 'Experiment',
};

const Lab: React.FC = () => {
  const reduced = useReducedMotion();
  const entries = labEntriesByDate();

  return (
    <PageTransition>
      <Page>
        <Column>
          <Label
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            fei.hu / lab
          </Label>

          {entries.length === 0 && <Status>No entries yet.</Status>}

          <List>
            {entries.map((entry, i) => (
              <Item
                key={entry.slug}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: reduced ? 0.4 : 0.9, delay: 0.15 + i * 0.08, ease }}
              >
                <EntryLink to={`/lab/${entry.slug}`}>
                  <Meta>{`${entry.date.slice(0, 4)} · ${KIND_LABEL[entry.kind]}`}</Meta>
                  <EntryTitle>{entry.title}</EntryTitle>
                </EntryLink>
              </Item>
            ))}
          </List>
        </Column>
      </Page>
    </PageTransition>
  );
};

export default Lab;

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 7rem 2rem 5rem;
`;

const Column = styled.div`
  max-width: 680px;
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

const Status = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  color: ${p => p.theme.color.inkMuted};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled(motion.li)`
  & + & {
    border-top: 1px solid ${p => p.theme.color.border};
  }
`;

const EntryLink = styled(Link)`
  display: block;
  text-decoration: none;
  padding: 1.6rem 0;

  &:hover h2 {
    color: var(--accent);
  }
`;

const Meta = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.6rem;
`;

const EntryTitle = styled.h2`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 300;
  line-height: 1.2;
  color: ${p => p.theme.color.ink};
  margin: 0;
  transition: color 0.3s ease;
`;
