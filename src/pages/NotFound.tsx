import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import PageTransition from '../components/PageTransition';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * The catch-all route. It only ever sees paths no other route claims: `/lab/:slug` and
 * `/writing/:slug` each swallow their own unknown slugs and render a not-found in the
 * shape of the page that would have been there, so this one stands in for top-level
 * misses (a stale inbound link to `/connect`) rather than for missing content.
 *
 * Built for the inverted surface deliberately. `surfaceFor` falls through to `inverted`
 * for any unlisted path, and `*` has no fixed path that could be added to the light list,
 * so the curtain that sweeps in ahead of this page is always painted dark.
 */
const NotFound: React.FC = () => {
  const { pathname } = useLocation();
  usePageTitle('Page not found · Fei Hu');

  return (
    <PageTransition>
      <Page>
        <Column>
          <Code>404</Code>
          <Heading>This page does not exist.</Heading>
          <Path>{pathname}</Path>
          <Copy>The link may be out of date, or the address mistyped.</Copy>
          <HomeLink to="/">← home</HomeLink>
        </Column>
      </Page>
    </PageTransition>
  );
};

export default NotFound;

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7rem 2rem 5rem;
`;

const Column = styled.div`
  max-width: 34rem;
  width: 100%;
`;

const Code = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 2rem;
`;

const Heading = styled.h1`
  font-family: ${p => p.theme.font.display};
  font-weight: 600;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.1;
  color: ${p => p.theme.color.ink};
  margin: 0 0 1.25rem;
`;

/* The path is quoted back so a mistyped address is visible as the thing that missed. */
const Path = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.8rem;
  color: ${p => p.theme.color.inkMuted};
  overflow-wrap: anywhere;
  margin: 0 0 1.25rem;
`;

const Copy = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 1rem;
  line-height: 1.6;
  color: ${p => p.theme.color.inkMuted};
  margin: 0 0 3rem;
`;

/* One link, not a section list: the Header sits above this page with readme, lab, and
   writing already on it, so a row of the same four here is the nav printed twice. */
const HomeLink = styled(Link)`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  text-decoration: none;
  transition: color 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;
