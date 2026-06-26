import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import PageTransition from '../../components/PageTransition';
import { findLabEntry } from '../../data/labEntries';

// Resolves the bespoke page for a /lab/:slug from the registry. A matched entry
// renders its own page (which owns its chrome); an unknown slug renders a quiet
// not-found that carries its own way back, since the resolver adds no shared shell.
const LabEntryRoute: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const entry = slug ? findLabEntry(slug) : undefined;

  if (!entry) {
    return (
      <PageTransition>
        <Page>
          <Column>
            <BackLink to="/lab">← lab</BackLink>
            <Status>Entry not found.</Status>
          </Column>
        </Page>
      </PageTransition>
    );
  }

  const Entry = entry.Component;
  return <Entry />;
};

export default LabEntryRoute;

const Page = styled.div`
  min-height: 100dvh;
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

const Status = styled.p`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 200;
  color: rgba(255, 255, 255, 0.55);
`;
